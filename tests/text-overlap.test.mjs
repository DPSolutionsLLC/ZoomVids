import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextOverlap = loadModule('TextOverlap');

describe('overlaps', () => {
  test('partial overlap', () => {
    assert.equal(TextOverlap.overlaps({ start: 0, end: 10 }, { start: 5, end: 15 }), true);
  });

  test('spans that only touch do not overlap', () => {
    assert.equal(TextOverlap.overlaps({ start: 0, end: 10 }, { start: 10, end: 20 }), false);
    assert.equal(TextOverlap.overlaps({ start: 10, end: 20 }, { start: 0, end: 10 }), false);
  });

  test('one span inside the other', () => {
    assert.equal(TextOverlap.overlaps({ start: 0, end: 100 }, { start: 40, end: 50 }), true);
  });
});

describe('others', () => {
  const target = { id: 'a', start: 70, end: 85 };

  test('keeps an item that overlaps and leaves out one that ended before', () => {
    const items = [target, { id: 'b', start: 80, end: 95 }, { id: 'c', start: 50, end: 65 }];
    assert.deepEqual(TextOverlap.others(target, items).map((x) => x.id), ['b']);
  });

  test('leaves out a hidden item that would otherwise overlap', () => {
    const items = [{ id: 'h', start: 75, end: 90, hidden: true }];
    assert.deepEqual(TextOverlap.others(target, items), []);
  });

  test('leaves out the target itself', () => {
    assert.deepEqual(TextOverlap.others(target, [{ id: 'a', start: 70, end: 85 }]), []);
  });

  test('includes an item shown for the whole video', () => {
    const items = [{ id: 'w', start: 0, end: 1200 }];
    assert.deepEqual(TextOverlap.others(target, items).map((x) => x.id), ['w']);
  });

  test('keeps the original order and does not change its input', () => {
    const items = [{ id: 'd', start: 84, end: 90 }, { id: 'b', start: 60, end: 71 }];
    const before = structuredClone(items);
    assert.deepEqual(TextOverlap.others(target, items).map((x) => x.id), ['d', 'b']);
    assert.deepEqual(items, before);
  });
});

describe('anyOverlap', () => {
  const spans = [{ start: 0, end: 10 }, { start: 30, end: 40 }];

  test('true when the item overlaps the second span', () => {
    assert.equal(TextOverlap.anyOverlap(spans, { start: 35, end: 50 }), true);
  });

  test('false when the item falls between the spans', () => {
    assert.equal(TextOverlap.anyOverlap(spans, { start: 12, end: 28 }), false);
  });
});
