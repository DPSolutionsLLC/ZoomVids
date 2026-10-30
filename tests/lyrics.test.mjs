import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
globalThis.ColumnMoves = loadModule('ColumnMoves');
const L = loadModule('Lyrics');
const KARAOKE_FULL = { font: 'montserrat', bold: true, italic: false, size: 72, color: '#FFFFFF', look: 'solid', glowColor: '#000000', glowOpacity: 60, glowWidth: 12, glowSoft: 20, solidColor: '#000000', solidWidth: 6, boxColor: '#0A100D', boxOpacity: 72 };
const ROLL_FULL = { frame: { x: 0.06, y: 0.52, w: 0.88, h: 0.42 }, align: 'center', above: 1, below: 2, move: 'stay', motion: 'smooth', verses: 'mark', look: Object.assign({}, KARAOKE_FULL, { size: 64 }) };
const songDefaults = () => Object.assign({}, L.SHOW_DEFAULTS, { slideLook: KARAOKE_FULL, view: 'slides', roll: ROLL_FULL });

function counter(prefix = 'w') {
  let n = 0;
  return () => prefix + (++n);
}
const parse = (text, known = []) => L.parse(text, counter(), known);
const shape = (slide) => slide.lines.map((line) => line.words.map((w) => ({ part: w.part || null, syls: w.syls.map((s) => s.text) })));
const ids = (slide) => slide.lines.flatMap((line) => line.words.map((w) => w.id));
const sylIds = (slide) => slide.lines.flatMap((line) => line.words.flatMap((w) => w.syls.map((s) => s.id)));

describe('splitWord', () => {
  test('a hyphen inside a word splits it into syllables', () => {
    assert.deepEqual(L.splitWord('Glo-ri-a'), ['Glo', 'ri', 'a']);
  });
  test('two hyphens keep a real hyphen', () => {
    assert.deepEqual(L.splitWord('well--known'), ['well-known']);
    assert.deepEqual(L.splitWord('Hal-le--lu-jah'), ['Hal', 'le-lu', 'jah']);
  });
  test('a hyphen alone, leading or trailing stays as written', () => {
    assert.deepEqual(L.splitWord('-'), ['-']);
    assert.deepEqual(L.splitWord('-ing'), ['-ing']);
    assert.deepEqual(L.splitWord('pre-'), ['pre-']);
  });
  test('punctuation stays with its syllable', () => {
    assert.deepEqual(L.splitWord('a,'), ['a,']);
    assert.deepEqual(L.splitWord('De-o!'), ['De', 'o!']);
  });
});

describe('tagName', () => {
  test('a name with a colon is a tag', () => {
    assert.equal(L.tagName('High:'), 'High');
    assert.equal(L.tagName('Solo1:'), 'Solo1');
  });
  test('-: means no part', () => {
    assert.equal(L.tagName('-:'), '');
  });
  test('anything else is not a tag', () => {
    assert.equal(L.tagName('High'), null);
    assert.equal(L.tagName('1st:'), null);
    assert.equal(L.tagName('Abcdefghijklmnop:'), null);
    assert.equal(L.tagName('Abcdefghijklmno:'), 'Abcdefghijklmno');
  });
});

describe('parse: slides', () => {
  test('blank lines separate slides, and several blank lines are one break', () => {
    const out = parse('One two\nthree\n\n\n\nfour');
    assert.equal(out.slides.length, 2);
    assert.deepEqual(shape(out.slides[0]).map((ln) => ln.length), [2, 1]);
  });
  test('CRLF input works', () => {
    const out = parse('One\r\ntwo\r\n\r\nthree');
    assert.equal(out.slides.length, 2);
    assert.equal(out.slides[0].lines.length, 2);
  });
  test('leading and trailing blank lines and trailing spaces are ignored', () => {
    const out = parse('\n\n  \nOne two   \n\n\n');
    assert.equal(out.slides.length, 1);
    assert.deepEqual(shape(out.slides[0]), [[{ part: null, syls: ['One'] }, { part: null, syls: ['two'] }]]);
  });
  test('the scope example gives 3 slides with syllables and two parts', () => {
    const out = parse('Glo-ri-a in ex-cel-sis De-o\n\nHigh: Peace on earth\nLow: Good will to all\n\nwell--known words');
    assert.equal(out.slides.length, 3);
    assert.deepEqual(out.parts, ['High', 'Low']);
    assert.deepEqual(shape(out.slides[0])[0][0].syls, ['Glo', 'ri', 'a']);
    const second = shape(out.slides[1]);
    assert.ok(second[0].every((w) => w.part === 'High'));
    assert.ok(second[1].every((w) => w.part === 'Low'));
    assert.equal(second[0].length, 3);
    assert.deepEqual(shape(out.slides[2])[0][0].syls, ['well-known']);
  });
  test('every word and syllable gets its own id', () => {
    const out = parse('Glo-ri-a in\n\nex-cel-sis');
    const all = out.slides.flatMap((s) => ids(s).concat(sylIds(s)));
    assert.equal(new Set(all).size, all.length);
  });
  test('slide.song is not set', () => {
    assert.equal(parse('One').slides[0].song, undefined);
  });
});

describe('parse: tags', () => {
  test('a tag alone on a line applies until the slide ends', () => {
    const out = parse('Low:\nOne\nTwo\n\nThree');
    assert.deepEqual(shape(out.slides[0]).map((ln) => ln[0].part), ['Low', 'Low']);
    assert.equal(out.slides[0].lines.length, 2);
    assert.equal(shape(out.slides[1])[0][0].part, null);
  });
  test('a line tag overrides the slide part for one line', () => {
    const out = parse('Low:\nOne\nHigh: Two\nThree');
    assert.deepEqual(shape(out.slides[0]).map((ln) => ln[0].part), ['Low', 'High', 'Low']);
  });
  test('an inline tag switches part only when the part is known', () => {
    const known = parse('Sing High: now', ['High']);
    assert.deepEqual(shape(known.slides[0])[0].map((w) => w.part), [null, 'High']);
    const unknown = parse('Sing Hark: now');
    assert.deepEqual(shape(unknown.slides[0])[0].map((w) => w.syls[0]), ['Sing', 'Hark:', 'now']);
    assert.deepEqual(unknown.parts, []);
  });
  test('an inline tag seen earlier in the same paste is known', () => {
    const out = parse('Low: One\nTwo Low: three');
    assert.deepEqual(shape(out.slides[0])[1].map((w) => w.part), [null, 'Low']);
  });
  test('-: clears the part mid-line', () => {
    const out = parse('High: One two -: three');
    assert.deepEqual(shape(out.slides[0])[0].map((w) => w.part), ['High', 'High', null]);
  });
  test('Not a tag: words has no tag at the start', () => {
    const out = parse('Not a tag: words');
    assert.deepEqual(shape(out.slides[0])[0].map((w) => w.syls[0]), ['Not', 'a', 'tag:', 'words']);
  });
  test('a 16-character name is not a tag', () => {
    const out = parse('Abcdefghijklmnop: words');
    assert.equal(shape(out.slides[0])[0].length, 2);
    assert.deepEqual(out.parts, []);
  });
  test('a tag with different case uses the song part name', () => {
    const out = parse('high: One', ['High']);
    assert.equal(shape(out.slides[0])[0][0].part, 'High');
    assert.deepEqual(out.parts, ['High']);
  });
  test('a slide with only a tag is dropped', () => {
    const out = parse('Chorus:\n\nOne');
    assert.equal(out.slides.length, 1);
  });
});

describe('display', () => {
  const slide = parse('Glo-ri-a in\nHigh: Peace on Low: earth', ['Low']).slides[0];
  test('syllables are joined and lines are joined with a new line', () => {
    assert.equal(L.display(slide, false), 'Gloria in\nPeace on earth');
  });
  test('showParts prints the part name only where it changes', () => {
    assert.equal(L.display(slide, true), 'Gloria in\nHigh: Peace on Low: earth');
  });
});

describe('markup round trip', () => {
  const cases = [
    'Glo-ri-a in ex-cel-sis De-o',
    'well--known words',
    'High: One two Low: three',
    'High: One two -: three',
    'Low:\nOne\nHigh: Two\nThree',
    '- -ing pre- Hal-le--lu-jah',
  ];
  for (const text of cases) {
    test(JSON.stringify(text), () => {
      const s = parse(text).slides[0];
      const back = L.parse(L.markup(s), counter('x'), L.partsOf(s)).slides[0];
      assert.deepEqual(shape(back), shape(s));
    });
  }
  test('markup writes syllables with hyphens and parts as tags', () => {
    const s = parse('High: Glo-ri-a well--known -: end').slides[0];
    assert.equal(L.markup(s), 'High: Glo-ri-a well--known -: end');
  });
});

