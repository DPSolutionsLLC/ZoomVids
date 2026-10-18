import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextGroup = loadModule('TextGroup');

test('nextName picks the smallest unused "Group N"', () => {
  assert.equal(TextGroup.nextName([]), 'Group 1');
  assert.equal(TextGroup.nextName([{ id: 'g1', name: 'Group 1' }, { id: 'g3', name: 'Group 3' }]), 'Group 2');
});

test('copyName counts up a trailing number to the next unused one', () => {
  assert.equal(TextGroup.copyName('Easter, take 2', [{ name: 'Easter, take 2' }]), 'Easter, take 3');
  assert.equal(TextGroup.copyName('Easter, take 2', [{ name: 'Easter, take 2' }, { name: 'Easter, take 3' }]), 'Easter, take 4');
});

test('copyName adds "copy" when the name has no number', () => {
  assert.equal(TextGroup.copyName('Easter', [{ name: 'Easter' }]), 'Easter copy');
  assert.equal(TextGroup.copyName('Easter', [{ name: 'Easter' }, { name: 'Easter copy' }]), 'Easter copy 2');
});

test('cleanName tidies spaces and never returns an empty name', () => {
  assert.equal(TextGroup.cleanName('  Easter   take 2 ', 'Group 1'), 'Easter take 2');
  assert.equal(TextGroup.cleanName('   ', 'Group 1'), 'Group 1');
  assert.equal(TextGroup.cleanName(null, 'G'), 'G');
  assert.equal(TextGroup.cleanName('x'.repeat(70), 'G').length, 60);
});

test('liveGroups drops empty groups, keeps the order and leaves its input alone', () => {
  const groups = [{ id: 'gA', name: 'A' }, { id: 'gB', name: 'B' }, { id: 'gC', name: 'C' }];
  const texts = [{ id: 't1', group: 'gC' }, { id: 't2', group: 'gA' }];
  assert.deepEqual(TextGroup.liveGroups(groups, texts).map((g) => g.id), ['gA', 'gC']);
  assert.equal(groups.length, 3);
});

test('memberIds follows the order of the texts', () => {
  const texts = [{ id: 't1', group: 'gX' }, { id: 't2' }, { id: 't3', group: 'gX' }];
  assert.deepEqual(TextGroup.memberIds(texts, 'gX'), ['t1', 't3']);
  assert.equal(TextGroup.find([{ id: 'gX', name: 'X' }], 'gY'), null);
});

test('neighbours with one shared key is plain previous and next by position', () => {
  const order = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const near = TextGroup.neighbours(order, () => '');
  assert.deepEqual(near.prev, { a: null, b: 'a', c: 'b' });
  assert.deepEqual(near.next, { a: 'b', b: 'c', c: null });
});

test('neighbours skips items with a different key', () => {
  const order = [{ id: 'a', k: 'A' }, { id: 'b', k: 'B' }, { id: 'c', k: 'A' }, { id: 'd', k: 'B' }];
  const near = TextGroup.neighbours(order, (item) => item.k);
  assert.equal(near.prev.c, 'a');
  assert.equal(near.next.b, 'd');
  assert.equal(near.prev.a, null);
  assert.equal(near.next.d, null);
});

test('rowOrder pulls a group together where its first member is', () => {
  const groups = [{ id: 'gX', name: 'X' }];
  const texts = [{ id: 't1', group: 'gX' }, { id: 't2' }, { id: 't3', group: 'gX' }, { id: 't4' }];
  assert.deepEqual(TextGroup.rowOrder(texts, groups), [
    { kind: 'group', id: 'gX' }, { kind: 'text', id: 't1' }, { kind: 'text', id: 't3' }, { kind: 'text', id: 't2' }, { kind: 'text', id: 't4' }
  ]);
});

test('rowOrder treats an unknown group as no group and lists every text once', () => {
  const texts = [{ id: 't1', group: 'gGone' }, { id: 't2' }];
  const rows = TextGroup.rowOrder(texts, []);
  assert.deepEqual(rows, [{ kind: 'text', id: 't1' }, { kind: 'text', id: 't2' }]);
});

test('listRows places a group at its earliest member and interleaves the rest by start', () => {
  const groups = [{ id: 'gX', name: 'X' }];
  const texts = [
    { id: 't1', start: 30, group: 'gX' },
    { id: 't2', start: 5 },
    { id: 't3', start: 10, group: 'gX' },
    { id: 't4', start: 20 }
  ];
  // group starts at 10 (t3), so: t2 (5), group (10) with t3 (10) then t1 (30), t4 (20)
  assert.deepEqual(TextGroup.listRows(texts, groups, (tx) => tx.start), [
    { kind: 'text', id: 't2' }, { kind: 'group', id: 'gX' }, { kind: 'text', id: 't3' }, { kind: 'text', id: 't1' }, { kind: 'text', id: 't4' }
  ]);
});

test('listRows with no groups sorts by start and keeps array order for equal starts', () => {
  const texts = [{ id: 'a', start: 8 }, { id: 'b', start: 2 }, { id: 'c', start: 8 }];
  assert.deepEqual(TextGroup.listRows(texts, [], (tx) => tx.start).map((r) => r.id), ['b', 'a', 'c']);
});
