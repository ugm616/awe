// AWE front — local first, then shared Supabase cloud if configured
let content = loadContent();

function renderAll() {
applyTheme();
buildNav(document.getElementById('nav-left'), content.menus.left || []);
buildNav(document.getElementById('nav-right'), content.menus.right || []);
buildMobile();
bindNav();
renderHero();
renderTop();
renderFeatured();
renderPosts(document.getElementById('site-search')?.value || '');
}

function applyTheme() {
  const r = document.documentElement.style;
  const c = content.colors || {};
  if (c.header) r.setProperty('--header-bg', c.header);
  if (c.subbar) r.setProperty('--subbar-bg', c.subbar);
  if (c.gold) r.setProperty('--gold', c.gold);
  if (c.goldLight) r.setProperty('--gold-light', c.goldLight);
  if (c.bg) r.setProperty('--bg', c.bg);
  if (content.logo) {
    document.getElementById('awe-logo-img')?.setAttribute('src', content.logo);
    document.getElementById('favicon')?.setAttribute('href', content.logo);
  }
}

const header = document.getElementById('site-header');
const headerInner = document.querySelector('.site-header__inner');
const navInk = document.getElementById('nav-ink');
const subBar = document.getElementById('sub-bar');
const subList = document.getElementById('sub-bar-list');
let hideTimer = null;
let hideCloseTimer = null;
let inkActiveEl = null;

function moveInk(el) {
  if (!navInk || !headerInner || !el) return;
  const innerBox = headerInner.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  navInk.style.left = (r.left - innerBox.left) + 'px';
  navInk.style.width = r.width + 'px';
  navInk.classList.add('visible');
}
function parkInk() {
  if (!navInk) return;
  if (inkActiveEl && document.contains(inkActiveEl)) moveInk(inkActiveEl);
  else navInk.classList.remove('visible');
}

function buildNav(listEl, items) {
  listEl.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    const hasSubs = item.subs && item.subs.length > 0;
    if (hasSubs) li.dataset.sub = item.label;
    if (hasSubs) {
      const b = document.createElement('button');
      b.className = 'nav-link';
      b.textContent = item.label;
      b.setAttribute('aria-expanded', 'false');
      li.appendChild(b);
    } else {
      const a = document.createElement('a');
      a.className = 'nav-link';
      a.textContent = item.label;
      a.href = item.url || '#';
      li.appendChild(a);
    }
    li._subs = item.subs || [];
    li._url = item.url || '#';
    listEl.appendChild(li);
  });
}

function buildMobile() {
  const m = document.getElementById('mobile-nav');
  m.innerHTML = '';
  [...(content.menus.left||[]), ...(content.menus.right||[])].forEach((item) => {
    const a = document.createElement('a');
    a.href = item.url || '#';
    a.textContent = item.label;
    m.appendChild(a);
  });
}

function renderSub(subs) {
  subList.innerHTML = '';
  subs.forEach((s) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url || '#';
    a.textContent = s.label;
    li.appendChild(a);
    subList.appendChild(li);
  });
}
function showSub(subs, linkEl) {
  clearTimeout(hideTimer);
  clearTimeout(hideCloseTimer);
  if (typeof closeSearch === 'function') closeSearch();
  inkActiveEl = linkEl || inkActiveEl;
  if (linkEl) moveInk(linkEl);
  if (!subs || !subs.length) { scheduleHide(); return; }
  renderSub(subs);
  subBar.hidden = false;
  void subBar.offsetHeight;
  subBar.classList.add('open');
  document.querySelectorAll('.main-nav .nav-link').forEach((l) => {
    l.classList.toggle('active', l === linkEl);
    l.setAttribute('aria-expanded', l === linkEl ? 'true' : 'false');
  });
}
function scheduleHide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    subBar.classList.remove('open');
    clearTimeout(hideCloseTimer);
    hideCloseTimer = setTimeout(() => {
      if (!subBar.classList.contains('open')) {
        subBar.hidden = true;
        document.querySelectorAll('.main-nav .nav-link').forEach((l) => {
          l.classList.remove('active');
          l.setAttribute('aria-expanded', 'false');
        });
        inkActiveEl = null;
        parkInk();
      }
    }, 380);
  }, 120);
}