describe('merge', () => {
  const make = (text, prefix) => L.parse(text, counter(prefix), ['High', 'Low']).slides[0];
  test('unchanged words keep their ids and extra syllable keys', () => {
    const old = make('Glo-ri-a in ex-cel-sis', 'a');
    old.song = 'song1';
    old.lines[0].words[0].syls[1].t = 12.3;
    const out = L.merge(old, make('Glo-ri-a in ex-cel-sis', 'b'));
    assert.deepEqual(ids(out), ids(old));
    assert.deepEqual(sylIds(out), sylIds(old));
    assert.equal(out.lines[0].words[0].syls[1].t, 12.3);
    assert.equal(out.song, 'song1');
  });
  test('a changed word gets a new id while its neighbours keep theirs', () => {
    const old = make('Peace on earth', 'a');
    const out = L.merge(old, make('Peace in earth', 'b'));
    const [p, mid, e] = ids(out);
    assert.equal(p, ids(old)[0]);
    assert.equal(e, ids(old)[2]);
    assert.notEqual(mid, ids(old)[1]);
  });
  test('re-splitting a word keeps the word id and makes new syllables', () => {
    const old = make('Gloria', 'a');
    const out = L.merge(old, make('Glo-ri-a', 'b'));
    assert.equal(ids(out)[0], ids(old)[0]);
    assert.equal(out.lines[0].words[0].syls.length, 3);
    assert.ok(sylIds(out).every((id) => id.startsWith('b')));
  });
  test('syllables at equal-text indexes keep their objects when the split changes', () => {
    const old = make('Glo-ria', 'a');
    old.lines[0].words[0].syls[0].t = 1;
    const out = L.merge(old, make('Glo-ri-a', 'b'));
    assert.deepEqual(out.lines[0].words[0].syls[0], old.lines[0].words[0].syls[0]);
    assert.ok(out.lines[0].words[0].syls[1].id.startsWith('b'));
  });
  test('an inserted line in the middle keeps the ids before and after it', () => {
    const old = make('One two\nfive six', 'a');
    const out = L.merge(old, make('One two\nthree four\nfive six', 'b'));
    const o = ids(old), n = ids(out);
    assert.deepEqual([n[0], n[1], n[4], n[5]], o);
    assert.ok(n[2].startsWith('b') && n[3].startsWith('b'));
  });
  test('a part change keeps the id and takes the new part', () => {
    const old = make('High: Peace', 'a');
    const out = L.merge(old, make('Low: Peace', 'b'));
    assert.equal(ids(out)[0], ids(old)[0]);
    assert.equal(out.lines[0].words[0].part, 'Low');
  });
  test('removing the part takes it away', () => {
    const old = make('High: Peace', 'a');
    const out = L.merge(old, make('Peace', 'b'));
    assert.equal(out.lines[0].words[0].part, undefined);
  });
  test('word timing on unchanged words survives an edit elsewhere in the slide', () => {
    const old = make('Glo-ri-a in ex-cel-sis', 'a');
    old.lines[0].words[0].syls[1].t = 1.5;
    old.lines[0].words[0].syls[1].d = 0.4;
    old.lines[0].words[2].syls[0].t = 3;
    old.lines[0].words[2].syls[0].d = 0.2;
    const out = L.merge(old, make('Glo-ri-a in high ex-cel-sis', 'b'));
    assert.deepEqual(out.lines[0].words[0].syls[1], { id: old.lines[0].words[0].syls[1].id, text: 'ri', t: 1.5, d: 0.4 });
    assert.equal(out.lines[0].words[3].syls[0].t, 3);
    assert.equal(out.lines[0].words[3].syls[0].d, 0.2);
    assert.equal(out.lines[0].words[2].syls[0].t, undefined);
  });
  test('the inputs are not changed', () => {
    const old = make('Peace', 'a'), fresh = make('Peace', 'b');
    const before = JSON.stringify(fresh);
    L.merge(old, fresh);
    assert.equal(JSON.stringify(fresh), before);
  });
});

describe('reId', () => {
  test('every id changes, all are unique, and extra keys stay', () => {
    const s = parse('Glo-ri-a in\nex-cel-sis').slides[0];
    s.lines[0].words[0].syls[0].t = 4;
    s.lines[0].words[0].syls[0].d = 0.25;
    s.song = 'song1';
    const out = L.reId(s, counter('n'));
    assert.equal(out.lines[0].words[0].syls[0].d, 0.25);
    const before = new Set(ids(s).concat(sylIds(s)));
    const after = ids(out).concat(sylIds(out));
    assert.ok(after.every((id) => !before.has(id)));
    assert.equal(new Set(after).size, after.length);
    assert.equal(out.lines[0].words[0].syls[0].t, 4);
    assert.equal(out.song, 'song1');
    assert.deepEqual(shape(out), shape(s));
  });
});

describe('small helpers', () => {
  const s = parse('High: Glo-ri-a in\nLow: ex-cel-sis High: De-o').slides[0];
  test('partsOf lists parts in order', () => {
    assert.deepEqual(L.partsOf(s), ['High', 'Low']);
  });
  test('wordCount and syllableCount', () => {
    assert.equal(L.wordCount(s), 4);
    assert.equal(L.syllableCount(s), 3 + 1 + 3 + 2);
  });
  test('setPart sets or removes parts on the picked words only', () => {
    const [a, b] = ids(s);
    const out = L.setPart(s, [a], 'Boys');
    assert.equal(out.lines[0].words[0].part, 'Boys');
    assert.equal(out.lines[0].words[1].part, 'High');
    const cleared = L.setPart(s, [a, b], null);
    assert.equal(cleared.lines[0].words[0].part, undefined);
    assert.equal(cleared.lines[0].words[1].part, undefined);
    assert.equal(s.lines[0].words[0].part, 'High');
  });
  test('joinSlides appends lines and keeps ids', () => {
    const a = parse('One').slides[0], b = L.parse('Two\nThree', counter('z')).slides[0];
    const out = L.joinSlides(a, b);
    assert.equal(out.lines.length, 3);
    assert.deepEqual(ids(out), ids(a).concat(ids(b)));
    assert.equal(a.lines.length, 1);
  });
  test('wordText joins syllables', () => {
    assert.equal(L.wordText(s.lines[0].words[0]), 'Gloria');
  });
});

describe('cleanSlide', () => {
  test('drops a word with no valid syllables and keeps extra syllable keys', () => {
    const out = L.cleanSlide({
      song: 's1',
      lines: [{ words: [
        { id: 'a', syls: [] },
        { id: 'b', syls: [{ id: 'b1', text: 'Hi', extra: 2 }, { id: 'b2', text: '' }] },
      ] }],
    });
    assert.deepEqual(out, { song: 's1', lines: [{ words: [{ id: 'b', syls: [{ id: 'b1', text: 'Hi', extra: 2 }] }] }] });
  });
  const timedSlide = (syl) => ({ lines: [{ words: [{ id: 'w', syls: [Object.assign({ id: 's1', text: 'Peace' }, syl)] }] }] });
  test('keeps valid word timing, rounded to milliseconds', () => {
    const syl = L.cleanSlide(timedSlide({ t: 1.23456, d: 0.4 })).lines[0].words[0].syls[0];
    assert.equal(syl.t, 1.235);
    assert.equal(syl.d, 0.4);
  });
  test('keeps a negative start, which means the word is before the slide shows', () => {
    const syl = L.cleanSlide(timedSlide({ t: -0.5, d: 0.3 })).lines[0].words[0].syls[0];
    assert.equal(syl.t, -0.5);
  });
  for (const [label, bad] of [
    ['t without d', { t: 1 }],
    ['d without t', { d: 0.4 }],
    ['d of 0', { t: 1, d: 0 }],
    ['a negative d', { t: 1, d: -1 }],
    ['a string t', { t: 'x', d: 0.4 }],
    ['a NaN t', { t: NaN, d: 0.4 }],
    ['an Infinity d', { t: 1, d: Infinity }],
  ]) {
    test('drops the timing when it has ' + label + ', but keeps the syllable', () => {
      const out = L.cleanSlide(timedSlide(bad));
      assert.ok(out, 'the slide is otherwise valid, so it must survive');
      const syl = out.lines[0].words[0].syls[0];
      assert.equal(syl.text, 'Peace');
      assert.equal('t' in syl, false);
      assert.equal('d' in syl, false);
    });
  }
  test('drops an invalid part and keeps a valid one', () => {
    const out = L.cleanSlide({ lines: [{ words: [
      { id: 'a', part: 'not ok', syls: [{ id: 'a1', text: 'x' }] },
      { id: 'b', part: 'High', syls: [{ id: 'b1', text: 'y' }] },
    ] }] });
    assert.equal(out.lines[0].words[0].part, undefined);
    assert.equal(out.lines[0].words[1].part, 'High');
  });
  test('drops a word without a string id and lines left empty', () => {
    const out = L.cleanSlide({ lines: [{ words: [{ id: 5, syls: [{ id: 'a1', text: 'x' }] }] }, { words: [{ id: 'b', syls: [{ id: 'b1', text: 'y' }] }] }] });
    assert.equal(out.lines.length, 1);
  });
  test('returns null for an empty or broken slide', () => {
    assert.equal(L.cleanSlide({ lines: [{ words: [{ id: 'a', syls: [] }] }] }), null);
    assert.equal(L.cleanSlide({ lines: 'x' }), null);
    assert.equal(L.cleanSlide(null), null);
  });
  test('a non-string song is dropped', () => {
    const out = L.cleanSlide({ song: 4, lines: [{ words: [{ id: 'b', syls: [{ id: 'b1', text: 'y' }] }] }] });
    assert.equal(out.song, undefined);
  });
});

