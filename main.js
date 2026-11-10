// 2md55.arch — the moving parts. Plain browser JavaScript, no build step and no dependencies.
(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  function hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // run a callback while an element is on screen; returns a function telling whether it is visible now
  function whileVisible(el, onEnter, threshold = 0.15) {
    let visible = false, entered = false;
    new IntersectionObserver(es => { for (const e of es) { visible = e.isIntersecting; if (visible && !entered) { entered = true; onEnter?.(); } } }, { threshold }).observe(el);
    return () => visible;
  }

  // Trail colours by age, as in the header: pink near the figure, then violet, blue, cyan, green, red.
  const RAMP = [[255, 0, 60], [255, 0, 130], [255, 20, 200], [235, 40, 255], [130, 50, 255], [40, 90, 255], [0, 200, 255], [0, 235, 150], [60, 230, 40], [255, 60, 40]];
  const AGE = [1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9, 0];
  const ECHOES = AGE.length;

  // Scale a sprite and read its silhouette and brightness.
  function analyse(img, w, h) {
    const can = canvas(w, h), c = can.getContext('2d', { willReadFrequently: true });
    c.imageSmoothingQuality = 'high'; c.drawImage(img, 0, 0, can.width, can.height);
    const d = c.getImageData(0, 0, can.width, can.height).data, n = can.width * can.height;
    const alpha = new Uint8Array(n), lum = new Float32Array(n), vals = [];
    for (let i = 0; i < n; i++) { alpha[i] = d[i * 4 + 3]; lum[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255; if (alpha[i] > 140) vals.push(lum[i]); }
    vals.sort((a, b) => a - b);
    const lo = vals[Math.floor(vals.length * 0.04)] ?? 0, hi = vals[Math.floor(vals.length * 0.99)] ?? 1;
    for (let i = 0; i < n; i++) lum[i] = clamp((lum[i] - lo) / (hi - lo || 1));
    return { can, w: can.width, h: can.height, alpha, lum };
  }
  // The silhouette filled with one flat colour.
  function tinted(sp, color) {
    const can = canvas(sp.w, sp.h), c = can.getContext('2d'), id = c.createImageData(sp.w, sp.h), d = id.data;
    for (let i = 0; i < sp.alpha.length; i++) if (sp.alpha[i] > 128) { d[i * 4] = color[0]; d[i * 4 + 1] = color[1]; d[i * 4 + 2] = color[2]; d[i * 4 + 3] = 255; }
    c.putImageData(id, 0, 0);
    return can;
  }

  /* ───────────── 1 · hero: strobing diagram, hard cut, focus pull from the king to the name ───────────── */
  function hero() {
    const el = $('.hero'), flick = $('.hero__flick'), tag = $('.tag--pointer');
    const reveal = () => { document.body.classList.remove('is-intro'); setTimeout(() => el.classList.add('is-focus'), reduce ? 0 : 900); };
    if (reduce) reveal();
    else {
      const c = flick.getContext('2d'), S = flick.width, sq = S / 8;
      const START = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
      const OPEN = ['rnbqkbnr', 'pppp.ppp', '........', '....p...', '....P...', '.....N..', 'PPPP.PPP', 'RNBQKB.R'];
      const G = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
      const board = pos => {
        for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
          c.fillStyle = (r + f) & 1 ? '#a9a9a9' : '#ececec'; c.fillRect(f * sq, r * sq, sq, sq);
          const ch = pos[r][f]; if (ch === '.') continue;
          c.font = `${sq * 0.86}px "Apple Symbols", "Segoe UI Symbol", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = ch === ch.toUpperCase() ? '#fff' : '#000'; c.strokeStyle = '#000'; c.lineWidth = 1.5;
          if (ch === ch.toUpperCase()) c.strokeText(G[ch.toLowerCase()], f * sq + sq / 2, r * sq + sq / 2 + 2);
          c.fillText(G[ch.toLowerCase()], f * sq + sq / 2, r * sq + sq / 2 + 2);
        }
      };
      const tree = () => {
        c.fillStyle = '#f4f4f4'; c.fillRect(0, 0, S, S); c.strokeStyle = '#555'; c.lineWidth = 1.5;
        const rows = [[1, 0.21, 0.1], [3, 0.168, 0.39], [9, 0.084, 0.72]];
        const xs = rows.map(([n]) => Array.from({ length: n }, (_, i) => (S * (i + 0.5)) / n));
        for (let l = 0; l < 2; l++) xs[l].forEach((x, i) => { for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(x, S * (rows[l][2] + rows[l][1])); c.lineTo(xs[l + 1][i * 3 + j], S * rows[l + 1][2]); c.stroke(); } });
        rows.forEach(([, w, y], l) => xs[l].forEach(x => { const s = (S * w) / 8, x0 = x - s * 4, y0 = S * y; c.fillStyle = '#333'; c.fillRect(x0 - 1, y0 - 1, s * 8 + 2, s * 8 + 2); for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { c.fillStyle = (r + f) & 1 ? '#999' : '#fff'; c.fillRect(x0 + f * s, y0 + r * s, s, s); } }));
      };
      const seq = [START, OPEN, 'tree', START, OPEN, 'tree', START]; let i = 0;
      const tick = () => { if (i >= seq.length) return reveal(); seq[i] === 'tree' ? tree() : board(seq[i]); i++; setTimeout(tick, 100); };
      tick();
    }
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      tag.style.transform = `translate(${x + 14}px, ${y + 16}px)`; tag.textContent = `x: ${Math.round(x * 1.74)} y: ${Math.round(y * 2.2)}`;
    });
  }

  /* ───────────── 2 · wall of text and the datamosh pawn ───────────── */
  const WALL = 'A PAWN MOVES ONE SQUARE AT A TIME AND NEVER GOES BACK. NOBODY GUARDS IT, NOBODY FEARS IT. IT IS SPENT FIRST AND REMEMBERED LAST. ' +
    'BUT THE PAWN THAT REACHES THE FAR SIDE OF THE BOARD BECOMES ANY PIECE IT CHOOSES. EVERY BINARY IS A BOARD. EVERY FUNCTION IS A MOVE. ' +
    'READ THE METADATA, LEARN THE RULES, THEN REWRITE THEM. GAMEASSEMBLY.DLL · GLOBAL-METADATA.DAT · IL2CPP · LUAU · LUNE · 2MD55.ARCH · ';
  async function wall() {
    const el = $('.wall'), text = $('.wall__text'), fx = $('.wall__fx'), c = fx.getContext('2d');
    const rep = WALL.repeat(6);
    let lines = [], W = 0, H = 0, P = 0, sp = null, tints = [], mosh = null, moshAt = 0;
    const img = await load('assets/pieces/w_pawn.png');
    function layout() {
      const r = el.getBoundingClientRect(); W = r.width; H = r.height;
      fx.width = Math.round(W * DPR); fx.height = Math.round(H * DPR);
      const lh = parseFloat(getComputedStyle(text).lineHeight) || 30, count = Math.ceil(H / lh) + 1;
      text.textContent = ''; lines = [];
      for (let i = 0; i < count; i++) { const s = document.createElement('span'); s.dataset.full = rep.slice((i * 97) % WALL.length, ((i * 97) % WALL.length) + 180); s.textContent = typed >= i + 1 ? s.dataset.full : ''; text.append(s); lines.push(s); }
      P = clamp(H * 0.26, 110, 210); // pawn height in CSS px
      sp = analyse(img, (P * DPR * img.width) / img.height, P * DPR);
      tints = RAMP.map(col => tinted(sp, col)); mosh = canvas(sp.w, sp.h); moshAt = 0;
    }
    // the head of the trail: the pawn itself, black-and-white and eaten by glitch blocks
    function drawMosh(seed) {
      const m = mosh.getContext('2d'), id = m.createImageData(sp.w, sp.h), d = id.data, B = Math.max(3, Math.round(6 * DPR)), E = Math.max(1, Math.round(1.2 * DPR));
      const out = (x, y) => x < 0 || y < 0 || x >= sp.w || y >= sp.h || sp.alpha[y * sp.w + x] <= 128;
      for (let by = 0; by < sp.h; by += B) for (let bx = 0; bx < sp.w; bx += B) {
        const r1 = hash2(bx + seed * 131, by), r2 = hash2(bx, by + seed * 17), mode = r1 < (by < sp.h * 0.3 ? 0.88 : 0.3) ? 0 : r2 < 0.22 ? 2 : 1;
        for (let y = by; y < Math.min(sp.h, by + B); y++) for (let x = bx; x < Math.min(sp.w, bx + B); x++) {
          if (out(x, y)) continue;
          const edge = out(x - E, y) || out(x + E, y) || out(x, y - E) || out(x, y + E);
          const v = edge ? 250 : mode === 2 ? ((((x / 3) | 0) + ((y / 3) | 0)) & 1 ? 250 : 0) : mode * 250, o = (y * sp.w + x) * 4;
          d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
        }
      }
      m.putImageData(id, 0, 0);
    }

    // typing: about three quarters of a line every 50 ms once the section is on screen
    let typed = reduce ? 1e9 : 0, typing = false;
    const type = () => {
      if (!typing) return;
      typed += 0.74;
      lines.forEach((s, i) => { const k = clamp(typed - i); s.textContent = k >= 1 ? s.dataset.full : s.dataset.full.slice(0, Math.round(k * 90)); });
      if (typed < lines.length + 1) setTimeout(type, 50); else typing = false;
    };

    // the pawn: flies in from the left and brakes; then it follows the pointer. Its trail is its own last frames.
    const pos = { x: 0, y: 0, a: 0.3 }, target = { x: 0, y: 0 }, hist = [];
    let last = 0, sampleAt = 0, started = false;
    const isVisible = whileVisible(el, () => {
      started = true; typing = !reduce; type();
      pos.x = -P; pos.y = target.y = H * 0.56 + P / 2; target.x = W * 0.5;
      if (reduce) { pos.x = target.x; }
      requestAnimationFrame(frame);
    });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); target.x = clamp(e.clientX - r.left, P * 0.3, W - P * 0.3); target.y = clamp(e.clientY - r.top + P * 0.45, P, H - 10); });

    function frame(now) {
      if (!started) return;
      requestAnimationFrame(frame);
      if (!isVisible()) { last = now; return; }
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const k = 1 - Math.pow(0.012, dt), px = pos.x;
      pos.x = lerp(pos.x, target.x, k); pos.y = lerp(pos.y, target.y, k);
      const vx = dt ? (pos.x - px) / dt : 0;
      pos.a = lerp(pos.a, 0.3 + clamp(vx * 0.0006, -0.35, 0.5), 1 - Math.pow(0.02, dt)); // leans into the move
      if (now - sampleAt >= 50) { sampleAt = now; hist.unshift({ x: pos.x, y: pos.y, a: pos.a }); hist.length = Math.min(hist.length, ECHOES); }
      if (now - moshAt >= 100) { moshAt = now; drawMosh((now / 100) | 0); }

      const pw = sp.w / DPR;
      c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
      // the text right of the pawn goes dark
      const g = c.createLinearGradient(pos.x - 40, 0, pos.x + 360, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.78)'); g.addColorStop(0.5, 'rgba(0,0,0,0.66)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(pos.x - 40, pos.y - P - 10, 400, P + 26);
      const stamp = (im, p) => { c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.drawImage(im, -pw / 2, -P, pw, P); c.restore(); };
      c.imageSmoothingEnabled = false;
      for (let i = hist.length - 1; i >= 0; i--) stamp(tints[AGE[i]], hist[i]);
      stamp(mosh, pos);
      // tracker frame and labels
      const xs = [pos, ...hist].map(p => p.x), x0 = Math.max(0, Math.min(...xs) - pw * 0.6), x1 = Math.max(...xs) + pw * 0.75, y0 = pos.y - P - 6;
      c.strokeStyle = 'rgba(226,58,58,0.9)'; c.lineWidth = 0.8; c.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, P + 18);
      c.font = `10px ${MONO}`; c.textBaseline = 'alphabetic';
      const label = (s, x, y) => { const w = c.measureText(s).width; c.fillStyle = '#000'; c.fillRect(x - 2, y - 10, w + 4, 13); c.fillStyle = '#fff'; c.fillText(s, x, y); };
      label(`x: ${Math.round(x0 * 1.74)} y: ${Math.round(y0 * 2.2)}`, x0 + 3, y0 - 3);
      if (x1 - x0 > 190) label(`x: ${Math.round(pos.x * 1.74)} y: ${Math.round(pos.y * 2.2)}`, x1 - 86, y0 - 3);
    }
    layout();
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 150); });
  }

  /* ───────────── 3 · projects: each figure strobes through fills ───────────── */
  const MODES = ['letters', 'dots', 'glyphs', 'mosaic', 'pixel', 'hatch', 'pink'];
  const PASTEL = [[255, 226, 236], [226, 255, 236], [230, 234, 255], [255, 248, 218], [255, 255, 255]];
  async function pieces() {
    const thumbs = await Promise.all(['w_pawn', 'w_rook', 'w_king', 'w_queen', 'w_bishop', 'w_knight_a', 'b_king'].map(n => load(`assets/pieces/${n}.png`))).catch(() => []);
    const BG = ['#46464a', '#787670', '#a5a096', '#604e3e', '#3a4a62', '#8c606e', '#282828', '#bebab2', '#546454', '#6e6e82'];
    for (const cv of $$('canvas[data-sprite]')) {
      const img = await load(cv.dataset.sprite).catch(() => null); if (!img) continue;
      const c = cv.getContext('2d');
      let sp, k, hover = false, mode = 0;
      const size = () => {
        const cssH = innerWidth <= 760 ? Math.min(innerHeight * 0.46, 380) : Math.min(innerHeight * 0.62, 520);
        cv.height = Math.round(cssH * DPR); cv.width = Math.round((cv.height * img.width) / img.height);
        sp = analyse(img, cv.width, cv.height); k = (cssH / 370) * DPR; draw();
      };
      const sample = (x, y) => { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= sp.w || yi >= sp.h) return -1; const i = yi * sp.w + xi; return sp.alpha[i] > 140 ? sp.lum[i] : -1; };
      function draw() {
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
        if (hover) { c.imageSmoothingEnabled = true; c.drawImage(img, 0, 0, cv.width, cv.height); return; }
        const m = MODES[mode % MODES.length];
        if (m === 'pixel') {
          const cell = 13 * k, sw = Math.max(1, Math.round(cv.width / cell)), sh = Math.max(1, Math.round(cv.height / cell)), t = canvas(sw, sh), tc = t.getContext('2d');
          tc.drawImage(img, 0, 0, sw, sh);
          const id = tc.getImageData(0, 0, sw, sh), d = id.data;
          for (let i = 0; i < d.length; i += 4) { d[i + 3] = d[i + 3] > 110 ? 255 : 0; const p = PASTEL[Math.floor(hash2(i, 7) * PASTEL.length)]; for (let j = 0; j < 3; j++) d[i + j] = clamp(lerp(d[i + j] * 1.06, p[j], 0.3), 0, 255); }
          tc.putImageData(id, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(t, 0, 0, cv.width, cv.height); return;
        }
        const cell = { letters: 9, dots: 7.2, glyphs: 11, mosaic: 13, hatch: 5.4, pink: 8.6 }[m] * k;
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        let row = 0;
        for (let y = cell / 2; y < cv.height; y += cell, row++) for (let x = cell / 2, col = 0; x < cv.width; x += cell, col++) {
          const l = sample(x, y); if (l < 0) continue;
          const h = hash2(col * 3 + 1, row * 7 + 2), g = v => `rgb(${v},${v},${v})`;
          if (m === 'dots') { c.fillStyle = '#f6f6f6'; c.beginPath(); c.arc(x, y, cell * 0.47 * (0.35 + 0.65 * Math.sqrt(l)), 0, 6.283); c.fill(); }
          else if (m === 'letters') {
            c.fillStyle = g(Math.round(lerp(96, 250, 0.25 + 0.75 * l))); c.fillRect(x - cell / 2 + 0.4, y - cell / 2 + 0.4, cell - 0.8, cell - 0.8);
            c.font = `bold ${cell * 0.9}px ${MONO}`; c.fillStyle = '#111'; c.fillText('EAKNHWXYZT'[Math.floor(h * 10)], x, y + cell * 0.33);
          } else if (m === 'hatch') { c.font = `${cell * 1.45}px ${MONO}`; c.fillStyle = g(Math.round(215 * (0.22 + 0.78 * l))); c.fillText('|/!|1l\\I:|'[Math.floor(h * 10)], x, y + cell * 0.5); }
          else if (m === 'pink') {
            const v = 0.5 + 0.5 * l; c.fillStyle = `rgb(${224 * v | 0},${86 * v | 0},${150 * v | 0})`; c.fillRect(x - cell / 2 + 0.5, y - cell / 2 + 0.5, cell - 1, cell - 1);
            c.strokeStyle = 'rgb(63,24,42)'; c.lineWidth = 0.9 * k; c.beginPath(); c.arc(x, y, cell * 0.22, 0, 6.283); c.stroke();
          } else if (m === 'mosaic') {
            const i = Math.floor(h * 10); c.globalAlpha = 0.4 + 0.6 * l; c.fillStyle = BG[i]; c.fillRect(x - cell / 2 + 0.5, y - cell / 2 + 0.5, cell - 1, cell - 1);
            const t = thumbs[i % thumbs.length]; if (t) { const th = (cell - 1) * 0.86, tw = (t.width * th) / t.height; c.drawImage(t, x - tw / 2, y - cell / 2 + 0.5 + (cell - 1) * 0.08, tw, th); }
            c.globalAlpha = 1;
          } else { const v = 0.45 + 0.55 * l; c.font = `${cell * 1.12}px "Apple Symbols", "Segoe UI Symbol", serif`; c.fillStyle = `rgb(${186 * v | 0},${196 * v | 0},${98 * v | 0})`; c.fillText('♙♘♗♖♕♔♟♞♝♜♛♚◎⊕'[Math.floor(h * 14)], x, y + cell * 0.4); }
        }
      }
      const fig = cv.closest('.piece');
      fig.addEventListener('pointerenter', () => { hover = true; draw(); });
      fig.addEventListener('pointerleave', () => { hover = false; draw(); });
      fig.addEventListener('focusin', () => { hover = true; draw(); });
      fig.addEventListener('focusout', () => { hover = false; draw(); });
      const isVisible = whileVisible(cv);
      size();
      if (reduce) { mode = 1; draw(); } // one calm fill, no strobe
      else setInterval(() => { if (isVisible() && !hover) { mode++; draw(); } }, 200);
      let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(size, 200); });
    }
  }

  /* ───────────── 4 · lineup and 5 · contact ───────────── */
  function lineup() { const ul = $('.lineup'); whileVisible(ul, () => ul.classList.add('is-on'), 0.4); }

  // A hand turned and cropped so the whole hand sits inside its box and only the arm leaves through the frame edge.
  function handTile(mask, { rot, flip, part, aspect, pad = 0.1, grow = [0.5, 0.5] }) {
    const D = 2 * Math.ceil(Math.hypot(mask.width, mask.height));
    const place = (cv, sy, sh) => { const x = cv.getContext('2d', { willReadFrequently: true }); x.translate(D / 2, D / 2); x.rotate((rot * Math.PI) / 180); if (flip) x.scale(-1, 1); x.drawImage(mask, 0, sy, mask.width, sh, -mask.width / 2, -mask.height / 2 + sy, mask.width, sh); return x; };
    const full = canvas(D, D); place(full, 0, mask.height);
    const d = place(canvas(D, D), part[0] * mask.height, (part[1] - part[0]) * mask.height).getImageData(0, 0, D, D).data;
    let x0 = D, y0 = D, x1 = 0, y1 = 0;
    for (let y = 0; y < D; y += 2) for (let x = 0; x < D; x += 2) if (d[(y * D + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const p = pad * Math.max(x1 - x0, y1 - y0); x0 -= p; y0 -= p;
    let w = x1 - x0 + p, h = y1 - y0 + p;
    if (w / h < aspect) { const nw = h * aspect; x0 -= (nw - w) * grow[0]; w = nw; } else { const nh = w / aspect; y0 -= (nh - h) * grow[1]; h = nh; }
    const tile = canvas(w, h); tile.getContext('2d').drawImage(full, x0, y0, w, h, 0, 0, tile.width, tile.height);
    return tile;
  }
  async function contact() {
    const el = $('.contact');
    const isVisible = whileVisible(el, () => el.classList.add('is-on'), 0.25);
    for (const cv of $$('canvas[data-hand]')) {
      const mask = await load(cv.dataset.hand).catch(() => null); if (!mask) continue;
      const r = cv.getBoundingClientRect(), W = Math.max(60, Math.round(r.width)), H = Math.max(60, Math.round(r.height));
      cv.width = W; cv.height = H;
      const top = cv.dataset.hand.includes('hand_top');
      const tile = handTile(mask, { rot: Number(cv.dataset.rot), flip: 'flip' in cv.dataset, part: top ? [0.36, 1] : [0, 0.6], aspect: W / H, grow: top ? [0.3, 0.5] : [0.45, 0.4] });
      const c = cv.getContext('2d'), q = 2, nw = Math.ceil(W / q), nh = Math.ceil(H / q), noise = canvas(nw, nh), nc = noise.getContext('2d'), id = nc.createImageData(nw, nh);
      let t = 0;
      const draw = () => { // television static, clipped to the hand
        t++;
        for (let i = 0, p = 0; i < id.data.length; i += 4, p++) { const hsh = hash2(p + t * 7919, t * 31), v = hsh < 0.3 ? 250 : hsh < 0.6 ? 215 : hsh < 0.85 ? 180 : 140; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
        nc.putImageData(id, 0, 0);
        c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H); c.imageSmoothingEnabled = false; c.drawImage(noise, 0, 0, W, H);
        c.globalCompositeOperation = 'destination-in'; c.imageSmoothingEnabled = true; c.drawImage(tile, 0, 0, W, H);
      };
      draw();
      if (!reduce) setInterval(() => { if (isVisible()) draw(); }, 100);
    }
    // Discord handle: copy on click, announce the result
    const btn = $('#discord'), status = $('#discord-status');
    btn?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.handle); status.textContent = `copied ${btn.dataset.handle}`; }
      catch { status.textContent = `Discord: ${btn.dataset.handle}`; }
    });
  }
  // live star counts from the GitHub API; the numbers in the markup stay if the request fails
  function stars() {
    for (const el of $$('[data-stars]')) {
      fetch(`https://api.github.com/repos/2md55nmxkw-arch/${el.dataset.stars}`).then(r => (r.ok ? r.json() : null)).then(j => { if (j && Number.isFinite(j.stargazers_count)) el.textContent = `★ ${j.stargazers_count}`; }).catch(() => {});
    }
  }

  hero();
  wall().catch(console.error);
  pieces().catch(console.error);
  lineup();
  contact().catch(console.error);
  stars();
})();
