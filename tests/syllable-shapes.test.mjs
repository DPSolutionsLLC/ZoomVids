import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
globalThis.ColumnMoves = loadModule('ColumnMoves');
const L = loadModule('Lyrics');
const S = loadModule('SylShape');
const V = loadModule('LyricView');

function counter(prefix = 'w') {
  let n = 0;
  return () => prefix + (++n);
}
const allSyls = (slide) => slide.lines.flatMap((ln) => ln.words.flatMap((w) => w.syls));
const allWords = (slide) => slide.lines.flatMap((ln) => ln.words);
const wordNamed = (slide, text) => allWords(slide).find((w) => L.wordText(w) === text);
function recordFrom(text) {
  const parsed = L.parse(text, counter('x'));
  const verseId = counter('v');
  return parsed.slides.map((s) => ({ id: verseId(), lines: s.lines }));
}
function shaped(verses, levelById) {
  return verses.map((v) => Object.assign({}, v, { lines: L.setLevels(v.lines, levelById).lines }));
}
function shapeWord(verses, verseIndex, text, levels) {
  const w = wordNamed(verses[verseIndex], text), pick = {};
  w.syls.forEach((s, i) => { pick[s.id] = levels[i]; });
  return shaped(verses, pick);
}

describe('SylShape.step', () => {
  test('moves one level and stops at the top and bottom', () => {
    assert.equal(S.step(0, 1), 1);
    assert.equal(S.step(6, 1), 6);
    assert.equal(S.step(-6, -1), -6);
  });
  test('a missing level counts as flat, and a fraction rounds', () => {
    assert.equal(S.step(undefined, 1), 1);
    assert.equal(S.step(1.4, 0), 1);
  });
  test('the top level matches the one Lyrics keeps', () => {
    assert.equal(S.MAX, L.LEVEL_MAX);
  });
});

describe('SylShape.dy', () => {
  test('up is negative y, down is positive', () => {
    assert.equal(S.dy(2, 100, 30), -60);
    assert.equal(S.dy(-1, 100, 30), 30);
  });
  test('flat or missing gives exactly 0, never -0', () => {
    assert.ok(Object.is(S.dy(0, 100, 30), 0));
    assert.ok(Object.is(S.dy(undefined, 100, 30), 0));
  });
});

describe('Lyrics.cleanLevel', () => {
  test('keeps whole levels and clamps to the range', () => {
    assert.equal(L.cleanLevel(3), 3);
    assert.equal(L.cleanLevel(9), 6);
    assert.equal(L.cleanLevel(-9), -6);
    assert.equal(L.cleanLevel(2.6), 3);
  });
  test('flat or bad values give null', () => {
    assert.equal(L.cleanLevel(0), null);
    assert.equal(L.cleanLevel('2'), null);
    assert.equal(L.cleanLevel(NaN), null);
    assert.equal(L.cleanLevel(Infinity), null);
  });
});

describe('levels are kept by cleaning', () => {
  const rawVerse = (lvs) => ({ id: 'v1', lines: [{ words: [{ id: 'w1', syls: lvs.map((lv, i) => ({ id: 's' + i, text: 'la', lv })) }] }] });
  test('cleanSong keeps a good level on record syllables and drops bad ones', () => {
    const out = L.cleanSong({ verses: [rawVerse([2, 0, 'x', Infinity, -1])] });
    const syls = allSyls(out.verses[0]);
    assert.deepEqual(syls.map((s) => s.lv), [2, undefined, undefined, undefined, -1]);
    assert.ok(syls.every((s) => !('t' in s) && !('d' in s)));
  });
  test('cleanSlide keeps a level next to the timing', () => {
    const out = L.cleanSlide({ lines: [{ words: [{ id: 'w1', syls: [{ id: 's1', text: 'Glo', t: 1, d: 0.5, lv: 2 }] }] }] });
    assert.deepEqual(allSyls(out)[0], { id: 's1', text: 'Glo', t: 1, d: 0.5, lv: 2 });
  });
  test('fillSlide copies levels from the verse into the block', () => {
    const verses = shapeWord(recordFrom('Glo-ri-a in'), 0, 'Gloria', [1, 2, 0]);
    const block = L.fillSlide(verses[0], 0, []);
    assert.deepEqual(allSyls(block).map((s) => s.lv), [1, 2, undefined, undefined]);
  });
});

