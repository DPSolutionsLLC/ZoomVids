import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
globalThis.ColumnMoves = loadModule('ColumnMoves');
const L = loadModule('Lyrics');

const word = (id, text, part) => Object.assign({ id, syls: [{ id: id + 's0', text }] }, part ? { part } : {});
const verse = (id, part, extra = {}) => ({ id, lines: [Object.assign({ words: [word(id + 'w', 'Sing', part)] }, extra)] });
const slide = (id, part, col) => Object.assign({ lines: [{ words: [word(id, 'Hi', part)] }] }, col ? { col } : {});
const parked = (id, part, col) => ({ id, lyric: slide(id + 'l', part, col) });

const PARTS = [
  { name: 'High', color: '#112233', hi: '#445566', label: { size: 120, bold: true } },
  { name: 'Low', color: '#AA0000', hi: '#FFFFFF' },
  { name: 'Mid', color: '#00AA00', hi: '#000000' }
];
function song(more = {}) {
  return L.cleanSong(Object.assign({ view: 'roll', columns: true, parts: PARTS, more: [{ heading: 'Two', set: L.columnDefaults() }] }, more));
}
const names = (s) => s.parts.map((p) => p.name);

describe('fixtures pass the earlier checks', () => {
  test('every fixture part survives cleanSong, so only use decides what is removed', () => {
    assert.deepEqual(names(song()), ['High', 'Low', 'Mid']);
    PARTS.forEach((p) => assert.ok(L.PART_RE.test(p.name), p.name));
  });
});

describe('usedPartNames', () => {
  test('finds parts in the song record', () => {
    assert.deepEqual(L.usedPartNames(song({ verses: [verse('v', 'High')] }), []), { high: true });
  });
  test('finds parts in a column\'s record', () => {
    const s = song({ more: [{ verses: [verse('v', 'Low')], set: L.columnDefaults() }] });
    assert.deepEqual(L.usedPartNames(s, []), { low: true });
  });
  test('finds parts in a tagged record with cols', () => {
    const s = song({ entry: 'tags', tagNames: ['One', 'Two'], verses: [verse('v', 'Mid', { cols: ['Two'] })] });
    assert.equal(s.entry, 'tags');
    assert.deepEqual(L.usedPartNames(s, []), { mid: true });
  });
  test('finds parts in parked blocks of the song and of a column', () => {
    const s = song({
      parked: { view: 'slides', texts: [parked('p1', 'High')], groups: [] },
      more: [{ set: L.columnDefaults(), parked: { texts: [parked('p2', 'Low', 2)], groups: [] } }]
    });
    assert.ok(s.parked && s.more[0].parked, 'parked blocks kept');
    assert.deepEqual(L.usedPartNames(s, []), { high: true, low: true });
  });
  test('finds parts in the passed slides, case-insensitively', () => {
    assert.deepEqual(L.usedPartNames(song(), [slide('a', 'HIGH'), slide('b', 'mid', 2)]), { high: true, mid: true });
  });
});

describe('shelveUnusedParts', () => {
  function withOverrides() {
    return song({
      verses: [verse('v', 'High')],
      more: [{ heading: 'Two', set: Object.assign(L.columnDefaults(), { parts: { High: { color: '#010101', hi: '#020202' }, Low: { color: '#030303', hi: '#040404', label: { italic: true } } } }) }]
    });
  }
  test('removes only unused parts and keeps used ones with their overrides', () => {
    const res = L.shelveUnusedParts(withOverrides(), [slide('s', 'Mid')]);
    assert.deepEqual(res.removed, ['Low']);
    const out = L.cleanSong(res.song);
    assert.deepEqual(names(out), ['High', 'Mid']);
    assert.deepEqual(out.more[0].set.parts, { High: { color: '#010101', hi: '#020202' } });
  });
  test('moves an unused part\'s colors, label and column overrides to the shelf', () => {
    const res = L.shelveUnusedParts(withOverrides(), []);
    assert.deepEqual(res.removed, ['Low', 'Mid']);
    const out = L.cleanSong(res.song);
    assert.deepEqual(out.shelvedParts, [
      { name: 'Low', color: '#AA0000', hi: '#FFFFFF', cols: { 2: { color: '#030303', hi: '#040404', label: { italic: true } } } },
      { name: 'Mid', color: '#00AA00', hi: '#000000' }
    ]);
  });
  test('a used label survives, and a removed part\'s label is shelved', () => {
    const res = L.shelveUnusedParts(song({ verses: [verse('v', 'Low')] }), []);
    assert.deepEqual(res.removed, ['High', 'Mid']);
    assert.deepEqual(L.cleanSong(res.song).shelvedParts[0], { name: 'High', color: '#112233', hi: '#445566', label: { size: 120, bold: true } });
  });
  test('returns the song unchanged when every part is in use', () => {
    const s = song({ verses: [verse('a', 'High'), verse('b', 'Low'), verse('c', 'Mid')] });
    const res = L.shelveUnusedParts(s, []);
    assert.deepEqual(res.removed, []);
    assert.equal(res.song, s);
  });
  test('a column override for a removed part is not lost when cleanSong runs again', () => {
    const out = L.cleanSong(L.cleanSong(L.shelveUnusedParts(withOverrides(), []).song));
    assert.deepEqual(out.shelvedParts[0].cols, { 2: { color: '#030303', hi: '#040404', label: { italic: true } } });
    assert.equal(out.more[0].set.parts.Low, undefined);
  });
});

