// Daily Rumble sync — channel page scrape + official oEmbed, pub ID preserved.
// Run: node scripts/sync-rumble.mjs
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (writes bypass RLS), optional RUMBLE_CHANNEL override.
// Also writes ondemand/videos.json as local fallback for static hosting.
// Monetization: we ONLY store official page/embed URLs; player always uses
// https://rumble.com/embed/<id>/?pub=<PUB> so ads stay on.
import { writeFileSync, mkdirSync } from 'node:fs';

const CHANNEL = process.env.RUMBLE_CHANNEL || 'https://rumble.com/c/c-7961460';
const PUB = 'z608t';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const UA = 'Mozilla/5.0 (AWE RumbleSync/1.0)';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractVideoUrls(html, base) {
  // Rumble channel pages link to /v<id>-... or /<id>... — collect unique page URLs
  const urls = new Set();
  const re = /href="(\/(?:v[a-z0-9]+[^"]*?\.html|\w[\w-]*\/v[a-z0-9]+[^"]*?))"/gi;
  let m;
  while ((m = re.exec(html)) && urls.size < 60) {
    try { urls.add(new URL(m[1], base).toString()); } catch {}
  }
  // fallback: any /v{id} pattern
  if (!urls.size) {
    const re2 = /https:\/\/rumble\.com\/(v[a-z0-9]+[^\s"']*)/gi;
    while ((m = re2.exec(html)) && urls.size < 60) urls.add('https://rumble.com/' + m[1].replace(/["']$/, ''));
  }
  return [...urls].slice(0, 40);
}

function rumbleId(pageUrl) {
  const m = pageUrl.match(/\/(v[a-z0-9]+)/i);
  return m ? m[1] : null;
}

async function oembed(pageUrl) {
  const api = `https://wn0.rumble.com/api/Media/oembed.json?url=${encodeURIComponent(pageUrl)}`;
  const res = await fetch(api, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`oEmbed ${res.status}`);
  return res.json();
}

function embedUrlFromOembed(data, fallbackId) {
  // data.html contains <iframe src="https://rumble.com/embed/xxx/"> — reuse id, append ?pub=
  const m = (data.html || '').match(/src="([^"]+rumble\.com\/embed\/[^"]+)"/);
  let src = m ? m[1] : `https://rumble.com/embed/${fallbackId}/`;
  src = src.split('?')[0];
  return `${src}?pub=${PUB}`;
}

async function main() {
  console.log('Channel:', CHANNEL);
  const html = await fetchText(CHANNEL);
  const pageUrls = extractVideoUrls(html, CHANNEL);
  console.log(`Found ${pageUrls.length} video links`);
  const videos = [];
  for (const pageUrl of pageUrls) {
    const id = rumbleId(pageUrl);
    if (!id) continue;
    try {
      const meta = await oembed(pageUrl);
      videos.push({
        id,
        page_url: pageUrl,
        embed_url: embedUrlFromOembed(meta, id),
        title: meta.title || id,
        thumbnail: meta.thumbnail_url || '',
        duration: meta.duration || 0,
        published_at: null,
        is_live: false,
      });
      console.log(' +', id, meta.title?.slice(0, 60));
    } catch (e) {
      console.warn(' ! skip', pageUrl, e.message);
    }
  }

  // local fallback
  mkdirSync('ondemand', { recursive: true });
  writeFileSync('ondemand/videos.json', JSON.stringify({ updated: new Date().toISOString(), channel: CHANNEL, pub: PUB, videos }, null, 2));
  console.log('Wrote ondemand/videos.json');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log('No SUPABASE_URL/SERVICE_KEY — skipping cloud upsert (local JSON only).');
    return;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  for (const v of videos) {
    const { error } = await supa.from('rumble_videos').upsert(v, { onConflict: 'id' });
    if (error) console.warn('upsert failed', v.id, error.message);
  }
  console.log(`Upserted ${videos.length} rows to rumble_videos`);
}

main().catch((e) => { console.error(e); process.exit(1); });
