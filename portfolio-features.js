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
  let paused = reduced.matches, active = '', scheduled = false, manualIndex = null;
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
    stage.innerHTML = '<div class="motion-screen"><img class="motion-photo" alt="" aria-hidden="true"><video class="motion-film" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video><div class="motion-shade"></div><div class="motion-caption"><span class="motion-kicker">A study in space / Scroll to explore</span><h3 class="motion-title"></h3><span class="motion-count"></span></div><button type="button" class="motion-toggle" aria-label="Pause motion"><span class="motion-control-icon" aria-hidden="true">Ⅱ</span><span class="motion-control-label">Pause motion</span></button><div class="motion-pagination" aria-label="Architectural slides"></div></div>';
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
      {src:'assets/photo-001.jpg',title:'From idea to detail.'},
      {src:'assets/photo-003.jpg',title:'A considered composition.'},
      {src:'assets/photo-006.jpg',title:'Texture and atmosphere.'},
      {src:'assets/photo-010.jpg',title:'Details in dialogue.'}
    ];
    const collection = films.length ? films : studies;
    const rect = stage.getBoundingClientRect();
    const progress = Math.max(0,Math.min(.999,-rect.top / Math.max(1,rect.height-innerHeight*.7)));
    const index = Math.min(collection.length-1,manualIndex ?? Math.floor(progress*collection.length));
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
    const control = stage.querySelector('.motion-toggle'), label = paused?'Play motion':'Pause motion';
    if(control.querySelector('.motion-control-label').textContent!==label){control.querySelector('.motion-control-label').textContent=label;control.querySelector('.motion-control-icon').textContent=paused?'▷':'Ⅱ';}
    control.setAttribute('aria-label',label);control.style.setProperty('--motion-angle',((index+1)/collection.length*360)+'deg');
    const pagination=stage.querySelector('.motion-pagination');
    if(pagination.dataset.count!==String(collection.length)){pagination.replaceChildren();pagination.dataset.count=collection.length;collection.forEach((slide,i)=>{const dot=document.createElement('button');dot.type='button';dot.textContent=String(i+1).padStart(2,'0');dot.setAttribute('aria-label','Show architectural slide '+(i+1));dot.onclick=()=>{manualIndex=i;update();};pagination.append(dot);});}
    [...pagination.children].forEach((dot,i)=>{dot.classList.toggle('selected',i===index);dot.setAttribute('aria-current',String(i===index));}); const hero = main.querySelector('.hero-visual img'); if (hero) hero.style.animationPlayState = paused?'paused':'running';
    stage.querySelector('button').setAttribute('aria-pressed',String(paused));
    const visible = rect.top < innerHeight && rect.bottom > 0 && !document.hidden;
    if (films.length && visible && !paused) video.play().catch(() => {});else video.pause();
  }
  function schedule() {if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update();});}
  addEventListener('scroll',schedule,{passive:true});addEventListener('wheel',()=>{manualIndex=null;schedule();},{passive:true});addEventListener('touchmove',()=>{manualIndex=null;schedule();},{passive:true});addEventListener('resize',schedule);
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',()=>{paused=reduced.matches;schedule();});
  new MutationObserver(schedule).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  update();
})();


(() => {function expand(){const hero=document.querySelector('.hero'),image=document.querySelector('.hero-visual');if(!hero||!image)return;const progress=Math.min(1,Math.max(0,scrollY/(innerHeight*.8)));image.style.setProperty('--studio-media-width',(70+30*progress)+'%');}addEventListener('scroll',expand,{passive:true});addEventListener('resize',expand);expand();})();

