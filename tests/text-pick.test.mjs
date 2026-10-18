import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextPick = loadModule('TextPick');

const texts = [{ id: 'a1b2c' }, { id: 'd3e4f' }, { id: 'g5h6i' }];

test('toggle adds a missing id and removes a present one without changing the input', () => {
  const start = { a1b2c: true };
  assert.deepEqual(TextPick.toggle(start, 'd3e4f'), { a1b2c: true, d3e4f: true });
  assert.deepEqual(TextPick.toggle(start, 'a1b2c'), {});
  assert.deepEqual(start, { a1b2c: true });
});

test('set to false on an absent id returns an equal map with no false entries', () => {
  const start = { a1b2c: true };
  const out = TextPick.set(start, 'd3e4f', false);
  assert.deepEqual(out, { a1b2c: true });
  assert.equal(Object.keys(out).length, 1);
  assert.deepEqual(TextPick.set(start, 'a1b2c', false), {});
  assert.deepEqual(TextPick.set(start, 'd3e4f', true), { a1b2c: true, d3e4f: true });
});

test('has is false for a missing map or id', () => {
  assert.equal(TextPick.has(null, 'a1b2c'), false);
  assert.equal(TextPick.has({}, 'a1b2c'), false);
  assert.equal(TextPick.has({ a1b2c: true }, 'a1b2c'), true);
});

test('all checks every text', () => {
  assert.deepEqual(TextPick.all(texts), { a1b2c: true, d3e4f: true, g5h6i: true });
});

test('count and ids ignore checked ids no longer in the list, and ids follow list order', () => {
  const map = { g5h6i: true, i9zz1: true, a1b2c: true };
  assert.equal(TextPick.count(map, texts), 2);
  assert.deepEqual(TextPick.ids(map, texts), ['a1b2c', 'g5h6i']);
});

test('allChecked is false for an empty list or one unchecked item, true when all are checked', () => {
  assert.equal(TextPick.allChecked({}, []), false);
  assert.equal(TextPick.allChecked({ a1b2c: true, d3e4f: true }, texts), false);
  assert.equal(TextPick.allChecked({ a1b2c: true, d3e4f: true, g5h6i: true }, texts), true);
});

test('prune keeps only ids present in the list', () => {
  assert.deepEqual(TextPick.prune({ a1b2c: true, i9zz1: true }, texts), { a1b2c: true });
});

test('without drops exactly the listed ids, keeps order and keeps locked items', () => {
  const list = [{ id: 'a1b2c' }, { id: 'd3e4f', locked: true }, { id: 'g5h6i' }, { id: 'j7k8l' }];
  assert.deepEqual(TextPick.without(list, ['a1b2c', 'g5h6i']), [{ id: 'd3e4f', locked: true }, { id: 'j7k8l' }]);
  assert.equal(list.length, 4);
  assert.deepEqual(TextPick.without(list, ['i9zz1']), list);
});

test('rowClick checks with a modifier or while anything is checked, otherwise opens', () => {
  assert.equal(TextPick.rowClick(true, false), 'check');
  assert.equal(TextPick.rowClick(false, true), 'check');
  assert.equal(TextPick.rowClick(true, true), 'check');
  assert.equal(TextPick.rowClick(false, false), 'open');
});

test('removeQuestion names one item or the count', () => {
  assert.equal(TextPick.removeQuestion(1), 'Remove this item?');
  assert.equal(TextPick.removeQuestion(15), 'Remove 15 items?');
});
