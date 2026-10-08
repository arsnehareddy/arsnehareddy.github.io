(() => {
  'use strict';
  const editor = window.portfolioEditor;
  const config = window.PORTFOLIO_CONFIG || {};
  const notice = document.getElementById('cloud-notice');
  const status = document.getElementById('editor-status');
  const dialog = document.getElementById('login-dialog');
  const loginStatus = document.getElementById('login-status');
  const loginButton = document.getElementById('owner-login');
  const signin = document.getElementById('google-signin');
  let client, owner = false, dirty = false, version = 0, busy = false;
  let noticeTimer, authRevision = 0, lastPublished;
  function message(text, persistent = false) {
    clearTimeout(noticeTimer); notice.textContent = text; notice.hidden = false;
    if (!persistent) noticeTimer = setTimeout(() => { notice.hidden = true; }, 7000);
  }
  function must(result) { if (result.error) throw new Error(result.error.message); return result.data; }
  // Published HTML accepts only the portfolio's text and image elements.
  // No scripts, event handlers, embeds, styles, or executable URL schemes are retained.
  function sanitizeHTML(html, pending = false) {
    const template = document.createElement('template'); template.innerHTML = html;
    const allowed = new Set('div section article span p h1 h2 h3 h4 h5 br em strong b i u figure figcaption img a button ul ol li video source'.split(' '));
    const blocked = new Set('script style iframe object embed link meta base form input textarea select svg math'.split(' '));
    template.content.querySelectorAll('*').forEach(element => {
      const tag = element.tagName.toLowerCase();
      if (!allowed.has(tag)) { if (blocked.has(tag)) element.remove(); else element.replaceWith(...element.childNodes); return; }
      [...element.attributes].forEach(attribute => {
        const name = attribute.name.toLowerCase(), value = attribute.value;
        const accepted = ['class','id','alt','title','href','src','type','role','data-photo','data-category'].includes(name) || name.startsWith('aria-') || (tag === 'video' && ['controls','playsinline','preload'].includes(name));
        if (tag === 'video' && ['controls','playsinline'].includes(name)) { element.setAttribute(name,''); return; }
        if (tag === 'video' && name === 'preload') { element.setAttribute(name,'metadata'); return; }
        if (tag === 'source' && name === 'type' && !['video/mp4','video/webm'].includes(value)) { element.removeAttribute(name); return; }
        if (!accepted) { element.removeAttribute(name); return; }
        if (name === 'href' || name === 'src') {
          try {
            const url = new URL(value, location.href);
            if (!['https:','http:','mailto:','tel:'].includes(url.protocol) && !(pending && ['blob:','data:'].includes(url.protocol))) element.removeAttribute(name);
            if (name === 'src' && ['mailto:','tel:'].includes(url.protocol)) element.removeAttribute(name);
          } catch { element.removeAttribute(name); }
        }
      });
    });
    template.content.querySelectorAll('.card-tools,.hint,#experience,.video-owner-tools,.video-feedback').forEach(element => element.remove());
    template.content.querySelectorAll('video').forEach(video => {
      video.setAttribute('controls','');
      video.setAttribute('playsinline','');
      video.setAttribute('preload','metadata');
    });
    return template.innerHTML;
  }
  function validateContent(content) {
    if (!content || typeof content.mainHTML !== 'string' || !content.mainHTML.includes('project-grid')) throw new Error('The saved portfolio content is incomplete.');
    let introSrc = typeof content.introSrc === 'string' ? content.introSrc : '';
    if (introSrc) { const url = new URL(introSrc,location.href); if (!['http:','https:'].includes(url.protocol)) introSrc = ''; }
    return {mainHTML:sanitizeHTML(content.mainHTML),introSrc};
  }
  function showPublished(content) { const safe = validateContent(content); editor.loadContent(safe); lastPublished = safe; }
  window.addEventListener('portfolio:change', () => { if (owner) dirty = true; });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  loginButton.addEventListener('click', () => {
    loginStatus.textContent = client ? '' : 'Google login needs the one-time backend setup in SETUP.md.';
    signin.disabled = !client; dialog.showModal();
  });
  document.getElementById('login-close').addEventListener('click', () => dialog.close());
  signin.addEventListener('click', async () => {
    if (!client) return;
    signin.disabled = true; loginStatus.textContent = 'Opening Google sign-in…';
    try {
      const redirectTo = new URL(config.siteUrl).href;
      must(await client.auth.signInWithOAuth({provider:'google',options:{redirectTo,queryParams:{prompt:'select_account'}}}));
    } catch (error) { loginStatus.textContent = error.message; signin.disabled = false; }
  });
  async function authorize() {
    const revision = ++authRevision;
    const response = await client.auth.getUser();
    if (response.error && !/session missing/i.test(response.error.message)) throw new Error(response.error.message);
    const user = response.data;
    let permitted = false;
    if (user?.user) permitted = must(await client.rpc('is_portfolio_owner')) === true;
    if (revision !== authRevision) return;
    owner = permitted; editor.setOwner(owner); loginButton.hidden = owner;
    if (owner) {
      status.textContent = 'Signed in. Edit the portfolio, then Publish.';
      const draft = await client.from('portfolio_drafts').select('content,updated_at').eq('id','main').maybeSingle();
      if (!draft.error) document.getElementById('load-draft').hidden = !draft.data;
      dialog.close();
    } else if (user?.user) {
      message('This Google account has no editing access. Sign in as snehareddypatlolla05@gmail.com.');
      await client.auth.signOut();
    }
  }
  async function uploadOriginal(source) {
    let blob;
    if (source.startsWith('blob:')) { blob = editor.files.get(source); if (!blob) throw new Error('One new photo is missing. Add that photo again before publishing.'); }
    else { const response = await fetch(source); if (!response.ok) throw new Error('Could not read an image.'); blob = await response.blob(); }
    if (blob.size > 50*1024*1024) throw new Error('An image or video is over the configured 50 MB limit. It has not been resized.');
    if (!/^(image\/(jpeg|png|webp|avif|gif|heic|heif)|video\/(mp4|webm))$/.test(blob.type)) throw new Error('Use JPG, PNG, WebP, AVIF, GIF, HEIC, HEIF, MP4, or WebM media.');
    const bytes = await blob.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    const extension = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','image/gif':'gif','image/heic':'heic','image/heif':'heif','video/mp4':'mp4','video/webm':'webm'}[blob.type];
    const path = 'originals/'+hash+'.'+extension;
    const result = await client.storage.from('portfolio-media').upload(path,blob,{contentType:blob.type,upsert:false,cacheControl:'31536000'});
    if (result.error && !(/already exists|duplicate/i.test(result.error.message) && String(result.error.statusCode) === '409')) throw new Error(result.error.message);
    return client.storage.from('portfolio-media').getPublicUrl(path).data.publicUrl;
  }
  async function prepareContent() {
    const snapshot = editor.snapshot();
    const template = document.createElement('template'); template.innerHTML = sanitizeHTML(snapshot.mainHTML,true);
    const seen = new Map(); let count = 0;
    for (const media of template.content.querySelectorAll('img[src],video[src],video source[src]')) {
      const source = media.getAttribute('src');
      if (/^(blob:|data:)/.test(source)) {
        if (!seen.has(source)) { status.textContent = 'Uploading original media '+(++count)+'…'; seen.set(source,await uploadOriginal(source)); }
        media.setAttribute('src',seen.get(source));
      }
    }
    let introSrc = snapshot.introSrc;
    if (/^(blob:|data:)/.test(introSrc)) { status.textContent = 'Uploading original intro video…'; introSrc = await uploadOriginal(introSrc); }
    return validateContent({mainHTML:template.innerHTML,introSrc});
  }
  async function writeContent(kind) {
    if (!owner || busy) return;
    busy = true; editor.freeze(true);
    try {
      if (must(await client.rpc('is_portfolio_owner')) !== true) throw new Error('Your editing session has ended. Sign in again.');
      const content = await prepareContent();
      if (kind === 'draft') {
        must(await client.from('portfolio_drafts').upsert({id:'main',content,updated_at:new Date().toISOString()}));
        editor.loadContent(content); dirty = false;
        document.getElementById('load-draft').hidden = false;
        status.textContent = 'Draft saved online. Visitors still see the published version.';
      } else {
        const row = must(await client.rpc('publish_portfolio',{new_content:content,expected_version:version}));
        version = Number(row.version); showPublished(content); dirty = false;
        status.textContent = 'Published. Visitors will see this version when they open or refresh the site.';
      }
    } catch (error) { status.textContent = 'Not '+(kind==='draft'?'saved':'published')+': '+error.message; message(status.textContent,true); }
    finally { busy = false; editor.freeze(false); }
  }
  document.getElementById('save-draft').addEventListener('click',()=>writeContent('draft'));
  document.getElementById('cloud-publish').addEventListener('click',()=>writeContent('publish'));
  document.getElementById('load-draft').addEventListener('click', async()=>{
    if (!owner || busy || (dirty && !confirm('Replace your unsaved edits with the online draft?'))) return;
    try { const draft = must(await client.from('portfolio_drafts').select('content').eq('id','main').maybeSingle()); if (!draft) throw new Error('No online draft was found.'); editor.loadContent(validateContent(draft.content)); dirty = false; status.textContent = 'Online draft opened. Publish when ready.'; }
    catch(error) { message(error.message); }
  });
  document.getElementById('cloud-signout').addEventListener('click',async()=>{
    if (busy || (dirty && !confirm('Sign out and discard unpublished edits? Save draft first to keep them.'))) return;
    try { must(await client.auth.signOut()); dirty = false; owner = false; editor.setOwner(false); if (lastPublished) showPublished(lastPublished); loginButton.hidden = false; }
    catch(error) { message(error.message); }
  });
  async function boot() {
    lastPublished = validateContent(editor.snapshot());
    if (!config.supabaseUrl || !config.publishableKey) return;
    if (!window.supabase) { message('Online editing could not connect. The portfolio is showing its initial saved copy.'); return; }
    try {
      client = window.supabase.createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
      const result = await client.from('portfolio_content').select('content,version').eq('id','main').maybeSingle();
      if (result.error) { message('The online portfolio could not load. Showing the initial saved copy.'); }
      else if (result.data) { version = Number(result.data.version); showPublished(result.data.content); }
      client.auth.onAuthStateChange((event) => {
        // SDK callbacks must return before calling other auth APIs.
        if (event==='SIGNED_OUT') { owner=false; editor.setOwner(false); loginButton.hidden=false; if(lastPublished) showPublished(lastPublished); }
        if (['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event)) setTimeout(()=>authorize().catch(error=>message('Login check failed: '+error.message)),0);
      });
      try { await authorize(); } catch(error) { if (!/session missing/i.test(error.message)) message('Login check failed: '+error.message); }
    } catch(error) { client = null; message('Online editing is not connected: '+error.message); }
  }
  boot();
})();
