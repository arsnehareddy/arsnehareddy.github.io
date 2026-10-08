(() => {
  'use strict';
  const editor = window.portfolioEditor;
  const main = document.querySelector('main');
  if (!editor || !main) return;
  let owner = false, frozen = false;
  const sectionHTML = `<section class="video-showcase" id="architecture-videos" aria-labelledby="architecture-videos-title"><div class="shell"><div class="section-top"><div><span class="eyebrow">Architecture in motion</span><h2 id="architecture-videos-title">Spaces in perspective.</h2></div><p>Walkthroughs, spatial studies, and details brought to life.</p></div><div class="video-grid">${[1,2,3].map(number => `<article class="video-slot" id="architecture-video-${number}"><video controls playsinline preload="metadata" aria-label="Architecture video ${number}" hidden></video><div class="video-empty"><span class="video-play-mark" aria-hidden="true">▷</span><span class="video-empty-title">A new perspective, coming soon</span><span class="video-empty-note">Architecture in motion</span></div><div class="video-card-heading"><span class="video-number">0${number}</span><h3>Architecture film ${number}</h3></div></article>`).join('')}</div></div></section>`;
  function refresh() {
    let section = main.querySelector('#architecture-videos');
    if (!section) {
      const work = main.querySelector('#work');
      if (!work) return;
      work.insertAdjacentHTML('afterend', sectionHTML);
      section = main.querySelector('#architecture-videos');
    }
    section.querySelectorAll('.video-slot-controls').forEach(element => element.remove());
    if (owner) {
      const controls = document.createElement('div');
      controls.className = 'video-owner-tools video-slot-controls';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'video-slot-add';
      button.textContent = 'Add video slot';
      button.disabled = frozen;
      controls.append(button);
      section.querySelector('.shell').append(controls);
    }
    section.querySelectorAll('.video-slot').forEach((slot, index) => {
      const video = slot.querySelector('video');
      if (!video) return;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.autoplay = false;
      video.removeAttribute('autoplay');
      const hasSource = !!(video.getAttribute('src') || video.querySelector('source[src]'));
      video.hidden = !hasSource;
      const empty = slot.querySelector('.video-empty');
      if (empty) empty.hidden = hasSource;
      slot.querySelectorAll('.video-owner-tools,.video-feedback').forEach(element => element.remove());
      if (!owner) return;
      const tools = document.createElement('div');
      tools.className = 'video-owner-tools';
      const label = document.createElement('label');
      label.textContent = hasSource ? 'Replace video' : 'Upload video';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/mp4,video/webm';
      input.className = 'video-upload';
      input.disabled = frozen;
      input.setAttribute('aria-label', label.textContent + ' for architecture film ' + (index + 1));
      label.append(input);
      const help = document.createElement('p');
      help.textContent = 'MP4 or WebM · Up to 50 MB · Original quality. Save draft to keep your upload.';
      tools.append(label, help);
      slot.append(tools);
    });
  }
  const originalSetOwner = editor.setOwner;
  editor.setOwner = function(value) {
    const result = originalSetOwner.call(this, value);
    owner = value === true;
    refresh();
    return result;
  };
  const originalLoadContent = editor.loadContent;
  editor.loadContent = function(content) {
    const result = originalLoadContent.call(this, content);
    refresh();
    return result;
  };
  const originalFreeze = editor.freeze;
  editor.freeze = function(value) {
    const result = originalFreeze.call(this, value);
    frozen = !!value;
    main.querySelectorAll('.video-upload,.video-slot-add').forEach(input => { input.disabled = frozen || !owner; });
    return result;
  };
  const originalSnapshot = editor.snapshot;
  editor.snapshot = function() {
    const snapshot = originalSnapshot.call(this);
    const template = document.createElement('template');
    template.innerHTML = snapshot.mainHTML;
    template.content.querySelectorAll('.video-owner-tools,.video-feedback').forEach(element => element.remove());
    snapshot.mainHTML = template.innerHTML;
    return snapshot;
  };
  main.addEventListener('click', event => {
    const button = event.target.closest('.video-slot-add');
    if (!button || !owner || frozen) return;
    const grid = main.querySelector('#architecture-videos .video-grid');
    if (!grid) return;
    const template = document.createElement('template');
    template.innerHTML = sectionHTML;
    const slot = template.content.querySelector('.video-slot');
    const number = grid.querySelectorAll('.video-slot').length + 1;
    let id;
    do { id = 'architecture-video-' + Math.random().toString(36).slice(2, 10); }
    while (document.getElementById(id));
    slot.id = id;
    slot.querySelector('video').setAttribute('aria-label', 'Architecture video ' + number);
    slot.querySelector('.video-number').textContent = String(number).padStart(2, '0');
    slot.querySelector('h3').textContent = 'Architecture film ' + number;
    grid.append(slot);
    refresh();
    const status = document.getElementById('editor-status');
    if (status) status.textContent = 'Video slot added. Save draft to keep it.';
    window.dispatchEvent(new Event('portfolio:change'));
    slot.scrollIntoView({block: 'nearest'});
    slot.querySelector('.video-upload')?.focus({preventScroll: true});
  });
  main.addEventListener('change', event => {
    const input = event.target;
    if (!input.matches('.video-upload')) return;
    const file = input.files?.[0];
    input.value = '';
    if (!owner || frozen || !file) return;
    const slot = input.closest('.video-slot');
    const video = slot?.querySelector('video');
    if (!video) return;
    function feedback(text) {
      slot.querySelector('.video-feedback')?.remove();
      const message = document.createElement('p');
      message.className = 'video-feedback';
      message.setAttribute('role', 'status');
      message.textContent = text;
      slot.append(message);
    }
    if (!['video/mp4','video/webm'].includes(file.type)) {
      feedback('Choose an MP4 or WebM video.'); return;
    }
    if (file.size > 50 * 1024 * 1024) {
      feedback('Choose a video up to 50 MB. Videos are never compressed.'); return;
    }
    const url = URL.createObjectURL(file);
    editor.files.set(url, file);
    video.pause();
    video.querySelectorAll('source').forEach(source => source.remove());
    video.src = url;
    video.load();
    refresh();
    feedback('Original video ready to preview. Save draft or Publish to keep it online.');
    const status = document.getElementById('editor-status');
    if (status) status.textContent = 'Unpublished video changes. Save draft or Publish.';
    window.dispatchEvent(new Event('portfolio:change'));
  });
  main.addEventListener('error', event => {
    const video = event.target;
    if (!video.matches?.('.video-slot video')) return;
    const slot = video.closest('.video-slot');
    if (slot.querySelector('.video-feedback')) return;
    const message = document.createElement('p');
    message.className = 'video-feedback';
    message.setAttribute('role', 'status');
    message.textContent = 'This video could not play. Try a browser-compatible MP4 or WebM file.';
    slot.append(message);
  }, true);
  refresh();
})();

