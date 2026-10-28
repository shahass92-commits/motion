/* Compass Nexus iQ flagship · generated scenes
   Every [data-scene] is a painting made in code. The still layer is drawn once per size into an
   offscreen buffer at the device pixel ratio; a light animated layer (light trails, beacons,
   water, aircraft) is drawn on top only while the scene is on screen. Nothing is downloaded, so
   the art stays sharp at any size. To use a photograph instead, put an <img> inside the
   [data-scene] element: the canvas is then left alone. */
(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ---------- paint helpers ----------
  const lin = (c, x0, y0, x1, y1, stops) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    for (const [o, col] of stops) g.addColorStop(o, col);
    return g;
  };
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  // soft light: a radial falloff to the same hue at zero alpha (no dark fringe)
  const glow = (c, x, y, r, rgb, a = 1, sx = 1, sy = 1) => {
    if (r <= 0) return;
    c.save();
    c.translate(x, y);
    c.scale(sx, sy);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(rgb, a));
    g.addColorStop(0.35, rgba(rgb, a * 0.38));
    g.addColorStop(1, rgba(rgb, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    c.restore();
  };
  const disc = (c, x, y, r, fill) => {
    c.fillStyle = fill;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  };
  const poly = (c, pts, fill) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  };
  // a mountain ridge across the width, filled to the bottom
  const ridge = (c, w, h, y, amp, r, fill, rough = 1) => {
    const p = [r() * TAU, r() * TAU, r() * TAU, r() * TAU];
    c.beginPath();
    c.moveTo(-4, h + 4);
    for (let x = -4; x <= w + 8; x += 6) {
      const k = x / w;
      const n = 0.55 * Math.sin(k * 3.1 + p[0]) + 0.28 * Math.sin(k * 7.7 + p[1]) * rough +
        0.12 * Math.sin(k * 19 + p[2]) * rough + 0.05 * Math.sin(k * 47 + p[3]) * rough;
      c.lineTo(x, y - amp * (0.5 + n * 0.6));
    }
    c.lineTo(w + 8, h + 4);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  };
  const stars = (c, w, h, n, r, maxY) => {
    for (let i = 0; i < n; i++) {
      const x = r() * w;
      const y = Math.pow(r(), 1.4) * maxY;
      const a = 0.15 + r() * 0.65;
      const s = r() < 0.05 ? 1.6 : 0.8;
      c.fillStyle = `rgba(225,232,255,${a.toFixed(2)})`;
      c.fillRect(x, y, s, s);
      if (s > 1) glow(c, x + 0.8, y + 0.8, 5, [200, 215, 255], 0.25);
    }
  };
  // coconut palm silhouette: tapered, leaning trunk and drooping feathered fronds
  const palm = (c, x, y, h, lean, col, r) => {
    const tx = x + lean * h;
    const ty = y - h;
    const cx = x + lean * h * 0.1;
    const cy = y - h * 0.55;
    const L = [];
    const R = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const px = (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * tx;
      const py = (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ty;
      const dx = 2 * (1 - t) * (cx - x) + 2 * t * (tx - cx);
      const dy = 2 * (1 - t) * (cy - y) + 2 * t * (ty - cy);
      const len = Math.hypot(dx, dy) || 1;
      const wd = h * (0.026 - 0.011 * t);
      L.push([px - (dy / len) * wd, py + (dx / len) * wd]);
      R.push([px + (dy / len) * wd, py - (dx / len) * wd]);
    }
    poly(c, L.concat(R.reverse()), col);
    c.strokeStyle = col;
    c.lineCap = 'round';
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 2.05 + (r() - 0.5) * 0.3;
      const len = h * (0.3 + r() * 0.12);
      const droop = len * (0.25 + 0.5 * Math.abs(Math.cos(a)));
      const ex = tx + Math.cos(a) * len;
      const ey = ty + Math.sin(a) * len * 0.7 + droop;
      const mx = tx + Math.cos(a) * len * 0.55;
      const my = ty + Math.sin(a) * len * 0.55 - len * 0.1;
      c.lineWidth = Math.max(1, h * 0.009);
      c.beginPath();
      c.moveTo(tx, ty);
      c.quadraticCurveTo(mx, my, ex, ey);
      c.stroke();
      c.lineWidth = Math.max(0.7, h * 0.0045);
      for (let j = 2; j <= 16; j++) {
        const t = j / 17;
        const px = (1 - t) ** 2 * tx + 2 * (1 - t) * t * mx + t * t * ex;
        const py = (1 - t) ** 2 * ty + 2 * (1 - t) * t * my + t * t * ey;
        const dx = 2 * (1 - t) * (mx - tx) + 2 * t * (ex - mx);
        const dy = 2 * (1 - t) * (my - ty) + 2 * t * (ey - my);
        const l = Math.hypot(dx, dy) || 1;
        const ux = dx / l;
        const uy = dy / l;
        const ll = len * 0.17 * (1 - t * 0.55);
        for (const s of [1, -1]) {
          c.beginPath();
          c.moveTo(px, py);
          c.lineTo(px + (ux * 0.3 - uy * s) * ll, py + (uy * 0.3 + ux * s) * ll + ll * 0.55);
          c.stroke();
        }
      }
    }
  };
  // round-canopy tree silhouette
  const tree = (c, x, y, h, col, r) => {
    c.fillStyle = col;
    c.fillRect(x - h * 0.03, y - h * 0.5, h * 0.06, h * 0.5);
    for (let i = 0; i < 7; i++) {
      disc(c, x + (r() - 0.5) * h * 0.55, y - h * (0.55 + r() * 0.35), h * (0.18 + r() * 0.14), col);
    }
  };
  // a run of buildings; returns the tops of the tallest for aviation lights
  const skyline = (c, r, o) => {
    const tops = [];
    let x = o.x0;
    while (x < o.x1) {
      const bw = lerp(o.minW, o.maxW, r());
      let bh = lerp(o.minH, o.maxH, Math.pow(r(), 1.7));
      if (r() < (o.towers || 0)) bh *= 1.55;
      const top = o.base - bh;
      c.fillStyle = o.fill;
      c.fillRect(x, top, bw, bh + 4);
      if (bh > o.maxH * 0.75) {
        c.fillRect(x + bw * 0.18, top - bh * 0.05, bw * 0.64, bh * 0.05 + 1);
        if (o.crown && r() < 0.6) {
          const rgb = r() < 0.5 ? [91, 130, 255] : [242, 207, 85];
          c.fillStyle = rgba(rgb, 0.9);
          c.fillRect(x + bw * 0.18, top - bh * 0.05, bw * 0.64, 1.5);
          glow(c, x + bw * 0.5, top - bh * 0.05, bw * 0.7, rgb, 0.35, 1, 0.35);
          c.fillStyle = o.fill;
        }
        if (r() < 0.7) {
          c.fillRect(x + bw * 0.5 - 0.8, top - bh * 0.16, 1.6, bh * 0.12);
          tops.push([x + bw * 0.5, top - bh * 0.16, r() * TAU]);
        }
      }
      if (o.glass && bw > o.maxW * 0.5 && r() < 0.5) {
        c.fillStyle = lin(c, x, top, x + bw, top, [[0, 'rgba(120,150,255,.0)'], [0.5, 'rgba(120,150,255,.07)'], [1, 'rgba(120,150,255,.0)']]);
        c.fillRect(x, top, bw, bh);
      }
      if (o.win) {
        const cw = o.win.w;
        const ch = o.win.h;
        const lit = o.win.density * (0.5 + r());
        for (let wy = top + ch * 1.5; wy < o.base - ch * 2; wy += ch * 2) {
          for (let wx = x + cw; wx < x + bw - cw * 1.2; wx += cw * 1.9) {
            if (r() < lit) {
              c.globalAlpha = o.win.a * (0.3 + r() * 0.7);
              c.fillStyle = r() < o.win.warm ? '#ffd28a' : '#bcd0ff';
              c.fillRect(wx, wy, cw, ch);
            }
          }
        }
        c.globalAlpha = 1;
      }
      x += bw + (r() < 0.25 ? r() * o.minW * 0.6 : 0);
    }
    return tops;
  };
  // container side: ribbed box with rails and shading
  const box = (c, x, y, w, h, col, light = 0.12, rib = 3.2) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
    c.fillStyle = `rgba(255,255,255,${light})`;
    c.fillRect(x, y, w, Math.max(1, h * 0.06));
    c.fillStyle = 'rgba(0,0,0,.28)';
    c.fillRect(x, y + h * 0.9, w, h * 0.1);
    c.fillStyle = 'rgba(0,0,0,.16)';
    const step = Math.max(2.2, rib);
    for (let rx = x + step; rx < x + w - 1; rx += step) c.fillRect(rx, y + h * 0.07, Math.max(0.7, step * 0.32), h * 0.82);
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.fillRect(x, y, Math.max(1, w * 0.012), h);
    c.fillRect(x + w - Math.max(1, w * 0.012), y, Math.max(1, w * 0.012), h);
  };
  const BOX = ['#233d63', '#8a3b2a', '#1f5f63', '#6d737c', '#b98b12', '#d8dbe0', '#3d4f7a', '#7c2f39', '#2f6b4a'];

  // polyline sampled from a cubic, with cumulative length (for things that travel along it)
  const cubicPts = (p0, p1, p2, p3, n = 120) => {
    const pts = [];
    let len = 0;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = (1 - t) ** 3;
      const b = 3 * (1 - t) ** 2 * t;
      const cc = 3 * (1 - t) * t * t;
      const d = t ** 3;
      const x = a * p0[0] + b * p1[0] + cc * p2[0] + d * p3[0];
      const y = a * p0[1] + b * p1[1] + cc * p2[1] + d * p3[1];
      if (i) len += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
      pts.push([x, y, len]);
    }
    return pts;
  };
  const at = (pts, u) => {
    const total = pts[pts.length - 1][2];
    const d = clamp(u, 0, 1) * total;
    let i = 1;
    while (i < pts.length - 1 && pts[i][2] < d) i++;
    const a = pts[i - 1];
    const b = pts[i];
    const k = (d - a[2]) / (b[2] - a[2] || 1);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  };

  // ---------- scenes ----------
  const SCENES = {

    // Thiruvananthapuram-style night: Ghats on the horizon, a lit skyline, a flyover with light trails
    city: {
      build(c, w, h, r) {
        const u = Math.min(w, h) / 900;
        const hz = h * 0.72;
        c.fillStyle = lin(c, 0, 0, 0, h, [[0, '#02040a'], [0.42, '#060d27'], [0.66, '#111f4c'], [0.74, '#2a2f5e'], [0.8, '#0b1126'], [1, '#03050c']]);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.7, hz, w * 0.62, [255, 138, 64], 0.22, 1, 0.32);
        glow(c, w * 0.28, hz, w * 0.5, [110, 130, 255], 0.12, 1, 0.3);
        stars(c, w, h, Math.round(260 * (w * h) / 1.4e6) + 80, r, hz * 0.8);

        const mr = 26 * u;
        const mx = w * 0.84;
        const my = h * 0.16;
        glow(c, mx, my, mr * 10, [160, 182, 255], 0.14);
        glow(c, mx, my, mr * 3.2, [220, 230, 255], 0.22);
        disc(c, mx, my, mr, lin(c, mx - mr, my - mr, mx + mr, my + mr, [[0, '#fffaf0'], [0.6, '#ecebe2'], [1, '#c9ccc0']]));

        ridge(c, w, h, hz - h * 0.025, h * 0.07, r, '#0d1838');
        c.fillStyle = lin(c, 0, hz - h * 0.08, 0, hz + h * 0.02, [[0, 'rgba(90,110,200,0)'], [1, 'rgba(90,110,200,.14)']]);
        c.fillRect(0, hz - h * 0.08, w, h * 0.1);
        ridge(c, w, h, hz + h * 0.004, h * 0.03, r, '#0a1331');

        skyline(c, r, { x0: -10, x1: w + 10, base: hz + h * 0.02, minH: h * 0.012, maxH: h * 0.05, minW: 9 * u, maxW: 30 * u, fill: '#0c1738', win: { w: 1.6 * u, h: 1.6 * u, density: 0.12, a: 0.55, warm: 0.7 } });
        c.fillStyle = lin(c, 0, hz - h * 0.04, 0, hz + h * 0.04, [[0, 'rgba(255,150,80,0)'], [1, 'rgba(255,150,80,.08)']]);
        c.fillRect(0, hz - h * 0.04, w, h * 0.08);

        const base = hz + h * 0.07;
        glow(c, w * 0.72, base - h * 0.08, w * 0.42, [255, 170, 100], 0.12, 1, 0.4);
        const lights = skyline(c, r, { x0: w * 0.34, x1: w * 1.02, base, minH: h * 0.05, maxH: h * 0.25, minW: 18 * u, maxW: 56 * u, towers: 0.22, crown: true, fill: '#0a1230', glass: true, win: { w: 2.2 * u, h: 2.6 * u, density: 0.2, a: 0.8, warm: 0.62 } });
        lights.push(...skyline(c, r, { x0: w * 0.48, x1: w * 1.02, base: base + h * 0.02, minH: h * 0.03, maxH: h * 0.15, minW: 22 * u, maxW: 60 * u, towers: 0.12, fill: '#060b1d', win: { w: 2.4 * u, h: 2.8 * u, density: 0.24, a: 0.9, warm: 0.7 } }));
        skyline(c, r, { x0: -10, x1: w * 0.4, base: base + h * 0.02, minH: h * 0.02, maxH: h * 0.07, minW: 16 * u, maxW: 44 * u, fill: '#070c1f', win: { w: 2 * u, h: 2.4 * u, density: 0.1, a: 0.6, warm: 0.8 } });

        c.fillStyle = lin(c, 0, base, 0, h, [[0, '#050913'], [1, '#020308']]);
        c.fillRect(0, base + h * 0.015, w, h);
        glow(c, w * 0.72, base + h * 0.02, w * 0.4, [255, 160, 90], 0.1, 1, 0.12);

        // flyover deck, pillars and sodium lamps
        const deck = Math.max(10, h * 0.028);
        const P = [[-w * 0.06, h * 0.97], [w * 0.32, h * 0.86], [w * 0.58, h * 0.8], [w * 1.06, h * 0.83]];
        const road = cubicPts(...P);
        for (let i = 4; i < road.length; i += 9) {
          const [x, y] = road[i];
          c.fillStyle = '#050816';
          c.fillRect(x - deck * 0.3, y, deck * 0.6, h - y);
          c.fillStyle = 'rgba(255,170,90,.05)';
          c.fillRect(x - deck * 0.3, y, deck * 0.12, h - y);
        }
        const path = (dy) => {
          const p = new Path2D();
          p.moveTo(P[0][0], P[0][1] + dy);
          p.bezierCurveTo(P[1][0], P[1][1] + dy, P[2][0], P[2][1] + dy, P[3][0], P[3][1] + dy);
          return p;
        };
        c.lineCap = 'butt';
        c.lineWidth = deck;
        c.strokeStyle = '#0a0f1f';
        c.stroke(path(0));
        c.lineWidth = deck * 0.28;
        c.strokeStyle = '#05070f';
        c.stroke(path(deck * 0.55));
        c.lineWidth = 1.2;
        c.strokeStyle = 'rgba(255,190,120,.35)';
        c.stroke(path(-deck * 0.5));
        for (let i = 6; i < road.length; i += 7) {
          const [x, y] = road[i];
          const top = y - deck * 0.5 - deck * 1.7;
          c.fillStyle = '#0b1020';
          c.fillRect(x - 0.8, top, 1.6, deck * 1.7);
          c.fillRect(x - 0.8, top, deck * 0.45, 1.6);
          glow(c, x + deck * 0.4, top + 2, deck * 2.6, [255, 172, 88], 0.42);
          glow(c, x + deck * 0.4, y - deck * 0.2, deck * 1.8, [255, 160, 80], 0.16, 1.6, 0.5);
        }

        // palms in the foreground
        const pc = '#010205';
        palm(c, w * 0.035, h * 1.02, h * 0.5, 0.1, pc, r);
        palm(c, w * 0.11, h * 1.02, h * 0.38, -0.12, pc, r);
        palm(c, w * 0.965, h * 1.02, h * 0.46, -0.08, pc, r);
        c.fillStyle = lin(c, 0, h * 0.86, 0, h, [[0, 'rgba(2,3,8,0)'], [1, 'rgba(2,3,8,.85)']]);
        c.fillRect(0, h * 0.86, w, h * 0.14);

        const lane = (dy, rgb, speed, dir, scale) => ({
          path: path(dy), rgb, speed: speed * u, dir,
          dash: [70, 160, 26, 110, 140, 260, 40, 90].map((d) => d * u * scale),
          lw: Math.max(1, deck * 0.07),
        });
        return {
          u, lights,
          lanes: [
            lane(-deck * 0.2, [255, 72, 52], 150, 1, 1.1),
            lane(-deck * 0.06, [255, 96, 60], 120, 1, 0.8),
            lane(deck * 0.1, [255, 236, 210], 190, -1, 1),
            lane(deck * 0.24, [255, 214, 160], 160, -1, 1.3),
          ],
        };
      },
      frame(c, w, h, t, s) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.lineCap = 'round';
        for (const L of s.lanes) {
          c.setLineDash(L.dash);
          c.lineDashOffset = L.dir * t * L.speed;
          c.lineWidth = L.lw * 5;
          c.strokeStyle = rgba(L.rgb, 0.08);
          c.stroke(L.path);
          c.lineWidth = L.lw * 2.2;
          c.strokeStyle = rgba(L.rgb, 0.28);
          c.stroke(L.path);
          c.lineWidth = L.lw;
          c.strokeStyle = rgba(L.rgb, 0.95);
          c.stroke(L.path);
        }
        c.setLineDash([]);
        for (const [x, y, ph] of s.lights) {
          const on = Math.sin(t * 2.2 + ph) > 0.55;
          glow(c, x, y, (on ? 7 : 3) * s.u + 2, [255, 40, 30], on ? 0.95 : 0.4);
        }
        c.restore();
      },
    },

    // an IT campus at sunrise: glass towers catching the light, palms, the campus road
    campus: {
      build(c, w, h, r) {
        const u = Math.min(w, h) / 900;
        const hz = h * 0.8;
        c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#0d1940'], [0.3, '#2e3f7e'], [0.55, '#9a6f8e'], [0.75, '#f0a874'], [0.92, '#ffd59a'], [1, '#ffe7bf']]);
        c.fillRect(0, 0, w, h);
        const sx = w * 0.7;
        const sy = hz - h * 0.03;
        glow(c, sx, sy, w * 0.75, [255, 190, 120], 0.45, 1, 0.55);
        glow(c, sx, sy, h * 0.22, [255, 222, 170], 0.7);
        disc(c, sx, sy, Math.max(14, 30 * u), '#fff6e0');

        for (let i = 0; i < 14; i++) {
          const cx = r() * w;
          const cy = h * (0.12 + r() * 0.42);
          const cw = w * (0.08 + r() * 0.18);
          const warm = cy > h * 0.3;
          glow(c, cx, cy, cw, warm ? [255, 196, 170] : [190, 170, 220], warm ? 0.32 : 0.22, 1, 0.13);
          glow(c, cx + cw * 0.2, cy - cw * 0.02, cw * 0.5, [255, 236, 214], warm ? 0.25 : 0.12, 1, 0.1);
        }

        ridge(c, w, h, hz - h * 0.02, h * 0.06, r, 'rgba(120,96,140,.55)', 0.6);
        ridge(c, w, h, hz + h * 0.01, h * 0.035, r, 'rgba(84,70,112,.75)', 0.6);

        // glass towers
        const towers = [];
        const spec = [
          [0.38, 0.11, 0.42], [0.47, 0.07, 0.3], [0.55, 0.13, 0.55], [0.67, 0.09, 0.36],
          [0.76, 0.12, 0.48], [0.87, 0.1, 0.33], [0.95, 0.12, 0.44], [0.02, 0.1, 0.2], [0.13, 0.08, 0.15], [0.24, 0.1, 0.24],
        ];
        const ground = h * 0.885;
        for (const [fx, fw, fh] of spec) {
          const x = w * fx;
          const bw = Math.max(40, w * fw * (w < h ? 1.4 : 1));
          const bh = h * fh;
          const top = ground - bh;
          c.fillStyle = lin(c, 0, top, 0, ground, [[0, '#1a2c63'], [0.35, '#3d4f8a'], [0.62, '#d29a83'], [0.8, '#8a6b7a'], [1, '#1b2340']]);
          c.fillRect(x, top, bw, bh);
          const lit = x + bw / 2 < sx ? 1 : -1;
          c.fillStyle = lin(c, x, 0, x + bw, 0, lit > 0
            ? [[0, 'rgba(0,0,10,.35)'], [0.7, 'rgba(0,0,10,.05)'], [1, 'rgba(255,214,160,.35)']]
            : [[0, 'rgba(255,214,160,.35)'], [0.3, 'rgba(0,0,10,.05)'], [1, 'rgba(0,0,10,.35)']]);
          c.fillRect(x, top, bw, bh);
          const fl = Math.max(5, 9 * u);
          c.fillStyle = 'rgba(255,255,255,.07)';
          for (let y = top + fl; y < ground; y += fl) c.fillRect(x, y, bw, 1);
          c.fillStyle = 'rgba(5,10,30,.18)';
          const ml = Math.max(8, 16 * u);
          for (let mx = x + ml; mx < x + bw; mx += ml) c.fillRect(mx, top, 1, bh);
          c.fillStyle = 'rgba(255,230,190,.55)';
          c.fillRect(lit > 0 ? x + bw - 2 : x, top, 2, bh);
          c.fillStyle = '#14193a';
          c.fillRect(x - 2, top - Math.max(3, 6 * u), bw + 4, Math.max(3, 6 * u));
          towers.push([x, top, bw, bh]);
        }

        c.fillStyle = lin(c, 0, ground - h * 0.03, 0, ground, [[0, 'rgba(255,200,150,0)'], [1, 'rgba(255,200,150,.18)']]);
        c.fillRect(0, ground - h * 0.03, w, h * 0.03);
        const tc = '#0c1424';
        for (let x = -20; x < w + 40; x += 40 * u + r() * 60 * u) {
          if (r() < 0.45) palm(c, x, ground + 2, h * (0.16 + r() * 0.1), (r() - 0.5) * 0.25, tc, r);
          else tree(c, x, ground + 2, h * (0.07 + r() * 0.06), tc, r);
        }
        c.fillStyle = lin(c, 0, ground, 0, ground + h * 0.03, [[0, '#14241f'], [1, '#0a1210']]);
        c.fillRect(0, ground, w, h * 0.03);

        const ry = ground + h * 0.03;
        c.fillStyle = lin(c, 0, ry, 0, h, [[0, '#2a2b33'], [0.4, '#1b1c22'], [1, '#0d0e12']]);
        c.fillRect(0, ry, w, h - ry);
        c.fillStyle = 'rgba(255,255,255,.35)';
        c.fillRect(0, ry, w, 1.5);
        glow(c, sx, ry + (h - ry) * 0.4, w * 0.4, [255, 190, 130], 0.28, 1, 0.12);
        c.fillStyle = 'rgba(255,240,220,.55)';
        const dash = 46 * u;
        for (let x = 0; x < w; x += dash * 2.2) c.fillRect(x, ry + (h - ry) * 0.5, dash, Math.max(2, 3 * u));

        const birds = Array.from({ length: 6 }, () => [r() * w, h * (0.18 + r() * 0.2), 0.4 + r() * 0.6, r() * TAU]);
        return { u, towers, birds, sx, sy };
      },
      frame(c, w, h, t, s) {
        c.save();
        for (const [x, top, bw, bh] of s.towers) {
          const band = ((t * 0.06 + x / w * 0.3) % 1.4) - 0.2;
          const by = top + bh * band;
          c.save();
          c.beginPath();
          c.rect(x, top, bw, bh);
          c.clip();
          c.fillStyle = lin(c, 0, by - bh * 0.12, 0, by + bh * 0.12, [[0, 'rgba(255,236,200,0)'], [0.5, 'rgba(255,236,200,.18)'], [1, 'rgba(255,236,200,0)']]);
          c.fillRect(x, by - bh * 0.12, bw, bh * 0.24);
          c.restore();
        }
        c.strokeStyle = 'rgba(20,24,40,.75)';
        c.lineWidth = Math.max(1, 1.6 * s.u);
        c.lineCap = 'round';
        for (const b of s.birds) {
          const x = ((b[0] + t * 18 * b[2] * s.u * 3) % (w + 80)) - 40;
          const y = b[1] + Math.sin(t * 0.7 + b[3]) * 6;
          const f = Math.sin(t * 7 * b[2] + b[3]) * 4 * s.u + 3 * s.u;
          const sz = 7 * s.u * (0.7 + b[2] * 0.6);
          c.beginPath();
          c.moveTo(x - sz, y - f);
          c.quadraticCurveTo(x - sz * 0.4, y - f * 0.2, x, y);
          c.quadraticCurveTo(x + sz * 0.4, y - f * 0.2, x + sz, y - f);
          c.stroke();
        }
        glow(c, s.sx, s.sy, h * 0.12, [255, 240, 210], 0.18 + Math.sin(t * 0.8) * 0.06);
        c.restore();
      },
    },

    // golden hour on the national highway: perspective road, ridges in haze, a container truck ahead
    linehaul: {
      build(c, w, h, r) {
        const u = Math.min(w, h) / 900;
        const hz = h * 0.56;
        c.fillStyle = lin(c, 0, 0, 0, h, [[0, '#24315f'], [0.28, '#8a5a6a'], [0.46, '#e79a5a'], [0.56, '#ffd28a'], [0.6, '#d48a52'], [1, '#2a1c1c']]);
        c.fillRect(0, 0, w, h);
        const sx = w * 0.6;
        glow(c, sx, hz, w * 0.8, [255, 196, 120], 0.55, 1, 0.42);
        glow(c, sx, hz - h * 0.01, h * 0.16, [255, 236, 196], 0.85);
        disc(c, sx, hz - h * 0.01, Math.max(10, 24 * u), '#fff4dc');
        for (let i = 0; i < 9; i++) glow(c, r() * w, h * (0.08 + r() * 0.3), w * (0.1 + r() * 0.16), [255, 200, 170], 0.22, 1, 0.12);

        ridge(c, w, h, hz - h * 0.01, h * 0.09, r, 'rgba(156,98,104,.65)');
        ridge(c, w, h, hz + h * 0.012, h * 0.06, r, 'rgba(104,62,78,.85)');
        ridge(c, w, h, hz + h * 0.03, h * 0.035, r, '#3d2633');
        c.fillStyle = lin(c, 0, hz - h * 0.06, 0, hz + h * 0.05, [[0, 'rgba(255,190,120,0)'], [1, 'rgba(255,190,120,.25)']]);
        c.fillRect(0, hz - h * 0.06, w, h * 0.11);

        const vx = w * 0.5;
        const vy = hz + h * 0.035;
        c.fillStyle = lin(c, 0, vy, 0, h, [[0, '#4a2e2a'], [1, '#1d1414']]);
        c.fillRect(0, vy, w, h - vy);
        for (let x = -10; x < w + 10; x += 12 * u + r() * 26 * u) {
          const side = x < vx ? -1 : 1;
          const k = Math.abs(x - vx) / (w * 0.5);
          if (k < 0.12) continue;
          tree(c, x, vy + k * h * 0.06, h * (0.04 + k * 0.12) * (0.6 + r() * 0.6), '#1d1418', r);
          void side;
        }
        const rw = w * 1.35;
        poly(c, [[vx - 3, vy], [vx + 3, vy], [vx + rw / 2, h], [vx - rw / 2, h]], lin(c, 0, vy, 0, h, [[0, '#6b4c46'], [0.25, '#3b2b2c'], [1, '#141012']]));
        c.globalCompositeOperation = 'lighter';
        poly(c, [[vx - 2, vy], [vx + 2, vy], [vx + rw * 0.12, h], [vx - rw * 0.04, h]], lin(c, 0, vy, 0, h, [[0, 'rgba(255,190,120,.45)'], [1, 'rgba(255,190,120,0)']]));
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = 'rgba(255,240,220,.7)';
        c.lineWidth = 1.2;
        for (const s of [-1, 1]) {
          c.beginPath();
          c.moveTo(vx + s * 2.6, vy);
          c.lineTo(vx + s * rw * 0.47, h);
          c.stroke();
        }

        for (let i = 1; i <= 12; i++) {
          const z = 1 / (i * 0.55);
          const y = vy + (h - vy) * (1 - z) * 0.98 + 2;
          const k = (y - vy) / (h - vy);
          const x = vx + rw * 0.53 * k + 8 * u;
          const ph = h * 0.32 * k + 6;
          c.fillStyle = '#1b1214';
          c.fillRect(x, y - ph, Math.max(1, 3 * k * u + 0.6), ph);
          c.fillRect(x - ph * 0.08, y - ph, ph * 0.12, Math.max(1, 2 * k));
        }

        // container truck, rear view, in the right lane
        const tk = 0.2;
        const ty = vy + (h - vy) * tk;
        const laneW = rw * tk;
        const tw = laneW * 0.36;
        const tx = vx + laneW * 0.21;
        const th = tw * 1.05;
        c.fillStyle = 'rgba(0,0,0,.35)';
        c.beginPath();
        c.ellipse(tx, ty + 1, tw * 0.7, tw * 0.06, 0, 0, TAU);
        c.fill();
        c.fillStyle = '#16100f';
        c.fillRect(tx - tw * 0.44, ty - th * 0.2, tw * 0.88, th * 0.2);
        box(c, tx - tw / 2, ty - th * 1.12, tw, th * 0.9, '#233d63', 0.18, 2.6 * u + 1);
        c.fillStyle = 'rgba(0,0,0,.35)';
        c.fillRect(tx - 0.6, ty - th * 1.1, 1.2, th * 0.86);
        c.fillStyle = 'rgba(210,220,235,.55)';
        for (const f of [-0.32, -0.12, 0.12, 0.32]) c.fillRect(tx + tw * f - 0.6, ty - th * 1.08, 1.2, th * 0.82);
        c.fillStyle = '#0d0a0a';
        c.fillRect(tx - tw * 0.48, ty - th * 0.24, tw * 0.96, th * 0.05);
        const tlw = tw * 0.12;
        for (const s of [-1, 1]) {
          c.fillStyle = '#ff3b2a';
          c.fillRect(tx + s * tw * 0.36 - tlw / 2, ty - th * 0.2, tlw, th * 0.05);
          glow(c, tx + s * tw * 0.36, ty - th * 0.18, tw * 0.3, [255, 60, 40], 0.6);
        }
        c.fillStyle = 'rgba(255,170,90,.35)';
        c.fillRect(tx - tw / 2, ty - th * 1.12, tw, Math.max(1, th * 0.03));
        const fx = vx + rw * 0.06 * 0.06;
        c.fillStyle = '#2a1f1f';
        c.fillRect(fx - 4 * u, vy + (h - vy) * 0.04 - 7 * u, 8 * u, 7 * u);
        glow(c, fx - 3 * u, vy + (h - vy) * 0.04 - 1.5 * u, 6 * u, [255, 60, 40], 0.7);
        glow(c, fx + 3 * u, vy + (h - vy) * 0.04 - 1.5 * u, 6 * u, [255, 60, 40], 0.7);

        return { u, vx, vy, rw, sx, hz };
      },
      frame(c, w, h, t, s) {
        c.save();
        c.fillStyle = 'rgba(255,236,200,.85)';
        const n = 14;
        for (let i = 0; i < n; i++) {
          const p = ((i / n + t * 0.07) % 1);
          const k = p * p;
          const k2 = Math.min(1, (p + 0.025) ** 2);
          const y0 = s.vy + (h - s.vy) * k;
          const y1 = s.vy + (h - s.vy) * k2;
          const hw0 = s.rw * k * 0.006 + 0.3;
          const hw1 = s.rw * k2 * 0.006 + 0.3;
          c.globalAlpha = clamp(p * 3, 0, 1) * 0.85;
          poly(c, [[s.vx - hw0, y0], [s.vx + hw0, y0], [s.vx + hw1, y1], [s.vx - hw1, y1]], 'rgba(255,236,200,.9)');
        }
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'lighter';
        const pulse = 0.5 + Math.sin(t * 0.9) * 0.15;
        for (const [k, rr, a] of [[0.35, 14, 0.12], [0.62, 26, 0.08], [0.9, 8, 0.16]]) {
          glow(c, lerp(s.sx, w - s.sx, k), lerp(s.hz, h - s.hz * 0.4, k), rr * s.u * 3, [255, 210, 150], a * pulse);
        }
        c.restore();
      },
    },

    // dusk heavy haul: a modular trailer carrying a pressure vessel, escort ahead with beacons
    project: {
      build(c, w, h, r) {
        const u = Math.min(w, h) / 900;
        const gy = h * 0.76;
        c.fillStyle = lin(c, 0, 0, 0, gy, [[0, '#151536'], [0.45, '#4c2f63'], [0.78, '#c2647a'], [0.92, '#f1a07a'], [1, '#ffc79a']]);
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.3, gy, w * 0.7, [255, 170, 120], 0.4, 1, 0.3);
        stars(c, w, h, 60, r, h * 0.35);
        for (let i = 0; i < 8; i++) glow(c, r() * w, h * (0.2 + r() * 0.35), w * (0.1 + r() * 0.2), [255, 150, 170], 0.18, 1, 0.1);

        ridge(c, w, h, gy - h * 0.04, h * 0.06, r, 'rgba(70,44,84,.75)', 0.5);
        // industrial skyline: stacks, a cooling tower and pylons
        const ic = '#2a1d3c';
        const plant = [];
        for (let x = w * 0.48; x < w; x += 30 * u + r() * 50 * u) {
          const bh = h * (0.03 + r() * 0.06);
          c.fillStyle = ic;
          c.fillRect(x, gy - h * 0.02 - bh, 26 * u + r() * 40 * u, bh + h * 0.02);
          if (r() < 0.45) {
            const sh = h * (0.12 + r() * 0.1);
            c.fillRect(x + 6 * u, gy - sh, 6 * u, sh);
            plant.push([x + 9 * u, gy - sh, r() * TAU]);
          }
        }
        const ctx0 = w * 0.62;
        const cw = 70 * u;
        const ch = h * 0.17;
        c.beginPath();
        c.moveTo(ctx0 - cw, gy);
        c.quadraticCurveTo(ctx0 - cw * 0.45, gy - ch * 0.6, ctx0 - cw * 0.6, gy - ch);
        c.lineTo(ctx0 + cw * 0.6, gy - ch);
        c.quadraticCurveTo(ctx0 + cw * 0.45, gy - ch * 0.6, ctx0 + cw, gy);
        c.closePath();
        c.fillStyle = ic;
        c.fill();
        c.strokeStyle = 'rgba(30,20,44,.9)';
        c.lineWidth = 1;
        for (const px of [w * 0.12, w * 0.36]) {
          const ph = h * 0.26;
          c.beginPath();
          c.moveTo(px - 18 * u, gy);
          c.lineTo(px, gy - ph);
          c.lineTo(px + 18 * u, gy);
          c.moveTo(px - 22 * u, gy - ph * 0.75);
          c.lineTo(px + 22 * u, gy - ph * 0.75);
          c.moveTo(px - 16 * u, gy - ph * 0.55);
          c.lineTo(px + 16 * u, gy - ph * 0.55);
          for (let k = 0; k < 6; k++) {
            const a = gy - (ph * k) / 6;
            const b = gy - (ph * (k + 1)) / 6;
            const wa = 18 * u * (1 - k / 6);
            const wb = 18 * u * (1 - (k + 1) / 6);
            c.moveTo(px - wa, a);
            c.lineTo(px + wb, b);
            c.moveTo(px + wa, a);
            c.lineTo(px - wb, b);
          }
          c.stroke();
        }
        c.beginPath();
        c.moveTo(0, gy - h * 0.2);
        c.quadraticCurveTo(w * 0.24, gy - h * 0.15, w * 0.36 - 22 * u, gy - h * 0.195);
        c.quadraticCurveTo(w * 0.6, gy - h * 0.14, w, gy - h * 0.2);
        c.stroke();

        c.fillStyle = lin(c, 0, gy, 0, h, [[0, '#3a2a3a'], [0.08, '#231a26'], [1, '#0e0b12']]);
        c.fillRect(0, gy, w, h - gy);
        c.fillStyle = 'rgba(255,200,170,.35)';
        c.fillRect(0, gy, w, 1);
        c.fillStyle = 'rgba(255,230,210,.25)';
        for (let x = 0; x < w; x += 70 * u) c.fillRect(x, gy + (h - gy) * 0.45, 36 * u, 2 * u + 1);

        // convoy, scaled to the frame width
        const S = Math.min(w / 1300, h / 700);
        const X = w * 0.5 - 520 * S;
        const Y = gy + (h - gy) * 0.28;
        const sil = '#0b0910';
        c.fillStyle = 'rgba(0,0,0,.45)';
        c.beginPath();
        c.ellipse(X + 520 * S, Y + 4 * S, 600 * S, 10 * S, 0, 0, TAU);
        c.fill();
        // modular trailer bed and axles
        c.fillStyle = '#17121a';
        c.fillRect(X + 80 * S, Y - 64 * S, 720 * S, 26 * S);
        c.fillStyle = 'rgba(255,190,150,.25)';
        c.fillRect(X + 80 * S, Y - 64 * S, 720 * S, 2 * S);
        for (let i = 0; i < 16; i++) {
          const ax = X + 108 * S + i * 44 * S;
          c.fillStyle = sil;
          c.fillRect(ax - 4 * S, Y - 40 * S, 8 * S, 18 * S);
          disc(c, ax, Y - 13 * S, 13 * S, '#08070a');
          disc(c, ax, Y - 13 * S, 5 * S, '#3a3540');
        }
        // pressure vessel with saddles and lashings
        const vx0 = X + 130 * S;
        const vlen = 620 * S;
        const vr = 92 * S;
        const vcy = Y - 64 * S - vr - 22 * S;
        c.fillStyle = '#17121a';
        for (const sx of [0.2, 0.5, 0.8]) poly(c, [[vx0 + vlen * sx - 46 * S, Y - 64 * S], [vx0 + vlen * sx + 46 * S, Y - 64 * S], [vx0 + vlen * sx + 30 * S, vcy + vr * 0.55], [vx0 + vlen * sx - 30 * S, vcy + vr * 0.55]], '#17121a');
        const steel = lin(c, 0, vcy - vr, 0, vcy + vr, [[0, '#ffd2c2'], [0.18, '#e2a4a8'], [0.42, '#8a7590'], [0.7, '#3e3550'], [1, '#1a1522']]);
        c.fillStyle = steel;
        c.beginPath();
        c.moveTo(vx0, vcy - vr);
        c.lineTo(vx0 + vlen, vcy - vr);
        c.ellipse(vx0 + vlen, vcy, vr * 0.55, vr, 0, -Math.PI / 2, Math.PI / 2);
        c.lineTo(vx0, vcy + vr);
        c.ellipse(vx0, vcy, vr * 0.55, vr, 0, Math.PI / 2, Math.PI * 1.5);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,240,230,.45)';
        c.fillRect(vx0, vcy - vr * 0.78, vlen, Math.max(1, 3 * S));
        c.strokeStyle = 'rgba(0,0,0,.25)';
        c.lineWidth = Math.max(1, 1.5 * S);
        for (const k of [0.25, 0.5, 0.75]) {
          c.beginPath();
          c.moveTo(vx0 + vlen * k, vcy - vr);
          c.lineTo(vx0 + vlen * k, vcy + vr);
          c.stroke();
        }
        c.strokeStyle = 'rgba(30,24,34,.85)';
        c.lineWidth = Math.max(1, 2.4 * S);
        for (const k of [0.12, 0.36, 0.64, 0.88]) {
          c.beginPath();
          c.moveTo(vx0 + vlen * k - 30 * S, Y - 64 * S);
          c.lineTo(vx0 + vlen * k, vcy - vr * 0.2);
          c.lineTo(vx0 + vlen * k + 30 * S, Y - 64 * S);
          c.stroke();
        }
        // prime mover facing right
        const cx = X + 820 * S;
        c.fillStyle = '#17121a';
        c.fillRect(cx - 30 * S, Y - 54 * S, 210 * S, 22 * S);
        poly(c, [[cx + 60 * S, Y - 54 * S], [cx + 60 * S, Y - 168 * S], [cx + 150 * S, Y - 168 * S], [cx + 176 * S, Y - 120 * S], [cx + 182 * S, Y - 54 * S]], '#1c1520');
        poly(c, [[cx + 128 * S, Y - 158 * S], [cx + 148 * S, Y - 158 * S], [cx + 168 * S, Y - 122 * S], [cx + 128 * S, Y - 122 * S]], lin(c, 0, Y - 160 * S, 0, Y - 120 * S, [[0, '#f0a08a'], [1, '#5a3a52']]));
        c.fillStyle = 'rgba(255,200,170,.4)';
        c.fillRect(cx + 60 * S, Y - 168 * S, 90 * S, 2 * S);
        c.fillStyle = '#0e0b12';
        c.fillRect(cx + 66 * S, Y - 196 * S, 6 * S, 30 * S);
        for (const ax of [cx + 10 * S, cx + 52 * S, cx + 150 * S]) {
          disc(c, ax, Y - 16 * S, 17 * S, '#08070a');
          disc(c, ax, Y - 16 * S, 7 * S, '#3a3540');
        }
        // escort car ahead
        const ex = X + 1080 * S;
        poly(c, [[ex, Y - 8 * S], [ex, Y - 42 * S], [ex + 30 * S, Y - 44 * S], [ex + 54 * S, Y - 70 * S], [ex + 120 * S, Y - 70 * S], [ex + 146 * S, Y - 44 * S], [ex + 170 * S, Y - 38 * S], [ex + 170 * S, Y - 8 * S]], '#1c1520');
        disc(c, ex + 36 * S, Y - 10 * S, 13 * S, '#08070a');
        disc(c, ex + 138 * S, Y - 10 * S, 13 * S, '#08070a');
        glow(c, ex + 172 * S, Y - 32 * S, 60 * S, [255, 230, 190], 0.5, 1.8, 0.45);
        glow(c, cx + 184 * S, Y - 70 * S, 70 * S, [255, 230, 190], 0.55, 1.8, 0.45);

        return {
          u, plant,
          beacons: [[ex + 88 * S, Y - 76 * S, 0], [cx + 110 * S, Y - 174 * S, 1.3], [cx + 74 * S, Y - 174 * S, 2.1], [X + 84 * S, Y - 70 * S, 0.7]],
          S,
        };
      },
      frame(c, w, h, t, s) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (const [x, y, ph] of s.beacons) {
          const k = Math.max(0, Math.sin(t * 6 + ph));
          disc(c, x, y, 4 * s.S + 1, `rgba(255,170,40,${0.4 + k * 0.6})`);
          glow(c, x, y, (40 + 30 * k) * s.S + 6, [255, 160, 30], 0.25 + k * 0.6);
        }
        for (const [x, y, ph] of s.plant) {
          const on = Math.sin(t * 1.8 + ph) > 0.4;
          glow(c, x, y, on ? 6 * s.u + 2 : 3, [255, 50, 40], on ? 0.9 : 0.35);
        }
        c.restore();
      },
    },

    // interstate at night: a winding highway through the hills, long-exposure traffic
    interstate: {
      build(c, w, h, r) {
        const u = Math.min(w, h) / 900;
        const hz = h * 0.42;
        c.fillStyle = lin(c, 0, 0, 0, h, [[0, '#02040b'], [0.3, '#08122e'], [0.42, '#1b2552'], [0.5, '#0b1128'], [1, '#04060e']]);
        c.fillRect(0, 0, w, h);
        stars(c, w, h, 240, r, hz * 0.9);
        glow(c, w * 0.22, hz, w * 0.5, [255, 150, 90], 0.22, 1, 0.22);
        for (let i = 0; i < 5; i++) {
          const y = hz + h * (0.02 + i * 0.07);
          ridge(c, w, h, y, h * (0.07 - i * 0.008), r, ['#141d3e', '#0f1733', '#0b1229', '#080d1f', '#050915'][i], 1);
          if (i < 2) {
            for (let k = 0; k < 40; k++) {
              const x = r() * w * 0.6;
              glow(c, x, y - r() * h * 0.02, 3 * u + 1, [255, 200, 130], 0.5 * r());
            }
          }
        }
        const pts = cubicPts([w * 0.4, hz + h * 0.08], [w * 1.02, hz + h * 0.15], [w * 0.12, hz + h * 0.36], [w * 1.04, h * 1.1], 180);
        const y0 = pts[0][1];
        const width = (y) => lerp(3 * u, Math.max(w, h) * 0.34, Math.pow(clamp((y - y0) / (h * 1.1 - y0), 0, 1), 1.3));
        const left = [];
        const right = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)];
          const b = pts[Math.min(pts.length - 1, i + 1)];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const l = Math.hypot(dx, dy) || 1;
          const hw = width(pts[i][1]) / 2;
          left.push([pts[i][0] - (dy / l) * hw, pts[i][1] + (dx / l) * hw]);
          right.push([pts[i][0] + (dy / l) * hw, pts[i][1] - (dx / l) * hw]);
        }
        poly(c, left.concat(right.slice().reverse()), lin(c, 0, y0, 0, h, [[0, '#2a2c3a'], [0.5, '#1a1b26'], [1, '#101118']]));
        for (let i = 8; i < right.length; i += 11) {
          const [x, y] = right[i];
          const ph = width(y) * 0.5 + 4 * u;
          c.fillStyle = '#05070f';
          c.fillRect(x - 0.7, y - ph, 1.4, ph);
          glow(c, x, y - ph, width(y) * 0.45 + 10 * u, [255, 168, 80], 0.4);
          glow(c, x - width(y) * 0.2, y, width(y) * 0.4 + 4, [255, 160, 80], 0.14, 1.4, 0.4);
        }
        c.strokeStyle = 'rgba(255,255,255,.18)';
        c.lineWidth = 1;
        for (const side of [left, right]) {
          c.beginPath();
          side.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
          c.stroke();
        }
        const lane = (k) => pts.map((p, i) => {
          const L = left[i];
          const R = right[i];
          return [lerp(L[0], R[0], k), lerp(L[1], R[1], k), p[2]];
        });
        const lanes = [lane(0.28), lane(0.4), lane(0.62), lane(0.76)];
        const cars = [];
        for (let i = 0; i < 64; i++) {
          const li = i % 4;
          cars.push({ li, u0: r(), sp: (li < 2 ? -1 : 1) * (0.045 + r() * 0.03), truck: r() < 0.25 });
        }
        return { u, lanes, cars, y0, width, H: h };
      },
      frame(c, w, h, t, s) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.lineCap = 'round';
        for (const car of s.cars) {
          const L = s.lanes[car.li];
          let p = (car.u0 + t * car.sp) % 1;
          if (p < 0) p += 1;
          const tail = 0.09;
          const head = car.sp > 0 ? p : 1 - p;
          const steps = 8;
          const col = car.sp > 0 ? [255, 236, 210] : [255, 58, 40];
          for (let k = 0; k < steps; k++) {
            const a = at(L, head - tail * (k / steps));
            const b = at(L, head - tail * ((k + 1) / steps));
            const wd = s.width(a[1]) * 0.02 + 0.4;
            const alpha = (1 - k / steps) * 0.8;
            c.strokeStyle = rgba(col, alpha * 0.25);
            c.lineWidth = wd * 3.5;
            c.beginPath();
            c.moveTo(a[0], a[1]);
            c.lineTo(b[0], b[1]);
            c.stroke();
            c.strokeStyle = rgba(col, alpha);
            c.lineWidth = wd;
            c.stroke();
          }
          if (car.truck) {
            const a = at(L, head - 0.004);
            glow(c, a[0], a[1], s.width(a[1]) * 0.05 + 2, [255, 170, 60], 0.6);
          }
        }
        c.restore();
      },
    },

    // container yard at sunrise: stacks in three depths, a reach stacker, high-mast lights, mist
    port: {
      build(c, w, h, r) {
        const u = Math.min(w, h) / 900;
        const hz = h * 0.58;
        c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#1d2b5a'], [0.4, '#6c6496'], [0.7, '#e59a86'], [0.88, '#ffc796'], [1, '#ffe2b8']]);
        c.fillRect(0, 0, w, h);
        const sx = w * 0.24;
        glow(c, sx, hz - h * 0.02, w * 0.75, [255, 190, 140], 0.5, 1, 0.45);
        glow(c, sx, hz - h * 0.02, h * 0.14, [255, 236, 200], 0.9);
        disc(c, sx, hz - h * 0.02, Math.max(10, 22 * u), '#fff6e2');

        // ship-to-shore cranes far away, hazy
        const fc = 'rgba(96,84,122,.65)';
        c.strokeStyle = fc;
        c.fillStyle = fc;
        c.lineWidth = Math.max(1, 3 * u);
        for (const fx of [0.55, 0.66, 0.77, 0.9]) {
          const x = w * fx;
          const ch = h * 0.26;
          c.beginPath();
          c.moveTo(x - 24 * u, hz);
          c.lineTo(x - 16 * u, hz - ch);
          c.moveTo(x + 24 * u, hz);
          c.lineTo(x + 16 * u, hz - ch);
          c.moveTo(x - 90 * u, hz - ch * 0.82);
          c.lineTo(x + 60 * u, hz - ch * 0.82);
          c.moveTo(x - 16 * u, hz - ch);
          c.lineTo(x - 90 * u, hz - ch * 0.82);
          c.moveTo(x + 16 * u, hz - ch);
          c.lineTo(x + 60 * u, hz - ch * 0.82);
          c.stroke();
        }
        c.fillStyle = lin(c, 0, hz - h * 0.1, 0, hz + h * 0.05, [[0, 'rgba(255,214,190,0)'], [1, 'rgba(255,214,190,.55)']]);
        c.fillRect(0, hz - h * 0.1, w, h * 0.15);
        c.fillStyle = lin(c, 0, hz, 0, h, [[0, '#b58a80'], [0.2, '#5a4652'], [1, '#1c1820']]);
        c.fillRect(0, hz, w, h - hz);
        c.globalCompositeOperation = 'lighter';
        poly(c, [[sx - w * 0.05, hz], [sx + w * 0.05, hz], [sx + w * 0.3, h], [sx - w * 0.2, h]], lin(c, 0, hz, 0, h, [[0, 'rgba(255,190,140,.35)'], [1, 'rgba(255,190,140,0)']]));
        c.globalCompositeOperation = 'source-over';

        // stacks: back, middle, front
        const rows = [
          { y: hz + h * 0.04, bw: 46 * u, bh: 14 * u, haze: 0.55, n: 26, max: 4 },
          { y: hz + h * 0.12, bw: 74 * u, bh: 24 * u, haze: 0.3, n: 16, max: 4 },
          { y: hz + h * 0.32, bw: 150 * u, bh: 50 * u, haze: 0, n: 8, max: 3 },
        ];
        for (const row of rows) {
          let x = -row.bw * r();
          while (x < w + row.bw) {
            const k = 1 + Math.floor(r() * row.max);
            for (let j = 0; j < k; j++) {
              const col = BOX[Math.floor(r() * BOX.length)];
              box(c, x, row.y - (j + 1) * row.bh, row.bw - 2, row.bh - 1, col, 0.14, row.bw / 22);
              if (row.haze) {
                c.fillStyle = `rgba(230,190,180,${row.haze})`;
                c.fillRect(x, row.y - (j + 1) * row.bh, row.bw - 2, row.bh - 1);
              }
              c.fillStyle = 'rgba(255,200,150,.18)';
              c.fillRect(x, row.y - (j + 1) * row.bh, Math.max(1, row.bw * 0.04), row.bh - 1);
            }
            x += row.bw + (r() < 0.25 ? row.bw * 0.6 : 0);
          }
          c.fillStyle = 'rgba(0,0,0,.25)';
          c.fillRect(0, row.y - 1, w, 3);
        }

        // high-mast lights
        const masts = [];
        for (const mx of [0.12, 0.46, 0.82]) {
          const x = w * mx;
          const top = hz - h * 0.2;
          c.fillStyle = '#2a2230';
          c.fillRect(x - 2 * u, top, 4 * u, hz + h * 0.1 - top);
          c.fillRect(x - 16 * u, top, 32 * u, 5 * u);
          masts.push([x, top + 3 * u]);
          glow(c, x, top + 4 * u, 40 * u, [255, 236, 200], 0.45);
        }

        // reach stacker in the middle row, boom raised with a box on the spreader
        const S = u * 1.1;
        const bx = w * 0.62;
        const by = hz + h * 0.215;
        const dark = '#16121a';
        disc(c, bx - 60 * S, by - 22 * S, 22 * S, '#0b0a0e');
        disc(c, bx + 50 * S, by - 22 * S, 22 * S, '#0b0a0e');
        poly(c, [[bx - 100 * S, by - 22 * S], [bx - 100 * S, by - 70 * S], [bx + 80 * S, by - 70 * S], [bx + 90 * S, by - 22 * S]], '#c7a018');
        poly(c, [[bx - 40 * S, by - 70 * S], [bx - 40 * S, by - 130 * S], [bx + 10 * S, by - 130 * S], [bx + 16 * S, by - 70 * S]], dark);
        c.fillStyle = 'rgba(255,214,170,.5)';
        c.fillRect(bx - 34 * S, by - 124 * S, 40 * S, 30 * S);
        c.strokeStyle = dark;
        c.lineCap = 'round';
        c.lineWidth = 16 * S;
        c.beginPath();
        c.moveTo(bx - 80 * S, by - 80 * S);
        c.lineTo(bx + 140 * S, by - 230 * S);
        c.stroke();
        box(c, bx + 40 * S, by - 300 * S, 210 * S, 62 * S, '#233d63', 0.2, 6 * S);
        c.fillStyle = '#e2b100';
        c.fillRect(bx + 40 * S, by - 238 * S, 210 * S, 6 * S);

        // wet apron shine in the foreground
        c.fillStyle = lin(c, 0, hz + h * 0.32, 0, h, [[0, 'rgba(20,16,24,.85)'], [1, 'rgba(10,8,12,1)']]);
        c.fillRect(0, hz + h * 0.32, w, h);
        c.fillStyle = 'rgba(226,177,0,.55)';
        for (let x = -20; x < w; x += 120 * u) poly(c, [[x, h * 0.96], [x + 60 * u, h * 0.96], [x + 74 * u, h], [x + 14 * u, h]], 'rgba(226,177,0,.45)');
        glow(c, sx + w * 0.05, h * 0.95, w * 0.3, [255, 180, 130], 0.25, 1, 0.15);

        const mist = Array.from({ length: 7 }, () => [r() * w, hz + h * (r() * 0.2 - 0.04), w * (0.2 + r() * 0.3), 0.3 + r() * 0.5]);
        const gulls = Array.from({ length: 5 }, () => [r() * w, h * (0.12 + r() * 0.25), 0.5 + r() * 0.6, r() * TAU]);
        return { u, mist, gulls, masts };
      },
      frame(c, w, h, t, s) {
        c.save();
        for (const [x0, y, rr, sp] of s.mist) {
          const x = ((x0 + t * 14 * sp * s.u * 2) % (w + rr * 2)) - rr;
          glow(c, x, y, rr, [255, 226, 214], 0.16, 1, 0.12);
        }
        c.strokeStyle = 'rgba(40,30,50,.7)';
        c.lineWidth = Math.max(1, 1.5 * s.u);
        c.lineCap = 'round';
        for (const g of s.gulls) {
          const x = ((g[0] + t * 22 * g[2] * s.u * 2) % (w + 80)) - 40;
          const y = g[1] + Math.sin(t * 0.6 + g[3]) * 8;
          const f = Math.sin(t * 6 * g[2] + g[3]) * 4 * s.u + 3 * s.u;
          const sz = 8 * s.u;
          c.beginPath();
          c.moveTo(x - sz, y - f);
          c.quadraticCurveTo(x - sz * 0.4, y - f * 0.2, x, y);
          c.quadraticCurveTo(x + sz * 0.4, y - f * 0.2, x + sz, y - f);
          c.stroke();
        }
        c.restore();
      },
    },

    // blue hour at a deep-water berth: gantry cranes over a loaded ship, a freighter overhead
    seaair: {
      build(c, w, h, r) {
        const u = Math.min(w, h) / 900;
        const hz = h * 0.62;
        c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#050b24'], [0.45, '#14275e'], [0.78, '#3d4685'], [0.92, '#a56f8a'], [1, '#f0a37e']]);
        c.fillRect(0, 0, w, h);
        stars(c, w, h, 120, r, hz * 0.55);
        glow(c, w * 0.3, hz, w * 0.6, [255, 160, 120], 0.3, 1, 0.2);
        c.fillStyle = lin(c, 0, hz, 0, h, [[0, '#2a3366'], [0.12, '#111b40'], [1, '#03060f']]);
        c.fillRect(0, hz, w, h - hz);
        c.fillStyle = 'rgba(255,170,140,.35)';
        c.fillRect(0, hz, w, 1);
        for (let i = 0; i < 70; i++) glow(c, r() * w * 0.5, hz - 1 - r() * 2, 2.5 * u + 0.8, [255, 210, 150], 0.7 * r());
        // breakwater and lighthouse
        c.fillStyle = '#0a0e1e';
        c.fillRect(0, hz + h * 0.03, w * 0.32, h * 0.012);
        c.fillRect(w * 0.31, hz + h * 0.005, 6 * u, h * 0.03);

        // ship
        const sy = hz + h * 0.11;
        const sx0 = w * 0.04;
        const sx1 = w * 0.74;
        const len = sx1 - sx0;
        const sh = h * 0.05;
        poly(c, [[sx0, sy - sh], [sx1, sy - sh], [sx1 - len * 0.035, sy + sh * 0.6], [sx0 + len * 0.02, sy + sh * 0.6]], '#0a0d1a');
        c.fillStyle = '#5a1a22';
        c.fillRect(sx0 + len * 0.02, sy + sh * 0.35, len * 0.94, sh * 0.25);
        const cbw = len / 30;
        const cbh = h * 0.022;
        for (let i = 0; i < 24; i++) {
          const n = 2 + Math.floor(r() * 4);
          for (let j = 0; j < n; j++) {
            const col = BOX[Math.floor(r() * BOX.length)];
            box(c, sx0 + len * 0.18 + i * cbw, sy - sh - (j + 1) * cbh, cbw - 1, cbh - 1, col, 0.1, cbw / 8);
            c.fillStyle = 'rgba(20,30,80,.42)';
            c.fillRect(sx0 + len * 0.18 + i * cbw, sy - sh - (j + 1) * cbh, cbw - 1, cbh - 1);
          }
        }
        const bx = sx0 + len * 0.06;
        poly(c, [[bx, sy - sh], [bx, sy - sh - h * 0.13], [bx + len * 0.09, sy - sh - h * 0.13], [bx + len * 0.09, sy - sh]], '#d7d9e0');
        c.fillStyle = 'rgba(30,40,80,.45)';
        c.fillRect(bx, sy - sh - h * 0.13, len * 0.09, h * 0.13);
        for (let k = 0; k < 5; k++) {
          for (let j = 0; j < 6; j++) {
            if (r() < 0.6) {
              c.fillStyle = 'rgba(255,214,150,.9)';
              c.fillRect(bx + len * 0.008 + j * len * 0.013, sy - sh - h * 0.12 + k * h * 0.022, len * 0.007, h * 0.008);
            }
          }
        }

        // gantry cranes on the quay (right)
        const cranes = [];
        const cc = '#0b0f1f';
        c.strokeStyle = cc;
        c.lineCap = 'square';
        for (const cx of [0.58, 0.74, 0.9]) {
          const x = w * cx;
          const top = hz - h * 0.36;
          const legW = 48 * u;
          c.lineWidth = Math.max(2, 6 * u);
          c.beginPath();
          c.moveTo(x - legW, sy + sh);
          c.lineTo(x - legW * 0.8, top + h * 0.1);
          c.moveTo(x + legW, sy + sh);
          c.lineTo(x + legW * 0.8, top + h * 0.1);
          c.moveTo(x - legW * 0.9, sy - h * 0.04);
          c.lineTo(x + legW * 0.9, sy - h * 0.04);
          c.stroke();
          c.lineWidth = Math.max(2, 7 * u);
          c.beginPath();
          c.moveTo(x - w * 0.2, top + h * 0.1);
          c.lineTo(x + legW * 2.2, top + h * 0.1);
          c.stroke();
          c.lineWidth = Math.max(1, 2.2 * u);
          c.beginPath();
          c.moveTo(x - legW * 0.8, top + h * 0.1);
          c.lineTo(x, top);
          c.lineTo(x + legW * 0.8, top + h * 0.1);
          c.moveTo(x, top);
          c.lineTo(x - w * 0.18, top + h * 0.1);
          c.moveTo(x, top);
          c.lineTo(x + legW * 2.1, top + h * 0.1);
          for (let k = 0; k < 8; k++) {
            const a = x - w * 0.2 + (k * w * 0.2) / 8;
            c.moveTo(a, top + h * 0.1);
            c.lineTo(a + w * 0.0125, top + h * 0.085);
          }
          c.stroke();
          c.fillStyle = '#c99a12';
          c.fillRect(x - legW * 0.7, top + h * 0.1, legW * 1.4, h * 0.035);
          cranes.push([x, top], [x - w * 0.2, top + h * 0.1]);
          glow(c, x - legW * 0.4, top + h * 0.14, 90 * u, [255, 236, 200], 0.4);
          c.globalCompositeOperation = 'lighter';
          poly(c, [[x - legW * 0.5, top + h * 0.135], [x - legW * 0.3, top + h * 0.135], [x + legW * 0.4, sy - sh], [x - legW * 1.6, sy - sh]], lin(c, 0, top + h * 0.13, 0, sy - sh, [[0, 'rgba(255,236,200,.28)'], [1, 'rgba(255,236,200,0)']]));
          c.globalCompositeOperation = 'source-over';
        }
        c.fillStyle = '#070a16';
        c.fillRect(w * 0.5, sy + sh * 0.6, w * 0.5, h * 0.02);

        const refl = [];
        for (const [x] of cranes) refl.push([x, 0.5]);
        for (let i = 0; i < 12; i++) refl.push([sx0 + len * (0.1 + r() * 0.8), 0.25]);
        return { u, cranes, refl, hz, sy, sh, lh: [w * 0.31 + 3 * u, hz + h * 0.003], ph: r() * 10 };
      },
      frame(c, w, h, t, s) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (const [x, a] of s.refl) {
          for (let k = 0; k < 10; k++) {
            const y = s.sy + s.sh + 6 + k * 7 * s.u * 2;
            if (y > h) break;
            const wob = Math.sin(t * 2.4 + k * 1.7 + x) * 8 * s.u;
            const len = (14 + Math.sin(t * 3 + k * 2.3 + x * 0.1) * 8) * s.u * 2;
            c.fillStyle = `rgba(255,214,160,${(a * (1 - k / 10) * 0.6).toFixed(3)})`;
            c.fillRect(x + wob - len / 2, y, len, Math.max(1, 1.5 * s.u));
          }
        }
        for (let i = 0; i < s.cranes.length; i++) {
          const [x, y] = s.cranes[i];
          const on = Math.sin(t * 2 + i * 1.3) > 0.5;
          glow(c, x, y, on ? 9 * s.u + 3 : 3, [255, 40, 30], on ? 0.95 : 0.4);
        }
        const beam = Math.max(0, Math.sin(t * 1.4));
        glow(c, s.lh[0], s.lh[1], 24 * s.u + 4, [255, 236, 190], 0.2 + beam * 0.7);

        // a four-engine freighter crossing high, nav lights and strobes
        const span = w + 400 * s.u;
        const px = ((t * 26 * s.u * 2 + s.ph * 100) % span) - 200 * s.u;
        const py = h * 0.18 + px * -0.04;
        const k = 1.5 * s.u;
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#0a1230';
        c.beginPath();
        c.ellipse(px, py, 34 * k, 3.2 * k, -0.04, 0, TAU);
        c.fill();
        poly(c, [[px + 2 * k, py], [px - 10 * k, py + 26 * k], [px - 15 * k, py + 26 * k], [px - 8 * k, py]], '#0a1230');
        poly(c, [[px + 2 * k, py], [px - 10 * k, py - 26 * k], [px - 15 * k, py - 26 * k], [px - 8 * k, py]], '#0a1230');
        poly(c, [[px - 28 * k, py], [px - 34 * k, py - 11 * k], [px - 37 * k, py - 11 * k], [px - 34 * k, py]], '#0a1230');
        c.globalCompositeOperation = 'lighter';
        glow(c, px - 13 * k, py + 26 * k, 5 * k, [80, 255, 120], 0.9);
        glow(c, px - 13 * k, py - 26 * k, 5 * k, [255, 50, 40], 0.9);
        if ((t * 1.2) % 1 < 0.08) {
          glow(c, px - 13 * k, py + 26 * k, 14 * k, [255, 255, 255], 0.9);
          glow(c, px - 13 * k, py - 26 * k, 14 * k, [255, 255, 255], 0.9);
        }
        if ((t * 0.9) % 1 < 0.1) glow(c, px, py - 3 * k, 8 * k, [255, 60, 40], 0.9);
        c.restore();
      },
    },

    // the telemetry view: an overhead night map with the route, geofences and a live pulse
    telemetry: {
      build(c, w, h, r) {
        const u = Math.min(w, h) / 900;
        c.fillStyle = '#050a16';
        c.fillRect(0, 0, w, h);
        const coast = [];
        for (let y = -10; y <= h + 10; y += 10) coast.push([w * 0.2 + Math.sin(y / h * 5 + 1) * w * 0.04 + Math.sin(y / h * 17) * w * 0.012 + (y / h) * w * 0.12, y]);
        poly(c, [[-10, -10], ...coast, [-10, h + 10]], lin(c, 0, 0, w * 0.3, 0, [[0, '#040c22'], [1, '#081736']]));
        c.strokeStyle = 'rgba(120,170,255,.35)';
        c.lineWidth = 1.5;
        c.beginPath();
        coast.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
        for (let k = 1; k <= 3; k++) {
          c.strokeStyle = `rgba(120,170,255,${0.08 / k})`;
          c.beginPath();
          coast.forEach(([x, y], i) => (i ? c.lineTo(x - k * 10 * u, y) : c.moveTo(x - k * 10 * u, y)));
          c.stroke();
        }
        c.strokeStyle = 'rgba(91,130,255,.06)';
        c.lineWidth = 1;
        const g = 48 * u + 16;
        for (let x = 0; x < w; x += g) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
        for (let y = 0; y < h; y += g) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        for (let i = 0; i < 900 * (w * h) / 1e6; i++) {
          const x = w * 0.25 + r() * w * 0.8;
          const y = r() * h;
          c.fillStyle = `rgba(160,180,230,${(r() * 0.12).toFixed(3)})`;
          c.fillRect(x, y, 1.2 + r() * 3 * u, 1.2 + r() * 3 * u);
        }
        c.lineCap = 'round';
        const roads = [];
        for (let i = 0; i < 9; i++) {
          const p0 = [w * (0.3 + r() * 0.7), -20];
          const p3 = [w * (0.3 + r() * 0.7), h + 20];
          roads.push([p0, [w * (0.2 + r() * 0.8), h * 0.33], [w * (0.2 + r() * 0.8), h * 0.66], p3]);
        }
        for (let i = 0; i < 6; i++) {
          const y0 = h * r();
          roads.push([[w * 0.22, y0], [w * 0.5, y0 + (r() - 0.5) * h * 0.3], [w * 0.8, y0 + (r() - 0.5) * h * 0.3], [w + 20, y0 + (r() - 0.5) * h * 0.2]]);
        }
        for (const R of roads) {
          c.strokeStyle = '#132042';
          c.lineWidth = 1.5 + r() * 2;
          c.beginPath();
          c.moveTo(...R[0]);
          c.bezierCurveTo(...R[1], ...R[2], ...R[3]);
          c.stroke();
        }
        const P = [[w * 0.38, h * 0.82], [w * 0.5, h * 0.5], [w * 0.62, h * 0.66], [w * 0.8, h * 0.24]];
        const route = cubicPts(...P, 160);
        c.strokeStyle = '#22336b';
        c.lineWidth = 6 * u + 3;
        c.beginPath();
        c.moveTo(...P[0]);
        c.bezierCurveTo(...P[1], ...P[2], ...P[3]);
        c.stroke();
        c.strokeStyle = 'rgba(91,130,255,.9)';
        c.lineWidth = 2 * u + 1;
        c.stroke();
        glow(c, P[3][0], P[3][1], 120 * u, [91, 130, 255], 0.18);
        const A = P[0];
        const B = P[3];
        c.setLineDash([8 * u + 2, 6 * u + 2]);
        for (const [x, y, col] of [[A[0], A[1], 'rgba(169,188,255,.7)'], [B[0], B[1], 'rgba(242,207,85,.85)']]) {
          c.strokeStyle = col;
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(x, y, 60 * u + 10, 0, TAU);
          c.stroke();
        }
        c.setLineDash([]);
        disc(c, A[0], A[1], 6 * u + 2, '#a9bcff');
        disc(c, B[0], B[1], 7 * u + 2, '#e2b100');
        const fs = Math.max(9, 12 * u);
        c.font = `500 ${fs}px "Martian Mono", ui-monospace, monospace`;
        c.fillStyle = 'rgba(169,188,255,.85)';
        c.fillText('CFS YARD', A[0] + 70 * u + 12, A[1] + fs * 0.35);
        c.fillStyle = 'rgba(242,207,85,.95)';
        c.fillText('PORT GATE 2', B[0] - 140 * u - 70, B[1] - 72 * u - 12);
        c.fillStyle = 'rgba(169,188,255,.45)';
        c.fillText('NH 66', w * 0.56, h * 0.56);
        c.fillStyle = 'rgba(120,170,255,.4)';
        c.fillText('ARABIAN SEA', w * 0.04, h * 0.5);
        c.font = `400 ${Math.max(8, 10 * u)}px "Martian Mono", ui-monospace, monospace`;
        c.fillStyle = 'rgba(160,180,230,.35)';
        for (let y = g; y < h; y += g * 3) c.fillText(`08°${String(Math.round(31 - y / h * 6)).padStart(2, '0')}′N`, 8, y - 4);
        return { u, route, B };
      },
      frame(c, w, h, t, s) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const p = (t * 0.09) % 1;
        for (let k = 0; k < 18; k++) {
          const [x, y] = at(s.route, p - k * 0.008);
          glow(c, x, y, (10 - k * 0.45) * s.u + 3, [242, 207, 85], 0.5 * (1 - k / 18));
        }
        const [hx, hy] = at(s.route, p);
        disc(c, hx, hy, 4 * s.u + 2, '#fff3c4');
        for (let i = 0; i < 2; i++) {
          const q = (t * 0.5 + i * 0.5) % 1;
          c.strokeStyle = `rgba(242,207,85,${(0.6 * (1 - q)).toFixed(3)})`;
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(s.B[0], s.B[1], (60 * s.u + 10) * (0.4 + q * 1.1), 0, TAU);
          c.stroke();
        }
        c.restore();
      },
    },
  };

  // ---------- mounting ----------
  const MAX_PIXELS = 8.3e6;
  const mount = (el) => {
    const def = SCENES[el.dataset.scene];
    const canvas = el.querySelector('canvas');
    if (!def || !canvas || el.querySelector('img')) return;
    const ctx = canvas.getContext('2d');
    const buffer = document.createElement('canvas');
    const bctx = buffer.getContext('2d');
    const seed = Number(el.dataset.seed || 0) + el.dataset.scene.length * 101;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let state = null;
    let visible = false;
    let raf = 0;
    const t0 = performance.now();

    const draw = (now) => {
      if (!state) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(buffer, 0, 0);
      if (def.frame) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        def.frame(ctx, w, h, reduce ? 4 : (now - t0) / 1000, state);
      }
    };
    const resize = () => {
      const box = el.getBoundingClientRect();
      const nw = Math.round(el.offsetWidth || box.width);
      const nh = Math.round(el.offsetHeight || box.height);
      if (!nw || !nh || (nw === w && nh === h)) return;
      w = nw;
      h = nh;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w * h * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (w * h));
      for (const cv of [canvas, buffer]) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = def.build(bctx, w, h, rng(seed));
      draw(performance.now());
    };
    const loop = (now) => {
      draw(now);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    let timer = 0;
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(resize, state ? 140 : 0);
    }).observe(el);
    if (def.frame && !reduce) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }, { rootMargin: '120px' }).observe(el);
    }
    resize();
  };

  const start = () => document.querySelectorAll('[data-scene]').forEach(mount);
  // the map labels use Martian Mono, so wait for it before painting
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start);
  else start();
})();