/* Decorative architecture drawing; generated locally, no external assets. */
(() => {
  if (document.querySelector('.architecture-backdrop')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'architecture-backdrop';
  canvas.setAttribute('aria-hidden','true');
  document.body.prepend(canvas);
  const button = document.createElement('button');
  button.className = 'architecture-motion-toggle';
  button.type = 'button';
  document.body.append(button);
  const ctx = canvas.getContext('2d');
  if (!ctx) {canvas.remove();button.remove();return;}
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduce.matches, width=0,height=0,frame=0,elapsed=0,last=0;
  const blocks = [[-4,0,-2,2.6,3.5,2],[-1.1,0,-2,2.5,1.6,3.5],[1.8,0,-1.5,1.3,5,2],[-2.9,0,1.2,2,1,1.8],[.1,0,2,2.3,2.6,1.8],[3.5,0,1,1.5,2,1.5]];
  function resize(){width=innerWidth;height=innerHeight;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);draw();}
  function project(x,y,z,angle){const a=x*Math.cos(angle)-z*Math.sin(angle),b=x*Math.sin(angle)+z*Math.cos(angle);const scale=Math.max(width,height)*.083;return [width*.64+a*scale,height*.63+(b*.43-y)*scale];}
  function line(a,b,alpha=.18){ctx.strokeStyle=`rgba(91,99,88,${alpha})`;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
  function draw(){
    ctx.clearRect(0,0,width,height);
    const angle=-.65+elapsed*.18+Math.min(scrollY/Math.max(1,document.body.scrollHeight),1)*.25;
    ctx.lineWidth=.7;
    for(let i=-8;i<=8;i++){line(project(i,0,-7,angle),project(i,0,7,angle),.075);line(project(-8,0,i,angle),project(8,0,i,angle),.075);}
    blocks.forEach(([x,y,z,w,h,d],index)=>{ y+=Math.sin(elapsed*.7+index*.8)*.2;
      const p=[[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d],[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]].map(v=>project(...v,angle));
      ctx.fillStyle=index%2?'rgba(143,151,130,.065)':'rgba(170,155,136,.08)';
      [[0,1,5,4],[1,2,6,5],[4,5,6,7]].forEach(face=>{ctx.beginPath();face.forEach((n,i)=>i?ctx.lineTo(...p[n]):ctx.moveTo(...p[n]));ctx.closePath();ctx.fill();});
      [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b])=>line(p[a],p[b],.4));
      for(let floor=.45;floor<h;floor+=.45){line(project(x,y+floor,z,angle),project(x+w,y+floor,z,angle),.12);line(project(x+w,y+floor,z,angle),project(x+w,y+floor,z+d,angle),.12);}
      for(let bay=.42;bay<w;bay+=.42)line(project(x+bay,y,z,angle),project(x+bay,y+h,z,angle),.1);
    });
    ctx.strokeStyle='rgba(91,99,88,.09)';ctx.lineWidth=.7;
    const radius=Math.min(width,height)*.39;
    ctx.beginPath();ctx.ellipse(width*.64,height*.63,radius,radius*.44,angle,0,Math.PI*2);ctx.stroke();
    for(const [x,y] of [[width*.06,height*.16],[width*.94,height*.84]]){line([x-9,y],[x+9,y],.28);line([x,y-9],[x,y+9],.28);}
  }
  function tick(now){frame=0;if(paused||document.hidden)return;if(now-last>=40){elapsed+=Math.min((now-last)/1000,.1);last=now;draw();}frame=requestAnimationFrame(tick);}
  function sync(){button.textContent=paused?'Play background':'Pause background';button.setAttribute('aria-pressed',String(paused));cancelAnimationFrame(frame);frame=0;last=performance.now();draw();if(!paused&&!document.hidden)frame=requestAnimationFrame(tick);}
  button.addEventListener('click',()=>{paused=!paused;sync();});
  reduce.addEventListener('change',()=>{paused=reduce.matches;sync();});
  document.addEventListener('visibilitychange',sync);
  addEventListener('resize',resize);addEventListener('scroll',()=>{if(paused)draw();},{passive:true});
  resize();sync();
})();


