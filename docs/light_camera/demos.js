// Light, eyes and cameras: interactive demos. Plain JS, no libraries.
'use strict';
const $ = id => document.getElementById(id);
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const REDRAW = [];
const redrawAll = () => REDRAW.forEach(f => f());
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------------------------------------------------------------- colour science
// CIE 1931 2° colour-matching functions, multi-lobe analytic fit (Wyman, Sloan & Shirley 2013)
function g(x, mu, s1, s2) { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); }
function cmf(l) {
  return [
    1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8)];
}
const WL = []; for (let l = 380; l <= 780; l++) WL.push(l);
const CMF = WL.map(cmf);
function specXYZ(f) {           // f: wavelength -> value, integrated at 1 nm
  let X = 0, Y = 0, Z = 0;
  for (let i = 0; i < WL.length; i++) { const v = f(WL[i]); X += v * CMF[i][0]; Y += v * CMF[i][1]; Z += v * CMF[i][2]; }
  return [X, Y, Z];
}
const xyz2lin = ([X, Y, Z]) => [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];
const enc = c => { c = clamp(c, 0, 1); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; };
const dec = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const rgbCss = lin => `rgb(${lin.map(c => Math.round(255 * enc(c))).join(',')})`;
// show only the colour: add white if out of gamut, then scale so the largest channel is 1
function colourOnly(xyz) {
  let c = xyz2lin(xyz); const mn = Math.min(...c); if (mn < 0) c = c.map(v => v - mn);
  const mx = Math.max(...c); return mx > 0 ? c.map(v => v / mx) : [0, 0, 0];
}
function spectralCss(l) { return rgbCss(colourOnly(cmf(l)).map(v => v * 0.92)); }
// cone responses from XYZ (Hunt–Pointer–Estévez)
const xyz2lms = ([X, Y, Z]) => [0.4002 * X + 0.7076 * Y - 0.0808 * Z, -0.2263 * X + 1.1653 * Y + 0.0457 * Z, 0.9182 * Z];
function planck(T) { return l => { const m = l * 1e-9; return 1 / (Math.pow(m, 5) * (Math.exp(1.4388e-2 / (m * T)) - 1)); }; }
function normalised(f) { let mx = 0; for (let l = 380; l <= 780; l++) mx = Math.max(mx, f(l)); return l => f(l) / mx; }
const sig = x => 1 / (1 + Math.exp(-x));
const gauss = (mu, s) => l => Math.exp(-0.5 * ((l - mu) / s) ** 2);