describe('Update keeps or clears shapes', () => {
  const base = 'Glo-ri-a in\nex-cel-sis\n\nPeace on earth';
  test('unchanged text keeps every level and clears nothing', () => {
    const verses = shapeWord(recordFrom(base), 0, 'excelsis', [1, 2, 3]);
    const res = L.applyText(verses, L.recordText(verses), counter('n'));
    assert.deepEqual(wordNamed(res.verses[0], 'excelsis').syls.map((s) => s.lv), [1, 2, 3]);
    assert.deepEqual(res.cleared, []);
  });
  test('re-marking a shaped word clears it and names it; other shaped words keep theirs', () => {
    let verses = shapeWord(recordFrom(base), 0, 'Gloria', [1, 2, 1]);
    verses = shapeWord(verses, 0, 'excelsis', [0, 1, 0]);
    const text = L.recordText(verses).replace('Glo-ri-a', 'Glor-i-a');
    const res = L.applyText(verses, text, counter('n'));
    const gloria = wordNamed(res.verses[0], 'Gloria');
    assert.deepEqual(gloria.syls.map((s) => s.text), ['Glor', 'i', 'a']);
    assert.equal(gloria.id, wordNamed(verses[0], 'Gloria').id);
    assert.ok(gloria.syls.every((s) => !('lv' in s)));
    assert.deepEqual(res.cleared, ['Gloria']);
    assert.deepEqual(wordNamed(res.verses[0], 'excelsis').syls.map((s) => s.lv), [undefined, 1, undefined]);
  });
  test('the same word re-marked in two verses is named once', () => {
    let verses = recordFrom('Glo-ri-a in\n\nGlo-ri-a now');
    verses = shapeWord(verses, 0, 'Gloria', [1, 0, 0]);
    verses = shapeWord(verses, 1, 'Gloria', [0, 2, 0]);
    const res = L.applyText(verses, L.recordText(verses).split('Glo-ri-a').join('Glor-i-a'), counter('n'));
    assert.deepEqual(res.cleared, ['Gloria']);
  });
  test('re-marking a word with no shape clears nothing', () => {
    const verses = shapeWord(recordFrom(base), 0, 'excelsis', [1, 1, 1]);
    const res = L.applyText(verses, L.recordText(verses).replace('Glo-ri-a', 'Glor-i-a'), counter('n'));
    assert.deepEqual(res.cleared, []);
    assert.deepEqual(wordNamed(res.verses[0], 'excelsis').syls.map((s) => s.lv), [1, 1, 1]);
  });
});

describe('Lyrics.setLevels', () => {
  const lines = () => recordFrom('Glo-ri-a in')[0].lines;
  test('sets, changes and removes levels, counting only real changes', () => {
    const start = lines(), [a, b, c] = allSyls({ lines: start });
    const first = L.setLevels(start, { [a.id]: 2, [b.id]: -1, [c.id]: 0 });
    assert.equal(first.changed, 2);
    assert.deepEqual(allSyls({ lines: first.lines }).map((s) => s.lv), [2, -1, undefined, undefined]);
    const second = L.setLevels(first.lines, { [a.id]: 2, [b.id]: 0 });
    assert.equal(second.changed, 1);
    assert.deepEqual(allSyls({ lines: second.lines }).map((s) => s.lv), [2, undefined, undefined, undefined]);
  });
  test('never changes its input', () => {
    const start = lines(), before = JSON.stringify(start), id = allSyls({ lines: start })[0].id;
    L.setLevels(start, { [id]: 3 });
    assert.equal(JSON.stringify(start), before);
  });
  test('hasShape is true only when some syllable has a level', () => {
    const start = lines(), id = allSyls({ lines: start })[0].id;
    assert.equal(L.hasShape({ lines: start }), false);
    assert.equal(L.hasShape({ lines: L.setLevels(start, { [id]: 1 }).lines }), true);
  });
});