(() => {
  const editor=window.portfolioEditor,main=document.querySelector('main');
  if(!editor||!main)return;
  let owner=false,selected='',frozen=false;
  const page=document.createElement('section');page.className='category-page';page.hidden=true;document.body.insertBefore(page,document.querySelector('.footer'));document.body.insertBefore(document.querySelector('#project-page'),document.querySelector('.footer'));
  const overlay=document.createElement('div');overlay.className='category-overlay';overlay.hidden=true;
  const form=document.createElement('div');form.className='category-form';form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');form.setAttribute('aria-label','Project editor');
  form.innerHTML='<h2></h2><label>Name<input name="name" maxlength="120" autocomplete="off"></label><label>Description<textarea name="description" rows="3" maxlength="2000"></textarea></label><label class="category-choice">Project type<select></select></label><p class="category-error" role="alert"></p><div class="category-form-actions"><button type="button" class="cancel">Cancel</button><button type="button" class="category-submit">Create</button></div>';
  overlay.append(form);document.body.append(overlay);let submit=null,lastFocus=null;
  const choice=form.querySelector('.category-choice'),typeSelect=choice.querySelector('select');
  function closeForm(){overlay.hidden=true;lastFocus?.focus();}
  form.querySelector('.cancel').onclick=closeForm;
  overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeForm();}});
  form.querySelector('.category-submit').onclick=()=>{
    const error=form.querySelector('.category-error');error.textContent='';
    if(!owner){error.textContent='Sign in as the portfolio owner to add projects.';return;}
    if(frozen){error.textContent='Wait for the current save to finish, then try again.';return;}
    const name=form.querySelector('input').value.trim();if(!name){error.textContent='Enter a name first.';form.querySelector('input').focus();return;}
    try{submit?.(name,form.querySelector('textarea').value.trim(),typeSelect.value);closeForm();}catch(e){error.textContent='Could not create this project: '+e.message;}
  };
  form.querySelector('input').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();form.querySelector('.category-submit').click();}});
  function ask(title,callback,choose=false){lastFocus=document.activeElement;choice.hidden=!choose;typeSelect.replaceChildren();categories().forEach(category=>{const option=document.createElement('option');option.value=category.id;option.textContent=category.querySelector('h3').textContent;typeSelect.append(option);});form.querySelector('h2').textContent=title;form.querySelector('input').value='';form.querySelector('textarea').value='';form.querySelector('.category-error').textContent='';submit=callback;overlay.hidden=false;form.querySelector('input').focus();}
  const categories=()=>[...main.querySelectorAll('.project-category')];
  const cards=()=>[...main.querySelectorAll('.project')];
  const group=id=>categories().find(category=>category.id===id);
  function changed(){window.dispatchEvent(new Event('portfolio:change'));render();}
  function link(text,href){const a=document.createElement('a');a.textContent=text;a.href=href;return a;}
  function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=frozen;b.onclick=action;return b;}
  function createType(){ask('Add a project type',(name,description)=>{const item=document.createElement('article');item.className='project-category';item.id='category-'+(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));const title=document.createElement('h3'),p=document.createElement('p');title.textContent=name;p.textContent=description||'Explore projects in this collection.';item.append(title,p);let registry=main.querySelector('.project-categories');if(!registry){registry=document.createElement('div');registry.className='project-categories';main.querySelector('#work .shell').append(registry);}registry.append(item);location.hash='category='+item.id;changed();});}
  function createRootProject(){ask('Add project',(name,description,category)=>editor.createProject({category,name,description}),true);} function createProject(id){ask('Add a project to '+group(id).querySelector('h3').textContent,(name,description)=>editor.createProject({category:id,name,description}));}
  function render(){
    const work=main.querySelector('#work'),grid=main.querySelector('.project-grid');if(!work||!grid)return;
    work.classList.add('categorized');
    work.querySelector('.category-ui')?.remove();const ui=document.createElement('div');ui.className='category-ui';
    if(owner){const tools=document.createElement('div');tools.className='category-owner-tools';tools.append(button('＋ Add project',createRootProject),button('＋ Add project type',createType));ui.append(tools);}
    const collection=document.createElement('div');collection.className='category-grid';
    categories().forEach((category,index)=>{
      const children=cards().filter(card=>card.getAttribute('data-category')===category.id),cover=category.querySelector('.category-cover')||children.map(card=>card.querySelector('.project-art img')).find(Boolean);
      const a=link('','#category='+category.id);a.className='category-card';
      const art=document.createElement('div');art.className='category-art';
      if(cover){const img=cover.cloneNode();img.alt=category.querySelector('h3').textContent+' projects';art.append(img);}else{const mark=document.createElement('span');mark.textContent=category.querySelector('h3').textContent;art.append(mark);}
      const number=document.createElement('span');number.className='category-number';number.textContent=String(index+1).padStart(2,'0');
      const h=document.createElement('h3');h.textContent=category.querySelector('h3').textContent;
      const count=document.createElement('p');count.textContent=children.length+' '+(children.length===1?'project':'projects')+' / Explore collection ↗';a.append(art,number,h,count);collection.append(a);
    });ui.append(collection);grid.before(ui);route();
  }
  function route(){
    const hash=location.hash.slice(1),id=hash.startsWith('category=')?hash.slice(9):'';selected=id;
    const category=group(id);page.hidden=!category;
    if(category){
      main.hidden=true;document.querySelector('#project-page').hidden=true;page.replaceChildren();
      const shell=document.createElement('div');shell.className='shell';shell.append(link('← All project types','#work'));
      const heading=document.createElement('h1');heading.textContent=category.querySelector('h3').textContent;const description=document.createElement('p');description.className='category-description';description.textContent=category.querySelector('p').textContent;shell.append(heading,description);
      if(owner){const tools=document.createElement('div');tools.className='category-owner-tools';tools.append(button('＋ Add project',()=>createProject(id)));shell.append(tools);}
      const collection=document.createElement('div');collection.className='subcategory-grid';
      cards().filter(card=>card.getAttribute('data-category')===id).forEach(card=>{
        const item=document.createElement('article');item.className='subcategory-card';const a=link('','#project='+card.id);const art=document.createElement('div');art.className='subcategory-art';const image=card.querySelector('.project-art img');if(image)art.append(image.cloneNode());else{const span=document.createElement('span');span.textContent='Project photos coming soon';art.append(span);}
        const h=document.createElement('h2');h.textContent=card.querySelector('h3').textContent;const p=document.createElement('p');p.textContent=card.querySelector('.project-body p').textContent;a.append(art,h,p);item.append(a);
        if(owner){const label=document.createElement('label');label.textContent='Project type';const select=document.createElement('select');select.setAttribute('aria-label','Move '+h.textContent+' to project type');select.disabled=frozen;categories().forEach(c=>{const option=document.createElement('option');option.value=c.id;option.textContent=c.querySelector('h3').textContent;select.append(option);});select.value=id;select.onchange=()=>{card.setAttribute('data-category',select.value);changed();};label.append(select);item.append(label);}collection.append(item);
      });if(!collection.children.length){const empty=document.createElement('p');empty.textContent=owner?'No projects yet. Add your first project above.':'Projects coming soon.';collection.append(empty);}shell.append(collection);page.append(shell);document.title=heading.textContent+' | Sneha Reddy Patlolla';
    }
    const card=hash.startsWith('project=')?document.getElementById(decodeURIComponent(hash.slice(8))):null;
    const close=document.querySelector('.dialog-close');if(card){const c=group(card.getAttribute('data-category'));close.textContent=c?'← '+c.querySelector('h3').textContent:'← All project types';}
    const add=document.getElementById('add-project');add.textContent='Add project type';
  }
  main.addEventListener('click',event=>{const link=event.target.closest('.category-card');if(link){event.preventDefault();event.stopImmediatePropagation();location.hash=link.getAttribute('href');}},true); document.getElementById('add-project').addEventListener('click',event=>{event.stopImmediatePropagation();if(owner&&!frozen)createType();},true);
  document.querySelector('.dialog-close').addEventListener('click',event=>{const hash=location.hash.slice(1);const card=hash.startsWith('project=')?document.getElementById(decodeURIComponent(hash.slice(8))):null;const id=card?.getAttribute('data-category');if(group(id)){event.stopImmediatePropagation();location.hash='category='+id;}},true);
  const setOwner=editor.setOwner;editor.setOwner=function(value){owner=value===true;const result=setOwner.call(this,value);render();return result;};
  const load=editor.loadContent;editor.loadContent=function(content){const result=load.call(this,content);render();return result;};
  const snapshot=editor.snapshot;editor.snapshot=function(){const content=snapshot.call(this);const t=document.createElement('template');t.innerHTML=content.mainHTML;t.content.querySelectorAll('.category-ui').forEach(el=>el.remove());content.mainHTML=t.innerHTML;return content;};
  const freeze=editor.freeze;editor.freeze=function(value){frozen=!!value;const result=freeze.call(this,value);render();return result;};
  addEventListener('hashchange',()=>{route();if(selected)scrollTo({top:0,behavior:'instant'});});
  addEventListener('portfolio:change',render);
  render();
})();