// ---------------------------------------------------------------- plotting
function setup(cv) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  return { c, w, h };
}
// curves: [{f, col, fill, width, dash}], opts: {x0, x1, y0, y1, vline, ylabel, strip, bands}
function plotSpec(cv, curves, o = {}) {
  const { c, w, h } = setup(cv);
  const x0 = o.x0 ?? 400, x1 = o.x1 ?? 700, y0 = o.y0 ?? 0, y1 = o.y1 ?? 1.05;
  const L = o.ylabel ? 50 : 34, R = 8, T = 8, B = o.strip === false ? 22 : 34;
  const X = l => L + (l - x0) / (x1 - x0) * (w - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (h - T - B);
  const muted = cssv('--muted'), line = cssv('--line');
  c.font = '10px "JetBrains Mono", monospace'; c.fillStyle = muted; c.strokeStyle = line; c.lineWidth = 1;
  (o.bands || []).forEach(b => { c.fillStyle = b.col; c.fillRect(X(b.a), T, X(b.b) - X(b.a), h - T - B); });
  c.fillStyle = muted;
  c.beginPath(); c.moveTo(L, T); c.lineTo(L, h - B); c.lineTo(w - R, h - B); c.stroke();
  const step = o.xstep || ((x1 - x0) > 200 ? 100 : 50);
  for (let l = Math.ceil(x0 / step) * step; l <= x1; l += step) { c.fillText(o.xfmt ? o.xfmt(l) : l, X(l) - 10, h - B + (o.strip === false ? 13 : 24)); }
  if (o.ylabel) { c.save(); c.translate(10, (h - B + T) / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillText(o.ylabel, 0, 0); c.restore(); }
  if (o.yticks) { c.textAlign = 'right'; o.yticks.forEach(([v, s]) => { c.fillText(s, L - 5, Y(v) + 3); c.beginPath(); c.moveTo(L - 3, Y(v)); c.lineTo(L, Y(v)); c.stroke(); }); c.textAlign = 'left'; }
  if (o.strip !== false) for (let l = x0; l < x1; l++) { c.fillStyle = spectralCss(l); c.fillRect(X(l), h - B + 2, X(l + 1) - X(l) + 0.5, 9); }
  curves.forEach(cu => {
    c.beginPath();
    for (let px = L; px <= w - R; px += 0.5) { const l = x0 + (px - L) / (w - L - R) * (x1 - x0); const v = cu.f(l); px === L ? c.moveTo(px, Y(v)) : c.lineTo(px, Y(clamp(v, y0 - 0.1, y1 + 0.1))); }
    if (cu.fill) { const yb = Y(Math.max(y0, 0)); c.lineTo(w - R, yb); c.lineTo(L, yb); c.closePath(); c.fillStyle = cu.fill; c.fill(); }
    else { c.strokeStyle = cu.col; c.lineWidth = cu.width || 2; c.setLineDash(cu.dash || []); c.stroke(); c.setLineDash([]); }
  });
  if (o.vline != null) { c.strokeStyle = cssv('--ink'); c.lineWidth = 1.5; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(o.vline), T); c.lineTo(X(o.vline), h - B); c.stroke(); c.setLineDash([]); }
  return { X, Y, L, R, T, B, w, h, c };
}
function chips(box, attr, cb) {
  box.addEventListener('click', e => {
    const b = e.target.closest('button[data-' + attr + ']'); if (!b) return;
    box.querySelectorAll('button[data-' + attr + ']').forEach(x => x.classList.toggle('on', x === b));
    cb(b.dataset[attr]);
  });
}
const pct = v => (100 * v < 1 && v > 0 ? (100 * v).toFixed(2) : (100 * v).toFixed(1)) + '%';

// ---------------------------------------------------------------- Demo 2: plenoptic slices
function demo2() {
  const ids = ['d2l', 'd2t', 'd2v', 'd2z'];
  function fmt(n) {
    const u = [['PB', 1e15], ['TB', 1e12], ['GB', 1e9], ['MB', 1e6]];
    for (const [s, v] of u) if (n >= v) return (n / v).toFixed(n / v < 10 ? 1 : 0) + ' ' + s;
    return n + ' B';
  }
  function draw() {
    const [l, t, v, z] = ids.map(i => $(i).checked);
    let n = 4000 * 3000 * (l ? 31 : 3) * (t ? 300 : 1) * (v ? 100 : 1) * (z ? 10 : 1);
    let noun = v && z ? '3-D light field' : v ? 'light field (a camera array or a plenoptic camera)' : z ? 'focal stack (one picture per depth)' : 'photograph';
    if (t) noun = v ? 'light-field video' : z ? 'video of a focal stack' : 'video';
    if (l) noun = 'hyperspectral ' + noun; else if (!t && !v && !z) noun = 'colour photograph';
    const kept = ['θ', 'φ'].concat(l ? ['λ (31 bands)'] : ['λ squeezed into 3 numbers']).concat(t ? ['t'] : []).concat(v ? ['Vx', 'Vy'] : []).concat(z ? ['Vz'] : []);
    const fixed = [!t && 't', !v && 'Vx, Vy', !z && 'Vz'].filter(Boolean);
    const exp = Math.floor(Math.log10(n)), man = n / Math.pow(10, exp);
    $('d2out').innerHTML = `<span><i>device:</i> ${noun}</span><span><i>keeps</i> ${kept.join(', ')}${fixed.length ? ' <i>· fixes</i> ' + fixed.join(', ') : ''}</span><span><i>numbers:</i> ${man.toFixed(1)} × 10<sup>${exp}</sup> ≈ ${fmt(n)} <i>at one byte each</i></span>`;
  }
  ids.forEach(i => $(i).onchange = draw); draw();
}

// ---------------------------------------------------------------- Demo 3: rods and cones
const cones = e => { const a = Math.abs(e); return 145000 * Math.exp(-a / 0.6) + 13000 * Math.exp(-a / 4) + 4000; };
const rods = e => { const a = Math.abs(e); if (a < 0.6) return 0; return 160000 * (a / 18) * Math.exp(1 - a / 18) * Math.min(1, (a - 0.6) / 2); };
const inBlind = e => e > 13 && e < 18.5;
function demo3a() {
  const cv = $('d3plot'); let hov = null;
  function draw() {
    const blind = cssv('--surface-2');
    const P = plotSpec(cv, [
      { f: e => inBlind(e) ? 0 : rods(e) / 1000, col: cssv('--acc3'), width: 2.2 },
      { f: e => inBlind(e) ? 0 : cones(e) / 1000, col: cssv('--acc2'), width: 2.2 }],
      { x0: -80, x1: 80, y0: 0, y1: 175, strip: false, ylabel: 'thousands / mm²', yticks: [[0, '0'], [50, '50'], [100, '100'], [150, '150']],
        xfmt: v => v + '°', bands: [{ a: 13, b: 18.5, col: blind }], vline: hov });
    const c = P.c; c.font = '11px "JetBrains Mono", monospace';
    c.fillStyle = cssv('--acc3'); c.fillText('rods', P.X(26), P.Y(150));
    c.fillStyle = cssv('--acc2'); c.fillText('cones', P.X(3), P.Y(162));
    c.fillStyle = cssv('--muted'); c.fillText('blind spot', P.X(19.5), P.Y(118)); c.fillText('← temporal', P.X(-78), P.Y(165)); c.fillText('nasal →', P.X(58), P.Y(165));
    cv._P = P;
  }
  cv.addEventListener('pointermove', ev => {
    const P = cv._P; if (!P) return; const r = cv.getBoundingClientRect();
    const e = -80 + (ev.clientX - r.left - P.L) / (P.w - P.L - P.R) * 160; if (e < -80 || e > 80) return;
    hov = e; draw();
    const k = v => Math.round(v / 1000) + ',000';
    $('d3out').innerHTML = inBlind(e) ? `<span><i>${e.toFixed(1)}° from the fovea:</i> the blind spot, no receptors at all</span>`
      : `<span><i>${Math.abs(e).toFixed(1)}° ${e < 0 ? 'temporal' : 'nasal'}</i></span><span><i>cones ≈</i> ${k(cones(e))} /mm²</span><span><i>rods ≈</i> ${k(rods(e))} /mm²</span>`;
  });
  REDRAW.push(draw); draw();
}
function demo3b() {
  const cv = $('d3c'); let mode = 'dot';
  function draw() {
    const { c, w, h } = setup(cv);
    c.fillStyle = '#f4f4f1'; c.fillRect(0, 0, w, h);
    const y = h / 2, xc = Math.max(30, w * 0.1), xd = xc + Math.min(w * 0.72, 520);
    if (mode === 'stripes') { c.fillStyle = '#2b2b2b'; for (let x = xd - 90; x < xd + 90; x += 14) c.fillRect(x, y - 70, 7, 140); }
    if (mode === 'line') { c.fillStyle = '#2b2b2b'; c.fillRect(xd - 110, y - 3, 220, 6); }
    c.strokeStyle = '#111'; c.lineWidth = 3; c.beginPath(); c.moveTo(xc - 12, y); c.lineTo(xc + 12, y); c.moveTo(xc, y - 12); c.lineTo(xc, y + 12); c.stroke();
    c.fillStyle = '#c0392b'; c.beginPath(); c.arc(xd, y, 13, 0, 2 * Math.PI); c.fill();
  }
  chips($('d3b'), 'b', v => { mode = v; draw(); });
  REDRAW.push(draw); draw();
}

// ---------------------------------------------------------------- Demo 5: illuminant x reflectance
const SOURCES = {
  sun: normalised(planck(5800)), tung: normalised(planck(2850)), candle: normalised(planck(1900)),
  led: normalised(l => gauss(452, 11)(l) + 0.55 * g(l, 560, 40, 60)), na: gauss(589, 1.5), laser: gauss(650, 1.2)
};
const SURF = {
  paper: () => 0.85,
  tomato: l => 0.06 + 0.72 * sig((l - 590) / 12),
  banana: l => 0.07 + 0.72 * sig((l - 505) / 13),
  leaf: l => 0.04 + 0.13 * gauss(552, 28)(l) + 0.5 * sig((l - 705) / 10),
  grape: l => 0.04 + 0.2 * gauss(440, 30)(l) + 0.25 * sig((l - 640) / 15)
};
const BR = [[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]];
const BRi = [[0.9869929, -0.1470543, 0.1599627], [0.4323053, 0.5183603, 0.0492912], [-0.0085287, 0.0400428, 0.9684867]];
const mv = (M, v) => M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
function demo4() {
  function draw() {
    const E = SOURCES[$('d4e').value], R = SURF[$('d4r').value], C = l => E(l) * R(l);
    const fill = cssv('--acc') + '55';
    plotSpec($('d4pe'), [{ f: E, fill }, { f: E, col: cssv('--acc') }], { yticks: [[0, '0'], [1, 'max']] });
    plotSpec($('d4pr'), [{ f: R, fill: cssv('--acc2') + '55' }, { f: R, col: cssv('--acc2') }], { yticks: [[0, '0'], [0.5, '.5'], [1, '1']] });
    plotSpec($('d4pc'), [{ f: C, fill }, { f: C, col: cssv('--acc') }], { yticks: [[0, '0'], [1, 'max']] });
    const W = specXYZ(E), Yw = W[1] || 1;
    let s = specXYZ(C).map(v => v / Yw), p = specXYZ(l => 0.85 * E(l)).map(v => v / Yw);
    if ($('d4wb').checked) {
      const src = mv(BR, W.map(v => v / Yw)), dst = mv(BR, [0.9505, 1, 1.089]);
      const adapt = xyz => mv(BRi, mv(BR, xyz).map((v, i) => v * dst[i] / src[i]));
      s = adapt(s); p = adapt(p);
    }
    let a = xyz2lin(s).map(v => Math.max(0, v)), b = xyz2lin(p).map(v => Math.max(0, v));
    const mx = Math.max(1, ...a, ...b); a = a.map(v => v / mx); b = b.map(v => v / mx);
    $('d4sw').style.background = rgbCss(a); $('d4white').style.background = rgbCss(b);
  }
  ['d4e', 'd4r', 'd4wb'].forEach(i => $(i).onchange = draw);
  REDRAW.push(draw); draw();
}

// ---------------------------------------------------------------- Demo 6: colour matching
function solve3(A, b) {
  const d = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = d(A);
  return [0, 1, 2].map(k => d(A.map((r, i) => r.map((v, j) => j === k ? b[i] : v))) / D);
}
function demo5() {
  // a typical LED/OLED screen: three smooth humps
  const PEAK = [615, 535, 455], WID = [14, 17, 11];
  const prim = PEAK.map((p, i) => gauss(p, WID[i]));
  const PX = prim.map(f => specXYZ(f));
  const A = [0, 1, 2].map(i => [0, 1, 2].map(j => PX[j][i]));   // columns = primaries
  const lmsAt = l => xyz2lms(cmf(l));
  let mx = [0, 0, 0]; for (let l = 380; l <= 780; l++) { const v = lmsAt(l); mx = mx.map((m, i) => Math.max(m, v[i])); }
  const COLS = ['#d04a3c', '#2f9a48', '#3b67d6'], NAMES = ['red', 'green', 'blue'];
  const mixXYZ = w => [0, 1, 2].map(i => w[0] * PX[0][i] + w[1] * PX[1][i] + w[2] * PX[2][i]);
  function draw() {
    const lt = +$('d5l').value; $('d5lv').textContent = lt + ' nm';
    const xt = cmf(lt), w = solve3(A, xt), wmax = Math.max(...w.map(Math.abs)) || 1, rel = w.map(v => v / wmax);
    const worst = Math.min(...rel), wi = rel.indexOf(worst), out = worst < -0.04;
    const wp = w.map(v => Math.max(0, v));
    // left: the two spectra
    const curves = [0, 1, 2].map(i => ({ f: l => Math.max(0, lmsAt(l)[i] / mx[i]), col: COLS[i] + '55', width: 1.2 }));
    [0, 1, 2].forEach(i => {
      const k = rel[i];
      curves.push({ f: l => k * prim[i](l), fill: COLS[i] + (k < 0 ? '40' : '99') });
      curves.push({ f: l => k * prim[i](l), col: COLS[i], width: 1.5, dash: k < 0 ? [4, 3] : [] });
    });
    const P = plotSpec($('d5plot'), curves, { y0: Math.min(0, worst) - 0.08, y1: 1.12, yticks: [[0, '0']] });
    P.c.strokeStyle = cssv('--ink'); P.c.lineWidth = 2.5;
    P.c.beginPath(); P.c.moveTo(P.X(lt), P.Y(0)); P.c.lineTo(P.X(lt), P.Y(1.08)); P.c.stroke();
    P.c.fillStyle = cssv('--ink'); P.c.font = '11px "JetBrains Mono", monospace'; P.c.textAlign = lt > 600 ? 'right' : 'left';
    P.c.fillText('target', P.X(lt) + (lt > 600 ? -5 : 5), P.Y(1.04));
    P.c.strokeStyle = cssv('--line'); P.c.lineWidth = 1; P.c.beginPath(); P.c.moveTo(P.L, P.Y(0)); P.c.lineTo(P.w - P.R, P.Y(0)); P.c.stroke();
    // right: cone numbers of target vs screen mix (with the impossible negative part switched off)
    const lt3 = xyz2lms(xt), lm3 = xyz2lms(mixXYZ(out ? wp : w));
    const sc = Math.max(...lt3, ...lm3);
    const { c, w: W, h } = setup($('d5bars'));
    const base = h - 26, top = 22, gw = W / 3, bw = Math.min(30, gw / 3.2);
    c.strokeStyle = cssv('--line'); c.beginPath(); c.moveTo(8, base); c.lineTo(W - 8, base); c.stroke();
    c.font = '11px "JetBrains Mono", monospace'; c.textAlign = 'center';
    ['L', 'M', 'S'].forEach((nm, i) => {
      const cx = gw * (i + 0.5);
      [[lt3[i], 1], [lm3[i], 0.4]].forEach(([v, a], k) => {
        const hh = Math.max(0, v / sc) * (base - top);
        c.globalAlpha = a; c.fillStyle = COLS[i]; c.fillRect(cx - bw - 2 + k * (bw + 4), base - hh, bw, hh); c.globalAlpha = 1;
        c.strokeStyle = COLS[i]; c.strokeRect(cx - bw - 2 + k * (bw + 4) + 0.5, base - hh + 0.5, bw - 1, hh);
      });
      c.fillStyle = cssv('--ink'); c.fillText(nm + ' cones', cx, h - 8);
    });
    c.textAlign = 'left'; c.fillStyle = cssv('--muted'); c.fillText('■ target   □ screen mix', 8, 13);
    // swatches and words
    $('d5t').style.background = rgbCss(colourOnly(xt));
    $('d5m').style.background = rgbCss(colourOnly(mixXYZ(wp)));
    const amounts = rel.map((v, i) => `${NAMES[i]} ${v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`).join(', ');
    $('d5out').innerHTML = out
      ? `<span><i>the screen cannot show this:</i> it would need ${amounts}. A negative amount of ${NAMES[wi]} is impossible, so with ${NAMES[wi]} switched off the bars disagree and the mix is paler. (Your screen has the same limit, so the target swatch is also drawn paler than the real light looks.)</span>`
      : `<span><i>screen amounts</i> ${amounts}</span><span><i>${worst < -1e-3 ? 'a near-perfect match: the tiny negative is real, because a pure spectral colour lies just outside any screen\'s range' : 'a match'}. Different spectra, same three cone numbers: metamers.</i></span>`;
  }
  $('d5l').oninput = draw; REDRAW.push(draw); draw();
}

// ---------------------------------------------------------------- images
const IMGS = {};
function loadRGB(src, S = 384) {
  return new Promise((res, rej) => {
    const im = new Image(); im.onload = () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
      const s = Math.min(im.width, im.height); c.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, S, S);
      res(c.getImageData(0, 0, S, S));
    }; im.onerror = rej; im.src = src;
  });
}
function zonePlate(S = 384) {
  const d = new ImageData(S, S), k = 0.35 * Math.PI / (S * Math.SQRT2);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = Math.round(255 * (0.5 + 0.5 * Math.cos(k * (x * x + y * y)))), i = 4 * (y * S + x);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  return d;
}

