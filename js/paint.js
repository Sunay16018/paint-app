'use strict';

// =====================================================
//  PAINT PRO — Main Application Logic
//  Features: pencil, brush, eraser, fill, spray,
//            line, rect, circle, eyedropper,
//            undo/redo (30 steps), symmetry, grid,
//            zoom, opacity, keyboard shortcuts,
//            PNG/JPG download, localStorage saves
// =====================================================

// ── Canvas Setup ──────────────────────────────────────
const canvas        = document.getElementById('canvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const ctx           = canvas.getContext('2d');
const overlayCtx    = overlayCanvas.getContext('2d');

const CANVAS_W = 800;
const CANVAS_H = 800;

canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;
overlayCanvas.width  = CANVAS_W;
overlayCanvas.height = CANVAS_H;

// White background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

// ── State ──────────────────────────────────────────────
let state = {
    isDrawing:    false,
    currentColor: '#000000',
    currentSize:  5,
    currentTool:  'pencil',
    opacity:      1.0,
    symmetry:     false,
    grid:         false,
    lastPoint:    null,
    startPoint:   null,
    zoom:         1.0,
    snapshotData: null,   // for shape preview
};

// ── History (Undo/Redo) ────────────────────────────────
const MAX_HISTORY = 40;
let history      = [];
let historyIndex = -1;
saveToHistory();

function saveToHistory() {
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(canvas.toDataURL());
    historyIndex++;
    if (history.length > MAX_HISTORY) {
        history.shift();
        historyIndex--;
    }
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreHistory();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreHistory();
    }
}

function restoreHistory() {
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.drawImage(img, 0, 0);
        drawGuides();
    };
    img.src = history[historyIndex];
}

// ── Zoom ──────────────────────────────────────────────
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
let zoomIndex = ZOOM_STEPS.indexOf(1.0);

function applyZoom() {
    const scale = ZOOM_STEPS[zoomIndex];
    state.zoom  = scale;
    const w = CANVAS_W * scale;
    const h = CANVAS_H * scale;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    overlayCanvas.style.width  = w + 'px';
    overlayCanvas.style.height = h + 'px';
    document.getElementById('zoomIndicator').textContent = Math.round(scale * 100) + '%';
}
applyZoom();

document.getElementById('zoomInBtn').addEventListener('click', () => {
    if (zoomIndex < ZOOM_STEPS.length - 1) { zoomIndex++; applyZoom(); }
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
    if (zoomIndex > 0) { zoomIndex--; applyZoom(); }
});

// Pinch-to-zoom
let pinchStartDist = null;
let pinchStartZoom = 1;

document.getElementById('canvasWrapper').addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        pinchStartDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartZoom = zoomIndex;
    }
}, { passive: true });

document.getElementById('canvasWrapper').addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchStartDist) {
        e.preventDefault();
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / pinchStartDist;
        const targetZoom = ZOOM_STEPS[pinchStartZoom] * ratio;
        let newIdx = ZOOM_STEPS.reduce((best, z, i) =>
            Math.abs(z - targetZoom) < Math.abs(ZOOM_STEPS[best] - targetZoom) ? i : best, pinchStartZoom);
        newIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, newIdx));
        if (newIdx !== zoomIndex) { zoomIndex = newIdx; applyZoom(); }
    }
}, { passive: false });

document.getElementById('canvasWrapper').addEventListener('touchend', () => {
    pinchStartDist = null;
});

// Mouse wheel zoom
document.getElementById('canvasWrapper').addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0 && zoomIndex < ZOOM_STEPS.length - 1) { zoomIndex++; applyZoom(); }
        else if (e.deltaY > 0 && zoomIndex > 0) { zoomIndex--; applyZoom(); }
    }
}, { passive: false });

