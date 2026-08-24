// Page behavior: scroll-in animation, the how-it-works sequence,
// nav hairline on scroll, smooth anchors.
// (The mobile nav toggle lives in base.njk so carried-over pages get it too.)
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── generic scroll-in ─────────────────────────────────────── */
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.style.animationPlayState = 'running'; obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.anim').forEach(function (el) { obs.observe(el); });

  /* ── the how-it-works sequence ─────────────────────────────── */

  // Split a panel's copy into word spans once, so nothing reflows mid-type.
  function prepareWords(el) {
    if (el.dataset.wordsReady) return;
    el.dataset.wordsReady = '1';
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      if (n.parentElement && n.parentElement.closest('.qmark')) continue; // leave the quote mark showing
      nodes.push(n);
    }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function typeOut(el, done) {
    var words = el.querySelectorAll('.w');
    if (reduced || !words.length) {
      words.forEach(function (w) { w.classList.add('on'); });
      if (done) done(0);
      return;
    }
    var STEP = 22;
    var caret = document.createElement('span');
    caret.className = 'seq-caret';
    caret.setAttribute('aria-hidden', 'true');
    el.appendChild(caret);
    words.forEach(function (w, i) {
      el._timers.push(setTimeout(function () { w.classList.add('on'); }, i * STEP));
    });
    var total = words.length * STEP;
    el._timers.push(setTimeout(function () { if (caret.parentNode) caret.remove(); }, total + 500));
    if (done) done(total);
  }

  function run(root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-seq]'));
    items.sort(function (a, b) { return (+a.dataset.seq) - (+b.dataset.seq); });
    root._timers = root._timers || [];

    items.forEach(function (el) {
      var delay = el.dataset.seqDelay ? +el.dataset.seqDelay : (+el.dataset.seq) * 240;
      if (reduced) delay = 0;
      root._timers.push(setTimeout(function () {
        el.classList.add('seq-in');
        root.querySelectorAll('[data-stagger][data-in-step="' + el.dataset.seq + '"]')
          .forEach(function (s) { s.classList.add('seq-in'); });
        var typer = el.matches('[data-typewriter]') ? el : el.querySelector('[data-typewriter]');
        if (typer) { typer._timers = root._timers; prepareWords(typer); typeOut(typer); }
      }, delay));
    });
  }

  function reset(root) {
    (root._timers || []).forEach(clearTimeout);
    root._timers = [];
    root.querySelectorAll('.seq-in').forEach(function (el) { el.classList.remove('seq-in'); });
    root.querySelectorAll('.w.on').forEach(function (w) { w.classList.remove('on'); });
    root.querySelectorAll('.seq-caret').forEach(function (c) { c.remove(); });
  }

  document.querySelectorAll('[data-sequence]').forEach(function (root) {
    // Prepare the words up front so the panel reserves its full height.
    root.querySelectorAll('[data-typewriter]').forEach(prepareWords);

    var seen = false;
    var o = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !seen) { seen = true; run(root); o.disconnect(); }
      });
    }, { threshold: 0.25 });
    o.observe(root);

    var btn = document.querySelector('[data-replay="' + root.id + '"]');
    if (btn) {
      btn.classList.add('ready');
      btn.addEventListener('click', function () {
        reset(root);
        requestAnimationFrame(function () { run(root); });
      });
    }
  });

  /* ── nav hairline ──────────────────────────────────────────── */
  var nav = document.getElementById('siteNav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── smooth anchors ────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
})();