// ---------------------------------------------------------------- Demo 7: photon counting
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function poisson(m) {
  if (m > 40) return Math.max(0, Math.round(m + Math.sqrt(m) * randn()));
  const L = Math.exp(-m); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1;
}
function demo6() {
  let key = 'roundabout';
  function draw() {
    const src = IMGS[key]; if (!src) return;
    const N = Math.pow(10, +$('d6n').value / 20), bits = +$('d6b').value, Lv = Math.pow(2, bits) - 1;
    $('d6nv').textContent = N < 10 ? N.toFixed(1) : Math.round(N).toLocaleString('en-IN');
    $('d6bv').textContent = bits + ' (' + (Lv + 1) + ' levels)';
    $('d6a').getContext('2d').putImageData(src, 0, 0);
    const out = new ImageData(src.width, src.height), a = src.data, o = out.data;
    for (let i = 0; i < a.length; i += 4) {
      for (let ch = 0; ch < 3; ch++) {
        const n = poisson(dec(a[i + ch] / 255) * N);
        const v = enc(Math.min(1, n / N));
        o[i + ch] = Math.round(Math.round(v * Lv) / Lv * 255);
      }
      o[i + 3] = 255;
    }
    $('d6c').getContext('2d').putImageData(out, 0, 0);
    $('d6out').innerHTML = `<span><i>a white pixel collects about</i> ${$('d6nv').textContent} <i>photons per colour</i></span><span><i>SNR of a mid-grey pixel</i> √(${(0.214 * N).toFixed(N < 50 ? 1 : 0)}) ≈ ${Math.sqrt(0.214 * N).toFixed(1)}</span>`;
  }
  $('d6n').oninput = draw; $('d6b').oninput = draw;
  chips($('d6'), 'img', v => { key = v; draw(); });
  return draw;
}

