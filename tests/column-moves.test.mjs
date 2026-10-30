import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
globalThis.ColumnMoves = loadModule('ColumnMoves');
const M = globalThis.ColumnMoves;
const L = loadModule('Lyrics');

const BASE = { x: 0, y: 0, w: 1, h: 1 };
const A = { x: 0.5, y: 0.5, w: 0.5, h: 0.5 };
const B = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
const move = (id, at, frame, len = 1) => ({ id, at, len, frame });

function close(actual, expected, label) {
  ['x', 'y', 'w', 'h'].forEach((k) => assert.ok(Math.abs(actual[k] - expected[k]) < 1e-9, (label || '') + ' ' + k + ': ' + actual[k] + ' vs ' + expected[k]));
}
function lerp(a, b, p) { return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, w: a.w + (b.w - a.w) * p, h: a.h + (b.h - a.h) * p }; }

describe('ColumnMoves.clean', () => {
  test('sorts by start time, ties keep their order', () => {
    const out = M.clean([move('c', 5, A), move('a', 1, A), move('b', 5, B)]);
    assert.deepEqual(out.map((m) => m.id), ['a', 'c', 'b']);
  });
  test('clamps the glide to 0.2–10 s and the start to 0 or later', () => {
    const out = M.clean([move('a', -3, A, 0.01), move('b', 2, A, 99)]);
    assert.equal(out[0].at, 0);
    assert.equal(out[0].len, M.MIN_LEN);
    assert.equal(out[1].len, M.MAX_LEN);
  });
  test('rounds start and glide to hundredths', () => {
    const out = M.clean([move('a', 1.23456, A, 1.6789)]);
    assert.equal(out[0].at, 1.23);
    assert.equal(out[0].len, 1.68);
  });
  test('a missing glide becomes 1 s', () => {
    const out = M.clean([{ id: 'a', at: 2, frame: A }]);
    assert.equal(out[0].len, M.DEFAULT_LEN);
    assert.equal(M.DEFAULT_LEN, 1);
  });
  test('drops an entry with no id, keeping the valid ones', () => {
    const out = M.clean([move('a', 1, A), { at: 2, len: 1, frame: A }, move('', 3, A)]);
    assert.deepEqual(out.map((m) => m.id), ['a']);
  });
  test('drops an entry with a bad box, keeping the valid ones', () => {
    const out = M.clean([move('a', 1, A), move('b', 2, { x: 0, y: 0, w: 'wide', h: 1 }), move('c', 3, { x: 0, y: 0, w: 1 })]);
    assert.deepEqual(out.map((m) => m.id), ['a']);
  });
  test('drops an entry with no start time', () => {
    const out = M.clean([move('a', 1, A), { id: 'b', len: 1, frame: A }]);
    assert.deepEqual(out.map((m) => m.id), ['a']);
  });
  test('drops a second entry with the same id', () => {
    const out = M.clean([move('a', 1, A), move('a', 2, B)]);
    assert.equal(out.length, 1);
    assert.equal(out[0].at, 1);
  });
  test('keeps at most 50, the earliest', () => {
    const raw = [];
    for (let i = 60; i > 0; i--) raw.push(move('m' + i, i, A));
    const out = M.clean(raw);
    assert.equal(out.length, M.MAX_MOVES);
    assert.equal(out[0].at, 1);
    assert.equal(out[49].at, 50);
  });
  test('anything that is not a list gives an empty list', () => {
    [undefined, null, 'x', 3, {}].forEach((raw) => assert.deepEqual(M.clean(raw), []));
  });
  test('uses the box cleaner it is given', () => {
    const out = M.clean([move('a', 1, { x: 0.9, y: 0, w: 2, h: 0.5 })], () => ({ x: 0, y: 0, w: 1, h: 0.5 }));
    assert.deepEqual(out[0].frame, { x: 0, y: 0, w: 1, h: 0.5 });
  });
  test('never changes its input', () => {
    const raw = [move('b', 2, A), move('a', 1, B)], before = JSON.stringify(raw);
    M.clean(raw);
    assert.equal(JSON.stringify(raw), before);
  });
});

