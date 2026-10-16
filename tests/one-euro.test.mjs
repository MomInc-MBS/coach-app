import assert from 'node:assert/strict';
import test from 'node:test';
import { OneEuroFilter, PRESETS, presetFor, createLandmarkBank } from '../arcade/one-euro.mjs';

function lcg(seed) {
    let s = seed;
    return function () {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

test('Noise is reduced', () => {
    const rand = lcg(12345);
    const samples = [];
    for (let i = 0; i < 300; i++) {
        const noise = (rand() * 2 - 1) * 0.01;
        samples.push(0.5 + noise);
    }
    const filter = new OneEuroFilter(PRESETS.wrist);
    const outputs = [];
    for (let i = 0; i < 300; i++) {
        const out = filter.filter(samples[i], 1 / 30);
        if (i >= 60) outputs.push(out);
    }
    // Use the same window for both input and output
    const windowSamples = samples.slice(60);
    const meanIn = windowSamples.reduce((a, b) => a + b, 0) / windowSamples.length;
    const meanOut = outputs.reduce((a, b) => a + b, 0) / outputs.length;
    const stdIn = Math.sqrt(windowSamples.map(v => (v - meanIn) ** 2).reduce((a, b) => a + b, 0) / windowSamples.length);
    const stdOut = Math.sqrt(outputs.map(v => (v - meanOut) ** 2).reduce((a, b) => a + b, 0) / outputs.length);
    assert(stdOut < 0.7 * stdIn);
});

test('Fast ramp has small lag', () => {
    const filter = new OneEuroFilter(PRESETS.wrist);
    const dt = 1 / 60;
    let lastX = 0.5;
    for (let i = 0; i < 60; i++) {
        const t = i * dt;
        const x = 0.5 + 1.0 * t;
        const out = filter.filter(x, dt);
        if (i >= 30) assert(Math.abs(out - x) < 0.03);
    }
});

test('Visibility hysteresis with the bank', () => {
    const bank = createLandmarkBank(presetFor);
    const idx = 10;
    let res;

    // start off
    res = bank.update(idx, 0, 0, 0.5, 0);
    assert.strictEqual(res.visible, false);

    // go on
    res = bank.update(idx, 0, 0, 0.7, 33);
    assert.strictEqual(res.visible, true);

    // stay on
    res = bank.update(idx, 0, 0, 0.5, 66);
    assert.strictEqual(res.visible, true);

    // go off
    res = bank.update(idx, 0, 0, 0.3, 99);
    assert.strictEqual(res.visible, false);

    // alpha fade to 1 after steady visible input for 200ms
    let lastAlpha = 0;
    for (let i = 132; i < 332; i += 33) {
        res = bank.update(idx, 0, 0, 0.7, i);
        lastAlpha = res.alpha;
    }
    assert.strictEqual(lastAlpha, 1);
});

test('Reset after 300 ms', () => {
    const bank = createLandmarkBank(presetFor);
    const idx = 5;
    let res;

    // first two samples
    res = bank.update(idx, 0.2, 0, 0.7, 0);
    res = bank.update(idx, 0.2, 0, 0.7, 33);

    // gap >300ms
    res = bank.update(idx, 0.8, 0, 0.7, 400);
    assert.strictEqual(res.x, 0.8);
});

test('Predict extrapolates', () => {
    const bank = createLandmarkBank(presetFor);
    const idx = 3;
    const dt = 1 / 60;
    let lastFilteredX = 0;

    for (let i = 0; i < 30; i++) {
        const t = i * dt;
        const x = 0.5 + 1.0 * t;
        const res = bank.update(idx, x, 0, 0.7, i * 1000 / 60);
        lastFilteredX = res.x;
    }

    const pred = bank.predict(idx, 66);
    assert(pred !== null);
    const diff = pred.x - lastFilteredX;
    assert(diff >= 0.02 && diff <= 0.06);

    // unknown index
    const none = bank.predict(9999, 50);
    assert.strictEqual(none, null);
});
