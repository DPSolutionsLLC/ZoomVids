import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const SF = loadModule('ScriptureFill');

describe('gapAt', () => {
  const spans = [{ start: 10, dur: 10 }, { start: 40, dur: 5 }];
  test('a time between two texts gives the gap between them', () => {
    assert.deepEqual(SF.gapAt(spans, 30, 100), { start: 20, end: 40 });
  });
  test('a time inside a text gives no gap', () => {
    assert.equal(SF.gapAt(spans, 15, 100), null);
  });
  test('before the first text the gap starts at 0:00', () => {
    assert.deepEqual(SF.gapAt(spans, 5, 100), { start: 0, end: 10 });
  });
  test('after the last text the gap runs to the end', () => {
    assert.deepEqual(SF.gapAt(spans, 60, 100), { start: 45, end: 100 });
  });
  test('a gap shorter than 3 seconds is not a gap', () => {
    assert.equal(SF.gapAt([{ start: 0, dur: 10 }, { start: 12, dur: 5 }], 11, 100), null);
  });
});

describe('fromDrag', () => {
  test('orders the two ends', () => {
    assert.deepEqual(SF.fromDrag(50, 20, 100), { start: 20, end: 50 });
  });
  test('clamps to the start of the video', () => {
    assert.deepEqual(SF.fromDrag(-5, 10, 100), { start: 0, end: 10 });
  });
  test('clamps to the end of the video', () => {
    assert.deepEqual(SF.fromDrag(90, 130, 100), { start: 90, end: 100 });
  });
  test('a drag shorter than 3 seconds gives nothing', () => {
    assert.equal(SF.fromDrag(10, 11, 100), null);
  });
});

describe('spansInside', () => {
  const win = { start: 20, end: 40 };
  test('a text touching only the edge is not inside', () => {
    assert.deepEqual(SF.spansInside([{ start: 10, dur: 10 }, { start: 40, dur: 5 }], win), []);
  });
  test('a text overlapping by half a second is inside', () => {
    assert.deepEqual(SF.spansInside([{ start: 10, dur: 10.5 }], win), [0]);
  });
});

describe('fit check', () => {
  test('two 10 s passages fit in 22 s with the 2 s gap', () => {
    assert.equal(SF.used([10, 10]), 22);
    assert.equal(SF.fits([10, 10], 22), true);
  });
  test('they do not fit in 21.9 s', () => {
    assert.equal(SF.fits([10, 10], 21.9), false);
  });
  test('left is the time still free', () => {
    assert.equal(SF.left([10], 30), 20);
    assert.equal(SF.left([40], 30), 0);
  });
  test('canAdd counts the gap before the new passage', () => {
    assert.equal(SF.canAdd([10], 8, 20), true);
    assert.equal(SF.canAdd([10], 8.1, 20), false);
  });
});

describe('spaceEvenly', () => {
  test('first at the start, last at the end, equal gaps', () => {
    assert.deepEqual(SF.spaceEvenly([10, 10, 10], 0, 50), [0, 20, 40]);
  });
  test('works from a start other than 0:00', () => {
    assert.deepEqual(SF.spaceEvenly([10, 20], 100, 140), [100, 120]);
  });
  test('one passage is centred', () => {
    assert.deepEqual(SF.spaceEvenly([10], 0, 30), [10]);
  });
  test('nothing to place gives no starts', () => {
    assert.deepEqual(SF.spaceEvenly([], 0, 30), []);
  });
  test('too long for the stretch gives null', () => {
    assert.equal(SF.spaceEvenly([20, 20], 0, 41), null);
  });
  test('rounding never pushes the last passage past the end', () => {
    const lengths = [3.33, 3.33, 3.33];
    const starts = SF.spaceEvenly(lengths, 0, 20);
    assert.equal(starts[2], 16.6);
    starts.forEach((s, i) => assert.ok(s + lengths[i] <= 20 + 1e-9));
  });
});

describe('randomFill', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' }, d = { id: 'd' };
  const LEN = { a: 10, b: 30, c: 8, d: null };
  const lengthOf = (it) => LEN[it.id];
  const never = () => false;
  test('skips one that does not fit and takes a later shorter one', () => {
    assert.deepEqual(SF.randomFill([a, b, c], lengthOf, [], 20, never), [a, c]);
  });
  test('skips a blocked item', () => {
    assert.deepEqual(SF.randomFill([a, c], lengthOf, [], 20, (it) => it === a), [c]);
  });
  test('keeps what was already ticked first', () => {
    assert.deepEqual(SF.randomFill([a, c], lengthOf, [c], 20, never), [c, a]);
  });
  test('skips an item whose length is not known yet', () => {
    assert.deepEqual(SF.randomFill([d, a], lengthOf, [], 20, never), [a]);
  });
  test('blocked sees what has been chosen so far', () => {
    const seen = [];
    SF.randomFill([a, c], lengthOf, [], 20, (it, sofar) => { seen.push(sofar.length); return false; });
    assert.deepEqual(seen, [0, 1]);
  });
});
