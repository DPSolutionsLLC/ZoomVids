import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextTiming = loadModule('TextTiming');

function words(count) {
  return Array.from({ length: count }, () => 'word').join(' ');
}

test('wordCount counts runs of non-space characters', () => {
  assert.equal(TextTiming.wordCount(''), 0);
  assert.equal(TextTiming.wordCount('  a  b\nc '), 3);
  assert.equal(TextTiming.wordCount(null), 0);
});

test('readSeconds never goes below the 4 second minimum', () => {
  assert.equal(TextTiming.readSeconds('one two three', 150, 0, 0), 4);
});

test('readSeconds adds both fades to the reading time', () => {
  assert.equal(TextTiming.readSeconds(words(150), 150, 2, 2), 64);
});

test('readSeconds scales with word count', () => {
  assert.equal(TextTiming.readSeconds(words(300), 150, 0, 0), 120);
});

test('readSeconds clamps a fast speed to 250 words a minute', () => {
  assert.equal(TextTiming.readSeconds(words(250), 1000, 0, 0), 60);
});

test('readSeconds uses 150 words a minute when the speed is not a number', () => {
  assert.equal(TextTiming.readSeconds(words(300), NaN, 0, 0), 120);
});

test('readSeconds clamps a slow speed to 80 words a minute', () => {
  assert.equal(TextTiming.readSeconds(words(80), 10, 0, 0), 60);
});

test('cutForTap shortens the previous item so it fades out from the tap', () => {
  assert.equal(TextTiming.cutForTap({ start: 10, dur: 20, fadeOut: 2 }, 15), 7);
  assert.equal(TextTiming.cutForTap({ start: 10, dur: 20, fadeOut: 2 }, 10.1), 2.1);
});

test('cutForTap leaves an item that has already ended alone', () => {
  assert.equal(TextTiming.cutForTap({ start: 10, dur: 20, fadeOut: 2 }, 31), null);
});

test('cutForTap never makes an item shorter than half a second', () => {
  assert.equal(TextTiming.cutForTap({ start: 10, dur: 20, fadeOut: 0 }, 10.2), 0.5);
});