// ── Guide Rendering ────────────────────────────────────
function drawGuides() {
    overlayCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (state.grid) {
        overlayCtx.save();
        overlayCtx.strokeStyle = 'rgba(120,120,120,0.18)';
        overlayCtx.lineWidth = 0.5;
        const step = 40;
        for (let x = 0; x <= CANVAS_W; x += step) {
            overlayCtx.beginPath(); overlayCtx.moveTo(x, 0); overlayCtx.lineTo(x, CANVAS_H); overlayCtx.stroke();
        }
        for (let y = 0; y <= CANVAS_H; y += step) {
            overlayCtx.beginPath(); overlayCtx.moveTo(0, y); overlayCtx.lineTo(CANVAS_W, y); overlayCtx.stroke();
        }
        overlayCtx.restore();
    }
    if (state.symmetry) {
        overlayCtx.save();
        overlayCtx.strokeStyle = 'rgba(52,211,153,0.5)';
        overlayCtx.lineWidth = 1.5;
        overlayCtx.setLineDash([6, 5]);
        overlayCtx.beginPath();
        overlayCtx.moveTo(CANVAS_W / 2, 0);
        overlayCtx.lineTo(CANVAS_W / 2, CANVAS_H);
        overlayCtx.stroke();
        overlayCtx.restore();
    }
}
drawGuides();

