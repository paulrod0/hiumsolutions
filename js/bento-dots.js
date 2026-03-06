// ─── BENTO DOT GRID MORPHING EFFECT ──────────────────────────────────────────
// Replicates the Google Antigravity dot-formation effect:
// dots in a grid rearrange into bracket [ ] or circle outlines on hover.

class BentoDotEffect {
    constructor() {
        this.canvas  = null;
        this.ctx     = null;
        this.dots    = [];
        this.spacing = 22;       // grid dot spacing (px)
        this.dotR    = 1.5;      // base dot radius (px)
        this.activeMode   = null; // 'bracket' | 'circle' | null
        this.morphStrength = 0;
        this.morphTarget   = 0;
        this.raf = null;
        this._onResize = () => this.resize();
    }

    init() {
        const section = document.getElementById('solutions');
        if (!section) return;

        this.section = section;
        section.style.position = 'relative';

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'bento-dots-canvas';
        Object.assign(this.canvas.style, {
            position:      'absolute',
            top:           '0',
            left:          '0',
            width:         '100%',
            height:        '100%',
            pointerEvents: 'none',
            zIndex:        '1',
        });
        section.insertBefore(this.canvas, section.firstChild);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        this.setupEvents();
        this.loop();
        window.addEventListener('resize', this._onResize);
    }

    resize() {
        if (!this.canvas || !this.section) return;
        this.canvas.width  = this.section.offsetWidth;
        this.canvas.height = this.section.offsetHeight;
        this.buildGrid();
    }

    buildGrid() {
        this.dots = [];
        const { width: W, height: H } = this.canvas;
        const s = this.spacing;
        for (let y = s * 0.5; y < H; y += s) {
            for (let x = s * 0.5; x < W; x += s) {
                this.dots.push({ gx: x, gy: y, x, y, tx: x, ty: y, active: false });
            }
        }
    }

    // ── Shape path generators ─────────────────────────────────────────────────

    // Bracket [ or ] made of a vertical bar + top/bottom horizontal arms
    _bracketPath(cx, cy, w, h, side) {
        const pts    = [];
        const step   = 6;
        const arm    = w * 0.28; // arm length
        const dir    = side === 'left' ? 1 : -1;
        const vx     = side === 'left' ? cx - w * 0.5 : cx + w * 0.5;
        const top    = cy - h * 0.5;
        const bot    = cy + h * 0.5;

        // Vertical bar
        for (let t = top; t <= bot; t += step) pts.push({ x: vx, y: t });
        // Top arm
        for (let d = 0; d <= arm; d += step) pts.push({ x: vx + d * dir, y: top });
        // Bottom arm
        for (let d = 0; d <= arm; d += step) pts.push({ x: vx + d * dir, y: bot });

        return pts;
    }

    // Circle outline
    _circlePath(cx, cy, r) {
        const pts = [];
        const n   = Math.ceil((2 * Math.PI * r) / 6);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        return pts;
    }

    // ── Activation / deactivation ─────────────────────────────────────────────

    activate(bentoEl, mode) {
        if (!bentoEl) {
            this.morphTarget = 0;
            this.activeMode  = null;
            for (const d of this.dots) { d.active = false; d.tx = d.gx; d.ty = d.gy; }
            return;
        }

        const sRect = this.section.getBoundingClientRect();
        const bRect = bentoEl.getBoundingClientRect();

        // Card center / dimensions relative to the section canvas
        const cx = bRect.left - sRect.left + bRect.width  * 0.5;
        const cy = bRect.top  - sRect.top  + bRect.height * 0.5;
        const w  = bRect.width;
        const h  = bRect.height;

        // Build shape target points
        let pts = [];
        if (mode === 'bracket') {
            pts = [
                ...this._bracketPath(cx, cy, w * 0.90, h * 0.78, 'left'),
                ...this._bracketPath(cx, cy, w * 0.90, h * 0.78, 'right'),
            ];
        } else {
            pts = this._circlePath(cx, cy, Math.min(w, h) * 0.42);
        }

        this.activeMode  = mode;
        this.morphTarget = 1;

        const influenceR = Math.max(w, h) * 0.65;

        for (const dot of this.dots) {
            const distToCenter = Math.hypot(dot.gx - cx, dot.gy - cy);
            if (distToCenter > influenceR) {
                dot.active = false; dot.tx = dot.gx; dot.ty = dot.gy;
                continue;
            }
            // Find closest point on the shape path
            let bestPt = null, bestD = Infinity;
            for (const pt of pts) {
                const d = Math.hypot(dot.gx - pt.x, dot.gy - pt.y);
                if (d < bestD) { bestD = d; bestPt = pt; }
            }
            if (bestPt && bestD < this.spacing * 2.6) {
                dot.tx = bestPt.x; dot.ty = bestPt.y; dot.active = true;
            } else {
                dot.tx = dot.gx;   dot.ty = dot.gy;   dot.active = false;
            }
        }
    }

    // ── Animation loop ────────────────────────────────────────────────────────

    loop() {
        // Ease global morph strength (used for future global effects)
        this.morphStrength += (this.morphTarget - this.morphStrength)
            * (this.activeMode ? 0.07 : 0.05);

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const dot of this.dots) {
            const tx = (dot.active && this.activeMode) ? dot.tx : dot.gx;
            const ty = (dot.active && this.activeMode) ? dot.ty : dot.gy;

            const lerpSpeed = dot.active ? 0.10 : 0.07;
            dot.x += (tx - dot.x) * lerpSpeed;
            dot.y += (ty - dot.y) * lerpSpeed;

            // How far is this dot from its grid home? (0–1)
            const displaced = Math.hypot(dot.x - dot.gx, dot.y - dot.gy);
            const t = Math.min(displaced / (this.spacing * 2), 1);

            ctx.beginPath();
            if (t > 0.06) {
                // Formation dot — purple, grows slightly
                const alpha = 0.3 + t * 0.7;
                ctx.fillStyle = `rgba(109, 40, 217, ${alpha.toFixed(2)})`;
                ctx.arc(dot.x, dot.y, this.dotR * (1 + t * 1.3), 0, Math.PI * 2);
            } else {
                // Resting grid dot — small dark
                ctx.fillStyle = 'rgba(80, 80, 80, 0.28)';
                ctx.arc(dot.gx, dot.gy, this.dotR, 0, Math.PI * 2);
            }
            ctx.fill();
        }

        this.raf = requestAnimationFrame(() => this.loop());
    }

    // ── Event wiring ──────────────────────────────────────────────────────────

    setupEvents() {
        document.querySelectorAll('.bento-item').forEach(item => {
            const mode = item.classList.contains('cloud-bento') ? 'bracket' : 'circle';
            item.addEventListener('mouseenter', () => this.activate(item, mode));
            item.addEventListener('mouseleave', () => this.activate(null, null));
        });
    }

    destroy() {
        cancelAnimationFrame(this.raf);
        window.removeEventListener('resize', this._onResize);
        this.canvas?.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const bentoDots = new BentoDotEffect();
    bentoDots.init();
    window.bentoDots = bentoDots;
});
