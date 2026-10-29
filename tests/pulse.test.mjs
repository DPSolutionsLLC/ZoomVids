import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const Pulse = loadModule('Pulse');

const smoothstep = (a) => a * a * (3 - 2 * a);
const on = { on: true, size: 115, ease: 0.1, from: 'base' };

function syllable(changes = {}) {
  return { kind: 'syl', text: 'glo', t: 1, d: 0.5, wordStart: 1, wordEnd: 1.5, ...changes };
}

test('clean gives the defaults for missing or invalid settings', () => {
  for (const raw of [null, undefined, 'x', [], 5]) {
    assert.deepEqual(Pulse.clean(raw), { on: false, size: 115, ease: 0.1, from: 'base' });
  }
});

test('clean returns a new object each time', () => {
  const a = Pulse.clean(null);
  a.size = 140;
  assert.equal(Pulse.clean(null).size, 115);
  assert.equal(Pulse.DEFAULTS.size, 115);
});

test('clean keeps the size between 105 and 150 and whole', () => {
  assert.equal(Pulse.clean({ size: 300 }).size, 150);
  assert.equal(Pulse.clean({ size: 50 }).size, 105);
  assert.equal(Pulse.clean({ size: 115.4 }).size, 115);
  assert.equal(Pulse.clean({ size: 'big' }).size, 115);
});

test('clean keeps the smoothness between 0.02 and 0.3, to two places', () => {
  assert.equal(Pulse.clean({ ease: 0 }).ease, 0.02);
  assert.equal(Pulse.clean({ ease: 1 }).ease, 0.3);
  assert.equal(Pulse.clean({ ease: 0.123 }).ease, 0.12);
  assert.equal(Pulse.clean({ ease: NaN }).ease, 0.1);
});

test('clean only turns on for true and only grows from the middle for center', () => {
  assert.equal(Pulse.clean({ on: 'yes' }).on, false);
  assert.equal(Pulse.clean({ on: true }).on, true);
  assert.equal(Pulse.clean({ from: 'center' }).from, 'center');
  assert.equal(Pulse.clean({ from: 'top' }).from, 'base');
});

test('clean does not change its input', () => {
  const raw = { on: true, size: 300, ease: 0, from: 'top' };
  Pulse.clean(raw);
  assert.deepEqual(raw, { on: true, size: 300, ease: 0, from: 'top' });
});

test('amount grows, holds for the whole syllable, then shrinks', () => {
  assert.equal(Pulse.amount(1, 0.5, 0.99, 0.1), 0);
  assert.ok(Math.abs(Pulse.amount(1, 0.5, 1.05, 0.1) - 0.5) < 1e-9);
  assert.equal(Pulse.amount(1, 0.5, 1.2, 0.1), 1);
  assert.equal(Pulse.amount(1, 0.5, 1.499, 0.1), 1);
  const shrinking = Pulse.amount(1, 0.5, 1.55, 0.1);
  assert.ok(shrinking > 0 && shrinking < 1);
  assert.equal(Pulse.amount(1, 0.5, 1.61, 0.1), 0);
});

test('a syllable shorter than the smoothness never reaches full size', () => {
  assert.ok(Math.abs(Pulse.peak(0.04, 0.1) - smoothstep(0.4)) < 1e-12);
  const atEnd = Pulse.amount(1, 0.04, 1.04, 0.1);
  assert.ok(Math.abs(atEnd - smoothstep(0.4)) < 1e-9);
  const before = Pulse.amount(1, 0.04, 1.04 - 1e-9, 0.1);
  const after = Pulse.amount(1, 0.04, 1.04 + 1e-9, 0.1);
  assert.ok(Math.abs(before - after) < 1e-6);
});

test('back-to-back syllables can shrink and grow at the same time', () => {
  const first = Pulse.amount(1, 0.3, 1.33, 0.1);
  const second = Pulse.amount(1.3, 0.3, 1.33, 0.1);
  assert.ok(first > 0 && first < 1);
  assert.ok(second > 0 && second < 1);
});

