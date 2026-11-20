/* Neon Shore Cover Maker — original offline app.
   Renders a multi-panel GTA-style poster cover from the user's own photos
   on a 2D canvas and exports it as a PNG. No network, no external fonts. */
'use strict';

const SAMPLES = ['samples/boulevard.jpg', 'samples/rooftop.jpg', 'samples/neon.jpg', 'samples/pier.jpg'];
const PRESETS = {
  sunset: { layout: 'hero', grade: 'sunset', size: '1920x1080', title: 'NEON SHORE', subtitle: 'a coast story in three acts', badge: 'EST. 2026 \u2022 SUNSET COAST' },
  neon: { layout: 'grid', grade: 'neon', size: '1080x1080', title: 'NIGHT SHIFT', subtitle: 'the city never sleeps', badge: 'NEON DISTRICT \u2022 AFTER DARK' },
  vice: { layout: 'full', grade: 'vice', size: '1080x1350', title: 'PALM ROYALE', subtitle: 'sun, surf and trouble', badge: 'PALM ROYALE \u2022 2026' },
};
const GRADES = {
  sunset: { top: 'rgba(255,154,61,0.20)', mid: 'rgba(255,46,136,0.16)', bot: 'rgba(90,10,80,0.28)', tint: '#ff7a3d', sat: 1.25, con: 1.08 },
  neon: { top: 'rgba(0,229,255,0.22)', mid: 'rgba(255,46,136,0.18)', bot: 'rgba(10,10,60,0.30)', tint: '#00e5ff', sat: 1.3, con: 1.12 },
  vice: { top: 'rgba(255,122,24,0.20)', mid: 'rgba(123,46,255,0.20)', bot: 'rgba(40,0,70,0.30)', tint: '#ff7a18', sat: 1.22, con: 1.06 },
  noir: { top: 'rgba(200,200,200,0.10)', mid: 'rgba(0,0,0,0.18)', bot: 'rgba(0,0,0,0.42)', tint: '#bbbbbb', sat: 0.15, con: 1.25 },
  palm: { top: 'rgba(46,255,168,0.16)', mid: 'rgba(255,154,61,0.14)', bot: 'rgba(0,60,40,0.28)', tint: '#2effa8', sat: 1.28, con: 1.08 },
};
const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

const state = {
  photos: [],          // {img, name}
  pickedPhoto: 0,
  selectedPanel: 0,
  layout: 'hero',
  grade: 'sunset',
  size: '1920x1080',
  title: 'NEON SHORE',
  subtitle: 'a coast story in three acts',
  badge: 'EST. 2026 \u2022 SUNSET COAST',
  panels: [],          // per layout: {photo, zoom, x, y}
};

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('statusLine');

/* Panel geometry: fractions of W/H. Title band is the bottom 28% (hero/grid)
   or 30% (full). Panels carry a white poster border. */
function panelRects(layout, W, H) {
  const band = layout === 'full' ? 0.30 : 0.28;
  const top = H * (1 - band);
  const g = Math.round(W * 0.012);
  if (layout === 'hero') {
    return [
      { x: 0, y: 0, w: W * 0.66, h: top },
      { x: W * 0.66, y: 0, w: W * 0.34, h: top / 3 },
      { x: W * 0.66, y: top / 3, w: W * 0.34, h: top / 3 },
      { x: W * 0.66, y: (top / 3) * 2, w: W * 0.34, h: top / 3 },
    ].map(r => ({ ...r, g }));
  }
  if (layout === 'grid') {
    const rects = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      rects.push({ x: (W / 3) * col, y: (top / 3) * row, w: W / 3, h: top / 3, g });
    }
    return rects;
  }
  // full-bleed: one photo everywhere, two snapshot insets top corners.
  return [
    { x: 0, y: 0, w: W, h: H, g: 0 },
    { x: W * 0.04, y: H * 0.04, w: W * 0.26, h: H * 0.20, g },
    { x: W * 0.70, y: H * 0.04, w: W * 0.26, h: H * 0.20, g },
  ].map(r => ({ ...r, g: r.g || 0 }));
}

