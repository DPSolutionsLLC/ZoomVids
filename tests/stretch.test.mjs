import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const Stretch = loadModule('Stretch');
const SR = 48000;

function sine(freq, seconds, amp = 0.5) {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin(2 * Math.PI * freq * i / SR);
  return out;
}

function noise(n, seed = 1) {
  const out = new Float32Array(n);
  let x = seed;
  for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) % 2147483648; out[i] = x / 2147483648 - 0.5; }
  return out;
}

function convert(L, R, opts, sizes) {
  const conv = Stretch.create({ sampleRate: SR, ...opts });
  const partsL = [], partsR = [];
  let at = 0;
  for (const size of sizes) {
    const got = conv.push(L.subarray(at, at + size), R.subarray(at, at + size));
    partsL.push(got.L); partsR.push(got.R);
    at += size;
  }
  if (at < L.length) {
    const got = conv.push(L.subarray(at), R.subarray(at));
    partsL.push(got.L); partsR.push(got.R);
  }
  const end = conv.finish();
  partsL.push(end.L); partsR.push(end.R);
  const join = (parts) => {
    const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };
  return { L: join(partsL), R: join(partsR) };
}

function crossingsPerSecond(data, skipSeconds = 0.2) {
  const skip = Math.round(skipSeconds * SR), from = skip, to = data.length - skip;
  let count = 0;
  for (let i = from + 1; i < to; i++) if ((data[i - 1] < 0) !== (data[i] < 0)) count++;
  return count / 2 / ((to - from) / SR);
}

function rms(data, skipSeconds = 0.2) {
  const skip = Math.round(skipSeconds * SR);
  let sum = 0, n = 0;
  for (let i = skip; i < data.length - skip; i++) { sum += data[i] * data[i]; n++; }
  return Math.sqrt(sum / n);
}

const FACTORS = [0.75, 0.9, 1.1, 1.25];
const MODES = [true, false];

test('speed 1 passes the samples straight through', () => {
  const conv = Stretch.create({ factor: 1, keepPitch: true, sampleRate: SR });
  const L = sine(440, 0.5), R = sine(220, 0.5);
  const got = conv.push(L, R);
  assert.equal(got.L, L);
  assert.equal(got.R, R);
  assert.equal(conv.finish().L.length, 0);
});

test('create refuses a missing or zero speed', () => {
  assert.throws(() => Stretch.create({ factor: 0, keepPitch: true, sampleRate: SR }));
  assert.throws(() => Stretch.create({ keepPitch: true, sampleRate: SR }));
  assert.throws(() => Stretch.create({ factor: 0.9, keepPitch: true }));
});

test('push refuses channels of different lengths', () => {
  const conv = Stretch.create({ factor: 0.9, keepPitch: true, sampleRate: SR });
  assert.throws(() => conv.push(new Float32Array(10), new Float32Array(11)));
});

for (const keepPitch of MODES) {
  for (const factor of FACTORS) {
    test(`total length is exactly input / ${factor} (${keepPitch ? 'keep pitch' : 'tape'}), however it is split`, () => {
      const n = 2 * SR + 6 * SR + 1234;
      const L = noise(n, 3), R = noise(n, 7);
      const a = convert(L, R, { factor, keepPitch }, [2 * SR, 6 * SR, 1234]);
      const b = convert(L, R, { factor, keepPitch }, [777, 3 * SR, 5]);
      assert.equal(a.L.length, Math.round(n / factor));
      assert.equal(a.R.length, a.L.length);
      assert.equal(b.L.length, a.L.length);
    });
  }
}

for (const keepPitch of MODES) {
  test(`silence and noise of the same length come out the same length (${keepPitch ? 'keep pitch' : 'tape'})`, () => {
    const n = 3 * SR + 17;
    const quiet = new Float32Array(n);
    const loud = noise(n, 11);
    const sizes = [SR, SR, 500];
    const conv1 = Stretch.create({ factor: 0.9, keepPitch, sampleRate: SR });
    const conv2 = Stretch.create({ factor: 0.9, keepPitch, sampleRate: SR });
    let at = 0;
    for (const size of sizes) {
      const g1 = conv1.push(quiet.subarray(at, at + size), quiet.subarray(at, at + size));
      const g2 = conv2.push(loud.subarray(at, at + size), loud.subarray(at, at + size));
      assert.equal(g1.L.length, g2.L.length, 'each piece comes out the same length');
      at += size;
    }
    const e1 = conv1.finish(), e2 = conv2.finish();
    assert.equal(e1.L.length, e2.L.length);
  });
}

for (const factor of [0.8, 1.2]) {
  test(`keep pitch keeps a 440 Hz tone at 440 Hz at speed ${factor}`, () => {
    const L = sine(440, 3);
    const out = convert(L, L, { factor, keepPitch: true }, [SR, SR]);
    const hz = crossingsPerSecond(out.L);
    assert.ok(Math.abs(hz - 440) / 440 < 0.02, 'heard ' + hz.toFixed(1) + ' Hz');
    const level = rms(out.L) / rms(L);
    assert.ok(Math.abs(level - 1) < 0.1, 'level changed to ' + level.toFixed(3));
  });
}

test('tape style moves the pitch with the speed', () => {
  const L = sine(440, 3);
  const out = convert(L, L, { factor: 0.8, keepPitch: false }, [SR, SR]);
  const hz = crossingsPerSecond(out.L);
  assert.ok(Math.abs(hz - 352) / 352 < 0.02, 'heard ' + hz.toFixed(1) + ' Hz');
});

for (const keepPitch of MODES) {
  test(`small pieces give the same sound as one big piece (${keepPitch ? 'keep pitch' : 'tape'})`, () => {
    const L = sine(330, 2, 0.9), R = sine(550, 2, 0.9);
    const one = convert(L, R, { factor: 0.9, keepPitch }, [L.length]);
    const size = Math.ceil(L.length / 100);
    const many = convert(L, R, { factor: 0.9, keepPitch }, Array.from({ length: 100 }, () => size));
    assert.equal(many.L.length, one.L.length);
    let worst = 0, loudest = 0;
    for (let i = 0; i < one.L.length; i++) {
      worst = Math.max(worst, Math.abs(one.L[i] - many.L[i]), Math.abs(one.R[i] - many.R[i]));
      loudest = Math.max(loudest, Math.abs(many.L[i]), Math.abs(many.R[i]));
    }
    assert.ok(worst < 1e-3, 'pieces differ by ' + worst);
    assert.ok(loudest <= 1.01, 'peaks at ' + loudest);
  });
}

for (const keepPitch of MODES) {
  test(`a left-only sound stays on the left (${keepPitch ? 'keep pitch' : 'tape'})`, () => {
    const L = noise(SR * 2, 5), R = new Float32Array(SR * 2);
    const out = convert(L, R, { factor: 0.9, keepPitch }, [SR]);
    let rightPeak = 0;
    for (let i = 0; i < out.R.length; i++) rightPeak = Math.max(rightPeak, Math.abs(out.R[i]));
    assert.ok(rightPeak < 1e-6, 'right channel reached ' + rightPeak);
    assert.ok(rms(out.L) > 0.1);
  });
}

test('10 seconds of stereo converts quickly', () => {
  const n = 10 * SR, L = noise(n, 13), R = noise(n, 17);
  const started = performance.now();
  convert(L, R, { factor: 0.9, keepPitch: true }, [2 * SR, 6 * SR]);
  const took = performance.now() - started;
  assert.ok(took < 2000, 'took ' + Math.round(took) + ' ms');
});