describe('cleanSong', () => {
  test('drops duplicate names case-insensitively and replaces a bad color', () => {
    const out = L.cleanSong({ showParts: true, parts: [
      { name: 'High', color: '#123456' },
      { name: 'high', color: '#000000' },
      { name: 'Low', color: 'red' },
      { name: 'bad name', color: '#111111' },
    ] });
    assert.deepEqual(out, Object.assign({ showParts: true, parts: [{ name: 'High', color: '#123456', hi: '#FFD54A' }, { name: 'Low', color: L.PALETTE[1], hi: '#FFD54A' }] }, songDefaults()));
  });
  test('showParts is only on when it is true', () => {
    assert.equal(L.cleanSong({ showParts: 'yes' }).showParts, false);
    assert.deepEqual(L.cleanSong({}).parts, []);
  });
  test('an empty song gets every display default', () => {
    assert.deepEqual(L.cleanSong({}), Object.assign({ showParts: false, parts: [] }, songDefaults()));
    assert.deepEqual(L.SHOW_DEFAULTS, { highlight: 'syllable', keepLit: false, singColor: '#FFD54A', countdown: 'dots', breakGap: 5, countLen: 3, appear: 'start', whenDone: 'stay', gaps: 'dots', hideGap: 8 });
  });
  test('bad display values fall back to the defaults, one field at a time', () => {
    const good = { showParts: true, parts: [], highlight: 'word', keepLit: true, singColor: '#112233', countdown: 'bar', breakGap: 8, countLen: 4 };
    const bad = { highlight: 'flash', keepLit: 'yes', singColor: 'red', countdown: 'lights', breakGap: 'x', countLen: null };
    Object.keys(bad).forEach((key) => {
      const raw = Object.assign({}, good, { [key]: bad[key] });
      const out = L.cleanSong(raw);
      assert.equal(out[key], L.SHOW_DEFAULTS[key], key);
      Object.keys(bad).filter((k) => k !== key).forEach((k) => assert.equal(out[k], good[k], key + ' left ' + k + ' alone'));
    });
  });
  test('numbers are clamped and rounded to their steps', () => {
    assert.equal(L.cleanSong({ breakGap: 100 }).breakGap, 30);
    assert.equal(L.cleanSong({ breakGap: 1 }).breakGap, 2);
    assert.equal(L.cleanSong({ breakGap: 5.3 }).breakGap, 5.5);
    assert.equal(L.cleanSong({ countLen: 0 }).countLen, 1);
    assert.equal(L.cleanSong({ countLen: 2.6 }).countLen, 3);
    assert.equal(L.cleanSong({ countLen: 50 }).countLen, 10);
  });
  test('valid display values are kept', () => {
    const raw = { showParts: false, parts: [], highlight: 'word', keepLit: true, singColor: '#abcdef', countdown: 'off', breakGap: 12.5, countLen: 7, appear: 'first', whenDone: 'fade', gaps: 'hide', hideGap: 12.5, slideLook: KARAOKE_FULL, view: 'slides', roll: ROLL_FULL };
    assert.deepEqual(L.cleanSong(raw), raw);
  });
  test('an old sweep highlight becomes syllable by syllable, and whole word stays', () => {
    assert.equal(L.cleanSong({ highlight: 'sweep' }).highlight, 'syllable');
    assert.equal(L.cleanSong({ highlight: 'syllable' }).highlight, 'syllable');
    assert.equal(L.cleanSong({ highlight: 'word' }).highlight, 'word');
    assert.equal(L.cleanSong({ highlight: 'flash' }).highlight, 'syllable');
    assert.equal(L.cleanSong({ highlight: 'sweep' }).keepLit, false);
    assert.equal(L.cleanSong({ highlight: 'word' }).keepLit, false);
  });
  test('an old part with no highlight gets the singing color', () => {
    assert.equal(L.cleanSong({ parts: [{ name: 'High', color: '#4FC3F7' }] }).parts[0].hi, '#FFD54A');
    assert.equal(L.cleanSong({ singColor: '#112233', parts: [{ name: 'High', color: '#4FC3F7' }] }).parts[0].hi, '#112233');
  });
  test('a part whose color equals the singing color highlights in white, in any case', () => {
    assert.equal(L.cleanSong({ parts: [{ name: 'High', color: '#FFD54A' }] }).parts[0].hi, '#FFFFFF');
    assert.equal(L.cleanSong({ parts: [{ name: 'High', color: '#ffd54a' }] }).parts[0].hi, '#FFFFFF');
  });
  test('a stored highlight is kept, and a later singing color change does not move it', () => {
    const once = L.cleanSong({ parts: [{ name: 'High', color: '#4FC3F7' }] });
    assert.equal(once.parts[0].hi, '#FFD54A');
    const later = L.cleanSong(Object.assign({}, once, { singColor: '#112233' }));
    assert.equal(later.parts[0].hi, '#FFD54A');
    assert.equal(L.cleanSong({ parts: [{ name: 'High', color: '#4FC3F7', hi: '#ABCDEF' }] }).parts[0].hi, '#ABCDEF');
  });
  test('a bad highlight falls back to the default, never an empty string', () => {
    ['red', '', 5, null].forEach((hi) => {
      const part = L.cleanSong({ parts: [{ name: 'High', color: '#4FC3F7', hi }] }).parts[0];
      assert.equal(part.hi, '#FFD54A', String(hi));
    });
  });
  test('keepLit is on only for true', () => {
    assert.equal(L.cleanSong({ keepLit: true }).keepLit, true);
    assert.equal(L.cleanSong({ keepLit: 'yes' }).keepLit, false);
    assert.equal(L.cleanSong({ keepLit: 1 }).keepLit, false);
    assert.equal(L.cleanSong({}).keepLit, false);
  });
});

describe('slideLook', () => {
  const custom = { font: 'lora', bold: false, italic: true, size: 96, color: '#112233', look: 'outline', glowColor: '#445566', glowOpacity: 40, glowWidth: 10, glowSoft: 15, solidColor: '#778899', solidWidth: 9, boxColor: '#0A0B0C', boxOpacity: 50 };
  test('a song with no look gets the karaoke default', () => {
    assert.deepEqual(L.cleanSong({}).slideLook, KARAOKE_FULL);
    assert.deepEqual(L.cleanSlideLook(undefined), KARAOKE_FULL);
    assert.equal(L.KARAOKE_LOOK.font, 'montserrat');
  });
  test('bad values fall back to the defaults, never an empty string', () => {
    const out = L.cleanSong({ slideLook: { font: '', size: 'x', color: 'red', look: 'neon', solidWidth: 'thick' } }).slideLook;
    assert.equal(out.font, 'montserrat');
    assert.equal(out.size, 72);
    assert.equal(out.color, '#FFFFFF');
    assert.equal(out.look, 'solid');
    assert.equal(out.solidWidth, 6);
    Object.keys(out).forEach((key) => assert.notEqual(out[key], '', key));
  });
  test('a font name longer than 80 characters falls back', () => {
    assert.equal(L.cleanSlideLook({ font: 'x'.repeat(81) }).font, 'montserrat');
    assert.equal(L.cleanSlideLook({ font: '  lora  ' }).font, 'lora');
  });
  test('size is clamped and rounded', () => {
    assert.equal(L.cleanSlideLook({ size: 500 }).size, 180);
    assert.equal(L.cleanSlideLook({ size: 3 }).size, 24);
    assert.equal(L.cleanSlideLook({ size: 60.4 }).size, 60);
  });
  test('a full valid look round-trips through cleanSong twice unchanged', () => {
    const once = L.cleanSong({ slideLook: custom });
    const twice = L.cleanSong(once);
    assert.deepEqual(once.slideLook, custom);
    assert.deepEqual(twice, once);
  });
  test('addParts keeps keepLit and slideLook', () => {
    const out = L.addParts({ parts: [], keepLit: true, slideLook: custom }, ['High']);
    assert.equal(out.keepLit, true);
    assert.deepEqual(out.slideLook, custom);
  });
});

