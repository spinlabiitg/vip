// Demos for the 2-D Fourier tutorial. Each block wires one <div class="demo">.
'use strict';

const TAU = 2 * Math.PI;
const tex = s => (window.katex ? katex.renderToString(s, { throwOnError: false }) : s);
const centred = (i, N) => (i >= N / 2 ? i - N : i);   // 0..N-1 -> -N/2..N/2-1

// Chip groups: one .on button at a time; fn(key) on change
function chips(id, fn, attr = 'k') {
  const box = L.$(id);
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    fn(b.dataset[attr], b);
  });
}

function grating(N, u, v, ph = 0, amp = 1, dc = 0) {
  const f = new Float64Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) f[y * N + x] = dc + amp * Math.cos(TAU * (u * x + v * y) / N + ph);
  return f;
}

// fftshift for display of a spatial array (puts the origin in the middle)
function shift(a, N) {
  const b = new Float64Array(N * N), h = N / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) b[((y + h) % N) * N + ((x + h) % N)] = a[y * N + x];
  return b;
}

// ======================================================= Demo 1
function demo1() {
  const N = 32;
  const draw = () => {
    const k = L.num('d1k'), ph = L.num('d1p') * Math.PI / 180;
    L.out('d1ko', k); L.out('d1po', L.$('d1p').value + '°');
    const n = [], x = [], cx = [], cy = [];
    for (let i = 0; i < N; i++) { n.push(i); x.push(Math.cos(TAU * k * i / N + ph)); }
    for (let t = 0; t <= N - 1; t += 0.1) { cx.push(t); cy.push(Math.cos(TAU * k * t / N + ph)); }
    L.plot(L.$('d1x'), {
      xmin: -0.5, xmax: N - 0.5, ymin: -1.25, ymax: 1.25, yticks: [-1, 0, 1], xticks: [0, 8, 16, 24, 31], xlabel: 'n',
      series: [{ x: cx, y: cy, color: L.css('--line-strong'), width: 1 }, { x: n, y: x, type: 'stem', color: L.css('--acc') }]
    });
    const re = Float64Array.from(x), im = new Float64Array(N);
    L.fft1(re, im, false);
    const kk = [], mag = [];
    for (let q = -N / 2; q < N / 2; q++) { kk.push(q); const i = L.wrap(q, N); mag.push(Math.hypot(re[i], im[i])); }
    L.plot(L.$('d1X'), {
      xmin: -N / 2 - 0.5, xmax: N / 2 - 0.5, ymin: 0, ymax: N * 1.08, yticks: [0, 16, 32], xticks: [-16, -8, 0, 8, 15], xlabel: "k'",
      series: [{ x: kk, y: mag, type: 'stem', color: L.css('--acc2') }]
    });
    const s = L.$('d1s'); s.width = N; s.height = 1;
    const ctx = s.getContext('2d'), id = ctx.createImageData(N, 1);
    for (let i = 0; i < N; i++) { const g = (x[i] + 1) * 127.5; id.data.set([g, g, g, 255], 4 * i); }
    ctx.putImageData(id, 0, 0);
    const img = new Float64Array(N * N);
    for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) img[y * N + i] = x[i];
    L.putGray(L.$('d1i'), img, N, -1, 1);
  };
  L.on(['d1k', 'd1p'], draw); L.redraw(draw); draw();
}

// ======================================================= Demo 2
function demo2() {
  const N = 128, M = 64, LIM = 24;
  const box = L.$('d2specbox'), imgStack = L.$('d2img').parentElement;
  let u = 6, v = 3;
  const intOnly = () => L.$('d2int').checked;
  const snap = a => Math.max(-LIM, Math.min(LIM, intOnly() ? Math.round(a) : Math.round(a * 10) / 10));

  function overlays() {
    const acc = L.css('--acc'), acc2 = L.css('--acc2');
    let { ctx, w } = L.overlay(imgStack);
    const rho = Math.hypot(u, v);
    if (rho > 0) {
      const lam = N / rho * w / N, len = Math.min(lam, 0.46 * w);
      L.arrow(ctx, w / 2, w / 2, w / 2 + len * u / rho, w / 2 + len * v / rho, acc, 2.5);
      L.label(ctx, lam > 0.46 * w ? 'k (λ longer than shown)' : 'k', w / 2 + len * u / rho + 6, w / 2 + len * v / rho - 10, acc);
    }
    ({ ctx, w } = L.overlay(box));
    const s = w / M, P = (a, b) => [(a + M / 2 + 0.5) * s, (b + M / 2 + 0.5) * s];
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    const [cx, cy] = P(0, 0);
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, w); ctx.stroke();
    L.label(ctx, 'u →', w - 6, cy - 10, '#ddd', 'right');
    L.label(ctx, 'v ↓', cx + 6, w - 10, '#ddd');
    const [ax, ay] = P(u, v), [bx, by] = P(-u, -v);
    L.ring(ctx, ax, ay, 9, acc, 2.5); L.ring(ctx, bx, by, 9, acc2, 2);
    L.label(ctx, `+k (${L.fmt(u, intOnly() ? 0 : 1)}, ${L.fmt(v, intOnly() ? 0 : 1)})`, ax + 12, ay - 12, acc);
    L.label(ctx, '−k', bx + 12, by + 12, acc2);
    if (rho > 0) L.label(ctx, 'DC', cx + 8, cy + 11, '#ddd');
  }

  function draw() {
    const d = intOnly() ? 0 : 1, ph = L.num('d2p') * Math.PI / 180;
    L.$('d2u').value = u; L.$('d2v').value = v;
    L.out('d2uo', L.fmt(u, d)); L.out('d2vo', L.fmt(v, d)); L.out('d2po', L.$('d2p').value + '°');
    const f = grating(N, u, v, ph, 0.5, 0.5);
    L.putGray(L.$('d2img'), f, N, 0, 1);
    const S = L.spectrum(f, N);
    L.putSpec(L.$('d2spec'), S.re, S.im, N, { crop: M });
    overlays();
    const rho = Math.hypot(u, v), th = Math.atan2(v, u) * 180 / Math.PI;
    L.$('d2read').innerHTML = rho === 0
      ? '<span>(u, v) = (0, 0): a flat image, only the DC dot</span>'
      : `<span><i>ρ =</i> ${rho.toFixed(2)} cycles per ${N} px</span>
         <span><i>wavelength λ = N/ρ =</i> ${(N / rho).toFixed(1)} px</span>
         <span><i>k points at θ =</i> ${th.toFixed(1)}°</span>
         <span><i>stripes run at</i> ${(((th + 90) % 180) + 180) % 180 | 0}°</span>
         <span><i>angles: from +x, clockwise on screen (y points down)</i></span>`;
  }

  L.on(['d2u', 'd2v'], () => { u = snap(L.num('d2u')); v = snap(L.num('d2v')); draw(); });
  L.on(['d2p'], draw);
  L.$('d2int').addEventListener('change', () => {
    const st = intOnly() ? 1 : 0.1;
    L.$('d2u').step = st; L.$('d2v').step = st;
    u = snap(u); v = snap(v); draw();
  });
  L.onDrag(box, (fx, fy) => { u = snap(fx * M - M / 2 - 0.5); v = snap(fy * M - M / 2 - 0.5); draw(); });
  L.$('d2pre').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const pu = +b.dataset.u, pv = +b.dataset.v;
    if (!Number.isInteger(pu) || !Number.isInteger(pv)) { L.$('d2int').checked = false; L.$('d2u').step = 0.1; L.$('d2v').step = 0.1; }
    u = pu; v = pv; L.$('d2p').value = 0; draw();
  });
  L.redraw(overlays); draw();
}

