// 2md55.arch vs the binary — the moving parts. Plain browser JavaScript, no build step, no dependencies.
//
// On wide screens the page is a film: the stage is pinned and the scroll position is a playhead. Every frame the
// playhead is eased towards the real scroll position and each scene reads it to place itself, so motion stays
// smooth even on a notchy mouse wheel. Only transforms and opacity change while scrolling; everything expensive
// (strobe fills, noise, glitch blocks, tinted silhouettes) is drawn once up front and then just blitted.
(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 1024px) and (min-height: 600px)');
  const FILM = !reduce && wide.matches;
  wide.addEventListener('change', () => { if (!reduce) location.reload(); }); // the two layouts are set up differently, so switch cleanly
  const root = document.documentElement;
  if (FILM) root.classList.add('film-on');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const span = (v, a, b) => clamp((v - a) / (b - a));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const set = (el, prop, v) => { if (el['_' + prop] !== v) { el['_' + prop] = v; el.style[prop] = v; } }; // write a style only when it changes
  const flag = (el, cls, on) => { const k = '_' + cls; if (el[k] !== on) { el[k] = on; el.classList.toggle(cls, on); } }; // same for a class
  function hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function onScreen(el, cb, threshold = 0.2) {
    let v = false, first = true;
    new IntersectionObserver(es => { for (const e of es) { v = e.isIntersecting; if (v && first) { first = false; cb?.(); } } }, { threshold }).observe(el);
    return () => v;
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
    for (let i = 0; i < n; i++) { alpha[i] = d[i * 4 + 3]; lum[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255; if (alpha[i] > 140 && i % 3 === 0) vals.push(lum[i]); }
    vals.sort((a, b) => a - b);
    const lo = vals[Math.floor(vals.length * 0.04)] ?? 0, hi = vals[Math.floor(vals.length * 0.99)] ?? 1;
    for (let i = 0; i < n; i++) lum[i] = clamp((lum[i] - lo) / (hi - lo || 1));
    return { can, w: can.width, h: can.height, alpha, lum };
  }
  function tinted(sp, col) { // the silhouette in one flat colour
    const can = canvas(sp.w, sp.h), c = can.getContext('2d'), id = c.createImageData(sp.w, sp.h), d = id.data;
    for (let i = 0; i < sp.alpha.length; i++) if (sp.alpha[i] > 128) { d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255; }
    c.putImageData(id, 0, 0);
    return can;
  }
  // the head of a trail: the piece itself, black-and-white and eaten by glitch blocks (a handful of variants, drawn once)
  function moshFrames(sp, n = 6) {
    const B = Math.max(3, Math.round(sp.h / 26)), E = Math.max(1, Math.round(sp.h / 130));
    const out = (x, y) => x < 0 || y < 0 || x >= sp.w || y >= sp.h || sp.alpha[y * sp.w + x] <= 128;
    return Array.from({ length: n }, (_, seed) => {
      const can = canvas(sp.w, sp.h), c = can.getContext('2d'), id = c.createImageData(sp.w, sp.h), d = id.data;
      for (let by = 0; by < sp.h; by += B) for (let bx = 0; bx < sp.w; bx += B) {
        const r1 = hash2(bx + seed * 131, by), r2 = hash2(bx, by + seed * 17), mode = r1 < (by < sp.h * 0.3 ? 0.88 : 0.3) ? 0 : r2 < 0.22 ? 2 : 1;
        for (let y = by; y < Math.min(sp.h, by + B); y++) for (let x = bx; x < Math.min(sp.w, bx + B); x++) {
          if (out(x, y)) continue;
          const edge = out(x - E, y) || out(x + E, y) || out(x, y - E) || out(x, y + E);
          const v = edge ? 250 : mode === 2 ? ((((x / 3) | 0) + ((y / 3) | 0)) & 1 ? 250 : 0) : mode * 250, o = (y * sp.w + x) * 4;
          d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
        }
      }
      c.putImageData(id, 0, 0);
      return can;
    });
  }

  /* ───────────── the game: Légal's mate on the small board ───────────── */
  const MOVES = ['e2e4', 'e7e5', 'g1f3', 'd7d6', 'f1c4', 'c8g4', 'b1c3', 'g7g6', 'f3e5', 'g4d1', 'c4f7', 'e8e7', 'c3d5'];
  const SAN = ['1. e4', '1… e5', '2. Nf3', '2… d6', '3. Bc4', '3… Bg4', '4. Nc3', '4… g6', '5. Nxe5!!', '5… Bxd1', '6. Bxf7+', '6… Ke7', '7. Nd5#'];
  const board = (() => {
    const el = $('.mini'), state = $('.rail__state'), Q = 22;
    const xy = sq => [(sq.charCodeAt(0) - 97) * Q, (8 - Number(sq[1])) * Q];
    const file = { r: 'w_rook', n: 'w_knight_a', b: 'w_bishop', q: 'w_queen', k: 'w_king', p: 'w_pawn' };
    const pieces = [], at = {};
    'rnbqkbnr'.split('').forEach((t, f) => {
      for (const [rank, type, col] of [[1, t, 'w'], [2, 'p', 'w'], [7, 'p', 'b'], [8, t, 'b']]) {
        const i = document.createElement('i'); i.className = `mp ${col}`; i.style.setProperty('--m', `url(assets/pieces/${file[type]}.png)`);
        const sq = 'abcdefgh'[f] + rank; at[sq] = pieces.length; pieces.push({ el: i, sq: [sq] }); el.append(i);
      }
    });
    // where every piece stands after each ply (null once captured)
    for (const m of MOVES) {
      const from = m.slice(0, 2), to = m.slice(2), id = at[from], hit = at[to];
      for (const [i, p] of pieces.entries()) p.sq.push(i === hit ? null : i === id ? to : p.sq.at(-1));
      delete at[from]; at[to] = id;
    }
    const marks = [0, 1].map(() => { const i = document.createElement('i'); i.className = 'sq'; el.prepend(i); return i; });
    let ply = -1;
    return n => {
      if (n === ply) return; ply = n;
      for (const p of pieces) {
        const sq = p.sq[n]; p.el.classList.toggle('x', !sq);
        if (sq) { const [x, y] = xy(sq); p.el.style.transform = `translate(${x}px,${y}px)`; }
      }
      marks.forEach((m, i) => { m.style.opacity = n ? '' : '0'; if (n) { const [x, y] = xy(MOVES[n - 1].slice(i * 2, i * 2 + 2)); m.style.transform = `translate(${x}px,${y}px)`; } });
      el.classList.toggle('is-mate', n === MOVES.length);
      state.textContent = n ? `after ${SAN[n - 1]}` : 'starting position';
    };
  })();

  /* ───────────── timeline, in screens of scroll ───────────── */
  const T = {
    push: [1.0, 1.5],                  // title slides away to the right
    wall: [0.98, 3.4], type: [1.02, 2.5], pawn: [1.3, 2.95], note: 2.5,
    flash: [3.2, 3.4],                 // two frames of a close-up, then a hard cut
    cuts: [3.4, 4.5, 5.9, 7.0, 8.4, 9.5, 11.1], // project, reply, project, reply, project, reply
    wipe: 0.17,                        // the blades close this long before a reply and open this long after it
    whip: [10.75, 11.1],               // whip pan to the lineup
    pops: [11.2, 12.0],
    zoom: [12.15, 12.5],               // the camera goes through the lineup into the material count
    mate: 13.9,                        // one white frame, then the last scene
    hands: [13.95, 14.85], links: 14.2,
    end: 15,
  };
  const PLY_AT = [0, 0.6, 1.25, 2.3, 3.4, 4.5, 5.9, 7.0, 8.4, 9.5, 11.1, 12.33, 13.9];
  root.style.setProperty('--len', String(T.end + 1));

  const el = {
    stage: $('.stage'), view: $('.view'), title: $('.scene--title'), wall: $('.scene--wall'), flash: $('.scene--flash'),
    shots: $$('.scene--piece, .scene--detail'), stack: $('.scene--stack'), material: $('.scene--material'), contact: $('.scene--contact'),
    king: $('.hero__king'), name: $('.hero__title'), rows: $$('.sheet li'), plies: $$('.sheet a'), tag: $('.tag--pointer'),
    note: $('.wall__note'), flashImg: $('.scene--flash img'), pops: $$('.lineup li'), links: $('.contact__links'),
    hands: $$('.hand'), wipe: $('.wipe'), blades: $$('.wipe i'), cut: $('.cut'),
  };
  let VH = innerHeight, VW = el.view.clientWidth, introDone = false;
  const live = (node, on) => { if (node._live === on) return; node._live = on; node.classList.toggle('is-live', on); if (FILM) node.inert = !on; };

  /* ───────────── 1 · title ───────────── */
  function intro() {
    const flick = $('.hero__flick');
    const reveal = () => { document.body.classList.remove('is-intro'); introDone = true; setTimeout(() => el.title.classList.add('is-focus'), reduce ? 0 : 850); };
    if (reduce) return reveal();
    const c = flick.getContext('2d'), S = flick.width, sq = S / 8;
    const START = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
    const OPEN = ['rnbqkbnr', 'pppp.ppp', '........', '....p...', '....P...', '.....N..', 'PPPP.PPP', 'RNBQKB.R'];
    const G = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    const diagram = pos => {
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        c.fillStyle = (r + f) & 1 ? '#a9a9a9' : '#ececec'; c.fillRect(f * sq, r * sq, sq, sq);
        const ch = pos[r][f]; if (ch === '.') continue;
        c.font = `${sq * 0.86}px "Apple Symbols", "Segoe UI Symbol", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        const up = ch === ch.toUpperCase(); c.fillStyle = up ? '#fff' : '#000'; c.strokeStyle = '#000'; c.lineWidth = 1.5;
        if (up) c.strokeText(G[ch.toLowerCase()], f * sq + sq / 2, r * sq + sq / 2 + 2);
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
    (function tick() { if (i >= seq.length) return reveal(); seq[i] === 'tree' ? tree() : diagram(seq[i]); i++; setTimeout(tick, 100); })();
  }

  /* ───────────── 2 · wall of text and the datamosh pawn ───────────── */
  const WALL = 'A PAWN MOVES ONE SQUARE AT A TIME AND NEVER GOES BACK. NOBODY GUARDS IT, NOBODY FEARS IT. IT IS SPENT FIRST AND REMEMBERED LAST. ' +
    'BUT THE PAWN THAT REACHES THE FAR SIDE OF THE BOARD BECOMES ANY PIECE IT CHOOSES. EVERY BINARY IS A BOARD. EVERY FUNCTION IS A MOVE. ' +
    'READ THE METADATA, LEARN THE RULES, THEN REWRITE THEM. GAMEASSEMBLY.DLL · GLOBAL-METADATA.DAT · IL2CPP · LUAU · LUNE · 2MD55.ARCH · ';
  const wall = { ready: false, setType() {}, setPawn() {}, frame() {} };
  async function setupWall() {
    const text = $('.wall__text'), fx = $('.wall__fx'), dim = $('.wall__dim'), rest = $('.wall__cover--rest'), line = $('.wall__cover--line');
    const c = fx.getContext('2d'), img = await load('assets/pieces/w_pawn.png'), rep = WALL.repeat(6), D = Math.min(1.5, devicePixelRatio || 1);
    let W = 0, H = 0, P = 0, lh = 30, count = 0, sp, tints, mosh, bandH = 0, baseY = 0;
    function layout() {
      const r = el.wall.getBoundingClientRect(); W = r.width; H = FILM ? VH : r.height;
      lh = parseFloat(getComputedStyle(text).lineHeight) || 30; count = Math.ceil(H / lh) + 1;
      text.textContent = '';
      for (let i = 0; i < count; i++) { const s = document.createElement('span'); s.textContent = rep.slice((i * 97) % WALL.length, ((i * 97) % WALL.length) + 180); text.append(s); }
      line.style.height = `${lh}px`;
      P = clamp(H * 0.27, 110, 230); bandH = Math.ceil(P * 1.75); baseY = Math.round(H * 0.56 + P / 2);
      fx.width = Math.round(W * D); fx.height = Math.round(bandH * D); fx.style.height = `${bandH}px`;
      fx.style.transform = `translate3d(0,${baseY - Math.round(P * 1.5)}px,0)`;
      dim.style.width = `${Math.round(P * 2.9)}px`; dim.style.height = `${Math.round(P * 2.1)}px`;
      sp = analyse(img, (P * D * img.width) / img.height, P * D);
      tints = RAMP.map(col => tinted(sp, col)); mosh = moshFrames(sp);
      wall.ready = true;
    }
    // typing = two black covers sliding away: one over everything below the current line, one over its unwritten rest
    wall.setType = k => {
      const typed = k * (count + 0.5), full = Math.floor(typed), y = 10 + lh * full;
      set(rest, 'transform', `translate3d(0,${Math.round(y + lh)}px,0)`);
      set(line, 'transform', `translate3d(${Math.round((typed - full) * W)}px,${Math.round(y)}px,0)`);
    };
    // the pawn: its trail is its own last frames, sampled 20 times a second, so it stretches when the pawn is fast
    // and folds back into the pawn when it stops
    const pos = { x: -300, a: 0.3 }, hist = [];
    let target = -300, last = 0, sampleAt = 0, still = 0;
    wall.setPawn = k => { target = lerp(-P, W * 0.57, easeOut(k)); };
    if (!FILM) { // stacked layout: the pawn flies in once and then follows the pointer
      onScreen(el.wall, () => { target = W * 0.5; requestAnimationFrame(function loop(t) { wall.frame(t); requestAnimationFrame(loop); }); });
      el.wall.addEventListener('pointermove', e => { target = clamp(e.clientX - el.wall.getBoundingClientRect().left, P * 0.3, W - P * 0.3); });
    }
    wall.frame = now => {
      if (!wall.ready) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const px = pos.x; pos.x = lerp(pos.x, target, 1 - Math.pow(FILM ? 0.0005 : 0.012, dt));
      const vx = dt ? (pos.x - px) / dt : 0;
      pos.a = lerp(pos.a, 0.3 + clamp(vx * 0.0006, -0.35, 0.5), 1 - Math.pow(0.02, dt)); // leans into the move
      if (now - sampleAt >= 50) { sampleAt = now; hist.unshift({ x: pos.x, a: pos.a }); hist.length = Math.min(hist.length, ECHOES); }
      const moving = Math.abs(vx) > 2 || hist.some(h => Math.abs(h.x - pos.x) > 0.5);
      still = moving ? 0 : still + 1;
      if (still > 8 && (now / 100 | 0) % 3) return;                    // at rest: only the glitch head keeps ticking, slowly
      const pw = sp.w / D, by = P * 1.5;
      c.setTransform(D, 0, 0, D, 0, 0); c.clearRect(0, 0, W, bandH); c.imageSmoothingEnabled = false;
      const stamp = (im, p) => { c.save(); c.translate(p.x, by); c.rotate(p.a); c.drawImage(im, -pw / 2, -P, pw, P); c.restore(); };
      for (let i = hist.length - 1; i >= 0; i--) stamp(tints[AGE[i]], hist[i]);
      stamp(mosh[(now / 100 | 0) % mosh.length], pos);
      const xs = [pos.x, ...hist.map(h => h.x)], x0 = Math.max(0, Math.min(...xs) - pw * 0.6), x1 = Math.max(...xs) + pw * 0.8, y0 = by - P - 8;
      if (x1 - x0 > 24) { // the tracker box, once the pawn is in frame
        c.strokeStyle = 'rgba(226,58,58,0.9)'; c.lineWidth = 0.8; c.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, P + 20);
        c.font = `10px ${MONO}`; c.textBaseline = 'alphabetic';
        const label = (s, x, y) => { const w = c.measureText(s).width; c.fillStyle = '#000'; c.fillRect(x - 2, y - 10, w + 4, 13); c.fillStyle = '#fff'; c.fillText(s, x, y); };
        label(`x: ${Math.round(x0 * 1.74)} y: ${Math.round(baseY * 2.2)}`, x0 + 3, y0 - 3);
        if (x1 - x0 > 200) label(`x: ${Math.round(pos.x * 1.74)} y: ${Math.round(baseY * 2.2)}`, x1 - 88, y0 - 3);
      }
      set(dim, 'transform', `translate3d(${Math.round(pos.x - P * 1.45)}px,${Math.round(baseY - P * 0.5 - P * 1.05)}px,0)`);
    };
    layout();
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 160); });
  }

  /* ───────────── 3–5 · the work: figures that strobe through fills ───────────── */
  const MODES = ['letters', 'dots', 'glyphs', 'mosaic', 'pixel', 'hatch', 'pink'];
  const PASTEL = [[255, 226, 236], [226, 255, 236], [230, 234, 255], [255, 248, 218], [255, 255, 255]];
  const figs = [];
  async function setupFigures() {
    const thumbs = await Promise.all(['w_pawn', 'w_rook', 'w_king', 'w_queen', 'w_bishop', 'w_knight_a', 'b_king'].map(n => load(`assets/pieces/${n}.png`))).catch(() => []);
    const BG = ['#46464a', '#787670', '#a5a096', '#604e3e', '#3a4a62', '#8c606e', '#282828', '#bebab2', '#546454', '#6e6e82'];
    // one fill, drawn once into its own bitmap; strobing is then a single drawImage
    function render(sp, img, m, k) {
      const can = canvas(sp.w, sp.h), c = can.getContext('2d');
      if (m === 'pixel') {
        const cell = 13 * k, sw = Math.max(1, Math.round(sp.w / cell)), sh = Math.max(1, Math.round(sp.h / cell)), t = canvas(sw, sh), tc = t.getContext('2d');
        tc.drawImage(img, 0, 0, sw, sh);
        const id = tc.getImageData(0, 0, sw, sh), d = id.data;
        for (let i = 0; i < d.length; i += 4) { d[i + 3] = d[i + 3] > 110 ? 255 : 0; const p = PASTEL[Math.floor(hash2(i, 7) * PASTEL.length)]; for (let j = 0; j < 3; j++) d[i + j] = clamp(lerp(d[i + j] * 1.06, p[j], 0.3), 0, 255); }
        tc.putImageData(id, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(t, 0, 0, sp.w, sp.h); return can;
      }
      const cell = { letters: 9, dots: 7.2, glyphs: 11, mosaic: 13, hatch: 5.4, pink: 8.6 }[m] * k, g = v => `rgb(${v},${v},${v})`;
      const sample = (x, y) => { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= sp.w || yi >= sp.h) return -1; const i = yi * sp.w + xi; return sp.alpha[i] > 140 ? sp.lum[i] : -1; };
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      let row = 0;
      for (let y = cell / 2; y < sp.h; y += cell, row++) for (let x = cell / 2, col = 0; x < sp.w; x += cell, col++) {
        const l = sample(x, y); if (l < 0) continue;
        const h = hash2(col * 3 + 1, row * 7 + 2);
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
          const t = thumbs[i % (thumbs.length || 1)]; if (t) { const th = (cell - 1) * 0.86, tw = (t.width * th) / t.height; c.drawImage(t, x - tw / 2, y - cell / 2 + 0.5 + (cell - 1) * 0.08, tw, th); }
          c.globalAlpha = 1;
        } else { const v = 0.45 + 0.55 * l; c.font = `${cell * 1.12}px "Apple Symbols", "Segoe UI Symbol", serif`; c.fillStyle = `rgb(${186 * v | 0},${196 * v | 0},${98 * v | 0})`; c.fillText('♙♘♗♖♕♔♟♞♝♜♛♚◎⊕'[Math.floor(h * 14)], x, y + cell * 0.4); }
      }
      return can;
    }
    for (const cv of $$('.pc__fig')) {
      const img = await load(cv.dataset.sprite).catch(() => null); if (!img) continue;
      const H = Math.min(940, Math.round((FILM ? VH * 1.16 : Math.min(innerHeight * 0.48, 400)) * (FILM ? 1 : Math.min(2, devicePixelRatio || 1))));
      cv.height = H; cv.width = Math.round((H * img.width) / img.height);
      const sp = analyse(img, cv.width, cv.height), c = cv.getContext('2d'), k = H / 370;
      const fig = { cv, c, img, frames: [], mode: 0, hover: false, visible: FILM ? () => cv.closest('.scene')._live : onScreen(cv) };
      fig.draw = () => {
        c.clearRect(0, 0, cv.width, cv.height);
        const f = fig.hover ? null : fig.frames[fig.mode % MODES.length];
        if (f) c.drawImage(f, 0, 0); else { c.imageSmoothingEnabled = true; c.drawImage(img, 0, 0, cv.width, cv.height); }
      };
      cv.addEventListener('pointerenter', () => { fig.hover = true; fig.draw(); });
      cv.addEventListener('pointerleave', () => { fig.hover = false; fig.draw(); });
      figs.push(fig); fig.draw();
      // fills are prepared one per idle slice so the page never stalls
      let m = 0; (function next() { fig.frames[m] = render(sp, img, MODES[m], k); if (m === 1) fig.mode = 1; if (++m < MODES.length) setTimeout(next, 30); else fig.draw(); })();
    }
    if (reduce) return; // one calm fill, no strobe
    let burstUntil = 0, lastAt = 0;
    figs.burst = () => { burstUntil = performance.now() + 420; };
    (function strobe(now) {
      requestAnimationFrame(strobe);
      if (now - lastAt < (now < burstUntil ? 70 : 200)) return; lastAt = now;
      for (const f of figs) if (f.visible() && !f.hover && f.frames.length > 1) { f.mode = (f.mode + 1) % f.frames.length; f.draw(); }
    })(0);
  }

  /* ───────────── black's replies: scenes the scroll writes out line by line ───────────── */
  const relayout = []; // things to measure again after a resize
  const replies = [];  // one update(k, now) per reply, k = how far the scroll is through that scene

  // 3… Bg4 · LuauEmu: the command is typed, the steps and the tree appear, both ticker rows slide against each other
  function setupEmu(sc) {
    const cmd = $('.term__cmd', sc), caret = $('.term__caret', sc), steps = $$('.steps li', sc), lines = $$('.tree span', sc), counts = $$('[data-count]', sc), rows = $$('.ticker p', sc);
    const UNC = [ // all 44, as listed in the project's README
      'readfile writefile appendfile isfile isfolder listfiles makefolder delfile delfolder newcclosure clonefunction hookfunction iscclosure islclosure restorefunction getrawmetatable setrawmetatable setreadonly isreadonly makewriteable getproperties',
      'gethiddenproperty sethiddenproperty request http_request getgenv getrenv getsenv checkcaller identifyexecutor getnamecallmethod rconsoleprint rconsolewarn rconsoleerr rconsolename rconsoleclear typeof getreg getconnections fireclickdetector fireproximityprompt firetouchinterest isrbxactive decompile',
    ];
    const HOT = new Set(['readfile', 'hookfunction', 'getrawmetatable', 'request', 'getgenv', 'fireclickdetector', 'decompile']);
    rows.forEach((p, i) => { p.innerHTML = UNC[i].split(' ').map(n => (HOT.has(n) ? `<b>${n}</b>` : n)).join(' · '); });
    let cw = 0, cl = 0;
    relayout.push(() => { cw = cmd.offsetWidth; cl = cmd.offsetLeft; });
    return k => {
      const t = span(k, 0.04, 0.34);
      set(cmd, 'clipPath', `inset(0 ${((1 - t) * 100).toFixed(2)}% 0 0)`);
      set(caret, 'transform', `translate3d(${(cl + t * cw).toFixed(1)}px,0,0)`);
      steps.forEach((li, i) => flag(li, 'is-in', k >= 0.3 + i * 0.13));
      lines.forEach((l, i) => flag(l, 'is-in', k >= 0.28 + i * 0.045));
      const c = easeOut(span(k, 0.5, 0.85));
      for (const b of counts) { const v = String(Math.round(Number(b.dataset.count) * c)); if (b._v !== v) { b._v = v; b.textContent = v; } }
      set(rows[0], 'transform', `translate3d(${(-(0.04 + k * 0.6) * VW).toFixed(1)}px,0,0)`);
      set(rows[1], 'transform', `translate3d(${((k * 0.6 - 1.1) * VW).toFixed(1)}px,0,0)`);
    };
  }

  // 4… g6 · ModLoader: a knight hops along the four files; its ghosts catch up when it lands
  function setupLoader(sc) {
    const boxes = $$('.hops li', sc), knight = $('.hopper', sc), ghosts = $$('.ghost', sc), svg = $('.hops__path', sc), path = $('path', svg);
    const HOPS = [[0.05, 0.24], [0.3, 0.46], [0.52, 0.68], [0.74, 0.9]], TINT = [RAMP[1], RAMP[3], RAMP[5], RAMP[6], RAMP[8]];
    const trail = ghosts.map(() => ({ x: 0, y: 0, a: 0 }));
    let pts = [], kw = 0, kh = 0, hop = 0, last = -1e9;
    ghosts.forEach((g, i) => g.style.setProperty('--c', `rgb(${TINT[i]})`));
    const where = k => { // where the knight stands at this point of the scene
      let i = 0; for (let j = 1; j < HOPS.length; j++) if (k >= HOPS[j][0]) i = j;
      const e = easeInOut(span(k, ...HOPS[i])), a = pts[i], b = pts[i + 1];
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) - Math.sin(Math.PI * e) * hop, a: -0.3 * Math.sin(2 * Math.PI * e) };
    };
    const measure = () => {
      kh = knight.offsetHeight; kw = kh * (knight.naturalWidth / knight.naturalHeight || 0.72); hop = VH * 0.15;
      for (const g of ghosts) g.style.setProperty('--ar', String(kw / kh));
      pts = boxes.map(b => ({ x: b.offsetLeft + b.offsetWidth / 2, y: b.offsetTop }));
      pts.unshift({ x: -kw, y: pts[0].y - VH * 0.06 });
      svg.setAttribute('viewBox', `0 0 ${sc.clientWidth} ${sc.clientHeight}`);
      let d = '';
      for (let j = 0; j <= 200; j++) { const p = where(lerp(HOPS[0][0], HOPS[3][1], j / 200)); d += `${j ? 'L' : 'M'}${p.x.toFixed(1)} ${(p.y - 3).toFixed(1)}`; }
      path.setAttribute('d', d);
    };
    relayout.push(measure); knight.addEventListener('load', () => FILM && measure());
    const put = (node, p) => set(node, 'transform', `translate3d(${(p.x - kw / 2).toFixed(1)}px,${(p.y - kh).toFixed(1)}px,0) rotate(${p.a.toFixed(3)}rad)`);
    return (k, now) => {
      if (!pts.length) return;
      const fresh = now - last > 200, dt = Math.min(0.05, (now - last) / 1000); last = now;
      const p = where(k), f = fresh ? 1 : 1 - Math.pow(0.00004, dt);
      put(knight, p);
      let lead = p;
      trail.forEach((g, i) => { g.x = lerp(g.x, lead.x, f); g.y = lerp(g.y, lead.y, f); g.a = lerp(g.a, lead.a, f); put(ghosts[i], g); lead = g; });
      boxes.forEach((b, i) => flag(b, 'is-on', k >= HOPS[i][1] - 0.015));
    };
  }

  // 5… Bxd1 · il2dump: a scan line reads the header from the top, dump.cs is written beside it
  function setupDump(sc) {
    const dim = $('.hex__dim', sc), lit = $('.hex__lit', sc), litPre = $('pre', lit), scan = $('.hex__scan', sc), legend = $('.hex__legend', sc), lines = $$('.dump pre span', sc), outs = $$('.outs li', sc);
    // the first eight bytes are what the dumper checks first: sanity 0xFAB11BAF and version 29. The rest is filler.
    const hx = n => n.toString(16).toUpperCase().padStart(2, '0');
    let html = '';
    for (let r = 0; r < 11; r++) {
      const bytes = Array.from({ length: 16 }, (_, i) => hx(hash2(r * 16 + i, 91) < 0.3 ? 0 : Math.floor(hash2(i * 7 + 3, r + 5) * 256)));
      const row = r ? bytes.join(' ') : `<b class="h1">AF 1B B1 FA</b> <b class="h2">1D 00 00 00</b> ${bytes.slice(8).join(' ')}`;
      html += `${hx(r >> 4).padStart(6, '0')}${hx((r * 16) & 255)}  ${row}\n`;
    }
    dim.innerHTML = litPre.innerHTML = html.trimEnd();
    let h = 0;
    relayout.push(() => { h = dim.offsetHeight; });
    return k => {
      const t = span(k, 0.05, 0.68), y = Math.round((1 - t) * h);
      set(lit, 'transform', `translate3d(0,${-y}px,0)`); set(litPre, 'transform', `translate3d(0,${y}px,0)`);
      set(scan, 'transform', `translate3d(0,${h - y}px,0)`); set(scan, 'opacity', t > 0 && t < 1 ? '1' : '0');
      flag(legend, 'is-in', k >= 0.12);
      lines.forEach((l, i) => flag(l, 'is-in', k >= 0.2 + i * 0.07));
      outs.forEach((l, i) => flag(l, 'is-in', k >= 0.7 + i * 0.05));
    };
  }

  // 6… Ke7 · material: bars by language and the last 64 days as a board, both read live from the profile repository
  function setupMaterial(sc) {
    const list = $('.mat', sc), grid = $('.days__board', sc), total = $('#days-total');
    const level = n => (n >= 13 ? '#fff' : n >= 6 ? `rgb(${RAMP[2]})` : n >= 3 ? `rgb(${RAMP[4]})` : n >= 1 ? `rgb(${RAMP[5]})` : '');
    let bars = [], squares = [], shown = -1;
    function build(material, act) {
      const langs = (material ?? []).filter(m => typeof m?.name === 'string' && m.pct > 0 && /^#[0-9a-f]{3,8}$/i.test(m.color)).slice(0, 4);
      if (langs.length) {
        const max = Math.max(...langs.map(m => m.pct));
        list.textContent = '';
        bars = langs.map(m => {
          const li = document.createElement('li'), name = document.createElement('span'), bar = document.createElement('i'), num = document.createElement('b');
          li.style.setProperty('--c', m.color); name.textContent = m.name; num.className = 'mono'; num.textContent = `${m.pct}%`;
          if (!FILM) bar.style.transform = `scaleX(${m.pct / max})`;
          li.append(name, bar, num); list.append(li);
          return { bar, num, p: m.pct, w: m.pct / max };
        });
      }
      if (Array.isArray(act?.days) && act.days.length) {
        const days = [...Array(64).fill(0), ...act.days].slice(-64);
        grid.textContent = '';
        squares = days.map(n => { const q = document.createElement('i'), v = level(Number(n) || 0); if (v) q.style.setProperty('--v', v); grid.append(q); return q; });
        total.textContent = String(Number(act.total) || days.reduce((a, b) => a + b, 0)); shown = -1;
      }
    }
    build([{ name: 'C++', pct: 40, color: '#f34b7d' }, { name: 'Luau', pct: 26, color: '#00a2ff' }, { name: 'TypeScript', pct: 20, color: '#3178c6' }, { name: 'JavaScript', pct: 14, color: '#f1e05a' }],
      { total: 81, days: [0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 2, 14, 0, 0, 12, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 8, 31] });
    const RAW = 'https://raw.githubusercontent.com/2md55nmxkw-arch/2md55nmxkw-arch/main/chess/';
    Promise.all(['profile.json', 'activity.json'].map(f => fetch(RAW + f).then(r => (r.ok ? r.json() : null)).catch(() => null))).then(([p, a]) => build(p?.material, a));
    return k => {
      bars.forEach((b, i) => {
        const t = easeOut(span(k, 0.06 + i * 0.08, 0.4 + i * 0.08)), v = `${Math.round(b.p * t)}%`;
        set(b.bar, 'transform', `scaleX(${(b.w * t).toFixed(4)})`);
        if (b.v !== v) { b.v = v; b.num.textContent = v; }
      });
      const n = Math.round(span(k, 0.15, 0.75) * squares.length);
      if (n !== shown) { shown = n; squares.forEach((q, i) => flag(q, 'is-in', i < n)); }
    };
  }

  /* ───────────── 6 · lineup: drag any piece and it leaves a trail ───────────── */
  function setupDrag() {
    const fx = $('.stack__fx'), c = fx.getContext('2d');
    let d = null;
    const size = () => { const r = el.stack.getBoundingClientRect(); fx.width = Math.round(r.width); fx.height = Math.round(FILM ? VH : r.height); };
    for (const img of $$('.lineup img')) {
      img.addEventListener('pointerdown', e => {
        if (d) return; size();
        const r = img.getBoundingClientRect(), s = el.stack.getBoundingClientRect();
        const sp = (img._sp ??= analyse(img, r.width, r.height)); img._tints ??= RAMP.map(col => tinted(sp, col));
        d = { img, w: r.width, h: r.height, hx: r.left - s.left + r.width / 2, hy: r.bottom - s.top, x: 0, y: 0, tx: 0, ty: 0, gx: e.clientX, gy: e.clientY, a: 0, hist: [], held: true, last: 0, sampleAt: 0 };
        d.x = d.tx = d.hx; d.y = d.ty = d.hy;
        img.setPointerCapture(e.pointerId); img.classList.add('is-drag'); requestAnimationFrame(loop);
      });
      img.addEventListener('pointermove', e => { if (d?.img === img && d.held) { d.tx = d.hx + e.clientX - d.gx; d.ty = d.hy + e.clientY - d.gy; } });
      const drop = () => { if (d?.img === img) { d.held = false; d.tx = d.hx; d.ty = d.hy; } };
      img.addEventListener('pointerup', drop); img.addEventListener('pointercancel', drop);
    }
    function loop(now) {
      if (!d) return;
      const dt = Math.min(0.05, (now - (d.last || now)) / 1000); d.last = now;
      const px = d.x, k = 1 - Math.pow(d.held ? 0.00002 : 0.004, dt);
      d.x = lerp(d.x, d.tx, k); d.y = lerp(d.y, d.ty, k);
      d.a = lerp(d.a, clamp(((d.x - px) / (dt || 1)) * 0.0007, -0.5, 0.5), 1 - Math.pow(0.01, dt));
      if (now - d.sampleAt >= 50) { d.sampleAt = now; d.hist.unshift({ x: d.x, y: d.y, a: d.a }); d.hist.length = Math.min(d.hist.length, ECHOES); }
      c.clearRect(0, 0, fx.width, fx.height); c.imageSmoothingEnabled = false;
      const stamp = (im, p) => { c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.drawImage(im, -d.w / 2, -d.h, d.w, d.h); c.restore(); };
      for (let i = d.hist.length - 1; i >= 0; i--) stamp(d.img._tints[AGE[i]], d.hist[i]);
      c.imageSmoothingEnabled = true; stamp(d.img, d);
      const home = !d.held && Math.hypot(d.x - d.hx, d.y - d.hy) < 0.6 && d.hist.every(h => Math.hypot(h.x - d.hx, h.y - d.hy) < 1.5);
      if (home) { c.clearRect(0, 0, fx.width, fx.height); d.img.classList.remove('is-drag'); d = null; return; }
      requestAnimationFrame(loop);
    }
  }

  /* ───────────── 7 · contact: noise-filled hands ───────────── */
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
  async function setupContact() {
    const hands = [];
    for (const cv of $$('canvas[data-hand]')) {
      const mask = await load(cv.dataset.hand).catch(() => null); if (!mask) continue;
      const W = Math.max(60, Math.round(cv.offsetWidth)), H = Math.max(60, Math.round(cv.offsetHeight)); cv.width = W; cv.height = H;
      const top = cv.dataset.hand.includes('hand_top');
      const tile = handTile(mask, { rot: Number(cv.dataset.rot), flip: 'flip' in cv.dataset, part: top ? [0.36, 1] : [0, 0.6], aspect: W / H, grow: top ? [0.3, 0.5] : [0.45, 0.4] });
      // five frames of television static clipped to the hand, drawn once
      const q = 2, nw = Math.ceil(W / q), nh = Math.ceil(H / q);
      const frames = Array.from({ length: 5 }, (_, t) => {
        const n = canvas(nw, nh), nc = n.getContext('2d'), id = nc.createImageData(nw, nh);
        for (let i = 0, p = 0; i < id.data.length; i += 4, p++) { const r = hash2(p + t * 7919, t * 31 + 5), v = r < 0.3 ? 250 : r < 0.6 ? 215 : r < 0.85 ? 180 : 140; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
        nc.putImageData(id, 0, 0);
        const f = canvas(W, H), fc = f.getContext('2d'); fc.imageSmoothingEnabled = false; fc.drawImage(n, 0, 0, W, H);
        fc.globalCompositeOperation = 'destination-in'; fc.imageSmoothingEnabled = true; fc.drawImage(tile, 0, 0, W, H);
        return f;
      });
      const c = cv.getContext('2d'); c.drawImage(frames[0], 0, 0); hands.push({ c, frames, W, H });
    }
    if (!reduce) {
      const visible = FILM ? () => el.contact._live : onScreen(el.contact);
      let t = 0; setInterval(() => { if (!visible()) return; t++; for (const h of hands) { h.c.clearRect(0, 0, h.W, h.H); h.c.drawImage(h.frames[t % h.frames.length], 0, 0); } }, 100);
    }
    const btn = $('#discord'), status = $('#discord-status');
    btn?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.handle); status.textContent = `copied ${btn.dataset.handle}`; }
      catch { status.textContent = `Discord: ${btn.dataset.handle}`; }
    });
    const cc = $('#cc-rating'); // live chess.com ratings next to the link (wide layout only; the name stays if the request fails)
    if (cc && FILM) fetch('https://api.chess.com/pub/player/electronicdiver/stats').then(r => (r.ok ? r.json() : null)).then(j => {
      const parts = [['blitz', j?.chess_blitz], ['rapid', j?.chess_rapid], ['bullet', j?.chess_bullet]].filter(([, v]) => Number.isFinite(v?.last?.rating)).map(([n, v]) => `${n} ${v.last.rating}`);
      if (parts.length) cc.textContent = `electronicdiver · ${parts.join(' · ')}`;
    }).catch(() => {});
    for (const s of $$('[data-stars]')) // live star counts; the numbers in the markup stay if the request fails
      fetch(`https://api.github.com/repos/2md55nmxkw-arch/${s.dataset.stars}`).then(r => (r.ok ? r.json() : null)).then(j => { if (j && Number.isFinite(j.stargazers_count)) s.textContent = `★ ${j.stargazers_count}`; }).catch(() => {});
  }

  /* ───────────── the film: one playhead drives everything ───────────── */
  const heroes = el.shots.filter((_, i) => i % 2 === 0).map(sc => ({ name: $('.pc__name', sc), fig: $('.pc__fig', sc), end: 0 }));
  let shot = -1, mated = null, material = null, lastPly = -1;
  function play(s, now) {
    // score sheet and board
    let ply = 0; for (const at of PLY_AT) if (s >= at) ply++;
    board(introDone ? ply : 0);
    if (ply !== lastPly) {
      lastPly = ply; const row = Math.ceil(ply / 2) - 1;
      el.rows.forEach((li, i) => { li.classList.toggle('is-now', i === row); li.classList.toggle('is-played', i < row); });
      el.plies.forEach((a, i) => a.classList.toggle('is-ply', i === ply - 1));
    }

    // 1 · title: slow drift, then a push to the right uncovers the wall
    const push = easeInOut(span(s, ...T.push)), drift = span(s, 0, 1.2);
    live(el.title, push < 1);
    if (push < 1) {
      set(el.title, 'transform', `translate3d(${(push * VW).toFixed(1)}px,0,0) skewX(${(-9 * Math.sin(Math.PI * push)).toFixed(2)}deg)`);
      set(el.king, 'transform', `rotate(${(21 - 7 * drift).toFixed(2)}deg) translate3d(${(drift * 26).toFixed(1)}px,${(-drift * 34).toFixed(1)}px,0)`);
      set(el.name, 'transform', `translateY(-50%) scale(${(1 + 0.05 * drift).toFixed(4)},${(1.75 * (1 + 0.05 * drift)).toFixed(4)})`);
    }

    // 2 · wall
    const wallOn = s >= T.wall[0] && s < T.wall[1];
    live(el.wall, wallOn);
    if (wallOn) { wall.setType(span(s, ...T.type)); wall.setPawn(span(s, ...T.pawn)); wall.frame(now); flag(el.note, 'is-in', s >= T.note); }

    // flash cut
    const fl = s >= T.flash[0] && s < T.flash[1];
    live(el.flash, fl);
    if (fl) set(el.flashImg, 'transform', `translate(-50%,-50%) scale(${lerp(5.4, 3.5, span(s, ...T.flash)).toFixed(3)})`);

    // 3–5 · six shots: project, reply, project, reply, project, reply. The last one leaves in a whip pan
    const whip = easeInOut(span(s, ...T.whip));
    let cur = -1;
    el.shots.forEach((sc, i) => {
      const a = T.cuts[i], b = T.cuts[i + 1], on = s >= a && s < b;
      live(sc, on);
      if (!on) { flag(sc, 'is-shot', false); return; }
      cur = i;
      const k = span(s, a, b);
      if (i % 2) replies[(i - 1) / 2]?.(k, now);
      else { // the name travels through the frame and ends fully inside it
        const h = heroes[i / 2];
        flag(sc, 'is-shot', k > 0.04);
        set(h.name, 'transform', `translate3d(${lerp(0.13 * VW, h.end, easeInOut(span(k, 0, 0.82))).toFixed(1)}px,0,0)`);
        set(h.fig, 'transform', `translate3d(0,${((0.5 - k) * 46).toFixed(1)}px,0)`);
      }
      if (i === 5) set(sc, 'transform', whip > 0 ? `translate3d(${(-whip * VW).toFixed(1)}px,0,0) skewX(${(10 * Math.sin(Math.PI * whip)).toFixed(2)}deg)` : 'none');
    });
    if (cur !== shot) { shot = cur; if (cur >= 0 && cur % 2 === 0) figs.burst?.(); }

    // blades: they close over a project and open on the reply
    let p = -1;
    for (const c of [T.cuts[1], T.cuts[3], T.cuts[5]]) if (Math.abs(s - c) < T.wipe) p = (s - c) / T.wipe + 1; // 0 … 2
    flag(el.wipe, 'is-on', p >= 0);
    if (p >= 0) el.blades.forEach((b, i) => {
      const d = i * 0.06, x = easeInOut(span(p, d, d + 0.7)) - 1 + easeInOut(span(p, 1 + d, 1.7 + d));
      set(b, 'transform', `translate3d(${((i % 2 ? -x : x) * 101).toFixed(2)}%,0,0)`);
    });

    // 6 · lineup comes in on the whip, pieces pop, then the camera goes through it
    const zoom = easeInOut(span(s, ...T.zoom)), stackOn = s >= T.whip[0] && zoom < 1;
    live(el.stack, stackOn);
    if (stackOn) {
      set(el.stack, 'transform', `translate3d(${((1 - whip) * VW).toFixed(1)}px,0,0) scale(${(1 + 1.5 * zoom).toFixed(4)})`);
      set(el.stack, 'opacity', (1 - zoom).toFixed(3));
      const k = span(s, ...T.pops);
      el.pops.forEach((li, i) => flag(li, 'is-in', k >= [0, 0.16, 0.38, 0.54, 0.76, 0.92][i] && whip > 0.6));
    }

    // 6… · material count
    const matOn = zoom > 0 && s < T.mate;
    live(el.material, matOn);
    if (matOn) {
      set(el.material, 'opacity', zoom.toFixed(3));
      set(el.material, 'transform', zoom < 1 ? `scale(${lerp(0.8, 1, zoom).toFixed(4)})` : 'none');
      material?.(span(s, T.zoom[1], T.mate - 0.2), now);
    }

    // 7 · mate: one white frame, then the hands close in
    const end = s >= T.mate;
    if (end !== mated) { if (end && mated !== null) el.cut.animate([{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 260 }); mated = end; }
    live(el.contact, end);
    if (end) {
      const g = easeOut(span(s, ...T.hands));
      el.hands.forEach((h, i) => set(h, 'transform', `scale(${lerp(0.3, 1, clamp(g * 1.15 - i * 0.07)).toFixed(4)})`));
      flag(el.links, 'is-in', s >= T.links);
    }
  }

  function start() {
    intro();
    setupWall().catch(console.error);
    setupFigures().catch(console.error);
    replies.push(setupEmu($('.dt--emu')), setupLoader($('.dt--loader')), setupDump($('.dt--dump')));
    material = setupMaterial(el.material);
    setupDrag();
    setupContact().catch(console.error);

    if (!FILM) { // stacked layout: no playhead, things simply switch on as they scroll into view
      board(0);
      onScreen($('.lineup'), () => el.pops.forEach((li, i) => setTimeout(() => li.classList.add('is-in'), [0, 350, 850, 1250, 1750, 2100][i])), 0.4);
      return;
    }
    relayout.push(() => heroes.forEach(h => { h.end = Math.min(0, 0.7 * VW - h.name.offsetWidth); }));
    const measure = () => { VH = innerHeight; VW = el.view.clientWidth; relayout.forEach(f => f()); };
    measure(); document.fonts?.ready.then(measure); addEventListener('load', measure);
    let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measure, 120); });

    // every half-move in the score sheet is a link to its place in the film
    const AT = {}; for (const a of $$('a[data-at]')) AT[a.getAttribute('href')] ??= Number(a.dataset.at);
    const go = (at, smooth = true) => scrollTo({ top: at * VH, behavior: smooth ? 'smooth' : 'auto' });
    for (const a of $$('a[data-at]')) a.addEventListener('click', e => { e.preventDefault(); go(Number(a.dataset.at)); });
    if (AT[location.hash] != null) go(AT[location.hash], false);
    addEventListener('hashchange', () => { if (AT[location.hash] != null) go(AT[location.hash]); });

    el.stage.addEventListener('pointermove', e => { set(el.tag, 'transform', `translate3d(${e.clientX + 14}px,${e.clientY + 16}px,0)`); el.tag.textContent = `x: ${Math.round(e.clientX * 1.74)} y: ${Math.round(e.clientY * 2.2)}`; });
    let cur = scrollY / VH, last = 0;
    (function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const target = clamp(scrollY / VH, 0, T.end + 0.5);
      cur = Math.abs(target - cur) < 0.0004 ? target : lerp(cur, target, 1 - Math.pow(0.0012, dt)); // the eased playhead
      play(cur, now);
    })(0);
  }
  start();
})();
