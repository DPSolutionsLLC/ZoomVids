import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
globalThis.ColumnMoves = loadModule('ColumnMoves');
const L = loadModule('Lyrics');
const LL = loadModule('LineLabels');

function counter(prefix = 'w') {
  let n = 0;
  return () => prefix + (++n);
}
function record(text, known = [], opts = {}) {
  const parsed = L.parse(text, counter(), known, opts);
  return parsed.slides.map((s, i) => Object.assign({ id: 'v' + i, lines: s.lines }, s.label ? { label: s.label } : {}));
}
const numsOf = (entries) => entries.map((e) => e.nums.map((x) => x.col + ':' + x.n).join(' '));

describe('numbers', () => {
  test('one column counts 1, 2, 3', () => {
    const out = LL.numbers([{ cols: [1] }, { cols: [1] }, { cols: [1] }], 1);
    assert.deepEqual(numsOf(out), ['1:1', '1:2', '1:3']);
    assert.deepEqual(out.map((e) => e.owner), [1, 1, 1]);
  });
  test('cols null shows in every column, owned by column 1', () => {
    const out = LL.numbers([{ cols: null }], 3);
    assert.equal(out[0].owner, 1);
    assert.deepEqual(numsOf(out), ['1:1 2:1 3:1']);
  });
  test('[2, 3] is owned by column 2 and column 1 does not advance', () => {
    const out = LL.numbers([{ cols: [1] }, { cols: [3, 2] }, { cols: [1] }], 3);
    assert.equal(out[1].owner, 2);
    assert.deepEqual(numsOf(out), ['1:1', '2:1 3:1', '1:2']);
  });
  test('each column keeps its own count', () => {
    const out = LL.numbers([{ cols: [1] }, { cols: [2] }, { cols: [2] }, { cols: [1] }, { cols: null }], 2);
    assert.deepEqual(numsOf(out), ['1:1', '2:1', '2:2', '1:2', '1:3 2:3']);
  });
  test('a position past the column count is ignored; only bad positions means column 1', () => {
    const out = LL.numbers([{ cols: [2, 5] }, { cols: [7] }, { cols: [] }], 2);
    assert.deepEqual(numsOf(out), ['2:1', '1:1', '1:2']);
    assert.deepEqual(out.map((e) => e.owner), [2, 1, 1]);
  });
});

describe('text', () => {
  const entry = { owner: 1, nums: [{ col: 1, n: 6 }, { col: 2, n: 4 }] };
  const names = ['Men', 'Women'];
  test('no columns reads Line N', () => {
    assert.equal(LL.text({ owner: 1, nums: [{ col: 1, n: 4 }] }, { multi: false }), 'Line 4');
  });
  test('columns with col names the column', () => {
    assert.equal(LL.text(entry, { col: 2, multi: true, names }), 'Women · Line 4');
  });
  test('a col the line is not in falls back to the owner', () => {
    assert.equal(LL.text(entry, { col: 3, multi: true, names }), 'Men · Line 6');
    assert.equal(LL.text(entry, { col: 3, multi: false }), 'Line 6');
  });
  test('columns with no col lists every column', () => {
    assert.equal(LL.text(entry, { multi: true, names }), 'Men · Line 6, Women · Line 4');
  });
  test('a missing name falls back to Column N', () => {
    assert.equal(LL.text(entry, { col: 2, multi: true, names: ['Men'] }), 'Column 2 · Line 4');
  });
  test('a null entry gives null, never an empty string', () => {
    assert.equal(LL.text(null, { multi: true, names }), null);
  });
});

describe('short', () => {
  const entry = { owner: 2, nums: [{ col: 2, n: 3 }, { col: 3, n: 9 }] };
  test('gives the number for col', () => assert.equal(LL.short(entry, 3), '9'));
  test('falls back to the owner', () => {
    assert.equal(LL.short(entry, 1), '3');
    assert.equal(LL.short(entry), '3');
  });
  test('null for a null entry', () => assert.equal(LL.short(null, 1), null));
});

