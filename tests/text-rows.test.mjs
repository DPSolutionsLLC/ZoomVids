import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextGroup = loadModule('TextGroup');
const TextRows = loadModule('TextRows');

const startOf = (tx) => tx.start;
const groupX = [{ id: 'gX', name: 'X' }];

test('tidy with no saved rows keeps the order of the texts', () => {
  const texts = [{ id: 'b', start: 9 }, { id: 'a', start: 1 }];
  assert.deepEqual(TextRows.tidy(undefined, texts, [], startOf), ['b', 'a']);
});

test('tidy with no saved rows pulls a group together where its first member is', () => {
  const texts = [{ id: 't1', group: 'gX' }, { id: 't2' }, { id: 't3', group: 'gX' }, { id: 't4' }];
  assert.deepEqual(TextRows.tidy(null, texts, groupX, () => 0), ['t1', 't3', 't2', 't4']);
});

test('tidy drops unknown and repeated ids', () => {
  const texts = [{ id: 'a', start: 0 }, { id: 'b', start: 5 }];
  assert.deepEqual(TextRows.tidy(['b', 'gone', 'b', 'a'], texts, [], startOf), ['b', 'a']);
});

test('tidy moves group members next to the first one, keeping their order', () => {
  const texts = [{ id: 'a', start: 0 }, { id: 'm1', start: 3, group: 'gX' }, { id: 'b', start: 5 }, { id: 'm2', start: 1, group: 'gX' }];
  assert.deepEqual(TextRows.tidy(['m2', 'a', 'b', 'm1'], texts, groupX, startOf), ['m2', 'm1', 'a', 'b']);
});

test('units treats a text in a missing group as ungrouped', () => {
  const texts = [{ id: 'a', start: 0, group: 'gGone' }, { id: 'b', start: 5 }];
  assert.deepEqual(TextRows.units(['a', 'b'], texts, []), [{ kind: 'text', id: 'a' }, { kind: 'text', id: 'b' }]);
});

test('tidy slots a new ungrouped text in by its start', () => {
  const texts = [{ id: 'a', start: 0 }, { id: 'c', start: 20 }, { id: 'new', start: 10 }];
  assert.deepEqual(TextRows.tidy(['a', 'c'], texts, [], startOf), ['a', 'new', 'c']);
});

test('tidy puts a new text with the earliest start on top', () => {
  const texts = [{ id: 'a', start: 5 }, { id: 'b', start: 8 }, { id: 'new', start: 0 }];
  assert.deepEqual(TextRows.tidy(['a', 'b'], texts, [], startOf), ['new', 'a', 'b']);
});

test('tidy puts a new text with the latest start at the bottom', () => {
  const texts = [{ id: 'a', start: 5 }, { id: 'b', start: 8 }, { id: 'new', start: 30 }];
  assert.deepEqual(TextRows.tidy(['a', 'b'], texts, [], startOf), ['a', 'b', 'new']);
});

test('tidy puts a new text after an existing one with the same start', () => {
  const texts = [{ id: 'a', start: 5 }, { id: 'b', start: 8 }, { id: 'new', start: 5 }];
  assert.deepEqual(TextRows.tidy(['a', 'b'], texts, [], startOf), ['a', 'new', 'b']);
});

test('tidy compares a new text with a group by the group’s earliest member', () => {
  const texts = [{ id: 'm1', start: 10, group: 'gX' }, { id: 'm2', start: 30, group: 'gX' }, { id: 'b', start: 40 }, { id: 'new', start: 20 }];
  assert.deepEqual(TextRows.tidy(['m1', 'm2', 'b'], texts, groupX, startOf), ['m1', 'm2', 'new', 'b']);
});

test('tidy slots a new member into its group by start', () => {
  const texts = [{ id: 'a', start: 0 }, { id: 'm1', start: 10, group: 'gX' }, { id: 'm2', start: 30, group: 'gX' }, { id: 'm3', start: 20, group: 'gX' }];
  assert.deepEqual(TextRows.tidy(['a', 'm1', 'm2'], texts, groupX, startOf), ['a', 'm1', 'm3', 'm2']);
});

