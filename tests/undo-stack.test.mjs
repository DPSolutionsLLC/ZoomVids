import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const UndoStack = loadModule('UndoStack');

function playlist(changes = {}) {
  return {
    name: 'Sunday',
    target: 1200,
    opts: { bg: 'dark', textScale: 1 },
    items: [{ id: 'm1', key: 'song-a', name: 'Song A' }],
    spoken: [{ id: 's1', key: 'talk-a', name: 'Talk A', at: 150 }],
    texts: [
      { id: 't1', text: 'One', start: 0 },
      { id: 't2', text: 'Two', start: 5 },
      { id: 't3', text: 'Three', start: 10 },
      { id: 't4', text: 'Four', start: 15 },
      { id: 't5', text: 'Five', start: 20 },
      { id: 't6', text: 'Six', start: 25 }
    ],
    queue: [{ id: 'q1', text: 'Queued' }],
    groups: [{ id: 'g1', name: 'Group 1' }],
    ...changes
  };
}
const json = (m) => JSON.stringify(m);

test('create starts with nothing to undo or redo', () => {
  const stack = UndoStack.create(50, json(playlist()));
  assert.equal(UndoStack.canUndo(stack), false);
  assert.equal(UndoStack.canRedo(stack), false);
});

test('record with the same JSON returns the very same object', () => {
  const stack = UndoStack.create(50, json(playlist()));
  assert.equal(UndoStack.record(stack, json(playlist())), stack);
});

test('undo walks back through recorded states and stops at the start', () => {
  let stack = UndoStack.create(50, 'A');
  stack = UndoStack.record(stack, 'B');
  stack = UndoStack.record(stack, 'C');
  const first = UndoStack.undo(stack);
  assert.equal(first.before, 'C');
  assert.equal(first.after, 'B');
  const second = UndoStack.undo(first.stack);
  assert.equal(second.after, 'A');
  assert.equal(UndoStack.undo(second.stack), null);
});

test('redo returns the undone state, and null when nothing is left to redo', () => {
  let stack = UndoStack.create(50, 'A');
  stack = UndoStack.record(stack, 'B');
  const undone = UndoStack.undo(stack);
  const redone = UndoStack.redo(undone.stack);
  assert.equal(redone.before, 'A');
  assert.equal(redone.after, 'B');
  assert.equal(redone.stack.current, 'B');
  assert.equal(UndoStack.canUndo(redone.stack), true);
  assert.equal(UndoStack.redo(redone.stack), null);
});

test('recording after an undo clears redo', () => {
  let stack = UndoStack.create(50, 'A');
  stack = UndoStack.record(stack, 'B');
  const undone = UndoStack.undo(stack);
  assert.equal(UndoStack.canRedo(undone.stack), true);
  const next = UndoStack.record(undone.stack, 'D');
  assert.equal(UndoStack.canRedo(next), false);
});

test('the limit keeps only the newest undo steps', () => {
  let stack = UndoStack.create(3, 'A');
  ['B', 'C', 'D', 'E', 'F'].forEach((s) => { stack = UndoStack.record(stack, s); });
  assert.deepEqual(stack.past, ['C', 'D', 'E']);
  assert.equal(stack.current, 'F');
});

test('inputs are never changed', () => {
  let stack = UndoStack.create(50, 'A');
  stack = UndoStack.record(stack, 'B');
  const copy = structuredClone(stack);
  UndoStack.record(stack, 'C');
  const undone = UndoStack.undo(stack);
  UndoStack.settle(stack, 'X');
  assert.deepEqual(stack, copy);
  const undoneCopy = structuredClone(undone.stack);
  UndoStack.redo(undone.stack);
  assert.deepEqual(undone.stack, undoneCopy);
});

test('settle replaces only current', () => {
  let stack = UndoStack.create(50, 'A');
  stack = UndoStack.record(stack, 'B');
  const undone = UndoStack.undo(UndoStack.record(stack, 'C'));
  const settled = UndoStack.settle(undone.stack, 'B2');
  assert.equal(settled.current, 'B2');
  assert.deepEqual(settled.past, undone.stack.past);
  assert.deepEqual(settled.future, undone.stack.future);
  assert.equal(settled.limit, 50);
});

