import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TrackAlign = loadModule('TrackAlign');
const SR = 48000;

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clickTimes(seed, seconds) {
  const next = random(seed), times = [];
  for (let t = 0.3 + next() * 0.3; t < seconds - 0.1; t += 0.2 + next() * 0.5) times.push(t);
  return times;
}

function clickTrack(times, seconds, seed) {
  const next = random(seed), n = Math.round(seconds * SR), out = new Float32Array(n), burst = Math.round(0.03 * SR);
  for (const t of times) {
    const at = Math.round(t * SR);
    for (let k = 0; k < burst && at + k < n; k++) out[at + k] += (next() * 2 - 1) * 0.8 * Math.exp(-k / (0.006 * SR));
  }
  return out;
}

function withMelody(signal, seed) {
  const next = random(seed), out = Float32Array.from(signal), step = Math.round(0.4 * SR);
  let freq = 440;
  for (let i = 0; i < out.length; i++) {
    if (i % step === 0) freq = 220 + next() * 440;
    out[i] += 0.2 * Math.sin(2 * Math.PI * freq * i / SR);
  }
  return out;
}

function shifted(signal, seconds, extraSeconds, noiseSeed) {
  const next = random(noiseSeed), shift = Math.round(seconds * SR), n = signal.length + Math.round(extraSeconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const src = i - shift;
    out[i] = (src >= 0 && src < signal.length ? signal[src] : 0) + (next() * 2 - 1) * 0.002;
  }
  return out;
}

const stereo = (ch) => ({ ch0: ch, ch1: ch });
const times = clickTimes(7, 20);
const clicks = clickTrack(times, 20, 11);
const main = stereo(withMelody(clicks, 3));

describe('align', () => {
  const pair = stereo(shifted(clicks, 1.234, 1.234, 5));
  const found = TrackAlign.align(main, pair, SR);

  test('finds a positive shift within 20 ms', () => {
    assert.equal(found.ok, true);
    assert.ok(Math.abs(found.offset - 1.234) < 0.02, 'offset ' + found.offset);
  });

  test('the offset means pair time = main time + offset', () => {
    for (const t of [times[3], times[10], times[20]]) {
      const at = Math.round((t + found.offset) * SR);
      let during = 0, before = 0;
      for (let k = 0; k < 0.01 * SR; k++) during = Math.max(during, Math.abs(pair.ch0[at + k]));
      for (let k = Math.round(0.06 * SR); k > Math.round(0.03 * SR); k--) before = Math.max(before, Math.abs(pair.ch0[at - k]));
      assert.ok(during > 0.1, 'a click is heard at ' + t);
      assert.ok(before < 0.05, 'quiet just before ' + t);
    }
  });

  test('finds a negative shift too', () => {
    const early = stereo(shifted(clicks, -0.5, 0, 9));
    const result = TrackAlign.align(main, early, SR);
    assert.equal(result.ok, true);
    assert.ok(Math.abs(result.offset + 0.5) < 0.02, 'offset ' + result.offset);
  });

  test('unrelated tracks give no match', () => {
    const other = stereo(clickTrack(clickTimes(99, 20), 20, 13));
    const result = TrackAlign.align(main, other, SR);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'no-match');
  });

  test('a track shorter than 3 s is refused', () => {
    const short = stereo(new Float32Array(2 * SR));
    assert.deepEqual(TrackAlign.align(main, short, SR), { ok: false, reason: 'too-short' });
  });
});

test('fft followed by the inverse gives back the input', () => {
  const next = random(1), n = 1024;
  const re = new Float64Array(n).map(() => next() - 0.5), im = new Float64Array(n);
  const original = Float64Array.from(re);
  TrackAlign.fft(re, im, false);
  TrackAlign.fft(re, im, true);
  for (let i = 0; i < n; i++) {
    assert.ok(Math.abs(re[i] - original[i]) < 1e-9);
    assert.ok(Math.abs(im[i]) < 1e-9);
  }
});

test('correlate finds the exact lag between two impulses', () => {
  const a = new Float32Array(200), b = new Float32Array(200);
  a[50] = 1; b[73] = 1;
  const result = TrackAlign.correlate(a, b, 100);
  assert.ok(Math.abs(result.lag - 23) < 1e-9);
  assert.ok(Math.abs(result.score - 1) < 1e-9);
});
