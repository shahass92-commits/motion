/* CNIQ India · cinematic landing
   One scrubbed GSAP timeline drives a set of plain numbers (F). Every frame those numbers are
   rendered into the yard scene, the road, the services rail and the satellite map, so layout
   changes only need a re-measure, never a rebuilt timeline. */
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
  const ASPHALT = '#121316';

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
    return { x: p.x + (dy / d) * off, y: p.y - (dx / d) * off };
  };

  const map = { route: null, roads: [], cars: [] };

  function buildMap(dense) {
    const roads = $('#mapRoads');
    const stroke = (w, color, extra) => ROADS.map((d) => svg('path', Object.assign({ d, fill: 'none', stroke: color, 'stroke-width': w }, extra || {}), roads));

    // grid
    let gd = '';
    for (let x = -3600; x <= 6400; x += 200) gd += `M${x} -3000V5000`;
    for (let y = -3000; y <= 5000; y += 200) gd += `M-3600 ${y}H6400`;
    svg('path', { d: gd, fill: 'none', stroke: '#e8e8e3', 'stroke-width': 2 }, $('#mapGrid'));

    stroke(218, '#1d1e22');
    const asphalt = stroke(200, ASPHALT);
    FILLETS.forEach(([cx, cy, ax, ay, bx, by]) => {
      const r = 70, Ax = cx + ax * r, Ay = cy + ay * r, Bx = cx + bx * r, By = cy + by * r;
      const sweep = ax * by - ay * bx > 0 ? 1 : 0;
      svg('path', { d: `M${Ax} ${Ay}L${cx} ${cy}L${Bx} ${By}A${r} ${r} 0 0 ${sweep} ${Ax} ${Ay}Z`, fill: ASPHALT }, roads);
    });
    stroke(186, '#3a3d43');
    stroke(180, ASPHALT);
    MOUTHS.forEach(([x, y, w, h]) => svg('rect', { x, y, width: w, height: h, fill: ASPHALT }, roads));
    stroke(104, '#4a4d53', { 'stroke-dasharray': '40 46' });
    stroke(96, ASPHALT);
    stroke(10, '#b08f2a', { opacity: 0.9 });
    stroke(4, ASPHALT);
    svg('path', { d: 'M1668 1088H1880L1668 1168Z', fill: 'url(#pHatch)', stroke: '#5a5e65', 'stroke-width': 3 }, roads);
    // port gate barrier
    svg('rect', { x: 3010, y: 1872, width: 34, height: 26, rx: 3, fill: '#d0d4d9' }, roads);
    svg('path', { d: 'M3027 1898V2096', stroke: '#e2b100', 'stroke-width': 6, 'stroke-dasharray': '18 12' }, roads);

    map.roads = asphalt.map((p) => lut(p, 8));
    map.route = lut(asphalt[0], 5);

    buildGround(dense);
    buildPort();
    buildLabels();
    buildCars();
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
      { x: 3560, y: -3200, w: 4000, h: 9000 } // sea
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

    // sea and coastline
    let coast = 'M7000 -3200L3700 -3200';
    for (let y = -3200; y <= 5600; y += 100) {
      const x = y > 1440 && y < 2660 ? 3700 : 3780 + Math.sin(y / 340) * 46 + Math.sin(y / 97) * 14;
      coast += `L${x.toFixed(1)} ${y}`;
    }
    coast += 'L7000 5600Z';
    svg('path', { d: coast, fill: 'url(#pSea)' }, ground);
    svg('rect', { x: 3690, y: 1440, width: 12, height: 1220, fill: '#c7cfd8' }, ground);

    // fields
    for (let i = 0, made = 0; i < 300 && made < 12; i++) {
      const w = 320 + R() * 520, h = 220 + R() * 420, x = -3000 + R() * 6200, y = -2400 + R() * 6400;
      if (!free(x, y, w, h, 60, 150)) continue;
      svg('rect', { x, y, width: w, height: h, fill: 'url(#pField)', stroke: '#e3e4de', 'stroke-width': 3 }, ground);
      blocked.push({ x, y, w, h });
      made++;
    }

    // buildings: soft offset shadow, footprint, roof line
    const target = dense ? 320 : 170;
    const shadow = svg('g', { fill: '#e8e8e3' }, ground);
    const body = svg('g', { fill: '#e2e2dd', stroke: '#d3d3cd', 'stroke-width': 2 }, ground);
    const roof = svg('g', { fill: 'none', stroke: '#d8d8d2', 'stroke-width': 2 }, ground);
    for (let i = 0, made = 0; i < 6000 && made < target; i++) {
      const big = R() > 0.82;
      const w = big ? 140 + R() * 160 : 40 + R() * 90;
      const h = big ? 100 + R() * 140 : 40 + R() * 90;
      const x = -3000 + R() * 6400, y = -2200 + R() * 6400;
      if (!free(x, y, w, h, 16, 132)) continue;
      svg('rect', { x: x + 8, y: y + 8, width: w, height: h }, shadow);
      svg('rect', { x, y, width: w, height: h }, body);
      if (big) svg('rect', { x: x + 14, y: y + 14, width: w - 28, height: h - 28 }, roof);
      blocked.push({ x, y, w, h });
      made++;
    }

    // tree clusters
    const trees = svg('g', { fill: '#e1e6dc' }, ground);
    const clusters = dense ? 70 : 36;
    for (let i = 0, made = 0; i < 2000 && made < clusters; i++) {
      const cx = -3000 + R() * 6400, cy = -2200 + R() * 6400;
      if (!free(cx - 84, cy - 84, 168, 168, 10, 110)) continue;
      const n = 4 + Math.floor(R() * 9);
      for (let k = 0; k < n; k++) {
        const r = 9 + R() * 14;
        svg('circle', { cx: cx + (R() - 0.5) * 120, cy: cy + (R() - 0.5) * 120, r }, trees);
      }
      made++;
    }
  }

  function buildPort() {
    const port = $('#mapPort');
    const R = rng(7);
    const pal = ['#8395aa', '#c98d6f', '#8f9ca7', '#b9bdc3', '#6f8299', '#ad7a64', '#9aa8b4'];
    // CFS yard by the start of the route
    svg('rect', { x: -1440, y: -40, width: 960, height: 500, fill: '#e8e8e4', stroke: '#d9d9d3', 'stroke-width': 3 }, port);
    for (let c = 0; c < 9; c++) {
      for (let r = 0; r < 10; r++) {
        if (R() < 0.18) continue;
        svg('rect', { x: -1400 + c * 100, y: 10 + r * 40, width: 84, height: 26, fill: pal[Math.floor(R() * pal.length)] }, port);
      }
    }
    // port yard and quay
    svg('rect', { x: 3060, y: 1460, width: 640, height: 1200, fill: '#e7e7e3', stroke: '#d9d9d3', 'stroke-width': 3 }, port);
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 26; r++) {
        if ((r > 11 && r < 15) || R() < 0.12) continue;
        svg('rect', { x: 3120 + c * 84, y: 1500 + r * 42, width: 70, height: 28, fill: pal[Math.floor(R() * pal.length)] }, port);
      }
    }
    // docked ship, top view
    svg('path', { d: 'M3760 1600H3920V2380Q3920 2460 3840 2500Q3760 2460 3760 2380Z', fill: '#26324a' }, port);
    svg('rect', { x: 3772, y: 1620, width: 136, height: 90, fill: '#e7eaee' }, port);
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 4; c++) {
        svg('rect', { x: 3776 + c * 34, y: 1730 + r * 40, width: 30, height: 34, fill: r === 6 ? '#c9cdd2' : pal[Math.floor(R() * pal.length)] }, port);
      }
    }
    // ship-to-shore cranes
    [1700, 1990, 2280].forEach((y) => {
      svg('rect', { x: 3600, y, width: 50, height: 140, fill: '#bcc3cb' }, port);
      svg('rect', { x: 3640, y: y + 58, width: 330, height: 24, fill: '#97a2ae' }, port);
      svg('rect', { x: 3606, y: y + 6, width: 38, height: 128, fill: 'none', stroke: '#8e98a3', 'stroke-width': 3 }, port);
    });
  }

  function buildLabels() {
    const g = $('#mapLabels');
    const shield = (txt, x, y) => {
      const s = svg('g', { transform: `translate(${x} ${y})` }, g);
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
    label('08°23′N', { x: 4300, y: 2140, 'font-size': 22, class: 'lbl' }, g);
    label('076°59′E', { x: 4300, y: 2172, 'font-size': 22, class: 'lbl' }, g);
  }

  function buildCars() {
    const g = $('#cars');
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
      svg('rect', { x: -w / 2, y: -9, width: w, height: 18, rx: 5, fill: colors[i] }, car);
      svg('rect', { x: w / 2 - 14, y: -7, width: 6, height: 14, rx: 2, fill: '#2b3a4a', opacity: 0.75 }, car);
      map.cars.push({ el: car, l: map.roads[road], s0, v, off, dir });
    });
  }

  function moveCars(time) {
    for (const c of map.cars) {
      const len = c.l.len;
      let s = (c.s0 + time * c.v) % len;
      if (c.dir < 0) s = len - s;
      const p = laneAt(c.l, s, c.off);
      const q = laneAt(c.l, s + c.dir * 6, c.off);
      c.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${deg(Math.atan2(q.y - p.y, q.x - p.x)).toFixed(1)})`);
    }
  }

  /* ---------- sea & air ---------- */

  const voyage = { waveFar: 150, waveNear: 230 };

  function buildVoyage() {
    const R = rng(1904);
    const cloud = (g, x, y, s, op) => {
      const c = svg('g', { transform: `translate(${x} ${y}) scale(${s})`, opacity: op }, g);
      svg('ellipse', { cx: 0, cy: 20, rx: 124, ry: 13, fill: '#d6dee8', opacity: 0.55 }, c);
      [[-72, 2, 32], [-34, -16, 44], [16, -26, 52], [64, -8, 38], [100, 6, 24], [-104, 9, 20]].forEach(([cx, cy, r]) => svg('circle', { cx, cy, r, fill: '#fff' }, c));
      svg('rect', { x: -112, y: 2, width: 222, height: 22, rx: 11, fill: '#fff' }, c);
    };
    const far = $('#cloudsFar'), near = $('#cloudsNear');
    for (let i = 0; i < 12; i++) cloud(far, -900 + i * 330 + R() * 120, 110 + R() * 250, 0.45 + R() * 0.45, 0.9);
    for (let i = 0; i < 7; i++) cloud(near, -700 + i * 560 + R() * 160, 470 + R() * 60, 1 + R() * 0.6, 0.95);

    const waves = (g, n, y0, y1, wl, amp, op, w0, w1) => {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = lerp(y0, y1, t * t);
        const a = amp * (0.6 + R() * 0.8);
        let d = `M${-1600 - Math.floor(R() * 4) * (wl / 4)} ${y.toFixed(1)}`;
        for (let x = 0; x < 5200; x += wl) d += `q${wl / 4} ${-a} ${wl / 2} 0t${wl / 2} 0`;
        svg('path', { d, fill: 'none', stroke: '#fff', 'stroke-opacity': op * (0.5 + t), 'stroke-width': lerp(w0, w1, t) }, g);
      }
    };
    waves($('#wavesFar'), 9, 572, 700, voyage.waveFar, 2.4, 0.07, 1, 1.6);
    waves($('#wavesNear'), 8, 730, 900, voyage.waveNear, 5, 0.08, 1.6, 3);

    const boxes = $('#shipBoxes');
    const pal = ['#24406a', '#c4582c', '#5f6d7a', '#7b302d', '#2f5d50', '#b7bcc2', '#3e4a5a', '#a8452b'];
    for (let b = 0; b < 14; b++) {
      const x = 212 + b * 51;
      const tiers = b >= 12 ? 4 : b >= 10 ? 5 : 6 + (R() > 0.6 ? 1 : 0);
      for (let t = 0; t < tiers; t++) {
        const y = -66 - (t + 1) * 21;
        const silver = b === 5 || b === 6;
        svg('rect', { x, y, width: 48, height: 20, fill: silver ? '#c9cdd2' : pal[Math.floor(R() * pal.length)] }, boxes);
        svg('rect', { x, y, width: 48, height: 2, fill: '#fff', opacity: 0.2 }, boxes);
      }
    }
    label('CNIQ', { x: 471, y: -116, class: 'svg-display', 'font-size': 12, fill: '#15171c' }, boxes);
    svg('circle', { cx: 509, cy: -124, r: 2.4, fill: '#1d4eff' }, boxes);
    const win = $('#shipWindows');
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) svg('rect', { x: 48 + c * 15, y: -226 + r * 26, width: 9, height: 6 }, win);
    svg('rect', { x: 34, y: -246, width: 124, height: 8, fill: '#1b222d' }, win);
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
  const hero = $('#hero');
  const cue = $('#scrollCue');
  const chart = $('.chart');
  const giant = $('#giant');
  const rig = $('#rig');
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
  const wheels = $$('#truck .wheel use');
  const lanes = $('#lanes');
  const track = $('#track');
  const aerial = $('#telemetry');
  const mapSvg = $('#map');
  const cam = $('#cam');
  const tvCab = $('#tvCab');
  const tvTrailer = $('#tvTrailer');
  const fencePing = $('#fencePing');
  const hudStatus = $('#hudStatus');
  const hud = { num: $('#hudNum'), chapter: $('#hudChapter'), text: $('#hudText'), spd: $('#spd') };
  const tel = {
    lat: $('#tLat'), lon: $('#tLon'), hdg: $('#tHdg'), spd: $('#tSpd'), rem: $('#tRem'), clock: $('#tClock'),
    needle: $('#cNeedle'), events: $$('#tEvents li')
  };

  // Everything the film animates. Units: svg units for the yard, 0–1 or 0–2 stops elsewhere.
  const F = {
    hero: 0, sz: 0, pan: 0, chart: 1,
    tx: -1900, clunk: 0, S: 180, by: 196, call: 0,
    world: 0, d: 0, odo: 0,
    rig: 0, track: 0, trackA: 1, giant: 0, giantA: 0,
    aerA: 0, zoom: 3.4, p: 0, ov: 0, ping: 0
  };
  const L = {};
  let filmTl = null;
  let voyageOn = false;
  const OVERVIEW = { x: 2700, y: 1760 };

  function measure() {
    L.W = stage.clientWidth;
    L.H = stage.clientHeight;
    L.narrow = L.W / L.H < 0.9;
    // phones see a 900-unit window; a pan keeps the stacker, then the departing truck, framed
    const vbX = L.narrow ? 350 : 0, vbW = L.narrow ? 900 : 1600;
    side.setAttribute('viewBox', `${vbX} 0 ${vbW} 640`);
    L.sideScale = Math.min(sideWrap.clientWidth / vbW, sideWrap.clientHeight / 640);
    L.panLift = L.narrow ? (800 - 640) * L.sideScale : 0;
    L.panRun = L.narrow ? (800 - 830) * L.sideScale : 0;
    L.ground = clamp(L.H * 0.022, 14, 24);
    L.rise = Math.min(Math.max(L.H * 0.5, 380), L.H * 0.64);
    L.heroScale = L.narrow ? 1 : 0.84;
    L.liftScale = L.narrow ? 1 : 1.1;
    L.runScale = L.narrow ? 1 : 0.96;
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

  const STATUS = [
    [0, '01', 'The Lift', 'Awaiting chassis'],
    [0.5, '01', 'The Lift', 'Chassis arriving · Bay 14'],
    [2.7, '01', 'The Lift', 'Lowering onto chassis'],
    [4.0, '01', 'The Lift', 'Twist-locks engaged'],
    [4.6, '01', 'The Lift', 'Load secured · CNIU 820149 0'],
    [5.4, '02', 'The Run', 'Departing CFS Yard 3'],
    [6.8, '02', 'The Run', 'En route · NH 66 south'],
    [13.4, '03', 'The Corridor', 'Switching to satellite view'],
    [14.6, '03', 'The Corridor', 'Tracking · NH 66 corridor'],
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

  function renderFilm() {
    // hero copy leaves first
    const heroY = (-F.hero * 90).toFixed(1);
    hero.style.transform = `translate3d(0, ${heroY}px, 0)`;
    hero.style.opacity = 1 - F.hero;
    hero.style.visibility = F.hero > 0.999 ? 'hidden' : '';
    cue.style.opacity = 1 - Math.min(1, F.hero * 2);
    hudStatus.style.setProperty('--hud-a', F.hero.toFixed(3));
    chart.style.opacity = F.chart;

    // camera on the yard
    const wrapScale = along(F.sz, [L.heroScale, L.liftScale, L.runScale]);
    sideWrap.style.transform = `translate3d(${lerp(L.panLift, L.panRun, F.pan).toFixed(1)}px, 0, 0) scale(${wrapScale.toFixed(4)})`;
    rig.style.transform = `translate3d(0, ${along(F.rig, [-L.ground, -L.rise, -L.H]).toFixed(1)}px, 0)`;

    // yard
    truck.setAttribute('transform', `translate(${F.tx.toFixed(2)} ${F.clunk.toFixed(2)})`);
    box.setAttribute('transform', `translate(${(260 + Math.max(0, F.tx)).toFixed(2)} ${(F.by + F.clunk).toFixed(2)})`);
    callout.style.opacity = F.call;
    renderLift(F.S);
    const wt = `translate(${F.world.toFixed(1)} 0)`;
    worldBack.setAttribute('transform', wt);
    worldFront.setAttribute('transform', wt);
    const spin = `rotate(${deg(F.d / 26).toFixed(1)})`;
    for (const w of wheels) w.setAttribute('transform', spin);

    // road + services
    const lanePx = (F.world * L.sideScale * wrapScale) % 128;
    lanes.style.transform = `translate3d(${lanePx.toFixed(1)}px, 0, 0)`;
    track.style.transform = `translate3d(${(-F.track * L.trackShift).toFixed(1)}px, 0, 0)`;
    track.style.opacity = F.trackA;
    giant.style.transform = `translate3d(${lerp(L.W * 0.55, -(L.giantW - L.W * 0.2), F.giant).toFixed(1)}px, 0, 0)`;
    giant.style.opacity = F.giantA;

    // satellite
    aerial.style.opacity = F.aerA;
    aerial.style.visibility = F.aerA > 0.001 ? 'visible' : 'hidden';
    if (F.aerA > 0.001) renderMap();

    if (filmTl) renderStatus(filmTl.time());
  }

  const ROUTE_START = 200;
  let lastTel = {};
  const setText = (key, node, value) => {
    if (lastTel[key] !== value) { lastTel[key] = value; node.textContent = value; }
  };

  function renderMap() {
    const r = map.route;
    const s = lerp(ROUTE_START, r.len - 40, F.p);
    const K = laneAt(r, s, 72);
    const front = laneAt(r, s + 34, 72);
    const rear = laneAt(r, s - 150, 72);
    const cabA = Math.atan2(front.y - K.y, front.x - K.x);
    const trA = Math.atan2(K.y - rear.y, K.x - rear.x);
    tvCab.setAttribute('transform', `translate(${K.x.toFixed(1)} ${K.y.toFixed(1)}) rotate(${deg(cabA).toFixed(2)})`);
    tvTrailer.setAttribute('transform', `translate(${K.x.toFixed(1)} ${K.y.toFixed(1)}) rotate(${deg(trA).toFixed(2)})`);

    const lead = 110;
    const tx = lerp(K.x + Math.cos(cabA) * lead, L.narrow ? 2920 : OVERVIEW.x, F.ov);
    const ty = lerp(K.y + Math.sin(cabA) * lead, L.narrow ? 1960 : OVERVIEW.y, F.ov);
    const sc = L.mapBase * F.zoom * (L.narrow ? lerp(1, 1.35, F.ov) : 1);
    const cx = L.W * (L.narrow ? 0.5 : 0.42);
    const cy = L.H * (L.narrow ? 0.36 : 0.52);
    cam.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${sc.toFixed(4)}) translate(${(-tx).toFixed(1)} ${(-ty).toFixed(1)})`);

    fencePing.setAttribute('r', (170 + F.ping * 190).toFixed(1));
    fencePing.setAttribute('opacity', F.ping > 0 ? (1 - F.ping).toFixed(3) : '0');

    // simulated telemetry, interpolated from real coordinates near Thiruvananthapuram
    const lat = 8.5241 - (K.y - 600) * 1.03e-4;
    const lon = 76.9366 + (K.x + 700) * 1.6e-5;
    const bearing = (deg(cabA) + 450) % 360;
    const card = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];
    const mins = 4 + Math.round(F.p * 27);
    setText('lat', tel.lat, `${pad(lat.toFixed(4), 7)}° N`);
    setText('lon', tel.lon, `${pad(lon.toFixed(4), 8)}° E`);
    setText('hdg', tel.hdg, `${pad(Math.round(bearing) % 360, 3)}° ${card}`);
    setText('rem', tel.rem, `${(4.6 * (1 - F.p)).toFixed(1)} km`);
    setText('clock', tel.clock, `21:${pad(mins, 2)}`);
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
    .to(F, { tx: 0, d: 1900, odo: 14, duration: 2.2, ease: 'power2.out' }, 0.4)
    .to(F, { S: 408, by: 424, duration: 1.3, ease: 'power1.inOut' }, 2.7)
    .to(F, { call: 1, duration: 0.3 }, 3.9)
    .to(F, { clunk: 3, duration: 0.12, ease: 'power2.in' }, 4.0)
    .to(F, { clunk: 0, duration: 0.3, ease: 'power2.out' }, 4.12)
    .to(F, { S: 384, duration: 0.3, ease: 'power1.out' }, 4.4)
    .to(F, { S: 150, duration: 0.9, ease: 'power2.inOut' }, 4.7)
    .to(F, { call: 0, duration: 0.3 }, 5.6)
    .addLabel('depart', 5.4)
    .to(F, { tx: 160, pan: 1, duration: 1.2, ease: 'power1.inOut' }, 5.4)
    .to(F, { world: -400, d: 2460, odo: 22, duration: 1.2, ease: 'power2.in' }, 5.4)
    .to(F, { rig: 1, sz: 2, duration: 1.4, ease: 'power2.inOut' }, 6.0)
    .to(F, { chart: 0, duration: 0.6 }, 6.0)
    .to(F, { giantA: 1, duration: 0.6 }, 6.2)
    .to(F, { giant: 1, duration: 7.2 }, 6.2)
    .addLabel('run', 7.4)
    .to(F, { world: -4400, d: 6460, odo: 82, duration: 6.8 }, 6.6)
    .to(F, { track: 1, duration: 6.8 }, 6.6)
    .to(F, { trackA: 0, giantA: 0, duration: 0.6 }, 13.2)
    .to(F, { rig: 2, duration: 1.2, ease: 'power2.in' }, 13.2)
    .to(F, { aerA: 1, duration: 0.6 }, 14.0)
    .to(F, { zoom: 1.15, duration: 2, ease: 'power2.out' }, 14.0)
    .addLabel('aerial', 15.2)
    .to(F, { p: 1, odo: 132, duration: 6.5, ease: 'power1.inOut' }, 14.5)
    .to(F, { zoom: 0.58, ov: 1, duration: 1.6, ease: 'power2.inOut' }, 19.6)
    .to(F, { ping: 1, duration: 0.8, ease: 'power1.out' }, 21.0)
    .to({}, { duration: 0.6 }, FILM_DUR - 0.6);

  ScrollTrigger.addEventListener('refreshInit', measure);
  ScrollTrigger.addEventListener('refresh', renderFilm);
  renderFilm();

  const filmY = (key) => {
    const st = filmTl.scrollTrigger;
    return st.start + (filmTl.labels[key] / filmTl.duration()) * (st.end - st.start);
  };

  /* ---------- ambient life (time-based, never tied to scroll) ---------- */
  if (!reduceMotion) {
    gsap.to('#beaconGlow', { opacity: 0.55, duration: 0.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('#cabBody', { y: 0.6, duration: 0.14, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  /* ---------- speed readout from the odometer ---------- */
  let lastOdo = F.odo, vel = 0, shown = -1;
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
    if (!reduceMotion && F.aerA > 0.001) moveCars(time);
    if (voyageOn) renderVoyage(time);
  });

  /* ---------- manifesto, operating model ---------- */
  const mt = $('#manifestoText');
  mt.innerHTML = mt.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  gsap.to('#manifestoText .w', {
    color: '#0d0e10',
    stagger: 0.08,
    ease: 'none',
    scrollTrigger: { trigger: mt, start: 'top 82%', end: 'bottom 48%', scrub: true }
  });
  gsap.from('.principles article', {
    y: 36,
    stagger: 0.12,
    ease: 'none',
    scrollTrigger: { trigger: '.principles', start: 'top 98%', end: 'top 72%', scrub: true }
  });
  ScrollTrigger.create({ trigger: '#approach', start: 'top 60%', endTrigger: '#model', end: 'bottom 40%', onToggle: (s) => s.isActive && setNav('approach') });
  ScrollTrigger.create({ trigger: '#sea-air', start: 'top 60%', end: 'bottom 40%', onToggle: (s) => s.isActive && setNav('sea-air') });
  ScrollTrigger.create({ trigger: '#contact', start: 'top 60%', onToggle: (s) => s.isActive && setNav('') });

  const steps = $$('#steps li');
  gsap.to('#modelFill', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '#steps',
      start: 'top 82%',
      end: 'bottom 55%',
      scrub: true,
      onUpdate: (self) => steps.forEach((li, i) => li.classList.toggle('is-on', self.progress >= i / steps.length + 0.02))
    }
  });

  /* ---------- sea & air ---------- */
  const V = { t: 0 };
  const plane = $('#plane'), ship = $('#ship');
  const cloudsFar = $('#cloudsFar'), cloudsNear = $('#cloudsNear');
  const wavesFar = $('#wavesFar'), wavesNear = $('#wavesNear');
  function renderVoyage(time) {
    const t = V.t;
    const live = reduceMotion ? 0 : time;
    plane.setAttribute('transform', `translate(${lerp(-900, 1900, t).toFixed(1)} ${lerp(440, 286, t).toFixed(1)}) rotate(-4) scale(.62)`);
    ship.setAttribute('transform', `translate(${lerp(-860, 980, t).toFixed(1)} ${(712 + Math.sin(live * 1.1) * 2).toFixed(2)}) rotate(${(Math.sin(live * 0.8) * 0.35).toFixed(3)}) scale(.74)`);
    cloudsFar.setAttribute('transform', `translate(${(-280 * t - live * 5).toFixed(1)} 0)`);
    cloudsNear.setAttribute('transform', `translate(${(-1000 * t - live * 9).toFixed(1)} 0)`);
    wavesFar.setAttribute('transform', `translate(${(-(220 * t + live * 14) % voyage.waveFar).toFixed(1)} 0)`);
    wavesNear.setAttribute('transform', `translate(${(-(700 * t + live * 26) % voyage.waveNear).toFixed(1)} 0)`);
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
    end: () => '+=' + Math.round(innerHeight * 4),
    onToggle: (s) => { voyageOn = s.isActive; if (s.isActive) renderVoyage(gsap.ticker.time); }
  });
  renderVoyage(0);

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
        .from(side, { y: 60, duration: 1.4, ease: 'power3.out', clearProps: 'transform' }, 0.6);
    });
  }

  intro();
})();
