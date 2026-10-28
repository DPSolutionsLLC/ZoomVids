import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
const L = loadModule('Lyrics');

function counter(prefix = 'w') {
  let n = 0;
  return () => prefix + (++n);
}
const word = (id, ...syls) => ({ id, syls: syls.map((text, i) => ({ id: id + 's' + i, text })) });
const line = (id, text, extra) => Object.assign({ words: text.split(' ').map((w, i) => word(id + i, ...w.split('-'))) }, extra || {});
const verse = (id, ...lines) => ({ id, lines });
const tagged = (text, known = []) => L.parse(text, counter(), known, { tags: true });
const linesOf = (out) => out.slides.flatMap((s) => s.lines);
const textOf = (ln) => ln.words.map(L.wordText).join(' ');
const stripIds = (verses) => L.recordText(verses);

describe('cleanSong with any number of columns', () => {
  test('a legacy second becomes more[0] plus solo, and second is gone', () => {
    const out = L.cleanSong({
      view: 'roll', columns: true,
      second: {
        heading: 'Women', size: 80, solo: { x: 0.06, y: 0.52, w: 0.88, h: 0.42 },
        parked: { texts: [{ id: 't1', lyric: { lines: [line('c', 'Sing')], col: 2 } }], groups: [] }
      }
    });
    assert.equal('second' in out, false);
    assert.equal(out.more.length, 1);
    assert.equal(out.more[0].heading, 'Women');
    assert.equal(out.more[0].size, 80);
    assert.equal('solo' in out.more[0], false);
    assert.deepEqual(out.solo, { x: 0.06, y: 0.52, w: 0.88, h: 0.42 });
    assert.equal(out.more[0].parked.texts[0].id, 't1');
  });
  test('more with three entries round-trips', () => {
    const raw = { view: 'roll', columns: true, more: [{ heading: 'A' }, { heading: 'B', size: 50 }, { heading: 'C' }] };
    const once = L.cleanSong(raw);
    assert.deepEqual(once.more.map((c) => c.heading), ['A', 'B', 'C']);
    assert.deepEqual(L.cleanSong(once), once);
  });
  test('more wins over a legacy second', () => {
    const out = L.cleanSong({ view: 'roll', columns: true, more: [{ heading: 'New' }], second: { heading: 'Old' } });
    assert.deepEqual(out.more.map((c) => c.heading), ['New']);
  });
  test('entry tags is dropped when columns is off', () => {
    assert.equal('entry' in L.cleanSong({ view: 'roll', entry: 'tags', tagNames: ['Men'] }), false);
    assert.equal('tagNames' in L.cleanSong({ view: 'roll', entry: 'tags', tagNames: ['Men'] }), false);
    assert.equal(L.cleanSong({ view: 'roll', columns: true, entry: 'tags' }).entry, 'tags');
  });
  test('tagNames de-dupes case-insensitively and pads more', () => {
    const out = L.cleanSong({ view: 'roll', columns: true, entry: 'tags', tagNames: ['Men', 'men', 'Women', 'Kids', 'bad name!'] });
    assert.deepEqual(out.tagNames, ['Men', 'Women', 'Kids']);
    assert.equal(out.more.length, 2);
    assert.deepEqual(out.more[1], L.cleanColumn({}));
  });
  test('tagNames trims more from the end', () => {
    const out = L.cleanSong({ view: 'roll', columns: true, entry: 'tags', tagNames: ['Men', 'Women'], more: [{ heading: 'A' }, { heading: 'B' }, { heading: 'C' }] });
    assert.deepEqual(out.more.map((c) => c.heading), ['A']);
  });
  test('wasTagged is dropped while tagged and kept otherwise', () => {
    assert.equal('wasTagged' in L.cleanSong({ view: 'roll', columns: true, entry: 'tags', wasTagged: true }), false);
    assert.equal(L.cleanSong({ view: 'roll', wasTagged: true }).wasTagged, true);
    assert.equal('wasTagged' in L.cleanSong({ view: 'roll', wasTagged: 'yes' }), false);
  });
  test('line cols are kept only in tagged songs', () => {
    const verses = [verse('v', line('a', 'Sing', { cols: ['Men', 'men', 'Women'] }), line('b', 'Out', { cols: ['!!'] }))];
    const on = L.cleanSong({ view: 'roll', columns: true, entry: 'tags', tagNames: ['Men', 'Women'], verses });
    assert.deepEqual(on.verses[0].lines[0].cols, ['Men', 'Women']);
    assert.equal('cols' in on.verses[0].lines[1], false);
    const off = L.cleanSong({ view: 'roll', columns: true, verses });
    assert.equal('cols' in off.verses[0].lines[0], false);
  });
  test('tagged lines never keep same', () => {
    const out = L.cleanSong({ view: 'roll', columns: true, entry: 'tags', verses: [verse('v', line('a', 'Sing', { same: true }))] });
    assert.equal('same' in out.verses[0].lines[0], false);
  });
  test('a single-column song is unchanged, with no new keys', () => {
    const raw = { view: 'roll', showParts: true, parts: [{ name: 'High', color: '#FFD54A', hi: '#FFFFFF' }], verses: [Object.assign(verse('v1', line('a', 'A-maz-ing grace')), { label: 'One' })] };
    const out = L.cleanSong(raw);
    ['more', 'solo', 'entry', 'tagNames', 'wasTagged', 'columns', 'second'].forEach((k) => assert.equal(k in out, false, k));
    assert.deepEqual(out.verses, [{ id: 'v1', label: 'One', lines: [{ words: raw.verses[0].lines[0].words }] }]);
    assert.deepEqual(L.cleanSong(out), out);
  });
});