test('amount is 0 for a missing or invalid time', () => {
  assert.equal(Pulse.amount(1, 0, 1.1, 0.1), 0);
  assert.equal(Pulse.amount(1, -0.2, 1.1, 0.1), 0);
  assert.equal(Pulse.amount(1, NaN, 1.1, 0.1), 0);
  assert.equal(Pulse.amount(null, 0.5, 1.1, 0.1), 0);
});

test('amount does not divide by zero when the smoothness is 0', () => {
  const value = Pulse.amount(1, 0.5, 1.2, 0);
  assert.ok(Number.isFinite(value));
  assert.equal(value, 1);
});

test('scale is 1 when the pulse is off', () => {
  assert.equal(Pulse.scale(syllable(), 1.2, { ...on, on: false }), 1);
  assert.equal(Pulse.scale(syllable(), 1.2, null), 1);
});

test('scale is the pulse size while a timed syllable is held', () => {
  assert.ok(Math.abs(Pulse.scale(syllable(), 1.2, on) - 1.15) < 1e-9);
  assert.ok(Math.abs(Pulse.scale(syllable(), 1.2, { ...on, size: 105 }) - 1.05) < 1e-9);
});

test('a part label never pulses, even with a time', () => {
  assert.equal(Pulse.scale(syllable({ kind: 'label' }), 1.2, on), 1);
});

test('an untimed syllable inside a timed word never pulses', () => {
  const untimed = syllable({ t: null, d: null, wordStart: 1, wordEnd: 1.5 });
  assert.equal(Pulse.scale(syllable(), 1.2, on) > 1, true);
  assert.equal(Pulse.scale(untimed, 1.2, on), 1);
});

test('scale uses the syllable time, not the word time', () => {
  const narrow = syllable({ wordStart: 1, wordEnd: 1.5 });
  const wide = syllable({ wordStart: 0, wordEnd: 3 });
  for (const at of [0.5, 1.05, 1.3, 1.55, 2]) {
    assert.equal(Pulse.scale(narrow, at, on), Pulse.scale(wide, at, on));
  }
  assert.equal(Pulse.scale(wide, 2, on), 1);
});

test('place grows from the middle of the piece and keeps the baseline', () => {
  assert.deepEqual(Pulse.place(50, 100, 100, 1, -20, 'base'), { x: 50, y: 100 });
  const grown = Pulse.place(50, 100, 100, 1.2, -20, 'base');
  assert.ok(Math.abs(grown.x - 40) < 1e-9);
  assert.ok(Math.abs(grown.y - 96) < 1e-9);
  assert.equal(Pulse.place(50, 100, 100, 1.2, -20, 'center').y, 100);
});

test('shortest picks the quickest syllable, and the earlier one on a tie', () => {
  const quick = { d: 0.1, at: 9 };
  const tieEarlier = { d: 0.1, at: 4 };
  assert.equal(Pulse.shortest([{ d: 0.5, at: 1 }, quick, { d: 0.3, at: 2 }]), quick);
  assert.equal(Pulse.shortest([quick, tieEarlier]), tieEarlier);
});

test('shortest ignores syllables with no length and returns null when none qualify', () => {
  const real = { d: 0.4, at: 3 };
  assert.equal(Pulse.shortest([{ d: 0, at: 1 }, { d: -1, at: 1 }, { d: NaN, at: 1 }, real]), real);
  assert.equal(Pulse.shortest([]), null);
  assert.equal(Pulse.shortest([{ d: 0, at: 1 }]), null);
});

test('previewWindow plays 1.5 s before and 1 s after, inside the mix', () => {
  const mid = Pulse.previewWindow(5, 0.2, 100);
  assert.ok(Math.abs(mid.from - 3.5) < 1e-9);
  assert.ok(Math.abs(mid.to - 6.2) < 1e-9);
  assert.equal(Pulse.previewWindow(1, 0.2, 100).from, 0);
  assert.equal(Pulse.previewWindow(99.5, 0.2, 100).to, 100);
});