test('tidy places a brand-new group as one block by its earliest start, members by start', () => {
  const texts = [{ id: 'a', start: 0 }, { id: 'b', start: 50 }, { id: 'n2', start: 25, group: 'gX' }, { id: 'n1', start: 15, group: 'gX' }];
  assert.deepEqual(TextRows.tidy(['a', 'b'], texts, groupX, startOf), ['a', 'n1', 'n2', 'b']);
});

test('tidy leaves its inputs alone', () => {
  const rows = ['b', 'a'];
  const texts = [{ id: 'a', start: 0 }, { id: 'b', start: 5 }, { id: 'c', start: 1 }];
  TextRows.tidy(rows, texts, [], startOf);
  assert.deepEqual(rows, ['b', 'a']);
  assert.deepEqual(texts.map((tx) => tx.id), ['a', 'b', 'c']);
});

test('units lists texts and groups with their members in row order', () => {
  const texts = [{ id: 't1', group: 'gX' }, { id: 't2' }, { id: 't3', group: 'gX' }, { id: 't4' }];
  assert.deepEqual(TextRows.units(['t2', 't3', 't1', 't4'], texts, groupX), [
    { kind: 'text', id: 't2' }, { kind: 'group', id: 'gX', members: ['t3', 't1'] }, { kind: 'text', id: 't4' }
  ]);
});

test('display gives each text a row, an open group a bar plus a row per member, and a closed group one tall slot', () => {
  const units = [
    { kind: 'text', id: 'a' },
    { kind: 'group', id: 'gO', members: ['o1', 'o2'] },
    { kind: 'group', id: 'gC', members: ['c1', 'c2', 'c3'] },
    { kind: 'text', id: 'b' }
  ];
  const lay = TextRows.display(units, { gO: { id: 'gO' }, gC: { id: 'gC', closed: true } }, 22, 34);
  assert.deepEqual(lay.rows.map((r) => [r.kind, r.id, r.y, r.unit]), [
    ['text', 'a', 0, 0], ['group', 'gO', 22, 1], ['text', 'o1', 44, 1], ['text', 'o2', 66, 1], ['group', 'gC', 88, 2], ['text', 'b', 122, 3]
  ]);
  const closed = lay.rows.find((r) => r.id === 'gC');
  assert.equal(closed.closed, true);
  assert.equal(closed.h, 34);
  assert.deepEqual(closed.members, ['c1', 'c2', 'c3']);
  assert.equal(lay.rows.find((r) => r.id === 'o2').member, true);
  assert.equal(lay.height, 144);
});

const four = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

test('move takes a single text down', () => {
  assert.deepEqual(TextRows.move(['a', 'b', 'c', 'd'], four, [], ['a'], 2), ['b', 'c', 'a', 'd']);
});

test('move takes a single text up', () => {
  assert.deepEqual(TextRows.move(['a', 'b', 'c', 'd'], four, [], ['d'], 0), ['d', 'a', 'b', 'c']);
});

test('move takes a group as one block', () => {
  const texts = [{ id: 'a' }, { id: 'm1', group: 'gX' }, { id: 'm2', group: 'gX' }, { id: 'b' }];
  assert.deepEqual(TextRows.move(['a', 'm1', 'm2', 'b'], texts, groupX, ['g:gX'], 2), ['a', 'b', 'm1', 'm2']);
});

test('move drops two separate texts side by side, keeping their order', () => {
  assert.deepEqual(TextRows.move(['a', 'b', 'c', 'd'], four, [], ['c', 'a'], 2), ['b', 'd', 'a', 'c']);
});

test('move inside a group never takes the member out of the group', () => {
  const groups = [{ id: 'gX', name: 'X' }];
  const texts = [{ id: 'a' }, { id: 'm1', group: 'gX' }, { id: 'm2', group: 'gX' }, { id: 'm3', group: 'gX' }, { id: 'b' }];
  assert.deepEqual(TextRows.move(['a', 'm1', 'm2', 'm3', 'b'], texts, groups, ['m1'], 9, { group: 'gX' }), ['a', 'm2', 'm3', 'm1', 'b']);
  assert.deepEqual(TextRows.move(['a', 'm1', 'm2', 'm3', 'b'], texts, groups, ['m3'], 0, { group: 'gX' }), ['a', 'm3', 'm1', 'm2', 'b']);
});

