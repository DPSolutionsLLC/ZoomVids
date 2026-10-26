import { describe, test } from 'node:test';
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

describe('startEdge', () => {
  function keepsEnd(result, end0) { assert.equal(Math.round((result.start + result.dur) * 10) / 10, end0); }

  test('moves the start earlier and keeps the end', () => {
    const result = TextBatch.startEdge(10, 20, 8, 0.5);
    assert.deepEqual(result, { start: 8, dur: 12, clamped: false });
    keepsEnd(result, 20);
  });

  test('moves the start later and rounds to a tenth', () => {
    const result = TextBatch.startEdge(10, 20, 15.04, 0.5);
    assert.deepEqual(result, { start: 15, dur: 5, clamped: false });
    keepsEnd(result, 20);
  });

  test('stops at the minimum length', () => {
    const result = TextBatch.startEdge(10, 20, 19.9, 0.5);
    assert.deepEqual(result, { start: 19.5, dur: 0.5, clamped: true });
    keepsEnd(result, 20);
  });

  test('stops at 0:00', () => {
    const result = TextBatch.startEdge(2, 6, -3, 0.5);
    assert.deepEqual(result, { start: 0, dur: 6, clamped: true });
    keepsEnd(result, 6);
  });

  test('a very short block near 0:00 cannot get shorter', () => {
    const result = TextBatch.startEdge(0, 0.5, 0.3, 0.5);
    assert.deepEqual(result, { start: 0, dur: 0.5, clamped: true });
    keepsEnd(result, 0.5);
  });
});

describe('lineUp', () => {
  test('Pull next row up moves only the first lane to the selected end', () => {
    const lanes = [['b'], ['c']];
    const spans = { b: { start: 20, dur: 3 }, c: { start: 30, dur: 2 } };
    // fromEnd 6: b moves from 20 to 6, a delta of 6 - 20 = -14; c is left out
    assert.deepEqual(TextBatch.lineUp(lanes, spans, 6, false), { starts: { b: 6 }, lanes: [{ ids: ['b'], delta: -14 }], moved: 1 });
  });

  test('a row that sits earlier is pushed later', () => {
    // 6 - 1 = 5
    const out = TextBatch.lineUp([['b']], { b: { start: 1, dur: 3 } }, 6, false);
    assert.deepEqual(out.starts, { b: 6 });
    assert.equal(out.lanes[0].delta, 5);
  });

  test('Line up rows below makes stair steps: each row starts at the end of the row above', () => {
    const lanes = [['b'], ['c'], ['d']];
    const spans = { b: { start: 20, dur: 3 }, c: { start: 1, dur: 2 }, d: { start: 50, dur: 4 } };
    // b at 6, ends 6 + 3 = 9; c at 9, ends 9 + 2 = 11; d at 11
    const out = TextBatch.lineUp(lanes, spans, 6, true);
    assert.deepEqual(out.starts, { b: 6, c: 9, d: 11 });
    assert.equal(out.moved, 3);
  });

  test('a collapsed group lane moves as one block and the next lane starts at its latest end', () => {
    const lanes = [['m1', 'm2'], ['c']];
    const spans = { m1: { start: 40, dur: 2 }, m2: { start: 43, dur: 5 }, c: { start: 0, dur: 1 } };
    // delta 10 - 40 = -30: m1 at 10 (ends 12), m2 at 13 (ends 18), the 3 s gap is kept; c starts at 18, not 12
    const out = TextBatch.lineUp(lanes, spans, 10, true);
    assert.deepEqual(out.starts, { m1: 10, m2: 13, c: 18 });
    assert.equal(out.lanes[0].delta, -30);
  });

  test('starts round to a hundredth so a row starts exactly where the one above ends', () => {
    // 12.34 stays 12.34, not 12.3
    const out = TextBatch.lineUp([['b']], { b: { start: 20, dur: 1 } }, 12.34, false);
    assert.equal(out.starts.b, 12.34);
  });

  test('nothing starts before 0:00', () => {
    // fromEnd 0, first member at 5: delta -5, so 5 goes to 0 and 7 to 2
    const out = TextBatch.lineUp([['m1', 'm2']], { m1: { start: 5, dur: 1 }, m2: { start: 7, dur: 1 } }, 0, false);
    assert.deepEqual(out.starts, { m1: 0, m2: 2 });
  });

  test('moved counts only lanes that change; an already lined-up stack gives 0', () => {
    // b already at 6 and ends 9; c already at 9
    const out = TextBatch.lineUp([['b'], ['c']], { b: { start: 6, dur: 3 }, c: { start: 9, dur: 2 } }, 6, true);
    assert.equal(out.moved, 0);
    assert.deepEqual(out.starts, { b: 6, c: 9 });
  });

  test('inputs are never changed', () => {
    const lanes = [['b'], ['m1', 'm2']];
    const spans = { b: { start: 20, dur: 3 }, m1: { start: 40, dur: 2 }, m2: { start: 43, dur: 2 } };
    const lanesCopy = structuredClone(lanes), spansCopy = structuredClone(spans);
    TextBatch.lineUp(lanes, spans, 6, true);
    assert.deepEqual(lanes, lanesCopy);
    assert.deepEqual(spans, spansCopy);
  });
});