describe('LyricView pieces carry the level', () => {
  test('a shaped syllable gets lv, a flat one has no lv key', () => {
    const verse = shapeWord(recordFrom('Glo-ri-a'), 0, 'Gloria', [0, 2, 0])[0];
    const measure = (text, px) => text.length * px * 0.5;
    const pieces = V.wrap(V.rows(verse), 1000, 10, false, measure).lines.flatMap((ln) => ln.pieces).filter((p) => p.kind === 'syl');
    assert.equal(pieces[1].lv, 2);
    assert.ok(!('lv' in pieces[0]));
    assert.ok(!('lv' in pieces[2]));
  });
});

describe('levelHeight setting', () => {
  const twoColumns = (set) => L.cleanSong({ view: 'roll', columns: true, levelHeight: 50, more: [{ verses: [], set }] });
  test('defaults to 30, clamps to 10–100 and rounds to steps of 5', () => {
    assert.equal(L.cleanSong({}).levelHeight, 30);
    assert.equal(L.cleanSong({ levelHeight: 5 }).levelHeight, 10);
    assert.equal(L.cleanSong({ levelHeight: 200 }).levelHeight, 100);
    assert.equal(L.cleanSong({ levelHeight: 42 }).levelHeight, 40);
    assert.equal(L.cleanSong({ levelHeight: '40' }).levelHeight, 30);
  });
  test('cleanSong keeps it in its output', () => {
    assert.equal(L.cleanSong({ levelHeight: 60 }).levelHeight, 60);
  });
  test('a column 2 with no level height of its own takes Column 1’s', () => {
    const set = L.columnDefaults();
    delete set.levelHeight;
    assert.equal(L.columnSettings(twoColumns(set), 2).levelHeight, 50);
  });
  test('Copy settings from column 2 to column 1 carries it', () => {
    const song = twoColumns(Object.assign(L.columnDefaults(), { levelHeight: 80 }));
    const out = L.cleanSong(L.copyColumnSettings(song, 2, [1]));
    assert.equal(out.levelHeight, 80);
  });
});

describe('SylShape.quick', () => {
  test('rising, falling, arch and dip for counts 1 to 5', () => {
    const want = {
      rising: [[0], [0, 1], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4]],
      falling: [[0], [1, 0], [2, 1, 0], [3, 2, 1, 0], [4, 3, 2, 1, 0]],
      arch: [[0], [0, 0], [0, 1, 0], [0, 1, 1, 0], [0, 1, 2, 1, 0]],
      dip: [[0], [0, 0], [0, -1, 0], [0, -1, -1, 0], [0, -1, -2, -1, 0]]
    };
    for (const [kind, rows] of Object.entries(want)) {
      rows.forEach((levels, i) => assert.deepEqual(S.quick(kind, i + 1), levels, kind + ' ' + (i + 1)));
    }
  });
  test('an unknown kind gives null', () => {
    assert.equal(S.quick('zigzag', 3), null);
  });
  test('a long run clamps to the top and bottom level', () => {
    const rising = S.quick('rising', 2 * S.MAX + 3);
    assert.equal(rising.length, 2 * S.MAX + 3);
    assert.equal(Math.max(...rising), S.MAX);
    assert.deepEqual(rising.slice(-3), [S.MAX, S.MAX, S.MAX]);
    assert.equal(Math.min(...S.quick('dip', 2 * S.MAX + 3)), -S.MAX);
  });
  test('dip never gives -0', () => {
    S.quick('dip', 5).forEach((lv) => assert.ok(!Object.is(lv, -0)));
  });
});

