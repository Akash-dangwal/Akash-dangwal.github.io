/* v3c — motion layer. Everything degrades to a static page without JS or with reduced motion. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------- clock (IST) ---------- */
  var clock = document.getElementById('clock');
  function tick() {
    if (!clock) return;
    clock.textContent = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST';
  }
  tick(); setInterval(tick, 30000);

  /* ---------- work rows: one open at a time ---------- */
  var rows = Array.prototype.slice.call(document.querySelectorAll('.row'));
  var lenis = null; /* assigned later if smooth scroll is on */
  rows.forEach(function (row) {
    row.addEventListener('toggle', function () {
      if (!row.open) return;
      /* close the others without animating, so the layout settles at once */
      rows.forEach(function (o) {
        if (o !== row && o.open) { o.classList.add('instant'); o.open = false; void o.offsetHeight; o.classList.remove('instant'); }
      });
      /* then bring the clicked row to the top of the viewport */
      var y = row.getBoundingClientRect().top + window.scrollY - 24;
      if (lenis) lenis.scrollTo(y, { duration: 0.8 });
      else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 550);
    });
  });

  /* ---------- hover preview that follows the cursor ---------- */
  var preview = document.querySelector('.hover-preview');
  if (preview && fine) {
    var px = 0, py = 0, tx = 0, ty = 0, vx = 0, running = false;
    function loop() {
      var nx = px + (tx - px) * 0.16;
      vx = nx - px; px = nx; py += (ty - py) * 0.16;
      preview.style.left = px + 'px'; preview.style.top = py + 'px';
      preview.style.transform = 'translate(-50%,-50%) rotate(' + Math.max(-6, Math.min(6, vx * 0.15)) + 'deg) scale(' + (preview.classList.contains('on') ? 1 : .9) + ')';
      requestAnimationFrame(loop);
    }
    rows.forEach(function (row) {
      var sum = row.querySelector('summary');
      sum.addEventListener('mouseenter', function (e) {
        if (row.open) return;
        if (!running) { running = true; px = tx = e.clientX; py = ty = e.clientY; loop(); }
        preview.src = row.getAttribute('data-img');
        preview.classList.add('on');
      });
      sum.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; });
      sum.addEventListener('mouseleave', function () { preview.classList.remove('on'); });
      row.addEventListener('toggle', function () { if (row.open) preview.classList.remove('on'); });
    });
  }

  if (reduce || !hasGsap) { root.classList.add('motion-off'); return; }
  root.classList.add('motion-on');
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll (Lenis) ---------- */
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var target = id === '#top' ? 0 : document.querySelector(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      });
    });
  }

  /* ---------- split helpers ---------- */
  function splitWords(el, cls) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span'); w.className = cls;
          if (cls === 'w') { var inner = document.createElement('span'); inner.textContent = part; w.appendChild(inner); }
          else { w.textContent = part; }
          frag.appendChild(w);
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        splitWords(n, cls);
      }
    });
  }

  /* ---------- first load: curtain, then the hero ---------- */
  var curtain = document.querySelector('.curtain');
  var intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (curtain) {
    intro.to(curtain, { scaleY: 0, duration: 0.9, ease: 'power4.inOut', delay: 0.15, onComplete: function () { curtain.remove(); } });
  }
  var nameWords = document.querySelectorAll('.hero-name span');
  intro.from(nameWords, { yPercent: 60, opacity: 0, duration: 1, stagger: 0.1 }, '-=0.45')
       .from('.hero-photo', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'power4.inOut' }, '<')
       .from('.hero-role, .hero-where', { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.6')
       .from('.nav', { opacity: 0, duration: 0.6 }, '-=0.6');

  /* ---------- hero photo drifts as you leave ---------- */
  gsap.to('.hero-photo img', {
    yPercent: 12, scale: 1.08, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* ---------- intro statement: words fill in as you scroll ---------- */
  document.querySelectorAll('[data-fill]').forEach(function (el) {
    splitWords(el, 'fw');
    var words = el.querySelectorAll('.fw');
    gsap.to(words, {
      color: getComputedStyle(root).getPropertyValue('--ink').trim() || '#111',
      stagger: 0.04, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  /* ---------- masked word reveals on headings ---------- */
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    splitWords(el, 'w');
    var inner = el.querySelectorAll('.w > span');
    gsap.from(inner, {
      yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.035,
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* ---------- parallax inside the workflow frames ---------- */
  document.querySelectorAll('.shot-wrap').forEach(function (wrap) {
    var img = wrap.querySelector('img');
    gsap.fromTo(img, { yPercent: -3, scale: 1.05 }, {
      yPercent: 3, ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ---------- ticker: speed and skew follow scroll velocity, reverses on scroll up ---------- */
  var track = document.querySelector('.ticker-track');
  if (track) {
    var half = track.scrollWidth / 2, x = 0, dir = 1, vel = 0;
    ScrollTrigger.create({
      onUpdate: function (self) {
        var v = self.getVelocity();
        vel = gsap.utils.clamp(-2000, 2000, v);
        if (v < -50) dir = -1; else if (v > 50) dir = 1;
      }
    });
    gsap.ticker.add(function (t, dt) {
      var speed = (0.6 + Math.abs(vel) / 400) * dir * (dt / 16.67);
      x -= speed;
      if (x <= -half) x += half; if (x > 0) x -= half;
      vel *= 0.92;
      track.style.transform = 'translate3d(' + x + 'px,0,0) skewX(' + gsap.utils.clamp(-12, 12, -vel / 150) + 'deg)';
    });
  }

  /* ---------- services, about, rows: soft rise ---------- */
  gsap.utils.toArray('.row, .service-list li, .about-photo').forEach(function (el) {
    gsap.from(el, { y: 28, opacity: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  /* ---------- contact block slides up from beneath ---------- */
  gsap.from('.contact-inner', {
    yPercent: -25, ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 20%', scrub: true }
  });

  /* ---------- magnetic links ---------- */
  if (fine) {
    document.querySelectorAll('.nav nav a, .text-link, .contact-links a').forEach(function (el) {
      var r = 48;
      el.addEventListener('mousemove', function (e) {
        var b = el.getBoundingClientRect();
        var dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
        gsap.to(el, { x: dx * 0.3, y: dy * 0.3, duration: 0.4, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', function () { gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }); });
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