function resetPanels() {
  const n = panelRects(state.layout, 100, 100).length;
  const count = state.photos.length || 1;
  state.panels = Array.from({ length: n }, (_, i) => ({
    photo: i % count, zoom: (state.layout === 'full' && i === 0) ? 1.0 : 1.2,
    x: 50, y: (state.layout === 'hero' && i > 0) ? 65 : 50, auto: true,
  }));
  state.selectedPanel = 0;
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  Object.assign(state, { layout: p.layout, grade: p.grade, size: p.size, title: p.title, subtitle: p.subtitle, badge: p.badge });
  document.getElementById('titleInput').value = p.title;
  document.getElementById('subtitleInput').value = p.subtitle;
  document.getElementById('badgeInput').value = p.badge;
  resetPanels();
  syncControls();
}

/* ---- photo loading ---- */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
}
async function addPhoto(img, name) {
  state.photos.push({ img, name });
  if (state.photos.length === 1) resetPanels();
  else state.panels.forEach((p, i) => { if (p.auto) p.photo = i % state.photos.length; });
  renderStrip();
  drawCover();
}
async function loadSamples() {
  statusLine.textContent = 'Loading sample photos…';
  for (const src of SAMPLES) {
    if (state.photos.some(p => p.name === src)) continue;
    try { await addPhoto(await loadImage(src), src); } catch (e) { /* skip a bad sample */ }
  }
  statusLine.textContent = state.photos.length + ' photos loaded — pick a layout, then Export PNG.';
}
function loadFiles(files) {
  [...files].forEach(file => {
    const reader = new FileReader();
    reader.onload = async e => {
      try { await addPhoto(await loadImage(e.target.result), file.name); } catch (err) { statusLine.textContent = 'Could not read ' + file.name; }
    };
    reader.readAsDataURL(file);
  });
}

/* ---- cover rendering ---- */
function drawPhotoCover(c, img, rect, panel) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const dw = iw * scale, dh = ih * scale;
  const dx = rect.x + (rect.w - dw) * (panel.x / 100);
  const dy = rect.y + (rect.h - dh) * (panel.y / 100);
  c.save();
  c.beginPath(); c.rect(rect.x, rect.y, rect.w, rect.h); c.clip();
  c.drawImage(img, dx, dy, dw, dh);
  c.restore();
}

function gradeOverlay(c, rect, grade) {
  const g = GRADES[grade];
  const grad = c.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, g.top); grad.addColorStop(0.55, g.mid); grad.addColorStop(1, g.bot);
  c.save();
  c.beginPath(); c.rect(rect.x, rect.y, rect.w, rect.h); c.clip();
  c.fillStyle = grad; c.fillRect(rect.x, rect.y, rect.w, rect.h);
  c.restore();
}

function drawTitleBlock(c, W, H, bandTop) {
  const g = GRADES[state.grade];
  const grad = c.createLinearGradient(0, bandTop, 0, H);
  grad.addColorStop(0, 'rgba(10,4,20,0.55)');
  grad.addColorStop(1, '#12041f');
  c.fillStyle = grad; c.fillRect(0, bandTop, W, H - bandTop);
  // halftone dots row
  c.fillStyle = g.tint;
  for (let x = W * 0.03; x < W * 0.97; x += W * 0.02) {
    c.globalAlpha = 0.5; c.beginPath(); c.arc(x, bandTop + H * 0.015, Math.max(2, W * 0.002), 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  const cx = W / 2;
  const titleSize = Math.min(W * 0.105, (H - bandTop) * 0.52);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  try { c.letterSpacing = Math.round(W * 0.004) + 'px'; } catch (e) {}
  c.font = '900 ' + titleSize + 'px "Arial Black", Impact, "Franklin Gothic Heavy", sans-serif';
  const tg = c.createLinearGradient(0, bandTop + (H - bandTop) * 0.15, 0, bandTop + (H - bandTop) * 0.75);
  tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.55, '#ffd9a8'); tg.addColorStop(1, g.tint);
  c.lineWidth = Math.max(3, W * 0.004); c.strokeStyle = '#16041f';
  c.strokeText(state.title, cx, bandTop + (H - bandTop) * 0.36);
  c.fillStyle = tg; c.fillText(state.title, cx, bandTop + (H - bandTop) * 0.36);
  try { c.letterSpacing = '0px'; } catch (e) {}
  c.font = 'italic 700 ' + Math.max(14, W * 0.021) + 'px Georgia, "Times New Roman", serif';
  c.fillStyle = '#ffe9f4';
  c.shadowColor = g.tint; c.shadowBlur = W * 0.012;
  c.fillText(state.subtitle, cx, bandTop + (H - bandTop) * 0.68);
  c.shadowBlur = 0;
  // badge ribbon (font set before measuring so the text fits)
  const bh = Math.max(20, H * 0.042);
  c.font = '800 ' + Math.max(11, bh * 0.42) + 'px Arial, sans-serif';
  let bw = c.measureText(state.badge).width + W * 0.05;
  bw = Math.min(bw, W * 0.92);
  const bx = (W - bw) / 2, by = H - bh - H * 0.015;
  c.fillStyle = g.tint; c.beginPath();
  c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw - bh * 0.5, by + bh); c.lineTo(bx + bh * 0.5, by + bh); c.closePath(); c.fill();
  c.fillStyle = '#16041f';
  c.fillText(state.badge, cx, by + bh / 2 + 1);
}

