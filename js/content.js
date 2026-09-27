// AWE CMS — default content + localStorage store
const AWE_KEY = 'awe_content_v1';

const DEFAULT_CONTENT = {
  version: 1,
  logo: 'images/awe-logo.png',
  colors: {
    header: '#000000',
    subbar: '#0a0a0a',
    gold: '#ad8a1f',
    goldLight: '#f0d67a',
    bg: '#0a0a0b'
  },
  menus: {
    left: [
      { label: 'Events', url: '#', subs: [
        { label: 'Upcoming', url: '#' },
        { label: 'Past', url: '#' }
      ]},
      { label: 'Rankings', url: '#', subs: [] },
      { label: 'Roster', url: '#', subs: [
        { label: 'All Wrestlers', url: '#' },
        { label: 'Champions', url: '#' },
        { label: 'Hall of Fame', url: '#' }
      ]},
      { label: 'News', url: '#news', subs: [] }
    ],
    right: [
      { label: 'Connect', url: '#', subs: [
        { label: 'Facebook', url: '#' },
        { label: 'Rumble', url: 'https://rumble.com/c/c-7961460' }
      ]},
      { label: 'On-Demand', url: 'ondemand/index.html', subs: [] },
      { label: 'Watch Live', url: 'live.html', subs: [] },
      { label: 'Shop', url: '#', subs: [
        { label: 'AWE Merch', url: '#' },
        { label: 'Wrestler Merch', url: '#' }
      ]}
    ]
  },
  hero: {
    eyebrow: 'AWE Fight Night: Main Event',
    title: 'THE GOLD STANDARD HAS ARRIVED',
    body: 'Static UFC-style header demo. Edit this in /admin.html.',
    image: '',
    videoUrl: '',
    cta1: { label: 'Final Results', url: '#' },
    cta2: { label: 'Watch Now', url: '#watch' }
  },
  topStories: [
    { category: 'Announcements', title: 'Title bout announced for next PPV', url: '#' },
    { category: 'Results', title: 'Main card results — Fight Night', url: '#' },
    { category: 'Interviews', title: 'Champion octagon interview', url: '#' }
  ],
  featuredVideo: { title: '', rumbleUrl: '' },
  live: { title: '', videoUrl: '', chatUrl: '', isLive: false },
  rumble: { channel: 'https://rumble.com/c/c-7961460', pub: 'z608t' },
  posts: [
    {
      id: 'welcome-to-awe',
      category: 'News',
      title: 'Welcome to AWE',
      excerpt: 'This is your first news story. Edit or delete it in admin.',
      image: '',
      date: '2026-09-27',
      videoUrl: '',
      body: 'Write full story text in Admin → News Posts → Body. You can paste Rumble links, image URLs, and format with line breaks.'
    }
  ]
};

