import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const V = loadModule('LyricView');
const L = loadModule('Lyrics');
const W = loadModule('WordTiming');

function counter(prefix = 'w') {
  let n = 0;
  return () => prefix + (++n);
}
const PARTS = ['High', 'Low'];
const slideOf = (text) => L.parse(text, counter(), PARTS).slides[0];
const sylIds = (slide) => W.list(slide).map((e) => e.sylId);
function timed(text, times) {
  let slide = slideOf(text);
  const ids = sylIds(slide);
  times.forEach((pair, i) => { if (pair) slide = W.setTime(slide, ids[i], pair[0], pair[1]); });
  return slide;
}
const measure = (text, px) => text.length * px * 0.5;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, actual + ' is not ' + expected);
const sylPieces = (wrapped) => wrapped.lines.flatMap((ln) => ln.pieces).filter((p) => p.kind === 'syl');

describe('rows', () => {
  test('a line with one part gives one row with no part', () => {
    const rows = V.rows(timed('High: a b', [[0, 0.5], [0.5, 0.5]]));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].part, null);
    assert.equal(rows[0].start, 0);
    assert.equal(rows[0].end, 1);
  });
  test('two parts sung at the same moment split into one row each, in order', () => {
    const rows = V.rows(timed('High: a b Low: c d', [[0, 0.5], [0.5, 0.5], [0, 0.5], [0.5, 0.5]]));
    assert.deepEqual(rows.map((r) => r.part), ['High', 'Low']);
    assert.deepEqual(rows.map((r) => r.words.map((w) => L.wordText(w)).join(' ')), ['a b', 'c d']);
    assert.deepEqual(rows.map((r) => r.line), [0, 0]);
  });
  test('the same parts sung one after the other stay one row', () => {
    const rows = V.rows(timed('High: a b Low: c d', [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5]]));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].part, null);
  });
  test('an untimed slide gives rows with no start or end', () => {
    const rows = V.rows(slideOf('One two\nthree'));
    assert.equal(rows.length, 2);
    rows.forEach((r) => { assert.equal(r.start, null); assert.equal(r.end, null); });
  });
});

describe('pieces', () => {
  const textOf = (tokens) => {
    let out = '', pending = '';
    tokens.forEach((tok) => {
      if (tok.kind === 'label') { pending = tok.text; return; }
      out += (out ? ' ' : '') + pending + L.wordText(tok.word);
      pending = '';
    });
    return out;
  };
  test('labels show only with showParts on, and only where the part changes', () => {
    const slide = slideOf('x High: a b Low: c');
    const row = V.rows(slide)[0];
    assert.equal(V.pieces(row, false).filter((p) => p.kind === 'label').length, 0);
    const labels = V.pieces(row, true).filter((p) => p.kind === 'label').map((p) => p.text);
    assert.deepEqual(labels, ['High: ', 'Low: ']);
  });
  test('the joined text matches Lyrics.display for one line', () => {
    const slide = slideOf('x High: a b Low: c');
    const row = V.rows(slide)[0];
    assert.equal(textOf(V.pieces(row, true)), L.display(slide, true));
    assert.equal(textOf(V.pieces(row, false)), L.display(slide, false));
  });
});

describe('wrap', () => {
  test('syllables of one word sit flush, one after another', () => {
    const slide = timed('Glo-ri-a', [[0, 0.2], [0.3, 0.2], [0.6, 0.2]]);
    const syls = sylPieces(V.wrap(V.rows(slide), 1000, 10, false, measure));
    assert.deepEqual(syls.map((p) => p.text), ['Glo', 'ri', 'a']);
    for (let i = 1; i < syls.length; i++) {
      assert.ok(syls[i].dx > syls[i - 1].dx);
      close(syls[i - 1].dx + syls[i - 1].w, syls[i].dx);
    }
    assert.equal(syls[1].t, 0.3);
    assert.equal(syls[1].wordStart, 0);
    close(syls[1].wordEnd, 0.8);
  });
  test('wraps at word boundaries and never inside a word', () => {
    const slide = slideOf('aaa bbb ccc');
    const out = V.wrap(V.rows(slide), 40, 10, false, measure);
    assert.equal(out.lines.length, 2);
    assert.deepEqual(out.lines.map((ln) => ln.pieces.map((p) => p.text).join('|')), ['aaa|bbb', 'ccc']);
    const long = slideOf('Glo-ri-a in ex-cel-sis De-o');
    const narrow = V.wrap(V.rows(long), 30, 10, false, measure);
    assert.ok(narrow.lines.length > 1);
    const lineOfWord = {};
    narrow.lines.forEach((ln, i) => ln.pieces.forEach((p) => {
      if (lineOfWord[p.wordId] === undefined) lineOfWord[p.wordId] = i;
      assert.equal(lineOfWord[p.wordId], i, p.text + ' was split from its word');
    }));
  });
  test('a part label stays on the same line as its word', () => {
    const slide = slideOf('a High: bbbb');
    const out = V.wrap(V.rows(slide), 50, 10, true, measure);
    assert.equal(out.lines.length, 2);
    assert.equal(out.lines[1].pieces[0].kind, 'label');
    assert.equal(out.lines[1].pieces[0].text, 'High: ');
    assert.equal(out.lines[1].pieces[1].text, 'bbbb');
    close(out.lines[1].pieces[1].dx, measure('High: ', 10));
  });
});