(() => {
  const main = document.querySelector('main');
  if (!main || !window.portfolioEditor) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, active = '', scheduled = false;
  const originalSnapshot = window.portfolioEditor.snapshot;
  window.portfolioEditor.snapshot = function() {
    const content = originalSnapshot.call(this);
    const template = document.createElement('template');
    template.innerHTML = content.mainHTML;
    template.content.querySelectorAll('.motion-stage,.hero-motion').forEach(el => el.remove());
    content.mainHTML = template.innerHTML;
    return content;
  };
  function mount() {
    const section = main.querySelector('#architecture-videos');
    if (!section || section.querySelector('.motion-stage')) return;
    const stage = document.createElement('div');
    stage.className = 'motion-stage'; active = '';
    stage.innerHTML = '<div class="motion-screen"><img class="motion-photo" alt="" aria-hidden="true"><video class="motion-film" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video><div class="motion-shade"></div><div class="motion-caption"><span class="motion-kicker">A study in space / Scroll to explore</span><h3 class="motion-title"></h3><span class="motion-count"></span></div><button type="button" class="motion-toggle">Pause motion</button></div>';
    section.querySelector('.video-grid').before(stage);
    stage.querySelector('button').addEventListener('click', () => { paused = !paused; update(); });
  }
  function update() {
    mount();
    const stage = main.querySelector('.motion-stage');
    if (!stage) return;
    const slots = [...main.querySelectorAll('.video-slot')];
    const films = slots.map(slot => ({src:slot.querySelector('video')?.getAttribute('src') || slot.querySelector('video source')?.getAttribute('src'),title:slot.querySelector('h3')?.textContent || 'Architecture in motion'})).filter(film => film.src);
    const studies = [
      {src:'assets/photo-002.jpg',title:'Light. Material. Space.'},
      {src:'assets/photo-012.jpg',title:'Another perspective.'},
      {src:'assets/photo-001.jpg',title:'From idea to detail.'}
    ];
    const collection = films.length ? films : studies;
    const rect = stage.getBoundingClientRect();
    const progress = Math.max(0,Math.min(.999,-rect.top / Math.max(1,rect.height-innerHeight*.7)));
    const index = Math.min(collection.length-1,Math.floor(progress*collection.length));
    const item = collection[index], video = stage.querySelector('video'), photo = stage.querySelector('img');
    const key = (films.length?'video:':'photo:')+item.src;
    if (key !== active) {
      active = key;
      video.pause();
      if (films.length) { video.src = item.src; video.muted = true; video.load(); }
      else {video.removeAttribute('src');video.load();photo.src=item.src;}
      stage.querySelector('.motion-title').textContent=item.title;
      stage.querySelector('.motion-count').textContent=String(index+1).padStart(2,'0')+' / '+String(collection.length).padStart(2,'0')+(films.length?' · Film':' · Photographic study');
    }
    video.hidden = !films.length;
    photo.hidden = !!films.length;
    stage.classList.toggle('motion-paused',paused);
    const label = paused?'Play motion':'Pause motion'; if (stage.querySelector('button').textContent !== label) stage.querySelector('button').textContent = label; const hero = main.querySelector('.hero-visual img'); if (hero) hero.style.animationPlayState = paused?'paused':'running';
    stage.querySelector('button').setAttribute('aria-pressed',String(paused));
    const visible = rect.top < innerHeight && rect.bottom > 0 && !document.hidden;
    if (films.length && visible && !paused) video.play().catch(() => {});else video.pause();
  }
  function schedule() {if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update();});}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',()=>{paused=reduced.matches;schedule();});
  new MutationObserver(schedule).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  update();
})();