describe('SylShape.fromDrag', () => {
  test('dragging up 2.4 levels gives 2, dragging down 1.6 levels gives -2', () => {
    assert.equal(S.fromDrag(0, -2.4 * 10, 10), 2);
    assert.equal(S.fromDrag(0, 1.6 * 10, 10), -2);
  });
  test('starts from the syllable’s own level', () => {
    assert.equal(S.fromDrag(3, -10, 10), 4);
    assert.equal(S.fromDrag(undefined, -10, 10), 1);
  });
  test('clamps at the top and bottom level', () => {
    assert.equal(S.fromDrag(0, -1000, 10), 6);
    assert.equal(S.fromDrag(0, 1000, 10), -6);
  });
  test('a level height of 0 keeps the start level', () => {
    assert.equal(S.fromDrag(2, -50, 0), 2);
  });
  test('a tiny drag back to the start gives exactly 0, never -0', () => {
    assert.ok(Object.is(S.fromDrag(0, 1, 10), 0));
  });
});

describe('SylShape.copyTargets', () => {
  globalThis.WordTiming = loadModule('WordTiming');
  let n = 0;
  const word = (marked) => ({ id: 'w' + (++n), syls: marked.split('-').map((text) => ({ id: 's' + (++n), text })) });
  const line = (key, text) => ({ key, words: text.split(' ').map(word) });
  const places = (list) => list.map((t) => [t.key, t.from, t.to, t.match]);

  test('a single word finds the same word and a different word with the same syllable count', () => {
    const lines = [line('a', 'Glo-ri-a in'), line('b', 'Glo-ri-a to'), line('c', 'Al-le-lu')];
    const out = S.copyTargets(lines, { key: 'a', from: 0, to: 0 });
    assert.deepEqual(places(out), [['b', 0, 0, 'words'], ['c', 0, 0, 'count']]);
    assert.ok(out.every((t) => t.sylCount === 3));
  });
  test('never offers the source itself or a run that overlaps it', () => {
    const lines = [line('a', 'ho-ly ho-ly ho-ly')];
    const out = S.copyTargets(lines, { key: 'a', from: 0, to: 1 });
    assert.deepEqual(places(out), []);
    const single = S.copyTargets(lines, { key: 'a', from: 1, to: 1 });
    assert.deepEqual(places(single), [['a', 0, 0, 'words'], ['a', 2, 2, 'words']]);
  });
  test('skips the same word marked with a different number of syllables', () => {
    const lines = [line('a', 'Glo-ri-a'), line('b', 'Glor-ia')];
    assert.deepEqual(places(S.copyTargets(lines, { key: 'a', from: 0, to: 0 })), []);
  });
  test('a one-word run with a different syllable count is not offered as a count match', () => {
    const lines = [line('a', 'Glo-ri-a'), line('b', 'Peace')];
    assert.deepEqual(places(S.copyTargets(lines, { key: 'a', from: 0, to: 0 })), []);
  });
  test('a run with the same syllable count but more words is not offered', () => {
    const lines = [line('a', 'Glo-ri-a'), line('b', 'Peace on earth')];
    assert.deepEqual(places(S.copyTargets(lines, { key: 'a', from: 0, to: 0 })), []);
  });
  test('a two-word phrase only matches two-word runs, same words first', () => {
    const lines = [line('a', 'Ho-ly Lord'), line('b', 'Peace be-low'), line('c', 'ho-ly Lord God'), line('d', 'Lord ho-ly'), line('e', 'Glo-ri-a')];
    const out = S.copyTargets(lines, { key: 'a', from: 0, to: 1 });
    assert.deepEqual(places(out), [['c', 0, 1, 'words'], ['b', 0, 1, 'count'], ['d', 0, 1, 'count']]);
  });
  test('two words with a different syllable count are refused by the syllable rule', () => {
    const lines = [line('a', 'Ho-ly Lord'), line('b', 'Lord God')];
    assert.deepEqual(places(S.copyTargets(lines, { key: 'a', from: 0, to: 1 })), []);
  });
  test('matching ignores case and punctuation', () => {
    const lines = [line('a', 'Lord,'), line('b', 'lord')];
    assert.deepEqual(places(S.copyTargets(lines, { key: 'a', from: 0, to: 0 })), [['b', 0, 0, 'words']]);
  });
  test('object keys from the app match by value', () => {
    const lines = [line({ col: 1, lineIndex: 0 }, 'Ho-ly'), line({ col: 2, lineIndex: 0 }, 'Ho-ly')];
    const out = S.copyTargets(lines, { key: { col: 1, lineIndex: 0 }, from: 0, to: 0 });
    assert.deepEqual(out.map((t) => t.key), [{ col: 2, lineIndex: 0 }]);
  });
  test('a source outside its line gives no places', () => {
    const lines = [line('a', 'Ho-ly'), line('b', 'Ho-ly')];
    assert.deepEqual(S.copyTargets(lines, { key: 'a', from: 0, to: 3 }), []);
    assert.deepEqual(S.copyTargets(lines, { key: 'zz', from: 0, to: 0 }), []);
  });
});