describe('slideStyle', () => {
  const tx = { id: 't1', text: 'Hi', font: 'sans', bold: true, size: 40, color: '#000000', look: 'shadow', frame: { x: 0.1, y: 0.2, w: 0.5, h: 0.3 }, align: 'left', valign: 'bottom', lh: 1.5, start: 3, dur: 4, lyric: { song: 's1', lines: [] } };
  test('copies the font, style, size, color and look fields', () => {
    const out = L.slideStyle(tx, { font: 'lora', bold: false, italic: true, size: 90, color: '#ABCDEF', look: 'solid', solidColor: '#FF0000', solidWidth: 12 });
    assert.equal(out.font, 'lora');
    assert.equal(out.italic, true);
    assert.equal(out.size, 90);
    assert.equal(out.color, '#ABCDEF');
    assert.equal(out.look, 'solid');
    assert.equal(out.solidColor, '#FF0000');
    assert.equal(out.solidWidth, 12);
    globalThis.TextLook.FIELDS.forEach((key) => assert.ok(key in out, key));
  });
  test('drops bold when it is off', () => {
    const out = L.slideStyle(tx, { bold: false });
    assert.equal('bold' in out, false);
  });
  test('leaves frame, alignment, line spacing, timing and lyric alone', () => {
    const out = L.slideStyle(tx, undefined);
    ['frame', 'align', 'valign', 'lh', 'lyric', 'start', 'dur', 'id', 'text'].forEach((key) => assert.deepEqual(out[key], tx[key], key));
  });
  test('does not change its input', () => {
    const before = structuredClone(tx);
    L.slideStyle(tx, { font: 'lora', size: 120 });
    assert.deepEqual(tx, before);
  });
  test('non-object input gives null', () => {
    assert.equal(L.cleanSong(null), null);
    assert.equal(L.cleanSong('x'), null);
    assert.equal(L.cleanSong([]), null);
  });
});

describe('defaultHi', () => {
  test('the singing color when it differs from the base', () => {
    assert.equal(L.defaultHi('#4FC3F7', '#FFD54A'), '#FFD54A');
  });
  test('white when the base is the singing color, in any case', () => {
    assert.equal(L.defaultHi('#ffd54a', '#FFD54A'), '#FFFFFF');
  });
});