// ---------------------------------------------------------------- Demo 8: Bayer
const site = (x, y) => (y & 1) ? ((x & 1) ? 2 : 1) : ((x & 1) ? 1 : 0);   // RGGB
function mosaic(src) {
  const S = src.width, m = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) m[y * S + x] = src.data[4 * (y * S + x) + site(x, y)];
  return m;
}
function demosaic(m, S) {
  const out = new Float32Array(S * S * 3);
  const KG = [[0, 1, 0], [1, 4, 1], [0, 1, 0]], KRB = [[1, 2, 1], [2, 4, 2], [1, 2, 1]];
  const rf = i => i < 0 ? -i : i >= S ? 2 * S - 2 - i : i;
  for (let ch = 0; ch < 3; ch++) {
    const K = ch === 1 ? KG : KRB;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = rf(x + dx), yy = rf(y + dy);
        if (site(xx, yy) === ch) s += K[dy + 1][dx + 1] * m[yy * S + xx];
      }
      out[3 * (y * S + x) + ch] = s / 4;
    }
  }
  return out;
}
function demo7() {
  let key = 'roundabout', chv = 'rgb', cur = null, zx = 200, zy = 150;
  const S = 384, Z = 24;
  function compute() {
    const src = IMGS[key]; if (!src) return;
    const m = mosaic(src), d = demosaic(m, S);
    let se = 0; for (let i = 0, j = 0; i < src.data.length; i += 4, j += 3) for (let ch = 0; ch < 3; ch++) { const e = src.data[i + ch] - d[j + ch]; se += e * e; }
    const mse = se / (S * S * 3);
    cur = { src, m, d, psnr: 10 * Math.log10(255 * 255 / mse) };
    $('d7out').innerHTML = `<span><i>green photosites</i> 50%</span><span><i>values estimated by demosaicing</i> 66.7%</span><span><i>PSNR of the demosaiced image</i> ${cur.psnr.toFixed(1)} dB</span>`;
    render();
  }
  function img3(fn) {
    const o = new ImageData(S, S), sel = chv === 'rgb' ? null : +chv;
    for (let p = 0; p < S * S; p++) {
      const v = fn(p);
      for (let ch = 0; ch < 3; ch++) o.data[4 * p + ch] = sel === null || sel === ch ? clamp(Math.round(v[ch]), 0, 255) : 0;
      o.data[4 * p + 3] = 255;
    }
    return o;
  }
  function render() {
    if (!cur) return;
    const { src, m, d } = cur;
    const A = img3(p => [src.data[4 * p], src.data[4 * p + 1], src.data[4 * p + 2]]);
    const B = img3(p => { const x = p % S, y = (p / S) | 0, s = site(x, y), v = [0, 0, 0]; v[s] = m[p]; return v; });
    const C = img3(p => [d[3 * p], d[3 * p + 1], d[3 * p + 2]]);
    [[A, 'd7a', 'd7za'], [B, 'd7b', 'd7zb'], [C, 'd7c', 'd7zc']].forEach(([im, id, zid]) => {
      $(id).getContext('2d').putImageData(im, 0, 0);
      const x0 = clamp(zx - Z / 2, 0, S - Z) & ~1, y0 = clamp(zy - Z / 2, 0, S - Z) & ~1;
      $(zid).getContext('2d').putImageData(im, -x0, -y0, x0, y0, Z, Z);
      const ov = $(id + 'o'), r = setup(ov), k = r.w / S;
      r.c.strokeStyle = '#fff'; r.c.lineWidth = 1.5; r.c.strokeRect(x0 * k, y0 * k, Z * k, Z * k);
    });
  }
  ['d7a', 'd7b', 'd7c'].forEach(id => {
    const el = $(id).parentElement;
    el.addEventListener('pointermove', ev => { const r = el.getBoundingClientRect(); zx = Math.round((ev.clientX - r.left) / r.width * S); zy = Math.round((ev.clientY - r.top) / r.height * S); render(); });
  });
  chips($('d7img'), 'img', v => { key = v; compute(); });
  chips($('d7ch'), 'ch', v => { chv = v; render(); });
  const drop = $('d7drop');
  async function useFile(f) {
    if (!f || !f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f); IMGS.own = await loadRGB(url, S); URL.revokeObjectURL(url);
    key = 'own'; $('d7img').querySelectorAll('button').forEach(b => b.classList.remove('on')); compute();
  }
  $('d7file').onchange = e => useFile(e.target.files[0]);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); useFile(e.dataTransfer.files[0]); });
  REDRAW.push(render);
  return compute;
}