describe('cleanSlide and parking with column numbers', () => {
  const lyric = (col) => ({ lines: [line('a', 'Sing')], col });
  test('keeps col 2 and 5, drops 1, "3", 2.5 and 0', () => {
    assert.equal(L.cleanSlide(lyric(2)).col, 2);
    assert.equal(L.cleanSlide(lyric(5)).col, 5);
    [1, '3', 2.5, 0].forEach((col) => assert.equal('col' in L.cleanSlide(lyric(col)), false, String(col)));
  });
  test('the slides/roll parking drops any column 2 or higher', () => {
    const out = L.cleanSong({ view: 'slides', parked: { view: 'roll', texts: [{ id: 'a', lyric: lyric() }, { id: 'b', lyric: lyric(3) }], groups: [] } });
    assert.deepEqual(out.parked.texts.map((t) => t.id), ['a']);
  });
  test('cleanColumn parking keeps any column 2 or higher', () => {
    const out = L.cleanColumn({ parked: { texts: [{ id: 'a', lyric: lyric() }, { id: 'b', lyric: lyric(3) }, { id: 'c', lyric: lyric(2) }] } });
    assert.deepEqual(out.parked.texts.map((t) => t.id), ['b', 'c']);
  });
  test('cleanColumn of nothing is the defaults', () => {
    assert.deepEqual(L.cleanColumn({}), { heading: null, frame: L.COL2_FRAME, size: L.ROLL_SIZE });
  });
});

describe('tagToken and tagDisplay', () => {
  test('spaces become _ and odd characters go', () => {
    assert.equal(L.tagToken('  Young  Women! '), 'Young_Women');
    assert.equal(L.tagToken('Men'), 'Men');
    assert.equal(L.tagToken("Kids' choir"), "Kids'_choir");
  });
  test('empty, invalid or reserved gives null, never an empty string', () => {
    assert.equal(L.tagToken(''), null);
    assert.equal(L.tagToken('!!!'), null);
    assert.equal(L.tagToken(null), null);
    assert.equal(L.tagToken('All'), null);
  });
  test('cut to 40', () => {
    assert.equal(L.tagToken('x'.repeat(60)).length, 40);
  });
  test('tagDisplay shows _ as a space', () => {
    assert.equal(L.tagDisplay('Young_Women'), 'Young Women');
    assert.equal(L.tagDisplay(''), null);
  });
});

