import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const R = loadModule('RollView');

// Ten one-row lines, 2 s each and back to back: line i runs from 2i to 2i + 2.
// verseStarts lists the indices that begin a verse (line 0 always does).
function lines(count = 10, verseStarts = [0]) {
  let verse = -1;
  return Array.from({ length: count }, (_, i) => {
    const verseStart = i === 0 || verseStarts.includes(i);
    if (verseStart) verse++;
    return { start: 2 * i, end: 2 * i + 2, h: 1, verse: 'v' + verse, verseStart };
  });
}
const row = (start, end, verseStart = false) => ({ start, end, h: 1, verse: 'v', verseStart });
// Line 2 (3 to 5) is sung while line 1 (2 to 6) is still going.
const overlap = () => [row(0, 2, true), row(2, 6), row(3, 5), row(6, 8), row(8, 10), row(10, 12)];
const opts = (more = {}) => Object.assign({ above: 1, below: 2, move: 'stay', motion: 'smooth', verses: 'none' }, more);
const byIndex = (v) => Object.fromEntries(v.shown.map((s) => [s.index, s]));
const near = (a, b) => Math.abs(a - b) < 1e-9;

describe('labels', () => {
  test('numbers only unlabelled verses, and a label overrides the number', () => {
    assert.deepEqual(R.labels([{ id: 'a' }, { id: 'b', label: 'Chorus' }, { id: 'c' }]), { a: 'Verse 1', b: 'Chorus', c: 'Verse 2' });
  });
});

describe('current', () => {
  test('in an overlap the earliest started line anchors and both are current', () => {
    const cur = R.current([{ start: 0, end: 3 }, { start: 2, end: 5 }], 2.5);
    assert.deepEqual(cur, { index: 0, from: 2, active: true, first: 0, last: 1, list: [0, 1] });
  });
  test('in a gap the next line is current, not active, and became current when the previous one ended', () => {
    const cur = R.current([{ start: 0, end: 2 }, { start: 3, end: 5 }], 2.5);
    assert.deepEqual(cur, { index: 1, from: 2, active: false, first: 1, last: 1, list: [] });
  });
  test('before the first line it is line 0 with no from', () => {
    assert.deepEqual(R.current([{ start: 1, end: 2 }, { start: 3, end: 4 }], 0), { index: 0, from: null, active: false, first: 0, last: 0, list: [] });
  });
  test('without overlaps from is the same as the earlier of this start and the previous end', () => {
    const list = [{ start: 0, end: 2 }, { start: 2, end: 4 }, { start: 5, end: 7 }];
    [1, 3, 4.5, 6, 9].forEach((t) => {
      const cur = R.current(list, t);
      const expected = cur.index === 0 ? null : Math.min(list[cur.index].start, list[cur.index - 1].end);
      assert.equal(cur.from, expected, 'at ' + t);
    });
  });
  test('after the last line the last line stays current', () => {
    const cur = R.current([{ start: 1, end: 2 }, { start: 3, end: 4 }], 10);
    assert.equal(cur.index, 1);
    assert.equal(cur.active, false);
  });
  test('no lines gives index -1', () => {
    assert.equal(R.current([], 1).index, -1);
  });
});

describe('slot', () => {
  test('two overlapping lines are both in the list', () => {
    assert.deepEqual(R.slot([{ start: 0, end: 3 }, { start: 2, end: 5 }], 2.5), { first: 0, last: 1, list: [0, 1], active: true });
  });
  test('a line that already ended between two current lines is left out', () => {
    const s = R.slot([{ start: 0, end: 10 }, { start: 2, end: 4 }, { start: 5, end: 8 }], 6);
    assert.deepEqual(s.list, [0, 2]);
    assert.equal(s.first, 0);
    assert.equal(s.last, 2);
  });
  test('in a gap the slot is the next line and not active', () => {
    assert.deepEqual(R.slot([{ start: 0, end: 2 }, { start: 3, end: 5 }], 2.5), { first: 1, last: 1, list: [], active: false });
  });
  test('no lines', () => {
    assert.deepEqual(R.slot([], 1), { first: -1, last: -1, list: [], active: false });
  });
});