function bindNav() {
  subBar.hidden = true;
  subBar.classList.remove('open');
  inkActiveEl = null;
  parkInk();
  document.querySelectorAll('.main-nav li').forEach((li) => {
    const link = li.querySelector('.nav-link');
    const subs = li._subs || [];
    if (!link) return;
    // clone to drop old listeners on re-render
    const fresh = link.cloneNode(true);
    link.replaceWith(fresh);
    fresh.addEventListener('mouseenter', () => moveInk(fresh));
    fresh.addEventListener('focus', () => moveInk(fresh));
    fresh.addEventListener('click', () => { inkActiveEl = fresh; moveInk(fresh); });
    if (!subs.length) {
      fresh.addEventListener('mouseenter', scheduleHide);
      return;
    }
    fresh.addEventListener('mouseenter', () => showSub(subs, fresh));
    fresh.addEventListener('focus', () => showSub(subs, fresh));
    fresh.addEventListener('click', (e) => {
      e.preventDefault();
      inkActiveEl = fresh;
      moveInk(fresh);
      if (!subBar.classList.contains('open') || subBar.hidden) showSub(subs, fresh);
      else {
        scheduleHide();
        if (li._url && li._url !== '#') window.location.href = li._url;
      }
    });
  });
  subBar.onmouseenter = () => { clearTimeout(hideTimer); clearTimeout(hideCloseTimer); };
  subBar.onmouseleave = scheduleHide;
  header.onmouseleave = () => { scheduleHide(); parkInk(); };
  window.onresize = parkInk;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') scheduleHide(); });

function renderHero() {
  const h = content.hero || {};
  document.getElementById('hero-eyebrow').textContent = h.eyebrow || '';
  document.getElementById('hero-title').textContent = h.title || '';
  document.getElementById('hero-body').textContent = h.body || '';
  const c1 = document.getElementById('hero-cta1');
  const c2 = document.getElementById('hero-cta2');
  c1.textContent = h.cta1?.label || 'Read More';
  c1.href = h.cta1?.url || '#';
  c2.textContent = h.cta2?.label || 'Watch';
  c2.href = h.cta2?.url || '#';
  const media = document.getElementById('hero-media');
  media.innerHTML = '';
  const emb = videoEmbed(h.videoUrl || '');
  if (emb) {
    media.innerHTML = `<div class="video-wrap"><iframe src="${emb}" title="Hero video" frameborder="0" allowfullscreen></iframe></div>`;
  } else if (h.image) {
    const img = document.createElement('img');
    img.src = h.image; img.alt = h.title || 'Hero'; img.className = 'hero-img';
    media.appendChild(img);
  }
}

function renderTop() {
  const ol = document.getElementById('top-stories');
  ol.innerHTML = '';
  (content.topStories || []).forEach((s) => {
    const li = document.createElement('li');
    li.innerHTML = `<span></span>`;
    li.querySelector('span').textContent = s.category || '';
    const a = document.createElement('a');
    a.href = s.url || '#';
    a.textContent = s.title || '';
    li.appendChild(a);
    ol.appendChild(li);
  });
}

function renderFeatured() {
  const wrap = document.getElementById('featured-video');
  const fv = content.featuredVideo || {};
  wrap.innerHTML = '';
  const emb = videoEmbed(fv.rumbleUrl || fv.youtubeUrl || '');
  if (!emb) { wrap.innerHTML = '<p class="muted">No featured video yet — add one in Admin.</p>'; return; }
  if (fv.title) { const h = document.createElement('h3'); h.textContent = fv.title; wrap.appendChild(h); }
  wrap.innerHTML += `<div class="video-wrap"><iframe src="${emb}" title="Featured video" frameborder="0" allowfullscreen></iframe></div>`;
}

function renderPosts(filter = '') {
  const grid = document.getElementById('posts-grid');
  grid.innerHTML = '';
  const q = filter.trim().toLowerCase();
  (content.posts || [])
    .slice().sort((a,b) => (b.date||'').localeCompare(a.date||''))
    .filter((p) => !q || ((p.title||'') + (p.excerpt||'') + (p.category||'') + (p.body||'')).toLowerCase().includes(q))
    .forEach((p) => {
      const card = document.createElement('article');
      card.className = 'post-card';
      const emb = videoEmbed(p.videoUrl || '');
      card.innerHTML = `
        ${p.image ? `<img src="${p.image}" alt="" loading="lazy">` : ''}
        <div class="post-card__body">
          <span class="post-meta"></span>
          <h3></h3>
          <p class="post-excerpt"></p>
          ${emb ? `<div class="video-wrap"><iframe src="${emb}" loading="lazy" frameborder="0" allowfullscreen></iframe></div>` : ''}
          ${p.body ? `<p class="post-full" hidden></p><button class="link-btn">Read more</button>` : ''}
        </div>`;
      card.querySelector('.post-meta').textContent = `${p.category || 'News'} • ${p.date || ''}`;
      card.querySelector('h3').textContent = p.title || 'Untitled';
      card.querySelector('.post-excerpt').textContent = p.excerpt || '';
      if (p.body) {
        const full = card.querySelector('.post-full');
        full.textContent = p.body;
        const btn = card.querySelector('.link-btn');
        btn.addEventListener('click', () => {
          const open = full.hidden;
          full.hidden = !open;
          btn.textContent = open ? 'Show less' : 'Read more';
        });
      }
      grid.appendChild(card);
    });
  if (!grid.children.length) grid.innerHTML = '<p class="muted">No stories found.</p>';
}

document.getElementById('site-search')?.addEventListener('input', (e) => renderPosts(e.target.value));

const searchToggle = document.getElementById('search-toggle');
const searchPanel = document.getElementById('search-panel');
const menuToggle = document.getElementById('menu-toggle');
const mobilePanel = document.getElementById('mobile-panel');
let searchCloseTimer = null;
function openSearch() {
  clearTimeout(searchCloseTimer);
  scheduleHide();
  searchPanel.hidden = false;
  void searchPanel.offsetHeight;
  searchPanel.classList.add('open');
  searchToggle?.setAttribute('aria-expanded', 'true');
  searchPanel.querySelector('input')?.focus();
}
function closeSearch() {
  if (!searchPanel || searchPanel.hidden || !searchPanel.classList.contains('open')) return;
  searchPanel.classList.remove('open');
  searchToggle?.setAttribute('aria-expanded', 'false');
  clearTimeout(searchCloseTimer);
  searchCloseTimer = setTimeout(() => {
    if (!searchPanel.classList.contains('open')) searchPanel.hidden = true;
  }, 380);
}
searchToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (searchPanel.hidden || !searchPanel.classList.contains('open')) openSearch();
  else closeSearch();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSearch(); });
menuToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = mobilePanel.hidden;
  mobilePanel.hidden = !open;
  mobilePanel.classList.toggle('active', open);
});
(function logoInit() {
  const logoImg = document.getElementById('awe-logo-img');
  const logoFallback = document.getElementById('awe-logo-fallback');
  if (!logoImg) return;
  const showFallback = () => { logoImg.style.display = 'none'; if (logoFallback) logoFallback.style.display = 'block'; };
  const showImg = () => { logoImg.style.display = 'block'; if (logoFallback) logoFallback.style.display = 'none'; };
  logoImg.addEventListener('error', showFallback);
  logoImg.addEventListener('load', () => (logoImg.naturalWidth > 0 ? showImg() : showFallback()));
  showFallback();
  if (logoImg.complete && logoImg.naturalWidth > 0) showImg();
})();

// initial local render, then upgrade to shared cloud if configured
renderAll();
(async () => {
  try {
    if (typeof aweInitCloud !== 'function' || !aweCloudEnabled()) return;
    aweInitCloud();
    const cloud = await aweLoadCloud();
    if (!cloud) return;
    let changed = false;
    if (cloud.site) {
      content = { ...content, ...cloud.site,
        colors: { ...content.colors, ...(cloud.site.colors || {}) } };
      changed = true;
    }
    if (cloud.posts) { content.posts = cloud.posts; changed = true; }
    // hide retired Watch items even if still stored in cloud/local
    // darken retired #222222 sub-bar even if still stored in cloud
    // normalize menu renames/removals/reorders (Events, Roster, Connect, Shop)
    try {
      if (typeof normalizeMenus === 'function' && normalizeMenus(content.menus)) changed = true;
    } catch {}
    try {
      if ((content.colors?.subbar || '').toLowerCase() === '#222222') {
        content.colors.subbar = '#0a0a0a';
        changed = true;
      }
    } catch {}
    try {
      const watch = (content.menus?.right || []).find((m) => (m.label || '').toLowerCase() === 'watch');
      if (watch?.subs) {
        const drop = new Set(['awe pass', 'video archive']);
        const filtered = watch.subs.filter((s) => !drop.has((s.label || '').toLowerCase()));
        if (filtered.length !== watch.subs.length) { watch.subs = filtered; changed = true; }
      }
    } catch {}
    if (changed) renderAll();
  } catch (err) { console.warn('Cloud load skipped:', err); }
})();