describe('parse with column tags', () => {
  test('a tag row switches the block and carries across a blank line and a label', () => {
    const out = tagged('@Men\nOne\n\n[Chorus]\nTwo\n@Women\nThree');
    const lines = linesOf(out);
    assert.deepEqual(lines.map((l) => l.cols), [['Men'], ['Men'], ['Women']]);
    assert.equal(out.slides[1].label, 'Chorus');
  });
  test('@Men @Women gives both, @All gives no cols', () => {
    const lines = linesOf(tagged('@Men @Women\nBoth\n@All\nEvery'));
    assert.deepEqual(lines[0].cols, ['Men', 'Women']);
    assert.equal('cols' in lines[1], false);
  });
  test('a one-line tag affects only that line', () => {
    const lines = linesOf(tagged('@Men\nOne\n@Women Two\nThree'));
    assert.deepEqual(lines.map((l) => l.cols), [['Men'], ['Women'], ['Men']]);
    assert.equal(textOf(lines[1]), 'Two');
  });
  test('lines before the first tag have no cols', () => {
    const lines = linesOf(tagged('Intro\n@Men\nOne'));
    assert.equal('cols' in lines[0], false);
  });
  test('tags come back in first-appearance order with the first spelling', () => {
    assert.deepEqual(tagged('@Women\nA\n@men\nB\n@WOMEN\nC\n@Men D').tags, ['Women', 'men']);
  });
  test('a one-line tag keeps a part tag after it', () => {
    const lines = linesOf(L.parse('@Men High: Sing', counter(), ['High'], { tags: true }));
    assert.equal(lines[0].words[0].part, 'High');
    assert.deepEqual(lines[0].cols, ['Men']);
  });
  test('without opts.tags @Men is a plain word', () => {
    const out = L.parse('@Men\nOne', counter(), []);
    assert.deepEqual(out.tags, []);
    assert.equal(textOf(out.slides[0].lines[0]), '@Men');
  });
  test('an invalid @ token is a plain word', () => {
    const lines = linesOf(tagged('@ Sing\n@!x Go'));
    assert.equal(textOf(lines[0]), '@ Sing');
    assert.equal(textOf(lines[1]), '@!x Go');
    assert.equal('cols' in lines[0], false);
  });
  test('a tag row does not end the slide', () => {
    const out = tagged('One\n@Men\nTwo');
    assert.equal(out.slides.length, 1);
    assert.equal(out.slides[0].lines.length, 2);
  });
});

describe('taggedText and taggedRanges', () => {
  const rec = () => [
    Object.assign(verse('v1', line('a', 'In-tro'), line('b', 'Come all', { cols: ['Men'] }), line('c', 'and see', { cols: ['Men'] })), { label: 'Verse 1' }),
    verse('v2', line('d', 'Glo-ri-a', { cols: ['Men', 'Women'] }), line('e', 'Peace', { cols: ['Men'] }), line('f', 'Joy', { cols: ['Women'] }), line('g', 'Love', { cols: ['Women'] })),
    Object.assign(verse('v3', line('h', 'All sing'), line('i', 'Amen')), { label: 'End' })
  ];
  test('prints tag rows, one-line tags, @All and labels', () => {
    assert.equal(L.taggedText(rec()), [
      '[Verse 1]', 'In-tro', '@Men', 'Come all', 'and see', '', '@Men @Women Glo-ri-a', 'Peace', '@Women', 'Joy', 'Love', '', '[End]', '@All', 'All sing', 'Amen'
    ].join('\n'));
  });
  test('a single different line prints inline as a one-line tag', () => {
    const text = L.taggedText([verse('v', line('a', 'One', { cols: ['Men'] }), line('b', 'Two', { cols: ['Women'] }), line('c', 'Three', { cols: ['Men'] }))]);
    assert.equal(text, '@Men\nOne\n@Women Two\nThree');
  });
  test('the last line prints inline when it differs', () => {
    assert.equal(L.taggedText([verse('v', line('a', 'One'), line('b', 'Two', { cols: ['Men'] }))]), 'One\n@Men Two');
  });
  test('round trip keeps lines, cols, verse breaks, labels and parts', () => {
    const src = '[Verse 1]\nIntro\n@Men\nHigh: Come all\nand see\n\n@Men @Women Glo-ri-a\nPeace\n@Women\nJoy Low: Love\n\n[End]\n@All\nAll sing';
    const first = tagged(src, ['High', 'Low']);
    const verses = first.slides.map((s, i) => Object.assign({ id: 'v' + i }, s));
    const second = tagged(L.taggedText(verses), ['High', 'Low']);
    const shape = (out) => out.slides.map((s) => ({ label: s.label, lines: s.lines.map((l) => ({ cols: l.cols, words: l.words.map((w) => [L.wordText(w), w.part || '', w.syls.length]) })) }));
    assert.deepEqual(shape(second), shape(first));
  });
  test('ranges slice out each verse block', () => {
    const verses = rec(), text = L.taggedText(verses), ranges = L.taggedRanges(verses);
    assert.deepEqual(ranges.map((r) => r.id), ['v1', 'v2', 'v3']);
    assert.equal(text.slice(ranges[0].from, ranges[0].to), '[Verse 1]\nIn-tro\n@Men\nCome all\nand see');
    assert.equal(text.slice(ranges[1].from, ranges[1].to), '@Men @Women Glo-ri-a\nPeace\n@Women\nJoy\nLove');
    assert.equal(text.slice(ranges[2].from, ranges[2].to), '[End]\n@All\nAll sing\nAmen');
    assert.equal(ranges[2].to, text.length);
  });
});