// ---------------------------------------------------------------- Demo 9: illusions
function demo8() {
  const cv = $('d8c'), S = 480, n = 8, t = S / n;
  const LIGHT = 220, DARK = 110, CORE = DARK / LIGHT;        // a light tile in the shadow core = a dark tile in the light
  const C = [390, 90], P = [150, 330], RS = 75, PEN = 20, RC = 44;
  const A = [5, 5], B = [4, 3];
  const segd = (x, y) => { const vx = P[0] - C[0], vy = P[1] - C[1]; let u = ((x - C[0]) * vx + (y - C[1]) * vy) / (vx * vx + vy * vy); u = clamp(u, 0, 1); return Math.hypot(x - C[0] - u * vx, y - C[1] - u * vy); };
  const smooth = (a, b, x) => { const s = clamp((x - a) / (b - a), 0, 1); return s * s * (3 - 2 * s); };
  const base = new ImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (x / t | 0), j = (y / t | 0), light = (i + j) & 1;
    const sh = 1 - (1 - CORE) * (1 - smooth(RS - PEN, RS + PEN, segd(x + 0.5, y + 0.5)));
    let v = (light ? LIGHT : DARK) * sh;
    const dc = Math.hypot(x + 0.5 - C[0], y + 0.5 - C[1]);
    let r = v, g2 = v, b = v;
    if (dc < RC) { const s = 0.55 + 0.45 * Math.cos(Math.atan2(y - C[1], x - C[0]) + 2.4) * (dc / RC); r = 40 * s + 20; g2 = 150 * s + 40; b = 70 * s + 25; }
    const k = 4 * (y * S + x); base.data[k] = Math.round(r); base.data[k + 1] = Math.round(g2); base.data[k + 2] = Math.round(b); base.data[k + 3] = 255;
  }
  let reveal = false, bar = false;
  function draw() {
    const c = cv.getContext('2d'); c.putImageData(base, 0, 0);
    if (reveal) {
      c.fillStyle = 'rgb(160,160,160)'; c.fillRect(0, 0, S, S);
      [A, B].forEach(([i, j]) => { c.putImageData(base, 0, 0, i * t, j * t, t, t); });
    }
    if (bar) {
      c.strokeStyle = `rgb(${DARK},${DARK},${DARK})`; c.lineWidth = 16; c.lineCap = 'butt';
      c.beginPath(); c.moveTo((A[0] + 0.5) * t, (A[1] + 0.5) * t); c.lineTo((B[0] + 0.5) * t, (B[1] + 0.5) * t); c.stroke();
    }
    c.font = 'bold 22px "Archivo", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    [[A, 'A'], [B, 'B']].forEach(([[i, j], s]) => { c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillText(s, (i + 0.5) * t, (j + 0.5) * t - 18); });
  }
  cv.addEventListener('pointermove', ev => {
    const r = cv.getBoundingClientRect(), x = Math.floor((ev.clientX - r.left) / r.width * S), y = Math.floor((ev.clientY - r.top) / r.height * S);
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const d = cv.getContext('2d').getImageData(x, y, 1, 1).data;
    const i = (x / t | 0), j = (y / t | 0), nm = i === A[0] && j === A[1] ? ' (tile A)' : i === B[0] && j === B[1] ? ' (tile B)' : '';
    $('d8out').innerHTML = `<span><i>pixel value under the pointer${nm}:</i> R ${d[0]}, G ${d[1]}, B ${d[2]}</span><span><i>tile A centre</i> ${DARK} · <i>tile B centre</i> ${Math.round(LIGHT * CORE)}</span>`;
  });
  $('d8rev').onclick = () => { reveal = !reveal; $('d8rev').classList.toggle('on', reveal); draw(); };
  $('d8bar').onclick = () => { bar = !bar; $('d8bar').classList.toggle('on', bar); draw(); };
  draw();
  // simultaneous contrast
  const gv = $('d8g');
  function drawG() {
    const c = gv.getContext('2d'), W = gv.width, H = gv.height;
    const gr = c.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#fff');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    const gap = +$('d8s').value / 100 * (W / 2 - 50), sq = 44;
    c.fillStyle = 'rgb(128,128,128)';
    c.fillRect(W / 2 - gap - sq, H / 2 - sq / 2, sq, sq); c.fillRect(W / 2 + gap, H / 2 - sq / 2, sq, sq);
  }
  $('d8s').oninput = drawG; drawG();
}