describe('addParts brings a shelved part back', () => {
  function shelvedHigh() {
    const s = song({
      verses: [verse('v', 'Low'), verse('w', 'Mid')],
      more: [{ heading: 'Two', set: Object.assign(L.columnDefaults(), { parts: { High: { color: '#010101', hi: '#020202' } } }) }]
    });
    return L.cleanSong(L.shelveUnusedParts(s, []).song);
  }
  test('restores colors, label and the column-2 override under the typed name', () => {
    const out = L.addParts(shelvedHigh(), ['high']);
    const part = out.parts.find((p) => p.name === 'high');
    assert.deepEqual(part, { name: 'high', color: '#112233', hi: '#445566', label: { size: 120, bold: true } });
    assert.deepEqual(out.more[0].set.parts.high, { color: '#010101', hi: '#020202' });
    assert.equal(out.shelvedParts, undefined);
    assert.deepEqual(L.cleanSong(out).more[0].set.parts.high, { color: '#010101', hi: '#020202' });
  });
  test('a name not on the shelf still gets the next palette color', () => {
    const before = shelvedHigh();
    const out = L.addParts(before, ['Alto']);
    const fresh = L.addParts(L.cleanSong(Object.assign({}, before, { shelvedParts: undefined })), ['Alto']);
    assert.deepEqual(out.parts.find((p) => p.name === 'Alto'), fresh.parts.find((p) => p.name === 'Alto'));
    assert.equal(out.shelvedParts.length, 1);
  });
});

describe('cleanSong and the shelf', () => {
  const entry = (name, color = '#123456') => ({ name, color, hi: '#FFFFFF' });
  test('keeps the shelf through a round trip', () => {
    const raw = { shelvedParts: [entry('Alto'), Object.assign(entry('Bass'), { label: { bold: true }, cols: { 3: { color: '#111111', hi: '#222222' } } })] };
    const out = L.cleanSong(raw);
    assert.deepEqual(out.shelvedParts, raw.shelvedParts);
    assert.deepEqual(L.cleanSong(out), out);
  });
  test('drops bad entries', () => {
    const out = L.cleanSong({ shelvedParts: [entry('Alto'), entry('two words'), entry('Bass', 'red'), 'x', null, { name: 'Tenor', color: '#111111' }, entry('Soprano')] });
    assert.deepEqual(out.shelvedParts.map((e) => e.name), ['Alto', 'Soprano']);
  });
  test('drops bad column entries and column keys below 2', () => {
    const out = L.cleanSong({ shelvedParts: [Object.assign(entry('Alto'), { cols: { 1: { color: '#111111', hi: '#222222' }, x: { color: '#111111', hi: '#222222' }, 2: { color: 'bad', hi: '#222222' } } })] });
    assert.deepEqual(out.shelvedParts, [entry('Alto')]);
  });
  test('drops an entry whose name is also a part, and duplicate names', () => {
    const out = L.cleanSong({ parts: [{ name: 'Alto', color: '#111111', hi: '#222222' }], shelvedParts: [entry('alto'), entry('Bass', '#000001'), entry('BASS', '#000002')] });
    assert.deepEqual(out.shelvedParts, [entry('BASS', '#000002')]);
  });
  test('caps the shelf at 50, dropping the oldest', () => {
    const list = Array.from({ length: 55 }, (_, i) => entry('P' + i));
    const out = L.cleanSong({ shelvedParts: list });
    assert.equal(L.SHELF_MAX, 50);
    assert.equal(out.shelvedParts.length, 50);
    assert.equal(out.shelvedParts[0].name, 'P5');
    assert.equal(out.shelvedParts[49].name, 'P54');
  });
  test('leaves the shelf out when it is empty', () => {
    assert.equal('shelvedParts' in L.cleanSong({ shelvedParts: [] }), false);
    assert.equal('shelvedParts' in L.cleanSong({}), false);
  });
});