describe('ColumnMoves.frameAt', () => {
  const one = [move('a', 10, A, 2)];
  test('no moves gives the normal box', () => {
    close(M.frameAt(BASE, [], 5), BASE);
    close(M.frameAt(BASE, undefined, 5), BASE);
  });
  test('returns a fresh box, not the normal one', () => {
    assert.notEqual(M.frameAt(BASE, [], 5), BASE);
  });
  test('before the first move and at its start, the normal box', () => {
    close(M.frameAt(BASE, one, 3), BASE, 'before');
    close(M.frameAt(BASE, one, 10), BASE, 'at start');
  });
  test('halfway through the glide is exactly halfway', () => {
    close(M.frameAt(BASE, one, 11), lerp(BASE, A, 0.5));
  });
  test('at and after the end of the glide, the target', () => {
    close(M.frameAt(BASE, one, 12), A, 'at end');
    close(M.frameAt(BASE, one, 100), A, 'after');
  });
  test('the glide is eased, not linear', () => {
    const quarter = M.frameAt(BASE, one, 10.5);
    const moved = (quarter.x - BASE.x) / (A.x - BASE.x);
    assert.ok(moved > 0 && moved < 0.25, 'moved ' + moved);
  });
  test('between two moves it stays at the first target; the second glides from there', () => {
    const two = [move('a', 10, A, 2), move('b', 20, B, 2)];
    close(M.frameAt(BASE, two, 15), A, 'between');
    close(M.frameAt(BASE, two, 21), lerp(A, B, 0.5), 'second halfway');
    close(M.frameAt(BASE, two, 25), B, 'after both');
  });
  test('a move that starts mid-glide starts from the part-finished box', () => {
    const overlap = [move('a', 0, A, 2), move('b', 1, B, 2)];
    const reached = lerp(BASE, A, 0.5);
    close(M.frameAt(BASE, overlap, 1), reached, 'at second start');
    close(M.frameAt(BASE, overlap, 2), lerp(reached, B, 0.5), 'second halfway');
    close(M.frameAt(BASE, overlap, 3), B, 'second done');
  });
  test('works on an unsorted list', () => {
    const two = [move('b', 20, B, 2), move('a', 10, A, 2)];
    close(M.frameAt(BASE, two, 15), A);
  });
});

describe('ColumnMoves.fit', () => {
  const base = { x: 100, y: 50, w: 400, h: 300 };
  test('the same box is the identity', () => {
    const tr = M.fit(base, Object.assign({}, base), 'center');
    assert.equal(tr.identity, true);
    assert.equal(tr.s, 1);
  });
  test('half the width and height is half size; left lines up with the box', () => {
    const tr = M.fit(base, { x: 600, y: 300, w: 200, h: 150 }, 'left');
    assert.equal(tr.identity, false);
    assert.equal(tr.s, 0.5);
    assert.equal(tr.x, 600);
    assert.equal(tr.y, 300);
  });
  test('centered puts the scaled width in the middle of the box', () => {
    const tr = M.fit(base, { x: 600, y: 300, w: 400, h: 150 }, 'center');
    assert.equal(tr.s, 0.5);
    assert.equal(tr.x, 600 + (400 - 200) / 2);
  });
  test('a wider but shorter box uses the smaller ratio, so nothing stretches', () => {
    const tr = M.fit(base, { x: 0, y: 0, w: 800, h: 150 }, 'left');
    assert.equal(tr.s, 0.5);
  });
});

describe('ColumnMoves list changes', () => {
  const list = [move('a', 10, A, 2), move('b', 20, B, 1)];
  test('windowAt finds the move the time is inside, or null', () => {
    assert.equal(M.windowAt(list, 11).id, 'a');
    assert.equal(M.windowAt(list, 12).id, 'a');
    assert.equal(M.windowAt(list, 15), null);
    assert.equal(M.windowAt(list, 9), null);
  });
  test('windowAt counts a time a hair before a start as that move', () => {
    assert.equal(M.windowAt(list, 9.99).id, 'a');
  });
  test('windowAt picks the latest start when windows overlap', () => {
    assert.equal(M.windowAt([move('a', 10, A, 5), move('b', 12, B, 1)], 12.5).id, 'b');
  });
  test('lastStarted is the latest move that has begun', () => {
    assert.equal(M.lastStarted(list, 15).id, 'a');
    assert.equal(M.lastStarted(list, 30).id, 'b');
    assert.equal(M.lastStarted(list, 5), null);
  });
  test('upsert inside a window changes that move', () => {
    const before = JSON.stringify(list);
    const res = M.upsert(list, 11, BASE, 'new');
    assert.equal(res.added, false);
    assert.equal(res.move.id, 'a');
    assert.deepEqual(res.moves.find((m) => m.id === 'a').frame, BASE);
    assert.equal(res.moves.length, 2);
    assert.equal(JSON.stringify(list), before, 'input not changed');
  });
  test('upsert outside every window adds a 1 s move, sorted in', () => {
    const res = M.upsert(list, 15, BASE, 'new');
    assert.equal(res.added, true);
    assert.deepEqual(res.move, { id: 'new', at: 15, len: 1, frame: BASE });
    assert.deepEqual(res.moves.map((m) => m.id), ['a', 'new', 'b']);
    assert.equal(list.length, 2, 'input not changed');
  });
  test('upsert refuses to add past 50 moves', () => {
    const full = [];
    for (let i = 0; i < M.MAX_MOVES; i++) full.push(move('m' + i, i * 2, A, 0.5));
    const res = M.upsert(full, 1000, BASE, 'new');
    assert.equal(res.full, true);
    assert.equal(res.move, null);
    assert.equal(res.moves.length, M.MAX_MOVES);
  });
  test('retime moves the start and re-sorts', () => {
    const out = M.retime(list, 'a', 25);
    assert.deepEqual(out.map((m) => m.id), ['b', 'a']);
    assert.equal(out[1].at, 25);
    assert.equal(list[0].at, 10, 'input not changed');
  });
  test('retime keeps the start at 0 or later', () => {
    assert.equal(M.retime(list, 'a', -4)[0].at, 0);
  });
  test('setLen clamps the glide', () => {
    assert.equal(M.setLen(list, 'a', 50)[0].len, M.MAX_LEN);
    assert.equal(M.setLen(list, 'a', 0)[0].len, M.MIN_LEN);
  });
  test('setFrame changes only that move\'s box', () => {
    const out = M.setFrame(list, 'b', BASE);
    assert.deepEqual(out[1].frame, BASE);
    assert.deepEqual(out[0].frame, A);
  });
  test('remove drops the move; an unknown id changes nothing', () => {
    assert.deepEqual(M.remove(list, 'a').map((m) => m.id), ['b']);
    assert.deepEqual(M.remove(list, 'zzz'), list);
  });
  test('takenEffect is false before the first move, true during and after', () => {
    assert.equal(M.takenEffect(BASE, list, 5), false);
    assert.equal(M.takenEffect(BASE, list, 10), false);
    assert.equal(M.takenEffect(BASE, list, 11), true);
    assert.equal(M.takenEffect(BASE, list, 50), true);
  });
  test('takenEffect is false when a move\'s target is the normal box', () => {
    assert.equal(M.takenEffect(BASE, [move('a', 1, BASE)], 5), false);
  });
  test('snapTimes lists every other start across columns, sorted', () => {
    assert.deepEqual(M.snapTimes([list, [move('c', 15, A)]], 'a'), [15, 20]);
  });
});

