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

test('readPhone keeps and rounds a valid width', () => {
  assert.equal(FloatSizes.readPhone(600), 600);
  assert.equal(FloatSizes.readPhone(512.6), 513);
});

test('readPhone gives null for missing, non-number or out-of-range widths', () => {
  for (const raw of [null, undefined, '500', NaN, Infinity, 239, 1281]) {
    assert.equal(FloatSizes.readPhone(raw), null);
  }
});

test('phoneWidth uses the saved width, or 440 when nothing is saved', () => {
  assert.equal(FloatSizes.phoneWidth(null), 440);
  assert.equal(FloatSizes.phoneWidth(500), 500);
});


test('order puts Phone first and empty slots after it when nothing is saved', () => {
  assert.deepEqual(FloatSizes.order(null, [null, null]), ['phone', 0, 1]);
});

test('order sorts by width with an unsaved Phone at 440', () => {
  assert.deepEqual(FloatSizes.order(null, [600, 300]), [1, 'phone', 0]);
});

test('order sorts when every size is saved', () => {
  assert.deepEqual(FloatSizes.order(700, [500, 900]), [0, 'phone', 1]);
});

test('order puts a saved Phone first when it is the smallest', () => {
  assert.deepEqual(FloatSizes.order(300, [500, 600]), ['phone', 0, 1]);
});

test('order puts an empty slot after the saved ones', () => {
  assert.deepEqual(FloatSizes.order(null, [null, 1000]), ['phone', 1, 0]);
});

test('order puts empty slots last even when Phone is large', () => {
  assert.deepEqual(FloatSizes.order(1200, [null, null]), ['phone', 0, 1]);
  assert.deepEqual(FloatSizes.order(1200, [null, 300]), [1, 'phone', 0]);
});

test('order keeps Phone, 1, 2 for equal widths', () => {
  assert.deepEqual(FloatSizes.order(500, [500, 500]), ['phone', 0, 1]);
  assert.deepEqual(FloatSizes.order(600, [500, 500]), [0, 1, 'phone']);
});

test('order treats bad stored values as unsaved', () => {
  assert.deepEqual(FloatSizes.order('500', [NaN, 300]), [1, 'phone', 0]);
  assert.deepEqual(FloatSizes.order(null, 'x'), ['phone', 0, 1]);
});

test('order does not change its input', () => {
  const slots = [600, 300];
  const copy = structuredClone(slots);
  FloatSizes.order(null, slots);
  assert.deepEqual(slots, copy);
});