// ---------------------------------------------------------------- Demo 7: one grey wall, many pixels
function demo6w() {
  const GX = 18, GY = 12, NP = GX * GY;
  let counts = new Int32Array(NP), nbar = 9;
  function shoot() {
    const s = +$('d6wn').value; nbar = +Math.pow(10, s / 25).toPrecision(2);
    $('d6wnv').textContent = nbar.toLocaleString('en-IN');
    for (let i = 0; i < NP; i++) counts[i] = poisson(nbar);
    draw();
  }
  function draw() {
    const gain = $('d6wg').checked;
    // the wall
    const { c, w, h } = setup($('d6wc')), cw = w / GX, ch = h / GY;
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const n = counts[j * GX + i], lin = gain ? 0.214 * n / nbar : n / 10000;
      const v = Math.round(255 * enc(lin));
      c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(i * cw, j * ch, Math.ceil(cw), Math.ceil(ch));
      if (nbar <= 30 && cw > 13) {
        c.fillStyle = v > 140 ? '#000' : '#fff'; c.font = `${Math.min(11, cw * 0.5)}px "JetBrains Mono", monospace`;
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, (i + 0.5) * cw, (j + 0.5) * ch);
      }
    }
    // histogram
    const sd = Math.sqrt(nbar), lo = Math.max(0, Math.floor(nbar - 4.5 * sd)), hi = Math.ceil(nbar + 4.5 * sd);
    const nb = Math.min(hi - lo + 1, 45), bw = (hi - lo + 1) / nb, H = new Array(nb).fill(0);
    let sum = 0, sq = 0, inside = 0;
    for (const n of counts) {
      const b = Math.floor((n - lo) / bw); if (b >= 0 && b < nb) H[b]++;
      sum += n; sq += n * n; if (Math.abs(n - nbar) <= sd) inside++;
    }
    const hm = Math.max(...H);
    const P = plotSpec($('d6wh'), [], { x0: lo, x1: hi + 1, y0: 0, y1: hm * 1.1, strip: false, xfmt: v => Math.round(v).toLocaleString('en-IN'), ylabel: 'pixels', xstep: (() => { const r = (hi - lo) / 4, e = Math.pow(10, Math.floor(Math.log10(r))); return [1, 2, 5, 10].map(k => k * e).find(k => k >= r) || r; })(),
      yticks: [[0, '0'], [hm, String(hm)]], bands: [{ a: Math.max(lo, nbar - sd), b: nbar + sd, col: cssv('--acc2') + '33' }], vline: nbar });
    P.c.fillStyle = cssv('--acc');
    H.forEach((v, b) => { const x0 = P.X(lo + b * bw), x1 = P.X(lo + (b + 1) * bw); P.c.fillRect(x0 + 0.5, P.Y(v), Math.max(1, x1 - x0 - 1), P.Y(0) - P.Y(v)); });
    const mean = sum / NP, msd = Math.sqrt(Math.max(0, sq / NP - mean * mean));
    $('d6wout').innerHTML = `<span><i>measured mean</i> ${mean.toFixed(1)}</span><span><i>measured spread σ</i> ${msd.toFixed(1)} <i>vs √n̄ =</i> ${sd.toFixed(1)}</span>` +
      `<span><i>relative error 1/√n̄ =</i> ${(100 / sd).toFixed(sd > 30 ? 1 : 0)}%</span><span><i>pixels within n̄ ± √n̄:</i> ${Math.round(100 * inside / NP)}%</span>`;
  }
  $('d6wn').oninput = shoot; $('d6wshot').onclick = shoot; $('d6wg').onchange = draw;
  REDRAW.push(draw); shoot();
}