// ── Coordinates ────────────────────────────────────────
function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    let clientX, clientY;
    if (e.touches) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    return {
        x: Math.max(0, Math.min(CANVAS_W, (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(CANVAS_H, (clientY - rect.top) * scaleY))
    };
}

// ── Context Helpers ────────────────────────────────────
function applyCtxStyle(isEraser) {
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.fillStyle   = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        const rgb = hexToRgb(state.currentColor);
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${state.opacity})`;
        ctx.fillStyle   = `rgba(${rgb.r},${rgb.g},${rgb.b},${state.opacity})`;
    }
    ctx.lineWidth  = state.currentSize;
    ctx.lineCap    = 'round';
    ctx.lineJoin   = 'round';
}

// ── Draw Line Segment ──────────────────────────────────
function drawSegment(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (state.symmetry) {
        ctx.beginPath();
        ctx.moveTo(CANVAS_W - x1, y1);
        ctx.lineTo(CANVAS_W - x2, y2);
        ctx.stroke();
    }
}

// ── Brush (soft) ───────────────────────────────────────
function drawBrush(x1, y1, x2, y2) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const rgb = hexToRgb(state.currentColor);
    const r = state.currentSize;
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (r * 0.4)));
    for (let i = 0; i <= steps; i++) {
        const t  = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${state.opacity * 0.3})`);
        grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        if (state.symmetry) {
            const spx = CANVAS_W - px;
            const sgrad = ctx.createRadialGradient(spx, py, 0, spx, py, r);
            sgrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${state.opacity * 0.3})`);
            sgrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
            ctx.beginPath();
            ctx.arc(spx, py, r, 0, Math.PI * 2);
            ctx.fillStyle = sgrad;
            ctx.fill();
        }
    }
    ctx.restore();
}

// ── Spray ──────────────────────────────────────────────
function spray(x, y) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const rgb = hexToRgb(state.currentColor);
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${state.opacity})`;
    const r = state.currentSize * 1.5;
    const density = Math.max(8, state.currentSize * 2);
    for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = Math.random() * r;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1.2 + 0.3, 0, Math.PI * 2);
        ctx.fill();
        if (state.symmetry) {
            ctx.beginPath();
            ctx.arc(CANVAS_W - px, py, Math.random() * 1.2 + 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// ── Flood Fill ─────────────────────────────────────────
function floodFill(startX, startY, fillColor) {
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const data = imageData.data;
    const idx = (startY * CANVAS_W + startX) * 4;
    const tR = data[idx], tG = data[idx+1], tB = data[idx+2], tA = data[idx+3];
    const fill = hexToRgb(fillColor);
    if (!fill) return;
    if (tR === fill.r && tG === fill.g && tB === fill.b && tA === 255) return;
    const fillA = Math.round(state.opacity * 255);

    const TOL = 20;
    function match(pos) {
        return Math.abs(data[pos]-tR) <= TOL &&
               Math.abs(data[pos+1]-tG) <= TOL &&
               Math.abs(data[pos+2]-tB) <= TOL &&
               Math.abs(data[pos+3]-tA) <= TOL;
    }
    function set(pos) {
        data[pos]   = fill.r;
        data[pos+1] = fill.g;
        data[pos+2] = fill.b;
        data[pos+3] = fillA;
    }

    const W = CANVAS_W, H = CANVAS_H;
    const visited = new Uint8Array(W * H);
    const queue = [startX + startY * W];
    visited[startX + startY * W] = 1;

    while (queue.length) {
        const p = queue.pop();
        const px = p % W, py = (p / W) | 0;
        const pos = p * 4;
        if (!match(pos)) continue;
        set(pos);
        const neighbors = [px-1+py*W, px+1+py*W, px+(py-1)*W, px+(py+1)*W];
        for (const n of neighbors) {
            const nx = n % W, ny = (n / W) | 0;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H && !visited[n]) {
                visited[n] = 1;
                queue.push(n);
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// ── Eyedropper ─────────────────────────────────────────
function eyedrop(x, y) {
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = '#' + [pixel[0],pixel[1],pixel[2]].map(v => v.toString(16).padStart(2,'0')).join('');
    setCurrentColor(hex);
    // Switch back to pencil
    setTool('pencil');
    showToast('Renk seçildi!', 'success');
}

// ── Shape Preview (line, rect, circle) ─────────────────
function drawShapePreview(x, y) {
    // Restore canvas snapshot
    if (state.snapshotData) {
        ctx.putImageData(state.snapshotData, 0, 0);
    }
    applyCtxStyle(false);
    const sx = state.startPoint.x, sy = state.startPoint.y;

    if (state.currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(x, y);
        ctx.stroke();
        if (state.symmetry) {
            ctx.beginPath();
            ctx.moveTo(CANVAS_W - sx, sy);
            ctx.lineTo(CANVAS_W - x, y);
            ctx.stroke();
        }
    } else if (state.currentTool === 'rect') {
        ctx.beginPath();
        ctx.strokeRect(sx, sy, x - sx, y - sy);
        if (state.symmetry) {
            ctx.beginPath();
            ctx.strokeRect(CANVAS_W - sx, sy, -(x - sx), y - sy);
        }
    } else if (state.currentTool === 'circle') {
        const rx = Math.abs(x - sx) / 2;
        const ry = Math.abs(y - sy) / 2;
        const cx = sx + (x - sx) / 2;
        const cy = sy + (y - sy) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (state.symmetry) {
            ctx.beginPath();
            ctx.ellipse(CANVAS_W - cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    drawGuides();
}

// ── Event Handlers ─────────────────────────────────────
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup',   handleEnd);
canvas.addEventListener('mouseleave', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove',  handleMove,  { passive: false });
canvas.addEventListener('touchend',   handleEnd,   { passive: false });
canvas.addEventListener('touchcancel',handleEnd,   { passive: false });

function handleStart(e) {
    if (e.touches && e.touches.length > 1) return;
    e.preventDefault();
    const pos = getCoords(e);
    if (!pos) return;

    if (state.currentTool === 'eyedropper') {
        eyedrop(pos.x, pos.y);
        return;
    }
    if (state.currentTool === 'fill') {
        floodFill(pos.x, pos.y, state.currentColor);
        drawGuides();
        saveToHistory();
        return;
    }

    state.isDrawing  = true;
    state.lastPoint  = pos;
    state.startPoint = pos;

    if (['line','rect','circle'].includes(state.currentTool)) {
        state.snapshotData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
        return;
    }

    applyCtxStyle(state.currentTool === 'eraser');

    if (state.currentTool === 'spray') {
        spray(pos.x, pos.y);
    } else if (state.currentTool === 'brush') {
        // dot
        const rgb = hexToRgb(state.currentColor);
        const r = state.currentSize;
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${state.opacity * 0.5})`);
        grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // dot for pencil/eraser
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, state.currentSize / 2, 0, Math.PI * 2);
        ctx.fill();
        if (state.symmetry) {
            ctx.beginPath();
            ctx.arc(CANVAS_W - pos.x, pos.y, state.currentSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function handleMove(e) {
    if (e.touches && e.touches.length > 1) return;
    e.preventDefault();
    if (!state.isDrawing) return;
    const pos = getCoords(e);
    if (!pos) return;

    if (['line','rect','circle'].includes(state.currentTool)) {
        drawShapePreview(pos.x, pos.y);
        return;
    }

    applyCtxStyle(state.currentTool === 'eraser');

    if (state.currentTool === 'spray') {
        spray(pos.x, pos.y);
    } else if (state.currentTool === 'brush') {
        drawBrush(state.lastPoint.x, state.lastPoint.y, pos.x, pos.y);
    } else {
        drawSegment(state.lastPoint.x, state.lastPoint.y, pos.x, pos.y);
    }
    state.lastPoint = pos;
}

function handleEnd(e) {
    e.preventDefault();
    if (!state.isDrawing) return;
    state.isDrawing    = false;
    state.snapshotData = null;
    ctx.globalCompositeOperation = 'source-over';
    saveToHistory();
    drawGuides();
    state.lastPoint = null;
}

// ── Color Palette ──────────────────────────────────────
const COLORS = [
    '#000000','#1a1a2e','#16213e','#0f3460',
    '#ffffff','#f8fafc','#f1f5f9','#e2e8f0',
    '#ef4444','#dc2626','#b91c1c','#7f1d1d',
    '#f97316','#ea580c','#c2410c','#9a3412',
    '#eab308','#ca8a04','#a16207','#854d0e',
    '#22c55e','#16a34a','#15803d','#166534',
    '#06b6d4','#0891b2','#0e7490','#155e75',
    '#3b82f6','#2563eb','#1d4ed8','#1e40af',
    '#8b5cf6','#7c3aed','#6d28d9','#4c1d95',
    '#ec4899','#db2777','#be185d','#9d174d',
    '#f43f5e','#e11d48','#be123c','#9f1239',
    '#84cc16','#65a30d','#4d7c0f','#3f6212',
    '#14b8a6','#0d9488','#0f766e','#115e59',
    '#a78bfa','#60a5fa','#34d399','#fbbf24',
    '#6b7280','#4b5563','#374151','#1f2937',
    '#d97706','#b45309','#92400e','#78350f',
];

const colorsDiv = document.getElementById('colors');
COLORS.forEach((color, i) => {
    const btn = document.createElement('div');
    btn.className = 'color-btn' + (i === 0 ? ' active' : '');
    btn.style.backgroundColor = color;
    btn.title = color;
    btn.addEventListener('click', () => {
        setCurrentColor(color);
        if (['eraser','fill'].indexOf(state.currentTool) === -1) {
            setTool('pencil');
        }
    });
    colorsDiv.appendChild(btn);
});

function setCurrentColor(hex) {
    state.currentColor = hex;
    document.getElementById('currentColorDisplay').style.backgroundColor = hex;
    document.getElementById('colorPicker').value = hex;
    document.querySelectorAll('.color-btn').forEach(b => {
        b.classList.toggle('active', b.style.backgroundColor === hexToCssRgb(hex) || b.title === hex);
    });
}
setCurrentColor('#000000');

// Color picker (custom color)
document.getElementById('colorPicker').addEventListener('input', (e) => {
    setCurrentColor(e.target.value);
});

function hexToCssRgb(hex) {
    const r = hexToRgb(hex);
    if (!r) return hex;
    return `rgb(${r.r}, ${r.g}, ${r.b})`;
}
function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
}

// ── Brush Size ─────────────────────────────────────────
const sizeSlider  = document.getElementById('brushSize');
const sizeDisplay = document.getElementById('sizeValue');

sizeSlider.addEventListener('input', (e) => {
    state.currentSize = parseInt(e.target.value);
    sizeDisplay.textContent = state.currentSize + 'px';
    updateSizePresets();
});

document.querySelectorAll('.size-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        const sz = parseInt(btn.dataset.size);
        state.currentSize    = sz;
        sizeSlider.value     = sz;
        sizeDisplay.textContent = sz + 'px';
        updateSizePresets();
    });
});

function updateSizePresets() {
    document.querySelectorAll('.size-preset').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.size) === state.currentSize);
    });
}

// ── Opacity ────────────────────────────────────────────
document.getElementById('opacitySlider').addEventListener('input', (e) => {
    state.opacity = parseInt(e.target.value) / 100;
    document.getElementById('opacityValue').textContent = Math.round(state.opacity * 100) + '%';
});

// ── Tool Selection ─────────────────────────────────────
function setTool(toolName) {
    state.currentTool = toolName;
    document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.tool[data-tool="${toolName}"]`);
    if (btn) btn.classList.add('active');
    // Update cursor
    const cursors = {
        pencil:     'crosshair',
        brush:      'crosshair',
        eraser:     'cell',
        fill:       'copy',
        spray:      'crosshair',
        line:       'crosshair',
        rect:       'crosshair',
        circle:     'crosshair',
        eyedropper: 'eyedropper',
        clear:      'default',
    };
    canvas.style.cursor = cursors[toolName] || 'crosshair';
}

document.querySelectorAll('.tool[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        if (tool === 'clear') {
            if (confirm('Tuvali temizlemek istediğine emin misin?')) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                saveToHistory();
                drawGuides();
            }
            return;
        }
        setTool(tool);
    });
});
setTool('pencil');

// ── Undo / Redo ────────────────────────────────────────
document.getElementById('undoBtn').addEventListener('click', () => { undo(); });
document.getElementById('redoBtn').addEventListener('click', () => { redo(); });

// ── Symmetry / Grid ────────────────────────────────────
document.getElementById('symmetryBtn').addEventListener('click', () => {
    state.symmetry = !state.symmetry;
    document.getElementById('symmetryBtn').classList.toggle('active', state.symmetry);
    drawGuides();
});

document.getElementById('gridBtn').addEventListener('click', () => {
    state.grid = !state.grid;
    document.getElementById('gridBtn').classList.toggle('active', state.grid);
    drawGuides();
});

// ── Keyboard Shortcuts ─────────────────────────────────
document.addEventListener('keydown', (e) => {
    // Don't trigger on inputs
    if (e.target.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
        if (key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
        if (key === 'y') { e.preventDefault(); redo(); return; }
        if (key === 's') { e.preventDefault(); quickSave(); return; }
        if (key === '=' || key === '+') { e.preventDefault(); if (zoomIndex < ZOOM_STEPS.length-1) { zoomIndex++; applyZoom(); } return; }
        if (key === '-') { e.preventDefault(); if (zoomIndex > 0) { zoomIndex--; applyZoom(); } return; }
        if (key === '0') { e.preventDefault(); zoomIndex = ZOOM_STEPS.indexOf(1.0); applyZoom(); return; }
    }
    const toolKeys = { p:'pencil', b:'brush', e:'eraser', f:'fill', s:'spray', l:'line', r:'rect', c:'circle', i:'eyedropper' };
    if (toolKeys[key] && !e.ctrlKey && !e.metaKey) { setTool(toolKeys[key]); }
    if (key === '[') { state.currentSize = Math.max(1, state.currentSize - 2); sizeSlider.value = state.currentSize; sizeDisplay.textContent = state.currentSize + 'px'; updateSizePresets(); }
    if (key === ']') { state.currentSize = Math.min(100, state.currentSize + 2); sizeSlider.value = state.currentSize; sizeDisplay.textContent = state.currentSize + 'px'; updateSizePresets(); }
});

// ── Download ───────────────────────────────────────────
function downloadCanvas(format = 'png') {
    // Create a clean canvas (without guide overlays baked in)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width  = CANVAS_W;
    tempCanvas.height = CANVAS_H;
    const tempCtx = tempCanvas.getContext('2d');

    // White background for JPG
    if (format === 'jpg') {
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    tempCtx.drawImage(canvas, 0, 0);

    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const quality  = format === 'jpg' ? 0.95 : 1.0;
    const dataURL  = tempCanvas.toDataURL(mimeType, quality);

    const link = document.createElement('a');
    link.download = `paint-pro-${Date.now()}.${format}`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${format.toUpperCase()} indirildi! ✓`, 'success');
}

document.getElementById('downloadBtn').addEventListener('click', () => downloadCanvas('png'));
document.getElementById('downloadPngBtn').addEventListener('click', () => { downloadCanvas('png'); closeMenu(); });
document.getElementById('downloadJpgBtn').addEventListener('click', () => { downloadCanvas('jpg'); closeMenu(); });

// ── Menu ───────────────────────────────────────────────
const menuBtn      = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');

menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menuDropdown.classList.toggle('show'); });
document.addEventListener('click', () => menuDropdown.classList.remove('show'));
menuDropdown.addEventListener('click', (e) => e.stopPropagation());
function closeMenu() { menuDropdown.classList.remove('show'); }

// ── New Drawing ────────────────────────────────────────
document.getElementById('newDrawingBtn').addEventListener('click', () => {
    if (confirm('Yeni çizim başlatmak istediğine emin misin? Kaydedilmemiş değişiklikler kaybolacak.')) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        saveToHistory();
        drawGuides();
    }
    closeMenu();
});

// ── Load Image ─────────────────────────────────────────
document.getElementById('loadImageBtn').addEventListener('click', () => {
    document.getElementById('imageUpload').click();
    closeMenu();
});

document.getElementById('imageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            // Fit image to canvas, centered
            const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
            const w = img.width  * scale;
            const h = img.height * scale;
            const x = (CANVAS_W - w) / 2;
            const y = (CANVAS_H - h) / 2;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.drawImage(img, x, y, w, h);
            saveToHistory();
            drawGuides();
            showToast('Resim yüklendi!', 'success');
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be picked again
});

// ── Save System ────────────────────────────────────────
function loadDrawings() {
    try { return JSON.parse(localStorage.getItem('paint-pro-drawings') || '[]'); }
    catch { return []; }
}

function persistDrawings(arr) {
    try { localStorage.setItem('paint-pro-drawings', JSON.stringify(arr)); } catch(err) {
        showToast('Depolama alanı dolu!', 'error');
    }
}

function saveDrawing(name) {
    const drawings = loadDrawings();
    const now = new Date();
    // Check duplicate name
    const existIdx = drawings.findIndex(d => d.name === name);
    const entry = {
        id:        existIdx >= 0 ? drawings[existIdx].id : Date.now(),
        name:      name,
        image:     canvas.toDataURL('image/png'),
        date:      now.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }),
        timestamp: now.getTime(),
    };
    if (existIdx >= 0) {
        drawings[existIdx] = entry;
        showToast(`"${name}" güncellendi!`, 'success');
    } else {
        drawings.push(entry);
        showToast(`"${name}" kaydedildi!`, 'success');
    }
    persistDrawings(drawings);
    updateSavedCount();
}

function deleteDrawing(id) {
    let drawings = loadDrawings().filter(d => d.id !== id);
    persistDrawings(drawings);
    renderDrawingsList();
    updateSavedCount();
}

function openDrawing(id) {
    const drawing = loadDrawings().find(d => d.id == id);
    if (!drawing) return;
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
        saveToHistory();
        drawGuides();
        document.getElementById('drawingName').value = drawing.name;
    };
    img.src = drawing.image;
    document.getElementById('drawingsModal').classList.remove('active');
    showToast(`"${drawing.name}" açıldı`, 'info');
}

function downloadSavedDrawing(id) {
    const drawing = loadDrawings().find(d => d.id == id);
    if (!drawing) return;
    const link = document.createElement('a');
    link.download = drawing.name.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g,'') + '.png';
    link.href = drawing.image;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`"${drawing.name}" indirildi!`, 'success');
}

function updateSavedCount() {
    const count = loadDrawings().length;
    // Optionally update button text
}

function quickSave() {
    const name = document.getElementById('drawingName').value.trim();
    if (!name) { showToast('Çizim adı girin!', 'error'); document.getElementById('drawingName').focus(); return; }
    saveDrawing(name);
}

document.getElementById('saveBtn').addEventListener('click', quickSave);

// ── Drawings Modal ─────────────────────────────────────
function renderDrawingsList() {
    const drawings = loadDrawings().sort((a,b) => b.timestamp - a.timestamp);
    const listDiv  = document.getElementById('drawingsList');
    if (drawings.length === 0) {
        listDiv.innerHTML = '<div class="empty-list">📭 Henüz çizim yok<p>Kaydet butonuna bas!</p></div>';
        return;
    }
    listDiv.innerHTML = '';
    drawings.forEach(d => {
        const item = document.createElement('div');
        item.className = 'drawing-item';
        item.innerHTML = `
            <img class="drawing-thumb" src="${d.image}" alt="${d.name}" loading="lazy">
            <div class="drawing-info">
                <div class="drawing-name">${escapeHtml(d.name)}</div>
                <div class="drawing-date">${d.date}</div>
            </div>
            <div class="drawing-actions">
                <button class="drawing-btn open-btn" onclick="openDrawing(${d.id})">Aç</button>
                <button class="drawing-btn download-btn" onclick="downloadSavedDrawing(${d.id})">⬇</button>
                <button class="drawing-btn delete-btn" onclick="confirmDelete(${d.id})">✕</button>
            </div>
        `;
        listDiv.appendChild(item);
    });
}

window.openDrawing          = openDrawing;
window.downloadSavedDrawing = downloadSavedDrawing;
window.confirmDelete        = (id) => {
    if (confirm('Bu çizimi silmek istediğine emin misin?')) deleteDrawing(id);
};

document.getElementById('savedDrawingsBtn').addEventListener('click', () => {
    renderDrawingsList();
    document.getElementById('drawingsModal').classList.add('active');
    closeMenu();
});

document.getElementById('closeDrawingsBtn').addEventListener('click', () => {
    document.getElementById('drawingsModal').classList.remove('active');
});

document.getElementById('drawingsModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('drawingsModal')) {
        document.getElementById('drawingsModal').classList.remove('active');
    }
});

// ── Toast ──────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Helpers ────────────────────────────────────────────
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── PWA Install Prompt ─────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('installBanner');
    if (!localStorage.getItem('install-dismissed')) {
        banner.classList.add('show');
    }
});

document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    document.getElementById('installBanner').classList.remove('show');
    if (outcome === 'accepted') showToast('Uygulama yüklendi! 🎉', 'success');
});

document.getElementById('installDismiss').addEventListener('click', () => {
    document.getElementById('installBanner').classList.remove('show');
    localStorage.setItem('install-dismissed', '1');
});

// Initial history save
saveToHistory();

console.log('%c🎨 Paint Pro v2.0 yüklendi!', 'color:#34d399;font-size:16px;font-weight:bold;');
console.log('Kısayollar: P=Kalem B=Fırça E=Silgi F=Boya S=Sprey L=Çizgi R=Dikdörtgen C=Daire I=Seçici');
console.log('Ctrl+Z=Geri Ctrl+Y=İleri Ctrl+S=Kaydet Ctrl++/- =Zoom [ ]=Boyut');
