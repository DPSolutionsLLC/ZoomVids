import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TimelineSpan = loadModule('TimelineSpan');

function oldSpan(target, total, pictures, anims) {
  let picEnd = 0;
  pictures.forEach((it) => { picEnd = Math.max(picEnd, it.start + it.dur); });
  anims.forEach((it) => { picEnd = Math.max(picEnd, it.start + it.dur); });
  return Math.max(target, total, picEnd, 60) * 1.04;
}

test('span with no ends matches the old formula', () => {
  assert.equal(TimelineSpan.span({ target: 240, total: 116, ends: [] }), 240 * 1.04);
  assert.equal(TimelineSpan.span({ target: 240, total: 116, ends: [] }), oldSpan(240, 116, [], []));
});

test('span grows to fit a slide past the target', () => {
  assert.equal(TimelineSpan.span({ target: 240, total: 116, ends: [120, 312.8, 498] }), 498 * 1.04);
});

test('span ignores a text that ends before the target', () => {
  assert.equal(TimelineSpan.span({ target: 240, total: 116, ends: [200] }), 240 * 1.04);
});

test('span is never shorter than 60 seconds', () => {
  assert.equal(TimelineSpan.span({ target: 0, total: 10, ends: [] }), 60 * 1.04);
});

test('span ignores ends that are not finite numbers', () => {
  assert.equal(TimelineSpan.span({ target: 240, total: 116, ends: [NaN, Infinity, undefined, null, 300] }), 300 * 1.04);
  assert.equal(TimelineSpan.span({ target: 240, total: 116, ends: [NaN, -Infinity, '900'] }), 240 * 1.04);
});

test('span treats a missing ends list like an empty one', () => {
  assert.equal(TimelineSpan.span({ target: 240, total: 116 }), 240 * 1.04);
});

test('span counts pictures and animations the same as before', () => {
  const pictures = [{ start: 10, dur: 20 }, { start: 250, dur: 30 }];
  const anims = [{ start: 260, dur: 40 }];
  const ends = pictures.concat(anims).map((it) => it.start + it.dur);
  assert.equal(TimelineSpan.span({ target: 240, total: 116, ends }), oldSpan(240, 116, pictures, anims));
});

test('hold keeps the current width while dragging', () => {
  assert.equal(TimelineSpan.hold(250, 400, true), 250);
});

test('hold uses the new width when not dragging', () => {
  assert.equal(TimelineSpan.hold(250, 400, false), 400);
});

test('hold uses the new width when the current one is not usable', () => {
  assert.equal(TimelineSpan.hold(0, 400, true), 400);
  assert.equal(TimelineSpan.hold(NaN, 400, true), 400);
  assert.equal(TimelineSpan.hold(undefined, 400, true), 400);
});