function grain(c, W, H, seed) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  c.save(); c.globalAlpha = 0.05; c.fillStyle = '#fff';
  for (let i = 0; i < W * H / 900; i++) c.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  c.restore();
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}

function renderCover(c, W, H) {
  const g = GRADES[state.grade];
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#12041f'; c.fillRect(0, 0, W, H);
  const rects = panelRects(state.layout, W, H);
  const bandTop = H * (state.layout === 'full' ? 0.70 : 0.72);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: 0, zoom: 1.2, x: 50, y: 50 };
    const photo = state.photos[panel.photo];
    if (photo) {
      c.save();
      try { c.filter = 'saturate(' + g.sat + ') contrast(' + g.con + ')'; } catch (e) {}
      drawPhotoCover(c, photo.img, rect, panel);
      c.filter = 'none'; c.restore();
    } else {
      const pg = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      pg.addColorStop(0, '#3a1c55'); pg.addColorStop(1, '#1a0b28');
      c.fillStyle = pg; c.fillRect(rect.x, rect.y, rect.w, rect.h);
      c.fillStyle = '#c9a8d8'; c.font = '700 ' + Math.max(14, W * 0.02) + 'px Arial, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    gradeOverlay(c, rect, state.grade);
    if (rect.g) {
      c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, rect.g * 0.8);
      c.strokeRect(rect.x + rect.g / 2, rect.y + rect.g / 2, rect.w - rect.g, rect.h - rect.g);
    }
    if (i === state.selectedPanel && c === ctx) {
      c.strokeStyle = '#00e5ff'; c.lineWidth = 4; c.setLineDash([14, 8]);
      c.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6); c.setLineDash([]);
    }
  });
  drawTitleBlock(c, W, H, bandTop);
  grain(c, W, H, 1234567);
}

function drawCover() {
  const [W, H] = SIZES[state.size];
  canvas.width = Math.round(W * 0.5); canvas.height = Math.round(H * 0.5);
  renderCover(ctx, canvas.width, canvas.height);
  document.getElementById('sizeLabel').textContent = state.size.replace('x', ' \u00d7 ');
}

/* ---- export ---- */
function exportCover() {
  if (!state.photos.length) { statusLine.textContent = 'Add a photo first — tap “Use sample photos”.'; return null; }
  const [W, H] = SIZES[state.size];
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  renderCover(off.getContext('2d'), W, H);
  const url = off.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url; a.download = 'neon-shore-cover-' + state.size + '.png'; a.click();
  const strip = document.getElementById('exportStrip');
  const thumb = document.createElement('img'); thumb.src = url; thumb.alt = 'Exported cover ' + state.size;
  strip.prepend(thumb);
  statusLine.textContent = 'Exported ' + state.size + ' PNG — check your downloads.';
  return url;
}

