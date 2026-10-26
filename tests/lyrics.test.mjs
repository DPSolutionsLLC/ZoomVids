import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const L = loadModule('Lyrics');

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
    s.song = 'song1';
    const out = L.reId(s, counter('n'));
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
        { id: 'b', syls: [{ id: 'b1', text: 'Hi', t: 2 }, { id: 'b2', text: '' }] },
      ] }],
    });
    assert.deepEqual(out, { song: 's1', lines: [{ words: [{ id: 'b', syls: [{ id: 'b1', text: 'Hi', t: 2 }] }] }] });
  });
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
    assert.deepEqual(out, { showParts: true, parts: [{ name: 'High', color: '#123456' }, { name: 'Low', color: L.PALETTE[1] }] });
  });
  test('showParts is only on when it is true', () => {
    assert.equal(L.cleanSong({ showParts: 'yes' }).showParts, false);
    assert.deepEqual(L.cleanSong({}).parts, []);
  });
  test('non-object input gives null', () => {
    assert.equal(L.cleanSong(null), null);
    assert.equal(L.cleanSong('x'), null);
    assert.equal(L.cleanSong([]), null);
  });
});

describe('addParts', () => {
  test('colors come in palette order and cycle after 6', () => {
    const out = L.addParts(null, ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    assert.deepEqual(out.parts.map((p) => p.color), L.PALETTE.concat([L.PALETTE[0]]));
  });
  test('existing parts are untouched and duplicates are skipped', () => {
    const base = { showParts: true, parts: [{ name: 'High', color: '#010203' }] };
    const out = L.addParts(base, ['high', 'Low', 'Low', 'bad name']);
    assert.deepEqual(out, { showParts: true, parts: [{ name: 'High', color: '#010203' }, { name: 'Low', color: L.PALETTE[1] }] });
    assert.equal(base.parts.length, 1);
  });
});