describe('SylShape.glideFrom', () => {
  test('starts when the previous line ends', () => {
    assert.equal(S.glideFrom(10, 9.8, 2), 9.8);
  });
  test('a long gap uses the lead-in', () => {
    assert.equal(S.glideFrom(10, 3, 2), 8);
  });
  test('the first line uses the lead-in', () => {
    assert.equal(S.glideFrom(10, null, 2), 8);
  });
  test('never starts after the line starts, even when the previous line overlaps', () => {
    assert.equal(S.glideFrom(10, 10.5, 2), 10);
  });
  test('may start before the block starts', () => {
    assert.equal(S.glideFrom(1, null, 2), -1);
  });
});

describe('SylShape.prevEndOf', () => {
  test('picks the largest end at or before the row starts', () => {
    const rows = [{ start: 0, end: 2 }, { start: 3, end: 5 }, { start: 6, end: 8 }];
    assert.equal(S.prevEndOf(rows, 2, null), 5);
  });
  test('ignores a timed row that ends after the row starts', () => {
    const rows = [{ start: 0, end: 2 }, { start: 4, end: 7 }, { start: 6, end: 8 }];
    assert.equal(S.prevEndOf(rows, 2, null), 2);
  });
  test('falls back to before when nothing ends earlier', () => {
    const rows = [{ start: 5, end: 7 }, { start: 1, end: 3 }];
    assert.equal(S.prevEndOf(rows, 1, -0.5), -0.5);
  });
  test('a row with no start returns before', () => {
    const rows = [{ start: 0, end: 2 }, { start: null, end: null }];
    assert.equal(S.prevEndOf(rows, 1, 1.5), 1.5);
  });
});

describe('SylShape.factor', () => {
  const base = { mode: 'line', glide: 0.4, leadIn: 2, flatten: false, lineStart: 10, lineEnd: 15, prevEnd: 9, sylStart: 12, untimed: false };
  const at = (rel, more) => S.factor(Object.assign({}, base, { rel }, more));
  test('Always, or no mode, is fully shaped at any time', () => {
    assert.equal(at(0, { mode: 'always' }), 1);
    assert.equal(at(100, { mode: undefined }), 1);
  });
  test('When the line comes up glides from the previous line’s end', () => {
    assert.equal(at(8.99), 0);
    assert.equal(at(9.2), 0.5);
    assert.ok(Object.is(at(9.4), 1));
    assert.ok(Object.is(at(14), 1));
  });
  test('As each syllable is sung lands each syllable as it starts', () => {
    assert.equal(at(11.59, { mode: 'syllable' }), 0);
    assert.ok(Object.is(at(12, { mode: 'syllable' }), 1));
    assert.equal(at(12, { mode: 'syllable', sylStart: 13 }), 0);
  });
  test('As each syllable is sung on an untimed line glides the whole line from the block’s start', () => {
    const untimed = { mode: 'syllable', untimed: true, lineStart: 0, lineEnd: 6, prevEnd: null, sylStart: null };
    assert.equal(at(-0.01, untimed), 0);
    assert.equal(at(0.2, untimed), 0.5);
    assert.ok(Object.is(at(0.4, untimed), 1));
  });
  test('As each syllable is sung with no syllable start uses the line’s glide', () => {
    assert.equal(at(9.2, { mode: 'syllable', sylStart: null }), 0.5);
  });
  test('Flatten after singing glides back to flat after the line ends', () => {
    assert.ok(Object.is(at(15, { flatten: true }), 1));
    assert.equal(at(15.4, { flatten: true }), 0);
    assert.equal(at(20, { flatten: true }), 0);
    assert.ok(Object.is(at(20, { flatten: false }), 1));
  });
});

