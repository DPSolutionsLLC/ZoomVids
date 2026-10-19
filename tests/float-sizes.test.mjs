import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const FloatSizes = loadModule('FloatSizes');

test('PHONE_WIDTH is 440 and there are 2 slots', () => {
  assert.equal(FloatSizes.PHONE_WIDTH, 440);
  assert.equal(FloatSizes.SLOTS, 2);
});

test('readSlots gives two empty slots for missing or non-array values', () => {
  for (const raw of [null, undefined, {}, 'x']) {
    assert.deepEqual(FloatSizes.readSlots(raw), [null, null]);
  }
});

test('readSlots keeps valid widths', () => {
  assert.deepEqual(FloatSizes.readSlots([500, 600]), [500, 600]);
});

test('readSlots rounds widths', () => {
  assert.deepEqual(FloatSizes.readSlots([500.4, null]), [500, null]);
});

test('readSlots drops non-finite numbers', () => {
  assert.deepEqual(FloatSizes.readSlots([NaN, Infinity]), [null, null]);
});

test('readSlots drops finite widths outside the allowed range', () => {
  assert.deepEqual(FloatSizes.readSlots([239, 1281]), [null, null]);
});

test('readSlots does not coerce strings', () => {
  assert.deepEqual(FloatSizes.readSlots(['500', 600]), [null, 600]);
});

test('readSlots trims a long array and pads a short one', () => {
  assert.deepEqual(FloatSizes.readSlots([500, 600, 700]), [500, 600]);
  assert.deepEqual(FloatSizes.readSlots([500]), [500, null]);
});

test('saveSlot saves into each slot and rounds the width', () => {
  assert.deepEqual(FloatSizes.saveSlot([null, null], 0, 512.6), [513, null]);
  assert.deepEqual(FloatSizes.saveSlot([500, null], 1, 700.2), [500, 700]);
});

test('saveSlot does not change its input', () => {
  const slots = [500, null];
  const copy = structuredClone(slots);
  FloatSizes.saveSlot(slots, 1, 700);
  assert.deepEqual(slots, copy);
});

test('saveSlot ignores an out-of-range index', () => {
  assert.deepEqual(FloatSizes.saveSlot([500, 600], -1, 700), [500, 600]);
  assert.deepEqual(FloatSizes.saveSlot([500, 600], 2, 700), [500, 600]);
});

test('saveSlot ignores an invalid width', () => {
  assert.deepEqual(FloatSizes.saveSlot([500, 600], 0, 100), [500, 600]);
  assert.deepEqual(FloatSizes.saveSlot([500, 600], 0, NaN), [500, 600]);
});

test('saveSlot works when the slots are null', () => {
  assert.deepEqual(FloatSizes.saveSlot(null, 0, 500), [500, null]);
});

test('matches allows 2 px either way', () => {
  assert.equal(FloatSizes.matches(440, 440), true);
  assert.equal(FloatSizes.matches(440, 442), true);
  assert.equal(FloatSizes.matches(440, 438), true);
  assert.equal(FloatSizes.matches(440, 443), false);
});

test('matches is false for an empty slot', () => {
  assert.equal(FloatSizes.matches(null, 440), false);
});