describe('fitPx', () => {
  const spec = { size: 100, minSize: 10, fixed: false, lh: 1, w: 200, h: 100, showParts: false };
  test('shrinks until the rows fit', () => {
    const rows = V.rows(slideOf('aaaa bbbb'));
    const out = V.fitPx(rows, spec, measure);
    assert.ok(out.px < 100);
    assert.equal(out.fits, true);
    const m = V.wrap(rows, spec.w, out.px, false, measure);
    assert.ok(m.lines.length * out.px <= spec.h && m.maxW <= spec.w);
  });
  test('fixed keeps the size and says when it does not fit', () => {
    const out = V.fitPx(V.rows(slideOf('aaaa bbbb')), Object.assign({}, spec, { fixed: true }), measure);
    assert.deepEqual(out, { px: 100, fits: false });
  });
  test('adding a preview row lowers or keeps the size, never raises it', () => {
    const rows = V.rows(slideOf('aa bb\ncc'));
    const preview = V.rows(slideOf('dddd eeee')).slice(0, 1);
    const alone = V.fitPx(rows, spec, measure).px, withPreview = V.fitPx(rows.concat(preview), spec, measure).px;
    assert.ok(withPreview <= alone);
  });
});

describe('rowStates', () => {
  const three = () => V.rows(timed('a\nb\nc', [[1, 0.5], [2, 0.5], [3, 0.5]]));
  test('before the first word, row 0 is current and the rest are upcoming', () => {
    assert.deepEqual(V.rowStates(three(), 0), ['current', 'upcoming', 'upcoming']);
  });
  test('in the middle of row 1', () => {
    assert.deepEqual(V.rowStates(three(), 2.2), ['sung', 'current', 'upcoming']);
  });
  test('in a gap between rows, the next row is current', () => {
    assert.deepEqual(V.rowStates(three(), 1.7), ['sung', 'current', 'upcoming']);
  });
  test('two overlapping part rows are both current', () => {
    const rows = V.rows(timed('High: a Low: b\nc', [[1, 0.5], [1, 0.5], [3, 0.5]]));
    assert.deepEqual(V.rowStates(rows, 1.2), ['current', 'current', 'upcoming']);
  });
  test('after the last word all are sung, and untimed rows are plain', () => {
    assert.deepEqual(V.rowStates(three(), 10), ['sung', 'sung', 'sung']);
    assert.deepEqual(V.rowStates(V.rows(timed('a\nb', [[1, 0.5]])), 10), ['sung', 'plain']);
  });
});

describe('previewOn', () => {
  const rows = () => V.rows(timed('a\nb\nc', [[1, 0.5], [2, 0.5], [3, 0.5]]));
  test('off while the first row of three is current, on for the last row', () => {
    assert.equal(V.previewOn(V.rowStates(rows(), 0), 5, 10), false);
    assert.equal(V.previewOn(V.rowStates(rows(), 3.2), 5, 10), true);
    assert.equal(V.previewOn(V.rowStates(rows(), 9), 5, 10), true);
  });
  test('off once the next slide starts, or when there is none', () => {
    const states = V.rowStates(rows(), 3.2);
    assert.equal(V.previewOn(states, 10, 10), false);
    assert.equal(V.previewOn(states, 5, null), false);
  });
});

