import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const GF = loadModule('GroupFill');

const tens = (n, fadeIn) => Array.from({ length: n }, () => ({ len: 10, fadeIn }));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' is not ' + b);

describe('modeOf', () => {
  test('a missing group, a missing fill or an unknown fill counts as even', () => {
    assert.equal(GF.modeOf(null), 'even');
    assert.equal(GF.modeOf({ id: 'g1' }), 'even');
    assert.equal(GF.modeOf({ id: 'g1', fill: 'sideways' }), 'even');
  });
  test('packed and stretch come back as they are', () => {
    assert.equal(GF.modeOf({ fill: 'packed' }), 'packed');
    assert.equal(GF.modeOf({ fill: 'stretch' }), 'stretch');
  });
});

describe('packedLength', () => {
  test('three 10 s items with a 2 s fade-in overlap twice', () => {
    assert.equal(GF.packedLength(tens(3, 2)), 26);
  });
  test('one item is its own length, and no items is 0', () => {
    assert.equal(GF.packedLength([{ len: 7, fadeIn: 3 }]), 7);
    assert.equal(GF.packedLength([]), 0);
  });
  test('a fade longer than the item before it is capped', () => {
    assert.equal(GF.packedLength([{ len: 1, fadeIn: 0 }, { len: 10, fadeIn: 3 }]), 10.5);
  });
});

describe('packed', () => {
  test('each one starts as the one before fades out', () => {
    assert.deepEqual(GF.packed(tens(3, 2), 5), [{ start: 5 }, { start: 13 }, { start: 21 }]);
  });
  test('starts are rounded to 0.1 s', () => {
    const out = GF.packed([{ len: 3.33, fadeIn: 0 }, { len: 3.33, fadeIn: 0 }, { len: 3, fadeIn: 0 }], 0.04);
    assert.deepEqual(out, [{ start: 0 }, { start: 3.4 }, { start: 6.7 }]);
  });
});

describe('stretched', () => {
  test('an exact fit matches packed and keeps every length', () => {
    const items = tens(3, 2);
    const out = GF.stretched(items, { start: 5, end: 31 });
    assert.deepEqual(out.map((x) => x.start), GF.packed(items, 5).map((x) => x.start));
    assert.deepEqual(out.map((x) => x.dur), [10, 10, 10]);
  });
  test('6 s to spare across 3 items makes each 2 s longer and ends on the window end', () => {
    const out = GF.stretched(tens(3, 2), { start: 5, end: 37 });
    assert.deepEqual(out, [{ start: 5, dur: 12 }, { start: 15, dur: 12 }, { start: 25, dur: 12 }]);
    close(out[2].start + out[2].dur, 37);
  });
  test('a window shorter than the run gives null', () => {
    assert.equal(GF.stretched(tens(3, 2), { start: 5, end: 30 }), null);
  });
  test('rounding never pushes the last one past the window end', () => {
    const out = GF.stretched(tens(3, 0), { start: 0, end: 31.7 });
    const last = out[2];
    assert.ok(last.start + last.dur <= 31.7 + 1e-9, 'last ends at ' + (last.start + last.dur));
  });
  test('no items gives an empty list', () => {
    assert.deepEqual(GF.stretched([], { start: 0, end: 10 }), []);
  });
});

describe('minLength', () => {
  test('even needs the gaps between items', () => {
    assert.equal(GF.minLength(tens(3, 2), 'even', 2), 34);
    assert.equal(GF.minLength([{ len: 7, fadeIn: 0 }], 'even', 2), 7);
  });
  test('packed and stretch need the back-to-back run', () => {
    assert.equal(GF.minLength(tens(3, 2), 'packed', 2), 26);
    assert.equal(GF.minLength(tens(3, 2), 'stretch', 2), 26);
  });
});

describe('dragWindow', () => {
  const win = { start: 10, end: 40 };
  test('dragging the end later grows the window and leaves the start', () => {
    assert.deepEqual(GF.dragWindow(win, 'end', 55, 20), { start: 10, end: 55, clamped: false });
  });
  test('the end stops at the minimum length', () => {
    assert.deepEqual(GF.dragWindow(win, 'end', 15, 20), { start: 10, end: 30, clamped: true });
  });
  test('the start stops at 0:00', () => {
    assert.deepEqual(GF.dragWindow(win, 'start', -4, 20), { start: 0, end: 40, clamped: true });
  });
  test('the start stops where the window would get too short', () => {
    assert.deepEqual(GF.dragWindow(win, 'start', 35, 20), { start: 20, end: 40, clamped: true });
  });
  test('the window keeps its minimum length after rounding', () => {
    const w = GF.dragWindow({ start: 10.03, end: 40 }, 'end', 0, 20.04);
    assert.ok(w.end - w.start >= 20.04 - 1e-9);
  });
  test('the input window is not changed', () => {
    GF.dragWindow(win, 'start', 0, 5);
    assert.deepEqual(win, { start: 10, end: 40 });
  });
});

describe('unionSpan', () => {
  const span = { start: 10, len: 20 };
  test('no window gives the span back', () => {
    assert.equal(GF.unionSpan(span, null), span);
  });
  test('a window wider on both sides gives the window', () => {
    assert.deepEqual(GF.unionSpan(span, { start: 5, end: 40 }), { start: 5, len: 35 });
  });
  test('a partial overlap gives both together', () => {
    assert.deepEqual(GF.unionSpan(span, { start: 20, end: 45 }), { start: 10, len: 35 });
  });
});