describe('addParts', () => {
  test('colors come in palette order, skip the singing color, and cycle after 5', () => {
    const out = L.addParts(null, ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    const choices = L.PALETTE.slice(1);
    assert.deepEqual(out.parts.map((p) => p.color), choices.concat([choices[0], choices[1]]));
    assert.ok(out.parts.every((p) => p.hi === '#FFD54A'));
  });
  test('on a default song High gets blue and Low pink, both highlighting in the singing color', () => {
    const high = L.addParts(null, ['High']);
    const both = L.addParts(high, ['Low']);
    assert.deepEqual(both.parts, [{ name: 'High', color: L.PALETTE[1], hi: '#FFD54A' }, { name: 'Low', color: L.PALETTE[2], hi: '#FFD54A' }]);
    assert.notEqual(both.parts[0].color, both.parts[1].color);
  });
  test('with a blue singing color the palette skips blue instead', () => {
    const out = L.addParts({ singColor: '#4FC3F7' }, ['High', 'Low']);
    assert.deepEqual(out.parts.map((p) => p.color), [L.PALETTE[0], L.PALETTE[2]]);
    assert.ok(out.parts.every((p) => p.hi === '#4FC3F7'));
  });
  test('existing parts are untouched and duplicates are skipped', () => {
    const base = { showParts: true, parts: [{ name: 'High', color: '#010203' }] };
    const out = L.addParts(base, ['high', 'Low', 'Low', 'bad name']);
    assert.deepEqual(out, Object.assign({ showParts: true, parts: [{ name: 'High', color: '#010203', hi: '#FFD54A' }, { name: 'Low', color: L.PALETTE[2], hi: '#FFD54A' }] }, songDefaults()));
    assert.equal(base.parts.length, 1);
  });
  test('keeps the song display settings', () => {
    const out = L.addParts({ showParts: false, parts: [], highlight: 'word', countLen: 5 }, ['High']);
    assert.equal(out.highlight, 'word');
    assert.equal(out.countLen, 5);
  });
});

const verseOf = (id, slide) => ({ id, lines: slide.lines });
const timedVerse = (id, sylTimes) => ({ id, lines: [{ words: sylTimes.map(([wid, sid, text, t, d]) => ({ id: wid, syls: [Object.assign({ id: sid, text }, t == null ? {} : { t, d })] })) }] });
const recordFrom = (text) => {
  const out = L.parse(text, counter('x'));
  const verseId = counter('v');
  return { verses: out.slides.map((s) => verseOf(verseId(), s)) };
};
const allSyls = (verse) => verse.lines.flatMap((ln) => ln.words.flatMap((w) => w.syls));

describe('cleanRecord', () => {
  test('keeps verses and their ids', () => {
    const { verses } = recordFrom('One two\n\nthree');
    const out = L.cleanRecord({ verses });
    assert.deepEqual(out.verses.map((v) => v.id), ['v1', 'v2']);
    assert.deepEqual(ids(out.verses[0]), ids(verses[0]));
  });
  test('takes a plain array too', () => {
    const { verses } = recordFrom('One');
    assert.equal(L.cleanRecord(verses).verses.length, 1);
  });
  test('strips t and d from every syllable', () => {
    const out = L.cleanRecord([timedVerse('v1', [['a', 'a1', 'Hi', 1, 0.4]])]);
    const syl = out.verses[0].lines[0].words[0].syls[0];
    assert.equal('t' in syl, false);
    assert.equal('d' in syl, false);
  });
  test('drops a verse with no valid words', () => {
    const out = L.cleanRecord([{ id: 'v1', lines: [{ words: [{ id: 'a', syls: [] }] }] }, timedVerse('v2', [['b', 'b1', 'Yes']])]);
    assert.deepEqual(out.verses.map((v) => v.id), ['v2']);
  });
  test('drops a verse without a string id', () => {
    const out = L.cleanRecord([timedVerse('', [['a', 'a1', 'x']]), timedVerse('v2', [['b', 'b1', 'y']])]);
    assert.deepEqual(out.verses.map((v) => v.id), ['v2']);
  });
  test('drops a duplicate verse id after the first', () => {
    const out = L.cleanRecord([timedVerse('v1', [['a', 'a1', 'x']]), timedVerse('v1', [['b', 'b1', 'y']])]);
    assert.equal(out.verses.length, 1);
    assert.equal(out.verses[0].lines[0].words[0].id, 'a');
  });
  test('drops a later word that reuses a word id or a syllable id', () => {
    const out = L.cleanRecord([
      timedVerse('v1', [['a', 'a1', 'x'], ['b', 'b1', 'y']]),
      timedVerse('v2', [['a', 'c1', 'reusedword'], ['c', 'b1', 'reusedsyl'], ['d', 'd1', 'fine']]),
    ]);
    assert.deepEqual(out.verses[1].lines[0].words.map((w) => w.id), ['d']);
  });
  test('returns null for an empty record and for non-objects', () => {
    assert.equal(L.cleanRecord([]), null);
    assert.equal(L.cleanRecord({ verses: [] }), null);
    assert.equal(L.cleanRecord(null), null);
    assert.equal(L.cleanRecord('verses'), null);
    assert.equal(L.cleanRecord({ verses: 'x' }), null);
  });
});

describe('cleanSong and cleanSlide keep the record links', () => {
  test('verses survive cleanSong', () => {
    const { verses } = recordFrom('One two\n\nthree');
    assert.deepEqual(L.cleanSong({ verses }).verses, verses);
  });
  test('a song without verses has no verses key', () => {
    assert.equal('verses' in L.cleanSong({}), false);
    assert.equal('verses' in L.cleanSong({ verses: [] }), false);
  });
  test('addParts keeps the verses', () => {
    const { verses } = recordFrom('One');
    assert.deepEqual(L.addParts(L.cleanSong({ verses }), ['High']).verses, verses);
  });
  test('verse survives cleanSlide, and an empty or non-string verse is dropped', () => {
    const lines = [{ words: [{ id: 'a', syls: [{ id: 'a1', text: 'x' }] }] }];
    assert.equal(L.cleanSlide({ song: 's', verse: 'v1', lines }).verse, 'v1');
    assert.equal('verse' in L.cleanSlide({ song: 's', verse: '', lines }), false);
    assert.equal('verse' in L.cleanSlide({ song: 's', verse: 3, lines }), false);
  });
});

describe('recordText and verseRanges', () => {
  const text = 'Glo-ri-a in\nex-cel-sis\n\nHigh: Peace on earth\nLow: good will\n\nwell--known';
  test('verses join with blank lines', () => {
    const { verses } = recordFrom(text);
    assert.equal(verses.length, 3);
    assert.equal(L.recordText(verses), verses.map((v) => L.markup(v)).join('\n\n'));
  });
  test('each range slices exactly that verse', () => {
    const { verses } = recordFrom(text);
    const all = L.recordText(verses), ranges = L.verseRanges(verses);
    assert.deepEqual(ranges.map((r) => r.id), ['v1', 'v2', 'v3']);
    ranges.forEach((r, i) => assert.equal(all.slice(r.from, r.to), L.markup(verses[i])));
    assert.equal(ranges[2].to, all.length);
  });
  test('parsing the text gives the same shapes and parts back', () => {
    const { verses } = recordFrom(text);
    const again = L.parse(L.recordText(verses), counter('y'));
    assert.equal(again.slides.length, verses.length);
    again.slides.forEach((s, i) => assert.deepEqual(shape(s), shape(verses[i])));
    assert.deepEqual(again.parts, ['High', 'Low']);
  });
});

describe('applyText', () => {
  const base = 'Glo-ri-a in\nex-cel-sis\n\nPeace on earth\ngood will\n\nSing we now\nloud and clear';
  const setup = (text = base) => ({ verses: recordFrom(text).verses, make: counter('n') });
  test('unchanged text keeps every verse, word and syllable id', () => {
    const { verses, make } = setup();
    const res = L.applyText(verses, L.recordText(verses), make);
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2', 'v3']);
    res.verses.forEach((v, i) => { assert.deepEqual(ids(v), ids(verses[i])); assert.deepEqual(sylIds(v), sylIds(verses[i])); });
    assert.deepEqual(res.kept, { v1: true, v2: true, v3: true });
    assert.deepEqual(res.added, []);
    assert.deepEqual(res.absorbed, {});
    assert.deepEqual(res.dropped, []);
  });
  test('a typo fix changes only that word id', () => {
    const { verses, make } = setup();
    const res = L.applyText(verses, base.replace('earth', 'Earth!'), make);
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2', 'v3']);
    const before = ids(verses[1]), after = ids(res.verses[1]);
    assert.equal(after.length, before.length);
    assert.equal(after.filter((id, i) => id !== before[i]).length, 1);
    assert.deepEqual(ids(res.verses[0]), ids(verses[0]));
    assert.deepEqual(ids(res.verses[2]), ids(verses[2]));
  });
  test('adding syllable marks keeps the word id and makes new syllables', () => {
    const { verses, make } = setup(base.replace('Glo-ri-a', 'Gloria'));
    const before = verses[0].lines[0].words[0];
    const res = L.applyText(verses, L.recordText(verses).replace('Gloria', 'Glo-ri-a'), make);
    const after = res.verses[0].lines[0].words[0];
    assert.equal(after.id, before.id);
    assert.deepEqual(after.syls.map((s) => s.text), ['Glo', 'ri', 'a']);
    assert.ok(after.syls.every((s) => s.id !== before.syls[0].id));
  });
  test('a split keeps the verse, adds one after it, and the moved words keep their ids', () => {
    const { verses, make } = setup();
    const res = L.applyText(verses, base.replace('Peace on earth\ngood will', 'Peace on earth\n\ngood will'), make);
    assert.equal(res.verses.length, 4);
    assert.equal(res.verses[1].id, 'v2');
    assert.deepEqual(res.added, [{ id: res.verses[2].id, after: 'v2' }]);
    assert.deepEqual(ids(res.verses[2]), verses[1].lines[1].words.map((w) => w.id));
    assert.deepEqual(res.dropped, []);
    assert.deepEqual(res.absorbed, {});
  });
  test('a join keeps the first verse and absorbs the second into it', () => {
    const { verses, make } = setup();
    const res = L.applyText(verses, base.replace('good will\n\nSing', 'good will\nSing'), make);
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2']);
    assert.deepEqual(res.absorbed, { v3: 'v2' });
    assert.deepEqual(res.dropped, []);
    assert.deepEqual(res.added, []);
    assert.deepEqual(ids(res.verses[1]), ids(verses[1]).concat(ids(verses[2])));
  });
  test('deleting a verse’s text drops it', () => {
    const { verses, make } = setup();
    const res = L.applyText(verses, base.split('\n\n').slice(0, 2).join('\n\n'), make);
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2']);
    assert.deepEqual(res.dropped, ['v3']);
    assert.deepEqual(res.absorbed, {});
    assert.deepEqual(res.added, []);
  });
  test('a brand-new verse between 1 and 2 is added after verse 1', () => {
    const { verses, make } = setup();
    const parts = base.split('\n\n');
    const res = L.applyText(verses, [parts[0], 'Brand new words', parts[1], parts[2]].join('\n\n'), make);
    assert.equal(res.verses.length, 4);
    assert.deepEqual(res.added, [{ id: res.verses[1].id, after: 'v1' }]);
    assert.deepEqual([res.verses[0].id, res.verses[2].id, res.verses[3].id], ['v1', 'v2', 'v3']);
  });
  test('a new verse before verse 1 is added after verse 1, the following one', () => {
    const { verses, make } = setup();
    const res = L.applyText(verses, 'Brand new words\n\n' + base, make);
    assert.deepEqual(res.added, [{ id: res.verses[0].id, after: 'v1' }]);
  });
  test('a part tag on a line is reported in parts', () => {
    const { verses, make } = setup();
    const res = L.applyText(verses, base.replace('Peace on earth', 'High: Peace on earth'), make);
    assert.deepEqual(res.parts, ['High']);
    assert.equal(res.verses[1].lines[0].words[0].part, 'High');
    assert.equal(res.verses[1].id, 'v2');
  });
  test('only blank lines and a lone part tag is empty', () => {
    const { verses, make } = setup();
    assert.equal(L.parse('\n\nHigh:\n\n', counter()).slides.length, 0, 'it passes parse but has no words');
    assert.deepEqual(L.applyText(verses, '\n\nHigh:\n\n', make), { error: 'empty' });
    assert.deepEqual(L.applyText(verses, '', make), { error: 'empty' });
  });
  test('swapping two verses keeps both ids and their words', () => {
    const { verses, make } = setup();
    const parts = base.split('\n\n');
    const res = L.applyText(verses, [parts[0], parts[2], parts[1]].join('\n\n'), make);
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v3', 'v2']);
    assert.deepEqual(ids(res.verses[1]), ids(verses[2]));
    assert.deepEqual(ids(res.verses[2]), ids(verses[1]));
    assert.deepEqual(res.added, []);
    assert.deepEqual(res.dropped, []);
  });
  test('a repeated chorus keeps each copy’s own verse id', () => {
    const { verses, make } = setup('Sing it\n\nVerse one\n\nSing it');
    const res = L.applyText(verses, 'Sing it\n\nVerse one\n\nSing it', make);
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2', 'v3']);
    assert.deepEqual(ids(res.verses[2]), ids(verses[2]));
  });
  test('the result has no timing and the input is not changed', () => {
    const verses = [timedVerse('v1', [['a', 'a1', 'Hi', 1, 0.4]])];
    const before = JSON.stringify(verses);
    const res = L.applyText(verses, 'Hi', counter('n'));
    assert.equal(JSON.stringify(verses), before);
    assert.equal('t' in allSyls(res.verses[0])[0], false);
  });
});

describe('fillSlide', () => {
  const verse = timedVerse('v1', [['a', 'a1', 'One'], ['b', 'b1', 'two'], ['c', 'c1', 'three']]);
  const lyricWith = (times) => ({ lines: [{ words: times.map(([wid, sid, t, d]) => ({ id: wid, syls: [{ id: sid, text: 'x', t, d }] })) }] });
  test('keeps the slide’s own timing by syllable id', () => {
    const out = L.fillSlide(verse, 10, [{ start: 10, lyric: lyricWith([['a', 'a1', 0.5, 0.3]]) }]);
    assert.deepEqual(allSyls(out)[0], { id: 'a1', text: 'One', t: 0.5, d: 0.3 });
  });
  test('converts a syllable from another slide through mix time', () => {
    const out = L.fillSlide(verse, 11, [{ start: 11, lyric: lyricWith([]) }, { start: 10, lyric: lyricWith([['b', 'b1', 1.5, 0.2]]) }]);
    assert.equal(allSyls(out)[1].t, 0.5);
    assert.equal(allSyls(out)[1].d, 0.2);
  });
  test('the first source wins', () => {
    const out = L.fillSlide(verse, 0, [{ start: 0, lyric: lyricWith([['a', 'a1', 1, 0.3]]) }, { start: 0, lyric: lyricWith([['a', 'a1', 2, 0.6]]) }]);
    assert.equal(allSyls(out)[0].t, 1);
    assert.equal(allSyls(out)[0].d, 0.3);
  });
  test('syllables with no timing anywhere stay untimed', () => {
    const out = L.fillSlide(verse, 0, [{ start: 0, lyric: lyricWith([['a', 'a1', 1, 0.3]]) }]);
    assert.equal('t' in allSyls(out)[2], false);
    assert.equal('d' in allSyls(out)[2], false);
  });
  test('the verse is not changed and no song or verse is set', () => {
    const before = JSON.stringify(verse);
    const out = L.fillSlide(verse, 0, [{ start: 0, lyric: lyricWith([['a', 'a1', 1, 0.3]]) }]);
    assert.equal(JSON.stringify(verse), before);
    assert.deepEqual(Object.keys(out), ['lines']);
  });
});

describe('buildRecord', () => {
  const slide = (id, start, index, text, opts = {}) => {
    const lyric = L.parse(text, counter(opts.prefix || id + '-')).slides[0];
    lyric.song = 's1';
    if (opts.time) Object.assign(lyric.lines[0].words[0].syls[0], { t: opts.time, d: 0.3 });
    return { id, start, index, hidden: !!opts.hidden, lyric };
  };
  test('visible slides out of time order become verses in time order with their own ids', () => {
    const slides = [slide('c', 20, 0, 'Third'), slide('a', 0, 1, 'First'), slide('b', 10, 2, 'Second')];
    const out = L.buildRecord(slides, counter('v'));
    assert.deepEqual(out.verses.map((v) => L.markup(v)), ['First', 'Second', 'Third']);
    assert.deepEqual(ids(out.verses[0]), ids(slides[1].lyric));
    assert.equal(out.links.a.verse, out.verses[0].id);
    assert.equal(out.links.c.verse, out.verses[2].id);
    assert.equal(out.links.a.song, 's1');
    out.verses.forEach((v) => assert.ok(allSyls(v).every((s) => !('t' in s))));
  });
  test('a hidden copy at the same start links to the same verse, remapped by position, keeping its own timing', () => {
    const shown = slide('b', 10, 1, 'Peace on earth');
    const take = slide('a', 10.02, 0, 'peace on Earth', { hidden: true, time: 0.7 });
    const out = L.buildRecord([take, shown], counter('v'));
    assert.equal(out.verses.length, 1);
    assert.equal(out.links.a.verse, out.verses[0].id);
    assert.deepEqual(ids(out.links.a), ids(out.verses[0]));
    assert.deepEqual(sylIds(out.links.a), sylIds(out.verses[0]));
    assert.equal(out.links.a.lines[0].words[0].syls[0].t, 0.7);
    assert.equal(out.links.a.lines[0].words[0].syls[0].text, 'peace');
  });
  test('a hidden slide with different words becomes its own verse, in time order', () => {
    const out = L.buildRecord([slide('a', 0, 0, 'One'), slide('b', 20, 1, 'Three'), slide('h', 10, 2, 'Two', { hidden: true })], counter('v'));
    assert.deepEqual(out.verses.map((v) => L.markup(v)), ['One', 'Two', 'Three']);
    assert.equal(out.links.h.verse, out.verses[1].id);
  });
  test('a hidden copy with the same words far from the shown one is its own verse', () => {
    const out = L.buildRecord([slide('a', 0, 0, 'Same'), slide('h', 5, 1, 'Same', { hidden: true })], counter('v'));
    assert.equal(out.verses.length, 2);
  });
  test('when every slide is hidden, all become verses', () => {
    const out = L.buildRecord([slide('a', 0, 0, 'One', { hidden: true }), slide('b', 0, 1, 'One', { hidden: true })], counter('v'));
    assert.equal(out.verses.length, 2);
  });
  test('two visible slides sharing ids: the second is re-id’d and its link matches, timing kept', () => {
    const first = slide('a', 0, 0, 'Hello there', { prefix: 'same-' });
    const second = slide('b', 10, 1, 'Hello there', { prefix: 'same-', time: 1.2 });
    const out = L.buildRecord([first, second], counter('v'));
    assert.equal(out.verses.length, 2);
    assert.deepEqual(ids(out.verses[0]), ids(first.lyric));
    assert.notDeepEqual(ids(out.verses[1]), ids(first.lyric));
    assert.deepEqual(ids(out.links.b), ids(out.verses[1]));
    assert.deepEqual(sylIds(out.links.b), sylIds(out.verses[1]));
    assert.equal(out.links.b.lines[0].words[0].syls[0].t, 1.2);
    assert.equal(new Set(out.verses.map((v) => v.id)).size, 2);
  });
  test('the record it builds passes cleanRecord unchanged', () => {
    const out = L.buildRecord([slide('a', 0, 0, 'One two'), slide('b', 5, 1, 'three')], counter('v'));
    assert.deepEqual(L.cleanRecord(out.verses).verses, out.verses);
  });
});

describe('verse labels', () => {
  test('[Chorus] before a chunk names it', () => {
    const out = parse('One two\n\n[Chorus]\nSing it loud');
    assert.equal(out.slides.length, 2);
    assert.equal('label' in out.slides[0], false);
    assert.equal(out.slides[1].label, 'Chorus');
    assert.deepEqual(shape(out.slides[1]).map((ln) => ln.map((w) => w.syls.join(''))), [['Sing', 'it', 'loud']]);
  });
  test('a label row ends the previous chunk even without a blank line', () => {
    const out = parse('One two\n[Bridge]\nthree four');
    assert.equal(out.slides.length, 2);
    assert.equal(out.slides[1].label, 'Bridge');
  });
  test('spaces inside the brackets are trimmed', () => {
    assert.equal(parse('[  Chorus  ]\nSing').slides[0].label, 'Chorus');
  });
  test('a trailing label with no lines after it is dropped', () => {
    const out = parse('One two\n\n[Outro]');
    assert.equal(out.slides.length, 1);
    assert.equal('label' in out.slides[0], false);
  });
  test('[] and [   ] stay lyric rows', () => {
    const out = parse('[]\n[   ]');
    assert.equal(out.slides.length, 1);
    assert.equal('label' in out.slides[0], false);
    assert.equal(out.slides[0].lines.length, 2);
  });
  test('a 41-character label is a lyric row, and 40 characters is a label', () => {
    const out = parse('[' + 'x'.repeat(41) + ']\nSing');
    assert.equal(out.slides.length, 1);
    assert.equal('label' in out.slides[0], false);
    assert.equal(out.slides[0].lines.length, 2);
    assert.equal(parse('[' + 'x'.repeat(40) + ']\nSing').slides[0].label, 'x'.repeat(40));
  });
});

describe('recordText and verseRanges with labels', () => {
  const labelled = () => {
    const { verses } = recordFrom('One two\n\nSing it loud\n\nthree four');
    verses[1].label = 'Chorus';
    return verses;
  };
  test('parsing recordText gives the same labels back', () => {
    const again = L.parse(L.recordText(labelled()), counter('y'));
    assert.deepEqual(again.slides.map((s) => s.label || null), [null, 'Chorus', null]);
  });
  test('verseMarkup puts the label row first', () => {
    const verses = labelled();
    assert.equal(L.verseMarkup(verses[1]), '[Chorus]\n' + L.markup(verses[1]));
    assert.equal(L.verseMarkup(verses[0]), L.markup(verses[0]));
  });
  test('a labelled verse’s range starts at the [', () => {
    const verses = labelled(), all = L.recordText(verses), ranges = L.verseRanges(verses);
    assert.equal(all.charAt(ranges[1].from), '[');
    ranges.forEach((r, i) => assert.equal(all.slice(r.from, r.to), L.verseMarkup(verses[i])));
    assert.equal(ranges[2].to, all.length);
  });
});

describe('applyText with labels', () => {
  const base = 'One two\n\nSing it loud\n\nthree four';
  test('adding only a label keeps the verse id and its word ids', () => {
    const { verses } = recordFrom(base);
    const res = L.applyText(verses, 'One two\n\n[Chorus]\nSing it loud\n\nthree four', counter('n'));
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2', 'v3']);
    assert.equal(res.verses[1].label, 'Chorus');
    assert.deepEqual(ids(res.verses[1]), ids(verses[1]));
    assert.equal('label' in res.verses[0], false);
    assert.deepEqual(res.added, []);
  });
  test('renaming a label keeps the verse id', () => {
    const { verses } = recordFrom(base);
    verses[1].label = 'Chorus';
    const res = L.applyText(verses, L.recordText(verses).replace('[Chorus]', '[Refrain]'), counter('n'));
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2', 'v3']);
    assert.equal(res.verses[1].label, 'Refrain');
  });
  test('adding a label above verse 2 with no blank line keeps both verse ids', () => {
    const { verses } = recordFrom('One two\n\nSing it loud');
    const res = L.applyText(verses, 'One two\n[Chorus]\nSing it loud', counter('n'));
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2']);
    assert.equal(res.verses[1].label, 'Chorus');
  });
  test('removing a label drops it from the verse', () => {
    const { verses } = recordFrom(base);
    verses[1].label = 'Chorus';
    const res = L.applyText(verses, base, counter('n'));
    assert.deepEqual(res.verses.map((v) => v.id), ['v1', 'v2', 'v3']);
    assert.equal('label' in res.verses[1], false);
  });
});

describe('cleanRecord labels', () => {
  const one = (label) => L.cleanRecord([Object.assign(timedVerse('v1', [['a', 'a1', 'x']]), { label })]).verses[0];
  test('keeps a good label and trims spaces', () => {
    assert.equal(one('Chorus').label, 'Chorus');
    assert.equal(one('  Chorus 2 ').label, 'Chorus 2');
  });
  test('drops a label with a bracket, a line break, no text, too many characters or the wrong type', () => {
    ['Cho]rus', '[Chorus', 'Cho\nrus', '   ', '', 'x'.repeat(41), 7, null].forEach((bad) => assert.equal('label' in one(bad), false, String(bad)));
  });
  test('labels survive cleanSong', () => {
    const verses = [Object.assign(timedVerse('v1', [['a', 'a1', 'x']]), { label: 'Chorus' })];
    assert.equal(L.cleanSong({ verses }).verses[0].label, 'Chorus');
  });
});

describe('cleanSong: view, roll and parked', () => {
  const lyricText = (id, verse) => ({ id, text: 'x', start: 1, lyric: { song: 's1', verse, lines: [{ words: [{ id: 'w' + id, syls: [{ id: 's' + id, text: 'x' }] }] }] } });
  test('defaults to slides view and a full roll at size 64', () => {
    const out = L.cleanSong({});
    assert.equal(out.view, 'slides');
    assert.deepEqual(out.roll, ROLL_FULL);
    assert.equal(out.roll.look.size, 64);
    assert.deepEqual(L.ROLL_DEFAULTS, { frame: { x: 0.06, y: 0.52, w: 0.88, h: 0.42 }, align: 'center', above: 1, below: 2, move: 'stay', motion: 'smooth', verses: 'mark' });
  });
  test('view roll is kept; anything else is slides', () => {
    assert.equal(L.cleanSong({ view: 'roll' }).view, 'roll');
    assert.equal(L.cleanSong({ view: 'lines' }).view, 'slides');
  });
  test('line counts are clamped, rounded and fall back when not numbers', () => {
    assert.equal(L.cleanSong({ roll: { above: 9 } }).roll.above, 4);
    assert.equal(L.cleanSong({ roll: { below: -1 } }).roll.below, 0);
    assert.equal(L.cleanSong({ roll: { above: 'x' } }).roll.above, 1);
    assert.equal(L.cleanSong({ roll: { below: 2.6 } }).roll.below, 3);
    assert.equal(L.cleanSong({ roll: { below: 99 } }).roll.below, 6);
  });
  test('a bad frame falls back to the default, and a frame past the edge is pulled back inside', () => {
    assert.deepEqual(L.cleanRoll({ frame: { x: 0.1, y: 'top', w: 0.5, h: 0.5 } }).frame, L.ROLL_DEFAULTS.frame);
    assert.deepEqual(L.cleanRoll({ frame: null }).frame, L.ROLL_DEFAULTS.frame);
    const f = L.cleanRoll({ frame: { x: 0.9, y: 0.2, w: 0.3, h: 0.5 } }).frame;
    assert.equal(f.w, 0.3);
    assert.equal(f.x, 0.7);
    assert.deepEqual(L.cleanRoll({ frame: { x: -1, y: 0.2, w: 2, h: 0.01 } }).frame, { x: 0, y: 0.2, w: 1, h: 0.05 });
  });
  test('unknown choices fall back to the defaults, one at a time', () => {
    const good = { align: 'left', move: 'page', motion: 'jump', verses: 'screen' };
    const defaults = { align: 'center', move: 'stay', motion: 'smooth', verses: 'mark' };
    Object.keys(good).forEach((key) => {
      const out = L.cleanRoll(Object.assign({}, good, { [key]: 'nope' }));
      assert.equal(out[key], defaults[key], key);
      Object.keys(good).filter((k) => k !== key).forEach((k) => assert.equal(out[k], good[k], key + ' left ' + k));
    });
  });
  test('a roll look keeps its own size, and a full roll round-trips unchanged', () => {
    assert.equal(L.cleanRoll({ look: { size: 90 } }).look.size, 90);
    const once = L.cleanSong({ view: 'roll', roll: { above: 2, below: 3, move: 'page', motion: 'jump', verses: 'none', align: 'left', frame: { x: 0.1, y: 0.2, w: 0.5, h: 0.3 }, look: { size: 50, color: '#123456' } } });
    assert.deepEqual(L.cleanSong(once), once);
  });
  test('parked blocks of the other view are kept', () => {
    const out = L.cleanSong({ view: 'roll', parked: { view: 'slides', texts: [lyricText('t1', 'v1')], groups: [{ id: 'g1', name: 'Song', fill: 'packed' }] } });
    assert.equal(out.parked.view, 'slides');
    assert.deepEqual(out.parked.texts.map((tx) => tx.id), ['t1']);
    assert.equal(out.parked.texts[0].start, 1);
    assert.deepEqual(out.parked.groups, [{ id: 'g1', name: 'Song', fill: 'packed' }]);
  });
  test('parked with the same view as the song is dropped', () => {
    assert.equal('parked' in L.cleanSong({ view: 'roll', parked: { view: 'roll', texts: [lyricText('t1', 'v1')] } }), false);
    assert.equal('parked' in L.cleanSong({ parked: { view: 'slides', texts: [lyricText('t1', 'v1')] } }), false);
  });
  test('a parked text with an invalid lyric is dropped, and parked with no texts left is dropped', () => {
    const bad = Object.assign(lyricText('t2', 'v1'), { lyric: { song: 's1', lines: [] } });
    const noId = Object.assign(lyricText('t3', 'v1'), { id: '' });
    const out = L.cleanSong({ view: 'roll', parked: { view: 'slides', texts: [lyricText('t1', 'v1'), bad, noId], groups: [{ id: 'g' }] } });
    assert.deepEqual(out.parked.texts.map((tx) => tx.id), ['t1']);
    assert.deepEqual(out.parked.groups, []);
    assert.equal('parked' in L.cleanSong({ view: 'roll', parked: { view: 'slides', texts: [bad] } }), false);
  });
});

describe('matchLines', () => {
  const line = (...wordIds) => ({ words: wordIds.map((id) => ({ id, syls: [{ id: 's' + id, text: id }] })) });
  const block = (...lines) => ({ lines });
  test('one block per line maps in order', () => {
    const rec = [line('a', 'b'), line('c'), line('d', 'e')];
    assert.deepEqual(L.matchLines(rec, [block(line('a', 'b')), block(line('c')), block(line('d', 'e'))]).lineOf, [0, 1, 2]);
  });
  test('two blocks sharing one line both map to it (a duplicated take)', () => {
    const rec = [line('a', 'b'), line('c')];
    assert.deepEqual(L.matchLines(rec, [block(line('a', 'b')), block(line('a', 'b')), block(line('c'))]).lineOf, [0, 0, 1]);
  });
  test('a block with no shared word ids maps to -1', () => {
    assert.deepEqual(L.matchLines([line('a')], [block(line('z'))]).lineOf, [-1]);
  });
  test('the line with the most shared words wins, and a tie goes to the lower index', () => {
    const rec = [line('a'), line('b', 'c'), line('d')];
    assert.deepEqual(L.matchLines(rec, [block(line('a', 'b', 'c'))]).lineOf, [1]);
    assert.deepEqual(L.matchLines(rec, [block(line('d', 'a'))]).lineOf, [0]);
  });
});

describe('linesNeedingBlocks', () => {
  const line = (...wordIds) => ({ words: wordIds.map((id) => ({ id, syls: [{ id: 's' + id, text: id }] })) });
  const block = (...lines) => ({ lines });
  test('first Make lines in column 1: no blocks yet, so none are added here', () => {
    const rec = [line('a', 'b'), line('c'), line('d', 'e')];
    assert.deepEqual(L.linesNeedingBlocks(rec.length, L.matchLines(rec, []).lineOf), []);
  });
  test('first Make lines in column 2: its own lines with no blocks get none here', () => {
    const rec = [line('f'), line('g', 'h')];
    assert.deepEqual(L.linesNeedingBlocks(rec.length, L.matchLines(rec, []).lineOf), []);
  });
  test('an Update adds only the lines no block matches', () => {
    const rec = [line('a'), line('b'), line('c'), line('d')];
    const lineOf = L.matchLines(rec, [block(line('a')), block(line('c'))]).lineOf;
    assert.deepEqual(lineOf, [0, 2]);
    assert.deepEqual(L.linesNeedingBlocks(rec.length, lineOf), [1, 3]);
  });
  test('duplicated takes of one line count once', () => {
    assert.deepEqual(L.linesNeedingBlocks(2, [0, 0, 1]), []);
  });
  test('every word replaced on Update: old blocks all map to -1 and every line gets a new block', () => {
    assert.deepEqual(L.linesNeedingBlocks(3, [-1, -1]), [0, 1, 2]);
  });
  test('a shrunk record ignores block indexes past its end', () => {
    assert.deepEqual(L.linesNeedingBlocks(2, [0, 1, 2]), []);
  });
});

describe('cleanSong part labels', () => {
  const partWith = (label) => L.cleanSong({ parts: [{ name: 'High', color: '#123456', label }] }).parts[0];
  test('a part with no label gets no label key, and an empty song keeps its old shape', () => {
    const part = L.cleanSong({ parts: [{ name: 'High', color: '#123456' }] }).parts[0];
    assert.deepEqual(part, { name: 'High', color: '#123456', hi: '#FFD54A' });
    assert.equal('label' in part, false);
    assert.deepEqual(L.cleanSong({}), Object.assign({ showParts: false, parts: [] }, songDefaults()));
  });
  test('valid overrides are kept', () => {
    const label = { size: 60, font: 'lora', italic: true, color: '#AABBCC', look: 'solid', solidColor: '#112233', solidWidth: 4 };
    assert.deepEqual(partWith(label).label, label);
  });
  test('size clamps to 30-150 in steps of 5, and 100 alone stores nothing', () => {
    assert.equal(partWith({ size: 10 }).label.size, 30);
    assert.equal(partWith({ size: 400 }).label.size, 150);
    assert.equal(partWith({ size: 62 }).label.size, 60);
    assert.equal('label' in partWith({ size: 100 }), false);
    assert.deepEqual(L.LABEL_SIZE, { min: 30, max: 150, step: 5 });
  });
  test('a box is not allowed, and only the fields of the chosen look are kept', () => {
    assert.equal('label' in partWith({ look: 'box', boxColor: '#000000', boxOpacity: 50 }), false);
    assert.deepEqual(partWith({ look: 'solid', solidColor: '#112233', solidWidth: 99, glowColor: '#FFFFFF', glowOpacity: 50 }).label,
      { look: 'solid', solidColor: '#112233', solidWidth: 20 });
    assert.deepEqual(partWith({ look: 'outline', glowColor: '#FFFFFF' }).label,
      { look: 'outline', glowColor: '#FFFFFF', glowOpacity: 60, glowWidth: 12, glowSoft: 20 });
    assert.deepEqual(partWith({ look: 'shadow' }).label, { look: 'shadow' });
    assert.deepEqual(partWith({ bold: true, solidColor: '#112233', glowWidth: 10 }).label, { bold: true });
  });
  test('a valid part whose label holds only bad values is kept with no label', () => {
    const part = partWith({ size: 'big', color: 'red', bold: 'yes', font: '' });
    assert.deepEqual(part, { name: 'High', color: '#123456', hi: '#FFD54A' });
  });
  test('cleanPartLabel returns null for nothing usable', () => {
    assert.equal(L.cleanPartLabel(null), null);
    assert.equal(L.cleanPartLabel({}), null);
    assert.equal(L.cleanPartLabel({ font: 'x'.repeat(81) }), null);
  });
  test('addParts keeps an existing label and gives new parts none', () => {
    const out = L.addParts({ parts: [{ name: 'High', color: '#123456', label: { size: 50, bold: false } }] }, ['Low']);
    assert.deepEqual(out.parts[0].label, { size: 50, bold: false });
    assert.equal('label' in out.parts[1], false);
  });
});

describe('extraBlocks', () => {
  const plain = (start) => ({ hidden: false, timed: false, start });
  test('no shared lines drops nothing', () => {
    assert.deepEqual(L.extraBlocks([0, 1, 2], [plain(0), plain(5), plain(10)]), []);
  });
  test('two plain blocks on one line drop the later one', () => {
    assert.deepEqual(L.extraBlocks([0, 0], [plain(8), plain(3)]), [0]);
  });
  test('a timed block beats an untimed one even when it starts later', () => {
    assert.deepEqual(L.extraBlocks([4, 4], [plain(1), { hidden: false, timed: true, start: 9 }]), [0]);
  });
  test('a shown block beats a hidden one even when the hidden one is timed', () => {
    assert.deepEqual(L.extraBlocks([2, 2], [{ hidden: true, timed: true, start: 0 }, plain(6)]), [0]);
  });
  test('with the same start the lower index is kept', () => {
    assert.deepEqual(L.extraBlocks([1, 1], [plain(4), plain(4)]), [1]);
  });
  test('blocks with no line are never dropped, while a real pair on another line still is', () => {
    const keys = [-1, null, undefined, 3, 3, -1];
    const facts = [plain(0), plain(0), plain(0), plain(2), plain(7), plain(0)];
    assert.deepEqual(L.extraBlocks(keys, facts), [4]);
  });
  test('verse ids work as keys', () => {
    assert.deepEqual(L.extraBlocks(['v1', 'v2', 'v1'], [plain(0), plain(3), plain(9)]), [2]);
  });
  test('a number and a string with the same text are different lines', () => {
    assert.deepEqual(L.extraBlocks([1, '1'], [plain(0), plain(1)]), []);
  });
  test('three blocks on one line drop two', () => {
    assert.deepEqual(L.extraBlocks([0, 0, 0], [plain(5), { hidden: false, timed: true, start: 9 }, plain(1)]), [0, 2]);
  });
  test('inputs are left alone', () => {
    const keys = [0, 0, 1], facts = [plain(3), plain(1), plain(2)];
    const keysBefore = structuredClone(keys), factsBefore = structuredClone(facts);
    L.extraBlocks(keys, facts);
    assert.deepEqual(keys, keysBefore);
    assert.deepEqual(facts, factsBefore);
  });
});

describe('repeatLines', () => {
  const word = (id, text) => ({ id, syls: [{ id: id + 's', text }] });
  const line = (id, text, extra = {}) => Object.assign({ words: [word(id, text)] }, extra);
  const record = () => [
    { id: 'va', label: 'Verse 1', lines: [line('a1', 'one'), line('a2', 'two')] },
    { id: 'vb', lines: [line('b1', 'three', { cols: ['Kids'] }), line('b2', 'four')] },
    { id: 'vc', lines: [line('c1', 'five')] }
  ];
  const texts = (verses) => verses.map((v) => v.lines.map((l) => l.words[0].syls[0].text));
  const allIds = (verses) => verses.flatMap((v) => v.lines.flatMap((l) => l.words.flatMap((w) => [w.id, ...w.syls.map((s) => s.id)])));
  test('copies picked lines into a new verse right after the verse holding the last pick', () => {
    const out = L.repeatLines(record(), [0, 1], counter('n'));
    assert.deepEqual(texts(out.verses), [['one', 'two'], ['one', 'two'], ['three', 'four'], ['five']]);
    assert.equal(out.count, 2);
    assert.deepEqual(out.added, [out.verses[1].id]);
  });
  test('picks across two verses make two new verses in order, after the last picked verse', () => {
    const out = L.repeatLines(record(), [3, 1], counter('n'));
    assert.deepEqual(texts(out.verses), [['one', 'two'], ['three', 'four'], ['two'], ['four'], ['five']]);
    assert.equal(out.added.length, 2);
    assert.equal(out.count, 2);
  });
  test('copies get fresh word and syllable ids', () => {
    const src = record(), out = L.repeatLines(src, [0, 2], counter('n'));
    const oldIds = new Set(allIds(src));
    const newIds = allIds(out.verses.filter((v) => out.added.includes(v.id)));
    assert.equal(newIds.length, 4);
    newIds.forEach((id) => assert.equal(oldIds.has(id), false));
  });
  test('original verses keep their ids', () => {
    const src = record(), out = L.repeatLines(src, [2], counter('n'));
    assert.deepEqual(out.verses.filter((v) => !out.added.includes(v.id)), src);
  });
  test('a verse label and the cols on a line are kept on the copy', () => {
    const out = L.repeatLines(record(), [0, 2], counter('n'));
    const added = out.verses.filter((v) => out.added.includes(v.id));
    assert.equal(added[0].label, 'Verse 1');
    assert.equal('label' in added[1], false);
    assert.deepEqual(added[1].lines[0].cols, ['Kids']);
  });
  test('repeated and out-of-range picks are ignored, while a valid pick still copies', () => {
    const out = L.repeatLines(record(), [4, 4, -1, 9, 1.5], counter('n'));
    assert.deepEqual(texts(out.verses), [['one', 'two'], ['three', 'four'], ['five'], ['five']]);
    assert.equal(out.count, 1);
  });
  test('an empty pick changes nothing', () => {
    const src = record(), out = L.repeatLines(src, [], counter('n'));
    assert.equal(out.count, 0);
    assert.deepEqual(out.added, []);
    assert.deepEqual(out.verses, src);
  });
  test('inputs are left alone', () => {
    const src = record(), picks = [1, 0], before = structuredClone(src);
    L.repeatLines(src, picks, counter('n'));
    assert.deepEqual(src, before);
    assert.deepEqual(picks, [1, 0]);
  });
});