describe('lit', () => {
  test('sweep fills a syllable over its held time', () => {
    const p = sylPieces(V.wrap(V.rows(timed('Peace', [[1, 0.4]])), 1000, 10, false, measure))[0];
    close(V.lit(p, 1.2, 'sweep'), 0.5);
    assert.equal(V.lit(p, 0.9, 'sweep'), null);
    assert.equal(V.lit(p, 1.4, 'sweep'), null);
  });
  test('whole word lights every syllable, even between them', () => {
    const syls = sylPieces(V.wrap(V.rows(timed('Glo-ri-a', [[0, 0.2], [0.5, 0.2], [1, 0.2]])), 1000, 10, false, measure));
    syls.forEach((p) => assert.equal(V.lit(p, 0.3, 'word'), 1));
    syls.forEach((p) => assert.equal(V.lit(p, 1.2, 'word'), null));
  });
  test('labels and untimed syllables never light', () => {
    const out = V.wrap(V.rows(timed('a High: b', [[0, 1]])), 1000, 10, true, measure);
    const all = out.lines.flatMap((ln) => ln.pieces);
    const label = all.find((p) => p.kind === 'label'), untimed = all.find((p) => p.text === 'b');
    assert.equal(V.lit(label, 0.5, 'sweep'), null);
    assert.equal(V.lit(label, 0.5, 'word'), null);
    assert.equal(V.lit(untimed, 0.5, 'sweep'), null);
    assert.equal(V.lit(untimed, 0.5, 'word'), null);
  });
});

describe('countdown', () => {
  const opts = { style: 'dots', gap: 5, len: 3 };
  const sixGap = [{ start: 10, end: 11, txId: 'a', sylId: 's1' }, { start: 17, end: 18, txId: 'b', sylId: 's2' }];
  test('a 6 s break counts down for 3 s, one dot each second', () => {
    assert.equal(V.countdown(sixGap, 0, 13.5, opts), null);
    const a = V.countdown(sixGap, 0, 14.5, opts), b = V.countdown(sixGap, 0, 15.5, opts), c = V.countdown(sixGap, 0, 16.6, opts);
    assert.deepEqual([a.dots, b.dots, c.dots], [3, 2, 1]);
    assert.ok(a.fraction > b.fraction && b.fraction > c.fraction);
    assert.equal(a.total, 3);
    assert.equal(a.next.sylId, 's2');
  });
  test('a 4 s break gets no countdown', () => {
    const fourGap = [{ start: 10, end: 11 }, { start: 15, end: 16 }];
    assert.equal(V.countdown(fourGap, 0, 13.5, opts), null);
  });
  test('the song start counts as the end of the last singing', () => {
    const first = [{ start: 8, end: 9 }];
    const out = V.countdown(first, 0, 6, opts);
    assert.ok(out);
    assert.equal(out.dots, 2);
    assert.equal(V.countdown(first, null, 6, opts), null);
  });
  test('Off never counts down', () => {
    assert.equal(V.countdown(sixGap, 0, 15.5, { style: 'off', gap: 5, len: 3 }), null);
  });
  test('a count longer than the break starts right where the singing stopped', () => {
    const long = { style: 'bar', gap: 5, len: 10 };
    assert.equal(V.countdown(sixGap, 0, 10.99, long), null);
    const out = V.countdown(sixGap, 0, 11.01, long);
    assert.equal(out.total, 6);
    assert.equal(out.dots, 6);
  });
  test('it fades in over FADE', () => {
    close(V.countdown(sixGap, 0, 14, opts).alpha, 0);
    close(V.countdown(sixGap, 0, 14 + V.FADE / 2, opts).alpha, 0.5);
    assert.equal(V.countdown(sixGap, 0, 15, opts).alpha, 1);
  });
});

describe('countdownPlace', () => {
  const line = { x: 100, y: 200, w: 300 };
  test('the first line gets it above', () => {
    const p = V.countdownPlace(line, 0, 40, 3, 'dots');
    assert.equal(p.side, 'above');
    assert.equal(p.x, 100);
    close(p.y, 200 - 0.85 * 40);
    close(p.w, 60);
  });
  test('later lines get it on the left, ending 0.4 px before the line', () => {
    const p = V.countdownPlace(line, 2, 40, 3, 'dots');
    assert.equal(p.side, 'left');
    assert.equal(p.y, 200);
    close(p.x + p.w, 100 - 0.4 * 40);
  });
  test('the bar is the line width above and 2 px on the left', () => {
    assert.equal(V.countdownPlace(line, 0, 40, 3, 'bar').w, 300);
    const left = V.countdownPlace(line, 1, 40, 3, 'bar');
    assert.equal(left.w, 80);
    close(left.x + left.w, 84);
  });
});
