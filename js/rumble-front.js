// Rumble front helpers — official embeds only (?pub= preserved so ads/monetization stay on)
function aweRumblePub() {
  return window.AWE_RUMBLE_PUB || 'z608t';
}
function aweRumbleEmbed(pageUrlOrId) {
  if (!pageUrlOrId) return '';
  const m = String(pageUrlOrId).match(/\/(v[a-z0-9]+)/i);
  const id = m ? m[1] : String(pageUrlOrId).trim();
  if (!/^v[a-z0-9]+$/i.test(id)) return '';
  return `https://rumble.com/embed/${id}/?pub=${aweRumblePub()}`;
}
async function aweLoadRumbleVideos() {
  // 1) Supabase shared table if configured
  try {
    if (typeof aweInitCloud === 'function' && aweCloudEnabled()) {
      aweInitCloud();
      const { data, error } = await aweSupa.from('rumble_videos').select('*').order('published_at', { ascending: false, nullsFirst: false }).order('updated_at', { ascending: false }).limit(100);
      if (!error && data && data.length) {
        return data.map((v) => ({
          id: v.id, title: v.title, thumbnail: v.thumbnail,
          pageUrl: v.page_url, embedUrl: v.embed_url, duration: v.duration,
        }));
      }
    }
  } catch (e) { console.warn('rumble cloud skipped', e); }
  // 2) local fallback written by scripts/sync-rumble.mjs
  try {
    const res = await fetch('videos.json', { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      if (j.videos?.length) return j.videos.map((v) => ({
        id: v.id, title: v.title, thumbnail: v.thumbnail,
        pageUrl: v.page_url || v.pageUrl, embedUrl: v.embed_url || v.embedUrl,
      }));
    }
  } catch {}
  try {
    const res = await fetch('/ondemand/videos.json', { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      if (j.videos?.length) return j.videos;
    }
  } catch {}
  return [];
}