test('describe counts changed text items', () => {
  const before = playlist();
  const allHidden = playlist({ texts: before.texts.map((tx) => ({ ...tx, hidden: true })) });
  assert.equal(UndoStack.describe(json(before), json(allHidden)), 'change to 6 text items');
  const oneEdited = playlist({ texts: before.texts.map((tx, i) => (i === 0 ? { ...tx, text: 'Uno' } : tx)) });
  assert.equal(UndoStack.describe(json(before), json(oneEdited)), 'change to 1 text item');
});

test('describe counts an added and a removed text as two', () => {
  const before = playlist();
  const after = playlist({ texts: before.texts.slice(1).concat([{ id: 't7', text: 'Seven', start: 30 }]) });
  assert.equal(UndoStack.describe(json(before), json(after)), 'change to 2 text items');
});

test('describe names the tap queue, mix settings, and songs and talks', () => {
  const before = playlist();
  assert.equal(UndoStack.describe(json(before), json(playlist({ queue: [] }))), 'change to the tap queue');
  assert.equal(UndoStack.describe(json(before), json(playlist({ opts: { bg: 'light', textScale: 1 } }))), 'change to mix settings');
  assert.equal(UndoStack.describe(json(before), json(playlist({ items: [] }))), 'change to songs and talks');
});

test('describe reports a group change only when no text changed', () => {
  const before = playlist();
  const renamed = playlist({ groups: [{ id: 'g1', name: 'Opening' }] });
  assert.equal(UndoStack.describe(json(before), json(renamed)), 'change to text groups');
  const grouped = playlist({
    texts: before.texts.map((tx, i) => (i < 2 ? { ...tx, group: 'g2' } : tx)),
    groups: before.groups.concat([{ id: 'g2', name: 'Group 2' }])
  });
  assert.equal(UndoStack.describe(json(before), json(grouped)), 'change to 2 text items');
});

test('describe joins two parts with "and" and three with a comma and "and"', () => {
  const before = playlist();
  const two = playlist({ texts: before.texts.map((tx, i) => (i < 2 ? { ...tx, hidden: true } : tx)), opts: { bg: 'light', textScale: 1 } });
  assert.equal(UndoStack.describe(json(before), json(two)), 'change to 2 text items and mix settings');
  const three = playlist({ queue: [], opts: { bg: 'light', textScale: 1 }, name: 'Easter' });
  assert.equal(UndoStack.describe(json(before), json(three)), 'change to the tap queue, mix settings and the playlist name');
});

test('describe counts changed pictures', () => {
  const pics = [{ id: 'p1', key: 'a.jpg|1', start: 0, dur: 8 }, { id: 'p2', key: 'b.jpg|2', start: 6.5, dur: 8 }];
  const before = playlist({ pictures: pics });
  const one = playlist({ pictures: [{ ...pics[0], dur: 10 }, pics[1]] });
  assert.equal(UndoStack.describe(json(before), json(one)), 'change to 1 picture');
  const two = playlist({ pictures: pics.map((p) => ({ ...p, motion: 'turn' })) });
  assert.equal(UndoStack.describe(json(before), json(two)), 'change to 2 pictures');
});

test('describe names a text and a picture together', () => {
  const before = playlist({ pictures: [{ id: 'p1', key: 'a.jpg|1', start: 0, dur: 8 }] });
  const after = playlist({
    texts: before.texts.map((tx, i) => (i === 0 ? { ...tx, text: 'Uno' } : tx)),
    pictures: [{ id: 'p1', key: 'a.jpg|1', start: 3, dur: 8 }]
  });
  assert.equal(UndoStack.describe(json(before), json(after)), 'change to 1 text item and 1 picture');
});

test('describe counts an added picture when the old playlist had none', () => {
  assert.equal(UndoStack.describe(json(playlist()), json(playlist({ pictures: [{ id: 'p1', key: 'a.jpg|1' }] }))), 'change to 1 picture');
});

test('describe returns "change" when nothing differs', () => {
  assert.equal(UndoStack.describe(json(playlist()), json(playlist())), 'change');
});

test('describe names the text row order when only the rows moved', () => {
  const before = playlist({ textRows: ['a', 'b'] });
  assert.equal(UndoStack.describe(json(before), json(playlist({ textRows: ['b', 'a'] }))), 'change to the text row order');
});

test('describe leaves the row order out when a text changed too', () => {
  const before = playlist({ textRows: ['a', 'b'] });
  const after = playlist({ textRows: ['b', 'a'], texts: [] });
  assert.doesNotMatch(UndoStack.describe(json(before), json(after)), /row order/);
});