describe('applyText with tags', () => {
  test('retagging a line keeps its word ids and returns the tags', () => {
    const verses = [verse('v1', line('a', 'Come all', { cols: ['Men'] }), line('b', 'and see', { cols: ['Men'] }))];
    const out = L.applyText(verses, '@Men\nCome all\n@Women\nand see', counter('n'), [], { tags: true });
    assert.deepEqual(out.tags, ['Men', 'Women']);
    assert.deepEqual(out.verses[0].lines[1].cols, ['Women']);
    assert.deepEqual(out.verses[0].lines[1].words.map((w) => w.id), ['b0', 'b1']);
    assert.deepEqual(out.verses[0].lines[0].words.map((w) => w.id), ['a0', 'a1']);
  });
  test('without opts.tags tags is empty', () => {
    assert.deepEqual(L.applyText([], 'One', counter('n'), []).tags, []);
  });
});

describe('ownerCol and lineInCol', () => {
  const names = ['Men', 'Women', 'Kids'];
  test('no cols means column 1 and every column', () => {
    assert.equal(L.ownerCol({ words: [] }, names), 1);
    [1, 2, 3].forEach((c) => assert.equal(L.lineInCol({ words: [] }, c, names), true));
  });
  test('one column', () => {
    const ln = { words: [], cols: ['women'] };
    assert.equal(L.ownerCol(ln, names), 2);
    assert.deepEqual([1, 2, 3].map((c) => L.lineInCol(ln, c, names)), [false, true, false]);
  });
  test('several out of order: the lowest wins', () => {
    const ln = { words: [], cols: ['Kids', 'Women'] };
    assert.equal(L.ownerCol(ln, names), 2);
    assert.deepEqual([1, 2, 3].map((c) => L.lineInCol(ln, c, names)), [false, true, true]);
  });
  test('unknown names are ignored, none known gives column 1', () => {
    assert.equal(L.ownerCol({ words: [], cols: ['Nobody', 'Kids'] }, names), 3);
    assert.equal(L.ownerCol({ words: [], cols: ['Nobody'] }, names), 1);
  });
});

describe('mergeTagNames', () => {
  test('keeps old order, appends new names, drops gone names', () => {
    assert.deepEqual(L.mergeTagNames(['Men', 'Women', 'Kids'], ['Kids', 'Choir', 'Men']), { names: ['Men', 'Kids', 'Choir'], map: [0, 2, -1] });
  });
  test('a case change takes the new spelling', () => {
    assert.deepEqual(L.mergeTagNames(['Men'], ['MEN']), { names: ['MEN'], map: [0] });
  });
  test('from nothing', () => {
    assert.deepEqual(L.mergeTagNames([], ['A', 'B', 'a']), { names: ['A', 'B'], map: [-1, -1] });
    assert.deepEqual(L.mergeTagNames(['A'], []), { names: [], map: [] });
  });
});

