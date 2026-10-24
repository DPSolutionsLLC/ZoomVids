import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextBatch = loadModule('TextBatch');

test('shiftStarts moves every start by the same amount, keeping the gaps', () => {
  // 10 + 10 = 20, 12.5 + 10 = 22.5, 20 + 10 = 30
  assert.deepEqual(TextBatch.shiftStarts({ a: 10, b: 12.5, c: 20 }, 10), { delta: 10, starts: { a: 20, b: 22.5, c: 30 } });
});

test('shiftStarts stops the earliest start at 0:00 and keeps the gaps', () => {
  // asked for -5, but the earliest is at 3, so the move is -3: 3 - 3 = 0, 8 - 3 = 5
  assert.deepEqual(TextBatch.shiftStarts({ a: 3, b: 8 }, -5), { delta: -3, starts: { a: 0, b: 5 } });
});

test('shiftStarts rounds the move to a tenth of a second', () => {
  // 0.26 rounds to 0.3, and 10 + 0.3 = 10.3
  assert.deepEqual(TextBatch.shiftStarts({ a: 10 }, 0.26), { delta: 0.3, starts: { a: 10.3 } });
});

test('shiftStarts with nothing to move returns no move and leaves its input alone', () => {
  const bases = {};
  assert.deepEqual(TextBatch.shiftStarts(bases, 4), { delta: 0, starts: {} });
  assert.deepEqual(bases, {});
  const some = { a: 2 };
  TextBatch.shiftStarts(some, 1);
  assert.deepEqual(some, { a: 2 });
});

test('stayedNote is empty when everything moved', () => {
  assert.equal(TextBatch.stayedNote(3, []), '');
});

test('stayedNote counts what stayed, by kind, in a fixed order', () => {
  assert.equal(TextBatch.stayedNote(3, ['tied', 'locked']), 'Moved 3. 2 stayed where they were: 1 locked, 1 tied to a recording.');
});

test('stayedNote uses the singular for one item', () => {
  assert.equal(TextBatch.stayedNote(2, ['follows']), 'Moved 2. 1 stayed where it was: 1 follows the text before it.');
});

test('stayedNote says nothing moved when every item stayed', () => {
  assert.equal(TextBatch.stayedNote(0, ['locked', 'locked', 'start']), 'Nothing moved: 2 locked, 1 starts at 0:00.');
  assert.equal(TextBatch.stayedNote(0, ['whole']), 'Nothing moved: 1 shows for the whole video.');
});

test('hideAction offers show only when every listed text is hidden', () => {
  const texts = [{ id: 'a1', hidden: true }, { id: 'b2', hidden: true }, { id: 'c3' }];
  assert.equal(TextBatch.hideAction(texts, ['a1', 'b2']), 'show');
  assert.equal(TextBatch.hideAction(texts, ['a1', 'c3']), 'hide');
  assert.equal(TextBatch.hideAction(texts, []), 'hide');
  assert.equal(TextBatch.hideAction(texts, ['zz9']), 'hide');
});

test('kindsText counts each kind in a fixed order', () => {
  assert.equal(TextBatch.kindsText(['locked', 'tied', 'locked']), '2 locked, 1 tied to a recording');
  assert.equal(TextBatch.kindsText([]), '');
});