describe('SylShape.scaleLevel', () => {
  test('scales a level, and gives 0 for no level or no glide', () => {
    assert.equal(S.scaleLevel(2, 1), 2);
    assert.equal(S.scaleLevel(2, 0.5), 1);
    assert.equal(S.scaleLevel(-3, 0), 0);
    assert.equal(S.scaleLevel(0, 1), 0);
    assert.equal(S.scaleLevel(undefined, 1), 0);
  });
});

describe('Shape shows settings', () => {
  test('defaults', () => {
    const out = L.cleanSong({});
    assert.equal(out.shapeShow, 'always');
    assert.equal(out.shapeGlide, 0.4);
    assert.equal(out.shapeLeadIn, 2);
    assert.equal(out.shapeFlatten, false);
  });
  test('an unknown Shape shows becomes Always', () => {
    assert.equal(L.cleanSong({ shapeShow: 'sometimes' }).shapeShow, 'always');
    assert.equal(L.cleanSong({ shapeShow: 'line' }).shapeShow, 'line');
    assert.equal(L.cleanSong({ shapeShow: 'syllable' }).shapeShow, 'syllable');
  });
  test('glide clamps to 0.25–1 and rounds to 0.05 with no float noise', () => {
    assert.equal(L.cleanSong({ shapeGlide: 0.1 }).shapeGlide, 0.25);
    assert.equal(L.cleanSong({ shapeGlide: 3 }).shapeGlide, 1);
    assert.equal(L.cleanSong({ shapeGlide: 0.33 }).shapeGlide, 0.35);
    assert.equal(L.cleanSong({ shapeGlide: 0.3 }).shapeGlide, 0.3);
  });
  test('lead-in clamps to 0.5–5', () => {
    assert.equal(L.cleanSong({ shapeLeadIn: 0 }).shapeLeadIn, 0.5);
    assert.equal(L.cleanSong({ shapeLeadIn: 9 }).shapeLeadIn, 5);
  });
  test('a flatten that is not true or false becomes false', () => {
    assert.equal(L.cleanSong({ shapeFlatten: 'yes' }).shapeFlatten, false);
    assert.equal(L.cleanSong({ shapeFlatten: true }).shapeFlatten, true);
  });
  test('each column keeps its own values', () => {
    const set = Object.assign(L.columnDefaults(), { shapeShow: 'syllable', shapeGlide: 0.8, shapeLeadIn: 4, shapeFlatten: true });
    const song = L.cleanSong({ view: 'roll', columns: true, shapeShow: 'line', shapeGlide: 0.5, more: [{ verses: [], set }] });
    const again = L.cleanSong(JSON.parse(JSON.stringify(song)));
    const one = L.columnSettings(again, 1), two = L.columnSettings(again, 2);
    assert.equal(one.shapeShow, 'line');
    assert.equal(one.shapeGlide, 0.5);
    assert.equal(one.shapeFlatten, false);
    assert.equal(two.shapeShow, 'syllable');
    assert.equal(two.shapeGlide, 0.8);
    assert.equal(two.shapeLeadIn, 4);
    assert.equal(two.shapeFlatten, true);
  });
});