describe('slot with sung times', () => {
  test('a line whose words are all sung stops being current once a later line has started', () => {
    const list = [{ start: 0, end: 3, sung: 2 }, { start: 2, end: 5, sung: 4.5 }];
    assert.deepEqual(R.slot(list, 2.5), { first: 1, last: 1, list: [1], active: true });
    assert.equal(R.changedAt(list, 2.5), 2);
  });
  test('a line still being sung stays current alongside the later one', () => {
    const list = [{ start: 1.5, end: 6.45, sung: 5.95 }, { start: 3.5, end: 7.95, sung: 7.45 }];
    assert.deepEqual(R.slot(list, 5).list, [0, 1]);
    assert.deepEqual(R.slot(list, 6.1).list, [1]);
  });
  test('a finished line with no later line keeps the slot until its block ends', () => {
    assert.deepEqual(R.slot([{ start: 0, end: 3, sung: 2 }], 2.5).list, [0]);
  });
  test('a crossfade overlap between back-to-back lines scrolls when the next line starts, as before', () => {
    const list = [row(0, 2.04), row(2, 4.04), row(4, 6)].map((l, i) => Object.assign(l, { sung: 2 * i + 2 }));
    const cur = R.current(list, 2.02);
    assert.equal(cur.index, 1);
    assert.equal(cur.from, 2);
    const v = R.view(list, 2.02, opts({ motion: 'jump' }));
    assert.deepEqual(v.shown.map((s) => s.state), ['sung', 'current', 'upcoming']);
  });
});

describe('changedAt', () => {
  test('across a gap it is the previous line end', () => {
    assert.equal(R.changedAt([{ start: 0, end: 2 }, { start: 3, end: 5 }], 4), 2);
  });
  test('when a second line starts the slot grows at its start', () => {
    assert.equal(R.changedAt([{ start: 0, end: 3 }, { start: 2, end: 5 }], 2.5), 2);
  });
  test('when the first line ends during an overlap it changes at that end', () => {
    assert.equal(R.changedAt([{ start: 0, end: 3 }, { start: 2, end: 5 }], 4), 3);
  });
  test('before or on the first line it is null', () => {
    const list = [{ start: 1, end: 2 }, { start: 3, end: 4 }];
    assert.equal(R.changedAt(list, 0), null);
    assert.equal(R.changedAt(list, 1.5), null);
  });
});

describe('tops', () => {
  test('heights and gaps add up', () => {
    assert.deepEqual(R.tops([1, 2, 1], [0.7, 0, 0.7]), [0.7, 1.7, 4.4]);
  });
});