(() => {
  const editor=window.portfolioEditor,dialog=document.querySelector('#project-page'),main=document.querySelector('main');if(!editor||!dialog)return;
  const host=document.createElement('div');host.className='project-work-sections';dialog.querySelector('.dialog-gallery').before(host);
  let owner=false,frozen=false,timer;
  function active(){const hash=location.hash.slice(1);return hash.startsWith('project=')?main.querySelector('#'+CSS.escape(decodeURIComponent(hash.slice(8)))):null;}
  function notify(){window.dispatchEvent(new Event('portfolio:change'));}
  function action(text,callback){const button=document.createElement('button');button.type='button';button.textContent=text;button.disabled=frozen;button.onclick=callback;return button;}
  function render(){
    const card=active();host.replaceChildren();if(!card)return;
    let data=card.querySelector('.project-data');
    if(owner){const tools=document.createElement('div');tools.className='work-section-tools';const select=document.createElement('select');select.setAttribute('aria-label','New work section');['Elevation','Floor Plans','Elevation Types','Construction Photos','Execution Photos','Interiors','Other Work'].forEach(name=>{const option=document.createElement('option');option.textContent=name;select.append(option);});tools.append(select,action('＋ Add section',()=>{const section=document.createElement('section');section.className='project-work-section';const h=document.createElement('h3'),p=document.createElement('p'),gallery=document.createElement('div');h.textContent=select.value;p.textContent='Add an explanation of the design, details, materials, or work shown here.';p.className='work-section-description';gallery.className='work-section-gallery';section.append(h,p,gallery);data.append(section);notify();render();host.lastElementChild?.scrollIntoView({block:'nearest'});}));host.append(tools);}
    [...data.querySelectorAll('.project-work-section')].forEach((source,index)=>{
      const section=document.createElement('section');section.className='work-detail';
      const number=document.createElement('span');number.className='work-detail-number';number.textContent=String(index+1).padStart(2,'0');
      const title=document.createElement('h3');title.textContent=source.querySelector('h3').textContent;
      const description=document.createElement('p');description.className='work-detail-description';description.textContent=source.querySelector('.work-section-description').textContent;
      for(const [element,target]of [[title,source.querySelector('h3')],[description,source.querySelector('.work-section-description')]]){element.contentEditable=String(owner&&!frozen);element.setAttribute('aria-label',element===title?'Section heading':'Section explanation');element.addEventListener('input',()=>{target.textContent=element.textContent;clearTimeout(timer);timer=setTimeout(notify,500);});element.addEventListener('paste',event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));});}
      section.append(number,title,description);
      const gallery=document.createElement('div');gallery.className='work-detail-gallery';
      const stored=source.querySelector('.work-section-gallery');
      [...stored.querySelectorAll('img')].forEach(photo=>{const figure=document.createElement('figure'),img=photo.cloneNode();img.loading='lazy';figure.append(img);if(owner)figure.append(action('Move earlier',()=>{const previous=photo.previousElementSibling;if(previous){previous.before(photo);notify();render();}}),action('Move later',()=>{const next=photo.nextElementSibling;if(next){next.after(photo);notify();render();}}));if(owner)figure.append(action('Remove photo',()=>{photo.remove();notify();render();}));gallery.append(figure);});
      if(!gallery.children.length){const empty=document.createElement('p');empty.className='work-detail-empty';empty.textContent=owner?'Add photos, plans, or detail drawings for this section.':'Photos and drawings coming soon.';gallery.append(empty);}section.append(gallery);
      if(owner){const tools=document.createElement('div');tools.className='work-section-tools';const label=document.createElement('label');label.className='section-upload';label.textContent='＋ Add photos / drawings';const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,image/gif,image/avif';input.multiple=true;input.disabled=frozen;input.setAttribute('aria-label','Add photos to '+title.textContent);label.append(input);input.onchange=()=>{for(const file of input.files){if(!file.type.startsWith('image/')||file.size>50*1024*1024){alert('Choose an image under 50 MB. Originals are never compressed.');continue;}const url=URL.createObjectURL(file);editor.files.set(url,file);const img=document.createElement('img');img.src=url;img.alt=file.name.replace(/\.[^.]+$/,'');stored.append(img);}input.value='';notify();render();};tools.append(label,action('Sort existing photos',()=>{section.querySelector('.existing-photo-choices')?.remove();const choices=document.createElement('div');choices.className='existing-photo-choices';const heading=document.createElement('p');heading.textContent='Choose a photo to move into this section:';choices.append(heading);const photos=[...card.querySelector('.project-gallery').querySelectorAll('img')];if(!photos.length)heading.textContent='All existing photos have been sorted. You can add more photos above.';photos.forEach(photo=>{const pick=action('',()=>{stored.append(photo);dialog.querySelectorAll('.dialog-gallery img').forEach(img=>{if(img.getAttribute('src')===photo.getAttribute('src'))img.closest('.gallery-item')?.remove();});notify();render();});pick.setAttribute('aria-label','Move existing photo '+(photo.alt||'to section'));pick.append(photo.cloneNode());choices.append(pick);});section.append(choices);}),action('Move up',()=>{const previous=source.previousElementSibling;if(previous?.classList.contains('project-work-section')){previous.before(source);notify();render();}}),action('Move down',()=>{const next=source.nextElementSibling;if(next?.classList.contains('project-work-section')){next.after(source);notify();render();}}));section.append(tools);}host.append(section);
    });
  }
  const setOwner=editor.setOwner;editor.setOwner=function(value){owner=value===true;const result=setOwner.call(this,value);render();return result;};
  const load=editor.loadContent;editor.loadContent=function(content){const result=load.call(this,content);render();return result;};
  const freeze=editor.freeze;editor.freeze=function(value){frozen=!!value;const result=freeze.call(this,value);render();return result;};
  addEventListener('hashchange',render);
  render();
})();