// ======================================================= Demo 3
function demo3() {
  const R = 4, n = 2 * R + 1, cell = 48, gap = 5, W = n * cell + (n + 1) * gap;
  const cv = L.$('d3c'), box = L.$('d3box');
  let hover = null, useSin = false;
  function base() {
    cv.width = W; cv.height = W;
    const ctx = cv.getContext('2d');
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u = i - R, v = j - R, id = ctx.createImageData(cell, cell);
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const a = TAU * (u * x + v * y) / cell, g = 127.5 + 127.5 * (useSin ? Math.sin(a) : Math.cos(a));
        id.data.set([g, g, g, 255], 4 * (y * cell + x));
      }
      ctx.putImageData(id, gap + i * (cell + gap), gap + j * (cell + gap));
    }
  }
  function overlay() {
    const { ctx, w } = L.overlay(box), s = w / W;
    const rect = (i, j, c, lw) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.strokeRect((gap + i * (cell + gap) - 2) * s, (gap + j * (cell + gap) - 2) * s, (cell + 4) * s, (cell + 4) * s); };
    rect(R, R, L.css('--muted'), 1.5);
    if (hover) {
      const [i, j] = hover;
      rect(i, j, L.css('--acc'), 3);
      if (i !== R || j !== R) rect(2 * R - i, 2 * R - j, L.css('--acc2'), 3);
    }
  }
  function pick(fx, fy) {
    const i = Math.min(n - 1, Math.floor(fx * n)), j = Math.min(n - 1, Math.floor(fy * n));
    hover = [i, j];
    readout();
  }
  function readout() {
    if (!hover) return;
    const [i, j] = hover;
    const u = i - R, v = j - R, rho = Math.hypot(u, v);
    L.$('d3read').innerHTML = rho === 0
      ? (useSin ? '<span>(0, 0): sin(0) = 0 everywhere, so the DC term has no sine part (flat mid-grey)</span>'
                : '<span>(0, 0): the DC term, a flat image (its average brightness)</span>')
      : `<span><i>(u, v) =</i> (${u}, ${v})</span><span><i>ρ =</i> ${rho.toFixed(2)} cycles per tile</span>
         <span><i>k at</i> ${(Math.atan2(v, u) * 180 / Math.PI).toFixed(0)}°</span>
         <span style="color:var(--acc2)"><i>partner</i> (${-u}, ${-v}): ${useSin ? 'same stripes, black and white swapped (sin(−α) = −sin α)' : 'same picture (cos(−α) = cos α)'}</span>`;
    overlay();
  }
  box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
  box.addEventListener('pointerdown', e => { const r = box.getBoundingClientRect(); pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
  const mode = s => { useSin = s; L.$('d3cos').classList.toggle('on', !s); L.$('d3sin').classList.toggle('on', s); base(); readout(); overlay(); };
  L.$('d3cos').onclick = () => mode(false);
  L.$('d3sin').onclick = () => mode(true);
  base(); overlay(); L.redraw(overlay);
}

// ======================================================= Demo 4
function demo4() {
  const N = 128, R = 16, imgStack = L.$('d4img').parentElement, fpStack = L.$('d4fp').parentElement;
  function draw() {
    const u = L.num('d4u'), v = L.num('d4v'), al = L.num('d4a') * Math.PI / 180;
    L.out('d4uo', u); L.out('d4vo', v); L.out('d4ao', L.$('d4a').value + '°');
    L.putGray(L.$('d4img'), grating(N, u, v, 0, 0.5, 0.5), N, 0, 1);
    const ex = Math.cos(al), ey = Math.sin(al), proj = u * ex + v * ey, acc3 = L.css('--acc3');
    // path on the image (centre at pixel N/2)
    let { ctx, w } = L.overlay(imgStack);
    const sc = w / N, cx = (N / 2 + 0.5) * sc;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = acc3; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 64 * ex * sc, cx - 64 * ey * sc); ctx.lineTo(cx + 63 * ex * sc, cx + 63 * ey * sc); ctx.stroke();
    ctx.setLineDash([]);
    L.arrow(ctx, cx + 40 * ex * sc, cx + 40 * ey * sc, cx + 60 * ex * sc, cx + 60 * ey * sc, acc3, 2.5);
    L.label(ctx, 's', cx + 60 * ex * sc + 8, cx + 60 * ey * sc, acc3);
    // frequency plane
    ({ ctx, w } = L.overlay(fpStack));
    const c = w / 2, k = (w * 0.46) / R, P = (a, b) => [c + a * k, c + b * k];
    ctx.strokeStyle = L.css('--line-strong'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, c); ctx.lineTo(w, c); ctx.moveTo(c, 0); ctx.lineTo(c, w); ctx.stroke();
    L.label(ctx, 'u', w - 10, c - 10, L.css('--muted'), 'right');
    L.label(ctx, 'v', c + 10, w - 10, L.css('--muted'));
    ctx.setLineDash([6, 4]); ctx.strokeStyle = acc3; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c - w * ex, c - w * ey); ctx.lineTo(c + w * ex, c + w * ey); ctx.stroke();
    const [kx, ky] = P(u, v), [px, py] = P(proj * ex, proj * ey);
    ctx.strokeStyle = L.css('--muted'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(px, py); ctx.stroke();
    ctx.setLineDash([]);
    if (u || v) L.arrow(ctx, c, c, kx, ky, L.css('--acc'), 2.5);
    ctx.fillStyle = L.css('--acc2');
    ctx.beginPath(); ctx.arc(...P(-u, -v), 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = acc3; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(px, py); ctx.stroke();
    L.label(ctx, 'k', kx + 8, ky - 8, L.css('--acc'));
    L.label(ctx, `k·e = ${proj.toFixed(2)}`, px + 8, py + 12, acc3);
    // profile
    const xs = [], ys = [];
    for (let s = -64; s <= 63; s += 0.25) { xs.push(s); ys.push(0.5 + 0.5 * Math.cos(TAU * proj * s / N)); }
    L.plot(L.$('d4prof'), { xmin: -64, xmax: 63, ymin: 0, ymax: 1, yticks: [0, 0.5, 1], xticks: [-64, -32, 0, 32, 63], xlabel: 's (pixels along the path)', series: [{ x: xs, y: ys, color: acc3, width: 2 }] });
    const rho = Math.hypot(u, v);
    L.$('d4read').innerHTML = `<span><i>|k| = ρ =</i> ${rho.toFixed(2)}</span>
      <span style="color:var(--acc3)"><i>frequency along path = u cos α + v sin α =</i> ${proj.toFixed(2)} cycles per ${N} px</span>
      <span><i>1-D wavelength on path =</i> ${Math.abs(proj) < 1e-6 ? '∞ (walking along a stripe)' : (N / Math.abs(proj)).toFixed(1) + ' px'}</span>`;
  }
  L.on(['d4u', 'd4v', 'd4a'], draw); L.redraw(draw); draw();
}

// ======================================================= Demo 5
function demo5(photo) {
  const N = 256;
  const inputs = {
    rect: () => { const f = new Float64Array(N * N); for (let y = 100; y < 156; y++) for (let x = 88; x < 168; x++) f[y * N + x] = 1; return f; },
    plaid: () => { const a = grating(N, 20, 0, 0, 0.25, 0.5), b = grating(N, 6, 24, 0, 0.25); return a.map((t, i) => t + b[i]); },
    photo: () => photo
  };
  const notes = {
    rect: 'Only the rows that cross the rectangle are non-zero after the row stage, and all of them hold the same 1-D sinc, because every such row is the same pulse. The column stage then sees a pulse running down each column, and gives a sinc along v as well. The result is sinc × sinc.',
    plaid: 'Grating 1 has (u, v) = (20, 0) and grating 2 has (6, 24). After the row stage, both just look like bright vertical lines at u = ±20 and u = ±6: every row contains those horizontal frequencies. The difference is hidden in the phase, which for grating 2 changes from row to row. The column stage turns that change into the v coordinate, and the dots for grating 2 move to v = ±24.',
    photo: 'Each row of the photo has most energy at low u, so after the row stage the energy gathers near the vertical centre line. The column stage then does the same for v.'
  };
  function show(k) {
    const f = inputs[k]();
    L.putGray(L.$('d5a'), f, N, 0, 1);
    const re = Float64Array.from(f), im = new Float64Array(N * N);
    L.fft2(re, im, N, false, 'rows');
    L.putSpec(L.$('d5b'), re, im, N, { shiftY: false, dilate: k === 'plaid' });
    L.fft2(re, im, N, false, 'cols');
    L.putSpec(L.$('d5c'), re, im, N, { dilate: k === 'plaid' });
    L.out('d5note', notes[k]);
  }
  chips('d5pick', show); show('rect');
}

// ======================================================= Demo 6
function demo6() {
  const N = 128, M = 64, cols = ['--acc', '--acc2', '--acc3'];
  const comp = [{ on: true, u: 8, v: 0, a: 1 }, { on: true, u: 0, v: 8, a: 1 }, { on: false, u: 5, v: -5, a: 0.5 }];
  const rowsBox = L.$('d6rows'), partsBox = L.$('d6parts'), specStack = L.$('d6spec').parentElement;
  rowsBox.innerHTML = comp.map((c, i) => `
    <div class="controls" style="margin-bottom:0.5rem">
      <div class="ctl"><input type="checkbox" id="d6on${i}" aria-label="grating ${i + 1} on"><label for="d6on${i}" style="color:var(${cols[i]})">grating ${i + 1}</label></div>
      <div class="ctl"><label for="d6u${i}">u</label><input type="range" id="d6u${i}" min="-24" max="24" step="1"><output id="d6uo${i}"></output></div>
      <div class="ctl"><label for="d6v${i}">v</label><input type="range" id="d6v${i}" min="-24" max="24" step="1"><output id="d6vo${i}"></output></div>
      <div class="ctl"><label for="d6a${i}">amplitude</label><input type="range" id="d6a${i}" min="0" max="1" step="0.05"><output id="d6ao${i}"></output></div>
    </div>`).join('');
  partsBox.innerHTML = comp.map((c, i) => `<div class="stack" style="outline:2px solid var(${cols[i]}); outline-offset:-2px"><canvas class="px" id="d6p${i}"></canvas></div>`).join('');
  const toUI = () => comp.forEach((c, i) => { L.$('d6on' + i).checked = c.on; L.$('d6u' + i).value = c.u; L.$('d6v' + i).value = c.v; L.$('d6a' + i).value = c.a; });
  const fromUI = () => comp.forEach((c, i) => { c.on = L.$('d6on' + i).checked; c.u = L.num('d6u' + i); c.v = L.num('d6v' + i); c.a = L.num('d6a' + i); });
  let S = null;
  function overlay() {
    const { ctx, w } = L.overlay(specStack), s = w / M;
    comp.forEach((c, i) => {
      if (!c.on || c.a === 0) return;
      const col = L.css(cols[i]);
      for (const sg of [1, -1]) L.ring(ctx, (sg * c.u + M / 2 + 0.5) * s, (sg * c.v + M / 2 + 0.5) * s, 8, col, 2);
    });
  }
  function draw() {
    fromUI();
    const f = new Float64Array(N * N);
    comp.forEach((c, i) => {
      L.out('d6uo' + i, c.u); L.out('d6vo' + i, c.v); L.out('d6ao' + i, c.a.toFixed(2));
      const g = grating(N, c.u, c.v, 0, c.a);
      L.putGray(L.$('d6p' + i), g, N, -1, 1);
      L.$('d6p' + i).parentElement.style.opacity = c.on ? 1 : 0.3;
      if (c.on) for (let k = 0; k < f.length; k++) f[k] += g[k];
    });
    L.putGray(L.$('d6img'), f, N);
    S = L.spectrum(f, N);
    L.putSpec(L.$('d6spec'), S.re, S.im, N, { crop: M });
    overlay();
  }
  const presets = {
    plaid: [[1, 8, 0, 1], [1, 0, 8, 1], [0, 5, -5, 0.5]],
    diag: [[1, 6, 6, 1], [1, 6, -6, 1], [0, 0, 8, 0.5]],
    moire: [[1, 12, 0, 1], [1, 13, 1, 1], [0, 0, 8, 0.5]],
    hex: [[1, 8, 0, 1], [1, -4, 7, 1], [1, -4, -7, 1]],
    harm: [[1, 4, 2, 1], [1, 12, 6, 0.35], [1, 20, 10, 0.2]]
  };
  L.$('d6pre').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    presets[b.dataset.p].forEach((p, i) => Object.assign(comp[i], { on: !!p[0], u: p[1], v: p[2], a: p[3] }));
    toUI(); draw();
  });
  rowsBox.addEventListener('input', draw);
  toUI(); draw(); L.redraw(overlay);
}