// One-way menu migration: renames/removals/reorders saved + cloud menus.
// Returns true if anything changed.
function normalizeMenus(menus) {
  if (!menus) return false;
  const before = JSON.stringify(menus);
  const all = [...(menus.left || []), ...(menus.right || [])];
  const find = (label) => all.find((m) => (m.label || '').toLowerCase() === label);
  const cleanSubs = (subs, renames, drop) => {
    let out = [];
    for (const s of subs || []) {
      const key = (s.label || '').toLowerCase();
      if (drop.has(key)) continue;
      if (renames[key]) {
        s.label = renames[key].label;
        if (renames[key].url && (!s.url || s.url === '#')) s.url = renames[key].url;
      }
      out.push(s);
    }
    const seen = new Set();
    return out.filter((s) => {
      const k = (s.label || '').toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // Events: drop Tickets / VIP Experiences / Group Sales
  const ev = find('events');
  if (ev?.subs) ev.subs = cleanSubs(ev.subs, {}, new Set(['tickets', 'vip experiences', 'group sales']));

  // Roster: Record Book -> Champions, order: All Wrestlers, Champions, Hall of Fame
  const ro = find('roster');
  if (ro) {
    ro.subs = cleanSubs(ro.subs, { 'record book': { label: 'Champions' } }, new Set());
    const order = { 'all wrestlers': 0, 'champions': 1, 'hall of fame': 2 };
    ro.subs = ro.subs.slice().sort((a, b) =>
      (order[(a.label || '').toLowerCase()] ?? 99) - (order[(b.label || '').toLowerCase()] ?? 99));
  }

  // Connect: Newsletter -> Facebook, Fan Club -> Rumble, drop Find a Gym
  const co = find('connect');
  if (co?.subs) co.subs = cleanSubs(co.subs, {
    'newsletter': { label: 'Facebook' },
    'fan club': { label: 'Rumble', url: 'https://rumble.com/c/c-7961460' }
  }, new Set(['find a gym']));

  // Shop: Apparel -> AWE Merch, Collectibles -> Wrestler Merch, drop What's New
  const sh = find('shop');
  if (sh?.subs) sh.subs = cleanSubs(sh.subs, {
    'apparel': { label: 'AWE Merch' },
    'collectibles': { label: 'Wrestler Merch' }
  }, new Set(["what's new", 'whats new']));

  // Main menu: Watch replaced by top-level On-Demand + Watch Live
  for (const side of ['left', 'right']) {
    const list = menus[side] || [];
    const hadWatch = list.some((m) => (m.label || '').toLowerCase() === 'watch');
    if (side !== 'right' && !hadWatch) continue;
    for (const m of list) {
      if ((m.label || '').toLowerCase() === 'live') {
        m.label = 'Watch Live';
        if (!m.url || m.url === '#') m.url = 'live.html';
      }
      if ((m.label || '').toLowerCase() === 'on demand') m.label = 'On-Demand';
    }
    const wi = list.findIndex((m) => (m.label || '').toLowerCase() === 'watch');
    let at = wi >= 0 ? wi : -1;
    if (wi >= 0) list.splice(wi, 1);
    const hasTop = (l) => list.some((m) => (m.label || '').toLowerCase() === l);
    const add = [];
    if (!hasTop('on-demand') && !hasTop('on demand')) add.push({ label: 'On-Demand', url: 'ondemand/index.html', subs: [] });
    if (!hasTop('watch live')) add.push({ label: 'Watch Live', url: 'live.html', subs: [] });
    if (add.length) {
      if (at < 0) {
        const si = list.findIndex((m) => (m.label || '').toLowerCase() === 'shop');
        at = si >= 0 ? si : list.length;
      }
      list.splice(at, 0, ...add);
    }
  }

  return JSON.stringify(menus) !== before;
}

function loadContent() {
  try {
    const raw = localStorage.getItem(AWE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONTENT);
    const parsed = JSON.parse(raw);
    // shallow merge with defaults to survive upgrades
    const merged = { ...structuredClone(DEFAULT_CONTENT), ...parsed,
      colors: { ...DEFAULT_CONTENT.colors, ...(parsed.colors||{}) },
      menus: parsed.menus || DEFAULT_CONTENT.menus,
      hero: { ...DEFAULT_CONTENT.hero, ...(parsed.hero||{}) },
      live: { ...structuredClone(DEFAULT_CONTENT.live), ...(parsed.live||{}) },
      rumble: { ...structuredClone(DEFAULT_CONTENT.rumble), ...(parsed.rumble||{}) } };
    // migrate featuredVideo.youtubeUrl -> rumbleUrl (Rumble-first)
    if (merged.featuredVideo) {
      if (!merged.featuredVideo.rumbleUrl && parsed.featuredVideo?.youtubeUrl) {
        merged.featuredVideo.rumbleUrl = parsed.featuredVideo.youtubeUrl;
      }
      delete merged.featuredVideo.youtubeUrl;
    }
    // one-time migrations for retired shades
    if ((parsed.colors?.gold || '').toLowerCase() === '#d4af37') {
      merged.colors.gold = DEFAULT_CONTENT.colors.gold;
      try { localStorage.setItem(AWE_KEY, JSON.stringify(merged)); } catch {}
    }
    if ((parsed.colors?.subbar || '').toLowerCase() === '#222222') {
      merged.colors.subbar = DEFAULT_CONTENT.colors.subbar;
      try { localStorage.setItem(AWE_KEY, JSON.stringify(merged)); } catch {}
    }
    // ensure On Demand / Live exist under Watch (added later)
    // remove AWE Pass / Video Archive (retired)
    try {
      const watch = (merged.menus.right || []).find((m) => (m.label || '').toLowerCase() === 'watch');
      if (watch) {
        watch.subs = watch.subs || [];
        const drop = new Set(['awe pass', 'video archive']);
        const before = watch.subs.length;
        watch.subs = watch.subs.filter((s) => !drop.has((s.label || '').toLowerCase()));
        const has = (l) => watch.subs.some((s) => (s.label || '').toLowerCase() === l);
        if (!has('on demand')) watch.subs.splice(1, 0, { label: 'On Demand', url: 'ondemand/index.html' });
        if (!has('live')) watch.subs.splice(2, 0, { label: 'Live', url: 'live.html' });
        if (watch.subs.length !== before || (parsed.colors?.gold || '').toLowerCase() === '#d4af37') {
          try { localStorage.setItem(AWE_KEY, JSON.stringify(merged)); } catch {}
        }
      }
    } catch {}
    // migrate menu renames/removals/reorders (Events, Roster, Connect, Shop)
    try {
      if (normalizeMenus(merged.menus)) {
        try { localStorage.setItem(AWE_KEY, JSON.stringify(merged)); } catch {}
      }
    } catch {}
    return merged;
  } catch {
    return structuredClone(DEFAULT_CONTENT);
  }
}

function saveContent(content) {
  localStorage.setItem(AWE_KEY, JSON.stringify(content));
}

function resetContent() {
  localStorage.removeItem(AWE_KEY);
  return loadContent();
}

function rumblePub() {
  try {
    const ls = JSON.parse(localStorage.getItem(AWE_KEY) || '{}');
    if (ls.rumble?.pub) return ls.rumble.pub;
  } catch {}
  return window.AWE_RUMBLE_PUB || 'z608t';
}

function rumbleEmbed(url, pub) {
  if (!url) return '';
  const s = String(url).trim();
  if (!/rumble\.com/i.test(s)) return '';
  let m = s.match(/rumble\.com\/embed\/([a-z0-9]+)/i);
  if (m) return `https://rumble.com/embed/${m[1]}/?pub=${pub || rumblePub()}`;
  m = s.match(/\/(v[a-z0-9]+)/i);
  if (m) return `https://rumble.com/embed/${m[1]}/?pub=${pub || rumblePub()}`;
  return '';
}

function videoEmbed(url, pub) {
  // Rumble-first (official embed, ?pub kept so ads stay on).
  // Old YouTube links still play via fallback — replace them in Admin when ready.
  if (!url) return '';
  if (/rumble\.com/i.test(String(url))) return rumbleEmbed(url, pub);
  return youtubeEmbed(url);
}

function youtubeEmbed(url) {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (!m) return '';
  return `https://www.youtube.com/embed/${m[1]}`;
}
