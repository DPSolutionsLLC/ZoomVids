import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
const L = loadModule('Lyrics');

const GOLD = '#D4AF37';
const word = (id, text) => ({ id, syls: [{ id: id + 's0', text }] });
const verse = (id, text) => ({ id, lines: [{ words: text.split(' ').map((w, i) => word(id + i, w)) }] });

function rollFields(roll) {
  const out = {};
  ['align', 'above', 'below', 'move', 'motion', 'verses', 'look'].forEach((k) => { out[k] = roll[k]; });
  return out;
}
function showFields(song) {
  const out = {};
  ['showParts', 'highlight', 'keepLit', 'singColor', 'countdown', 'breakGap', 'countLen'].forEach((k) => { out[k] = song[k]; });
  return out;
}
function threeColumns() {
  return L.cleanSong({
    view: 'roll', columns: true,
    parts: [{ name: 'Men', color: '#112233', hi: '#445566' }, { name: 'Women', color: '#AA0000', hi: '#FFFFFF' }],
    highlight: 'word', singColor: GOLD,
    roll: { above: 1, below: 2, look: { font: 'georgia', color: GOLD }, heading: 'One', frame: { x: 0.03, y: 0.3, w: 0.3, h: 0.6 } },
    more: [
      { heading: 'Two', frame: { x: 0.35, y: 0.3, w: 0.3, h: 0.6 }, verses: [verse('a', 'Two words')], set: Object.assign(L.columnDefaults(), { above: 3, look: Object.assign(L.columnDefaults().look, { font: 'arial', look: 'box' }), countdown: 'off' }) },
      { heading: 'Three', frame: { x: 0.67, y: 0.3, w: 0.3, h: 0.6 }, parked: { texts: [{ id: 't1', lyric: { lines: [{ words: [word('p', 'Hi')] }], col: 3 } }], groups: [] }, set: L.columnDefaults() }
    ]
  });
}

describe('column defaults', () => {
  test('cleanColumn({}).set is the defaults', () => {
    assert.deepEqual(L.cleanColumn({}).set, L.columnDefaults());
  });
  test('the defaults are what a brand-new song gets', () => {
    const d = L.columnDefaults(), roll = L.cleanRoll({}), song = L.cleanSong({});
    assert.deepEqual(rollFields(d), rollFields(roll));
    assert.deepEqual(showFields(d), showFields(song));
    assert.deepEqual(d.parts, {});
    assert.equal('frame' in d, false);
    assert.equal('heading' in d, false);
  });
  test('columnDefaults returns a fresh object each time', () => {
    const a = L.columnDefaults();
    a.look.size = 99;
    assert.equal(L.columnDefaults().look.size, L.ROLL_SIZE);
  });
});

describe('migration of columns saved before they had settings', () => {
  const old = {
    view: 'roll', columns: true, highlight: 'word', singColor: GOLD, countdown: 'off',
    roll: { above: 3, look: { font: 'georgia', size: 50 } },
    more: [{ heading: 'Women', size: 80 }]
  };
  test('a column with no set takes the song settings and its own old size', () => {
    const set = L.cleanSong(old).more[0].set;
    assert.equal(set.above, 3);
    assert.equal(set.highlight, 'word');
    assert.equal(set.singColor, GOLD);
    assert.equal(set.countdown, 'off');
    assert.equal(set.look.size, 80);
    assert.equal(set.look.font, 'georgia');
    assert.equal('size' in L.cleanSong(old).more[0], false);
  });
  test('a legacy second migrates the same way', () => {
    const raw = Object.assign({}, old, { more: undefined, second: { heading: 'Women', size: 80 } });
    const set = L.cleanSong(raw).more[0].set;
    assert.equal(set.above, 3);
    assert.equal(set.countdown, 'off');
    assert.equal(set.look.size, 80);
    assert.equal(set.look.font, 'georgia');
  });
  test('migrating is stable: a second clean changes nothing', () => {
    const once = L.cleanSong(old);
    assert.deepEqual(L.cleanSong(once), once);
  });
  test('migration never overwrites a column’s own later edits', () => {
    const once = L.cleanSong(old);
    once.more[0].set.above = 0;
    once.roll.above = 4;
    assert.equal(L.cleanSong(once).more[0].set.above, 0);
  });
  test('a set that is not an object takes the migration path', () => {
    const set = L.cleanSong(Object.assign({}, old, { more: [{ size: 80, set: 'x' }] })).more[0].set;
    assert.equal(set.above, 3);
    assert.equal(set.look.size, 80);
  });
});