describe('lineUpState', () => {
  test('a running recording greys the buttons out with no extra note', () => {
    assert.deepEqual(TextBatch.lineUpState({ below: 3, whole: false, recording: true }), { disabled: true, note: null });
  });

  test('a whole-video text greys them out with its note', () => {
    assert.deepEqual(TextBatch.lineUpState({ below: 3, whole: true, recording: false }), { disabled: true, note: 'This text shows for the whole video, so nothing can start after it.' });
  });

  test('the bottom row greys them out', () => {
    assert.deepEqual(TextBatch.lineUpState({ below: 0, whole: false, recording: false }), { disabled: true, note: 'No rows below this one.' });
  });

  test('otherwise both buttons work', () => {
    assert.deepEqual(TextBatch.lineUpState({ below: 2, whole: false, recording: false }), { disabled: false, note: null });
  });

  test('recording wins over whole', () => {
    assert.deepEqual(TextBatch.lineUpState({ below: 2, whole: true, recording: true }), { disabled: true, note: null });
  });

  test('the note is never an empty string', () => {
    const states = [{ below: 0 }, { below: 1 }, { below: 1, whole: true }, { below: 1, recording: true }];
    states.forEach((s) => assert.notEqual(TextBatch.lineUpState(s).note, ''));
  });
});

describe('lineUpNote', () => {
  const none = { locked: 0, tied: 0, whole: 0, start: 0, linked: 0 };

  test('nothing moved says the rows are already lined up', () => {
    assert.equal(TextBatch.lineUpNote(true, 0, none), 'The rows below are already lined up.');
  });

  test('singular and plural row wording', () => {
    assert.equal(TextBatch.lineUpNote(false, 1, none), 'Pulled the next row up.');
    assert.equal(TextBatch.lineUpNote(true, 1, none), 'Lined up 1 row below.');
    assert.equal(TextBatch.lineUpNote(true, 4, none), 'Lined up 4 rows below.');
  });

  test('locked texts are named', () => {
    assert.equal(TextBatch.lineUpNote(false, 1, { ...none, locked: 1 }), 'Pulled the next row up. 1 locked text moved and is still locked.');
    assert.equal(TextBatch.lineUpNote(true, 3, { ...none, locked: 2 }), 'Lined up 3 rows below. 2 locked texts moved and are still locked.');
  });

  test('changed settings join into one sentence and counts of 0 are left out', () => {
    assert.equal(
      TextBatch.lineUpNote(true, 5, { locked: 0, tied: 1, whole: 1, start: 0, linked: 2 }),
      'Lined up 5 rows below. Changed so they could move: 1 no longer tied to a recording, 1 no longer shows for the whole video, 2 no longer linked to the text before or after.'
    );
    assert.equal(TextBatch.lineUpNote(false, 1, { ...none, start: 1 }), 'Pulled the next row up. Changed so they could move: 1 no longer starts at 0:00.');
  });

  test('the note is never an empty string', () => {
    [[true, 0], [false, 1], [true, 2]].forEach(([all, n]) => assert.notEqual(TextBatch.lineUpNote(all, n, none), ''));
  });
});