// ---------------------------------------------------------------- quiz
function quiz() {
  const Q = [
    { q: 'Two lights have very different spectra but look exactly the same colour. How is that possible?', o: ['It is not possible', 'They give the same three cone responses (L, M, S): they are metamers', 'One of them is ultraviolet', 'The eye averages over time'], a: 1,
      w: 'The eye keeps only three numbers per point. Any two spectra with the same three numbers look identical.' },
    { q: 'Why does the Bayer pattern have twice as many green photosites as red or blue?', o: ['Green filters are cheaper', 'The eye is most sensitive near green, and green carries most of the detail we notice', 'Green light has more photons', 'To make the pattern square'], a: 1,
      w: 'Daylight sensitivity peaks near 555 nm. Sampling green twice as densely gives sharper detail where we look for it.' },
    { q: 'You halve the exposure time. What happens to the signal-to-noise ratio of photon counting?', o: ['It halves', 'It drops by a factor √2', 'It stays the same', 'It doubles'], a: 1,
      w: 'SNR = √n̄. Half the photons gives √(1/2) ≈ 0.71 of the SNR.' },
    { q: 'What causes the blind spot?', o: ['A gap between the rods and the cones', 'The point where the optic nerve leaves the eye, which has no receptors', 'The shadow of the lens', 'The fovea'], a: 1,
      w: 'The nerve fibres gather and exit about 15° from the fovea on the nose side. With no photoreceptors there, that part of the image is never sensed; the brain fills it in.' }
  ];
  const box = $('quiz');
  box.innerHTML = Q.map((q, i) => `<div class="q" data-i="${i}"><p><b>${i + 1}.</b> ${q.q}</p><div class="opts">${q.o.map((o, j) => `<button class="opt" data-j="${j}">${o}</button>`).join('')}</div><div class="why">${q.w}</div></div>`).join('');
  box.addEventListener('click', e => {
    const b = e.target.closest('button.opt'); if (!b) return;
    const qd = b.closest('.q'), q = Q[+qd.dataset.i];
    qd.querySelectorAll('button.opt').forEach(x => x.classList.remove('right', 'wrong'));
    b.classList.add(+b.dataset.j === q.a ? 'right' : 'wrong');
    qd.querySelectorAll('button.opt')[q.a].classList.add('right');
    qd.classList.add('done');
  });
}

// ---------------------------------------------------------------- boot
document.addEventListener('DOMContentLoaded', async () => {
  if (window.renderMathInElement) renderMathInElement(document.body, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
  const tb = $('themebtn'), modes = ['auto', 'dark', 'light']; let m = 0;
  tb.onclick = () => { m = (m + 1) % 3; if (modes[m] === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = modes[m]; tb.textContent = 'theme: ' + modes[m]; redrawAll(); };
  tb.textContent = 'theme: auto';
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawAll);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(redrawAll, 150); });
  demo2(); demo3a(); demo3b(); demo4(); demo5(); demo6w(); demo8(); quiz();
  const d6 = demo6(), d7 = demo7();
  [IMGS.roundabout, IMGS.flag] = await Promise.all([loadRGB(window.IMG_ROUNDABOUT), loadRGB(window.IMG_FLAG)]);
  IMGS.stripes = zonePlate();
  d6(); d7();
});