describe('rowLines', () => {
  test('blank, [Chorus], a lone part tag and a lone = are not lines', () => {
    const rows = L.boxRows('[Chorus]\nHigh:\n\n=\nSing', { same: true });
    assert.deepEqual(LL.rowLines(rows), [null, null, null, null, { line: 0, cols: null }]);
  });
  test('an @ tag row is not a line', () => {
    const rows = L.boxRows('@Men\nSing out', { tags: true });
    assert.deepEqual(LL.rowLines(rows), [null, { line: 0, cols: [1] }]);
  });
  test('High: Glo-ri-a and =glo-ri-a are lines', () => {
    assert.deepEqual(LL.rowLines(L.boxRows('High: Glo-ri-a')), [{ line: 0, cols: null }]);
    assert.deepEqual(LL.rowLines(L.boxRows('=glo-ri-a', { same: true })), [{ line: 0, cols: null }]);
  });
  test('a tagged line with @Men @Women keeps its cols', () => {
    const rows = L.boxRows('@Men @Women Sing', { tags: true, tagNames: ['Men', 'Women'] });
    assert.deepEqual(LL.rowLines(rows), [{ line: 0, cols: [1, 2] }]);
  });
});

describe('rowLines agrees with the record', () => {
  function agree(verses, text, boxOpts, tagNames) {
    const flat = L.flatLines(verses);
    const lines = LL.rowLines(L.boxRows(text, boxOpts)).filter(Boolean);
    assert.equal(lines.length, flat.length);
    lines.forEach((l, i) => assert.equal(l.line, i));
    if (!tagNames) return;
    lines.forEach((l, i) => {
      const line = flat[i];
      if (l.cols === null) { assert.equal(line.cols, undefined); return; }
      assert.equal(Math.min(...l.cols), L.ownerCol(line, tagNames));
      for (let c = 1; c <= tagNames.length; c++) assert.equal(l.cols.includes(c), L.lineInCol(line, c, tagNames));
    });
  }
  test('a plain record with verses and a [Chorus]', () => {
    const verses = record('Come come ye saints\nNo toil nor labor fear\n\n[Chorus]\nAll is well\nAll is well\n\nWhy should we mourn\nAll is well');
    assert.equal(L.flatLines(verses).length, 6);
    agree(verses, L.recordText(verses), {});
  });
  test('a record with part tags and syllables', () => {
    const known = ['High', 'Low'];
    const verses = record('High: Glo-ri-a in ex-cel-sis\nLow: De-o Low: glo-ri-a\nHigh:\nSing it a-gain\nwell--known words', known);
    assert.equal(L.flatLines(verses).length, 4);
    agree(verses, L.recordText(verses), { knownParts: known });
  });
  test('a tagged record', () => {
    const verses = record('@Men\nWe sing\n@Women\nWe an-swer\n@Men @Women\nTo-geth-er now\n@All\nEv-ery-one\n\n@Women Just us\nBack to all', [], { tags: true });
    const tagNames = ['Men', 'Women'];
    assert.equal(L.flatLines(verses).length, 6);
    agree(verses, L.taggedText(verses), { tags: true, tagNames }, tagNames);
  });
});

describe('lineAt', () => {
  const spans = [{ key: 'a', start: 1, end: 3 }, { key: 'b', start: 3.5, end: 5 }, { key: 'c', start: 10, end: 12 }];
  test('before the first span gives null', () => assert.equal(LL.lineAt(spans, 0.5), null));
  test('inside a span gives its key', () => assert.equal(LL.lineAt(spans, 2), 'a'));
  test('overlapping spans pick the later start', () => {
    assert.equal(LL.lineAt([{ key: 'a', start: 1, end: 6 }, { key: 'b', start: 4, end: 8 }], 5), 'b');
  });
  test('a gap shorter than hold keeps the last line; a longer one gives null', () => {
    assert.equal(LL.lineAt(spans, 5 + LL.HOLD - 0.1), 'b');
    assert.equal(LL.lineAt(spans, 5 + LL.HOLD + 0.1), null);
    assert.equal(LL.lineAt(spans, 6, 0.5), null);
  });
  test('a tie in start picks the earlier entry', () => {
    assert.equal(LL.lineAt([{ key: 'x', start: 2, end: 4 }, { key: 'y', start: 2, end: 4 }], 3), 'x');
  });
});

describe('cleanOn', () => {
  test('only true is on', () => {
    assert.equal(LL.cleanOn(true), true);
    [false, 'true', 1, null, undefined, {}].forEach((v) => assert.equal(LL.cleanOn(v), false));
  });
});

describe('the module stands alone', () => {
  test('exports what the page uses', () => {
    assert.equal(LL.KEY, 'hp.lineLabels');
    ['cleanOn', 'numbers', 'text', 'short', 'rowLines', 'lineAt'].forEach((name) => assert.equal(typeof LL[name], 'function'));
  });
});