(() => {const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target);}}),{threshold:.08});function setup(){document.querySelectorAll('.intro-grid,.category-card,.notebook-grid,.process-grid article,.about-grid').forEach(el=>{if(!el.classList.contains('revealed')){el.classList.add('reference-reveal');observer.observe(el);}});}const previousLoad=window.portfolioEditor.loadContent;window.portfolioEditor.loadContent=function(content){const result=previousLoad.call(this,content);setup();return result;};setup();window.addEventListener('portfolio:change',setup);window.addEventListener('hashchange',setup);})();


(() => {
 const editor=window.portfolioEditor,main=document.querySelector('main');if(!editor)return;
 let owner=false,timer;const upload=document.createElement('input');upload.type='file';upload.className='all-edit-picker';upload.accept='image/jpeg,image/png,image/webp,image/gif,image/avif';upload.hidden=true;document.body.append(upload);let apply=null;
 function notify(){window.dispatchEvent(new Event('portfolio:change'));}
 function choose(callback){apply=callback;upload.click();}
 function preserve(img){if(!img)return;let archive=main.querySelector('.original-media-reference');if(!archive){archive=document.createElement('div');archive.className='original-media-reference';main.append(archive);}if(![...archive.querySelectorAll('img')].some(p=>p.getAttribute('src')===img.getAttribute('src')))archive.append(img.cloneNode());}
 upload.onchange=()=>{const file=upload.files[0];upload.value='';if(!owner||!file)return;if(file.size>50*1024*1024){alert('Choose an image under 50 MB. Originals are never compressed.');return;}const url=URL.createObjectURL(file);editor.files.set(url,file);apply?.(url,file);notify();};
 function button(text,callback){const b=document.createElement('button');b.type='button';b.textContent=text;b.className='all-edit-ui';b.onclick=callback;return b;}
 const bar=document.createElement('div');bar.className='all-edit-toolbar';document.body.append(bar);
 function current(){const h=location.hash.slice(1);return h.startsWith('project=')?main.querySelector('#'+CSS.escape(decodeURIComponent(h.slice(8)))):h.startsWith('category=')?main.querySelector('#'+CSS.escape(h.slice(9))):null;}
 function setup(){
   bar.hidden=!owner;bar.replaceChildren();document.body.classList.toggle('owner-content-controls',owner);if(!owner)return;
   bar.append(button('Edit all text',()=>{editor.enableEditing();document.querySelectorAll('.brand-name,.brand-discipline').forEach(el=>{el.contentEditable='true';el.focus();});bar.querySelector('button').textContent='Text editing enabled';}),button('Replace logo',()=>choose(url=>{const logo=document.querySelector('.brandmark');logo.replaceChildren();logo.className='brandmark custom-brand-logo';const img=document.createElement('img');img.src=url;img.alt='Ar Sneha Reddy logo';logo.append(img);}))); 
   document.querySelectorAll('.brand-name,.brand-discipline').forEach(el=>{el.contentEditable='true';el.oninput=()=>{clearTimeout(timer);timer=setTimeout(notify,500);};});
   const selected=current();if(selected){bar.append(button('Change cover photo',()=>choose((url,file)=>{const img=document.createElement('img');img.src=url;img.alt=file.name.replace(/\.[^.]+$/,'');if(selected.classList.contains('project-category')){const old=selected.querySelector('.category-cover');preserve(old);old?.remove();img.className='category-cover';selected.append(img);}else{const art=selected.querySelector('.project-art');preserve(art.querySelector('img'));art.replaceChildren(img);} })));}
   if(selected?.classList.contains('project-category')){const title=document.querySelector('.category-page h1'),description=document.querySelector('.category-description');for(const [el,target]of [[title,selected.querySelector('h3')],[description,selected.querySelector('p')]])if(el){el.contentEditable='true';el.oninput=()=>{target.textContent=el.textContent;};el.onblur=()=>setTimeout(notify,0);}}
   main.querySelectorAll('.reference-study,.material-study>img').forEach(img=>{if(img.nextElementSibling?.classList.contains('image-edit-control'))return;const control=button('Replace this image',()=>choose(url=>{preserve(img);img.src=url;}));control.classList.add('image-edit-control');img.after(control);});
 }
 const setOwner=editor.setOwner;editor.setOwner=function(value){owner=value===true;const result=setOwner.call(this,value);setup();return result;};
 const load=editor.loadContent;editor.loadContent=function(content){if(content.brandHTML)document.querySelector('.brand').innerHTML=content.brandHTML;const result=load.call(this,content);setup();return result;};
 const snapshot=editor.snapshot;editor.snapshot=function(){const content=snapshot.call(this),t=document.createElement('template');t.innerHTML=content.mainHTML;t.content.querySelectorAll('.all-edit-ui').forEach(el=>el.remove());content.mainHTML=t.innerHTML;const brand=document.querySelector('.brand').cloneNode(true);brand.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));content.brandHTML=brand.innerHTML;return content;};
 addEventListener('hashchange',()=>requestAnimationFrame(setup));addEventListener('portfolio:change',()=>{if(!document.activeElement?.isContentEditable)setup();});setup();
})();

