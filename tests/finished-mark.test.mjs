import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const FinishedMark = loadModule('FinishedMark');

test('clean keeps only true', () => {
  assert.equal(FinishedMark.clean(true), true);
  for (const value of ['true', 1, {}, null, undefined, false]) assert.equal(FinishedMark.clean(value), false);
});

test('label follows the mark', () => {
  assert.equal(FinishedMark.label(false), 'Mark finished');
  assert.equal(FinishedMark.label(true), '✓ Finished');
});

test('title uses the word it is given', () => {
  assert.equal(FinishedMark.title(false, 'playlist'), 'Mark this playlist finished');
  assert.equal(FinishedMark.title(false, 'project'), 'Mark this project finished');
  assert.equal(FinishedMark.title(true, 'playlist'), 'This playlist is finished. Press to put it back in progress.');
  assert.equal(FinishedMark.title(true, 'project'), 'This project is finished. Press to put it back in progress.');
});

test('groups splits finished names from the rest, in the existing sort order', () => {
  const saved = { b: {}, A: { finished: true }, a: {}, Z: { finished: true }, c: { items: [] } };
  const result = FinishedMark.groups(saved);
  assert.deepEqual(result.open, ['a', 'b', 'c']);
  assert.deepEqual(result.done, ['A', 'Z']);
  assert.deepEqual([...result.open, ...result.done].sort(), Object.keys(saved).sort());
});

test('groups of an empty map is two empty lists', () => {
  assert.deepEqual(FinishedMark.groups({}), { open: [], done: [] });
});

test('groups counts a non-true finished value as in progress', () => {
  assert.deepEqual(FinishedMark.groups({ x: { finished: 'yes' } }), { open: ['x'], done: [] });
});

test('groups counts a null entry as in progress without throwing', () => {
  assert.deepEqual(FinishedMark.groups({ x: null, y: { finished: true } }), { open: ['x'], done: ['y'] });
});

test('groups does not change its input', () => {
  const saved = { b: { finished: true }, a: { items: [1] } };
  const before = structuredClone(saved);
  FinishedMark.groups(saved);
  assert.deepEqual(saved, before);
});

const asking = { finished: true, answered: false, base: '{"a":1}', now: '{"a":2}' };

test('shouldAsk is true for the first change to a finished project', () => {
  assert.equal(FinishedMark.shouldAsk(asking), true);
});

test('shouldAsk is false once answered', () => {
  assert.equal(FinishedMark.shouldAsk({ ...asking, answered: true }), false);
});

test('shouldAsk is false when the project is not finished', () => {
  assert.equal(FinishedMark.shouldAsk({ ...asking, finished: undefined }), false);
});

test('shouldAsk is false when the project is back where it was opened', () => {
  assert.equal(FinishedMark.shouldAsk({ ...asking, now: asking.base }), false);
});

test('noteText uses the word it is given', () => {
  assert.equal(FinishedMark.noteText('playlist'), 'This playlist is marked finished.');
  assert.equal(FinishedMark.noteText('project'), 'This project is marked finished.');
});