describe('songs without columns are unchanged', () => {
  test('cleanSong adds no new keys to a single-column song', () => {
    const out = L.cleanSong({ view: 'roll', highlight: 'word', parts: [{ name: 'Men' }] });
    assert.deepEqual(Object.keys(out).sort(), ['breakGap', 'countLen', 'countdown', 'highlight', 'keepLit', 'parts', 'roll', 'showParts', 'singColor', 'slideLook', 'view'].sort());
  });
});

describe('new tag columns get defaults', () => {
  test('a third @ name pads a column with the defaults, not the song settings', () => {
    const out = L.cleanSong({
      view: 'roll', columns: true, entry: 'tags', tagNames: ['Men', 'Women', 'Kids'],
      highlight: 'word', countdown: 'off', roll: { above: 4, look: { font: 'georgia' } },
      more: [{ heading: 'Women', set: { above: 0 } }]
    });
    assert.equal(out.more.length, 2);
    assert.equal(out.more[0].set.above, 0);
    assert.deepEqual(out.more[1].set, L.columnDefaults());
  });
});

describe('a partly filled set', () => {
  test('missing fields follow the song’s column 1, as when it was saved', () => {
    const out = L.cleanSong({ view: 'roll', columns: true, highlight: 'word', more: [{ set: { above: 0 } }] });
    assert.equal(out.more[0].set.above, 0);
    assert.equal(out.more[0].set.highlight, 'word');
  });
});

describe('reading a column’s settings', () => {
  test('column 1 is the roll and the song fields', () => {
    const song = threeColumns(), one = L.columnSettings(song, 1);
    assert.deepEqual(rollFields(one), rollFields(song.roll));
    assert.deepEqual(showFields(one), showFields(song));
    assert.deepEqual(one.parts, { Men: { color: '#112233', hi: '#445566' }, Women: { color: '#AA0000', hi: '#FFFFFF' } });
  });
  test('column 2 is its own set, with parts filled in from column 1', () => {
    const song = threeColumns(), two = L.columnSettings(song, 2);
    assert.equal(two.above, 3);
    assert.equal(two.look.font, 'arial');
    assert.equal(two.look.look, 'box');
    assert.equal(two.countdown, 'off');
    assert.deepEqual(two.parts, L.columnSettings(song, 1).parts);
  });
  test('a column’s own part entry wins over column 1’s', () => {
    const song = threeColumns();
    song.more[0].set.parts = { Men: { color: '#00FF00', hi: '#0000FF' } };
    const two = L.columnSettings(song, 2);
    assert.deepEqual(two.parts.Men, { color: '#00FF00', hi: '#0000FF' });
    assert.deepEqual(two.parts.Women, { color: '#AA0000', hi: '#FFFFFF' });
  });
  test('a missing column reads as the defaults', () => {
    const song = threeColumns(), nine = L.columnSettings(song, 9);
    assert.deepEqual(rollFields(nine), rollFields(L.columnDefaults()));
    assert.deepEqual(Object.keys(nine.parts), ['Men', 'Women']);
  });
  test('reading returns a copy', () => {
    const song = threeColumns();
    L.columnSettings(song, 2).look.size = 170;
    L.columnSettings(song, 1).look.size = 170;
    assert.notEqual(song.more[0].set.look.size, 170);
    assert.notEqual(song.roll.look.size, 170);
  });
});

describe('writing a column’s settings', () => {
  test('writing column 2 changes only more[0].set', () => {
    const song = threeColumns(), b = Object.assign(L.columnSettings(song, 2), { below: 5 });
    const out = L.cleanSong(L.withColumnSettings(song, 2, b));
    assert.equal(out.more[0].set.below, 5);
    const back = JSON.parse(JSON.stringify(out));
    back.more[0].set = song.more[0].set;
    assert.deepEqual(back, song);
  });
  test('writing column 1 changes the roll, the song fields and part colors, never the frame or heading', () => {
    const song = threeColumns(), b = L.columnSettings(song, 2);
    b.parts.Men = { color: '#00FF00', hi: '#0000FF', label: { bold: false } };
    const out = L.cleanSong(L.withColumnSettings(song, 1, b));
    assert.equal(out.roll.above, 3);
    assert.equal(out.roll.look.font, 'arial');
    assert.equal(out.countdown, 'off');
    assert.equal(out.highlight, 'syllable');
    assert.deepEqual(out.parts[0], { name: 'Men', color: '#00FF00', hi: '#0000FF', label: { bold: false } });
    assert.deepEqual(out.roll.frame, song.roll.frame);
    assert.equal(out.roll.heading, 'One');
  });
  test('writing column 1 with a part that has no label removes the label', () => {
    const song = L.cleanSong({ parts: [{ name: 'Men', color: '#112233', hi: '#445566', label: { bold: true } }] });
    const b = L.columnSettings(song, 1);
    delete b.parts.Men.label;
    assert.equal('label' in L.cleanSong(L.withColumnSettings(song, 1, b)).parts[0], false);
  });
  test('parts equal to column 1’s are not stored on column 2', () => {
    const song = threeColumns(), b = L.columnSettings(song, 2);
    b.parts.Women = { color: '#00FF00', hi: '#0000FF' };
    const out = L.cleanSong(L.withColumnSettings(song, 2, b));
    assert.deepEqual(out.more[0].set.parts, { Women: { color: '#00FF00', hi: '#0000FF' } });
  });
  test('writing never touches the song it was given', () => {
    const song = threeColumns(), before = JSON.stringify(song);
    L.withColumnSettings(song, 1, L.columnSettings(song, 2));
    L.withColumnSettings(song, 3, L.columnSettings(song, 2));
    assert.equal(JSON.stringify(song), before);
  });
});