// ======================================================= Demo 7
function demo7() {
  const n = 8, px = 6, cell = n * px, gap = 6, W = n * cell + (n + 1) * gap;
  const cv = L.$('d7c'), box = L.$('d7box');
  let useSin = false, sel = [5, 4];   // grid column, row -> u = col-4, v = row-4
  const val = (u, v, x, y) => { const a = TAU * (u * x + v * y) / n; return useSin ? -Math.sin(a) : Math.cos(a); };
  function base() {
    cv.width = W; cv.height = W;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, W);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u = i - 4, v = j - 4, ox = gap + i * (cell + gap), oy = gap + j * (cell + gap);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const g = Math.round(127.5 + 127.5 * val(u, v, x, y));
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(ox + x * px, oy + y * px, px, px);
      }
    }
  }
  function overlay() {
    const { ctx, w } = L.overlay(box), s = w / W;
    const [i, j] = sel;
    ctx.strokeStyle = L.css('--acc'); ctx.lineWidth = 3;
    ctx.strokeRect((gap + i * (cell + gap) - 3) * s, (gap + j * (cell + gap) - 3) * s, (cell + 6) * s, (cell + 6) * s);
    ctx.strokeStyle = L.css('--muted'); ctx.lineWidth = 1.5;
    ctx.strokeRect((gap + 4 * (cell + gap) - 3) * s, (gap + 4 * (cell + gap) - 3) * s, (cell + 6) * s, (cell + 6) * s);
  }
  function big() {
    const [i, j] = sel, u = i - 4, v = j - 4, a = new Float64Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) a[y * n + x] = val(u, v, x, y);
    L.putGray(L.$('d7big'), a, n, -1, 1);
    let note;
    const zeroSin = useSin && (u === 0 || u === -4) && (v === 0 || v === -4);
    if (u === 0 && v === 0) note = useSin ? 'The DC term has no sine part. It is all zero (mid-grey).' : 'The DC basis: a constant. Its weight F(0,0) is the sum of all pixels.';
    else if (zeroSin) note = 'All zero: the sine is sampled exactly at its zero crossings. These frequencies (built only from 0 and the Nyquist value −4) have no sine partner.';
    else if (u === -4 || v === -4) note = 'This uses the Nyquist frequency −4: the pattern flips sign at every pixel step in that direction. It is the finest pattern an 8-pixel grid can show, and +4 would give exactly the same samples.';
    else note = `Stripes perpendicular to k = (${u}, ${v}). Its partner (${-u}, ${-v}) has the same cosine${useSin ? ' with the opposite sign' : ''}.`;
    L.$('d7cap').innerHTML = `${tex(`(u,v)=(${u},${v}):\\;${useSin ? '-\\sin' : '\\cos'}\\!\\left(\\tfrac{2\\pi(${u}x+${v}y)}{8}\\right)`)}<br>${note}`;
  }
  function pickAt(e) {
    const r = box.getBoundingClientRect();
    sel = [Math.min(n - 1, Math.floor((e.clientX - r.left) / r.width * n)), Math.min(n - 1, Math.floor((e.clientY - r.top) / r.height * n))];
    overlay(); big();
  }
  box.addEventListener('pointerdown', pickAt);
  const mode = s => { useSin = s; L.$('d7cos').classList.toggle('on', !s); L.$('d7sin').classList.toggle('on', s); base(); overlay(); big(); };
  L.$('d7cos').onclick = () => mode(false);
  L.$('d7sin').onclick = () => mode(true);
  mode(false); L.redraw(overlay);
}