/* ---- UI ---- */
function renderStrip() {
  const strip = document.getElementById('photoStrip');
  strip.innerHTML = '';
  if (!state.photos.length) { strip.innerHTML = '<span class="empty">No photos yet.</span>'; return; }
  state.photos.forEach((p, i) => {
    const t = document.createElement('img');
    t.src = p.img.src; t.alt = p.name; t.title = p.name;
    if (i === state.pickedPhoto) t.classList.add('sel');
    t.addEventListener('click', () => {
      state.pickedPhoto = i;
      const panel = state.panels[state.selectedPanel];
      if (panel) { panel.photo = i; panel.auto = false; }
      renderStrip(); drawCover();
    });
    strip.appendChild(t);
  });
}
function syncControls() {
  document.querySelectorAll('#layoutSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeSwatches .sw').forEach(b => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.size === state.size));
  const panel = state.panels[state.selectedPanel];
  if (panel) {
    document.getElementById('zoomInput').value = panel.zoom;
    document.getElementById('xInput').value = panel.x;
    document.getElementById('yInput').value = panel.y;
    document.getElementById('zoomVal').textContent = panel.zoom.toFixed(2) + '\u00d7';
    document.getElementById('xVal').textContent = panel.x + '%';
    document.getElementById('yVal').textContent = panel.y + '%';
  }
  drawCover();
}
function bindPanelSlider(id, key, fmt) {
  document.getElementById(id).addEventListener('input', e => {
    const panel = state.panels[state.selectedPanel]; if (!panel) return;
    panel[key] = parseFloat(e.target.value); syncControls();
  });
}

document.getElementById('fileInput').addEventListener('change', e => loadFiles(e.target.files));
document.getElementById('sampleBtn').addEventListener('click', loadSamples);
document.getElementById('exportBtn').addEventListener('click', exportCover);
document.getElementById('fillAllBtn').addEventListener('click', () => {
  state.panels.forEach(p => { p.photo = state.pickedPhoto; p.auto = false; }); drawCover();
});
document.getElementById('shuffleBtn').addEventListener('click', () => {
  if (!state.photos.length) return;
  state.panels.forEach(p => { p.photo = Math.floor(Math.random() * state.photos.length); });
  drawCover();
});
document.querySelectorAll('#layoutSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  state.layout = b.dataset.layout; resetPanels(); syncControls();
}));
document.querySelectorAll('#gradeSwatches .sw').forEach(b => b.addEventListener('click', () => {
  state.grade = b.dataset.grade; syncControls();
}));
document.querySelectorAll('#sizeSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  state.size = b.dataset.size; syncControls();
}));
document.getElementById('titleInput').addEventListener('input', e => { state.title = e.target.value.toUpperCase() || 'UNTITLED'; drawCover(); });
document.getElementById('subtitleInput').addEventListener('input', e => { state.subtitle = e.target.value; drawCover(); });
document.getElementById('badgeInput').addEventListener('input', e => { state.badge = e.target.value.toUpperCase(); drawCover(); });
bindPanelSlider('zoomInput', 'zoom'); bindPanelSlider('xInput', 'x'); bindPanelSlider('yInput', 'y');

/* click / drag on the preview: select a panel, drag pans its photo */
let drag = null;
function panelAt(mx, my) {
  const r = canvas.getBoundingClientRect();
  const x = (mx - r.left) / r.width * canvas.width, y = (my - r.top) / r.height * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const rc = rects[i];
    if (x >= rc.x && x <= rc.x + rc.w && y >= rc.y && y <= rc.y + rc.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', e => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selectedPanel = i; drag = { x: e.clientX, y: e.clientY, px: state.panels[i].x, py: state.panels[i].y };
  syncControls();
});
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const p = state.panels[state.selectedPanel];
  p.x = Math.max(0, Math.min(100, drag.px + (e.clientX - drag.x) / r.width * 100));
  p.y = Math.max(0, Math.min(100, drag.py + (e.clientY - drag.y) / r.height * 100));
  syncControls();
});
window.addEventListener('pointerup', () => { drag = null; });

/* boot: preset from ?preset=, else the winning neon grid preset */
const preset = new URLSearchParams(location.search).get('preset');
if (preset && PRESETS[preset]) applyPreset(preset); else applyPreset('neon');
renderStrip(); syncControls();
loadSamples();
