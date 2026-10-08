
  (() => {
    const main = document.querySelector('main');
    const founderFigure = main.querySelector('.founder-photo').cloneNode(true);
    const heroButton = main.querySelector('[data-photo="hero"]').cloneNode(true);
    const pendingFiles = new Map();
    let owner = false;
    main.querySelector('#experience')?.remove();
    main.querySelectorAll('a[href="#experience"]').forEach(link => link.remove());
    main.querySelectorAll('#about .fact').forEach(fact => {
      if (/^(education|experience)$/i.test(fact.querySelector('b')?.textContent.trim() || '')) fact.remove();
    });
    main.querySelectorAll('#about p').forEach(paragraph => {
      paragraph.textContent = paragraph.textContent.replace('with four years of professional experience in architecture and residential design', 'working across architecture and residential design');
    });
    if (!main.querySelector('.founder-photo')) main.querySelector('#about .about-grid > div').append(founderFigure);
    if (!main.querySelector('[data-photo="hero"]')) main.querySelector('.hero-visual').append(heroButton);
    document.getElementById('year').textContent = new Date().getFullYear();
    const toggle = document.getElementById('edit-toggle');
    const add = document.getElementById('add-project');
    const download = document.getElementById('download-html');
    const downloadPublic = document.getElementById('download-public');
    const publishFolder = document.getElementById('publish-folder');
    const picker = document.getElementById('image-picker');
    const profilePicker = document.getElementById('profile-picker');
    const galleryPicker = document.getElementById('gallery-picker');
    const dialog = document.getElementById('project-page');
    const dialogTitle = dialog.querySelector('.dialog-title');
    const dialogMeta = dialog.querySelector('.dialog-meta');
    const dialogDescription = dialog.querySelector('.dialog-description');
    const dialogGallery = dialog.querySelector('.dialog-gallery');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = lightbox.querySelector('.lightbox-stage img');
    const lightboxStage = lightbox.querySelector('.lightbox-stage');
    const zoomButton = document.getElementById('lightbox-zoom');
    let lightboxIndex = 0, touchStartX = null;
    const status = document.getElementById('editor-status');
    const grid = () => main.querySelector('.project-grid');
    let editing = false, targetArt = null, activeCard = null, saveTimer, photoKind = null;
    const intro = document.getElementById('intro-screen');
    const introVideo = document.getElementById('intro-video');
    const introPicker = document.getElementById('intro-picker');
    const introUpload = document.getElementById('intro-upload');
    const introPreview = document.getElementById('intro-preview');
    const introPlay = document.getElementById('intro-play');
    let introTimer;
    function closeIntro() {
      clearTimeout(introTimer);
      introVideo.pause();
      intro.hidden = true;
      introPlay.hidden = true;
      document.body.style.overflow = '';
    }
    function showIntro(force = false) {
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches && !force;
      intro.hidden = false;
      introPlay.hidden = true;
      document.body.style.overflow = 'hidden';
      document.getElementById('intro-skip').focus();
      if (reducedMotion) {
        introVideo.hidden = true;
        introTimer = setTimeout(closeIntro, 2800);
      } else if (introVideo.getAttribute('src')) {
        introVideo.hidden = false;
        try { introVideo.currentTime = 0; } catch {}
        try {
          const playback = introVideo.play();
          if (playback && playback.catch) playback.catch(() => {
            introVideo.hidden = true;
            introPlay.hidden = false;
            clearTimeout(introTimer);
            introTimer = setTimeout(closeIntro, 10000);
          });
        } catch {
          introVideo.hidden = true;
          introPlay.hidden = false;
        }
        introTimer = setTimeout(closeIntro, 10000);
      } else introTimer = setTimeout(closeIntro, 4800);
    }
    function editables() {
      return main.querySelectorAll('.hero-copy .eyebrow,.hero h1,.hero-copy p,.intro-lead,.intro-side p,.section-top h2,.section-top p,.project h3,.project-body p,.project-foot,.service h3,.service p,.about p,.fact span,.contact h2,.contact p,.contact-links a,.notebook-grid h3,.notebook-grid p,.process-grid h3,.process-grid p,.study-note,.diagram-label');
    }
    function setup() {
      editables().forEach(el => {
        el.dataset.editable = '';
        el.contentEditable = editing ? 'true' : 'false';
        el.spellcheck = editing;
      });
      main.querySelectorAll('.project').forEach(card => {
        if (!card.id) card.id = 'project-' + Math.random().toString(36).slice(2,10);
        if (!card.querySelector('.project-data')) {
          const data = document.createElement('div');
          data.className = 'project-data';
          data.innerHTML = '<p class="project-description">Add the project brief, design approach, materials, and your contribution.</p><div class="project-gallery"></div>';
          card.append(data);
        }
        card.querySelector('.project-open')?.remove();
        if (!card.querySelector('.card-hit')) {
          const link = document.createElement('a');
          link.className = 'card-hit';
          card.append(link);
        }
        card.querySelector('.card-hit').href = '#project=' + encodeURIComponent(card.id);
        card.querySelector('.card-hit').setAttribute('aria-label','Open project: ' + card.querySelector('h3').textContent);
        if (!card.querySelector('.card-tools')) {
          const tools = document.createElement('div');
          tools.className = 'card-tools';
          tools.innerHTML = '<button type="button" class="open-button">Open project</button><button type="button" class="image-button">Add / change image</button><button type="button" class="remove-button">Remove project</button>';
          card.append(tools);
        }
        if (!card.querySelector('.open-button')) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'open-button'; button.textContent = 'Open project';
          card.querySelector('.card-tools').prepend(button);
        }
      });
      document.body.classList.toggle('edit-mode', editing);
      toggle.textContent = editing ? 'Finish editing' : 'Edit website';
      add.hidden = introUpload.hidden = introPreview.hidden = !editing;
      download.hidden = downloadPublic.hidden = publishFolder.hidden = true;
      document.querySelector('.editor-bar').hidden = !owner;
      [dialogTitle,dialogMeta,dialogDescription].forEach(el => {
        el.contentEditable = editing ? 'true' : 'false';
        el.spellcheck = editing;
      });
    }
    function renderGallery() {
      dialogGallery.replaceChildren();
      const photos = activeCard?.querySelectorAll('.project-gallery img') || [];
      if (!photos.length) {
        const empty = document.createElement('p'); empty.className = 'gallery-empty';
        empty.textContent = editing ? 'Add photos of this project below.' : 'Project photos coming soon.';
        dialogGallery.append(empty);
      }
      photos.forEach((photo,index) => {
        const item = document.createElement('div'); item.className = 'gallery-item';
        const img = photo.cloneNode(true);
        const zoom = document.createElement('button');
        zoom.className = 'zoom-photo'; zoom.type = 'button'; zoom.dataset.index = index;
        zoom.setAttribute('aria-label','Open photo ' + (index + 1) + ' of ' + photos.length);
        zoom.append(img);
        const remove = document.createElement('button');
        remove.className = 'remove-photo'; remove.type = 'button'; remove.textContent = 'Remove photo'; remove.dataset.index = index;
        item.append(zoom,remove); dialogGallery.append(item);
      });
    }
    function showLightbox(index) {
      const photos = activeCard?.querySelectorAll('.project-gallery img') || [];
      if (!photos.length) return;
      lightboxIndex = (index + photos.length) % photos.length;
      const photo = photos[lightboxIndex];
      lightboxImage.src = photo.src;
      lightboxImage.alt = photo.alt || 'Project photo';
      lightboxStage.classList.remove('zoomed');
      zoomButton.textContent = 'Zoom in';
      lightbox.querySelector('.lightbox-caption').textContent = photo.alt || activeCard.querySelector('h3').textContent;
      lightbox.querySelector('.lightbox-count').textContent = (lightboxIndex + 1) + ' / ' + photos.length;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      document.getElementById('lightbox-close').focus();
    }
    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImage.removeAttribute('src');
      lightboxStage.classList.remove('zoomed');
      document.body.style.overflow = '';
    }
    function renderProjectRoute() {
      if (!lightbox.hidden) closeLightbox();
      const hash = location.hash.slice(1);
      const id = hash.startsWith('project=') ? decodeURIComponent(hash.slice(8)) : (!hash ? new URLSearchParams(location.search).get('project') : null);
      const card = id && document.getElementById(id);
      if (!card || !card.classList.contains('project')) {
        activeCard = null; main.hidden = false; dialog.hidden = true;
        document.title = 'Sneha Reddy Patlolla | Architect';
        return;
      }
      activeCard = card;
      dialogTitle.textContent = card.querySelector('h3').textContent;
      dialogMeta.textContent = card.querySelector('.project-body p').textContent;
      dialogDescription.textContent = card.querySelector('.project-description').textContent;
      renderGallery(); main.hidden = true; dialog.hidden = false;
      document.title = dialogTitle.textContent + ' | Sneha Reddy Patlolla';
      scrollTo(0,0);
    }
    function openProject(card) {
      clearTimeout(saveTimer);
      location.hash = 'project=' + encodeURIComponent(card.id);
      renderProjectRoute();
    }
    function goHome() {
      location.hash = 'work';
      renderProjectRoute();
      requestAnimationFrame(() => document.getElementById('work').scrollIntoView());
    }
    function save() {
      if (!owner) return;
      status.textContent = 'Unpublished changes. Save draft or Publish.';
      window.dispatchEvent(new Event('portfolio:change'));
    }
    function imageData(file) {
      if (!owner) return Promise.reject(new Error('Sign in first.'));
      if (file.size > 50 * 1024 * 1024) return Promise.reject(new Error('Choose a file under 50 MB.'));
      const url = URL.createObjectURL(file); pendingFiles.set(url,file);
      return Promise.resolve(url);
    }
    function updateContact() {
      main.querySelectorAll('.contact-links a').forEach(a => {
        const value = a.textContent.trim();
        if (value.includes('@')) a.href = 'mailto:' + value;
        else a.href = 'tel:' + value.replace(/[^+\d]/g, '');
      });
    }
    toggle.addEventListener('click', () => {
      if (!owner) return;
      editing = !editing; setup();
      if (!editing) { updateContact(); save(); status.textContent = 'Changes saved. Download HTML to update GitHub.'; }
      else status.textContent = 'Click text to edit; use project buttons for images.';
    });
    document.getElementById('intro-skip').addEventListener('click', closeIntro);
    introPlay.addEventListener('click', () => {
      introVideo.hidden = false;
      try {
        Promise.resolve(introVideo.play()).then(() => {
          introPlay.hidden = true; clearTimeout(introTimer); introTimer = setTimeout(closeIntro,10000);
        }).catch(() => { introVideo.hidden = true; status.textContent = 'This video format cannot play on this phone.'; });
      } catch { introVideo.hidden = true; }
    });
    introVideo.addEventListener('ended', closeIntro);
    introVideo.addEventListener('error', () => {
      introVideo.hidden = true; introPlay.hidden = true;
      clearTimeout(introTimer); introTimer = setTimeout(closeIntro,4800);
    });
    introUpload.addEventListener('click', () => introPicker.click());
    introPreview.addEventListener('click', () => showIntro(true));
    introPicker.addEventListener('change', async () => {
      const file = introPicker.files[0];
      if (!file || !owner) return;
      try { introVideo.src = await imageData(file); save(); showIntro(true); }
      catch (error) { status.textContent = error.message; }
      introPicker.value = '';
    });
    dialog.querySelector('.dialog-close').addEventListener('click', goHome);
    addEventListener('hashchange', () => {
      renderProjectRoute();
      if (!activeCard && location.hash && location.hash !== '#top') {
        const anchor = document.getElementById(location.hash.slice(1));
        if (anchor) requestAnimationFrame(() => anchor.scrollIntoView());
      }
    });
    addEventListener('popstate', renderProjectRoute);
    document.querySelectorAll('header nav a,.brand').forEach(link => link.addEventListener('click', () => {
      if (dialog.hidden) return;
      location.hash = link.getAttribute('href');
      renderProjectRoute();
    }));
    dialog.addEventListener('input', e => {
      if (!editing || !activeCard) return;
      if (e.target === dialogTitle) activeCard.querySelector('h3').textContent = dialogTitle.textContent;
      if (e.target === dialogMeta) activeCard.querySelector('.project-body p').textContent = dialogMeta.textContent;
      if (e.target === dialogDescription) activeCard.querySelector('.project-description').textContent = dialogDescription.textContent;
      save();
    });
    dialog.addEventListener('paste', e => {
      if (!editing || !e.target.isContentEditable) return;
      e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    dialogGallery.addEventListener('click', e => {
      const zoom = e.target.closest('.zoom-photo');
      if (zoom) { showLightbox(Number(zoom.dataset.index)); return; }
      const remove = e.target.closest('.remove-photo');
      if (!editing || !activeCard || !remove) return;
      const photo = activeCard.querySelectorAll('.project-gallery img')[Number(remove.dataset.index)];
      photo?.remove(); renderGallery(); save();
    });
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    zoomButton.addEventListener('click', () => {
      const zoomed = lightboxStage.classList.toggle('zoomed');
      zoomButton.textContent = zoomed ? 'Fit image' : 'Zoom in';
      lightboxStage.scrollTop = lightboxStage.scrollLeft = 0;
    });
    document.getElementById('lightbox-prev').addEventListener('click', () => showLightbox(lightboxIndex - 1));
    document.getElementById('lightbox-next').addEventListener('click', () => showLightbox(lightboxIndex + 1));
    document.addEventListener('keydown', e => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showLightbox(lightboxIndex - 1);
      if (e.key === 'ArrowRight') showLightbox(lightboxIndex + 1);
    });
    lightbox.addEventListener('touchstart', e => { touchStartX = e.touches[0]?.clientX ?? null; }, {passive:true});
    lightbox.addEventListener('touchend', e => {
      if (touchStartX === null) return;
      const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
      if (!lightboxStage.classList.contains('zoomed') && Math.abs(delta) > 55) showLightbox(lightboxIndex + (delta < 0 ? 1 : -1));
      touchStartX = null;
    }, {passive:true});
    document.getElementById('gallery-add').addEventListener('click', () => galleryPicker.click());
    document.getElementById('cover-from-gallery').addEventListener('click', () => {
      if (!activeCard) return;
      const first = activeCard.querySelector('.project-gallery img');
      if (!first) { status.textContent = 'Add a project photo first.'; return; }
      activeCard.querySelector('.project-art').replaceChildren(first.cloneNode(true)); save();
    });
    main.addEventListener('input', e => {
      if (editing && e.target.closest('[data-editable]')) { updateContact(); save(); }
    });
    main.addEventListener('paste', e => {
      if (!editing || !e.target.closest('[data-editable]')) return;
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    main.addEventListener('click', e => {
      const photoButton = e.target.closest('[data-photo]');
      if (editing && photoButton) { photoKind = photoButton.dataset.photo; profilePicker.click(); return; }
      const card = e.target.closest('.project');
      if (e.target.closest('.card-hit,.open-button') && card) { e.preventDefault(); openProject(card); return; }
      if (!editing) return;
      if (e.target.closest('.remove-button') && card) { card.remove(); save(); return; }
      if ((e.target.closest('.image-button') || e.target.closest('.project-art')) && card) {
        targetArt = card.querySelector('.project-art'); picker.click(); return;
      }
      if (e.target.closest('a')) e.preventDefault();
    });
    add.addEventListener('click', () => {
      const card = document.createElement('article');
      card.className = 'project';
      card.innerHTML = '<div class="project-art"><span>Project image coming soon</span></div><div class="project-body"><h3>New project</h3><p>Project type · Location</p><div class="project-foot">Your role</div></div><div class="project-data"><p class="project-description">Describe the project brief, design approach, materials, and your contribution.</p><div class="project-gallery"></div></div>';
      grid().append(card); setup(); save(); openProject(card);
    });
    picker.addEventListener('change', async () => {
      const file = picker.files[0];
      if (!file || !targetArt) return;
      try {
        const img = document.createElement('img');
        img.src = await imageData(file);
        img.alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        targetArt.replaceChildren(img);
        save(); status.textContent = 'Original image added without resizing. Download HTML to keep it.';
      } catch { status.textContent = 'Could not read that image.'; }
      picker.value = '';
    });
    profilePicker.addEventListener('change', async () => {
      const file = profilePicker.files[0];
      if (!file || !photoKind) return;
      try {
        const img = document.createElement('img');
        img.src = await imageData(file);
        img.className = 'user-photo';
        img.alt = photoKind === 'founder' ? 'Portrait of Sneha Reddy' : file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
        if (photoKind === 'hero') {
          main.querySelector('.hero-visual img').replaceWith(img);
          main.querySelector('.image-note').textContent = 'Architecture';
        } else {
          main.querySelector('.founder-photo img')?.remove();
          main.querySelector('.founder-photo').prepend(img);
        }
        save();
        status.textContent = 'Photo updated. Download HTML to publish it.';
      } catch { status.textContent = 'Could not open that photo.'; }
      profilePicker.value = ''; photoKind = null;
    });
    galleryPicker.addEventListener('change', async () => {
      const card = activeCard;
      if (!card) return;
      for (const file of [...galleryPicker.files]) {
        try {
          const img = document.createElement('img');
          img.src = await imageData(file);
          img.alt = file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
          card.querySelector('.project-gallery').append(img);
        } catch { status.textContent = 'One photo could not be opened.'; }
      }
      galleryPicker.value = ''; renderGallery(); save();
    });
    window.portfolioEditor = {
      files: pendingFiles,
      createProject({category,name,description}) { if (!owner) return; const card=document.createElement("article");card.className="project";card.setAttribute("data-category",category);card.innerHTML='<div class="project-art"><span>Project photos coming soon</span></div><div class="project-body"><h3></h3><p>Project type · Add location</p><div class="project-foot">Add your role</div></div><div class="project-data"><p class="project-description"></p><div class="project-gallery"></div></div>';card.querySelector("h3").textContent=name;card.querySelector(".project-description").textContent=description||"Add project description, materials, detailing and photos.";grid().append(card);editing=true;setup();openProject(card);save();return card.id; },
      setOwner(value) { if (owner === value) return; owner = value; editing = false; setup(); if (activeCard) renderGallery(); },
      freeze(value) {
        if (value) { editing = false; setup(); }
        document.querySelectorAll('.editor-bar button').forEach(button => button.disabled = value);
      },
      loadContent(content) {
        editing = false;
        pendingFiles.forEach((file,url)=>URL.revokeObjectURL(url)); pendingFiles.clear();
        main.innerHTML = content.mainHTML;
        if (content.introSrc) introVideo.src = content.introSrc; else introVideo.removeAttribute('src');
        main.querySelector('#experience')?.remove();
        main.querySelectorAll('#about .fact').forEach(fact=>{if (/^(education|experience)$/i.test(fact.querySelector('b')?.textContent.trim()||'')) fact.remove();});
        setup(); renderProjectRoute();
      },
      snapshot() {
        updateContact();
        const clone = main.cloneNode(true);
        clone.querySelectorAll('.card-tools,.hint').forEach(element=>element.remove());
        clone.querySelectorAll('[contenteditable],[data-editable],[spellcheck]').forEach(element=>{element.removeAttribute('contenteditable');element.removeAttribute('data-editable');element.removeAttribute('spellcheck');});
        return {mainHTML:clone.innerHTML,introSrc:introVideo.getAttribute('src')||''};
      }
    };
    setup();
    renderProjectRoute();
    showIntro();
  })();
  

