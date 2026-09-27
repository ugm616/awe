// AWE Supabase client + shared CMS helpers (graceful fallback to localStorage)
let aweSupa = null;
function aweCloudEnabled() {
  return Boolean(window.AWE_SUPABASE_URL && window.AWE_SUPABASE_ANON_KEY && window.supabase);
}
function aweInitCloud() {
  try {
    if (!aweCloudEnabled() || aweSupa) return aweSupa;
    aweSupa = window.supabase.createClient(window.AWE_SUPABASE_URL, window.AWE_SUPABASE_ANON_KEY);
    return aweSupa;
  } catch { return null; }
}
async function aweGetRole() {
  const c = aweInitCloud();
  if (!c) return 'local';
  const { data: { user } } = await c.auth.getUser();
  if (!user) return null;
  const { data } = await c.from('profiles').select('role').eq('id', user.id).single();
  return data?.role || 'viewer';
}
async function aweLoadCloud() {
  const c = aweInitCloud();
  if (!c) return null;
  const out = { site: null, posts: null };
  const { data: site } = await c.from('site_content').select('data').eq('id', 1).single();
  if (site?.data) out.site = site.data;
  const { data: posts } = await c.from('posts').select('*').eq('published', true).order('date', { ascending: false }).limit(100);
  if (posts) out.posts = posts.map((p) => ({
    id: p.id, category: p.category, title: p.title, excerpt: p.excerpt,
    image: p.image, date: p.date, videoUrl: p.video_url, body: p.body
  }));
  return out;
}
async function aweSaveSiteCloud(siteData) {
  const c = aweInitCloud();
  if (!c) return false;
  const { data: { user } } = await c.auth.getUser();
  const { error } = await c.from('site_content').upsert({ id: 1, data: siteData, updated_by: user?.id }, { onConflict: 'id' });
  if (error) { alert('Cloud save failed: ' + error.message); return false; }
  return true;
}