describe('copying settings between columns', () => {
  test('copying column 1 to 2 and 3 makes them match column 1', () => {
    const song = threeColumns(), out = L.cleanSong(L.copyColumnSettings(song, 1, [2, 3]));
    assert.deepEqual(L.columnSettings(out, 2), L.columnSettings(song, 1));
    assert.deepEqual(L.columnSettings(out, 3), L.columnSettings(song, 1));
  });
  test('copying keeps every box, heading, lyrics record and parked block', () => {
    const song = threeColumns(), out = L.cleanSong(L.copyColumnSettings(song, 1, [2, 3]));
    out.more.forEach((c, i) => {
      assert.deepEqual(c.frame, song.more[i].frame);
      assert.equal(c.heading, song.more[i].heading);
      assert.deepEqual(c.verses, song.more[i].verses);
      assert.deepEqual(c.parked, song.more[i].parked);
    });
  });
  test('copying column 3 into column 1 changes its roll and look, not its frame or heading', () => {
    const song = threeColumns(), out = L.cleanSong(L.copyColumnSettings(song, 3, [1]));
    assert.deepEqual(out.roll.look, L.columnDefaults().look);
    assert.equal(out.roll.above, L.columnDefaults().above);
    assert.deepEqual(out.roll.frame, song.roll.frame);
    assert.equal(out.roll.heading, 'One');
    assert.equal(out.highlight, 'syllable');
  });
  test('the source itself and columns that don’t exist are ignored', () => {
    const song = threeColumns();
    assert.deepEqual(L.cleanSong(L.copyColumnSettings(song, 2, [2, 0, 4, 99, 1.5, '3'])), song);
  });
  test('copying returns a new song and leaves the old one alone', () => {
    const song = threeColumns(), before = JSON.stringify(song);
    L.copyColumnSettings(song, 1, [2, 3]);
    assert.equal(JSON.stringify(song), before);
  });
});

describe('cleaning column part entries', () => {
  test('part entries for names the song doesn’t have are dropped', () => {
    const song = threeColumns();
    song.more[0].set.parts = { Kids: { color: '#00FF00', hi: '#0000FF' }, Men: { color: '#00FF00', hi: '#0000FF' } };
    assert.deepEqual(Object.keys(L.cleanSong(song).more[0].set.parts), ['Men']);
  });
  test('an entry with a bad color is dropped', () => {
    const song = threeColumns();
    song.more[0].set.parts = { Men: { color: 'red', hi: '#0000FF' }, Women: { color: '#00FF00', hi: '#0000FF' } };
    assert.deepEqual(Object.keys(L.cleanSong(song).more[0].set.parts), ['Women']);
  });
  test('an entry’s label is cleaned like a song part’s', () => {
    const song = threeColumns();
    song.more[0].set.parts = { Men: { color: '#00FF00', hi: '#0000FF', label: { size: 100, junk: 1 } } };
    assert.deepEqual(L.cleanSong(song).more[0].set.parts.Men, { color: '#00FF00', hi: '#0000FF' });
  });
});

describe('bad column values are cleaned like the song’s own', () => {
  function withSet(set) {
    const song = threeColumns();
    song.more[0].set = Object.assign({}, song.more[0].set, set);
    return L.cleanSong(song).more[0].set;
  }
  test('above 99 clamps to 4', () => { assert.equal(withSet({ above: 99 }).above, 4); });
  test('highlight sweep maps to syllable', () => { assert.equal(withSet({ highlight: 'sweep' }).highlight, 'syllable'); });
  test('look size 5 clamps to 24', () => { assert.equal(withSet({ look: Object.assign({}, threeColumns().more[0].set.look, { size: 5 }) }).look.size, 24); });
  test('a bad value falls back to the column it was inheriting from, not the default', () => {
    const set = L.cleanColumnSet({ above: 'lots', countdown: 'sideways' }, Object.assign(L.columnDefaults(), { above: 3, countdown: 'bar' }));
    assert.equal(set.above, 3);
    assert.equal(set.countdown, 'bar');
  });
});