// ======================================================= Demo 7b: paint an 8 x 8 image
function demo7p() {
  const n = 8, EPS = 1e-9;
  const f = new Float64Array(n * n);
  let brush = 1, hover = null, S = null;
  const imgBox = L.$('d7pimgbox'), wBox = L.$('d7pw');
  const partner = i => L.idx(-(i % n), -((i / n) | 0), n);
  // the 34 real gratings: one representative index per mirror pair (or self-partner)
  const reps = [];
  for (let i = 0; i < n * n; i++) if (i <= partner(i)) reps.push(i);
  L.$('d7pk').max = reps.length;
  const presets = {
    clear: () => 0,
    flat: () => 0.5,
    pixel: (x, y) => (x === 2 && y === 5 ? 1 : 0),
    stripes: (x, y) => 0.5 + 0.5 * Math.cos(TAU * (2 * x + y) / n),
    checker: (x, y) => (x + y) % 2,
    letter: (x, y) => ((x === 2 && y >= 1 && y <= 6) || (y === 6 && x >= 2 && x <= 5) ? 1 : 0),
    blob: (x, y) => Math.exp(-((x - 3.5) ** 2 + (y - 3.5) ** 2) / (2 * 1.6 ** 2)),
    random: () => Math.random()
  };
  const fmtF = z => { const r = Math.abs(z) < 1e-9 ? 0 : z; return Math.abs(r - Math.round(r)) < 0.005 ? Math.round(r).toString() : r.toFixed(2); };
  const MAGMA = [[0, 0, 0, 4], [.25, 79, 18, 123], [.5, 181, 54, 122], [.75, 251, 135, 97], [1, 252, 253, 191]];
  const magma = t => {
    let q = 0;
    while (q < MAGMA.length - 2 && t > MAGMA[q + 1][0]) q++;
    const a = MAGMA[q], b = MAGMA[q + 1], w = (t - a[0]) / (b[0] - a[0]);
    return [1, 2, 3].map(c => Math.round(a[c] + w * (b[c] - a[c]))).join(',');
  };

  function gridLines() {
    const { ctx, w } = L.overlay(imgBox), s = w / n;
    ctx.strokeStyle = 'rgba(128,128,128,0.55)'; ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, w); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke();
    }
  }
  function weights() {
    const { ctx, w } = L.overlay(wBox), s = w / n;
    let mx = 0;
    for (let i = 0; i < n * n; i++) mx = Math.max(mx, Math.hypot(S.re[i], S.im[i]));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.max(9, Math.round(s * 0.28))}px "JetBrains Mono", ui-monospace, monospace`;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = L.idx(i - n / 2, j - n / 2, n), m = Math.hypot(S.re[k], S.im[k]);
      const g = m > EPS ? 0.15 + 0.85 * Math.log1p(m) / Math.log1p(mx) : 0;
      ctx.fillStyle = m > EPS ? `rgb(${magma(g)})` : L.css('--surface-2');
      ctx.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      ctx.fillStyle = m > EPS ? (g > 0.6 ? '#111' : '#f3f3f3') : L.css('--muted');
      ctx.fillText(m > EPS ? fmtF(m) : '·', (i + 0.5) * s, (j + 0.5) * s);
    }
    ctx.strokeStyle = L.css('--muted'); ctx.lineWidth = 1.5;
    ctx.strokeRect(4 * s + 0.5, 4 * s + 0.5, s - 1, s - 1);
    if (hover) {
      const [i, j] = hover, ci = centred(L.wrap(4 - i, n), n) + 4, cj = centred(L.wrap(4 - j, n), n) + 4;
      ctx.strokeStyle = L.css('--acc'); ctx.lineWidth = 3; ctx.strokeRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
      if (ci !== i || cj !== j) { ctx.strokeStyle = L.css('--acc2'); ctx.lineWidth = 2; ctx.strokeRect(ci * s + 2, cj * s + 2, s - 4, s - 4); }
    }
  }
  function hoverText() {
    if (!hover) { L.$('d7phov').innerHTML = '<span>Point at a weight</span>'; return; }
    const u = hover[0] - 4, v = hover[1] - 4, k = L.idx(u, v, n), re = S.re[k], im = S.im[k];
    const self = k === partner(k), m = Math.hypot(re, im), ph = Math.atan2(im, re) * 180 / Math.PI;
    const z = `${fmtF(re)} ${im < -EPS ? '−' : '+'} ${fmtF(Math.abs(im))}j`;
    L.$('d7phov').innerHTML = `<span><i>(u, v) =</i> (${u}, ${v})</span><span><i>F =</i> ${z}</span>
      <span><i>|F| =</i> ${fmtF(m)}${m > EPS ? `, <i>∠F =</i> ${ph.toFixed(0)}°` : ''}</span>
      <span style="color:var(--acc2)">${self ? 'its own partner: F is always real here' : `<i>partner</i> (${centred(L.wrap(-u, n), n)}, ${centred(L.wrap(-v, n), n)}) holds the conjugate`}</span>`;
  }
  function rebuild() {
    const K = L.num('d7pk');
    const order = reps.slice().sort((a, b) => Math.hypot(S.re[b], S.im[b]) - Math.hypot(S.re[a], S.im[a]));
    const re = new Float64Array(n * n), im = new Float64Array(n * n);
    for (let q = 0; q < K; q++) {
      const i = order[q], c = partner(i);
      re[i] = S.re[i]; im[i] = S.im[i]; re[c] = S.re[c]; im[c] = S.im[c];
    }
    const g = L.ifftReal(re, im, n);
    let err = 0;
    for (let i = 0; i < n * n; i++) err = Math.max(err, Math.abs(g[i] - f[i]));
    L.putGray(L.$('d7prec'), g, n, 0, 1);
    L.out('d7pko', `${K} of ${reps.length}`);
    L.out('d7preccap', `rebuilt from the strongest ${K} of ${reps.length} gratings: largest pixel error ${err < 1e-9 ? '0 (exact)' : err.toFixed(2)}`);
  }
  function update() {
    L.putGray(L.$('d7pimg'), f, n, 0, 1);
    gridLines();
    S = L.spectrum(f, n);
    let lit = 0, used = 0;
    for (let i = 0; i < n * n; i++) if (Math.hypot(S.re[i], S.im[i]) > EPS) lit++;
    for (const r of reps) if (Math.hypot(S.re[r], S.im[r]) > EPS) used++;
    L.$('d7pread').innerHTML = `<span><i>DFT values lit:</i> ${lit} of 64</span><span><i>gratings used:</i> ${used} of ${reps.length}</span>`;
    weights(); hoverText(); rebuild();
  }

  L.onDrag(imgBox, (fx, fy) => {
    const x = Math.min(n - 1, Math.floor(fx * n)), y = Math.min(n - 1, Math.floor(fy * n));
    if (f[y * n + x] === brush) return;
    f[y * n + x] = brush; update();
  });
  const pointAt = e => {
    const r = wBox.getBoundingClientRect();
    const i = Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * n)));
    const j = Math.min(n - 1, Math.max(0, Math.floor((e.clientY - r.top) / r.height * n)));
    if (hover && hover[0] === i && hover[1] === j) return;
    hover = [i, j]; weights(); hoverText();
  };
  wBox.addEventListener('pointermove', pointAt);
  wBox.addEventListener('pointerdown', pointAt);
  chips('d7pbrush', k => { brush = +k; });
  L.$('d7ppre').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const fn = presets[b.dataset.k];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) f[y * n + x] = fn(x, y);
    L.$('d7pk').value = reps.length; update();
  });
  L.on(['d7pk'], rebuild);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) f[y * n + x] = presets.letter(x, y);
  update(); L.redraw(() => { gridLines(); weights(); });
}

// ======================================================= Demo 8
function demo8(photos) {
  const N = 256;
  const prep = f => {
    const S = L.spectrum(f, N), reps = [];
    let total = 0, dc = 0;
    for (let i = 0; i < N * N; i++) {
      const x = i % N, y = (i / N) | 0, c = L.idx(-x, -y, N);
      if (i <= c) reps.push(i);
    }
    const mag = i => Math.hypot(S.re[i], S.im[i]);
    for (let i = 0; i < N * N; i++) total += mag(i) ** 2;
    dc = mag(0) ** 2;
    const byMag = reps.slice().sort((a, b) => mag(b) - mag(a));
    const r2 = i => { const u = centred(i % N, N), v = centred((i / N) | 0, N); return u * u + v * v; };
    const byFreq = reps.slice().sort((a, b) => r2(a) - r2(b) || mag(b) - mag(a));
    return { f, S, mag, total, dc, order: { mag: byMag, freq: byFreq } };
  };
  const data = { building: prep(photos.building), aerial: prep(photos.aerial) };
  let cur = 'building', ord = 'mag', playing = 0;
  const nPairs = data.building.order.mag.length;
  const Kof = s => (s <= 0 ? 1 : Math.max(1, Math.round(Math.exp(s / 1000 * Math.log(nPairs)))));
  const lastStack = L.$('d8last').parentElement;
  let lastK = [0, 0];

  function draw() {
    const D = data[cur], order = D.order[ord], K = Kof(L.num('d8k'));
    const re = new Float64Array(N * N), im = new Float64Array(N * N), mask = new Uint8Array(N * N);
    let e = 0;
    for (let q = 0; q < K; q++) {
      const i = order[q], x = i % N, y = (i / N) | 0, c = L.idx(-x, -y, N);
      re[i] = D.S.re[i]; im[i] = D.S.im[i]; re[c] = D.S.re[c]; im[c] = D.S.im[c];
      mask[i] = mask[c] = 1;
      e += D.mag(i) ** 2 * (i === c ? 1 : 2);
    }
    const rec = L.ifftReal(re, im, N);
    L.putGray(L.$('d8rec'), rec, N, 0, 1);
    L.putSpec(L.$('d8spec'), D.S.re, D.S.im, N, { mask });
    let err = 0;
    for (let i = 0; i < N * N; i++) err += (rec[i] - D.f[i]) ** 2;
    // last added grating
    const i = order[K - 1], u = centred(i % N, N), v = centred((i / N) | 0, N);
    const self = i === L.idx(-u, -v, N);
    const amp = D.mag(i) / (N * N) * (self ? 1 : 2), ph = Math.atan2(D.S.im[i], D.S.re[i]);
    L.putGray(L.$('d8last'), grating(N, u, v, ph, 1), N, -1, 1);
    lastK = [u, v];
    lastOverlay();
    L.$('d8lastcap').innerHTML = (u === 0 && v === 0)
      ? 'the grating added last: the DC term (flat, the mean brightness)'
      : `the grating added last: (u, v) = (${u}, ${v}), amplitude ${(amp * 255).toFixed(1)} grey levels (contrast stretched here)`;
    L.out('d8ko', K.toLocaleString());
    const varTot = D.total - D.dc, varGot = e - D.dc;
    L.$('d8read').innerHTML = `<span><i>K =</i> ${K.toLocaleString()} of ${nPairs.toLocaleString()} pairs (${(100 * K / nPairs).toFixed(K / nPairs < 0.01 ? 2 : 1)}%)</span>
      <span><i>detail energy captured (excluding the mean):</i> ${(100 * varGot / varTot).toFixed(1)}%</span>
      <span><i>RMS error:</i> ${(255 * Math.sqrt(err / (N * N))).toFixed(1)} grey levels</span>`;
  }
  function lastOverlay() {
    const { ctx, w } = L.overlay(lastStack), [u, v] = lastK, rho = Math.hypot(u, v);
    if (!rho) return;
    const len = Math.min(N / rho, 0.46 * N) * w / N;
    L.arrow(ctx, w / 2, w / 2, w / 2 + len * u / rho, w / 2 + len * v / rho, L.css('--acc'), 2.5);
  }
  let pend = 0;
  const req = () => { cancelAnimationFrame(pend); pend = requestAnimationFrame(draw); };
  L.on(['d8k'], req);
  chips('d8img', k => { cur = k; draw(); });
  chips('d8ord', k => { ord = k; draw(); });
  L.$('d8play').onclick = () => {
    if (playing) { cancelAnimationFrame(playing); playing = 0; L.$('d8play').textContent = '▶ play'; return; }
    const sl = L.$('d8k');
    if (+sl.value >= 1000) sl.value = 0;
    const s0 = +sl.value, t0 = performance.now(), dur = 9000 * (1 - s0 / 1000);
    L.$('d8play').textContent = '❚❚ pause';
    const step = t => {
      const s = Math.min(1000, s0 + (t - t0) / dur * (1000 - s0));
      sl.value = s; draw();
      if (s < 1000) playing = requestAnimationFrame(step);
      else { playing = 0; L.$('d8play').textContent = '▶ play'; }
    };
    playing = requestAnimationFrame(step);
  };
  draw(); L.redraw(lastOverlay);
}

// ======================================================= Demo 9
function demo9(photoImg) {
  const N = 256, c = N / 2;
  const sub = [-0.25, 0.25];
  function analytic(fn, rot, s) {
    const f = new Float64Array(N * N), cs = Math.cos(rot), sn = Math.sin(rot);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let acc = 0;
      for (const dy of sub) for (const dx of sub) {
        const X = x + dx - c, Y = y + dy - c;
        acc += fn(X * cs + Y * sn, -X * sn + Y * cs, s);
      }
      f[y * N + x] = acc / 4;
    }
    return f;
  }
  function fromCanvas(paint, rot, s) {
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, N, N);
    ctx.translate(c, c); ctx.rotate(rot); ctx.scale(s, s);
    paint(ctx);
    const d = ctx.getImageData(0, 0, N, N).data, f = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) f[i] = d[4 * i] / 255;
    return f;
  }
  const mod = (a, m) => ((a % m) + m) % m;
  const kinds = {
    rect: (r, s) => analytic((x, y, s) => (Math.abs(x) < 30 * s && Math.abs(y) < 10 * s ? 1 : 0), r, s),
    disk: (r, s) => analytic((x, y, s) => (x * x + y * y < (18 * s) ** 2 ? 1 : 0), r, s),
    gauss: (r, s) => analytic((x, y, s) => Math.exp(-(x * x / (2 * (16 * s) ** 2) + y * y / (2 * (5 * s) ** 2))), r, s),
    line: (r, s) => analytic((x, y, s) => (Math.abs(x) < 90 && Math.abs(y) < 1.2 * s ? 1 : 0), r, s),
    square: (r, s) => analytic((x, y, s) => (Math.cos(TAU * x / (16 * s)) >= 0 ? 1 : 0), r, s),
    dots: (r, s) => analytic((x, y, s) => {
      const p = 16 * s, dx = mod(x, p) - p / 2, dy = mod(y, p) - p / 2;
      return Math.exp(-(dx * dx + dy * dy) / (2 * 1.6 ** 2));
    }, r, s),
    text: (r, s) => fromCanvas(ctx => {
      ctx.fillStyle = '#fff'; ctx.font = '700 62px Archivo, Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DA321', 0, 0);
    }, r, s),
    photo: (r, s) => fromCanvas(ctx => ctx.drawImage(photoImg, -c, -c), r, s)
  };
  const notes = {
    rect: 'A bar is a product of two 1-D pulses, so its spectrum is sinc(u) × sinc(v): a bright cross of ripples. The long side of the bar gives the narrow direction of the spectrum (scaling). Rotate the bar and the cross turns with it.',
    disk: 'A disc has no preferred direction, so its spectrum is circular. These rings are the 2-D relative of the sinc, called the Airy pattern: what a round lens aperture does to a point of light. Shrink the disc and the rings spread out.',
    gauss: 'A Gaussian transforms into a Gaussian. This blob is wide horizontally and narrow vertically, so its spectrum is narrow horizontally and wide vertically. There are no ripples because there are no sharp edges.',
    line: 'A thin line is sharp across its width, so it contains all frequencies whose k points across the line. Its spectrum is a line through the centre, perpendicular to the image line. The image line is long, so the spectrum line is thin.',
    square: 'Square-wave stripes repeat every 16 px, which is 16 cycles across 256 px. The spectrum shows dots at 16, 48, 80, 112: odd harmonics only, with amplitudes falling as 1, 1/3, 1/5 …, exactly the 1-D Fourier series of a square wave. Change the size or rotate, and the period no longer fits the tile exactly, so leakage lines appear.',
    dots: 'A lattice gives a lattice. Dots 16 px apart in the image become dots 256/16 = 16 bins apart in the spectrum: tight in one domain, wide in the other. The spectral dots fade outward because each image dot is a small blur rather than a single point.',
    text: 'Letters are mostly vertical and horizontal strokes, so the spectrum shows a strong cross. The slanted strokes of the A add their own streaks, each perpendicular to its stroke. Rotate the text and every streak turns with it.',
    photo: 'A natural photo: energy is highest near the centre and falls off with frequency. The horizontal and vertical streaks come partly from the building\'s many horizontal and vertical edges, and partly from the mismatched borders of the tile. Tick the Hann window and the border part disappears.'
  };
  let kind = 'rect';
  function draw() {
    const r = L.num('d9r') * Math.PI / 180, s = L.num('d9s');
    L.out('d9ro', L.$('d9r').value + '°'); L.out('d9so', s.toFixed(2) + '×');
    let f = kinds[kind](r, s);
    if (L.$('d9w').checked) {
      const w = new Float64Array(N);
      for (let i = 0; i < N; i++) w[i] = Math.sin(Math.PI * i / N) ** 2;
      f = f.map((t, i) => t * w[i % N] * w[(i / N) | 0]);
    }
    L.putGray(L.$('d9img'), f, N, 0, 1);
    const S = L.spectrum(f, N);
    L.putSpec(L.$('d9spec'), S.re, S.im, N);
    L.out('d9note', notes[kind]);
  }
  let pend = 0;
  const req = () => { cancelAnimationFrame(pend); pend = requestAnimationFrame(draw); };
  L.on(['d9r', 'd9s'], req); L.on(['d9w'], draw, 'change');
  chips('d9pick', k => { kind = k; draw(); });
  draw();
}

// ======================================================= Demo 9b: the wallpaper view
function demo9b(photos) {
  const N = 256;
  const ramp = grating(N, 10, 10, 0, 0.2);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) ramp[y * N + x] += 0.25 + 0.5 * y / (N - 1);
  const inputs = { building: photos.building, ramp, grating: grating(N, 8.5, 3, 0, 0.5, 0.5) };
  const notes = {
    building: 'Part of the cross comes from the seams: the photo is bright at the top (sky) and dark at the bottom (plants), so the horizontal seam is strong. The window removes that part, and the axis lines lose about 60% of their strength. A fainter cross remains, because the building itself is full of horizontal and vertical edges (floors, window rows, steps). That part is real content, and no window should remove it.',
    ramp: 'This test image has no horizontal or vertical edges of its own: diagonal stripes on a brightness ramp, dark at the top and bright at the bottom. Its only edge is the horizontal seam where the bright bottom of one tile meets the dark top of the next. So the spectrum shows only the vertical arm of the cross. The left and right borders match, so there is no horizontal arm. The window removes the arm, leaving the two stripe dots and a small glow near the centre from the smooth ramp.',
    grating: 'A grating with 8.5 cycles across the image does not fit the tile across, so there is a half-cycle jump at every join between side-by-side tiles (the vertical seams). Down the image it has a whole 3 cycles, so the stacked tiles join smoothly. Without the window, its dots smear into a long line along u: this is leakage. With the window, the energy gathers into a compact blob around the true frequency (8.5, 3), slightly wider than a single dot. That widening is the price of the window.'
  };
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) w[i] = Math.sin(Math.PI * i / N) ** 2;
  const tiles = [L.$('d9bta').parentElement, L.$('d9btb').parentElement];

  function tile(cv, a) {
    cv.width = 3 * N; cv.height = 3 * N;
    const ctx = cv.getContext('2d'), id = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const g = Math.max(0, Math.min(255, a[i] * 255));
      id.data[4 * i] = id.data[4 * i + 1] = id.data[4 * i + 2] = g; id.data[4 * i + 3] = 255;
    }
    for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) ctx.putImageData(id, tx * N, ty * N);
  }
  function outline() {
    for (const st of tiles) {
      const { ctx, w: W } = L.overlay(st);
      ctx.strokeStyle = L.css('--acc'); ctx.lineWidth = 2;
      ctx.strokeRect(W / 3, W / 3, W / 3, W / 3);
    }
  }
  function show(k) {
    const f = inputs[k];
    let mean = 0;
    for (let i = 0; i < N * N; i++) mean += f[i];
    mean /= N * N;
    const g = f.map((t, i) => mean + (t - mean) * w[i % N] * w[(i / N) | 0]);
    tile(L.$('d9bta'), f); tile(L.$('d9btb'), g);
    const A = L.spectrum(f, N), B = L.spectrum(g, N);
    const mx = Math.max(L.putSpec(L.$('d9bsa'), A.re, A.im, N), L.putSpec(L.$('d9bsb'), B.re, B.im, N));
    L.putSpec(L.$('d9bsa'), A.re, A.im, N, { max: mx });
    L.putSpec(L.$('d9bsb'), B.re, B.im, N, { max: mx });
    outline();
    L.out('d9bnote', notes[k]);
  }
  chips('d9bpick', show);
  show('building'); L.redraw(outline);
}

// ======================================================= Demo 10
function demo10(photos) {
  const N = 256, A = L.spectrum(photos.building, N), B = L.spectrum(photos.aerial, N);
  const combine = (magOf, phOf) => {
    const re = new Float64Array(N * N), im = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) {
      const m = magOf ? Math.hypot(magOf.re[i], magOf.im[i]) : 1;
      const p = phOf ? Math.atan2(phOf.im[i], phOf.re[i]) : 0;
      re[i] = m * Math.cos(p); im[i] = m * Math.sin(p);
    }
    return L.ifftReal(re, im, N);
  };
  const show = (id, a) => { const [lo, hi] = L.range(a, 0.005); L.putGray(L.$(id), a, N, lo, hi); };
  L.putGray(L.$('d10a'), photos.building, N, 0, 1);
  L.putGray(L.$('d10b'), photos.aerial, N, 0, 1);
  show('d10ab', combine(A, B));
  show('d10ba', combine(B, A));
  const m = shift(combine(A, null), N), [lo, hi] = L.range(m, 0.002);
  L.putGray(L.$('d10m'), m, N, lo, hi);
  show('d10p', combine(null, A));
}

// ======================================================= Demo 11
function demo11(photos) {
  const N = 256, spectra = { building: L.spectrum(photos.building, N), aerial: L.spectrum(photos.aerial, N) };
  let cur = 'building';
  const H = new Float64Array(N * N);
  function draw() {
    const type = L.$('d11type').value, soft = L.$('d11soft').checked;
    const r = L.num('d11r'), w = L.num('d11w'), a = L.num('d11a');
    L.out('d11ro', r); L.out('d11wo', w); L.out('d11ao', a + '°');
    L.$('d11w').disabled = type !== 'band';
    L.$('d11a').disabled = type !== 'wedge';
    L.$('d11r').disabled = type === 'wedge';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = centred(x, N), v = centred(y, N), rho = Math.hypot(u, v);
      let h;
      if (type === 'low' || type === 'high') {
        h = soft ? Math.exp(-rho * rho / (2 * r * r)) : (rho <= r ? 1 : 0);
        if (type === 'high') h = 1 - h;
      } else if (type === 'band') {
        h = soft ? Math.exp(-((rho - r) ** 2) / (2 * (w / 2) ** 2)) : (Math.abs(rho - r) <= w / 2 ? 1 : 0);
      } else {
        const th = mod180(Math.atan2(v, u) * 180 / Math.PI), d = Math.min(Math.abs(th - a), 180 - Math.abs(th - a));
        h = rho === 0 ? 1 : soft ? Math.exp(-d * d / (2 * 10 * 10)) : (d <= 15 ? 1 : 0);
      }
      H[y * N + x] = h;
    }
    const S = spectra[cur], re = new Float64Array(N * N), im = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) { re[i] = S.re[i] * H[i]; im[i] = S.im[i] * H[i]; }
    const g = L.ifftReal(re, im, N);
    L.putGray(L.$('d11o'), photos[cur], N, 0, 1);
    L.putSpec(L.$('d11s'), S.re, S.im, N, { weight: H });
    if (type === 'low' || type === 'wedge') L.putGray(L.$('d11g'), g, N, 0, 1);
    else { const [lo, hi] = L.range(g, 0.005); L.putGray(L.$('d11g'), g, N, lo, hi); }
    const edge = mod180(a + 90);
    const edgeWord = Math.min(edge, 180 - edge) < 20 ? 'horizontally' : Math.abs(edge - 90) < 20 ? 'vertically' : `at about ${edge}°`;
    L.out('d11note', {
      low: soft ? 'A Gaussian mask gives a smooth blur with no ripples, because the Gaussian has no sharp edges in either domain.'
        : 'The sharp-edged disc keeps only the coarse gratings, so the image blurs. Look for ripples beside strong edges: a sharp cut in frequency becomes an oscillating kernel in space (ringing). Tick "soft edge" to remove them.',
      high: 'Removing the coarse gratings leaves edges and texture. The average brightness (DC) goes too, so mid-grey here means zero.',
      band: 'A ring keeps one range of scales in every direction. Small radii pick out large shapes; large radii pick out fine texture.',
      wedge: `The wedge keeps gratings whose wave vector points within ±15° of ${a}° (and the DC term). Their stripes, and the edges they build, run ${edgeWord}.`
    }[type]);
  }
  const mod180 = t => ((t % 180) + 180) % 180;
  let pend = 0;
  const req = () => { cancelAnimationFrame(pend); pend = requestAnimationFrame(draw); };
  L.on(['d11r', 'd11w', 'd11a'], req);
  L.on(['d11type', 'd11soft'], draw, 'change');
  chips('d11img', k => { cur = k; draw(); });
  draw();
}

// ======================================================= Demo 12
function demo12(defaultImg) {
  let N = 256, src = defaultImg, name = 'campus photo (building)', S = null, mag = null, logLo = 0, logHi = 1, hover = null;
  const magBox = L.$('d12mbox'), phBox = L.$('d12pbox'), drop = L.$('d12drop');
  // hue in [0,1) -> rgb (HSL with fixed saturation)
  const hsl = (h, s, l) => {
    const a = s * Math.min(l, 1 - l), k = n => (n + h * 12) % 12;
    const c = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [255 * c(0), 255 * c(8), 255 * c(4)];
  };
  const bar = L.$('d12bar');
  bar.width = 256; bar.height = 1;
  {
    const ctx = bar.getContext('2d'), id = ctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) id.data.set([...hsl(i / 256, 0.85, 0.5), 255], 4 * i);
    ctx.putImageData(id, 0, 0);
  }

  // Grey N x N from any image: the centred square crop
  function toGray(img) {
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const m = Math.min(w, h);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, N, N);   // transparent pixels read as white
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (w - m) / 2, (h - m) / 2, m, m, 0, 0, N, N);
    const d = ctx.getImageData(0, 0, N, N).data, g = new Float64Array(N * N);
    let sum = 0;
    for (let i = 0; i < N * N; i++) {
      g[i] = (0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2]) / 255;
      sum += g[i];
    }
    return { g, mean: sum / (N * N) };
  }

  function compute() {
    const { g, mean } = toGray(src);
    L.putGray(L.$('d12img'), g, N, 0, 1);
    let h = g;
    if (L.$('d12win').checked) {   // window the deviation from the mean, so the mean (DC) is kept
      const w = new Float64Array(N);
      for (let i = 0; i < N; i++) w[i] = Math.sin(Math.PI * i / N) ** 2;
      h = g.map((t, i) => mean + (t - mean) * w[i % N] * w[(i / N) | 0]);
    }
    S = L.spectrum(h, N);
    mag = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) mag[i] = Math.hypot(S.re[i], S.im[i]);
    const logs = Float64Array.from(mag, m => Math.log1p(m)).sort();
    logLo = logs[logs.length >> 1]; logHi = logs[logs.length - 1];
    L.out('d12name', `${name}, grey, ${N} × ${N}`);
    hover = null;
    paint();
    L.$('d12read').innerHTML = '<span>Point at the magnitude or phase map</span>';
  }

  function paint() {
    L.putSpec(L.$('d12mag'), S.re, S.im, N);
    const cv = L.$('d12ph'); cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d'), id = ctx.createImageData(N, N), dim = L.$('d12dim').checked;
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const k = L.idx(px - N / 2, py - N / 2, N), ph = Math.atan2(S.im[k], S.re[k]);
      let l = 0.5;
      if (dim) l = 0.5 * Math.max(0, Math.min(1, (Math.log1p(mag[k]) - logLo) / (logHi - logLo)));
      id.data.set([...hsl((ph + Math.PI) / TAU % 1, 0.85, l), 255], 4 * (py * N + px));
    }
    ctx.putImageData(id, 0, 0);
    overlays();
  }

  function overlays() {
    for (const box of [magBox, phBox]) {
      const { ctx, w } = L.overlay(box);
      if (!hover) continue;
      const s = w / N, [u, v] = hover;
      L.ring(ctx, (u + N / 2 + 0.5) * s, (v + N / 2 + 0.5) * s, 7, '#fff', 2);
      if (u || v) L.ring(ctx, (-u + N / 2 + 0.5) * s, (-v + N / 2 + 0.5) * s, 7, 'rgba(255,255,255,0.55)', 1.5);
    }
  }

  let pend = 0;
  function point(fx, fy) {
    const u = Math.min(N / 2 - 1, Math.floor(fx * N) - N / 2), v = Math.min(N / 2 - 1, Math.floor(fy * N) - N / 2);
    if (hover && hover[0] === u && hover[1] === v) return;
    hover = [u, v];
    cancelAnimationFrame(pend);
    pend = requestAnimationFrame(() => {
      const k = L.idx(u, v, N), ph = Math.atan2(S.im[k], S.re[k]), rho = Math.hypot(u, v);
      const self = k === L.idx(-u, -v, N), amp = mag[k] / (N * N) * (self ? 1 : 2);
      overlays();
      L.putGray(L.$('d12gr'), grating(N, u, v, ph, 1), N, -1, 1);
      const deg = x => (x * 180 / Math.PI).toFixed(0) + '°';
      L.$('d12read').innerHTML = rho === 0
        ? `<span><i>(u, v) = (0, 0):</i> the DC term, mean brightness ${(amp * 255).toFixed(1)} grey levels</span>`
        : `<span><i>(u, v) =</i> (${u}, ${v})</span>
           <span><i>ρ =</i> ${rho.toFixed(1)}, <i>λ =</i> ${(N / rho).toFixed(1)} px</span>
           <span><i>|F| =</i> ${mag[k].toExponential(2)} → <i>amplitude</i> ${(amp * 255).toFixed(2)} grey levels</span>
           <span><i>∠F =</i> ${deg(ph)}${self ? '' : `, <i>partner (${-u}, ${-v}):</i> ${deg(-ph)}`}</span>`;
    });
  }
  L.onDrag(magBox, point); L.onDrag(phBox, point);
  for (const box of [magBox, phBox]) {
    box.addEventListener('pointermove', e => {
      if (e.buttons) return;   // dragging is handled by onDrag
      const r = box.getBoundingClientRect();
      point((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) { L.out('d12name', 'That was not an image file.'); return; }
    const img = new Image();
    img.onload = () => { src = img; name = file.name; compute(); };
    img.onerror = () => L.out('d12name', `Could not read ${file.name}. Try a PNG or JPEG.`);
    img.src = URL.createObjectURL(file);
  }
  L.$('d12file').addEventListener('change', e => loadFile(e.target.files[0]));
  const demoBox = L.$('d12');
  demoBox.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  demoBox.addEventListener('dragleave', e => { if (!demoBox.contains(e.relatedTarget)) drop.classList.remove('over'); });
  demoBox.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });
  document.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items || [])].find(it => it.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile();
    loadFile(new File([file], 'pasted image', { type: file.type }));
    demoBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  chips('d12size', k => { N = +k; compute(); });
  L.on(['d12win'], compute, 'change');
  L.on(['d12dim'], paint, 'change');
  compute(); L.redraw(overlays);
}

// ======================================================= Quiz
function quiz() {
  const Q = [
    { q: 'On a 128 × 128 image, a grating has (u, v) = (0, 10). What do you see?',
      o: ['10 vertical stripes', '10 horizontal stripes, 12.8 px apart', 'diagonal stripes', 'a flat image'], a: 1,
      w: 'k = (0, 10) points straight down, and the stripes are perpendicular to k, so they are horizontal. The wavelength is N/ρ = 128/10 = 12.8 px.' },
    { q: 'You rotate an image by 30°. What happens to its magnitude spectrum?',
      o: ['Nothing', 'It rotates by 30° in the same direction', 'It rotates by −30°', 'It shifts sideways'], a: 1,
      w: 'Rotation property: the spectrum rotates with the image, because every grating keeps its frequency but turns by 30°.' },
    { q: 'A photo of a picket fence has many sharp vertical edges. Where does the spectrum show the extra energy?',
      o: ['Along the vertical v-axis', 'Along the horizontal u-axis', 'In a ring', 'Only at the centre'], a: 1,
      w: 'Brightness changes as you move across the vertical edges, that is, horizontally. So k is horizontal, and the energy lies along the u-axis, perpendicular to the edges. The fence also repeats, which adds harmonic dots along that line.' },
    { q: 'You shift an image 10 px to the right (circularly). What changes in its DFT?',
      o: ['The magnitudes only', 'The phases only', 'Both', 'Neither'], a: 1,
      w: 'The shift theorem multiplies F by e^{−j2πu·10/N}, which has magnitude 1. Only the phase changes, and that is why position lives in the phase (Section 10).' },
    { q: 'You add gratings with (u, v) = (20, 0) and (21, 0). What do you see?',
      o: ['Stripes at frequency 41', 'Fine vertical stripes whose contrast swells and fades once across the image', 'A checkerboard', 'Horizontal stripes'], a: 1,
      w: 'This is beats. The sum is 2 cos(difference/2) · cos(average), so a slow envelope with difference wave vector (1, 0) modulates stripes at about 20.5 cycles.' },
    { q: 'Many photo spectra show a bright "+" cross even when the scene has no strong horizontal or vertical edges. Why?',
      o: ['A bug in the FFT', 'Camera noise', 'The DFT treats the image as periodic, so mismatched borders act as edges', 'JPEG compression'], a: 2,
      w: 'The DFT tiles the image endlessly. The jump between the left and right borders (and between top and bottom) is a vertical (and horizontal) edge. Windowing the borders removes the cross.' },
    { q: 'How many 1-D FFTs of length N does a 2-D FFT of an N × N image take?',
      o: ['N', '2N', 'N²', 'N log N'], a: 1,
      w: 'Separability: N FFTs for the rows, then N for the columns.' }
  ];
  const box = L.$('quiz');
  box.innerHTML = Q.map((q, i) => `<div class="q" data-i="${i}"><p><b>${i + 1}.</b> ${q.q}</p><div class="opts">${q.o.map((o, j) => `<button class="opt" data-j="${j}">${o}</button>`).join('')}</div><div class="why">${q.w}</div></div>`).join('');
  box.addEventListener('click', e => {
    const b = e.target.closest('button.opt'); if (!b) return;
    const qd = b.closest('.q'), q = Q[+qd.dataset.i];
    qd.querySelectorAll('button.opt').forEach(x => { x.classList.remove('right', 'wrong'); });
    b.classList.add(+b.dataset.j === q.a ? 'right' : 'wrong');
    qd.querySelectorAll('button.opt')[q.a].classList.add('right');
    qd.classList.add('done');
  });
}

// ======================================================= boot
document.addEventListener('DOMContentLoaded', async () => {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
      throwOnError: false
    });
  }
  const tb = L.$('themebtn'), modes = ['auto', 'dark', 'light'];
  let m = 0;
  tb.onclick = () => {
    m = (m + 1) % 3;
    if (modes[m] === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = modes[m];
    tb.textContent = 'theme: ' + modes[m];
    L.redrawAll();
  };
  tb.textContent = 'theme: auto';

  demo1(); demo2(); demo3(); demo4(); demo6(); demo7(); demo7p(); quiz();
  const [building, aerial] = await Promise.all([L.loadGray(IMG_BUILDING), L.loadGray(IMG_AERIAL)]);
  const photos = { building, aerial };
  const photoImg = new Image();
  photoImg.src = IMG_BUILDING;
  await photoImg.decode();
  demo5(building); demo8(photos); demo9(photoImg); demo9b(photos); demo10(photos); demo11(photos); demo12(photoImg);
});
