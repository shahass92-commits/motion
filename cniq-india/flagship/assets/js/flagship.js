/* Compass Nexus iQ flagship · motion
   GSAP ScrollTrigger drives every section and Lenis smooths the scroll. Headlines rise line by
   line out of masks, numbers count up as they arrive, the mobility opener and the ride journey
   pin while their scenes play, and the six logistics services run past sideways. With reduced
   motion, or if GSAP fails to load, everything is shown in place and the page still works. */
(() => {
  'use strict';

  window.__cniqReady = true;
  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const hasSplit = hasGSAP && !!window.SplitText;
  const hasScramble = hasGSAP && !!window.ScrambleTextPlugin;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- page furniture that works without GSAP ----------
  $('#year').textContent = new Date().getFullYear();

  const ticks = (g, n, r0, r1, cx, cy, every, longR) => {
    if (!g) return;
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const inner = i % every === 0 ? longR : r1;
      out += `<line x1="${(cx + Math.sin(a) * r0).toFixed(2)}" y1="${(cy - Math.cos(a) * r0).toFixed(2)}" x2="${(cx + Math.sin(a) * inner).toFixed(2)}" y2="${(cy - Math.cos(a) * inner).toFixed(2)}" stroke-width="${i % every === 0 ? 1.4 : 0.6}"/>`;
    }
    g.innerHTML = out;
  };
  ticks($('#dialTicks'), 120, 196, 188, 200, 200, 10, 176);
  ticks($('#pTicks'), 36, 46, 42, 50, 50, 9, 38);

  const drawer = $('#drawer');
  const menuBtn = $('#menuBtn');
  let lenis = null;
  const setDrawer = (open) => {
    drawer.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
    const [a, b] = menuBtn.querySelectorAll('i');
    a.style.transform = open ? 'translateY(3.25px) rotate(45deg)' : '';
    b.style.transform = open ? 'translateY(-3.25px) rotate(-45deg)' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  menuBtn.addEventListener('click', () => setDrawer(drawer.hidden));
  addEventListener('keydown', (e) => e.key === 'Escape' && !drawer.hidden && setDrawer(false));

  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (!drawer.hidden) setDrawer(false);
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    const label = b.textContent;
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = 'Copied';
    } catch (_) {
      b.textContent = 'Select to copy';
    }
    setTimeout(() => (b.textContent = label), 1600);
  }));

  // quote form: two kinds of request, composed into one email
  const form = $('#quoteForm');
  const msg = $('#formMsg');
  const mail = $('#mailLink');
  const email = $('#contactEmail').textContent.trim();
  let kind = 'mobility';
  const val = (id) => ($('#' + id)?.value || '').trim();
  const compose = () => {
    const lines = [`Name: ${val('qName')}`, `Company: ${val('qCompany')}`];
    if (kind === 'mobility') {
      lines.unshift('Request: Employee transport');
      lines.push(`Campus or site: ${val('qSite')}`, `Employees per shift: ${val('qHeads')}`, `Shift timings: ${val('qShifts')}`);
    } else {
      lines.unshift('Request: Logistics');
      lines.push(`Pickup: ${val('qFrom')}`, `Drop: ${val('qTo')}`, `Cargo: ${val('qCargo')}`);
    }
    lines.push(`Notes: ${val('qNotes')}`);
    return lines.join('\n');
  };
  const syncMail = () => {
    const subject = kind === 'mobility' ? 'Employee transport request' : 'Logistics quote request';
    mail.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compose())}`;
  };
  $$('[data-kind]', form).forEach((b) => b.addEventListener('click', () => {
    kind = b.dataset.kind;
    $$('[data-kind]', form).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('[data-kind-fields]', form).forEach((f) => (f.hidden = f.dataset.kindFields !== kind));
    msg.textContent = '';
    syncMail();
    if (hasGSAP) ScrollTrigger.refresh();
  }));
  form.addEventListener('input', syncMail);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const need = kind === 'mobility' ? ['qName', 'qSite'] : ['qName', 'qFrom', 'qTo'];
    const missing = need.find((id) => !val(id));
    if (missing) {
      msg.textContent = kind === 'mobility' ? 'Add your name and the campus or site.' : 'Add your name, pickup and drop.';
      $('#' + missing).focus();
      return;
    }
    try {
      await navigator.clipboard.writeText(compose());
      msg.textContent = `Request copied. Paste it into an email to ${email}, or use Open in email.`;
    } catch (_) {
      msg.textContent = 'Copying is blocked here. Use Open in email instead.';
    }
  });
  syncMail();

  // simulated trip monitor in the hero (clearly labelled as a simulated feed)
  const monitor = () => {
    const eta = $('#pEta');
    const spd = $('#pSpd');
    const hdg = $('#pHdg');
    const needle = $('#pNeedle');
    const routeBar = $('#pRoute');
    const cab = $('#pCab');
    const clock = $('#pClock');
    let e = 6;
    let p = 38;
    let h = 12;
    let m = 41;
    setInterval(() => {
      p = p >= 92 ? 18 : p + 2 + Math.random() * 3;
      if (p < 25) e = 7;
      else if (Math.random() < 0.35) e = Math.max(1, e - 1);
      h = (h + (Math.random() - 0.45) * 26 + 360) % 360;
      if (Math.random() < 0.3) m = (m + 1) % 60;
      eta.textContent = pad(e);
      spd.textContent = pad(Math.round(22 + Math.random() * 26));
      hdg.textContent = `${pad(Math.round(h), 3)}° ${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(h / 45) % 8]}`;
      clock.textContent = `21:${pad(m)}`;
      routeBar.style.width = cab.style.left = p.toFixed(1) + '%';
      if (hasGSAP) gsap.to(needle, { rotation: h, svgOrigin: '50 50', duration: 1.2, ease: 'power3.out' });
      else needle.setAttribute('transform', `rotate(${h} 50 50)`);
    }, 2400);
    routeBar.style.transition = cab.style.transition = 'width 1.6s cubic-bezier(.16,1,.3,1), left 1.6s cubic-bezier(.16,1,.3,1)';
  };
  if (!reduce) monitor();

  const telemetryFeed = () => {
    const lat = $('#tLat');
    const lon = $('#tLon');
    const spd = $('#tSpd');
    const fence = $('#tFence');
    let a = 8.5241;
    let b = 76.9366;
    setInterval(() => {
      a += (Math.random() - 0.4) * 0.0009;
      b += (Math.random() - 0.4) * 0.0011;
      lat.textContent = `${a.toFixed(4).padStart(7, '0')}° N`;
      lon.textContent = `${b.toFixed(4).padStart(8, '0')}° E`;
      spd.textContent = pad(Math.round(38 + Math.random() * 26));
      fence.textContent = Math.random() < 0.2 ? 'NH 66 corridor' : 'Port gate 2';
    }, 1800);
  };
  if (!reduce) telemetryFeed();

  const loader = $('#loader');
  if (!hasGSAP || reduce) {
    doc.classList.add(hasGSAP ? 'reduced' : 'no-gsap');
    loader?.remove();
    $$('.step-item').forEach((s) => s.classList.add('is-on'));
    $$('.load-step').forEach((s) => s.classList.add('is-lit'));
    return;
  }

  // ---------- GSAP ----------
  gsap.registerPlugin(ScrollTrigger, ...[window.SplitText, window.ScrambleTextPlugin].filter(Boolean));
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // header: glass bar once scrolled, progress line, active section
  const header = $('#siteHeader');
  ScrollTrigger.create({ start: 60, end: 'max', onToggle: (s) => (header.dataset.scrolled = String(s.isActive)) });
  gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  $$('[data-nav]').forEach((a) => {
    const sec = $(a.getAttribute('href'));
    if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => (a.dataset.active = String(s.isActive)) });
  });

  // ---------- hero ----------
  const dial = $('#heroDial');
  dial.classList.remove('-translate-y-1/2');
  gsap.set(dial, { yPercent: -50 });
  gsap.to(dial, { rotation: 360, duration: 240, repeat: -1, ease: 'none' });
  gsap.set('[data-hero-in]', { autoAlpha: 0, y: 30 });
  gsap.set('#heroPanel', { autoAlpha: 0, y: 40, scale: 0.96 });
  gsap.set('#heroArt canvas', { scale: 1.12 });

  // the intro animates the children; the scroll exit only ever touches #heroArt and #heroFg
  gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('#heroArt', { yPercent: 14, scale: 1.12, ease: 'none' }, 0)
    .to('#heroFg', { yPercent: -12, opacity: 0, ease: 'none' }, 0);
  gsap.to('.cue-dot', { y: 40, duration: 1.4, repeat: -1, ease: 'power2.inOut' });

  const heroIntro = () => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('#heroArt canvas', { scale: 1, duration: 2.6, ease: 'power3.out' }, 0);
    if (hasSplit) {
      const split = SplitText.create('#heroTitle', { type: 'lines,words', mask: 'lines' });
      tl.from(split.words, { yPercent: 115, rotation: 4, duration: 1.3, stagger: 0.05 }, 0.15)
        .add(() => split.revert());
    }
    tl.to('[data-hero-in]', { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.45)
      .to('#heroPanel', { autoAlpha: 1, y: 0, scale: 1, duration: 1.3 }, 0.8);
  };

  // loader: count to 100 while the needle swings and settles on north
  const runLoader = () => {
    lenis?.stop();
    const o = { v: 0 };
    const count = $('#loaderCount');
    const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
    gsap.timeline()
      .to(o, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: () => (count.textContent = pad(Math.round(o.v), 3)) }, 0)
      .to('#loaderBar', { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 0)
      .fromTo('#loaderNeedle', { rotation: -200, svgOrigin: '20 20' }, { rotation: 720, svgOrigin: '20 20', duration: 1.6, ease: 'power3.inOut' }, 0)
      .add(() => fonts.then(() => {
        gsap.to(loader, {
          yPercent: -100, duration: 1.05, ease: 'expo.inOut',
          onComplete: () => { loader.remove(); lenis?.start(); ScrollTrigger.refresh(); },
        });
        gsap.delayedCall(0.35, heroIntro);
      }));
  };

  // ---------- marquee driven by scroll velocity ----------
  const mq = $('#marquee');
  const loop = gsap.to(mq, { xPercent: -50, duration: 42, ease: 'none', repeat: -1 });
  let dir = 1;
  ScrollTrigger.create({
    trigger: mq, start: 'top bottom', end: 'bottom top',
    onUpdate: (s) => {
      const v = s.getVelocity();
      dir = s.direction;
      gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 300, 8)), duration: 0.25, overwrite: true });
      gsap.to(mq, { skewX: clamp(-v / 320, -9, 9), duration: 0.35, overwrite: 'auto' });
    },
  });
  ScrollTrigger.addEventListener('scrollEnd', () => {
    gsap.to(loop, { timeScale: dir, duration: 1.2, overwrite: true });
    gsap.to(mq, { skewX: 0, duration: 0.8, overwrite: 'auto' });
  });

  // ---------- statement: words light up as you read ----------
  if (hasSplit) {
    const st = $('[data-scrub-words]');
    SplitText.create(st, {
      type: 'words', autoSplit: true,
      onSplit: (self) => gsap.fromTo(self.words, { opacity: 0.12 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: st, start: 'top 78%', end: 'bottom 42%', scrub: true },
      }),
    });
  }
  $$('[data-drift]').forEach((el) => gsap.to(el, { xPercent: 30, yPercent: 20, duration: 14, repeat: -1, yoyo: true, ease: 'sine.inOut' }));

  // ---------- 01 mobility: the shuttle drives in, parks, drives out ----------
  const shuttle = $('#shuttleWrap');
  const wheels = $$('#shuttle .v-wheel');
  const wheelX = [190, 712];
  const spinWheels = () => {
    const x = gsap.getProperty(shuttle, 'x');
    const scale = shuttle.offsetWidth / 900;
    const deg = (x / (47 * scale)) * 57.29578;
    wheels.forEach((w, i) => w.setAttribute('transform', `translate(${wheelX[i]} 244) rotate(${deg.toFixed(2)})`));
  };
  gsap.timeline({
    scrollTrigger: { trigger: '#mobOpener', start: 'top top', end: '+=130%', pin: true, scrub: 0.7, anticipatePin: 1 },
    onUpdate: spinWheels,
  })
    .fromTo(shuttle, { x: () => -shuttle.offsetWidth * 1.08 }, { x: () => (innerWidth - shuttle.offsetWidth) * 0.5, duration: 1, ease: 'power2.out' }, 0)
    .to('#campusArt', { scale: 1.08, duration: 2.6, ease: 'none' }, 0)
    .from('.shuttle-chip', { autoAlpha: 0, y: 26, scale: 0.85, stagger: 0.08, duration: 0.35, ease: 'back.out(2)' }, 0.78)
    .to({}, { duration: 0.35 })
    .to('.shuttle-chip', { autoAlpha: 0, y: -16, stagger: 0.04, duration: 0.25 })
    .to(shuttle, { x: () => innerWidth * 1.04, duration: 1, ease: 'power2.in' }, '<')
    .to('#mobOpener .wrap', { yPercent: -20, autoAlpha: 0, duration: 0.6, ease: 'power1.in' }, '-=0.5');

  // ---------- the ride, step by step ----------
  const screens = $$('#phoneScreen .screen');
  const steps = $$('#rideSteps .step-item');
  const N = screens.length;
  const STATUS = ['Scheduled', 'Assigned', 'Driver en route', 'Trip started', 'Trip completed', 'Trip completed'];
  const stepCopy = steps.map((s) => [s.querySelector('h4').textContent, s.querySelector('p').textContent]);
  const cap = { no: $('#capNo'), title: $('#capTitle'), text: $('#capText') };
  const etaEl = $('[data-eta]');
  const route = $('#routeLive');
  const routeBase = $('#routeBase');
  const routeCab = $('#routeCab');
  const L = route.getTotalLength();
  const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  tmp.setAttribute('d', 'M40 244C90 226 112 196 148 176');
  $('#routeMap').appendChild(tmp);
  const f1 = tmp.getTotalLength() / L;
  tmp.remove();
  route.style.strokeDasharray = `${L} ${L}`;
  gsap.set(screens.slice(1), { autoAlpha: 0, y: 24 });
  let cur = 0;
  const setStep = (i) => {
    if (i === cur) return;
    cur = i;
    screens.forEach((s, k) => gsap.to(s, { autoAlpha: k === i ? 1 : 0, y: k === i ? 0 : k < i ? -22 : 22, duration: 0.55, ease: 'power3.out', overwrite: true }));
    steps.forEach((s, k) => {
      s.classList.toggle('is-on', k <= i);
      s.classList.toggle('is-current', k === i);
    });
    $('#mStep').textContent = pad(i + 1);
    $('#mStatus').textContent = STATUS[i];
    gsap.fromTo('#stepCaption', { autoAlpha: 0.2, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, overwrite: true });
    cap.no.textContent = pad(i + 1);
    [cap.title.textContent, cap.text.textContent] = stepCopy[i];
  };
  const drive = (p) => {
    const s = p * N;
    let f = 0;
    if (s >= 2 && s < 3) f = (s - 2) * f1;
    else if (s >= 3 && s < 4) f = f1;
    else if (s >= 4 && s < 5) f = lerp(f1, 1, s - 4);
    else if (s >= 5) f = 1;
    route.style.strokeDashoffset = String(L * (1 - f));
    const pt = routeBase.getPointAtLength(f * L);
    routeCab.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    $('#mKm').textContent = (s < 3 ? 0 : ((f - f1) / (1 - f1)) * 11.6).toFixed(1);
    if (etaEl) etaEl.textContent = pad(Math.max(1, Math.round(6 - clamp(s - 2, 0, 1) * 5)));
  };
  drive(0);
  ScrollTrigger.create({
    trigger: '#journey', pin: '#journeyPin', start: 'top top', end: () => '+=' + innerHeight * N * 0.75,
    scrub: true, anticipatePin: 1,
    onUpdate: (self) => {
      setStep(Math.min(N - 1, Math.floor(self.progress * N)));
      drive(self.progress);
    },
  });
  gsap.to('.map-ping', { attr: { r: 26 }, opacity: 0, duration: 1.6, repeat: -1, ease: 'power2.out' });

  // ---------- 02 logistics: services run past sideways ----------
  const track = $('[data-hscroll-track]');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const hs = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '#hscroll', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
  });
  $$('.hpanel').forEach((panel) => {
    gsap.fromTo(panel.querySelector('.art'), { xPercent: -5 }, {
      xPercent: 5, ease: 'none',
      scrollTrigger: { trigger: panel, containerAnimation: hs, start: 'left right', end: 'right left', scrub: true },
    });
    gsap.from(panel.querySelector('.hcap'), {
      y: 70, autoAlpha: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: panel, containerAnimation: hs, start: 'left 72%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.to('#loadLine', {
    scaleX: 1, ease: 'none',
    scrollTrigger: {
      trigger: '#loadSteps ol', start: 'top 72%', end: 'bottom 50%', scrub: true,
      onUpdate: (s) => $$('.load-step').forEach((el, i) => el.classList.toggle('is-lit', s.progress >= i / 6 + 0.02)),
    },
  });

  // ---------- 03 platform ----------
  $$('.aurora').forEach((a, i) => gsap.to(a, { xPercent: i % 2 ? -25 : 25, yPercent: i % 2 ? 15 : -15, duration: 16 + i * 3, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
  const chainLine = $('.chain-line');
  if (chainLine) {
    gsap.fromTo(chainLine, { strokeDasharray: 800, strokeDashoffset: 800 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: '#chain', start: 'top 80%' } });
    gsap.from('.chain-node', { y: 26, autoAlpha: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '#chain', start: 'top 82%' } });
  }
  const states = $$('#states .state-chip').slice(0, 9);
  ScrollTrigger.create({
    trigger: '#states', start: 'top 82%', end: 'bottom 30%', scrub: true,
    onUpdate: (s) => {
      const i = Math.floor(s.progress * states.length * 0.999);
      states.forEach((c, k) => {
        c.classList.toggle('is-on', k < i);
        c.classList.toggle('is-now', k === i);
      });
    },
  });
  if (hasScramble) {
    $$('#flags [data-type]').forEach((el) => {
      const text = el.textContent;
      el.textContent = '';
      el.style.minHeight = '1em';
      gsap.to(el, { duration: 1.4, scrambleText: { text, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·', speed: 0.6, revealDelay: 0.2 }, scrollTrigger: { trigger: '#flags', start: 'top 82%' }, delay: $$('#flags [data-type]').indexOf(el) * 0.25 });
    });
    const au = $('#auditNew');
    gsap.from(au, { duration: 1.2, scrambleText: { text: '10.9', chars: '0123456789', speed: 0.5 }, scrollTrigger: { trigger: au, start: 'top 85%' } });
  }
  gsap.from('[data-stagger-chips] > *', { y: 16, autoAlpha: 0, stagger: 0.05, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: '[data-stagger-chips]', start: 'top 88%' } });

  // ---------- mobility bento details ----------
  $$('[data-checklist]').forEach((list) => gsap.from(list.children, {
    x: -14, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out',
    scrollTrigger: { trigger: list, start: 'top 85%' },
  }));
  gsap.to('.sos-ring', { scale: 1.9, opacity: 0, duration: 2, stagger: 1, repeat: -1, ease: 'power2.out' });
  const spark = $('.spark');
  if (spark) {
    const sl = spark.getTotalLength();
    gsap.timeline({ scrollTrigger: { trigger: spark, start: 'top 88%' } })
      .fromTo(spark, { strokeDasharray: sl, strokeDashoffset: sl }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' })
      .from('.spark-fill', { opacity: 0, duration: 0.8 }, '-=0.6')
      .from('.spark-dot', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(3)' }, '-=0.3');
  }

  // driver record: personal fields mask and unmask with the role
  const roleBtns = $$('[data-role]');
  const masked = $$('#driverRecord [data-mask]');
  let role = 'fleet';
  let auto = true;
  const setRole = (r) => {
    role = r;
    roleBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === r)));
    masked.forEach((dd) => {
      const text = r === 'fleet' ? dd.dataset.mask : dd.dataset.masked;
      if (hasScramble) gsap.to(dd, { duration: 0.9, scrambleText: { text, chars: '●0123456789', speed: 0.7 }, overwrite: true });
      else dd.textContent = text;
    });
  };
  roleBtns.forEach((b) => b.addEventListener('click', () => { auto = false; setRole(b.dataset.role); }));
  let roleTimer = 0;
  ScrollTrigger.create({
    trigger: '#driverRecord', start: 'top bottom', end: 'bottom top',
    onToggle: (s) => {
      clearInterval(roleTimer);
      if (s.isActive && auto) roleTimer = setInterval(() => auto && setRole(role === 'fleet' ? 'customer' : 'fleet'), 3200);
    },
  });

  // ---------- shared reveals ----------
  if (hasSplit) {
    $$('[data-split="lines"]').forEach((el) => SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 108, duration: 1.15, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none none' },
      }),
    }));
    const fm = $('#footerMark');
    SplitText.create(fm, {
      type: 'chars', mask: 'chars', autoSplit: true,
      onSplit: (self) => gsap.from(self.chars, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.025, scrollTrigger: { trigger: fm, start: 'top 95%' } }),
    });
  }

  const reveal = $$('[data-reveal]');
  gsap.set(reveal, { autoAlpha: 0, y: 34 });
  ScrollTrigger.batch(reveal, {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, overwrite: true }),
  });

  const cards = $$('[data-stagger] > *');
  gsap.set(cards, { autoAlpha: 0, y: 70, rotationX: -10, transformPerspective: 1100, transformOrigin: '50% 100%' });
  ScrollTrigger.batch(cards, {
    start: 'top 92%', once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, overwrite: true }),
  });

  // counters (panels inside the sideways rail count against the rail, not the page)
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const suf = el.dataset.suffix || '';
    const fmt = (v) => v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    const o = { v: 0 };
    el.textContent = fmt(0);
    const inRail = el.closest('.hpanel');
    ScrollTrigger.create({
      trigger: inRail || el,
      containerAnimation: inRail ? hs : undefined,
      start: inRail ? 'left 75%' : 'top 90%',
      once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v)) }),
    });
  });

  // tilt with a light sheen that follows the pointer
  if (finePointer) {
    $$('[data-tilt]').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3' });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 6);
        rx((0.5 - py) * 6);
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
  runLoader();
})();
