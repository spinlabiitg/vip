// Small toolkit for the 2-D Fourier tutorial: FFTs, image/spectrum drawing, plots, pointer helpers.
'use strict';
const L = (() => {
  const L = {};

  // ---------- FFT ----------
  const twCache = {};
  function twiddles(len, inv) {
    const key = (inv ? 'i' : 'f') + len;
    if (!twCache[key]) {
      const half = len >> 1, t = new Float64Array(len);
      for (let k = 0; k < half; k++) {
        const a = (inv ? 2 : -2) * Math.PI * k / len;
        t[2 * k] = Math.cos(a); t[2 * k + 1] = Math.sin(a);
      }
      twCache[key] = t;
    }
    return twCache[key];
  }

  // In-place radix-2 FFT. inv=true gives the inverse (with the 1/n factor).
  L.fft1 = (re, im, inv) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1, tw = twiddles(len, inv);
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < half; k++) {
          const a = i + k, b = a + half, wr = tw[2 * k], wi = tw[2 * k + 1];
          const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };

  // 2-D FFT of a row-major N x N array, in place. which: 'both' | 'rows' | 'cols'.
  L.fft2 = (re, im, N, inv, which = 'both') => {
    const r = new Float64Array(N), q = new Float64Array(N);
    if (which !== 'cols') {
      for (let y = 0; y < N; y++) {
        const o = y * N;
        for (let x = 0; x < N; x++) { r[x] = re[o + x]; q[x] = im[o + x]; }
        L.fft1(r, q, inv);
        for (let x = 0; x < N; x++) { re[o + x] = r[x]; im[o + x] = q[x]; }
      }
    }
    if (which !== 'rows') {
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) { r[y] = re[y * N + x]; q[y] = im[y * N + x]; }
        L.fft1(r, q, inv);
        for (let y = 0; y < N; y++) { re[y * N + x] = r[y]; im[y * N + x] = q[y]; }
      }
    }
  };

  // Forward 2-D DFT of a real image -> {re, im}
  L.spectrum = (f, N) => {
    const re = Float64Array.from(f), im = new Float64Array(N * N);
    L.fft2(re, im, N, false);
    return { re, im };
  };

  // Inverse 2-D DFT, returning the real part (copies its inputs)
  L.ifftReal = (re0, im0, N) => {
    const re = Float64Array.from(re0), im = Float64Array.from(im0);
    L.fft2(re, im, N, true);
    return re;
  };

  L.wrap = (u, N) => ((u % N) + N) % N;
  L.idx = (u, v, N) => L.wrap(v, N) * N + L.wrap(u, N);

  // ---------- colour ----------
  L.css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const MAGMA = [[0, 0, 0, 4], [.13, 28, 16, 68], [.25, 79, 18, 123], [.38, 129, 37, 129],
    [.5, 181, 54, 122], [.63, 229, 80, 100], [.75, 251, 135, 97], [.88, 254, 194, 135], [1, 252, 253, 191]];
  const LUT = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let s = 0;
    while (s < MAGMA.length - 2 && t > MAGMA[s + 1][0]) s++;
    const a = MAGMA[s], b = MAGMA[s + 1], w = (t - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 3; c++) LUT[3 * i + c] = Math.round(a[c + 1] + w * (b[c + 1] - a[c + 1]));
  }

  // ---------- drawing ----------
  // Grey image; lo/hi optional (auto range). Canvas becomes N x N; CSS scales it up pixelated.
  L.putGray = (cv, a, N, lo, hi) => {
    if (lo === undefined) {
      lo = Infinity; hi = -Infinity;
      for (let i = 0; i < a.length; i++) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; }
    }
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d'), id = ctx.createImageData(N, N), d = id.data, s = 255 / (hi - lo);
    for (let i = 0; i < N * N; i++) {
      const g = Math.max(0, Math.min(255, (a[i] - lo) * s));
      d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = g; d[4 * i + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
  };

  // Robust range (percentiles) for images with outliers
  L.range = (a, p = 0.01) => {
    const s = Float64Array.from(a).sort();
    return [s[Math.floor(p * (s.length - 1))], s[Math.floor((1 - p) * (s.length - 1))]];
  };

  // Log-magnitude spectrum, centred (DC in the middle).
  // o.crop: show only the central crop x crop frequencies; o.shiftY=false keeps rows unshifted
  // (used for the "rows only" step); o.mask: Uint8Array over N*N, unmasked bins are dimmed.
  L.putSpec = (cv, re, im, N, o = {}) => {
    const M = o.crop || N, shiftY = o.shiftY !== false;
    cv.width = M; cv.height = M;
    const vals = new Float64Array(M * M);
    let mx = 0;
    for (let py = 0; py < M; py++) {
      const v = shiftY ? py - M / 2 : py;
      for (let px = 0; px < M; px++) {
        const u = px - M / 2, k = L.idx(u, v, N);
        const val = Math.log1p(Math.hypot(re[k], im[k]) * (o.gain || 1));
        vals[py * M + px] = val;
        if (val > mx) mx = val;
      }
    }
    if (o.dilate) {   // 3x3 max filter so isolated single-bin dots stay visible
      const src = Float64Array.from(vals);
      for (let py = 0; py < M; py++) for (let px = 0; px < M; px++) {
        let m = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const yy = py + dy, xx = px + dx;
          if (yy >= 0 && yy < M && xx >= 0 && xx < M && src[yy * M + xx] > m) m = src[yy * M + xx];
        }
        vals[py * M + px] = m;
      }
    }
    if (o.max) mx = o.max;
    const ctx = cv.getContext('2d'), id = ctx.createImageData(M, M), d = id.data;
    for (let py = 0; py < M; py++) {
      const v = shiftY ? py - M / 2 : py;
      for (let px = 0; px < M; px++) {
        const i = py * M + px;
        let t = mx > 0 ? vals[i] / mx : 0;
        if (o.mask && !o.mask[L.idx(px - M / 2, v, N)]) t *= 0.22;
        if (o.weight) t *= 0.22 + 0.78 * o.weight[L.idx(px - M / 2, v, N)];
        const c = Math.max(0, Math.min(255, Math.round(t * 255)));
        d[4 * i] = LUT[3 * c]; d[4 * i + 1] = LUT[3 * c + 1]; d[4 * i + 2] = LUT[3 * c + 2]; d[4 * i + 3] = 255;
      }
    }
    ctx.putImageData(id, 0, 0);
    return mx;
  };

  // Overlay canvas inside a .stack, sized to the stack in CSS pixels (hi-dpi aware)
  L.overlay = stack => {
    const ov = stack.querySelector('canvas.ov');
    const w = stack.clientWidth, h = stack.clientHeight, dpr = window.devicePixelRatio || 1;
    ov.width = Math.round(w * dpr); ov.height = Math.round(h * dpr);
    const ctx = ov.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  };

  L.arrow = (ctx, x0, y0, x1, y1, color, width = 2) => {
    const a = Math.atan2(y1 - y0, x1 - x0), hl = 9;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hl * Math.cos(a - 0.4), y1 - hl * Math.sin(a - 0.4));
    ctx.lineTo(x1 - hl * Math.cos(a + 0.4), y1 - hl * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
  };

  L.ring = (ctx, x, y, r, color, width = 2) => {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke();
  };

  L.label = (ctx, text, x, y, color, align = 'left', size = 11) => {
    ctx.font = `500 ${size}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  };

  // Simple line / stem plot. series: [{x:[], y:[], color, type:'line'|'stem', dash}]
  L.plot = (cv, o) => {
    const w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const padL = 34, padR = 10, padT = 10, padB = o.xlabel ? 30 : 18;
    const X = x => padL + (x - o.xmin) / (o.xmax - o.xmin) * (w - padL - padR);
    const Y = y => padT + (o.ymax - y) / (o.ymax - o.ymin) * (h - padT - padB);
    const ink = L.css('--muted'), line = L.css('--line');
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, w - padL - padR, h - padT - padB);
    if (o.ymin < 0 && o.ymax > 0) {
      ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(w - padR, Y(0)); ctx.stroke();
    }
    ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const t of (o.yticks || [o.ymin, o.ymax])) ctx.fillText(t, padL - 4, Y(t));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const t of (o.xticks || [])) {
      ctx.fillText(t, X(t), h - padB + 3);
      ctx.beginPath(); ctx.moveTo(X(t), h - padB); ctx.lineTo(X(t), h - padB - 3); ctx.stroke();
    }
    if (o.xlabel) { ctx.textBaseline = 'bottom'; ctx.fillText(o.xlabel, (padL + w - padR) / 2, h - 1); }
    for (const s of o.series) {
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.width || 1.6;
      ctx.setLineDash(s.dash || []);
      if (s.type === 'stem') {
        const y0 = Y(Math.max(o.ymin, 0));
        for (let i = 0; i < s.x.length; i++) {
          ctx.beginPath(); ctx.moveTo(X(s.x[i]), y0); ctx.lineTo(X(s.x[i]), Y(s.y[i])); ctx.stroke();
          ctx.beginPath(); ctx.arc(X(s.x[i]), Y(s.y[i]), s.r || 2.6, 0, 2 * Math.PI); ctx.fill();
        }
      } else {
        ctx.beginPath();
        for (let i = 0; i < s.x.length; i++) {
          const px = X(s.x[i]), py = Y(s.y[i]);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  };

  // ---------- inputs ----------
  L.$ = id => document.getElementById(id);
  L.num = id => parseFloat(L.$(id).value);
  L.on = (ids, fn, ev = 'input') => { for (const id of ids) L.$(id).addEventListener(ev, fn); };
  L.out = (id, text) => { L.$(id).textContent = text; };

  // Pointer drag on an element; fn(fx, fy) with fractions of the element box
  L.onDrag = (el, fn) => {
    let down = false;
    const go = e => {
      const r = el.getBoundingClientRect();
      fn(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)));
    };
    el.addEventListener('pointerdown', e => { down = true; el.setPointerCapture(e.pointerId); go(e); e.preventDefault(); });
    el.addEventListener('pointermove', e => { if (down) go(e); });
    el.addEventListener('pointerup', () => { down = false; });
    el.addEventListener('pointercancel', () => { down = false; });
  };

  L.loadGray = src => new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const N = img.width, c = document.createElement('canvas');
      c.width = N; c.height = N;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, N, N).data, a = new Float64Array(N * N);
      for (let i = 0; i < N * N; i++) a[i] = d[4 * i] / 255;
      res(a);
    };
    img.src = src;
  });

  // Redraw hooks for resize / theme change
  const hooks = [];
  L.redraw = fn => { hooks.push(fn); };
  let pending = 0;
  const all = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => hooks.forEach(f => f())); };
  window.addEventListener('resize', all);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', all);
  L.redrawAll = all;

  L.fmt = (x, d = 1) => (Math.abs(x) < 1e-9 ? 0 : x).toFixed(d);
  return L;
})();
