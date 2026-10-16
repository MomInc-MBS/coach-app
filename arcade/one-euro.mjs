export const DCUTOFF = 1;

export class OneEuroFilter {
    constructor({ minCutoff, beta, dCutoff }) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.reset();
    }

    reset() {
        this.first = true;
        this.xPrev = 0;
        this.dxHatPrev = 0;
        this.xHat = 0;
        this.dxHat = 0;
    }

    static lowpass(v, a, prev) {
        return a * v + (1 - a) * prev;
    }

    static alpha(cutoff, dt) {
        const tau = 1 / (2 * Math.PI * cutoff);
        return 1 / (1 + tau / dt);
    }

    filter(x, dtSeconds) {
        if (dtSeconds < 1e-3) dtSeconds = 1e-3;
        if (this.first) {
            this.xHat = x;
            this.dxHat = 0;
            // Ensure derivative history is initialized for the next sample
            this.xPrev = x;
            this.first = false;
            return this.xHat;
        }
        const dx = (x - this.xPrev) / dtSeconds;
        const edx = OneEuroFilter.lowpass(dx, OneEuroFilter.alpha(this.dCutoff, dtSeconds), this.dxHatPrev);
        this.dxHat = edx;

        const cutoff = this.minCutoff + this.beta * Math.abs(edx);
        const xHat = OneEuroFilter.lowpass(x, OneEuroFilter.alpha(cutoff, dtSeconds), this.xHat);

        this.xPrev = x;
        this.dxHatPrev = edx;
        this.xHat = xHat;

        return xHat;
    }
}

export const PRESETS = {
    wrist: { minCutoff: 3, beta: 20, dCutoff: DCUTOFF },
    torso: { minCutoff: 1, beta: 4, dCutoff: DCUTOFF }
};

export function presetFor(index) {
    if (index >= 15 && index <= 22) return PRESETS.wrist;
    return PRESETS.torso;
}

export function createLandmarkBank(presetFn) {
    const states = new Map();

    function update(index, x, y, visibility, tMs) {
        let state = states.get(index);
        const dtMs = state ? tMs - state.lastMs : 0;

        if (state && dtMs > 300) {
            state.xFilter.reset();
            state.yFilter.reset();
            state.vis = 0;
            state.visible = false;
        }

        if (!state) {
            const preset = presetFn(index);
            state = {
                xFilter: new OneEuroFilter(preset),
                yFilter: new OneEuroFilter(preset),
                lastMs: tMs,
                visible: false,
                vis: 0
            };
            states.set(index, state);
        }

        // Visibility hysteresis
        if (!state.visible && visibility >= 0.6) state.visible = true;
        else if (state.visible && visibility < 0.4) state.visible = false;

        // Alpha fade
        const target = state.visible ? 1 : 0;
        const step = dtMs / 200;
        if (dtMs > 0) {
            const diff = target - state.vis;
            state.vis += Math.sign(diff) * Math.min(Math.abs(diff), step);
            if (state.vis < 0) state.vis = 0;
            if (state.vis > 1) state.vis = 1;
        }

        // Filter
        const dtSec = state.lastMs === tMs ? 1 / 30 : dtMs / 1000;
        const fx = state.xFilter.filter(x, dtSec);
        const fy = state.yFilter.filter(y, dtSec);

        state.lastMs = tMs;

        return { x: fx, y: fy, alpha: state.vis, visible: state.visible };
    }

    function predict(index, ms) {
        const state = states.get(index);
        if (!state) return null;
        const lookahead = Math.min(ms, 66) / 1000;
        const dx = state.xFilter.dxHat * lookahead * 0.6;
        const dy = state.yFilter.dxHat * lookahead * 0.6;
        return {
            x: state.xFilter.xHat + dx,
            y: state.yFilter.xHat + dy
        };
    }

    function reset(index) {
        states.delete(index);
    }

    return { update, predict, reset };
}