describe('spreadFrames and frameArea', () => {
  test('two on the default area are the old column frames', () => {
    assert.deepEqual(L.spreadFrames(2), [L.COL1_FRAME, L.COL2_FRAME]);
  });
  test('three and five get even widths with a 0.02 gap', () => {
    [3, 5].forEach((n) => {
      const f = L.spreadFrames(n);
      assert.equal(f.length, n);
      const w = (0.94 - 0.02 * (n - 1)) / n;
      f.forEach((fr, i) => {
        assert.ok(Math.abs(fr.w - w) < 1e-4, n + ' w');
        assert.ok(Math.abs(fr.x - (0.03 + i * (w + 0.02))) < 1e-4, n + ' x' + i);
        assert.equal(fr.y, 0.3);
        assert.equal(fr.h, 0.64);
      });
      const last = f[n - 1];
      assert.ok(Math.abs(last.x + last.w - 0.97) < 1e-3);
    });
  });
  test('one gives the area', () => {
    assert.deepEqual(L.spreadFrames(1, { x: 0.1, y: 0.2, w: 0.5, h: 0.5 }), [{ x: 0.1, y: 0.2, w: 0.5, h: 0.5 }]);
  });
  test('frameArea is the bounding box, or the default area', () => {
    assert.deepEqual(L.frameArea([{ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, { x: 0.5, y: 0.1, w: 0.2, h: 0.2 }]), { x: 0.1, y: 0.1, w: 0.6, h: 0.5 });
    assert.deepEqual(L.frameArea([]), L.DEFAULT_AREA);
    assert.deepEqual(L.frameArea(L.spreadFrames(2)), L.DEFAULT_AREA);
  });
});

describe('combineColumns', () => {
  const names = ['Men', 'Women', 'Kids'];
  test('interleaves by start and keeps word ids', () => {
    const out = L.combineColumns({
      columns: [[verse('m', line('a', 'M1'), line('b', 'M2'))], [verse('w', line('c', 'W1'), line('d', 'W2'))]],
      names: ['Men', 'Women'], links: [[]], starts: [[0, 10], [5, 15]]
    }, counter('v'));
    const lines = out.verses.flatMap((v) => v.lines);
    assert.deepEqual(lines.map(textOf), ['M1', 'W1', 'M2', 'W2']);
    assert.deepEqual(lines.map((l) => l.cols), [['Men'], ['Women'], ['Men'], ['Women']]);
    assert.equal(lines[1].words[0].id, 'c0');
  });
  test('null starts follow the previous line in the same column', () => {
    const out = L.combineColumns({
      columns: [[verse('m', line('a', 'M1'), line('b', 'M2'))], [verse('w', line('c', 'W1'), line('d', 'W2'))]],
      names: ['Men', 'Women'], links: [[]], starts: [[0, null], [5, null]]
    }, counter('v'));
    assert.deepEqual(out.verses.flatMap((v) => v.lines).map(textOf), ['M1', 'M2', 'W1', 'W2']);
  });
  test('ties go to the lower column', () => {
    const out = L.combineColumns({
      columns: [[verse('m', line('a', 'M1'))], [verse('w', line('c', 'W1'))], [verse('k', line('e', 'K1'))]],
      names, links: [[], []], starts: [[3], [3], [3]]
    }, counter('v'));
    assert.deepEqual(out.verses.flatMap((v) => v.lines).map(textOf), ['M1', 'W1', 'K1']);
  });
  test("a column's own order is never broken, even with crossing starts", () => {
    const out = L.combineColumns({
      columns: [[verse('m', line('a', 'M1'), line('b', 'M2'))], [verse('w', line('c', 'W1'))]],
      names: ['Men', 'Women'], links: [[]], starts: [[10, 2], [5]]
    }, counter('v'));
    assert.deepEqual(out.verses.flatMap((v) => v.lines).map(textOf), ['W1', 'M1', 'M2']);
  });
  test('= links add the column name to the column 1 line, and full membership drops cols', () => {
    const out = L.combineColumns({
      columns: [[verse('m', line('a', 'Glo-ri-a'), line('b', 'M2'))], [verse('w', line('c', 'Glo-ri-a', { same: true }), line('d', 'W2'))]],
      names: ['Men', 'Women'], links: [[{ col2: 0, col1: 0 }]], starts: [[0, 10], [null, 12]]
    }, counter('v'));
    const lines = out.verses.flatMap((v) => v.lines);
    assert.deepEqual(lines.map(textOf), ['Gloria', 'M2', 'W2']);
    assert.equal('cols' in lines[0], false);
    assert.equal('same' in lines[0], false);
    assert.deepEqual(lines[1].cols, ['Men']);
  });
  test('verse breaks and labels', () => {
    const out = L.combineColumns({
      columns: [
        [Object.assign(verse('m1', line('a', 'M1')), { label: 'One' }), Object.assign(verse('m2', line('b', 'M2')), { label: 'Two' })],
        [verse('w1', line('c', 'W1')), verse('w2', line('d', 'W2'))]
      ],
      names: ['Men', 'Women'], links: [[]], starts: [[0, 10], [5, 15]]
    }, counter('n'));
    assert.deepEqual(out.verses.map((v) => [v.id, v.label, v.lines.map(textOf)]), [['m1', 'One', ['M1', 'W1']], ['m2', 'Two', ['M2', 'W2']]]);
  });
  test('a labelled verse in another column joins a combined verse with the same label', () => {
    const out = L.combineColumns({
      columns: [[Object.assign(verse('m1', line('a', 'M1')), { label: 'One' })], [Object.assign(verse('w1', line('c', 'W1')), { label: 'One' })]],
      names: ['Men', 'Women'], links: [[]], starts: [[0], [5]]
    }, counter('n'));
    assert.deepEqual(out.verses.map((v) => [v.id, v.label, v.lines.map(textOf)]), [['m1', 'One', ['M1', 'W1']]]);
  });
  test('a new unlabelled verse in a column that already sang in this verse starts a new one', () => {
    const out = L.combineColumns({
      columns: [[verse('m1', line('a', 'M1')), verse('m2', line('b', 'M2'))], [verse('w1', line('c', 'W1'))]],
      names: ['Men', 'Women'], links: [[]], starts: [[0, 10], [5]]
    }, counter('n'));
    assert.deepEqual(out.verses.map((v) => [v.id, v.lines.map(textOf)]), [['m1', ['M1', 'W1']], ['m2', ['M2']]]);
  });
});

describe('splitColumns', () => {
  const names = ['Men', 'Women', 'Kids'];
  test('a column 1 line shared with column 2 becomes a same line with fresh ids', () => {
    const out = L.splitColumns([verse('v1', line('a', 'Glo-ri-a', { cols: ['Men', 'Women'] }), line('b', 'W', { cols: ['Women'] }))], ['Men', 'Women'], counter('n'));
    assert.deepEqual(out.columns[0], [{ id: 'v1', lines: [{ words: line('a', 'Glo-ri-a').words }] }]);
    const two = out.columns[1][0].lines;
    assert.equal(two[0].same, true);
    assert.notEqual(two[0].words[0].id, 'a0');
    assert.equal(L.wordText(two[0].words[0]), 'Gloria');
    assert.equal(two[1].words[0].id, 'b0');
    assert.deepEqual(out.copies, []);
  });
  test('a line shared by columns 2 and 3 goes to copies', () => {
    const shared = line('a', 'Hi', { cols: ['Women', 'Kids'] });
    const out = L.splitColumns([verse('v1', line('z', 'M'), shared)], names, counter('n'));
    assert.equal(out.columns[1][0].lines[1].words[0].id, 'a0');
    const copied = out.columns[2][0].lines[1];
    assert.notEqual(copied.words[0].id, 'a0');
    assert.equal('same' in copied, false);
    assert.equal(out.copies.length, 1);
    assert.equal(out.copies[0].col, 3);
    assert.equal(out.copies[0].line, copied);
    assert.equal(out.copies[0].fromLine, shared);
  });
  test('verse ids and labels; empty columns are empty', () => {
    const out = L.splitColumns([Object.assign(verse('v1', line('a', 'One', { cols: ['Women'] })), { label: 'Chorus' })], names, counter('n'));
    assert.deepEqual(out.columns[0], []);
    assert.equal(out.columns[1][0].label, 'Chorus');
    assert.notEqual(out.columns[1][0].id, 'v1');
    assert.deepEqual(out.columns[2], []);
  });
  test('round trip: boxes to one text and back gives the same text per column', () => {
    const cols = [
      [Object.assign(verse('m1', line('a', 'Come all'), line('b', 'Glo-ri-a')), { label: 'One' }), Object.assign(verse('m2', line('c', 'Peace')), { label: 'Two' })],
      [Object.assign(verse('w1', line('d', 'Sing out'), line('e', 'Glo-ri-a', { same: true })), { label: 'One' }), Object.assign(verse('w2', line('f', 'Joy')), { label: 'Two' })],
      [Object.assign(verse('k1', line('g', 'Clap')), { label: 'One' }), Object.assign(verse('k2', line('h', 'Hoo-ray')), { label: 'Two' })]
    ];
    const links = [L.sharedLinks(cols[0], cols[1]).links, L.sharedLinks(cols[0], cols[2]).links];
    const combined = L.combineColumns({ columns: cols, names, links, starts: [[0, 4, 10], [2, 4, 12], [3, 14]] }, counter('n'));
    const back = L.splitColumns(combined.verses, names, counter('x'));
    assert.deepEqual(back.columns.map(stripIds), cols.map(stripIds));
  });
});

describe('boxRows', () => {
  const joined = (rows) => rows.map((r) => r.segs.map((s) => s.text).join(''));
  test('segments join back to each row exactly, for every kind', () => {
    const text = '  [Chorus]  \n@Men   @Women\n\n   \nHigh:  Glo-ri-a   in\n= Sing\n@Kids  Clap  hands ';
    [{ tags: true }, { same: true }, {}].forEach((opts) => {
      const rows = L.boxRows(text, opts);
      assert.equal(rows.length, text.split('\n').length);
      assert.deepEqual(joined(rows), text.split('\n'));
    });
  });
  test('kinds', () => {
    const rows = L.boxRows('[Chorus]\n@Men\n\nSing', { tags: true });
    assert.deepEqual(rows.map((r) => r.kind), ['label', 'tagrow', 'blank', 'line']);
  });
  test('a part scope ends at a blank line', () => {
    const rows = L.boxRows('High:\nSing out\n\nAgain', { knownParts: ['High'] });
    assert.deepEqual(rows[1].segs.filter((s) => s.kind === 'part').map((s) => [s.text, s.part]), [['Sing', 'High'], ['out', 'High']]);
    assert.equal(rows[0].segs[0].kind, 'mark');
    assert.equal(rows[3].segs.some((s) => s.kind === 'part'), false);
  });
  test('a known part mid-line switches; an unknown one is a word', () => {
    const rows = L.boxRows('Sing low: out Bass: deep', { knownParts: ['Low'] });
    assert.deepEqual(rows[0].segs.filter((s) => s.kind !== 'text').map((s) => [s.kind, s.text, s.part]), [
      ['mark', 'low:', undefined], ['part', 'out', 'Low'], ['part', 'Bass:', 'Low'], ['part', 'deep', 'Low']
    ]);
  });
  test('cols follow tag rows and one-line tags', () => {
    const rows = L.boxRows('Intro\n@Men\nOne\n@Women Two\nThree\n@Men @Women\nBoth\n@All\nEvery', { tags: true, tagNames: ['Men', 'Women'] });
    assert.deepEqual(rows.map((r) => r.cols), [null, [1], [1], [2], [1], [1, 2], [1, 2], null, null]);
    assert.equal(rows[3].segs[0].kind, 'tag');
  });
  test('a new name while typing gets the position it will get', () => {
    const rows = L.boxRows('@Kids\nClap\n@Men\nSing', { tags: true, tagNames: ['Men', 'Women'] });
    assert.deepEqual(rows[1].cols, [2]);
    assert.deepEqual(rows[3].cols, [1]);
  });
  test('= is a mark only with opts.same', () => {
    assert.equal(L.boxRows('= Sing', { same: true })[0].segs[0].kind, 'mark');
    assert.equal(L.boxRows('=Sing', { same: true })[0].segs[0].text, '=');
    assert.equal(L.boxRows('= Sing', {})[0].segs[0].kind, 'text');
    assert.equal(L.boxRows('= Sing', { tags: true, same: true })[0].segs[0].kind, 'text');
  });
  test('@ tokens are plain text without tags', () => {
    const rows = L.boxRows('@Men Sing', {});
    assert.equal(rows[0].segs.some((s) => s.kind === 'tag'), false);
    assert.equal(rows[0].cols, null);
  });
});

describe('partColorFor', () => {
  const parts = [{ name: 'High', color: '#111111' }];
  test('a known part keeps its color', () => {
    assert.equal(L.partColorFor('high', parts, []), '#111111');
  });
  test('new names get the next palette colors in order', () => {
    assert.equal(L.partColorFor('Low', parts, ['Low', 'Mid']), L.PALETTE[1]);
    assert.equal(L.partColorFor('Mid', parts, ['Low', 'Mid']), L.PALETTE[2]);
  });
  test('matches addParts, which skips the sing color', () => {
    const song = L.addParts({ singColor: L.PALETTE[0] }, ['A', 'B']);
    assert.equal(L.partColorFor('A', [], ['A', 'B'], L.PALETTE[0]), song.parts[0].color);
    assert.equal(L.partColorFor('B', [], ['A', 'B'], L.PALETTE[0]), song.parts[1].color);
  });
  test('no part gives null', () => {
    assert.equal(L.partColorFor('', parts, []), null);
  });
});
