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
    record: ['.#######....', '.#.....##...', '.#.....#.#..', '.#.....####.', '.#........#.', '.#.######.#.', '.#........#.', '.#.######.#.', '.#........#.', '.#.####...#.', '.#........#.', '.##########.'],
    check: ['############', '#..........#', '#..........#', '#..........#', '#.........##', '#........#.#', '#.......#..#', '#.#....#...#', '#..#..#....#', '#...##.....#', '#..........#', '############'],
    alert: ['.....##.....', '.....##.....', '....#..#....', '....#..#....', '...#.##.#...', '...#.##.#...', '..#..##..#..', '..#..##..#..', '.#........#.', '.#...##...#.', '#....##....#', '############'],
    clock: ['....####....', '..##....##..', '.#...#....#.', '.#...#....#.', '#....#.....#', '#....#.....#', '#....####..#', '#..........#', '.#........#.', '.#........#.', '..##....##..', '....####....'],
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

  /* ---------- sea & air: from the quay to open water, seen from above ---------- */
  // Everything is in metres. The ship, quay and cranes are vectors so they stay sharp from quay level
  // to open water; the plane is SVG rasterised once. Each frame composes them on one canvas with the
  // sea, the Kelvin ripples, the foam flowing back through the wake and the clouds.

  const toCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
  const rasterSvg = (markup, w, h) => new Promise((done) => {
    const img = new Image();
    img.onload = () => {
      const c = toCanvas(w, h);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      done(c);
    };
    img.onerror = () => done(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  });
  // a soft, tinted silhouette of a sprite, for cast shadows
  const shadowOf = (src, w, h, blur, colour) => {
    const c = toCanvas(w, h), g = c.getContext('2d');
    g.filter = `blur(${blur}px)`;
    g.drawImage(src, 0, 0, c.width, c.height);
    g.filter = 'none';
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = colour;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  };
  // draws fn at x, y and at its wrapped copies, so a texture tiles without seams
  const wrapped = (S, x, y, r, fn) => {
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      if (x + dx > -r && x + dx < S + r && y + dy > -r && y + dy < S + r) fn(x + dx, y + dy);
    }
  };

  // half the beam at y; the bow tapers from y 72 to the stem at y 130
  const hullHalf = (y) => (y <= 72 ? 22 : 22 * (1 - Math.pow(Math.min(1, (y - 72) / 58.5), 1.6)));

  // Path2D helpers in metres, and painted layers: a fill and/or a stroke over one combined path
  const pR = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
  const pC = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  const pE = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
  const pRR = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
  const layer = (fill, d, a = 1, stroke, lw) => ({ fill, path: new Path2D(d), a, stroke, lw });
  const paint = (g, layers) => {
    for (const l of layers) {
      g.globalAlpha = l.a;
      if (l.fill) { g.fillStyle = l.fill; g.fill(l.path); }
      if (l.stroke) { g.strokeStyle = l.stroke; g.lineWidth = l.lw; g.stroke(l.path); }
    }
    g.globalAlpha = 1;
  };
  const shade = (c, k) => rgb(mix(hex(c), k > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(k)));
  // a soft, tinted cast shadow of a Path2D, drawn at ppm pixels per metre over the box x0, y0, w, h
  const softShadow = (path, x0, y0, w, h, ppm, blur, colour) => {
    const a = toCanvas(w * ppm, h * ppm), g = a.getContext('2d');
    g.setTransform(ppm, 0, 0, ppm, -x0 * ppm, -y0 * ppm);
    g.fill(path);
    return shadowOf(a, a.width, a.height, blur, colour);
  };

  // the one slot left open for the box the crane brings aboard: hatch group 2, forward bay, row 10
  const SLOT = { x: 4.88, y: -24.9, w: 2.44, h: 12.3 };

  // container ship, bow down, 260 × 44 m: bridge and accommodation aft, seven hatch groups of two
  // 40 ft bays, sixteen rows across. Kept as vectors so it stays sharp from quay level to open water.
  function shipModel() {
    const R = rng(2207);
    const pal = ['#1f4aa8', '#c8322c', '#2f8f4e', '#e8e8e3', '#e08a2e', '#c23d86', '#d9b43c', '#86919b', '#203566', '#4a8fd6', '#e8e8e3', '#c8322c', '#1f4aa8', '#2f8f4e'];
    const pick = () => pal[Math.floor(R() * pal.length)];
    const RW = 2.44, ROWS = 16, X0 = -ROWS * RW / 2;
    const boxes = [];
    let hatch = '', seams = '', bridges = '', bridgeHi = '';
    for (let g = 0; g < 7; g++) {
      const y0 = -92 + g * 27.2, half = hullHalf(y0 + 25) - 1.4;
      bridges += pR(-20.8, y0 - 2.2, 41.6, 2.2);
      bridgeHi += pR(-20.8, y0 - 2.2, 41.6, 0.35);
      for (let r = 0; r < ROWS;) {
        const run = Math.min(ROWS - r, 1 + Math.floor(R() * 3));
        const empty = R() < 0.07, c1 = pick(), c2 = R() < 0.75 ? c1 : pick(), tone = (R() - 0.5) * 0.26;
        for (let k = 0; k < run; k++) {
          const x = X0 + (r + k) * RW;
          if (x < -half || x + RW > half) continue;
          seams += pR(x, y0, 0.16, 25);
          if (empty) { hatch += pR(x, y0, RW, 25); continue; }
          for (const b of [0, 1]) {
            const y = y0 + b * 12.7;
            if (g === 2 && r + k === 10 && b === 1) { hatch += pR(x, y, RW, 12.3); continue; }
            boxes.push({ x, y, w: RW, h: 12.3, fill: shade(b ? c2 : c1, tone) });
          }
        }
        r += run;
      }
    }
    const hull = 'M-20 -130Q-22 -130 -22 -127L-22 72C-22 101 -10 122 0 131C10 122 22 101 22 72L22 -127Q22 -130 20 -130Z';
    const deck = 'M-19.6 -128.8Q-21.2 -128.8 -21.2 -126.6L-21.2 72C-21.2 100.4 -9.6 120.8 0 129.6C9.6 120.8 21.2 100.4 21.2 72L21.2 -126.6Q21.2 -128.8 19.6 -128.8Z';
    return {
      boxes,
      hull: new Path2D(hull),
      deck: new Path2D(deck),
      under: [
        layer('#0c2034', hull),
        layer('#1c4c7c', deck),
        layer(null, deck, 1, '#5d8fbf', 0.3),
        layer('#2a5684', pR(-21.2, -95, 1.2, 168) + pR(20, -95, 1.2, 168)),
        layer('#33414f', bridges),
        layer('#8a99a8', bridgeHi),
        layer('#2b5f93', hatch)
      ],
      over: [
        layer('#000', seams, 0.45),
        // forecastle: breakwater, windlasses, chain, winches, bollards, foremast
        layer(null, 'M-19.5 100.5L0 105L19.5 100.5', 1, '#e4e9ee', 0.8),
        layer('#5c6a77', pRR(-8, 110, 4.2, 6, 1) + pRR(3.8, 110, 4.2, 6, 1)),
        layer(null, 'M-5.9 116L-9 121.5M5.9 116L9 121.5', 1, '#1b2229', 0.55),
        layer('#6f7f8e', pC(-12, 104.5, 1.6) + pC(12, 104.5, 1.6) + pC(-4, 122, 1.1) + pC(4, 122, 1.1) + pC(-13, -127.4, 1.4) + pC(13, -127.4, 1.4) + pC(-6, -128, 0.9) + pC(6, -128, 0.9)),
        layer('#d7dde3', pC(-16, 108, 0.55) + pC(16, 108, 0.55) + pC(-13, 116, 0.55) + pC(13, 116, 0.55)),
        layer('#f1f4f6', pC(0, 114, 1) + pC(0, 128.4, 0.55)),
        // accommodation, bridge wings, compass star on the roof, funnel, radar, lifeboats
        layer('#24598b', pRR(-14.5, -126, 29, 22, 1)),
        layer('#2f6aa3', pR(-12.6, -124.2, 25.2, 18.2)),
        layer('#7fb0dc', pR(-14.5, -126, 29, 0.5)),
        layer('#9fb1c2', pR(-11, -122, 3, 2) + pR(-11, -118.6, 3, 2) + pR(-11, -115.2, 3, 2)),
        layer('#fff', 'M0 -121.5L1.3 -117.3L5.5 -116L1.3 -114.7L0 -110.5L-1.3 -114.7L-5.5 -116L-1.3 -117.3Z'),
        layer(null, pC(0, -116, 3.2), 1, '#fff', 0.35),
        layer('#18212b', pRR(7.4, -125, 5.4, 7.4, 1.4)),
        layer('#1d4eff', pR(7.4, -122.2, 5.4, 1.4)),
        layer('#05070a', pE(9, -123.6, 0.8, 1.1) + pE(11.2, -123.6, 0.8, 1.1)),
        layer('#eef1f3', pRR(-22.6, -105.2, 45.2, 4.2, 0.4)),
        layer('#000', pR(-22.6, -101, 45.2, 0.9), 0.28),
        layer('#dfe4e9', pR(-7, -108.6, 14, 0.45) + pR(-4.5, -109.6, 3, 0.5) + pR(2, -109.4, 2.4, 0.4)),
        layer('#e2581c', pRR(-20.9, -124.4, 3.5, 11, 1.75) + pRR(17.8, -121, 2.8, 6, 1.4)),
        layer('#ff8a4a', pRR(-20.5, -123.4, 2.7, 9, 1.35))
      ]
    };
  }

  // the quay seen from above, in the moored ship's metres. Vizhinjam faces the Arabian Sea, so with
  // north up the land lies east of the ship: the port, cranes and yard are modelled with the land
  // towards −x and drawn mirrored, putting the quay face on x 25 with the yard behind it.
  const CRANE_Y = SLOT.y + SLOT.h / 2; // the working crane stands over the open slot
  const LANE_X = 45; // truck lane between the crane legs, in drawn (unmirrored) metres
  const PORT = { left: -700, top: -900, bottom: 220 };
  const YARD = { x: -250, y: PORT.top + 14, w: 168, h: 1120 - 28, ppm: 2 };
  function portModel() {
    const R = rng(515);
    const { left: X0, top: Y0, bottom: Y1 } = PORT, w = -25 - X0;
    let joints = '', fend = '', boll = '', lanes = '', roofs = '', ridges = '', caps = '', shed = '';
    for (let y = Y0; y < Y1; y += 10) joints += pR(X0, y, w, 0.12);
    for (let x = X0 + 5; x < -25; x += 10) joints += pR(x, Y0, 0.12, Y1 - Y0);
    for (let y = Y0 + 5; y < Y1 - 4; y += 15) { fend += pR(-25.3, y, 1.4, 3.2); boll += pC(-27, y + 1.6, 0.5); }
    for (let y = Y0; y < Y1; y += 9) lanes += pR(-40.1, y, 0.2, 4.5) + pR(-50.1, y, 0.2, 4.5) + pR(-68.1, y, 0.2, 4.5);
    // warehouses and the port road beyond the yard
    for (let y = Y0 + 30; y < Y1 - 60; y += 150) {
      const h = 90 + R() * 40;
      roofs += pR(-470, y, 120, h) + pR(-640, y + 20, 140, h - 20);
      for (let x = -466; x < -350; x += 6) ridges += pR(x, y, 0.6, h);
      for (let x = -636; x < -500; x += 6) ridges += pR(x, y + 20, 0.6, h - 20);
      caps += pR(-410, y, 1.6, h) + pR(-570, y + 20, 1.6, h - 20);
      shed += pR(-473, y + 3, 123, 3) + pR(-643, y + 23, 143, 3);
    }
    // the yard: blocks of containers seven rows wide, kept as data for close views and drawn once
    // into a raster for distant ones
    const pal = ['#1f4aa8', '#c8322c', '#2f8f4e', '#e8e8e3', '#e08a2e', '#86919b', '#203566', '#4a8fd6'];
    const yard = [];
    for (let k = 0; k < 4; k++) {
      const bx = -104 - k * 46;
      for (let y = YARD.y; y < YARD.y + YARD.h - 12; y += 14.2) {
        for (let row = 0; row < 7; row++) {
          if (R() < 0.12) continue;
          yard.push({ x: bx + row * 2.9, y, w: 2.44, h: 12.2, fill: shade(pal[Math.floor(R() * pal.length)], (R() - 0.5) * 0.24) });
        }
      }
    }
    const raster = toCanvas(YARD.w * YARD.ppm, YARD.h * YARD.ppm), rg = raster.getContext('2d');
    rg.setTransform(YARD.ppm, 0, 0, YARD.ppm, -YARD.x * YARD.ppm, -YARD.y * YARD.ppm);
    for (const b of yard) { rg.fillStyle = b.fill; rg.fillRect(b.x, b.y, b.w, b.h); }
    return {
      yard,
      near: yard.filter((b) => Math.abs(b.y - CRANE_Y) < 260),
      raster,
      ground: [
        layer('#a3a59f', pR(X0, Y0, w, Y1 - Y0)),
        layer('#000', joints, 0.06),
        layer('#2c2e31', pR(-330, Y0, 22, Y1 - Y0)),
        layer('#e8e6dc', pR(-319.15, Y0, 0.3, Y1 - Y0), 0.6),
        layer('#000', shed, 0.28),
        layer('#b9bdb8', roofs),
        layer('#000', ridges, 0.16),
        layer('#e6e8e4', caps),
        layer('#4f5452', pR(-26, Y0, 1, Y1 - Y0)),
        layer('#d9b43c', pR(-28.6, Y0, 0.3, Y1 - Y0)),
        layer('#5a5d60', pR(-30.2, Y0, 0.4, Y1 - Y0) + pR(-60.2, Y0, 0.4, Y1 - Y0)),
        layer('#f2f2ee', lanes, 0.7),
        layer('#141516', fend),
        layer('#2a2c2f', boll)
      ]
    };
  }

  // ship-to-shore crane from above: legs on the rails, portal beams, the boom out over the water
  // with its machinery house and A-frame. Idle cranes keep the boom raised, so it reads short.
  function craneModel(yc, working) {
    const end = working ? 32 : -22;
    const girders = pR(-80, yc - 3.4, end + 80, 1.1) + pR(-80, yc + 2.3, end + 80, 1.1);
    let brace = '';
    for (let x = -78; x < end - 3; x += 4) brace += `M${x} ${yc - 2.3}L${x + 4} ${yc + 2.3}`;
    const legs = pR(-32, yc - 10, 3, 3) + pR(-32, yc + 7, 3, 3) + pR(-62, yc - 10, 3, 3) + pR(-62, yc + 7, 3, 3);
    const portal = pR(-61, yc - 9.2, 31, 1.2) + pR(-61, yc + 8, 31, 1.2) + pR(-31.5, yc - 8.5, 2, 17) + pR(-61.5, yc - 8.5, 2, 17);
    const house = pR(-77, yc - 4.6, 13, 9.2);
    return {
      shadow: new Path2D(girders + legs + portal + house),
      layers: [
        layer('#c3ccd5', portal),
        layer('#e9edf1', legs),
        layer('#eef1f4', girders + pR(end - 1.5, yc - 3.4, 1.5, 6.8)),
        layer(null, brace, 0.8, '#a9b3bd', 0.18),
        layer('#f6f8fa', house),
        layer('#1d4eff', pR(-77, yc - 4.6, 13, 0.9)),
        layer('#dfe4ea', pR(-49, yc - 3.6, 5, 7.2)),
        layer(null, `M-46.5 ${yc - 2.6}L-79 ${yc - 2.8}M-46.5 ${yc + 2.6}L-79 ${yc + 2.8}M-44 ${yc - 2.6}L${end} ${yc - 2.8}M-44 ${yc + 2.6}L${end} ${yc + 2.8}`, 0.55, '#7f8a95', 0.12)
      ]
    };
  }

  // paints the ship in its own metres; inView (when given) culls boxes off screen and adds the
  // corrugated roofs that only show close up. The CNIQ box is aboard unless the crane still has it.
  function drawShipVector(g, S, inView) {
    paint(g, S.under);
    for (const b of S.boxes) {
      if (inView && !inView(b)) continue;
      g.fillStyle = b.fill;
      g.fillRect(b.x, b.y, b.w, b.h);
      if (inView) { g.fillStyle = SEA.ribPat; g.fillRect(b.x, b.y, b.w, b.h); }
    }
    if (!inView || O.rel > 0) drawBox(g, SLOT.x, SLOT.y, inView && SEA.ribPat);
    paint(g, S.over);
    g.save();
    g.clip(S.deck);
    g.fillStyle = SEA.sun;
    g.fillRect(-22, -131, 44, 262);
    g.restore();
  }

  // the CNIQ box seen from above: white roof, cobalt band and wordmark, corner castings
  function drawBox(g, x, y, ribs) {
    g.fillStyle = '#eceef0';
    g.fillRect(x, y, 2.44, 12.3);
    if (ribs) { g.fillStyle = ribs; g.fillRect(x, y, 2.44, 12.3); }
    g.fillStyle = '#1d4eff';
    g.fillRect(x, y + 11.2, 2.44, 0.8);
    g.fillStyle = '#3a3e44';
    for (const [cx, cy] of [[0, 0], [2.04, 0], [0, 11.9], [2.04, 11.9]]) g.fillRect(x + cx, y + cy, 0.4, 0.4);
    g.save();
    g.translate(x + 1.22, y + 5.6);
    g.rotate(-Math.PI / 2);
    g.font = '800 1.2px Archivo, "Arial Black", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#15171c';
    g.fillText('CNIQ INDIA', 0, 0);
    g.restore();
  }

  // tractor and skeletal trailer from above, cab towards +y
  function drawTruck(g, x, yc) {
    g.globalAlpha = 0.25;
    g.fillStyle = '#000';
    g.fillRect(x - 1 + 1.2, yc - 6.6 + 0.9, 2.4, 18.2);
    g.globalAlpha = 1;
    g.fillStyle = '#1a1c20';
    g.fillRect(x - 1.05, yc - 6.6, 0.35, 13.6);
    g.fillRect(x + 0.7, yc - 6.6, 0.35, 13.6);
    for (const ay of [-6.1, -4.8, -3.5]) g.fillRect(x - 1.3, yc + ay, 2.6, 0.55);
    g.fillRect(x - 1.05, yc + 6.4, 2.1, 4.8);
    g.fill(new Path2D(pRR(x - 1.3, yc + 9.4, 2.6, 2.4, 0.3)));
    g.fillStyle = '#3d434b';
    g.fillRect(x - 1.15, yc + 11.35, 2.3, 0.3);
    g.fillStyle = '#f4ecc8';
    g.fillRect(x - 0.9, yc + 9.55, 1.8, 0.14);
    g.fillStyle = '#121316';
    g.fillRect(x - 1.6, yc + 10.4, 0.3, 0.6);
    g.fillRect(x + 1.3, yc + 10.4, 0.3, 0.6);
  }

  // a cumulus seen from above: lobes of densely packed puffs, each with a shaded crease below it,
  // so the mass has firm, lumpy edges and depth between the billows
  function cloudSprite(seed) {
    const W = 1024, H = 672, c = toCanvas(W, H), g = c.getContext('2d'), R = rng(seed);
    const puff = (x, y, r, stops) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      for (const [o, col] of stops) rg.addColorStop(o, col);
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const gauss = () => (R() + R() + R() - 1.5) / 1.5;
    const lobes = [];
    for (let i = 0; i < 6; i++) lobes.push([W * (0.3 + R() * 0.4), H * (0.3 + R() * 0.4), 0.6 + R() * 0.5]);
    const tops = [];
    for (let i = 0; i < 240; i++) {
      const [lx, ly, ls] = lobes[i % lobes.length];
      const x = lx + gauss() * W * 0.16 * ls, y = ly + gauss() * H * 0.16 * ls;
      const edge = Math.hypot((x - W / 2) / (W * 0.4), (y - H / 2) / (H * 0.4));
      if (edge > 1) continue;
      tops.push([x, y, (20 + R() * 46) * (1.3 - edge * 0.6)]);
    }
    // each puff throws its shadow down-right onto the ones drawn before it, which opens up creases
    for (const [x, y, r] of tops) {
      puff(x + r * 0.3, y + r * 0.38, r * 1.08, [[0, 'rgba(120,136,168,.34)'], [0.7, 'rgba(120,136,168,.13)'], [1, 'rgba(120,136,168,0)']]);
      puff(x, y, r, [[0, 'rgba(255,255,255,.95)'], [0.6, 'rgba(247,250,254,.82)'], [0.86, 'rgba(236,241,249,.3)'], [1, 'rgba(236,241,249,0)']]);
    }
    return c;
  }

  // four-engine freighter, nose up, 70 m long and 64 m across, in plain white with a gold cheatline
  function planeMarkup(w, h) {
    const LE = (x) => -8 + (Math.abs(x) - 3.2) * 0.846;
    let engines = '', fairings = '';
    for (const x of [-21, -11.8, 11.8, 21]) {
      const e = LE(x);
      // pylon over the wing, core and exhaust plug, then the fan cowl with its polished inlet lip
      engines += `<rect x="${x - 0.35}" y="${(e - 1).toFixed(2)}" width=".7" height="4.2" fill="#d0d4d8"/>`
        + `<rect x="${x - 0.95}" y="${(e - 2).toFixed(2)}" width="1.9" height="3.8" rx=".8" fill="url(#core)"/>`
        + `<ellipse cx="${x}" cy="${(e + 1.95).toFixed(2)}" rx=".42" ry=".62" fill="#7d848b"/>`
        + `<rect x="${x - 1.45}" y="${(e - 6.6).toFixed(2)}" width="2.9" height="5.4" rx="1.2" fill="url(#nac)"/>`
        + `<rect x="${x - 1.3}" y="${(e - 6.55).toFixed(2)}" width="2.6" height=".5" rx=".25" fill="#f7f8f9"/>`
        + `<rect x="${x - 1.3}" y="${(e - 6.05).toFixed(2)}" width="2.6" height=".1" fill="#9aa1a8"/>`;
    }
    for (const x of [6.5, 10, 14.5, 18.5, 23, 27]) {
      const y = x < 12 ? 10.2 + (x - 3.2) * 0.045 : 10.6 + (x - 12) * 0.436;
      for (const sx of [-1, 1]) fairings += `<ellipse cx="${sx * x}" cy="${(y + 0.6).toFixed(2)}" rx=".42" ry="1.5" fill="#d3d7db"/>`;
    }
    const wing = (sx) => `M${sx * 3.2} -8L${sx * 31.8} 16.2L${sx * 32.2} 19.4L${sx * 12} 10.6L${sx * 3.2} 10.2Z`;
    const flap = (sx) => `M${sx * 3.2} 7.8L${sx * 12} 8.4L${sx * 31.6} 17.6L${sx * 32.2} 19.4L${sx * 12} 10.6L${sx * 3.2} 10.2Z`;
    const tail = (sx) => `M${sx * 1.6} 23L${sx * 11} 30.2L${sx * 11.2} 32.6L${sx * 1.6} 30.4Z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-33 -36 66 72">
<defs>
<linearGradient id="fus" x1="0" x2="1"><stop offset="0" stop-color="#b9bfc5"/><stop offset=".16" stop-color="#e9ecee"/><stop offset=".42" stop-color="#fff"/><stop offset=".8" stop-color="#e6e9ec"/><stop offset="1" stop-color="#aab1b8"/></linearGradient>
<linearGradient id="wng" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f8f9"/><stop offset="1" stop-color="#dde1e4"/></linearGradient>
<linearGradient id="nac" x1="0" x2="1"><stop offset="0" stop-color="#b3b9bf"/><stop offset=".4" stop-color="#f6f7f8"/><stop offset="1" stop-color="#a7aeb5"/></linearGradient>
<linearGradient id="core" x1="0" x2="1"><stop offset="0" stop-color="#8f969d"/><stop offset=".45" stop-color="#d9dde1"/><stop offset="1" stop-color="#8a9198"/></linearGradient>
<linearGradient id="span" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".06"/></linearGradient>
</defs>
<ellipse cx="0" cy="1.5" rx="4.4" ry="11.5" fill="#e4e7ea"/>
<path d="${wing(-1)}" fill="url(#wng)"/><path d="${wing(1)}" fill="url(#wng)"/>
<path d="${flap(-1)}" fill="#d6dadf"/><path d="${flap(1)}" fill="#d6dadf"/>
<path d="${wing(-1)}" fill="url(#span)"/><path d="${wing(1)}" fill="url(#span)"/>
<path d="M-3.2 -8L-31.8 16.2M3.2 -8L31.8 16.2" stroke="#fff" stroke-width=".35"/>
<path d="M-4 -6.6L-31.4 16.6M4 -6.6L31.4 16.6" stroke="#c9ced3" stroke-width=".1"/>
<path d="M-12 7.4L-28 14.4M12 7.4L28 14.4M-15 8.7V9.9M15 8.7V9.9M-19 10.4V11.7M19 10.4V11.7M-23 12.2V13.4M23 12.2V13.4" stroke="#bfc5ca" stroke-width=".1"/>
<path d="M-12 8.4V10.6M12 8.4V10.6M-22 12.9V15M22 12.9V15" stroke="#b7bdc3" stroke-width=".12"/>
${fairings}${engines}
<path d="${tail(-1)}" fill="url(#wng)"/><path d="${tail(1)}" fill="url(#wng)"/>
<path d="M0 -35.6C2.2 -35.6 3.3 -32 3.3 -27L3.3 24C3.3 29 1.8 33.6 0 35.7C-1.8 33.6 -3.3 29 -3.3 24L-3.3 -27C-3.3 -32 -2.2 -35.6 0 -35.6Z" fill="url(#fus)"/>
<path d="M-2.95 -29V25M2.95 -29V25" stroke="#e2b100" stroke-width=".22"/>
<path d="M0 -34V30" stroke="#fff" stroke-width=".6" opacity=".7"/>
<path d="M-1.5 -31.4Q0 -32.7 1.5 -31.4L1.25 -30.6Q0 -31.6 -1.25 -30.6Z" fill="#1d2833"/>
<path d="M-3.3 -20H3.3M-3.3 -8H3.3M-3.3 8H3.3M-3.3 20H3.3" stroke="#000" stroke-opacity=".08" stroke-width=".1"/>
<rect x="-.38" y="22" width=".76" height="13.2" rx=".38" fill="#e7eaec"/>
<rect x="-.2" y="22.6" width=".4" height="12" fill="#1d4eff"/>
<circle cx="-31.9" cy="17.6" r=".35" fill="#ff3b30"/><circle cx="31.9" cy="17.6" r=".35" fill="#2fd16a"/>
</svg>`;
  }

  // open-ocean wind waves: soft swell patches, short crests with a dark trough beside each, a few sparkles.
  // 1024 px tile; two texels per CSS pixel at the opening zoom.
  function seaTexture() {
    const S = 1024, c = toCanvas(S, S), g = c.getContext('2d'), R = rng(77);
    for (let i = 0; i < 46; i++) {
      const x = R() * S, y = R() * S, r = 90 + R() * 220, light = R() < 0.5;
      wrapped(S, x, y, r, (px, py) => {
        const rg = g.createRadialGradient(px, py, 0, px, py, r);
        rg.addColorStop(0, light ? 'rgba(70,130,220,.1)' : 'rgba(0,6,24,.13)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg;
        g.fillRect(px - r, py - r, r * 2, r * 2);
      });
    }
    g.lineCap = 'round';
    for (let i = 0; i < 3400; i++) {
      const x = R() * S, y = R() * S, len = 5 + R() * R() * 34, a = -0.42 + (R() - 0.5) * 0.7;
      const bend = (R() - 0.5) * len * 0.5, op = 0.05 + R() * R() * 0.32, lw = 1 + R() * 1.4;
      const ca = Math.cos(a), sa = Math.sin(a);
      wrapped(S, x, y, len, (px, py) => {
        const x0 = px - ca * len / 2, y0 = py - sa * len / 2, x1 = px + ca * len / 2, y1 = py + sa * len / 2;
        const qx = px - sa * bend, qy = py + ca * bend;
        g.lineWidth = lw * 1.3;
        g.strokeStyle = `rgba(0,8,30,${(op * 0.75).toFixed(3)})`;
        g.beginPath(); g.moveTo(x0 - sa * 1.8, y0 + ca * 1.8); g.quadraticCurveTo(qx - sa * 1.8, qy + ca * 1.8, x1 - sa * 1.8, y1 + ca * 1.8); g.stroke();
        g.lineWidth = lw;
        g.strokeStyle = `rgba(175,210,255,${op.toFixed(3)})`;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(qx, qy, x1, y1); g.stroke();
      });
    }
    for (let i = 0; i < 260; i++) {
      const x = R() * S, y = R() * S, r = 0.6 + R() * 0.8, op = 0.2 + R() * 0.4;
      wrapped(S, x, y, r, (px, py) => {
        g.fillStyle = `rgba(230,240,255,${op.toFixed(2)})`;
        g.beginPath(); g.arc(px, py, r, 0, 6.283); g.fill();
      });
    }
    return c;
  }

  // churned foam, streaked along the ship's track: a 256 px tile at 2 px per metre
  function foamTexture() {
    const S = 256, c = toCanvas(S, S), g = c.getContext('2d'), R = rng(31);
    g.fillStyle = 'rgba(235,244,255,.32)';
    g.fillRect(0, 0, S, S);
    const gauss = () => (R() + R() + R() - 1.5) / 1.5;
    for (let k = 0; k < 70; k++) {
      const cx = R() * S, cy = R() * S, n = 8 + Math.floor(R() * 26);
      for (let i = 0; i < n; i++) {
        const x = cx + gauss() * 12, y = cy + gauss() * 30, rx = 0.6 + R() * 2, ry = 1.2 + R() * 5.5, op = 0.3 + R() * 0.7;
        wrapped(S, x, y, ry, (px, py) => {
          g.fillStyle = `rgba(255,255,255,${op.toFixed(2)})`;
          g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, 6.283); g.fill();
        });
      }
    }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) {
      const x = R() * S, y = R() * S, r = 4 + R() * 10;
      wrapped(S, x, y, r * 2.5, (px, py) => {
        g.fillStyle = 'rgba(0,0,0,.5)';
        g.beginPath(); g.ellipse(px, py, r, r * 2.5, 0, 0, 6.283); g.fill();
      });
    }
    return c;
  }

  // the wake, in ship metres at 2 px per metre: x −100…100, y −560 (astern) … 150 (ahead of the bow)
  const WAKE = { x: -100, y: -560, w: 200, h: 710 };
  const wakePx = (x, y) => [(x - WAKE.x) * 2, (y - WAKE.y) * 2];

  // where foam can be: along the hull from the bow, two arms that diverge astern, the propeller wash
  function wakeMask() {
    const c = toCanvas(WAKE.w * 2, WAKE.h * 2), g = c.getContext('2d');
    const blob = (x, y, r, a) => {
      const [px, py] = wakePx(x, y), rr = r * 2;
      const rg = g.createRadialGradient(px, py, 0, px, py, rr);
      rg.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    };
    for (const side of [-1, 1]) {
      for (let y = 128; y > -128; y -= 1.5) blob(side * (hullHalf(y) + 1.6), y, 3 + (128 - y) * 0.008, y > 110 ? 0.7 : 0.5);
      for (let d = 0; d < 440; d += 1.5) blob(side * (24 + d * 0.085), -128 - d, 4.5 + d * 0.06, 0.8 * Math.exp(-d / 620));
    }
    for (let d = 0; d < 430; d += 1.5) blob(Math.sin(d * 0.03) * 1.5, -126 - d, 9 + d * 0.045, 0.5 * Math.exp(-d / 320));
    for (let a = -1; a <= 1; a += 0.05) blob(a * 8, 130.5 - Math.abs(a) * 9, 2.2, 0.5);
    return c;
  }

  // Kelvin wave pattern, fixed to the ship: curved transverse crests across the track and short
  // divergent crests feathering out from the cusp lines either side
  function kelvinRipples() {
    const c = toCanvas(WAKE.w * 2, WAKE.h * 2), g = c.getContext('2d');
    g.lineCap = 'round';
    for (let d = 16; d < 430; d += 15) {
      const f = Math.exp(-d / 420), cusp = 24 + d * 0.354, y = -128 - d;
      g.strokeStyle = `rgba(185,215,255,${(0.12 * f).toFixed(3)})`;
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(...wakePx(-cusp * 0.85, y + cusp * 0.1));
      g.quadraticCurveTo(...wakePx(0, y - cusp * 0.06), ...wakePx(cusp * 0.85, y + cusp * 0.1));
      g.stroke();
      g.strokeStyle = `rgba(185,215,255,${(0.17 * f).toFixed(3)})`;
      g.lineWidth = 2.6;
      for (const side of [-1, 1]) {
        const len = 8 + d * 0.16;
        g.beginPath();
        g.moveTo(...wakePx(side * cusp, y));
        g.lineTo(...wakePx(side * (cusp + len * 0.57), y - len * 0.82));
        g.stroke();
      }
    }
    return c;
  }

  // the breakwater west of the berth, as a raster at 3 px per metre: surf along the seaward toe,
  // concrete armour units, a wave wall and crest road, rock on the harbour side, a light on the head
  const BW = { x: -206, y: -600, w: 62, h: 752, ppm: 3, head: 120 };
  function breakwater() {
    const R = rng(908), c = toCanvas(BW.w * BW.ppm, BW.h * BW.ppm), g = c.getContext('2d');
    g.setTransform(BW.ppm, 0, 0, BW.ppm, -BW.x * BW.ppm, -BW.y * BW.ppm);
    const gauss = () => (R() + R() + R() - 1.5) / 1.5;
    // the mound d metres in from its toe: straight along x −192 … −150, closed by a round head
    const mound = (d) => new Path2D(`M${-192 + d} ${BW.y}V${BW.head}A${21 - d} ${21 - d} 0 0 0 ${-150 - d} ${BW.head}V${BW.y}Z`);
    // a point d metres seaward of the toe: u 0…0.8 runs down the seaward face, 0.8…1 round the head
    const toe = (u, d) => {
      if (u < 0.8) return [-192 - d, BW.y + (BW.head - BW.y) * u / 0.8];
      const a = Math.PI * (1 - (u - 0.8) / 0.2 * 0.85);
      return [-171 + Math.cos(a) * (21 + d), BW.head + Math.sin(a) * (21 + d)];
    };
    g.filter = `blur(${BW.ppm * 3}px)`;
    g.fillStyle = 'rgba(232,244,255,.4)';
    g.fill(mound(-5));
    g.filter = 'none';
    for (let i = 0; i < 3200; i++) {
      const [x, y] = toe(R(), Math.abs(gauss()) * 8);
      g.fillStyle = `rgba(255,255,255,${(0.2 + R() * 0.55).toFixed(2)})`;
      g.beginPath(); g.ellipse(x, y, 0.4 + R() * 1.2, 0.8 + R() * 2.2, 0, 0, 6.283); g.fill();
    }
    g.fillStyle = '#7f7b73';
    g.fill(mound(0));
    // rock on the harbour side, then the crest road and the wave wall that shelters it
    g.fillStyle = '#77716a';
    g.fillRect(-163, BW.y, 13, BW.head - BW.y);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = R() < 0.5 ? '#958f84' : '#5e5951';
      g.beginPath(); g.arc(-162.6 + R() * 12.2, BW.y + R() * (BW.head - BW.y), 0.35 + R() * 0.7, 0, 6.283); g.fill();
    }
    g.fillStyle = '#a8a49b';
    g.fillRect(-174.6, BW.y, 11.6, BW.head - BW.y);
    g.beginPath(); g.arc(-171, BW.head, 9, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)';
    for (let y = BW.y + 6; y < BW.head - 6; y += 12) g.fillRect(-174.6, y, 11.6, 0.15);
    g.fillStyle = '#e3e0d7';
    g.fillRect(-177, BW.y, 2.4, BW.head - BW.y - 4);
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.fillRect(-174.6, BW.y, 1, BW.head - BW.y - 4);
    // armour units: interlocking concrete blocks, each lit from the upper left
    const unit = (x, y) => {
      const rot = R() * 3.14, rx = 0.9 + R() * 0.35, ry = 0.8 + R() * 0.3, t = (R() - 0.5) * 0.14;
      g.fillStyle = '#4f4c46';
      g.beginPath(); g.ellipse(x + 0.35, y + 0.35, rx, ry, rot, 0, 6.283); g.fill();
      g.fillStyle = shade('#cbc8bf', t);
      g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 6.283); g.fill();
    };
    for (let y = BW.y; y < BW.head; y += 2.3) for (let x = -191; x < -177.5; x += 2.3) unit(x + gauss() * 0.4, y + gauss() * 0.4);
    for (let r = 8.5; r < 21; r += 2.3) {
      const n = Math.ceil(Math.PI * r / 2.3);
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (1 - i / n);
        unit(-171 + Math.cos(a) * r + gauss() * 0.4, BW.head + Math.sin(a) * r + gauss() * 0.4);
      }
    }
    // the head light: a white tower, red for the port hand of the entrance
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.arc(-170, BW.head + 2.8, 1.6, 0, 6.283); g.fill();
    g.fillStyle = '#f2f2ee';
    g.beginPath(); g.arc(-171, BW.head + 2, 1.6, 0, 6.283); g.fill();
    g.fillStyle = '#e5322b';
    g.beginPath(); g.arc(-171, BW.head + 2, 0.8, 0, 6.283); g.fill();
    return c;
  }

  // coconut palms from above, a 256 px tile at 2 px per metre: crowns lit from the upper left
  function palmTexture() {
    const S = 256, c = toCanvas(S, S), g = c.getContext('2d'), R = rng(404);
    g.fillStyle = '#2b4725';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 560; i++) {
      const x = R() * S, y = R() * S, r = 4 + R() * 7, light = R() < 0.5;
      wrapped(S, x, y, r * 1.4, (px, py) => {
        g.fillStyle = 'rgba(8,20,6,.42)';
        g.beginPath(); g.arc(px + r * 0.35, py + r * 0.35, r, 0, 6.283); g.fill();
        const rg = g.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r);
        rg.addColorStop(0, light ? '#76a04c' : '#5f8b3f');
        rg.addColorStop(1, light ? '#2f5527' : '#274821');
        g.fillStyle = rg;
        g.beginPath(); g.arc(px, py, r, 0, 6.283); g.fill();
      });
    }
    return c;
  }

  // the Kerala coast south of the port, in drawn metres: the shore runs south-east from the port's
  // corner, with a beach, surf, coconut palms and village roofs inland, and the road out of the port
  function coastModel(palms) {
    const R = rng(613);
    const shore = (y) => 25 + 0.86 * (y - 220) + clamp((y - 220) / 80, 0, 1) * (6 * Math.sin(y * 0.021) + 3 * Math.sin(y * 0.067));
    const roadX = (y) => Math.max(319, shore(y) + 180);
    const ys = [];
    for (let y = 220; y <= 4400; y += 20) ys.push(y);
    const along = (fx) => ys.map((y) => `L${fx(y).toFixed(1)} ${y}`).join('');
    const land = (d) => `M${25 + d} -1200` + along((y) => shore(y) + d) + 'L7000 4400V-1200Z';
    const roofs = ['', '', '', ''];
    let shadows = '';
    for (let i = 0; i < 420; i++) {
      const y = 240 + Math.pow(R(), 1.3) * 2600, x = shore(y) + 40 + Math.pow(R(), 1.6) * 360;
      const w = 6 + R() * 6, h = 7 + R() * 7, k = Math.floor(R() * 4);
      if (Math.abs(x + w / 2 - roadX(y)) < 10 + w / 2) continue;
      roofs[k] += pR(x, y, w, h);
      shadows += pR(x + 0.9, y + 0.9, w, h);
    }
    const road = 'M319 220' + along(roadX);
    return [
      layer('#d9c9a1', land(0)),
      layer(palms, land(24)),
      layer('#000', shadows, 0.3),
      layer('#b4573a', roofs[0]),
      layer('#9c4a31', roofs[1]),
      layer('#cdc9bf', roofs[2]),
      layer('#6b8fb8', roofs[3]),
      layer(null, road, 1, '#3a3b3d', 12),
      layer(null, road, 0.5, '#e8e6dc', 0.3),
      layer(null, 'M25 220' + along((y) => shore(y) - 6), 0.28, '#f4f8ff', 1.6),
      layer(null, 'M25 220' + along(shore), 0.6, '#f4f8ff', 2.6)
    ];
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
  let oceanOn = false;
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
    // the scrub can land after a long jump has already left the film; the section's own trigger owns the nav then
    if (doc.classList.contains('in-film')) setNav(num === '01' ? 'lift' : num === '02' ? 'run' : 'aerial');
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
      onToggle: (self) => {
        doc.classList.toggle('in-film', self.isActive);
        if (self.isActive) statusIdx = -1; // re-sync the HUD and nav on the way back in
      }
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
    if (oceanOn && (oDirty || !reduceMotion)) { drawOcean(time); oDirty = false; }
  });

  /* ---------- sea & air: from the quay to open water, seen from above ---------- */
  const oStage = $('#oceanStage');
  const oCanvas = $('#oceanCanvas');
  const oc = oCanvas.getContext('2d');
  const oHead = $('#oceanHead');
  const oList = $('#oceanPoints');
  const oFade = $('#oceanFade');
  const oItems = $$('#oceanPoints li');
  // head: title out · grab, lift, trav, rel: the crane takes the box off the truck and sets it in the
  // open slot · truck: the truck leaves · jolt: the box lands · lines: mooring lines · dep: the ship
  // casts off · cam: quay framing → following the ship · wake · run: distance sailed with the scroll
  // · cl, cla: clouds crossing · pp: the plane's pass · z, sy: zoom and the ship's height in frame
  // · list: the points · out: fade into the next section · lab, map, air: the place names
  const O = {
    head: 0, grab: 0, lift: 0, trav: 0, rel: 0, truck: 0, jolt: 0, lines: 1,
    dep: 0, cam: 0, wake: 0, run: 0, cl: 0, cla: 0, pp: 0, z: 1, sy: 0.6, list: 0, out: 0,
    lab: 0, map: 0, air: 0
  };
  // Vizhinjam International Seaport, 8°22′21″N 76°59′55″E; Thiruvananthapuram International Airport
  // lies about 15 km to its north-west, so the plane holds that heading (north is up)
  const PLACE = {
    port: ['VIZHINJAM INTERNATIONAL SEAPORT', 'THIRUVANANTHAPURAM, KERALA', '8.3725° N   76.9986° E'],
    pin: ['VIZHINJAM PORT', 'KERALA, INDIA'],
    air: ['AIR LEG · TRV', 'THIRUVANANTHAPURAM INTERNATIONAL AIRPORT', '15 KM NORTH-WEST OF THE PORT']
  };
  const HEADING = -0.7;
  const MONO = '"Martian Mono", ui-monospace, monospace';
  const OL = {};
  const SEA = { ready: false };
  const CLOUDS = [
    { i: 0, x: 0.18, y: 0.22, s: 0.95, v: 1, a: 0.95 },
    { i: 1, x: 0.78, y: 0.5, s: 1.15, v: 1.3, a: 0.92 },
    { i: 2, x: 0.32, y: 0.82, s: 0.85, v: 0.85, a: 0.88 },
    { i: 0, x: 0.95, y: 0.12, s: 0.7, v: 1.15, a: 0.8 },
    { i: 1, x: -0.12, y: 0.62, s: 0.9, v: 1.2, a: 0.9 }
  ];
  let oDirty = true, sailed = 0, lastT = 0;

  // icon dots light up from the top-left corner
  oItems.forEach((li) => $$('circle', li).forEach((c) => {
    c.style.transitionDelay = `${Math.round((+c.getAttribute('cx') + +c.getAttribute('cy')) * 22)}ms`;
  }));

  function measureOcean() {
    OL.W = oStage.clientWidth;
    OL.H = oStage.clientHeight;
    OL.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    oCanvas.width = Math.round(OL.W * OL.dpr);
    oCanvas.height = Math.round(OL.H * OL.dpr);
    OL.s0 = (OL.H * 0.3) / 260; // px per metre at sea: the ship fills 30% of the frame
    // at the quay the frame spans the truck lane to the open slot; phones see a tighter window
    const narrow = OL.W / OL.H < 0.9;
    OL.sPort = Math.min(OL.W / (narrow ? 56 : 92), OL.H / 56);
    OL.portX = narrow ? 26 : 24;
    OL.fs = OL.W < 600 ? 10.5 : 12;
    OL.padX = parseFloat(getComputedStyle(oHead).paddingLeft) || 20;
    OL.top = ($('.site-header')?.offsetHeight || 68) + 22;
    OL.Lp = OL.H * 0.98; // the plane, far nearer the camera than the sea
    const cx = OL.W / 2, cy = OL.H * 0.35;
    const g = oc.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(OL.W, OL.H) * 0.72);
    g.addColorStop(0, '#13438f');
    g.addColorStop(0.45, '#0b2c68');
    g.addColorStop(1, '#04122f');
    OL.grad = g;
    OL.listH = oList.offsetHeight;
    OL.items = oItems.map((li) => ({ li, mid: li.offsetTop + li.offsetHeight / 2, on: null, a: -1 }));
    oDirty = true;
  }

  async function buildSea() {
    SEA.seaPat = oc.createPattern(seaTexture(), 'repeat');
    SEA.buf = toCanvas(WAKE.w * 2, WAKE.h * 2);
    SEA.bctx = SEA.buf.getContext('2d');
    SEA.foamPat = SEA.bctx.createPattern(foamTexture(), 'repeat');
    SEA.mask = wakeMask();
    SEA.kelvin = kelvinRipples();
    SEA.ship = shipModel();
    SEA.shipShadow = softShadow(SEA.ship.hull, -26, -134, 52, 268, 3, 4, 'rgba(0,6,22,.6)');
    SEA.port = portModel();
    SEA.breakwater = breakwater();
    const palms = oc.createPattern(palmTexture(), 'repeat');
    palms.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]));
    SEA.coast = coastModel(palms);
    SEA.calm = oc.createLinearGradient(0, PORT.top, 0, 240);
    SEA.calm.addColorStop(0, 'rgba(26,104,146,.5)');
    SEA.calm.addColorStop(0.72, 'rgba(26,104,146,.46)');
    SEA.calm.addColorStop(1, 'rgba(26,104,146,0)');
    SEA.cranes = [craneModel(CRANE_Y - 78, false), craneModel(CRANE_Y, true), craneModel(CRANE_Y + 82, false)];
    SEA.clouds = [cloudSprite(11), cloudSprite(23), cloudSprite(37)];
    SEA.cloudShadows = SEA.clouds.map((c) => shadowOf(c, 256, 168, 5, 'rgba(0,8,26,.55)'));
    // container roofs are corrugated across their width: a stripe every 0.6 m, used when close
    const rib = toCanvas(8, 8), rg = rib.getContext('2d');
    rg.fillStyle = 'rgba(255,255,255,.12)';
    rg.fillRect(0, 0, 8, 3);
    rg.fillStyle = 'rgba(0,0,0,.12)';
    rg.fillRect(0, 3, 8, 1);
    SEA.ribPat = oc.createPattern(rib, 'repeat');
    SEA.ribPat.setTransform(new DOMMatrix([0.075, 0, 0, 0.075, 0, 0]));
    SEA.sun = oc.createLinearGradient(-22, 0, 22, 0);
    SEA.sun.addColorStop(0, 'rgba(255,255,255,.12)');
    SEA.sun.addColorStop(0.5, 'rgba(255,255,255,0)');
    SEA.sun.addColorStop(1, 'rgba(0,0,0,.16)');
    // from a distance the ship is drawn from a cached image, with the CNIQ box already aboard
    const ppm = 3 * Math.min(window.devicePixelRatio || 1, 1.5);
    SEA.shipImg = toCanvas(52 * ppm, 268 * ppm);
    const sg = SEA.shipImg.getContext('2d');
    sg.setTransform(ppm, 0, 0, ppm, 26 * ppm, 134 * ppm);
    drawShipVector(sg, SEA.ship, null);
    // the plane is drawn once at the largest size it is shown, then only ever scaled down
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), tall = Math.max(innerHeight, 820);
    const planeH = Math.min(2400, Math.round(tall * dpr)), planeW = Math.round(planeH * 66 / 72);
    const plane = await rasterSvg(planeMarkup(planeW, planeH), planeW, planeH);
    if (!plane) return;
    SEA.plane = plane;
    SEA.planeShadow = shadowOf(plane, 132, 144, 1.2, 'rgba(0,6,22,.8)');
    SEA.ready = true;
    oDirty = true;
  }

  const strobe = (x, y, r, rgb, a) => {
    const rg = oc.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${rgb},${a})`);
    rg.addColorStop(1, `rgba(${rgb},0)`);
    oc.fillStyle = rg;
    oc.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // place names, drawn on the canvas in screen pixels: a block of lines, the first in white and the
  // rest dimmer, set left from x or right-aligned to it, shrunk to fit the frame; returns its height
  const lineY = (i, sz) => (i ? sz * 1.5 + (i - 1) * sz * 1.3 : 0);
  function nameBlock(x, y, lines, a, right, measureOnly) {
    const g = oc, room = (right ? x : OL.W - x) - OL.padX;
    const font = (i, sz) => `${i ? 500 : 600} ${i ? sz * 0.86 : sz}px ${MONO}`;
    g.letterSpacing = '0.06em';
    let sz = OL.fs;
    const widest = Math.max(...lines.map((l, i) => { g.font = font(i, sz); return g.measureText(l).width; }));
    if (widest > room) sz *= room / widest;
    const h = lineY(lines.length - 1, sz) + sz * (lines.length > 1 ? 0.86 : 1);
    if (!measureOnly) {
      g.textAlign = right ? 'right' : 'left';
      g.textBaseline = 'top';
      g.shadowColor = 'rgba(2,10,30,.9)';
      g.shadowBlur = 10;
      lines.forEach((l, i) => {
        g.font = font(i, sz);
        g.fillStyle = `rgba(255,255,255,${((i ? 0.78 : 1) * a).toFixed(3)})`;
        g.fillText(l, x, y + lineY(i, sz));
      });
      g.shadowBlur = 0;
      g.shadowColor = 'transparent';
    }
    g.letterSpacing = '0px';
    return h;
  }
  const pinDot = (x, y, a) => {
    const g = oc;
    g.globalAlpha = a;
    g.fillStyle = 'rgba(2,10,30,.55)';
    g.beginPath(); g.arc(x, y, 6, 0, 6.283); g.fill();
    g.fillStyle = '#e2b100';
    g.beginPath(); g.arc(x, y, 3.6, 0, 6.283); g.fill();
    g.globalAlpha = 1;
  };
  // where the frame is, under the header on the left
  function chip(a, lines) {
    const g = oc, x = OL.padX, y = OL.top, h = nameBlock(x + 20, y, lines, a, false, true);
    g.globalAlpha = a * 0.5;
    g.fillStyle = '#030c20';
    g.filter = 'blur(9px)';
    g.fillRect(x - 4, y - 10, Math.min(OL.W - OL.padX * 2, 360), h + 20);
    g.filter = 'none';
    g.globalAlpha = 1;
    pinDot(x + 6, y + OL.fs * 0.5, a);
    nameBlock(x + 20, y, lines, a, false);
  }
  // a point on the map: gold pin, a leader up (or down near the top) and the name at its end
  function pin(x, y, a, lines) {
    if (x < -40 || x > OL.W + 40 || y < OL.top + 16 || y > OL.H + 40) return;
    const g = oc, right = x > OL.W * 0.62, len = 30;
    const h = nameBlock(x, 0, lines, a, right, true), up = y - len - 8 - h > OL.top;
    g.globalAlpha = a * 0.8;
    g.strokeStyle = '#fff';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + 0.5, y + (up ? -7 : 7)); g.lineTo(x + 0.5, y + (up ? -len : len)); g.stroke();
    g.globalAlpha = 1;
    pinDot(x, y, a);
    nameBlock(x + (right ? 0.5 : 0), up ? y - len - 6 - h : y + len + 6, lines, a, right);
  }
  // an open-water name, widely spaced, kept inside the frame
  function waterName(x, y, a, name) {
    const g = oc;
    g.font = `500 ${OL.fs * 1.1}px ${MONO}`;
    g.letterSpacing = '0.42em';
    const w = g.measureText(name).width;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillStyle = `rgba(214,232,255,${(0.7 * a).toFixed(3)})`;
    g.shadowColor = 'rgba(2,10,30,.7)';
    g.shadowBlur = 8;
    g.fillText(name, clamp(x - w / 2, OL.padX, OL.W - OL.padX - w), y);
    g.shadowBlur = 0;
    g.shadowColor = 'transparent';
    g.letterSpacing = '0px';
  }

  function drawOcean(time) {
    if (!SEA.ready) return;
    const { W, H, dpr } = OL;
    const g = oc, P = SEA.port, S = SEA.ship;
    const t = reduceMotion ? 0 : time;
    const dt = clamp(time - lastT, 0, 0.1);
    lastT = time;
    if (!reduceMotion) sailed += dt * 11 * O.wake;

    // the ship: alongside, then off the quay, past the breakwater and out into the Arabian Sea
    const shipX = -110 * smooth(clamp(O.dep * 1.6, 0, 1));
    const shipY = 380 * O.dep * O.dep + O.run * 900 + sailed;
    // the camera: quay framing → following the ship, zoom eased in log space
    const k = smooth(O.cam);
    const s = Math.exp(lerp(Math.log(OL.sPort), Math.log(OL.s0 * O.z), k));
    const fx = lerp(OL.portX, shipX, k), fy = lerp(CRANE_Y, shipY, k);
    const cx = W / 2 + Math.sin(t * 90) * O.jolt * 2, cy = H * O.sy + Math.cos(t * 77) * O.jolt * 1.5;
    const X = (wx) => cx + (wx - fx) * s, Y = (wy) => cy + (wy - fy) * s;
    const close = s > 3;
    const seen = (x, y, w, h) => X(x) < W && Y(y) < H && X(x + w) > 0 && Y(y + h) > 0;
    const toScreen = () => g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const toWorld = () => g.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cx - fx * s), dpr * (cy - fy * s));

    toScreen();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = OL.grad;
    g.fillRect(0, 0, W, H);
    // wind waves are fixed to the water; two octaves cross-fade so they keep detail at any zoom
    const L = Math.log2(s / (2 * OL.s0)), f = L - Math.floor(L), ox = X(0), oy = Y(0);
    g.fillStyle = SEA.seaPat;
    for (const [sc, a] of [[0.5 * Math.pow(2, f), 1 - f], [0.25 * Math.pow(2, f), f]]) {
      if (a < 0.01) continue;
      const tile = 1024 * sc;
      SEA.seaPat.setTransform(new DOMMatrix([sc, 0, 0, sc, ox % tile, oy % tile]));
      g.globalAlpha = a * lerp(0.85, 0.7, clamp((O.z - 1) / 1.6, 0, 1));
      g.fillRect(0, 0, W, H);
    }
    g.globalAlpha = 1;

    // the harbour: calmer water inside the breakwater, the coast running south-east, then the port,
    // which is modelled with its land towards −x and mirrored onto the east side of the berth
    toWorld();
    if (seen(-150, PORT.top, 175, 240 - PORT.top)) { g.fillStyle = SEA.calm; g.fillRect(-150, PORT.top, 175, 240 - PORT.top); }
    if (seen(BW.x, BW.y, BW.w, BW.h)) g.drawImage(SEA.breakwater, BW.x, BW.y, BW.w, BW.h);
    if (X(25) < W && (Y(PORT.bottom) < H || X(-PORT.left) < W)) paint(g, SEA.coast);
    const quayOn = seen(23, PORT.top, -PORT.left - 23, PORT.bottom - PORT.top);
    if (quayOn) {
      g.save();
      g.scale(-1, 1);
      paint(g, P.ground);
      if (s >= 4) for (const b of P.near) { if (seen(-b.x - b.w, b.y, b.w, b.h)) { g.fillStyle = b.fill; g.fillRect(b.x, b.y, b.w, b.h); } }
      else g.drawImage(P.raster, YARD.x, YARD.y, YARD.w, YARD.h);
      g.restore();
    }

    // wake: Kelvin ripples ride with the ship; the foam flows back through the wake mask
    if (O.wake > 0.01) {
      g.globalAlpha = O.wake;
      g.drawImage(SEA.kelvin, shipX + WAKE.x, shipY + WAKE.y, WAKE.w, WAKE.h);
      const b = SEA.bctx;
      b.globalCompositeOperation = 'copy';
      SEA.foamPat.setTransform(new DOMMatrix([1, 0, 0, 1, 0, -((shipY * 2) % 256)]));
      b.fillStyle = SEA.foamPat;
      b.fillRect(0, 0, SEA.buf.width, SEA.buf.height);
      b.globalCompositeOperation = 'destination-in';
      b.drawImage(SEA.mask, 0, 0);
      g.drawImage(SEA.buf, shipX + WAKE.x, shipY + WAKE.y, WAKE.w, WAKE.h);
      g.globalAlpha = 1;
    }

    // the ship and its shadow, thrown down and right by a sun to the upper left
    g.globalAlpha = 0.7;
    g.drawImage(SEA.shipShadow, shipX - 26 + 2.6, shipY - 134 + 2, 52, 268);
    g.globalAlpha = 1;
    if (close) {
      g.save();
      g.translate(shipX, shipY);
      drawShipVector(g, S, (b) => seen(shipX + b.x, shipY + b.y, b.w, b.h));
      g.restore();
    } else {
      g.drawImage(SEA.shipImg, shipX - 26, shipY - 134, 52, 268);
    }

    if (quayOn) {
      // the truck leaves once the box is up; mooring lines are cast off before the ship moves
      drawTruck(g, LANE_X, CRANE_Y + 95 * O.truck * O.truck);
      if (O.lines > 0.01) {
        g.globalAlpha = O.lines;
        g.strokeStyle = '#e8e1cf';
        g.lineWidth = 0.2;
        g.beginPath();
        for (const [sy, qy] of [[-112, -124], [-100, -130], [70, 82], [96, 112]]) { g.moveTo(shipX + 21.2, shipY + sy); g.lineTo(27, qy); }
        g.stroke();
        g.globalAlpha = 1;
      }
      // the box on the spreader, then the cranes over everything below them
      const slotCx = SLOT.x + 1.22;
      const tx = O.rel > 0 ? lerp(slotCx, LANE_X, O.rel) : lerp(LANE_X, slotCx, O.trav);
      if (O.rel <= 0) {
        const h = O.lift, sc = 1 + 0.07 * h;
        g.globalAlpha = 0.3 * h;
        g.fillStyle = '#000';
        g.fillRect(tx - 1.22 + 3 * h, CRANE_Y - 6.15 + 2.4 * h, 2.44, 12.3);
        g.globalAlpha = 1;
        g.save();
        g.translate(tx, CRANE_Y);
        g.scale(sc, sc);
        drawBox(g, -1.22, -6.15, close && SEA.ribPat);
        g.restore();
      }
      const sp = O.rel > 0 ? 1 - O.rel : O.grab;
      if (sp > 0.01) {
        const sc = 1 + 0.07 * (O.rel > 0 ? 1 : O.lift) + 0.3 * (1 - sp);
        g.save();
        g.translate(tx, CRANE_Y);
        g.scale(sc, sc);
        g.globalAlpha = sp;
        g.strokeStyle = '#e2b100';
        g.lineWidth = 0.32;
        g.strokeRect(-1.4, -6.4, 2.8, 12.8);
        g.fillStyle = '#1b1c1f';
        for (const [x, y] of [[-1.5, -6.5], [1.1, -6.5], [-1.5, 6.1], [1.1, 6.1]]) g.fillRect(x, y, 0.4, 0.4);
        g.restore();
        g.globalAlpha = 1;
      }
      g.save();
      g.translate(4, 3);
      g.scale(-1, 1);
      g.globalAlpha = 0.18;
      g.fillStyle = '#000';
      for (const c of SEA.cranes) g.fill(c.shadow);
      g.restore();
      g.save();
      g.scale(-1, 1);
      for (const c of SEA.cranes) paint(g, c.layers);
      g.restore();
      // the trolley runs on top of the boom; the operator's cab hangs on its seaward side
      g.fillStyle = '#2b3a4a';
      g.fillRect(tx - 3, CRANE_Y - 3.7, 6, 1.3);
      g.fillRect(tx - 3, CRANE_Y + 2.4, 6, 1.3);
      g.fillRect(tx - 3, CRANE_Y - 3.7, 0.7, 7.4);
      g.fillRect(tx + 2.3, CRANE_Y - 3.7, 0.7, 7.4);
      g.fillStyle = '#1d4eff';
      g.fillRect(tx - 3, CRANE_Y - 3.7, 6, 0.45);
      g.fillStyle = '#9fc2e0';
      g.fillRect(tx - 4.6, CRANE_Y - 1.1, 1.6, 2.2);
    }

    // clouds cross well below the plane: their shadows on the water first
    toScreen();
    const cloudXY = (c) => {
      const w = Math.max(W, H * 0.9) * c.s;
      return [W * c.x + lerp(0.9, -0.9, O.cl) * c.v * W, H * (c.y + O.cl * 0.12), w, w * 672 / 1024];
    };
    if (O.cla > 0.01) {
      for (const c of CLOUDS) {
        const [x, y, w, h] = cloudXY(c);
        g.globalAlpha = O.cla * 0.3;
        g.drawImage(SEA.cloudShadows[c.i], x - w / 2 + W * 0.06, y - h / 2 + H * 0.09, w, h);
      }
      g.globalAlpha = 1;
    }
    // the plane holds its heading for the airport: its shadow crosses the water beside the ship
    const flying = O.pp > 0 && O.pp < 1, hx = Math.sin(HEADING), hy = -Math.cos(HEADING);
    if (flying) {
      toWorld();
      const u = lerp(-170, 170, O.pp);
      g.save();
      g.translate(shipX + 20 + hx * u, shipY + 40 + hy * u);
      g.rotate(HEADING);
      g.globalAlpha = 0.5;
      g.drawImage(SEA.planeShadow, -33, -36, 66, 72);
      g.restore();
      toScreen();
    }
    if (O.cla > 0.01) {
      for (const c of CLOUDS) {
        const [x, y, w, h] = cloudXY(c);
        g.globalAlpha = O.cla * c.a;
        g.drawImage(SEA.clouds[c.i], x - w / 2, y - h / 2, w, h);
      }
      g.globalAlpha = 1;
    }

    // the names: where the berth is while at the quay, a map as the camera pulls back, the air leg
    if (O.lab > 0.01) chip(O.lab, PLACE.port);
    if (O.map > 0.01) {
      waterName(X(shipX) * 0.46, H * 0.68, O.map, 'ARABIAN SEA');
      pin(X(-171), Y(BW.head + 2), O.map, ['BREAKWATER']);
      pin(X(50), Y(40), O.map, PLACE.pin);
    }
    if (O.air > 0.01) chip(O.air, PLACE.air);

    if (flying) {
      const m = OL.Lp / 72, reach = Math.hypot(W, H) / 2 + OL.Lp * 0.45, u = lerp(-reach, reach, O.pp);
      g.save();
      g.translate(W * 0.55 + hx * u, H * 0.5 + hy * u);
      g.rotate(HEADING);
      g.drawImage(SEA.plane, -33 * m, -36 * m, 66 * m, 72 * m);
      if (!reduceMotion) {
        g.globalCompositeOperation = 'lighter';
        if (t % 1.1 < 0.12) strobe(0, 4 * m, 3.2 * m, '255,70,55', 0.9);
        const st = t % 1.4;
        if (st < 0.06 || (st > 0.14 && st < 0.2)) {
          strobe(-32 * m, 17.8 * m, 4 * m, '255,255,255', 1);
          strobe(32 * m, 17.8 * m, 4 * m, '255,255,255', 1);
        }
      }
      g.restore();
    }
  }

  function renderOceanDom() {
    const H = OL.H;
    oHead.style.opacity = (1 - O.head).toFixed(3);
    oHead.style.transform = `translate3d(0, ${(-O.head * 60).toFixed(1)}px, 0)`;
    oHead.style.visibility = O.head > 0.999 ? 'hidden' : '';
    const y = lerp(H, H * 0.46 - OL.listH, O.list);
    oList.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    for (const it of OL.items) {
      const c = y + it.mid;
      const on = c < H * 0.8;
      if (on !== it.on) { it.on = on; it.li.classList.toggle('is-on', on); }
      const a = clamp((c - H * 0.1) / (H * 0.16), 0, 1) * clamp((H * 1.02 - c) / (H * 0.2), 0, 1);
      if (Math.abs(a - it.a) > 0.01) { it.a = a; it.li.style.opacity = a.toFixed(2); }
    }
    oFade.style.opacity = O.out.toFixed(3);
    oDirty = true;
  }

  measureOcean();
  buildSea();
  gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: renderOceanDom,
    scrollTrigger: {
      trigger: oStage,
      start: 'top top',
      end: () => '+=' + Math.round(innerHeight * 8.3),
      pin: true,
      scrub: reduceMotion ? true : 0.6,
      anticipatePin: 1
    }
  })
    .to(O, { head: 1, duration: 0.9, ease: 'power2.in' }, 0.8)
    .to(O, { grab: 1, duration: 0.6, ease: 'power2.out' }, 0.5)
    .to(O, { lift: 1, duration: 0.5, ease: 'power1.inOut' }, 1.1)
    .to(O, { trav: 1, duration: 1.3, ease: 'power1.inOut' }, 1.6)
    .to(O, { truck: 1, duration: 1.6, ease: 'power1.in' }, 1.8)
    .to(O, { lift: 0, duration: 0.5, ease: 'power1.inOut' }, 2.9)
    .to(O, { jolt: 1, duration: 0.08 }, 3.4)
    .to(O, { jolt: 0, duration: 0.3 }, 3.48)
    .to(O, { rel: 1, duration: 0.7, ease: 'power1.inOut' }, 3.6)
    .to(O, { lines: 0, duration: 0.4 }, 4.0)
    .to(O, { dep: 1, duration: 2.8, ease: 'power1.in' }, 4.2)
    .to(O, { cam: 1, duration: 2.4, ease: 'power2.inOut' }, 4.4)
    .to(O, { wake: 1, duration: 1.6 }, 4.8)
    .to(O, { run: 1, duration: 9.6 }, 7)
    .to(O, { cla: 1, duration: 0.7 }, 6.4)
    .to(O, { cl: 1, duration: 4.4 }, 6.4)
    .to(O, { pp: 1, duration: 3.6 }, 6.9)
    .to(O, { cla: 0, duration: 0.8 }, 10)
    .to(O, { z: 2.6, sy: 0.5, duration: 1.6, ease: 'power2.inOut' }, 10.6)
    .to(O, { list: 1, duration: 4.4 }, 11.2)
    .to(O, { z: 1.5, sy: 0.42, out: 1, duration: 1, ease: 'power1.in' }, 15.6)
    .to(O, { lab: 1, duration: 0.4 }, 1.7)
    .to(O, { lab: 0, duration: 0.4 }, 4.5)
    .to(O, { map: 1, duration: 0.5 }, 5.6)
    .to(O, { map: 0, duration: 0.5 }, 7.3)
    .to(O, { air: 1, duration: 0.4 }, 8.1)
    .to(O, { air: 0, duration: 0.4 }, 10.2);
  ScrollTrigger.create({
    trigger: '#sea-air',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (s) => { oceanOn = s.isActive; oDirty = true; }
  });
  ScrollTrigger.addEventListener('refreshInit', measureOcean);
  ScrollTrigger.addEventListener('refresh', renderOceanDom);
  renderOceanDom();
  ScrollTrigger.create({ trigger: '#sea-air', start: 'top 60%', end: 'bottom 40%', onToggle: (s) => s.isActive && setNav('sea-air') });

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