describe('Lyrics keeps column moves', () => {
  const FRAME = { x: 0.1, y: 0.1, w: 0.4, h: 0.5 };
  function columnsSong(rollMoves, moreMoves) {
    const roll = rollMoves === undefined ? {} : { moves: rollMoves };
    const col2 = { heading: 'Two', set: L.columnDefaults() };
    if (moreMoves !== undefined) col2.moves = moreMoves;
    return { view: 'roll', columns: true, roll, more: [col2] };
  }
  test('a Columns song keeps Column 1\'s and Column 2\'s moves, cleaned', () => {
    const out = L.cleanSong(columnsSong([move('a', 3.456, FRAME, 2)], [move('b', 4, { x: 0.9, y: 0, w: 2, h: 0.5 })]));
    assert.deepEqual(out.roll.moves, [{ id: 'a', at: 3.46, len: 2, frame: FRAME }]);
    assert.deepEqual(out.more[0].moves, [{ id: 'b', at: 4, len: 1, frame: { x: 0, y: 0, w: 1, h: 0.5 } }]);
  });
  test('empty or missing moves write no moves key anywhere', () => {
    const without = L.cleanSong(columnsSong(undefined, undefined));
    const empty = L.cleanSong(columnsSong([], []));
    assert.deepEqual(empty, without);
    assert.equal('moves' in without.roll, false);
    assert.equal('moves' in without.more[0], false);
  });
  test('a bad move is dropped without touching the rest of the song', () => {
    const good = move('a', 2, FRAME);
    const out = L.cleanSong(columnsSong([good, { id: 'b', at: 'soon', len: 1, frame: FRAME }], undefined));
    assert.deepEqual(out, L.cleanSong(columnsSong([good], undefined)));
  });
  test('moves are not column settings', () => {
    const song = L.cleanSong(columnsSong([move('a', 2, FRAME)], [move('b', 4, FRAME)]));
    assert.equal('moves' in L.columnSettings(song, 1), false);
    assert.equal('moves' in L.columnSettings(song, 2), false);
    assert.equal('moves' in song.more[0].set, false);
  });
  test('copying settings from Column 1 to Column 2 leaves both columns\' moves alone', () => {
    const song = L.cleanSong(columnsSong([move('a', 2, FRAME)], [move('b', 4, FRAME)]));
    const out = L.cleanSong(L.copyColumnSettings(song, 1, [2]));
    assert.deepEqual(out.roll.moves, song.roll.moves);
    assert.deepEqual(out.more[0].moves, song.more[0].moves);
  });
  test('copying settings from Column 2 to Column 1 leaves both columns\' moves alone', () => {
    const song = L.cleanSong(columnsSong([move('a', 2, FRAME)], [move('b', 4, FRAME)]));
    const out = L.cleanSong(L.copyColumnSettings(song, 2, [1]));
    assert.deepEqual(out.roll.moves, song.roll.moves);
    assert.deepEqual(out.more[0].moves, song.more[0].moves);
  });
  test('copying onto a column with no moves gives it none', () => {
    const song = L.cleanSong(columnsSong([move('a', 2, FRAME)], undefined));
    const out = L.cleanSong(L.copyColumnSettings(song, 1, [2]));
    assert.equal('moves' in out.more[0], false);
  });
});
