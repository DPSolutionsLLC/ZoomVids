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

test('keepClosed copies the closed flag by group id', () => {
  const groups = [{ id: 'gA', name: 'A' }, { id: 'gB', name: 'B', closed: true }];
  const from = [{ id: 'gA', name: 'A', closed: true }, { id: 'gB', name: 'B' }];
  assert.deepEqual(TextGroup.keepClosed(groups, from), [{ id: 'gA', name: 'A', closed: true }, { id: 'gB', name: 'B' }]);
});

test('keepClosed leaves groups that are not in the current list open', () => {
  const out = TextGroup.keepClosed([{ id: 'gNew', name: 'N', closed: true }], [{ id: 'gA', name: 'A', closed: true }]);
  assert.deepEqual(out, [{ id: 'gNew', name: 'N' }]);
});

test('keepClosed leaves its inputs alone', () => {
  const groups = [{ id: 'gA', name: 'A' }], from = [{ id: 'gA', name: 'A', closed: true }];
  TextGroup.keepClosed(groups, from);
  assert.deepEqual(groups, [{ id: 'gA', name: 'A' }]);
  assert.deepEqual(from, [{ id: 'gA', name: 'A', closed: true }]);
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

test('nextName with no base word still counts "Group N"', () => {
  assert.equal(TextGroup.nextName([{ id: 'g1', name: 'Group 1' }]), 'Group 2');
});

test('nextName with a base word skips names already taken', () => {
  assert.equal(TextGroup.nextName([{ id: 'g1', name: 'Scriptures 1' }], 'Scriptures'), 'Scriptures 2');
});

test('nextName counts each base word on its own', () => {
  assert.equal(TextGroup.nextName([{ id: 'g1', name: 'Scriptures 1' }], 'Text'), 'Text 1');
});

const lyricText = (id, group) => Object.assign({ id, lyric: { song: 's1', lines: [] } }, group ? { group } : {});
const plainText = (id, group) => Object.assign({ id, body: 'Hello' }, group ? { group } : {});

test('mixesLyrics is true only when lyric and other texts are both picked', () => {
  const texts = [lyricText('l1'), lyricText('l2'), plainText('p1'), plainText('p2')];
  assert.equal(TextGroup.mixesLyrics(texts, ['l1', 'p1']), true);
  assert.equal(TextGroup.mixesLyrics(texts, ['l1', 'l2']), false);
  assert.equal(TextGroup.mixesLyrics(texts, ['p1', 'p2']), false);
});

test('mixesLyrics ignores unknown ids', () => {
  const texts = [lyricText('l1'), plainText('p1')];
  assert.equal(TextGroup.mixesLyrics(texts, ['l1', 'gone']), false);
});

test('plainInLyricGroups finds other texts in a group that holds lyric lines, in texts order', () => {
  const texts = [plainText('p2', 'gL'), lyricText('l1', 'gL'), plainText('p1', 'gL'), plainText('p3', 'gP'), plainText('p4', 'gP'), lyricText('l2')];
  assert.deepEqual(TextGroup.plainInLyricGroups(texts), ['p2', 'p1']);
});

test('plainInLyricGroups leaves all-plain groups and lyric texts alone', () => {
  const texts = [lyricText('l1', 'gL'), lyricText('l2', 'gL'), plainText('p1', 'gP'), plainText('p2')];
  assert.deepEqual(TextGroup.plainInLyricGroups(texts), []);
});

test('plainInLyricGroups only checks the groups asked for', () => {
  const texts = [lyricText('l1', 'gA'), plainText('p1', 'gA'), lyricText('l2', 'gB'), plainText('p2', 'gB')];
  assert.deepEqual(TextGroup.plainInLyricGroups(texts, ['gB']), ['p2']);
  assert.deepEqual(TextGroup.plainInLyricGroups(texts, ['gA', 'gB']), ['p1', 'p2']);
});

test('mixesLyrics and plainInLyricGroups leave their inputs alone', () => {
  const texts = [lyricText('l1', 'gA'), plainText('p1', 'gA')], ids = ['l1', 'p1'], groups = ['gA'];
  const before = structuredClone(texts);
  TextGroup.mixesLyrics(texts, ids);
  TextGroup.plainInLyricGroups(texts, groups);
  assert.deepEqual(texts, before);
  assert.deepEqual(ids, ['l1', 'p1']);
  assert.deepEqual(groups, ['gA']);
});
