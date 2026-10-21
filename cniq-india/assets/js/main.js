/* CNIQ India · cinematic landing
   One scrubbed GSAP timeline drives a set of plain numbers (F). Every frame those numbers are
   rendered into the yard scene, the road, the services rail and the satellite map, so layout
   changes only need a re-measure, never a rebuilt timeline. The film also carries a time of
   day (F.tod, then F.night) that sets the sky, the colour grade and the lights. */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n, l) => String(n).padStart(l, '0');
  const deg = (r) => r * 57.29578;
  const smooth = (t) => t * t * (3 - 2 * t);
  // value along a list of stops: 0 → stops[0], 1 → stops[1], 1.5 → halfway to stops[2] …
  const along = (v, stops) => {
    const i = clamp(Math.floor(v), 0, stops.length - 2);
    return lerp(stops[i], stops[i + 1], clamp(v - i, 0, 1));
  };
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const svg = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const label = (str, attrs, parent) => {
    const n = svg('text', attrs, parent);
    n.textContent = str;
    return n;
  };

  // colour keyframes: [[t, value], …] where value is a number or an [r, g, b] triple
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = (c, a) => (a === undefined ? `rgb(${c.map(Math.round).join(',')})` : `rgba(${c.map(Math.round).join(',')},${a.toFixed(3)})`);
  const keyed = (frames, t) => {
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 0; i < frames.length - 1; i++) {
      const [t0, a] = frames[i];
      const [t1, b] = frames[i + 1];
      if (t <= t1) {
        const k = (t - t0) / (t1 - t0);
        return typeof a === 'number' ? lerp(a, b, k) : mix(a, b, k);
      }
    }
    return frames[frames.length - 1][1];
  };
  const tone = (pairs) => pairs.map(([t, h]) => [t, typeof h === 'string' ? hex(h) : h]);

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);

  /* ------------------------------------------------------------------ */
  /* Static builders (no animation library needed)                       */
  /* ------------------------------------------------------------------ */

  const ICONS = {
    truck: ['............', '............', '.######.....', '.######.##..', '.######.###.', '.######.####', '.######.####', '.###########', '.###########', '..##....##..', '..##....##..', '............'],
    crate: ['.....##.....', '......#.....', '......#.....', '.....#.#....', '....#...#...', '.##########.', '.#........#.', '.#.######.#.', '.#........#.', '.#.######.#.', '.#........#.', '.##########.'],
    pin: ['....####....', '...######...', '..###..###..', '..##....##..', '..###..###..', '...######...', '....####....', '.....##.....', '.....##.....', '............', '##.##.##.##.', '............'],
    box: ['............', '............', '############', '#.#.#.#.#.##', '#.#.#.#.#.##', '#.#.#.#.#.##', '#.#.#.#.#.##', '#.#.#.#.#.##', '############', '............', '##........##', '............'],
    ship: ['......#.....', '......#.....', '....####....', '....####....', '.##.####.##.', '.##.####.##.', '############', '.##########.', '..########..', '............', '#.#.#.#.#.#.', '............'],
    sat: ['........#...', '......#..#..', '........#.#.', '...#.....#.#', '..###...#..#', '...###.#....', '....###.....', '...#####....', '....###.....', '.....#......', '....###.....', '..#######...']
  };

  function buildPixelIcons() {
    $$('.pix').forEach((icon) => {
      (ICONS[icon.dataset.icon] || []).forEach((row, y) => {
        [...row].forEach((c, x) => {
          const on = c === '#';
          const dot = svg('circle', { cx: x + 0.5, cy: y + 0.5, r: on ? 0.4 : 0.14 }, icon);
          if (!on) dot.setAttribute('class', 'lo');
        });
      });
    });
  }

  function buildCompassTicks() {
    const g = $('#cTicks');
    for (let i = 0; i < 36; i++) {
      const a = (i * 10 * Math.PI) / 180;
      const major = i % 9 === 0;
      const r0 = 41, r1 = major ? 33 : 37;
      const line = svg('line', {
        x1: 50 + Math.sin(a) * r0, y1: 50 - Math.cos(a) * r0,
        x2: 50 + Math.sin(a) * r1, y2: 50 - Math.cos(a) * r1
      }, g);
      if (major) line.setAttribute('class', 'maj');
    }
  }

  // procedural textures for film grain, asphalt and worn road paint
  function buildTextures() {
    const make = (size, type, fn) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const img = g.createImageData(size, size);
      const R = rng(size * 31 + type.length);
      for (let i = 0; i < size * size; i++) img.data.set(fn(R), i * 4);
      g.putImageData(img, 0, 0);
      return `url("${c.toDataURL(type, 0.82)}")`;
    };
    try {
      doc.style.setProperty('--grain-tex', make(140, 'image/png', (R) => { const v = R() * 255; return [v, v, v, 255]; }));
      doc.style.setProperty('--asphalt-tex', make(256, 'image/jpeg', (R) => {
        const v = 16 + R() * 22 + (R() > 0.985 ? 46 : 0);
        return [v, v, v + 2, 255];
      }));
      doc.style.setProperty('--wear-tex', make(128, 'image/png', (R) => [0, 0, 0, R() > 0.14 ? 255 : 110 + R() * 100]));
      // sun rays baked once, falloff included, so moving them never repaints
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d');
      const R = rng(3);
      for (let a = 0; a < 360; a += 9 + R() * 8) {
        const w = (1.2 + R() * 2.4) * (Math.PI / 180), r0 = (a * Math.PI) / 180;
        const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
        grad.addColorStop(0, 'rgba(255,252,238,.5)');
        grad.addColorStop(0.35, 'rgba(255,250,232,.2)');
        grad.addColorStop(1, 'rgba(255,250,232,0)');
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(256, 256);
        g.arc(256, 256, 256, r0, r0 + w);
        g.closePath();
        g.fill();
      }
      doc.style.setProperty('--rays-tex', `url("${c.toDataURL('image/png')}")`);
    } catch (e) {
      /* canvas unavailable: flat colours remain */
    }
  }

  function buildWheel() {
    const tread = $('#treadRing');
    tread.setAttribute('style', 'opacity: var(--sharp, 1)');
    for (let k = 0; k < 28; k++) svg('rect', { x: -2.2, y: -26, width: 4.4, height: 3.4, transform: `rotate(${(k * 360) / 28})` }, tread);
    const lugs = $('#lugs');
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      svg('circle', { cx: (Math.sin(a) * 7.6).toFixed(2), cy: (-Math.cos(a) * 7.6).toFixed(2), r: 1.15 }, lugs);
    }
    const puffs = $('#puffs');
    for (let i = 0; i < 8; i++) svg('circle', { cx: 951, cy: 400, r: 0, opacity: 0 }, puffs);
    const dust = $('#dust');
    for (let i = 0; i < 6; i++) svg('ellipse', { cx: -200, cy: 630, rx: 0, ry: 0, opacity: 0 }, dust);
  }

  /* ---------- silhouettes on the horizon: port cranes, sheds, Kerala palms ---------- */

  function crane(g, x, h, fill) {
    const y0 = 300, leg = 9, span = 64;
    const p = svg('g', { fill, stroke: fill }, g);
    svg('rect', { x, y: y0 - h, width: leg, height: h, stroke: 'none' }, p);
    svg('rect', { x: x + span, y: y0 - h, width: leg, height: h, stroke: 'none' }, p);
    svg('path', { d: `M${x + leg} ${y0 - h * 0.3}L${x + span} ${y0 - h * 0.66}M${x + leg} ${y0 - h * 0.66}L${x + span} ${y0 - h * 0.3}`, fill: 'none', 'stroke-width': 3 }, p);
    svg('rect', { x: x - 150, y: y0 - h - 10, width: span + leg + 300, height: 10, stroke: 'none' }, p);
    svg('rect', { x: x - 8, y: y0 - h - 32, width: 62, height: 22, stroke: 'none' }, p);
    const ax = x + span / 2, ay = y0 - h - 84;
    svg('path', { d: `M${x} ${y0 - h - 10}L${ax} ${ay}L${x + span + leg} ${y0 - h - 10}`, fill: 'none', 'stroke-width': 5 }, p);
    svg('path', { d: `M${ax} ${ay}L${x - 150} ${y0 - h - 8}M${ax} ${ay}L${x + span + leg + 150} ${y0 - h - 8}`, fill: 'none', 'stroke-width': 1.6 }, p);
  }

  function palm(g, R, x, h, lean) {
    const p = svg('g', { fill: 'currentColor' }, g);
    const tx = x + lean, ty = 300 - h;
    svg('path', { d: `M${x} 300Q${x + lean * 0.15} ${300 - h * 0.55} ${tx} ${ty}`, fill: 'none', stroke: 'currentColor', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, p);
    const n = 9;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI + (k / (n - 1)) * Math.PI + (R() - 0.5) * 0.35;
      const L = 30 + R() * 20;
      const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.5 + L * 0.5;
      const mx = tx + Math.cos(a) * L * 0.55, my = ty + Math.sin(a) * L * 0.55 - 6;
      const nx = -Math.sin(a) * 3.4, ny = Math.cos(a) * 3.4;
      svg('path', { d: `M${tx} ${ty}Q${mx + nx} ${my + ny} ${ex} ${ey}Q${mx - nx} ${my - ny} ${tx} ${ty}Z` }, p);
    }
  }

  function buildFar() {
    const R = rng(311);
    const f3 = $('#far3'), f2 = $('#far2');
    const g3 = svg('g', { fill: 'currentColor' }, f3);
    for (let x = 80; x < 4200; x += 240 + R() * 260) {
      if (R() < 0.5) crane(g3, x, 140 + R() * 70, 'currentColor');
      else {
        const w = 160 + R() * 260, h = 30 + R() * 50;
        svg('rect', { x, y: 300 - h, width: w, height: h }, g3);
        for (let k = 0; k < w / 34; k++) if (R() > 0.4) svg('rect', { x: x + k * 34, y: 300 - h - 18 * (1 + Math.floor(R() * 2)), width: 30, height: 18 * (1 + Math.floor(R() * 2)) }, g3);
      }
    }
    for (let x = 0; x < 4200; x += 520 + R() * 400) {
      svg('rect', { x, y: 120, width: 4, height: 180 }, g3);
      svg('rect', { x: x - 10, y: 116, width: 24, height: 6 }, g3);
    }

    const g2 = svg('g', { fill: 'currentColor' }, f2);
    for (let x = 40; x < 4200;) {
      const pick = R();
      if (pick < 0.42) {
        const w = 220 + R() * 260, h = 46 + R() * 40, rh = 26 + R() * 18;
        svg('path', { d: `M${x} 300V${300 - h}L${x + w / 2} ${300 - h - rh}L${x + w} ${300 - h}V300Z` }, g2);
        x += w + 40 + R() * 80;
      } else if (pick < 0.55) {
        svg('rect', { x, y: 168, width: 46, height: 30, rx: 3 }, g2);
        svg('path', { d: `M${x + 6} 198L${x - 4} 300M${x + 40} 198L${x + 50} 300M${x + 2} 250H${x + 44}`, fill: 'none', stroke: 'currentColor', 'stroke-width': 3 }, g2);
        x += 110;
      } else {
        const n = 2 + Math.floor(R() * 4);
        for (let k = 0; k < n; k++) palm(g2, R, x + k * (26 + R() * 30), 90 + R() * 80, (R() - 0.5) * 40);
        x += n * 40 + 60;
      }
    }
    svg('rect', { x: 0, y: 286, width: 4200, height: 14 }, g2);
  }

  /* ---------- satellite map ---------- */

  const ROUTE = 'M -900 600 L 1200 600 A 360 360 0 0 1 1560 960 L 1560 1700 A 300 300 0 0 0 1860 2000 L 3000 2000';
  const ROADS = [
    ROUTE,
    'M -900 600 L -3600 600',
    'M 400 500 L 400 -2800',
    'M 1660 1180 L 5200 1180',
    'M 2300 2100 L 2300 4600',
    'M 1460 1500 L -3600 1500'
  ];
  // [corner x, corner y, main-edge direction, branch-edge direction]
  const FILLETS = [
    [300, 500, -1, 0, 0, -1], [500, 500, 1, 0, 0, -1],
    [1660, 1080, 0, -1, 1, 0], [1660, 1280, 0, 1, 1, 0],
    [2200, 2100, -1, 0, 0, 1], [2400, 2100, 1, 0, 0, 1],
    [1460, 1400, 0, -1, -1, 0], [1460, 1600, 0, 1, -1, 0]
  ];
  // asphalt patches that open the main road's edge line where a branch joins
  const MOUTHS = [[306, 500, 188, 14], [1646, 1086, 14, 188], [2206, 2086, 188, 14], [1460, 1406, 14, 188]];
  const ASPHALT = '#2c2e32';
  const PAINT = '#ecebe5';

  const lut = (path, step = 6) => {
    const len = path.getTotalLength();
    const n = Math.ceil(len / step);
    const pts = new Float32Array((n + 1) * 2);
    for (let i = 0; i <= n; i++) {
      const p = path.getPointAtLength(Math.min(len, i * step));
      pts[i * 2] = p.x;
      pts[i * 2 + 1] = p.y;
    }
    return { len, step, n, pts };
  };
  const pointAt = (l, s) => {
    const f = clamp(s, 0, l.len) / l.step;
    const i = Math.min(l.n - 1, Math.floor(f));
    const t = f - i;
    return { x: lerp(l.pts[i * 2], l.pts[i * 2 + 2], t), y: lerp(l.pts[i * 2 + 1], l.pts[i * 2 + 3], t) };
  };
  // point offset to the left of travel (India drives on the left)
  const laneAt = (l, s, off) => {
    const a = pointAt(l, s - 4), b = pointAt(l, s + 4), p = pointAt(l, s);
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dy / d) * off, y: p.y - (dx / d) * off, a: Math.atan2(dy, dx) };
  };

  const map = { route: null, roads: [], cars: [], buildings: [], clouds: [] };

  function buildMap(dense) {
    const roads = $('#mapRoads');
    const stroke = (w, color, extra) => ROADS.map((d) => svg('path', Object.assign({ d, fill: 'none', stroke: color, 'stroke-width': w }, extra || {}), roads));

    stroke(236, '#a08f74', { opacity: 0.85 });
    const asphalt = stroke(200, ASPHALT);
    FILLETS.forEach(([cx, cy, ax, ay, bx, by]) => {
      const r = 70, Ax = cx + ax * r, Ay = cy + ay * r, Bx = cx + bx * r, By = cy + by * r;
      const sweep = ax * by - ay * bx > 0 ? 1 : 0;
      svg('path', { d: `M${Ax} ${Ay}L${cx} ${cy}L${Bx} ${By}A${r} ${r} 0 0 ${sweep} ${Ax} ${Ay}Z`, fill: ASPHALT }, roads);
    });
    stroke(186, PAINT, { opacity: 0.85 });
    stroke(180, ASPHALT);
    MOUTHS.forEach(([x, y, w, h]) => svg('rect', { x, y, width: w, height: h, fill: ASPHALT }, roads));
    stroke(104, PAINT, { 'stroke-dasharray': '40 46', opacity: 0.8 });
    stroke(96, ASPHALT);
    stroke(10, '#e0b43a', { opacity: 0.95 });
    stroke(4, ASPHALT);

    map.roads = asphalt.map((p) => lut(p, 8));
    map.route = lut(asphalt[0], 5);

    // tyre wear and oil along the lanes
    const R = rng(77);
    const wear = svg('g', { fill: '#111214', opacity: 0.22 }, roads);
    map.roads.forEach((l) => {
      for (let s = 40; s < l.len; s += 70 + R() * 90) {
        const p = laneAt(l, s, [-75, -25, 25, 75][Math.floor(R() * 4)]);
        svg('ellipse', { cx: p.x.toFixed(0), cy: p.y.toFixed(0), rx: 14 + R() * 18, ry: 4 + R() * 4, transform: `rotate(${deg(p.a).toFixed(0)} ${p.x.toFixed(0)} ${p.y.toFixed(0)})` }, wear);
      }
    });
    svg('path', { d: 'M1668 1088H1880L1668 1168Z', fill: 'url(#pHatch)', stroke: PAINT, 'stroke-width': 3 }, roads);
    // zebra crossing and stop line at the port gate
    for (let y = 1916; y < 2090; y += 26) svg('rect', { x: 2862, y, width: 46, height: 14, fill: PAINT, opacity: 0.85 }, roads);
    svg('rect', { x: 2930, y: 1904, width: 8, height: 92, fill: PAINT }, roads);
    svg('rect', { x: 3010, y: 1872, width: 34, height: 26, rx: 3, fill: '#d0d4d9' }, roads);
    svg('path', { d: 'M3027 1898V2096', stroke: '#e2b100', 'stroke-width': 6, 'stroke-dasharray': '18 12' }, roads);

    buildGround(dense);
    buildPort();
    buildLabels();
    buildCars();
    buildLights();
    const cs = $('#cloudShadows');
    for (let i = 0; i < 6; i++) {
      const c = svg('ellipse', { cx: 0, cy: 0, rx: 700 + R() * 600, ry: 420 + R() * 300, fill: 'url(#gCloudShadow)' }, cs);
      map.clouds.push({ el: c, x: -2400 + i * 1300 + R() * 400, y: -400 + R() * 3200 });
    }
  }

  function buildGround(dense) {
    const ground = $('#mapGround');
    const R = rng(20261020);
    const samples = [];
    map.roads.forEach((l) => {
      for (let i = 0; i <= l.n; i += 4) samples.push(l.pts[i * 2], l.pts[i * 2 + 1]);
    });
    const blocked = [
      { x: -440, y: 400, w: 150, h: 70 }, { x: 1680, y: 1360, w: 150, h: 70 }, { x: 2500, y: 2120, w: 150, h: 70 }, { x: 2580, y: 990, w: 150, h: 70 }, // shields
      { x: 500, y: 980, w: 420, h: 60 }, { x: 4280, y: 2100, w: 160, h: 90 }, // labels
      { x: 3040, y: 1460, w: 760, h: 1180 }, // port
      { x: -1460, y: -60, w: 1000, h: 540 }, // CFS yard
      { x: 3480, y: -3200, w: 4000, h: 9000 } // coast and sea
    ];
    const free = (x, y, w, h, m, clear) => {
      for (const o of blocked) {
        if (x < o.x + o.w + m && x + w + m > o.x && y < o.y + o.h + m && y + h + m > o.y) return false;
      }
      const c2 = clear * clear;
      for (let k = 0; k < samples.length; k += 2) {
        const sx = samples[k], sy = samples[k + 1];
        const dx = Math.max(x - sx, 0, sx - x - w), dy = Math.max(y - sy, 0, sy - y - h);
        if (dx * dx + dy * dy < c2) return false;
      }
      return true;
    };
    const blob = (cx, cy, r, n, jitter) => {
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, rr = r * (1 - jitter + R() * jitter * 2);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      let m = mid(pts[n - 1], pts[0]);
      let d = `M${m[0].toFixed(0)} ${m[1].toFixed(0)}`;
      for (let k = 0; k < n; k++) {
        m = mid(pts[k], pts[(k + 1) % n]);
        d += `Q${pts[k][0].toFixed(0)} ${pts[k][1].toFixed(0)} ${m[0].toFixed(0)} ${m[1].toFixed(0)}`;
      }
      return d + 'Z';
    };

    // vegetation under everything else
    const greens = ['#b3c39a', '#a6b98c', '#bfcaa6', '#9fb383', '#c4c9a5'];
    for (let i = 0; i < 80; i++) {
      svg('path', { d: blob(-3200 + R() * 6800, -2600 + R() * 7000, 140 + R() * 380, 9, 0.35), fill: greens[i % greens.length], opacity: 0.55 + R() * 0.35 }, ground);
    }

    // coast: beach, sea with depth, surf
    const pts = [];
    for (let y = -3200; y <= 5600; y += 100) pts.push([y > 1440 && y < 2660 ? 3700 : 3780 + Math.sin(y / 340) * 46 + Math.sin(y / 97) * 14, y]);
    const quay = (y) => y > 1440 && y < 2660;
    svg('path', { d: `M7000 -3200L${pts.map(([x, y]) => `${(x - (quay(y) ? 0 : 70)).toFixed(1)} ${y}`).join('L')}L7000 5600Z`, fill: '#e2d4b2' }, ground);
    svg('path', { d: `M7000 -3200L${pts.map(([x, y]) => `${x.toFixed(1)} ${y}`).join('L')}L7000 5600Z`, fill: 'url(#gSeaDepth)' }, ground);
    svg('path', { d: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y}`).join(''), fill: 'none', stroke: '#ffffff', 'stroke-width': 7, 'stroke-dasharray': '34 14 12 18', opacity: 0.6 }, ground);
    svg('path', { d: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + 30).toFixed(1)} ${y}`).join(''), fill: 'none', stroke: '#ffffff', 'stroke-width': 3, 'stroke-dasharray': '20 30', opacity: 0.35 }, ground);
    svg('rect', { x: 3690, y: 1440, width: 12, height: 1220, fill: '#c7cfd8' }, ground);

    // fields
    for (let i = 0, made = 0; i < 300 && made < 12; i++) {
      const w = 320 + R() * 520, h = 220 + R() * 420, x = -3000 + R() * 6200, y = -2400 + R() * 6400;
      if (!free(x, y, w, h, 60, 150)) continue;
      svg('rect', { x, y, width: w, height: h, fill: made % 2 ? 'url(#pFieldA)' : 'url(#pFieldB)', stroke: '#9fae86', 'stroke-width': 4 }, ground);
      blocked.push({ x, y, w, h });
      made++;
    }

    // buildings: cast shadow, roof by material, ridge or skylight detail
    const roofs = [['#b8735a', 0.2], ['#c4876b', 0.14], ['#d8d5cc', 0.2], ['#cbc8be', 0.14], ['#7f9cb4', 0.12], ['#efeee9', 0.12], ['#a9654d', 0.08]];
    const tiled = new Set(['#b8735a', '#c4876b', '#a9654d']);
    const pickRoof = () => {
      let r = R();
      for (const [c, w] of roofs) { if ((r -= w) <= 0) return c; }
      return roofs[0][0];
    };
    const target = dense ? 300 : 170;
    const shadow = svg('g', { fill: '#1e2416', opacity: 0.3 }, ground);
    const body = svg('g', {}, ground);
    for (let i = 0, made = 0; i < 6000 && made < target; i++) {
      const big = R() > 0.8;
      const w = big ? 140 + R() * 160 : 40 + R() * 90;
      const h = big ? 100 + R() * 140 : 40 + R() * 90;
      const x = -3000 + R() * 6400, y = -2200 + R() * 6400;
      if (!free(x, y, w, h, 18, 134)) continue;
      const roof = pickRoof();
      const lift = big ? 16 : 9;
      svg('rect', { x: x + lift, y: y + lift * 1.2, width: w, height: h }, shadow);
      svg('rect', { x, y, width: w, height: h, fill: roof }, body);
      if (tiled.has(roof)) {
        svg('path', { d: w > h ? `M${x} ${y + h / 2}H${x + w}` : `M${x + w / 2} ${y}V${y + h}`, stroke: '#000', 'stroke-opacity': 0.18, 'stroke-width': 2 }, body);
        svg('rect', { x, y: w > h ? y + h / 2 : y, width: w > h ? w : w / 2, height: w > h ? h / 2 : h, fill: '#000', opacity: 0.08 }, body);
      } else if (big) {
        for (let k = 0; k < 3; k++) svg('rect', { x: x + 14 + k * ((w - 40) / 3), y: y + h * 0.3, width: (w - 40) / 3 - 10, height: h * 0.4, fill: '#fff', opacity: 0.18 }, body);
      }
      svg('path', { d: `M${x} ${y + h}V${y}H${x + w}`, fill: 'none', stroke: '#fff', 'stroke-opacity': 0.35, 'stroke-width': 2 }, body);
      blocked.push({ x, y, w, h });
      map.buildings.push({ x, y, w, h });
      made++;
    }

    // trees: shadow first, then canopy lit from the top left
    const tShadow = svg('g', { fill: '#1e2a14', opacity: 0.28 }, ground);
    const trees = svg('g', { fill: 'url(#gCanopy)' }, ground);
    const clusters = dense ? 90 : 46;
    for (let i = 0, made = 0; i < 2400 && made < clusters; i++) {
      const cx = -3000 + R() * 6400, cy = -2200 + R() * 6400;
      if (!free(cx - 84, cy - 84, 168, 168, 10, 110)) continue;
      const n = 5 + Math.floor(R() * 9);
      for (let k = 0; k < n; k++) {
        const r = 10 + R() * 15, tx = cx + (R() - 0.5) * 130, ty = cy + (R() - 0.5) * 130;
        svg('circle', { cx: tx + r * 0.5, cy: ty + r * 0.6, r }, tShadow);
        svg('circle', { cx: tx, cy: ty, r }, trees);
      }
      made++;
    }
  }

  function buildPort() {
    const port = $('#mapPort');
    const R = rng(7);
    const pal = ['#5f7896', '#c06f4b', '#8796a3', '#c9cdd2', '#3f5f86', '#9c5a43', '#7c8f9e', '#6d8f6f'];
    const box = (x, y, w, h, c) => {
      svg('rect', { x: x + 4, y: y + 5, width: w, height: h, fill: '#000', opacity: 0.22 }, port);
      svg('rect', { x, y, width: w, height: h, fill: c }, port);
      svg('rect', { x, y, width: w, height: 3, fill: '#fff', opacity: 0.35 }, port);
    };
    // CFS yard by the start of the route
    svg('rect', { x: -1440, y: -40, width: 960, height: 500, fill: '#cfcfca' }, port);
    for (let c = 0; c < 9; c++) for (let r = 0; r < 10; r++) {
      if (R() < 0.18) continue;
      box(-1400 + c * 100, 10 + r * 40, 84, 26, pal[Math.floor(R() * pal.length)]);
    }
    // port yard and quay
    svg('rect', { x: 3060, y: 1460, width: 640, height: 1200, fill: '#cfcfca' }, port);
    let joints = '';
    for (let x = 3060; x < 3700; x += 80) joints += `M${x} 1460V2660`;
    for (let y = 1460; y < 2660; y += 80) joints += `M3060 ${y}H3700`;
    svg('path', { d: joints, stroke: '#000', 'stroke-opacity': 0.05, 'stroke-width': 2 }, port);
    for (let c = 0; c < 6; c++) for (let r = 0; r < 26; r++) {
      if ((r > 11 && r < 15) || R() < 0.12) continue;
      box(3120 + c * 84, 1500 + r * 42, 70, 28, pal[Math.floor(R() * pal.length)]);
    }
    // docked ship, top view
    svg('path', { d: 'M3772 1610H3932V2390Q3932 2470 3852 2510Q3772 2470 3772 2390Z', fill: '#0d1a28', opacity: 0.35 }, port);
    svg('path', { d: 'M3760 1600H3920V2380Q3920 2460 3840 2500Q3760 2460 3760 2380Z', fill: '#26324a' }, port);
    svg('rect', { x: 3772, y: 1620, width: 136, height: 90, fill: '#e7eaee' }, port);
    for (let r = 0; r < 16; r++) for (let c = 0; c < 4; c++) {
      svg('rect', { x: 3776 + c * 34, y: 1730 + r * 40, width: 30, height: 34, fill: r === 6 ? '#c9cdd2' : pal[Math.floor(R() * pal.length)] }, port);
    }
    // ship-to-shore cranes with their shadows on the apron
    [1700, 1990, 2280].forEach((y) => {
      svg('rect', { x: 3618, y: y + 24, width: 50, height: 140, fill: '#000', opacity: 0.2 }, port);
      svg('rect', { x: 3664, y: y + 82, width: 330, height: 24, fill: '#000', opacity: 0.16 }, port);
      svg('rect', { x: 3600, y, width: 50, height: 140, fill: '#bcc3cb' }, port);
      svg('rect', { x: 3640, y: y + 58, width: 330, height: 24, fill: '#97a2ae' }, port);
      svg('rect', { x: 3606, y: y + 6, width: 38, height: 128, fill: 'none', stroke: '#8e98a3', 'stroke-width': 3 }, port);
    });
  }

  function buildLabels() {
    const g = $('#mapLabels');
    const shield = (txt, x, y) => {
      const s = svg('g', { transform: `translate(${x} ${y})` }, g);
      svg('rect', { x: 2, y: 4, width: 104, height: 38, rx: 6, fill: '#000', opacity: 0.25 }, s);
      svg('rect', { x: 0, y: 0, width: 104, height: 38, rx: 6, fill: '#1d1e22' }, s);
      svg('rect', { x: 0, y: 0, width: 104, height: 8, rx: 3, fill: '#e2b100' }, s);
      label(txt, { x: 52, y: 29, 'text-anchor': 'middle', 'font-size': 18, class: 'shield-t' }, s);
    };
    shield('NH 66', -420, 420);
    shield('NH 66', 1700, 1380);
    shield('NH 66', 2520, 2140);
    shield('SH 2', 2600, 1010);
    label('CFS YARD 3', { x: -1430, y: -66, 'font-size': 30, class: 'lbl-strong' }, g);
    label('INDUSTRIAL ESTATE', { x: 520, y: 1020, 'font-size': 24, class: 'lbl' }, g);
    label('PORT AREA · BERTHS 1–3', { x: 3060, y: 1430, 'font-size': 26, class: 'lbl-strong' }, g);
    label('GATE 2', { x: 2930, y: 1850, 'font-size': 22, class: 'lbl-strong' }, g);
    label('08°23′N', { x: 4300, y: 2140, 'font-size': 22, class: 'lbl', fill: '#e8f1f6' }, g);
    label('076°59′E', { x: 4300, y: 2172, 'font-size': 22, class: 'lbl', fill: '#e8f1f6' }, g);
  }

  function buildCars() {
    const g = $('#cars');
    const lights = $('#carLights');
    const colors = ['#ffffff', '#c9cdd2', '#1d4eff', '#e2b100', '#9aa1aa', '#ffffff', '#5f6d7a', '#ffffff', '#c4582c', '#e8eaed', '#ffffff', '#24406a'];
    // [road index, start offset, speed (units/s), lane offset, direction]
    const plan = [
      [0, 300, 210, 25, 1], [0, 2200, 190, -25, -1], [0, 3600, 230, -75, -1], [0, 1400, 170, 25, 1],
      [2, 400, 200, 25, 1], [2, 2400, 180, -25, -1], [3, 600, 160, 25, 1], [3, 1600, 190, -75, -1],
      [1, 500, 200, -25, -1], [5, 900, 180, 25, 1], [5, 2600, 200, -25, -1], [4, 300, 170, 25, 1]
    ];
    plan.forEach(([road, s0, v, off, dir], i) => {
      const car = svg('g', {}, g);
      const long = i % 5 === 3;
      const w = long ? 64 : 36;
      svg('rect', { x: -w / 2 + 3, y: -6, width: w, height: 18, rx: 5, fill: '#000', opacity: 0.25 }, car);
      svg('rect', { x: -w / 2, y: -9, width: w, height: 18, rx: 5, fill: colors[i] }, car);
      svg('rect', { x: w / 2 - 14, y: -7, width: 6, height: 14, rx: 2, fill: '#2b3a4a', opacity: 0.75 }, car);
      svg('rect', { x: -w / 2 + 4, y: -7, width: 5, height: 14, rx: 2, fill: '#2b3a4a', opacity: 0.6 }, car);
      const lit = svg('g', {}, lights);
      svg('path', { d: `M${w / 2} -6L${w / 2 + 90} -26L${w / 2 + 90} 26L${w / 2} 6Z`, fill: 'url(#gBeamMap)', opacity: 0.6 }, lit);
      svg('circle', { cx: -w / 2, cy: -5, r: 8, fill: 'url(#gGlowRed)' }, lit);
      svg('circle', { cx: -w / 2, cy: 5, r: 8, fill: 'url(#gGlowRed)' }, lit);
      map.cars.push({ el: car, lit, l: map.roads[road], s0, v, off, dir });
    });
  }

  function buildLights() {
    const street = $('#streetGlows');
    map.roads.forEach((l) => {
      for (let s = 140; s < l.len; s += 300) {
        for (const off of [-122, 122]) {
          const p = laneAt(l, s + (off > 0 ? 150 : 0), off);
          svg('circle', { cx: p.x.toFixed(0), cy: p.y.toFixed(0), r: 70, fill: 'url(#gGlowWarm)' }, street);
        }
      }
    });
    const R = rng(5);
    const win = $('#winGlows');
    map.buildings.forEach((b) => {
      if (R() > 0.45) return;
      svg('circle', { cx: (b.x + b.w * R()).toFixed(0), cy: (b.y + b.h * R()).toFixed(0), r: 18 + R() * 26, fill: 'url(#gGlowWarm)', opacity: 0.55 + R() * 0.4 }, win);
    });
    const port = $('#portGlows');
    [[3200, 1560], [3460, 1560], [3200, 2000], [3460, 2000], [3200, 2440], [3460, 2440], [-1200, 120], [-800, 120], [-1000, 360]].forEach(([x, y]) => {
      svg('circle', { cx: x, cy: y, r: 220, fill: 'url(#gGlowWhite)', opacity: 0.55 }, port);
    });
    [1700, 1990, 2280].forEach((y) => svg('circle', { cx: 3965, cy: y + 70, r: 22, fill: 'url(#gGlowRed)' }, port));
    for (let y = 1660; y < 2460; y += 120) svg('circle', { cx: 3840, cy: y, r: 40, fill: 'url(#gGlowWarm)', opacity: 0.8 }, port);
  }

  let lightsOn = false;
  function moveCars(time) {
    for (const c of map.cars) {
      const len = c.l.len;
      let s = (c.s0 + time * c.v) % len;
      if (c.dir < 0) s = len - s;
      const p = laneAt(c.l, s, c.off);
      const q = laneAt(c.l, s + c.dir * 6, c.off);
      const t = `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${deg(Math.atan2(q.y - p.y, q.x - p.x)).toFixed(1)})`;
      c.el.setAttribute('transform', t);
      if (lightsOn) c.lit.setAttribute('transform', t);
    }
    for (const c of map.clouds) {
      c.el.setAttribute('cx', (((c.x + time * 26) % 9000) - 3000).toFixed(0));
      c.el.setAttribute('cy', (c.y + time * 6).toFixed(0));
    }
  }

  /* ---------- sea & air at sunrise ---------- */

  const voyage = { waveFar: 150, waveNear: 230, glints: [], birds: [] };

  function buildVoyage() {
    const R = rng(1904);
    const cloud = (g, x, y, s, op) => {
      const c = svg('g', { transform: `translate(${x} ${y}) scale(${s})`, opacity: op, fill: 'url(#gCloudLit)' }, g);
      [[-72, 2, 32], [-34, -16, 44], [16, -26, 52], [64, -8, 38], [100, 6, 24], [-104, 9, 20]].forEach(([cx, cy, r]) => svg('circle', { cx, cy, r }, c));
      svg('rect', { x: -112, y: 2, width: 222, height: 24, rx: 12 }, c);
      svg('path', { d: 'M-104 20Q0 34 108 20', fill: 'none', stroke: '#ffd2a0', 'stroke-width': 3, opacity: 0.8 }, c);
    };
    const far = $('#cloudsFar'), near = $('#cloudsNear');
    for (let i = 0; i < 12; i++) cloud(far, -900 + i * 330 + R() * 120, 120 + R() * 240, 0.45 + R() * 0.45, 0.85);
    for (let i = 0; i < 7; i++) cloud(near, -700 + i * 560 + R() * 160, 470 + R() * 60, 1 + R() * 0.6, 0.95);

    const waves = (g, n, y0, y1, wl, amp, op, w0, w1) => {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = lerp(y0, y1, t * t);
        const a = amp * (0.6 + R() * 0.8);
        let d = `M${-1600 - Math.floor(R() * 4) * (wl / 4)} ${y.toFixed(1)}`;
        for (let x = 0; x < 5200; x += wl) d += `q${wl / 4} ${-a} ${wl / 2} 0t${wl / 2} 0`;
        svg('path', { d, fill: 'none', stroke: '#ffd9b0', 'stroke-opacity': op * (0.5 + t), 'stroke-width': lerp(w0, w1, t) }, g);
      }
    };
    waves($('#wavesFar'), 9, 572, 700, voyage.waveFar, 2.4, 0.08, 1, 1.6);
    waves($('#wavesNear'), 8, 730, 900, voyage.waveNear, 5, 0.06, 1.6, 3);

    // sun glitter: a column of short highlights that widens toward the viewer
    const gl = $('#glitter');
    for (let i = 0; i < 90; i++) {
      const t = R();
      const y = 566 + t * t * 330;
      const spread = 30 + t * t * 260;
      const x = 1150 + (R() - 0.5) * 2 * spread;
      const w = 6 + t * 40 * R();
      const el = svg('rect', { x: (x - w / 2).toFixed(0), y: y.toFixed(0), width: w.toFixed(0), height: (1 + t * 2.4).toFixed(1), fill: '#ffe2a8', opacity: 0.5 }, gl);
      voyage.glints.push({ el, k: 1.5 + R() * 4, ph: R() * 6.28, base: 0.25 + (1 - t) * 0.6 });
    }

    const birds = $('#birds');
    for (let i = 0; i < 7; i++) {
      const b = svg('path', { d: 'M-11 0Q-5 -7 0 0Q5 -7 11 0', fill: 'none', stroke: '#2a2a3a', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, birds);
      voyage.birds.push({ el: b, x: 200 + i * 46 + R() * 30, y: 250 + R() * 70 + (i % 2) * 18, ph: R() * 6, s: 0.8 + R() * 0.5 });
    }

    const boxes = $('#shipBoxes');
    const pal = ['#1d2b44', '#7a3a24', '#3c4652', '#4a2523', '#24423a', '#6f747c', '#2a3240', '#6c2f22'];
    for (let b = 0; b < 14; b++) {
      const x = 212 + b * 51;
      const tiers = b >= 12 ? 4 : b >= 10 ? 5 : 6 + (R() > 0.6 ? 1 : 0);
      for (let t = 0; t < tiers; t++) {
        const y = -66 - (t + 1) * 21;
        const silver = b === 5 || b === 6;
        svg('rect', { x, y, width: 48, height: 20, fill: silver ? '#8d929a' : pal[Math.floor(R() * pal.length)] }, boxes);
        if (t === tiers - 1) svg('rect', { x, y, width: 48, height: 2.4, fill: '#f3c27a', opacity: 0.7 }, boxes);
      }
    }
    label('CNIQ', { x: 471, y: -116, class: 'svg-display', 'font-size': 12, fill: '#0f131b' }, boxes);
    svg('circle', { cx: 509, cy: -124, r: 2.4, fill: '#1d4eff' }, boxes);
    const win = $('#shipWindows');
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) svg('rect', { x: 48 + c * 15, y: -226 + r * 26, width: 9, height: 6, fill: R() > 0.55 ? '#ffcf7a' : '#151a24' }, win);
    svg('rect', { x: 34, y: -246, width: 124, height: 8, fill: '#ffd38a', opacity: 0.85 }, win);
  }

  /* ---------- night highway behind the manifesto ---------- */

  const night = { trails: [] };

  function buildNight() {
    const R = rng(99);
    const stars = $('#nightStars');
    for (let i = 0; i < 140; i++) svg('circle', { cx: (R() * 1600).toFixed(0), cy: (R() * 430).toFixed(0), r: (0.4 + R() * 1.1).toFixed(2), fill: '#fff', opacity: (0.15 + R() * 0.6).toFixed(2) }, stars);
    const city = $('#nightCity');
    for (let x = -20; x < 1640;) {
      const w = 30 + R() * 80, h = 40 + R() * (x > 900 && x < 1400 ? 230 : 140);
      svg('rect', { x, y: 560 - h, width: w, height: h, fill: '#0c1320' }, city);
      for (let wy = 560 - h + 8; wy < 552; wy += 9) for (let wx = x + 5; wx < x + w - 6; wx += 8) {
        if (R() < 0.18) svg('rect', { x: wx.toFixed(0), y: wy.toFixed(0), width: 3, height: 4, fill: R() > 0.2 ? '#ffcf7a' : '#bcd4ff', opacity: (0.4 + R() * 0.5).toFixed(2) }, city);
      }
      if (h > 200) svg('circle', { cx: x + w / 2, cy: 560 - h - 6, r: 2.4, fill: '#ff4a3a', class: 'blink' }, city);
      x += w + 2;
    }
    const bokeh = $('#nightBokeh');
    for (let i = 0; i < 36; i++) svg('circle', { cx: (R() * 1600).toFixed(0), cy: (500 + R() * 260).toFixed(0), r: (16 + R() * 54).toFixed(0), fill: R() > 0.4 ? 'url(#gBokehW)' : 'url(#gBokehR)', opacity: (0.35 + R() * 0.45).toFixed(2) }, bokeh);
    // long-exposure lanes converging on the horizon
    const trails = $('#nightTrails');
    svg('path', { d: 'M-300 900L1180 566L1290 566L1900 900Z', fill: '#0a0d14', opacity: 0.85 }, trails);
    for (let i = 0; i < 10; i++) {
      const inbound = i < 5;
      const sx = -320 + i * 230, ex = 1190 + i * 10;
      const d = `M${sx} 940C${400 + i * 40} ${760 - i * 6},${900 + i * 16} ${612 - i * 2},${ex} 568`;
      const color = inbound ? '#fff1c9' : '#ff4a36';
      const dash = `${(180 + R() * 220).toFixed(0)} ${(90 + R() * 260).toFixed(0)} ${(40 + R() * 80).toFixed(0)} ${(160 + R() * 200).toFixed(0)}`;
      const glow = svg('path', { d, fill: 'none', stroke: color, 'stroke-width': 9, opacity: 0.12, 'stroke-linecap': 'round', 'stroke-dasharray': dash }, trails);
      const core = svg('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.4, opacity: 0.9, 'stroke-linecap': 'round', 'stroke-dasharray': dash }, trails);
      night.trails.push({ els: [glow, core], v: (inbound ? -1 : 1) * (240 + R() * 200), off: R() * 1000 });
    }
  }

  /* ---------- night harbour behind contact ---------- */

  function buildHarbour() {
    const g = $('#harbourSvg');
    const R = rng(4242);
    const defs = svg('defs', {}, g);
    const grad = (tag, id, stops, attrs) => {
      const el = svg(tag, Object.assign({ id }, attrs || {}), defs);
      stops.forEach(([o, c, a]) => svg('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, el));
    };
    grad('linearGradient', 'gHarbourWater', [[0, '#0f1a2c', 1], [1, '#05080e', 1]], { x1: 0, y1: 0, x2: 0, y2: 1 });
    grad('radialGradient', 'gHarbourGlow', [[0, '#ffd690', 0.9], [0.3, '#ffb35c', 0.35], [1, '#ff9a3c', 0]]);
    const ink = '#04060a';
    const sil = svg('g', { fill: ink }, g);
    [140, 400, 1180, 1430].forEach((x) => crane(sil, x, 150 + R() * 50, ink));
    for (let x = 0; x < 1600; x += 60 + R() * 90) {
      const h = 18 + Math.floor(R() * 4) * 18;
      svg('rect', { x, y: 300 - h, width: 40 + R() * 70, height: h }, sil);
    }
    // ship alongside
    svg('path', { d: 'M640 300L660 250H1080L1060 300Z', fill: '#070a12' }, sil);
    for (let b = 0; b < 10; b++) svg('rect', { x: 700 + b * 34, y: 250 - (1 + Math.floor(R() * 4)) * 14, width: 30, height: 60, fill: '#0a0f18' }, sil);
    svg('rect', { x: 1020, y: 180, width: 44, height: 70, fill: '#0a0f18' }, sil);
    svg('rect', { x: 0, y: 296, width: 1600, height: 6, fill: '#0b111b' }, g);
    svg('rect', { x: 0, y: 302, width: 1600, height: 118, fill: 'url(#gHarbourWater)' }, g);
    // floodlights, deck lights and their reflections
    const lights = svg('g', {}, g);
    for (let x = 60; x < 1600; x += 140 + R() * 80) {
      svg('rect', { x: x - 1, y: 210, width: 2, height: 90, fill: ink }, lights);
      svg('circle', { cx: x, cy: 210, r: 46, fill: 'url(#gHarbourGlow)' }, lights);
      for (let k = 0; k < 9; k++) {
        const w = 12 - k + R() * 6;
        svg('rect', { x: (x - w / 2 + (R() - 0.5) * 6).toFixed(1), y: 306 + k * 11, width: w.toFixed(1), height: 2.2, fill: '#ffcf7a', opacity: (0.5 - k * 0.05).toFixed(2) }, lights);
      }
    }
    for (let x = 720; x < 1050; x += 30) svg('circle', { cx: x, cy: 246, r: 2, fill: '#ffe2a8' }, lights);
    svg('rect', { x: 1026, y: 192, width: 32, height: 6, fill: '#ffd38a' }, lights);
    [140, 400, 1180, 1430].forEach((x, i) => {
      svg('circle', { cx: x + 36, cy: 30 + i * 6, r: 3, fill: '#ff4a3a', class: 'blink', style: `animation-delay:${i * 0.4}s` }, lights);
    });
    for (let i = 0; i < 26; i++) svg('rect', { x: (R() * 1600).toFixed(0), y: (312 + R() * 100).toFixed(0), width: (20 + R() * 60).toFixed(0), height: 1.5, fill: '#ffd9a8', opacity: (0.08 + R() * 0.18).toFixed(2) }, g);
  }

  function splitFooter() {
    const fm = $('#footerMark .fm');
    fm.innerHTML = [...fm.textContent].map((c, i) => `<span class="fl" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  }

  /* ---------- contact + menu ---------- */

  function flash(btn, txt) {
    const old = btn.dataset.label || btn.textContent;
    btn.dataset.label = old;
    btn.textContent = txt;
    btn.classList.add('is-done');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('is-done'); }, 1600);
  }

  function copyText(str) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(str);
    return Promise.reject(new Error('no clipboard'));
  }

  function initContact() {
    const email = $('#contactEmail').textContent.trim();
    $$('.copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        copyText(btn.dataset.copy).then(() => flash(btn, 'Copied'), () => {
          const span = btn.previousElementSibling;
          const range = document.createRange();
          range.selectNodeContents(span);
          const sel = getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          flash(btn, 'Selected');
        });
      });
    });

    const form = $('#quoteForm');
    const msg = $('#formMsg');
    const mail = $('#mailLink');
    const fields = { name: $('#qName'), company: $('#qCompany'), from: $('#qFrom'), to: $('#qTo'), cargo: $('#qCargo'), notes: $('#qNotes') };
    const compose = () => {
      const v = (k) => fields[k].value.trim();
      const lines = [
        'Quote request for CNIQ India',
        '',
        `Name: ${v('name') || '-'}`,
        `Company: ${v('company') || '-'}`,
        `Pickup: ${v('from') || '-'}`,
        `Drop: ${v('to') || '-'}`,
        `Cargo: ${v('cargo')}`,
        `Notes: ${v('notes') || '-'}`
      ];
      return { subject: `Quote request: ${v('from') || 'pickup'} to ${v('to') || 'drop'}`, body: lines.join('\n') };
    };
    const syncMail = () => {
      const c = compose();
      mail.href = `mailto:${email}?subject=${encodeURIComponent(c.subject)}&body=${encodeURIComponent(c.body)}`;
    };
    form.addEventListener('input', syncMail);
    syncMail();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const missing = ['name', 'from', 'to'].filter((k) => !fields[k].value.trim());
      Object.values(fields).forEach((f) => f.removeAttribute('aria-invalid'));
      missing.forEach((k) => fields[k].setAttribute('aria-invalid', 'true'));
      msg.className = 'form-msg';
      if (missing.length) {
        msg.textContent = 'Add your name, pickup and drop so we can price the route.';
        msg.classList.add('is-err');
        fields[missing[0]].focus();
        return;
      }
      const c = compose();
      copyText(`${c.subject}\n\n${c.body}`).then(() => {
        msg.textContent = `Request copied. Paste it into an email to ${email}.`;
        msg.classList.add('is-ok');
      }, () => {
        msg.textContent = `Your browser blocked copying. Use “Open in email”, or write to ${email}.`;
        msg.classList.add('is-err');
      });
    });
  }

  let closeMenu = () => {};
  function initMenu() {
    const btn = $('#menuBtn');
    const drawer = $('#drawer');
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('.sr').textContent = open ? 'Close menu' : 'Open menu';
      drawer.hidden = !open;
      doc.classList.toggle('menu-open', open);
      if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
      if (open) drawer.querySelector('a').focus();
    };
    closeMenu = () => { if (!drawer.hidden) set(false); };
    btn.addEventListener('click', () => set(drawer.hidden));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.hidden) { set(false); btn.focus(); }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  $('#year').textContent = new Date().getFullYear();
  buildPixelIcons();
  buildCompassTicks();
  buildTextures();
  buildWheel();
  buildFar();
  buildNight();
  buildHarbour();
  splitFooter();
  initContact();
  initMenu();

  if (!hasGSAP) {
    doc.classList.add('no-gsap', 'is-loaded');
    return;
  }

  doc.classList.add('has-motion', 'in-film');
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const narrowAtBoot = innerWidth < 760;
  buildMap(!narrowAtBoot);
  buildVoyage();

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y, immediate) => {
    if (lenis) lenis.scrollTo(y, { duration: immediate ? 0 : 1.8, immediate: !!immediate, force: true });
    else window.scrollTo({ top: y, behavior: reduceMotion || immediate ? 'auto' : 'smooth' });
  };

  /* ---------- the film ---------- */
  const stage = $('#stage');
  const skyGold = $('#skyGold');
  const sun = $('#sun');
  const sunGold = $('#sunGold');
  const rays = $('#rays');
  const motes = $('#motes');
  const hero = $('#hero');
  const cue = $('#scrollCue');
  const chart = $('.chart');
  const giant = $('#giant');
  const rig = $('#rig');
  const far = $('#far');
  const far3 = $('#far3');
  const far2 = $('#far2');
  const sideWrap = $('#sideWrap');
  const side = $('#side');
  const truck = $('#truck');
  const box = $('#box');
  const callout = $('#callout');
  const worldBack = $('#worldBack');
  const worldFront = $('#worldFront');
  const head = $('#head');
  const boomCol = $('#boomCol');
  const boomHi = $('#boomHi');
  const cyl = [[$('#cylBarrelL'), $('#cylRodL'), 522, 538], [$('#cylBarrelR'), $('#cylRodR'), 598, 582]];
  const reach = {
    boom: $('#rBoom'), inner: $('#rInner'), head: $('#rHead'), crate: $('#rCrate'),
    barrel: $('#rBarrel'), rod: $('#rRod'), rodHi: $('#rRodHi'), pin: $('#rPin')
  };
  const wheels = $$('#truck .wheel use.spin');
  const puffs = $$('#puffs circle');
  const dust = $$('#dust ellipse');
  const truckBeam = $('#truckBeam');
  const lampGlows = $('#lampGlows');
  const warm = $('#warm');
  const vignette = $('#vignette');
  const bars = [$('#barTop'), $('#barBot')];
  const cards = [$('#card1'), $('#card2'), $('#card3')];
  const lanes = $('#lanes');
  const track = $('#track');
  const aerial = $('#telemetry');
  const mapSvg = $('#map');
  const cam = $('#cam');
  const skyClouds = $$('#skyClouds i');
  const nightVeil = $('#nightVeil');
  const mapLights = $('#mapLights');
  const tv = {
    cab: $('#tvCab'), t1: $('#tvTrailer'), t2: $('#tvTrailer2'),
    sCab: $('#tvShadowCab'), s1: $('#tvShadowTrailer'), s2: $('#tvShadowTrailer2'),
    lCab: $('#tvLightsCab'), lTail: $('#tvLightsTrailer')
  };
  const fencePing = $('#fencePing');
  const hudStatus = $('#hudStatus');
  const hud = { num: $('#hudNum'), chapter: $('#hudChapter'), text: $('#hudText'), spd: $('#spd') };
  const tel = {
    lat: $('#tLat'), lon: $('#tLon'), hdg: $('#tHdg'), spd: $('#tSpd'), rem: $('#tRem'), clock: $('#tClock'),
    needle: $('#cNeedle'), events: $$('#tEvents li')
  };

  // Everything the film animates. Units: svg units for the yard, 0–1 or 0–2 stops elsewhere.
  const F = {
    hero: 0, sz: 0, pan: 0, tod: 0, shake: 0, puff: 0,
    tx: -2300, clunk: 0, S: 180, by: 196, call: 0, sp: 0,
    world: 0, d: 0, odo: 0,
    rig: 0, track: 0, trackA: 1, giant: 0, giantA: 0,
    bars: 0, c1: 0, c2: 0, c3: 0,
    aerA: 0, cloud: 1, zoom: 3.4, p: 0, ov: 0, night: 0, ping: 0
  };
  const L = {};
  let filmTl = null;
  let voyageOn = false;
  let nightOn = false;
  const OVERVIEW = { x: 2700, y: 1760 };
  const RUN_X = 300;

  // the light of the working day: morning yard (0) → noon (1) → golden hour (1.6)
  const DAY = {
    hz: tone([[0, '#f6efe3'], [1, '#f3f5f6'], [1.6, '#f7ad78']]),
    dark: tone([[0, '#7b8796'], [1, '#748191'], [1.6, '#6b5060']]),
    gold: [[1, 0], [1.6, 1]],
    sunX: [[0, 76], [1, 62], [1.6, 30]],
    sunY: [[0, 24], [1, 12], [1.6, 47]],
    rays: [[0, 0.55], [0.6, 0.15], [1.1, 0], [1.6, 0.4]],
    warm: [[0, 0.1], [0.8, 0], [1.2, 0.08], [1.6, 0.36]],
    vig: [[0, 0.45], [1, 0.35], [1.6, 0.8]]
  };
  let lastTod = -1, lastTint = -1;
  function renderSky(t) {
    if (Math.abs(t - lastTod) < 0.002) return;
    lastTod = t;
    // compositor-only work every frame: fades and the sun's position
    skyGold.style.opacity = keyed(DAY.gold, t).toFixed(3);
    sunGold.style.opacity = keyed(DAY.gold, t).toFixed(3);
    sun.style.transform = `translate3d(${(L.W * keyed(DAY.sunX, t) / 100).toFixed(1)}px, ${(L.H * keyed(DAY.sunY, t) / 100).toFixed(1)}px, 0)`;
    rays.style.opacity = keyed(DAY.rays, t).toFixed(3);
    // horizon colours repaint the skyline, so they step in small increments
    const tint = Math.round(t * 30) / 30;
    if (tint !== lastTint) {
      lastTint = tint;
      const hz = keyed(DAY.hz, tint), dk = keyed(DAY.dark, tint);
      const fs = far.style;
      fs.setProperty('--far3', rgb(mix(hz, dk, 0.32)));
      fs.setProperty('--far2', rgb(mix(hz, dk, 0.62)));
      fs.setProperty('--haze', rgb(hz, 0.85));
    }
    const w = keyed(DAY.warm, t);
    warm.style.opacity = w.toFixed(3);
    warm.style.visibility = w < 0.02 ? 'hidden' : '';
    vignette.style.opacity = keyed(DAY.vig, t).toFixed(3);
    const lit = clamp((t - 1.22) / 0.3, 0, 1).toFixed(3);
    truckBeam.setAttribute('opacity', lit);
    lampGlows.setAttribute('opacity', lit);
    motes.style.opacity = clamp(1 - (t - 0.1) * 3, 0, 1).toFixed(3);
  }

  function measure() {
    L.W = stage.clientWidth;
    L.H = stage.clientHeight;
    L.narrow = L.W / L.H < 0.9;
    // phones see a 900-unit window; a pan frames the reach stacker at the stack, then the
    // front stacker and the arriving road train, then the departing rig
    const vbX = L.narrow ? 350 : 0, vbW = L.narrow ? 900 : 1600;
    side.setAttribute('viewBox', `${vbX} 0 ${vbW} 640`);
    L.sideScale = Math.min(sideWrap.clientWidth / vbW, sideWrap.clientHeight / 640);
    L.panHero = L.narrow ? (800 - 1290) * L.sideScale : 0;
    L.panLift = L.narrow ? (800 - 700) * L.sideScale : 0;
    L.panRun = L.narrow ? (800 - (659 + RUN_X)) * L.sideScale : 0;
    L.ground = clamp(L.H * 0.022, 14, 24);
    L.rise = Math.min(Math.max(L.H * 0.5, 380), L.H * 0.64);
    L.heroScale = L.narrow ? 1 : 0.84;
    L.liftScale = L.narrow ? 1 : 1.06;
    L.runScale = L.narrow ? 1 : 0.9;
    L.trackShift = Math.max(0, track.scrollWidth - L.W);
    L.giantW = giant.scrollWidth;
    L.mapBase = clamp(Math.min(L.W / 1700, L.H / 1100), 0.36, 1.25);
    mapSvg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  }

  function renderLift(S) {
    head.setAttribute('transform', `translate(0 ${S.toFixed(2)})`);
    const top = S - 10;
    for (const r of [boomCol, boomHi]) {
      r.setAttribute('y', top.toFixed(2));
      r.setAttribute('height', Math.max(0, 540 - top).toFixed(2));
    }
    const ty = top + (540 - top) * 0.42;
    for (const [barrel, rod, bx, tx] of cyl) {
      const dx = tx - bx, dy = ty - 520, len = Math.hypot(dx, dy);
      const b = Math.min(96, len * 0.62) / len;
      const mx = bx + dx * b, my = 520 + dy * b;
      barrel.setAttribute('x1', bx); barrel.setAttribute('y1', 520);
      barrel.setAttribute('x2', mx.toFixed(2)); barrel.setAttribute('y2', my.toFixed(2));
      rod.setAttribute('x1', mx.toFixed(2)); rod.setAttribute('y1', my.toFixed(2));
      rod.setAttribute('x2', tx); rod.setAttribute('y2', ty.toFixed(2));
    }
  }

  // side-on reach stacker, posed by where its boom tip is: sp 0 holds a box aloft,
  // 1 sets it on row 3 of the first column, 2 lifts the spreader clear.
  // Boom pivot (-330, 456); the spreader hangs 104 units below the tip.
  const REACH_TIP = [[0, [10, 104]], [0.7, [112, 124]], [1, [130, 152]], [1.25, [130, 124]], [2, [40, 100]]];
  const setLine = (el, x1, y1, x2, y2) => {
    el.setAttribute('x1', x1.toFixed(1)); el.setAttribute('y1', y1.toFixed(1));
    el.setAttribute('x2', x2.toFixed(1)); el.setAttribute('y2', y2.toFixed(1));
  };
  function renderReach(s) {
    const [x, y] = keyed(REACH_TIP, s);
    const dx = x + 330, dy = 456 - y, l = Math.hypot(dx, dy), c = dx / l, n = dy / l;
    reach.boom.setAttribute('transform', `translate(-330 456) rotate(${(-deg(Math.atan2(dy, dx))).toFixed(2)})`);
    reach.inner.setAttribute('transform', `translate(${(l - 450).toFixed(2)} 0)`);
    reach.head.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    // the box rides the spreader until it lands, then stays on the stack
    const [bx, by] = keyed(REACH_TIP, Math.min(s, 1));
    reach.crate.setAttribute('transform', `translate(${(bx - 60).toFixed(2)} ${(by + 104).toFixed(2)})`);
    // lift cylinder: frame pin (-20, 536) to a pin 230 along the boom
    const ax = -330 + 230 * c + 18 * n, ay = 456 - 230 * n + 18 * c;
    const len = Math.hypot(ax + 20, ay - 536), k = Math.min(160, len - 24) / len;
    const mx = -20 + (ax + 20) * k, my = 536 + (ay - 536) * k;
    setLine(reach.barrel, -20, 536, mx, my);
    setLine(reach.rod, mx, my, ax, ay);
    setLine(reach.rodHi, mx, my, ax, ay);
    reach.pin.setAttribute('cx', ax.toFixed(1));
    reach.pin.setAttribute('cy', ay.toFixed(1));
  }

  const STATUS = [
    [0, '01', 'The Lift', 'Awaiting chassis · 06:40'],
    [0.5, '01', 'The Lift', 'Road train arriving · Bay 14'],
    [2.7, '01', 'The Lift', 'Lowering onto chassis'],
    [4.0, '01', 'The Lift', 'Twist-locks engaged'],
    [4.6, '01', 'The Lift', 'Load secured · CNIU 820149 0'],
    [5.4, '02', 'The Run', 'Departing CFS Yard 3'],
    [6.8, '02', 'The Run', 'En route · NH 66 south'],
    [11.8, '02', 'The Run', 'Golden hour · headlights on'],
    [13.4, '03', 'The Corridor', 'Switching to satellite view'],
    [14.8, '03', 'The Corridor', 'Tracking · NH 66 corridor'],
    [19.6, '03', 'The Corridor', 'Approaching port gate 2'],
    [20.95, '03', 'The Corridor', 'Gate in · geofence confirmed']
  ];
  let statusIdx = -1;
  let navKey = '';
  const setNav = (key) => {
    if (key === navKey) return;
    navKey = key;
    $$('.nav a').forEach((a) => a.classList.toggle('is-active', (a.dataset.film || a.getAttribute('href').slice(1)) === key));
  };

  function renderStatus(t) {
    let i = 0;
    while (i < STATUS.length - 1 && t >= STATUS[i + 1][0]) i++;
    if (i === statusIdx) return;
    statusIdx = i;
    const [, num, chapter, text] = STATUS[i];
    hud.num.textContent = num;
    hud.chapter.textContent = chapter;
    hud.text.textContent = text;
    setNav(num === '01' ? 'lift' : num === '02' ? 'run' : 'aerial');
  }

  const P = { x: 0, y: 0 }; // pointer parallax, −1…1
  function renderFar() {
    const k = L.sideScale * along(F.sz, [L.heroScale, L.liftScale, L.runScale]);
    far3.style.transform = `translate3d(${(F.world * k * 0.06 + P.x * -10).toFixed(1)}px, ${(P.y * -4).toFixed(1)}px, 0)`;
    far2.style.transform = `translate3d(${(F.world * k * 0.2 + P.x * -24).toFixed(1)}px, ${(P.y * -8).toFixed(1)}px, 0)`;
  }

  function renderFilm() {
    const t = filmTl ? filmTl.time() : 0;
    // hero copy leaves first
    hero.style.transform = `translate3d(0, ${(-F.hero * 90).toFixed(1)}px, 0)`;
    hero.style.opacity = 1 - F.hero;
    hero.style.visibility = F.hero > 0.999 ? 'hidden' : '';
    cue.style.opacity = 1 - Math.min(1, F.hero * 2);
    chart.style.opacity = 1 - F.hero;
    hudStatus.style.setProperty('--hud-a', F.hero.toFixed(3));
    renderSky(F.tod);

    // camera on the yard, with a jolt when the box lands
    const wrapScale = along(F.sz, [L.heroScale, L.liftScale, L.runScale]);
    const sx = Math.sin(t * 157) * F.shake * 4, sy = Math.cos(t * 131) * F.shake * 3;
    sideWrap.style.transform = `translate3d(${(along(F.pan, [L.panHero, L.panLift, L.panRun]) + sx).toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${wrapScale.toFixed(4)})`;
    rig.style.transform = `translate3d(0, ${along(F.rig, [-L.ground, -L.rise, -L.H]).toFixed(1)}px, 0)`;
    renderFar();

    // yard
    truck.setAttribute('transform', `translate(${F.tx.toFixed(2)} ${F.clunk.toFixed(2)})`);
    box.setAttribute('transform', `translate(${(260 + Math.max(0, F.tx)).toFixed(2)} ${(F.by + F.clunk).toFixed(2)})`);
    callout.style.opacity = F.call;
    renderLift(F.S);
    renderReach(F.sp);
    const wt = `translate(${F.world.toFixed(1)} 0)`;
    worldBack.setAttribute('transform', wt);
    worldFront.setAttribute('transform', wt);
    const spin = `rotate(${deg(F.d / 26).toFixed(1)})`;
    for (const w of wheels) w.setAttribute('transform', spin);
    // exhaust from the twin stacks as the rig pulls away
    puffs.forEach((c, i) => {
      const k = clamp(F.puff * 1.8 - i * 0.1, 0, 1);
      c.setAttribute('cx', (951 - k * (170 + i * 26)).toFixed(1));
      c.setAttribute('cy', (398 - k * (120 + i * 10)).toFixed(1));
      c.setAttribute('r', (5 + k * 40).toFixed(1));
      c.setAttribute('opacity', k > 0 && k < 1 ? ((1 - k) * 0.85).toFixed(3) : '0');
    });

    // road + services
    const lanePx = (F.world * L.sideScale * wrapScale) % 128;
    lanes.style.transform = `translate3d(${lanePx.toFixed(1)}px, 0, 0)`;
    track.style.transform = `translate3d(${(-F.track * L.trackShift).toFixed(1)}px, 0, 0)`;
    track.style.opacity = F.trackA;
    giant.style.transform = `translate3d(${lerp(L.W * 0.55, -(L.giantW - L.W * 0.2), F.giant).toFixed(1)}px, 0, 0)`;
    giant.style.opacity = F.giantA;

    // chapter cards
    stage.classList.toggle('no-cards', F.bars < 0.001 && F.c1 + F.c2 + F.c3 < 0.001);
    stage.classList.toggle('is-aerial', F.aerA > 0.999);
    bars[0].style.transform = `scaleY(${F.bars.toFixed(3)})`;
    bars[1].style.transform = `scaleY(${F.bars.toFixed(3)})`;
    [F.c1, F.c2, F.c3].forEach((v, i) => {
      cards[i].style.opacity = v.toFixed(3);
      cards[i].style.transform = `translate3d(0, ${((1 - v) * 18).toFixed(1)}px, 0)`;
    });

    // satellite
    aerial.style.opacity = F.aerA;
    aerial.style.visibility = F.aerA > 0.001 ? 'visible' : 'hidden';
    if (F.aerA > 0.001) renderMap();

    renderStatus(t);
  }

  const ROUTE_START = 330;
  const lastTel = {};
  const setText = (key, node, value) => {
    if (lastTel[key] !== value) { lastTel[key] = value; node.textContent = value; }
  };
  const place = (el, x, y, a) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg(a).toFixed(2)})`);

  function renderMap() {
    const r = map.route;
    const s = lerp(ROUTE_START, r.len - 40, F.p);
    // the road train articulates: cab, 40 ft trailer, then the dolly and 20 ft trailer
    const K = laneAt(r, s, 72);
    const front = laneAt(r, s + 40, 72);
    const R1 = laneAt(r, s - 176, 72);
    const D = laneAt(r, s - 200, 72);
    const R2 = laneAt(r, s - 296, 72);
    const cabA = Math.atan2(front.y - K.y, front.x - K.x);
    const t1A = Math.atan2(K.y - R1.y, K.x - R1.x);
    const t2A = Math.atan2(D.y - R2.y, D.x - R2.x);
    place(tv.cab, K.x, K.y, cabA);
    place(tv.t1, K.x, K.y, t1A);
    place(tv.t2, D.x, D.y, t2A);
    place(tv.sCab, K.x + 10, K.y + 12, cabA);
    place(tv.s1, K.x + 10, K.y + 12, t1A);
    place(tv.s2, D.x + 10, D.y + 12, t2A);

    // evening falls over the corridor: warm light, then blue hour and the lights come on
    const n = F.night;
    const veil = n < 0.35 ? hex('#ff9a4a') : mix(hex('#ff9a4a'), hex('#0b1736'), smooth((n - 0.35) / 0.65));
    nightVeil.setAttribute('fill', rgb(veil));
    nightVeil.setAttribute('opacity', (n < 0.35 ? (n / 0.35) * 0.16 : lerp(0.16, 0.64, (n - 0.35) / 0.65)).toFixed(3));
    const lit = clamp((n - 0.45) / 0.35, 0, 1);
    lightsOn = lit > 0.001;
    mapLights.setAttribute('opacity', lit.toFixed(3));
    mapLights.style.display = lightsOn ? '' : 'none';
    if (lightsOn) {
      place(tv.lCab, K.x, K.y, cabA);
      place(tv.lTail, D.x, D.y, t2A);
      for (const c of map.cars) c.lit.setAttribute('transform', c.el.getAttribute('transform') || '');
    }

    const lead = 130;
    const tx = lerp(K.x + Math.cos(cabA) * lead, L.narrow ? 2920 : OVERVIEW.x, F.ov);
    const ty = lerp(K.y + Math.sin(cabA) * lead, L.narrow ? 1960 : OVERVIEW.y, F.ov);
    const sc = L.mapBase * F.zoom * (L.narrow ? lerp(1, 1.35, F.ov) : 1);
    const cx = L.W * (L.narrow ? 0.5 : 0.42);
    const cy = L.H * (L.narrow ? 0.36 : 0.52);
    cam.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${sc.toFixed(4)}) translate(${(-tx).toFixed(1)} ${(-ty).toFixed(1)})`);

    // clouds part as the camera settles
    const dirs = [[-1, -0.6], [1, -0.5], [-0.8, 0.8], [0.9, 0.9], [0.1, -1]];
    skyClouds.forEach((c, i) => {
      const k = 1 - F.cloud;
      c.style.opacity = (F.cloud * 0.95).toFixed(3);
      c.style.transform = `translate3d(${(dirs[i][0] * k * 40).toFixed(1)}vmax, ${(dirs[i][1] * k * 30).toFixed(1)}vmax, 0) scale(${(1 + k * 0.7).toFixed(3)})`;
    });

    fencePing.setAttribute('r', (170 + F.ping * 190).toFixed(1));
    fencePing.setAttribute('opacity', F.ping > 0 ? (1 - F.ping).toFixed(3) : '0');

    // simulated telemetry, interpolated from real coordinates near Thiruvananthapuram
    const lat = 8.5241 - (K.y - 600) * 1.03e-4;
    const lon = 76.9366 + (K.x + 700) * 1.6e-5;
    const bearing = (deg(cabA) + 450) % 360;
    const card = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];
    const mins = 5 + Math.round(F.p * 27);
    setText('lat', tel.lat, `${pad(lat.toFixed(4), 7)}° N`);
    setText('lon', tel.lon, `${pad(lon.toFixed(4), 8)}° E`);
    setText('hdg', tel.hdg, `${pad(Math.round(bearing) % 360, 3)}° ${card}`);
    setText('rem', tel.rem, `${(4.6 * (1 - F.p)).toFixed(1)} km`);
    setText('clock', tel.clock, `18:${pad(mins, 2)}`);
    tel.needle.style.transform = `rotate(${bearing.toFixed(1)}deg)`;
    for (const li of tel.events) li.classList.toggle('is-on', F.p >= +li.dataset.at);
  }

  measure();

  const FILM_DUR = 22.4;
  filmTl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: renderFilm,
    scrollTrigger: {
      trigger: '#fleet',
      start: 'top top',
      end: () => '+=' + Math.round(innerHeight * (innerWidth / innerHeight < 0.9 ? 0.5 : 0.56) * FILM_DUR),
      pin: stage,
      scrub: reduceMotion ? true : 0.7,
      anticipatePin: 1,
      onToggle: (self) => doc.classList.toggle('in-film', self.isActive)
    }
  });

  filmTl
    .addLabel('lift', 0)
    .to(F, { hero: 1, duration: 1, ease: 'power2.in' }, 0)
    .to(F, { sz: 1, duration: 2.6, ease: 'power1.inOut' }, 0)
    .to(F, { tod: 0.3, duration: 6 }, 0)
    .to(F, { bars: 1, c1: 1, duration: 0.4, ease: 'power2.out' }, 0.8)
    .to(F, { bars: 0, c1: 0, duration: 0.4, ease: 'power2.in' }, 2.2)
    .to(F, { tx: 0, d: 2300, odo: 14, duration: 2.2, ease: 'power2.out' }, 0.4)
    .to(F, { sp: 1, duration: 1.8, ease: 'power1.inOut' }, 0.5)
    .to(F, { sp: 2, duration: 1.1, ease: 'power1.inOut' }, 2.4)
    .to(F, { pan: 1, duration: 1.3, ease: 'power2.inOut' }, 2.0)
    .to(F, { S: 408, by: 424, duration: 1.3, ease: 'power1.inOut' }, 2.7)
    .to(F, { call: 1, duration: 0.3 }, 3.9)
    .to(F, { clunk: 3, shake: 1, duration: 0.1, ease: 'power2.in' }, 4.0)
    .to(F, { clunk: 0, shake: 0, duration: 0.4, ease: 'power2.out' }, 4.1)
    .to(F, { S: 384, duration: 0.3, ease: 'power1.out' }, 4.4)
    .to(F, { S: 150, duration: 0.9, ease: 'power2.inOut' }, 4.7)
    .to(F, { call: 0, duration: 0.3 }, 5.6)
    .addLabel('depart', 5.4)
    .to(F, { tx: RUN_X, pan: 2, duration: 1.4, ease: 'power1.inOut' }, 5.4)
    .to(F, { puff: 1, duration: 1.6 }, 5.4)
    .to(F, { world: -400, d: 3000, odo: 22, duration: 1.2, ease: 'power2.in' }, 5.4)
    .to(F, { bars: 1, c2: 1, duration: 0.4, ease: 'power2.out' }, 5.7)
    .to(F, { bars: 0, c2: 0, duration: 0.4, ease: 'power2.in' }, 7.0)
    .to(F, { rig: 1, sz: 2, duration: 1.4, ease: 'power2.inOut' }, 6.0)
    .to(F, { tod: 1.62, duration: 7.4 }, 6.0)
    .to(F, { giantA: 1, duration: 0.6 }, 6.2)
    .to(F, { giant: 1, duration: 7.2 }, 6.2)
    .addLabel('run', 7.4)
    .to(F, { world: -4400, d: 7000, odo: 82, duration: 6.8 }, 6.6)
    .to(F, { track: 1, duration: 6.8 }, 6.6)
    .to(F, { trackA: 0, giantA: 0, duration: 0.6 }, 13.2)
    .to(F, { rig: 2, duration: 1.2, ease: 'power2.in' }, 13.2)
    .to(F, { bars: 1, c3: 1, duration: 0.3, ease: 'power2.out' }, 14.15)
    .to(F, { aerA: 1, duration: 0.6 }, 14.4)
    .to(F, { zoom: 1.15, duration: 2, ease: 'power2.out' }, 14.4)
    .to(F, { cloud: 0, duration: 1.4, ease: 'power2.inOut' }, 14.4)
    .to(F, { bars: 0, c3: 0, duration: 0.4, ease: 'power2.in' }, 15.0)
    .addLabel('aerial', 15.4)
    .to(F, { p: 1, odo: 132, duration: 6.4, ease: 'power1.inOut' }, 14.6)
    .to(F, { night: 0.3, duration: 2.4 }, 14.6)
    .to(F, { night: 1, duration: 4.2, ease: 'power1.in' }, 17.0)
    .to(F, { zoom: 0.58, ov: 1, duration: 1.6, ease: 'power2.inOut' }, 19.6)
    .to(F, { ping: 1, duration: 0.8, ease: 'power1.out' }, 21.0)
    .to({}, { duration: 0.6 }, FILM_DUR - 0.6);

  ScrollTrigger.addEventListener('refreshInit', measure);
  ScrollTrigger.addEventListener('refresh', () => { lastTod = -1; lastTint = -1; renderFilm(); });
  renderFilm();

  const filmY = (key) => {
    const st = filmTl.scrollTrigger;
    return st.start + (filmTl.labels[key] / filmTl.duration()) * (st.end - st.start);
  };

  /* ---------- ambient life (time-based, never tied to scroll) ---------- */
  if (!reduceMotion) {
    gsap.to('#beaconGlow', { opacity: 0.9, duration: 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('#rBeaconGlow', { opacity: 0.9, duration: 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.35 });
    gsap.to('#cabBody', { y: 0.6, duration: 0.14, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    const R = rng(12);
    for (let i = 0; i < 18; i++) {
      const m = document.createElement('i');
      m.style.left = `${45 + R() * 50}%`;
      m.style.top = `${10 + R() * 55}%`;
      m.style.opacity = (0.3 + R() * 0.6).toFixed(2);
      motes.appendChild(m);
      gsap.to(m, { x: 'random(-60, 60)', y: 'random(-50, 40)', duration: 'random(5, 11)', repeat: -1, yoyo: true, ease: 'sine.inOut', delay: R() * 3 });
    }
    if (matchMedia('(pointer: fine)').matches) {
      const qx = gsap.quickTo(P, 'x', { duration: 1.2, ease: 'power3.out', onUpdate: renderFar });
      const qy = gsap.quickTo(P, 'y', { duration: 1.2, ease: 'power3.out' });
      stage.addEventListener('pointermove', (e) => {
        qx((e.clientX / innerWidth) * 2 - 1);
        qy((e.clientY / innerHeight) * 2 - 1);
      });
    }
  }

  /* ---------- per-frame: speed, motion blur, dust, traffic, water, light trails ---------- */
  let lastOdo = F.odo, vel = 0, shown = -1, sharpShown = 1;
  gsap.ticker.add((time, dtMs) => {
    const dt = Math.max(dtMs, 1) / 1000;
    const raw = Math.abs(F.odo - lastOdo) / dt;
    lastOdo = F.odo;
    vel += (raw - vel) * 0.1;
    const kmh = Math.min(96, Math.round(vel * 2.2));
    if (kmh !== shown) {
      shown = kmh;
      hud.spd.textContent = pad(kmh, 2);
      tel.spd.textContent = pad(kmh, 2);
    }
    const sharp = clamp(1 - (kmh - 8) / 40, 0, 1);
    if (Math.abs(sharp - sharpShown) > 0.02) {
      sharpShown = sharp;
      truck.style.setProperty('--sharp', sharp.toFixed(2));
    }
    if (!reduceMotion && doc.classList.contains('in-film')) {
      const amt = F.tx > 0 && F.aerA < 0.5 ? clamp(kmh / 50, 0, 1) : 0;
      dust.forEach((e, i) => {
        const ph = (time * 1.4 + i / dust.length) % 1;
        e.setAttribute('cx', (-200 - ph * 220).toFixed(1));
        e.setAttribute('cy', (632 - ph * 26).toFixed(1));
        e.setAttribute('rx', (12 + ph * 46).toFixed(1));
        e.setAttribute('ry', (5 + ph * 14).toFixed(1));
        e.setAttribute('opacity', (amt * (1 - ph) * 0.75).toFixed(3));
      });
    }
    if (!reduceMotion && F.aerA > 0.001) moveCars(time);
    if (voyageOn) renderVoyage(time);
    if (nightOn) renderNight(time);
  });

  /* ---------- manifesto over the night highway ---------- */
  const mt = $('#manifestoText');
  mt.innerHTML = mt.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  gsap.to('#manifestoText .w', {
    color: '#ffffff',
    stagger: 0.08,
    ease: 'none',
    scrollTrigger: { trigger: mt, start: 'top 80%', end: 'bottom 45%', scrub: true }
  });
  gsap.from('.principles article', {
    y: 40,
    stagger: 0.12,
    ease: 'none',
    scrollTrigger: { trigger: '.principles', start: 'top 98%', end: 'top 72%', scrub: true }
  });
  gsap.fromTo('#nightSvg', { scale: 1.16 }, {
    scale: 1,
    ease: 'none',
    scrollTrigger: { trigger: '#approach', start: 'top bottom', end: 'bottom top', scrub: true }
  });
  let nightScroll = 0;
  function renderNight(time) {
    const live = reduceMotion ? 0 : time;
    for (const tr of night.trails) {
      const o = (tr.off + live * tr.v + nightScroll * tr.v * 2).toFixed(0);
      tr.els[0].setAttribute('stroke-dashoffset', o);
      tr.els[1].setAttribute('stroke-dashoffset', o);
    }
  }
  ScrollTrigger.create({
    trigger: '#approach',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (s) => { nightOn = s.isActive; if (s.isActive) renderNight(gsap.ticker.time); },
    onUpdate: (s) => { nightScroll = s.progress; }
  });
  renderNight(0);
  ScrollTrigger.create({ trigger: '#approach', start: 'top 60%', endTrigger: '#model', end: 'bottom 40%', onToggle: (s) => s.isActive && setNav('approach') });

  /* ---------- operating model: the load travels the six steps ---------- */
  const stepsEl = $('#steps');
  const stepItems = $$('#steps li');
  const jLine = $('#journeyLine');
  const jBase = $('#jBase');
  const jFill = $('#jFill');
  const jTruck = $('#jTruck');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    let len = 1, xs = [], dots = [];
    const build = () => {
      const w = stepsEl.scrollWidth;
      jLine.setAttribute('width', w);
      jLine.setAttribute('viewBox', `0 0 ${w} 64`);
      jLine.style.width = `${w}px`;
      xs = stepItems.map((li) => li.offsetLeft + 8);
      const end = xs[xs.length - 1] + stepItems[0].offsetWidth * 0.7;
      const pts = xs.concat(end);
      let d = `M${xs[0]} 40`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dir = i % 2 ? -1 : 1;
        d += `C${a + (b - a) * 0.35} ${40 + dir * 16},${a + (b - a) * 0.65} ${40 - dir * 16},${b} 40`;
      }
      jBase.setAttribute('d', d);
      jFill.setAttribute('d', d);
      len = jFill.getTotalLength() || 1;
      jFill.style.strokeDasharray = `${len}`;
      dots.forEach((dt) => dt.remove());
      dots = xs.map((x) => svg('circle', { cx: x, cy: 40, r: 7, class: 'j-dot' }, jLine));
      jLine.appendChild(jTruck);
    };
    build();
    const shift = () => Math.max(0, stepsEl.scrollWidth - innerWidth);
    const tl = gsap.timeline({
      onUpdate: () => {
        const p = tl.progress();
        jFill.style.strokeDashoffset = `${len * (1 - p)}`;
        const pt = jFill.getPointAtLength(p * len);
        const pt2 = jFill.getPointAtLength(Math.min(len, p * len + 2));
        jTruck.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${deg(Math.atan2(pt2.y - pt.y, pt2.x - pt.x)).toFixed(1)})`);
        xs.forEach((x, i) => {
          const on = pt.x >= x - 2;
          stepItems[i].classList.toggle('is-on', on);
          dots[i].classList.toggle('is-on', on);
        });
      },
      scrollTrigger: {
        trigger: '#model',
        start: 'top top',
        end: () => '+=' + Math.round(shift() + innerHeight * 0.8),
        pin: '#modelPin',
        scrub: reduceMotion ? true : 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefreshInit: build
      }
    });
    tl.to([stepsEl, jLine], { x: () => -shift(), ease: 'none' });
    return () => { gsap.set([stepsEl, jLine], { clearProps: 'transform' }); };
  });
  mm.add('(max-width: 899px)', () => {
    const triggers = stepItems.map((li) => ScrollTrigger.create({
      trigger: li,
      start: 'top 78%',
      end: 'max',
      onToggle: (s) => li.classList.toggle('is-on', s.isActive)
    }));
    return () => triggers.forEach((t) => t.kill());
  });

  /* ---------- sea & air ---------- */
  const V = { t: 0 };
  const plane = $('#plane'), ship = $('#ship');
  const cloudsFar = $('#cloudsFar'), cloudsNear = $('#cloudsNear');
  const wavesFar = $('#wavesFar'), wavesNear = $('#wavesNear');
  const voyageSvg = $('#voyageSvg');
  function renderVoyage(time) {
    const t = V.t;
    const live = reduceMotion ? 0 : time;
    plane.setAttribute('transform', `translate(${lerp(-900, 1900, t).toFixed(1)} ${lerp(440, 286, t).toFixed(1)}) rotate(-4) scale(.62)`);
    ship.setAttribute('transform', `translate(${lerp(-860, 980, t).toFixed(1)} ${(712 + Math.sin(live * 1.1) * 2).toFixed(2)}) rotate(${(Math.sin(live * 0.8) * 0.35).toFixed(3)}) scale(.74)`);
    cloudsFar.setAttribute('transform', `translate(${(-280 * t - live * 5).toFixed(1)} 0)`);
    cloudsNear.setAttribute('transform', `translate(${(-1000 * t - live * 9).toFixed(1)} 0)`);
    wavesFar.setAttribute('transform', `translate(${(-(220 * t + live * 14) % voyage.waveFar).toFixed(1)} 0)`);
    wavesNear.setAttribute('transform', `translate(${(-(700 * t + live * 26) % voyage.waveNear).toFixed(1)} 0)`);
    for (const g of voyage.glints) g.el.setAttribute('opacity', (g.base * (0.35 + 0.65 * Math.abs(Math.sin(live * g.k + g.ph)))).toFixed(2));
    for (const b of voyage.birds) {
      const flap = 0.35 + 0.65 * Math.abs(Math.sin(live * 7 * b.s + b.ph));
      b.el.setAttribute('transform', `translate(${(b.x + t * 520 + live * 14).toFixed(1)} ${(b.y - t * 60 + Math.sin(live + b.ph) * 4).toFixed(1)}) scale(${b.s.toFixed(2)} ${(b.s * flap).toFixed(2)})`);
    }
    voyageSvg.style.transform = `scale(${(1.08 - t * 0.08).toFixed(4)})`;
  }
  gsap.to(V, {
    t: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '#voyageStage',
      start: 'top top',
      end: () => '+=' + Math.round(innerHeight * 2),
      pin: true,
      scrub: reduceMotion ? true : 0.6,
      anticipatePin: 1
    }
  });
  ScrollTrigger.create({
    trigger: '#sea-air',
    start: 'top bottom',
    end: () => '+=' + Math.round(innerHeight * 4.5),
    onToggle: (s) => { voyageOn = s.isActive; if (s.isActive) renderVoyage(gsap.ticker.time); }
  });
  renderVoyage(0);
  ScrollTrigger.create({ trigger: '#sea-air', start: 'top 60%', end: 'bottom 40%', onToggle: (s) => s.isActive && setNav('sea-air') });

  /* ---------- contact harbour and footer ---------- */
  gsap.fromTo('#harbourSvg', { yPercent: 14 }, {
    yPercent: 0,
    ease: 'none',
    scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });
  ScrollTrigger.create({ trigger: '#contact', start: 'top 60%', onToggle: (s) => s.isActive && setNav('') });
  gsap.from('#footerMark .fl, #footerMark .dot', {
    yPercent: 105,
    stagger: 0.04,
    ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top 98%', end: 'top 60%', scrub: true }
  });

  /* ---------- progress ring ---------- */
  const ring = $('#hudRing');
  const ringFill = $('#ringFill');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      ringFill.style.strokeDashoffset = (132 * (1 - self.progress)).toFixed(1);
      ring.classList.toggle('is-up', self.progress > 0.6);
    }
  });
  ring.addEventListener('click', () => scrollToY(0));

  /* ---------- in-page navigation ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target && !a.dataset.film) return;
    e.preventDefault();
    closeMenu();
    const y = a.dataset.film ? filmY(a.dataset.film) : target.getBoundingClientRect().top + scrollY;
    scrollToY(y);
  });

  /* ---------- intro ---------- */
  function splitWords(h) {
    const dot = h.querySelector('.dot');
    const words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach((w, i) => {
      const mask = document.createElement('span');
      mask.className = 'wm';
      const word = document.createElement('span');
      word.className = 'wd';
      word.textContent = w;
      if (i === words.length - 1 && dot) word.appendChild(dot);
      mask.appendChild(word);
      h.appendChild(mask);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
    return $$('.wd', h);
  }

  function intro() {
    const loader = $('#loader');
    const finish = () => {
      doc.classList.add('is-loaded');
      lenis && lenis.start();
      ScrollTrigger.refresh();
    };
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }));
    const ready = Promise.race([Promise.all([fontsReady, loaded]), new Promise((r) => setTimeout(r, 3500))]);

    if (reduceMotion) {
      ready.then(finish);
      return;
    }
    lenis && lenis.stop();
    const mark = $('.loader-mark .split');
    mark.innerHTML = [...mark.textContent].map((c) => `<span class="ch">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    const words = splitWords($('#heroTitle'));
    gsap.set(words, { yPercent: 110 });
    gsap.set(['#hero .eyebrow', '.hero-lede', '.hero-cta'], { y: 24, opacity: 0 });

    const count = { v: 0 };
    const countEl = $('#loaderCount');
    const bar = $('#loaderBar');
    const tl = gsap.timeline();
    tl.from('.loader-mark .ch', { yPercent: 105, opacity: 0, stagger: 0.035, duration: 0.8, ease: 'power3.out' })
      .from('.loader-mark .dot', { scale: 0, duration: 0.5, ease: 'back.out(3)' }, '-=0.35')
      .to(count, {
        v: 100,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          countEl.textContent = pad(Math.round(count.v), 3);
          bar.style.transform = `scaleX(${(count.v / 100).toFixed(3)})`;
        }
      }, 0.1);

    Promise.all([ready, tl.then()]).then(() => {
      gsap.timeline({ onComplete: finish })
        .to('.loader-inner', { y: -30, opacity: 0, duration: 0.45, ease: 'power2.in' })
        .to(loader, { yPercent: -100, duration: 0.95, ease: 'power4.inOut' }, 0.25)
        .to(words, { yPercent: 0, stagger: 0.06, duration: 1.1, ease: 'power4.out' }, 0.75)
        .to(['#hero .eyebrow', '.hero-lede', '.hero-cta'], { y: 0, opacity: 1, stagger: 0.08, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.95)
        .from(side, { y: 60, duration: 1.4, ease: 'power3.out', clearProps: 'transform' }, 0.6)
        .from(far, { y: 40, opacity: 0, duration: 1.6, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.5);
    });
  }

  intro();
})();
