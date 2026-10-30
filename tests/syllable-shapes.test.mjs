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