test('move clamps the drop position to the list', () => {
  assert.deepEqual(TextRows.move(['a', 'b', 'c', 'd'], four, [], ['b'], 99), ['a', 'c', 'd', 'b']);
  assert.deepEqual(TextRows.move(['a', 'b', 'c', 'd'], four, [], ['c'], -3), ['c', 'a', 'b', 'd']);
});

test('move leaves its inputs alone', () => {
  const rows = ['a', 'b', 'c', 'd'];
  TextRows.move(rows, four, [], ['a'], 3);
  assert.deepEqual(rows, ['a', 'b', 'c', 'd']);
});

test('sortByStart puts the earliest start on top', () => {
  const texts = [{ id: 'a', start: 30 }, { id: 'b', start: 10 }, { id: 'c', start: 20 }];
  assert.deepEqual(TextRows.sortByStart(['a', 'b', 'c'], texts, [], startOf), ['b', 'c', 'a']);
});

test('sortByStart places a group by its earliest member and sorts the members inside', () => {
  const texts = [{ id: 'a', start: 15 }, { id: 'm1', start: 40, group: 'gX' }, { id: 'm2', start: 10, group: 'gX' }, { id: 'b', start: 5 }];
  assert.deepEqual(TextRows.sortByStart(['a', 'm1', 'm2', 'b'], texts, groupX, startOf), ['b', 'm2', 'm1', 'a']);
});

test('sortByStart keeps the current row order for equal starts', () => {
  const texts = [{ id: 'a', start: 5 }, { id: 'b', start: 5 }, { id: 'c', start: 1 }];
  assert.deepEqual(TextRows.sortByStart(['b', 'a', 'c'], texts, [], startOf), ['c', 'b', 'a']);
});

test('isSorted is true right after sorting and false before', () => {
  const texts = [{ id: 'a', start: 30 }, { id: 'b', start: 10 }];
  assert.equal(TextRows.isSorted(['a', 'b'], texts, [], startOf), false);
  assert.equal(TextRows.isSorted(TextRows.sortByStart(['a', 'b'], texts, [], startOf), texts, [], startOf), true);
});

test('dropIndex between top-level rows counts a closed group as one slot', () => {
  const units = [{ kind: 'text', id: 'a' }, { kind: 'group', id: 'gC', members: ['c1', 'c2'] }, { kind: 'text', id: 'b' }];
  const lay = TextRows.display(units, { gC: { id: 'gC', closed: true } }, 22, 34);
  assert.equal(TextRows.dropIndex(lay.rows, 5, 'top'), 0);
  assert.equal(TextRows.dropIndex(lay.rows, 40, 'top'), 1);
  assert.equal(TextRows.dropIndex(lay.rows, 70, 'top'), 2);
  assert.equal(TextRows.dropIndex(lay.rows, 500, 'top'), 2);
  assert.equal(TextRows.dropIndex(lay.rows, -50, 'top'), 0);
});

test('dropIndex between top-level rows counts an open group with its members as one slot', () => {
  const units = [{ kind: 'text', id: 'a' }, { kind: 'group', id: 'gO', members: ['o1', 'o2'] }, { kind: 'text', id: 'b' }];
  const lay = TextRows.display(units, { gO: { id: 'gO' } }, 22, 34);
  assert.equal(TextRows.dropIndex(lay.rows, 60, 'top'), 1);
  assert.equal(TextRows.dropIndex(lay.rows, 95, 'top'), 2);
});

test('dropIndex inside a group only counts that group’s member rows', () => {
  const units = [{ kind: 'text', id: 'a' }, { kind: 'group', id: 'gO', members: ['o1', 'o2', 'o3'] }, { kind: 'text', id: 'b' }];
  const lay = TextRows.display(units, { gO: { id: 'gO' } }, 22, 34);
  assert.equal(TextRows.dropIndex(lay.rows, 0, { group: 'gO' }), 0);
  assert.equal(TextRows.dropIndex(lay.rows, 77, { group: 'gO' }), 1);
  assert.equal(TextRows.dropIndex(lay.rows, 300, { group: 'gO' }), 2);
});