describe('pages', () => {
  test('size 4 over 10 lines', () => {
    assert.deepEqual(R.pages(lines(10), 4, false), [0, 0, 0, 0, 1, 1, 1, 1, 2, 2]);
  });
  test('by verse, a verse start also starts a page', () => {
    assert.deepEqual(R.pages(lines(10, [2]), 4, true), [0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
    assert.deepEqual(R.pages(lines(10, [2]), 4, false), [0, 0, 0, 0, 1, 1, 1, 1, 2, 2]);
  });
});

describe('view', () => {
  test('stay: once the scroll is done the current line sits `above` rows down, with its neighbours around it', () => {
    const v = R.view(lines(), 9, opts());
    assert.equal(v.cur, 4);
    assert.equal(byIndex(v)[4].y, 1);
    assert.deepEqual(v.shown.map((s) => s.index), [3, 4, 5, 6]);
    assert.deepEqual(v.shown.map((s) => s.y), [0, 1, 2, 3]);
    assert.ok(v.shown.every((s) => s.alpha === 1));
  });
  test('page differs from stay at the same moment', () => {
    const stay = byIndex(R.view(lines(), 9, opts()))[4].y;
    const page = byIndex(R.view(lines(), 9, opts({ move: 'page' })))[4].y;
    assert.equal(stay, 1);
    assert.equal(page, 0);
    assert.notEqual(page, stay);
  });
  test('smooth mid-scroll gives a fractional offset and half-faded lines; jump at the same moment is already there', () => {
    const t = 8 + 0.2;
    const smooth = byIndex(R.view(lines(), t, opts()));
    assert.ok(smooth[4].y > 1 && smooth[4].y < 2, 'current line is between its old and new row');
    assert.ok(smooth[2].alpha > 0 && smooth[2].alpha < 1, 'the leaving line is fading out');
    assert.ok(smooth[6].alpha > 0 && smooth[6].alpha < 1, 'the entering line is fading in');
    const jump = R.view(lines(), t, opts({ motion: 'jump' }));
    assert.equal(byIndex(jump)[4].y, 1);
    assert.deepEqual(jump.shown.map((s) => s.index), [3, 4, 5, 6]);
    assert.ok(jump.shown.every((s) => s.alpha === 1));
    assert.notEqual(smooth[4].y, byIndex(jump)[4].y);
  });
  test('page: moving within a page changes no position', () => {
    const at = (t) => R.view(lines(), t, opts({ move: 'page' })).shown.map((s) => [s.index, s.y, s.alpha]);
    assert.deepEqual(at(10.2), at(9));
    assert.deepEqual(at(11), at(9));
    assert.deepEqual(at(9), [[4, 0, 1], [5, 1, 1], [6, 2, 1], [7, 3, 1]]);
  });
  test('page: crossing to the next page shifts every line by the page height', () => {
    const jumpBefore = R.view(lines(), 15, opts({ move: 'page', motion: 'jump' }));
    const jumpAfter = R.view(lines(), 17, opts({ move: 'page', motion: 'jump' }));
    assert.deepEqual(jumpBefore.shown.map((s) => [s.index, s.y]), [[4, 0], [5, 1], [6, 2], [7, 3]]);
    assert.deepEqual(jumpAfter.shown.map((s) => [s.index, s.y]), [[8, 0], [9, 1]]);
    const mid = byIndex(R.view(lines(), 16.2, opts({ move: 'page' })));
    assert.ok(near(mid[8].y, 2), 'halfway between row 4 and row 0');
    assert.ok(near(mid[4].y, -2), 'the old page moves up by the same amount');
  });
  test('fresh screen + stay: once the scroll ends no line from another verse shows', () => {
    const v = R.view(lines(10, [4]), 9, opts({ verses: 'screen' }));
    assert.equal(v.cur, 4);
    assert.ok(v.shown.every((s) => s.index >= 4));
    assert.deepEqual(v.shown.map((s) => s.index), [4, 5, 6]);
  });
  test('mark adds a label gap before a verse start and flags it', () => {
    const v = byIndex(R.view(lines(10, [4]), 7, opts({ verses: 'mark', motion: 'jump' })));
    assert.ok(near(v[4].y - v[3].y, 1 + R.LABEL_ROWS));
    assert.equal(v[4].label, true);
    assert.equal(v[3].label, false);
    const none = byIndex(R.view(lines(10, [4]), 7, opts({ verses: 'none', motion: 'jump' })));
    assert.equal(none[4].y - none[3].y, 1);
    assert.equal(none[4].label, false);
  });
  test('states: sung, current, upcoming, and next while waiting in a gap', () => {
    const v = R.view(lines(), 9, opts({ motion: 'jump' }));
    assert.deepEqual(v.shown.map((s) => s.state), ['sung', 'current', 'upcoming', 'upcoming']);
    const gap = R.view([{ start: 0, end: 2, h: 1, verse: 'a', verseStart: true }, { start: 3, end: 5, h: 1, verse: 'a', verseStart: false }], 2.5, opts({ motion: 'jump' }));
    assert.equal(gap.active, false);
    assert.deepEqual(gap.shown.map((s) => s.state), ['sung', 'next']);
  });
  test('a taller line pushes the lines under it down', () => {
    const list = lines(4);
    list[1].h = 2;
    const v = byIndex(R.view(list, 1, opts({ motion: 'jump', above: 0, below: 3 })));
    assert.deepEqual([v[0].y, v[1].y, v[2].y, v[3].y], [0, 1, 3, 4]);
  });
  test('overlap, stay: both lines are current, the window grows around the pair, anchored on the first', () => {
    const v = R.view(overlap(), 4, opts());
    assert.equal(v.cur, 1);
    assert.equal(v.active, true);
    assert.deepEqual(v.shown.map((s) => s.index), [0, 1, 2, 3, 4]);
    assert.deepEqual(v.shown.map((s) => s.state), ['sung', 'current', 'current', 'upcoming', 'upcoming']);
    assert.equal(byIndex(v)[1].y, 1);
    assert.ok(v.shown.every((s) => s.alpha === 1));
  });
  test('overlap, page: a current line on the next page still shows as current', () => {
    const list = [row(0, 2), row(2, 4), row(4, 8), row(6, 9), row(9, 11), row(11, 13)];
    const v = byIndex(R.view(list, 7, opts({ move: 'page', above: 1, below: 1, motion: 'jump' })));
    assert.deepEqual(Object.keys(v).map(Number), [0, 1, 2, 3]);
    assert.equal(v[2].state, 'current');
    assert.equal(v[3].state, 'current');
    assert.equal(v[0].y, 0);
  });
  test('overlap, fresh screen: a current line in the next verse still shows', () => {
    const list = [row(0, 2), row(2, 4), row(4, 8), row(6, 9, true), row(9, 11)];
    const v = byIndex(R.view(list, 7, opts({ verses: 'screen', above: 1, below: 1, motion: 'jump' })));
    assert.deepEqual(Object.keys(v).map(Number), [1, 2, 3]);
    assert.equal(v[3].state, 'current');
  });
  test('overlap, smooth: just after the slot shrinks a leaving line is half faded, and after the scroll every alpha is 0 or 1', () => {
    const mid = byIndex(R.view(overlap(), 5.1, opts()));
    assert.ok(mid[4].alpha > 0 && mid[4].alpha < 1, 'line 4 is fading out');
    const done = R.view(overlap(), 5 + R.SCROLL, opts());
    assert.ok(done.shown.every((s) => s.alpha === 0 || s.alpha === 1));
  });
  test('no lines shows nothing', () => {
    assert.deepEqual(R.view([], 1, opts()), { cur: -1, active: false, shown: [] });
  });
});
