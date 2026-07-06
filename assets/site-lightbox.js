(function(){
  function svg(paths){ return '<svg viewBox="0 0 24 24" fill="currentColor">'+paths+'</svg>'; }
  var ICONS = {
    play:   '<path d="M8 5v14l11-7z"/>',
    pause:  '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    volOn:  '<path d="M3 10v4h4l5 5V5L7 10H3z"/><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z"/>',
    volOff: '<path d="M3 10v4h4l5 5V5L7 10H3z"/><path d="M19 12l2.1-2.1-1.4-1.4L17.6 10.6l-2.1-2.1-1.4 1.4L16.2 12l-2.1 2.1 1.4 1.4L17.6 13.4l2.1 2.1 1.4-1.4L19 12z"/>'
  };

  document.addEventListener('DOMContentLoaded', function(){
    var frames = Array.prototype.slice.call(document.querySelectorAll('.card-frame:has(video.ctrl-video), .card-frame[data-yt-id]'));
    if(!frames.length) return;

    function getTitleDesc(frame, fallbackTitle){
      var container = frame.closest('.card, .feature-film, .project-media');
      var titleEl = container ? container.querySelector('.card-title, .feature-film-title') : null;
      var descEl = container ? container.querySelector('.card-desc, .feature-note') : null;
      var title = titleEl ? titleEl.textContent.trim() : '';
      var desc = descEl ? descEl.textContent.trim() : '';
      if(!title){
        var stripRow = frame.closest('.strip-row');
        var stripTitleEl = stripRow ? stripRow.querySelector('.strip-title') : null;
        var stripSubEl = stripRow ? stripRow.querySelector('.strip-subtitle') : null;
        if(stripTitleEl) title = stripTitleEl.textContent.trim();
        if(stripSubEl) desc = stripSubEl.textContent.trim();
      }
      if(!title && fallbackTitle) title = fallbackTitle;
      return { title: title, desc: desc };
    }

    var items = frames.map(function(frame){
      var ytId = frame.getAttribute('data-yt-id');
      if(ytId){
        var td = getTitleDesc(frame, frame.getAttribute('data-yt-title') || '');
        return {
          type: 'youtube',
          frame: frame,
          ytId: ytId,
          title: td.title,
          desc: td.desc
        };
      }
      var video = frame.querySelector('video.ctrl-video');
      var sourceEl = video.querySelector('source');
      var td2 = getTitleDesc(frame, '');
      return {
        type: 'video',
        frame: frame,
        video: video,
        src: (sourceEl && sourceEl.src) || video.currentSrc || video.src,
        poster: video.getAttribute('poster') || '',
        title: td2.title,
        desc: td2.desc
      };
    });

    var overlay = document.createElement('div');
    overlay.className = 'vlb-overlay';
    overlay.innerHTML =
      '<button type="button" class="vlb-close" aria-label="Close">&times;</button>' +
      '<button type="button" class="vlb-arrow vlb-prev" aria-label="Previous">&lsaquo;</button>' +
      '<div class="vlb-stage">' +
        '<video class="vlb-video" playsinline></video>' +
        '<iframe class="vlb-iframe" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
        '<div class="vlb-ctrl">' +
          '<div class="vid-ctrl-group"><button type="button" class="vlb-play" aria-label="Play">' + svg(ICONS.pause) + '</button></div>' +
          '<div class="vid-ctrl-group"><button type="button" class="vlb-mute" aria-label="Mute">' + svg(ICONS.volOn) + '</button></div>' +
        '</div>' +
        '<div class="vlb-caption"></div>' +
      '</div>' +
      '<button type="button" class="vlb-arrow vlb-next" aria-label="Next">&rsaquo;</button>';
    document.body.appendChild(overlay);

    var lbVideo = overlay.querySelector('.vlb-video');
    var lbIframe = overlay.querySelector('.vlb-iframe');
    var lbPlay = overlay.querySelector('.vlb-play');
    var lbMute = overlay.querySelector('.vlb-mute');
    var lbCaption = overlay.querySelector('.vlb-caption');
    var lbClose = overlay.querySelector('.vlb-close');
    var lbPrev = overlay.querySelector('.vlb-prev');
    var lbNext = overlay.querySelector('.vlb-next');
    var lbCtrl = overlay.querySelector('.vlb-ctrl');
    var stage = overlay.querySelector('.vlb-stage');

    var currentIndex = -1;
    var inTransition = false;

    function supportsVT(){ return typeof document.startViewTransition === 'function'; }

    function setContent(item){
      if(item.type === 'youtube'){
        lbVideo.pause();
        lbVideo.removeAttribute('src');
        lbVideo.style.display = 'none';
        lbCtrl.style.display = 'none';
        lbIframe.style.display = 'block';
        lbIframe.src = 'https://www.youtube.com/embed/' + item.ytId + '?autoplay=1&rel=0';
        lbCaption.textContent = item.title + (item.desc ? ' — ' + item.desc : '');
      } else {
        lbIframe.style.display = 'none';
        lbIframe.src = '';
        lbVideo.style.display = '';
        lbCtrl.style.display = '';
        lbVideo.pause();
        lbVideo.src = item.src;
        lbVideo.poster = item.poster;
        lbVideo.currentTime = 0;
        lbVideo.muted = false;
        lbCaption.textContent = item.title + (item.desc ? ' — ' + item.desc : '');
        lbMute.innerHTML = svg(lbVideo.muted ? ICONS.volOff : ICONS.volOn);
        lbPlay.innerHTML = svg(ICONS.pause);
        var p = lbVideo.play();
        if(p && p.catch) p.catch(function(){});
      }
    }

    function openAt(index){
      if(!items.length || inTransition) return;
      if(index < 0) index = items.length - 1;
      if(index >= items.length) index = 0;
      var wasOpen = overlay.classList.contains('open');
      currentIndex = index;
      var item = items[currentIndex];

      if(!wasOpen && supportsVT() && item.frame){
        inTransition = true;
        item.frame.style.viewTransitionName = 'vlb-shared';
        var t = document.startViewTransition(function(){
          item.frame.style.viewTransitionName = '';
          stage.style.viewTransitionName = 'vlb-shared';
          overlay.classList.add('open');
          document.body.style.overflow = 'hidden';
          setContent(item);
        });
        t.finished.finally(function(){ inTransition = false; });
      } else {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        setContent(item);
      }
    }

    function close(){
      if(inTransition) return;
      if(!overlay.classList.contains('open')) return;
      var item = items[currentIndex];
      function cleanup(){
        lbVideo.pause();
        lbVideo.removeAttribute('src');
        lbVideo.load();
        lbIframe.src = '';
      }
      if(supportsVT() && item && item.frame){
        inTransition = true;
        stage.style.viewTransitionName = 'vlb-shared';
        var t = document.startViewTransition(function(){
          stage.style.viewTransitionName = '';
          item.frame.style.viewTransitionName = 'vlb-shared';
          overlay.classList.remove('open');
          document.body.style.overflow = '';
          lbVideo.pause();
        });
        t.finished.finally(function(){
          item.frame.style.viewTransitionName = '';
          cleanup();
          inTransition = false;
        });
      } else {
        overlay.classList.remove('open');
        cleanup();
        document.body.style.overflow = '';
      }
    }

    items.forEach(function(item, i){
      if(!item.frame) return;
      item.frame.addEventListener('click', function(){ openAt(i); });
    });

    lbPlay.addEventListener('click', function(){
      if(lbVideo.paused){ lbVideo.play(); } else { lbVideo.pause(); }
    });
    lbVideo.addEventListener('play', function(){ lbPlay.innerHTML = svg(ICONS.pause); });
    lbVideo.addEventListener('pause', function(){ lbPlay.innerHTML = svg(ICONS.play); });
    lbVideo.addEventListener('click', function(){
      if(lbVideo.paused){ lbVideo.play(); } else { lbVideo.pause(); }
    });
    lbMute.addEventListener('click', function(e){
      e.stopPropagation();
      lbVideo.muted = !lbVideo.muted;
      lbMute.innerHTML = svg(lbVideo.muted ? ICONS.volOff : ICONS.volOn);
    });

    lbClose.addEventListener('click', close);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) close(); });
    lbPrev.addEventListener('click', function(e){ e.stopPropagation(); openAt(currentIndex - 1); });
    lbNext.addEventListener('click', function(e){ e.stopPropagation(); openAt(currentIndex + 1); });

    document.addEventListener('keydown', function(e){
      if(!overlay.classList.contains('open')) return;
      if(e.key === 'Escape') close();
      else if(e.key === 'ArrowLeft') openAt(currentIndex - 1);
      else if(e.key === 'ArrowRight') openAt(currentIndex + 1);
    });
  });
})();
