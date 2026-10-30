import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
globalThis.ColumnMoves = loadModule('ColumnMoves');
const L = loadModule('Lyrics');
const R = loadModule('RollView');

const word = (id, text) => ({ id, syls: [{ id: id + 's0', text }] });
const verse = (id, text) => ({ id, lines: [{ words: text.split(' ').map((w, i) => word(id + i, w)) }] });
const NEW_DEFAULTS = { appear: 'start', whenDone: 'stay', gaps: 'dots', hideGap: 8 };
const pick = (o) => ({ appear: o.appear, whenDone: o.whenDone, gaps: o.gaps, hideGap: o.hideGap });

function threeColumns(set2 = {}) {
  return L.cleanSong({
    view: 'roll', columns: true,
    more: [
      { heading: 'Two', verses: [verse('a', 'Two words')], set: Object.assign(L.columnDefaults(), set2) },
      { heading: 'Three', verses: [verse('b', 'Three words')], set: L.columnDefaults() }
    ]
  });
}

describe('the new column show fields', () => {
  test('default to today\'s behavior', () => {
    assert.deepEqual(pick(L.SHOW_DEFAULTS), NEW_DEFAULTS);
    assert.deepEqual(pick(L.cleanSong({})), NEW_DEFAULTS);
    assert.deepEqual(pick(L.columnDefaults()), NEW_DEFAULTS);
  });
  test('valid values are kept', () => {
    const raw = { appear: 'first', whenDone: 'fade', gaps: 'hide', hideGap: 12.5 };
    assert.deepEqual(pick(L.cleanSong(raw)), raw);
  });
  test('bad values fall back to the defaults, one field at a time', () => {
    const good = { appear: 'first', whenDone: 'fade', gaps: 'hide', hideGap: 20 };
    const bad = { appear: 'later', whenDone: 'vanish', gaps: 'skip', hideGap: 'x' };
    Object.keys(bad).forEach((key) => {
      const out = L.cleanSong(Object.assign({}, good, { [key]: bad[key] }));
      assert.equal(out[key], NEW_DEFAULTS[key], key);
      Object.keys(bad).filter((k) => k !== key).forEach((k) => assert.equal(out[k], good[k], key + ' left ' + k + ' alone'));
    });
  });
  test('a column 2+ falls back to the inherited column\'s values', () => {
    const inherit = Object.assign(L.columnDefaults(), { appear: 'first', whenDone: 'fade', gaps: 'hide', hideGap: 15 });
    const out = L.cleanColumnSet({ appear: 'soon', whenDone: 1, gaps: null, hideGap: NaN }, inherit);
    assert.deepEqual(pick(out), { appear: 'first', whenDone: 'fade', gaps: 'hide', hideGap: 15 });
  });
  test('hideGap is clamped to 6–60 and rounded to 0.5', () => {
    assert.equal(L.cleanSong({ hideGap: 3 }).hideGap, 6);
    assert.equal(L.cleanSong({ hideGap: 100 }).hideGap, 60);
    assert.equal(L.cleanSong({ hideGap: 7.3 }).hideGap, 7.5);
    assert.equal(L.cleanColumnSet({ hideGap: 61 }, L.columnDefaults()).hideGap, 60);
  });
  test('columnSettings returns a column\'s own values', () => {
    const song = threeColumns({ appear: 'first', gaps: 'hide', hideGap: 10 });
    assert.deepEqual(pick(L.columnSettings(song, 1)), NEW_DEFAULTS);
    assert.deepEqual(pick(L.columnSettings(song, 2)), { appear: 'first', whenDone: 'stay', gaps: 'hide', hideGap: 10 });
    assert.deepEqual(pick(L.columnSettings(song, 3)), NEW_DEFAULTS);
  });
  test('withColumnSettings writes Column 1 to the song and column 2 to more[0].set', () => {
    const song = threeColumns();
    const one = L.cleanSong(L.withColumnSettings(song, 1, { whenDone: 'fade' }));
    assert.equal(one.whenDone, 'fade');
    assert.equal(one.more[0].set.whenDone, 'stay');
    const two = L.cleanSong(L.withColumnSettings(song, 2, Object.assign(L.columnSettings(song, 2), { gaps: 'hide', hideGap: 9 })));
    assert.equal(two.gaps, 'dots');
    assert.equal(two.more[0].set.gaps, 'hide');
    assert.equal(two.more[0].set.hideGap, 9);
  });
  test('copyColumnSettings copies them to the ticked columns only', () => {
    const song = threeColumns({ appear: 'first', whenDone: 'fade', gaps: 'hide', hideGap: 11 });
    const out = L.cleanSong(L.copyColumnSettings(song, 2, [1]));
    assert.deepEqual(pick(out), { appear: 'first', whenDone: 'fade', gaps: 'hide', hideGap: 11 });
    assert.deepEqual(pick(out.more[1].set), NEW_DEFAULTS);
  });
  test('switching to @ tags keeps each column\'s choices', () => {
    const song = threeColumns({ appear: 'first', gaps: 'hide' });
    const tagged = L.cleanSong(Object.assign({}, song, { entry: 'tags', tagNames: ['One', 'Two', 'Three'] }));
    assert.equal(tagged.entry, 'tags');
    assert.equal(tagged.more[0].set.appear, 'first');
    assert.equal(tagged.more[0].set.gaps, 'hide');
    const back = L.cleanSong(Object.assign({}, tagged, { entry: undefined, tagNames: undefined }));
    assert.equal(back.more[0].set.appear, 'first');
  });
  test('an old project with no column settings cleans to the defaults', () => {
    const out = L.cleanSong({ view: 'roll', columns: true, highlight: 'word', more: [{ verses: [verse('a', 'Old words')], size: 70 }] });
    assert.deepEqual(pick(out), NEW_DEFAULTS);
    assert.deepEqual(pick(out.more[0].set), NEW_DEFAULTS);
    assert.equal(out.more[0].set.highlight, 'word');
  });
});

const ease = (a) => a * a * (3 - 2 * a);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// The panel alpha before column fades existed (rollPanelAlpha), kept here as the reference.
function oldAlpha(start, end, t) {
  if (t < start || t > end) return 0;
  return ease(clamp(Math.min((t - start) / 0.3, (end - t) / 0.3), 0, 1));
}
const line = (start, end, quiet = end) => ({ start, end, quiet });
const opts = (more = {}) => Object.assign({
  songStart: 0, songEnd: 50, ownStart: null, appear: 'start', whenDone: 'stay', gaps: 'dots', hideGap: 8,
  approach: R.APPROACH, fade: R.HIDE_FADE, edgeFade: 0.3
}, more);
const between = (x) => x > 0 && x < 1;

describe('columnAlpha', () => {
  test('exports the fixed fade and hold lengths', () => {
    assert.equal(R.HIDE_FADE, 0.75);
    assert.equal(R.HIDE_HOLD, 1);
  });
  test('with defaults it equals the old panel alpha exactly', () => {
    const lines = [line(20, 24), line(30, 34)];
    const o = opts({ songStart: 2, songEnd: 40, ownStart: 20 });
    for (let t = 0; t <= 42; t += 0.05) assert.equal(R.columnAlpha(lines, t, o), oldAlpha(2, 40, t), 't=' + t);
  });
  test('appear "first" stays hidden until just before its first line glides in', () => {
    const lines = [line(20, 24), line(30, 34)];
    const o = opts({ appear: 'first', ownStart: 20 });
    assert.equal(R.columnAlpha(lines, 10, o), 0);
    assert.equal(R.columnAlpha(lines, 16.2, o), 0);
    assert.ok(between(R.columnAlpha(lines, 16.6, o)));
    assert.equal(R.columnAlpha(lines, 17, o), 1);
  });
  test('appear "first" uses an earlier ownStart when the countdown needs room', () => {
    const lines = [line(20, 24)];
    const o = opts({ appear: 'first', ownStart: 15 });
    assert.equal(R.columnAlpha(lines, 14.2, o), 0);
    assert.ok(between(R.columnAlpha(lines, 14.6, o)));
    assert.equal(R.columnAlpha(lines, 15, o), 1);
  });
  test('appear "first" never starts before the song does', () => {
    const lines = [line(1, 4)];
    const o = opts({ appear: 'first', ownStart: 1, songStart: 0.5 });
    assert.equal(R.columnAlpha(lines, 0.4, o), 0);
    assert.equal(R.columnAlpha(lines, 0.8, o), 1);
  });
  test('whenDone "fade" fades out after its last line, while the song goes on', () => {
    const lines = [line(20, 24), line(30, 34)];
    const o = opts({ whenDone: 'fade' });
    assert.equal(R.columnAlpha(lines, 34, o), 1);
    assert.ok(between(R.columnAlpha(lines, 34.4, o)));
    assert.equal(R.columnAlpha(lines, 34.8, o), 0);
    assert.equal(R.columnAlpha(lines, 45, o), 0);
  });
  test('gaps "hide" hides during a 10 s break and is fully back when the glide starts', () => {
    const lines = [line(0, 4), line(14, 18)];
    const o = opts({ gaps: 'hide', hideGap: 8 });
    assert.equal(R.columnAlpha(lines, 5, o), 1);
    assert.ok(between(R.columnAlpha(lines, 5.4, o)));
    assert.equal(R.columnAlpha(lines, 8, o), 0);
    assert.ok(between(R.columnAlpha(lines, 10.6, o)));
    assert.equal(R.columnAlpha(lines, 11, o), 1);
    assert.equal(R.columnAlpha(lines, 16, o), 1);
  });
  test('a 6 s break (rest dots, shorter than hideGap) stays visible', () => {
    const lines = [line(0, 4), line(10, 14)];
    const o = opts({ gaps: 'hide', hideGap: 8 });
    for (let t = 0.5; t <= 13; t += 0.1) assert.equal(R.columnAlpha(lines, t, o), 1, 't=' + t);
  });
  test('a break of exactly hideGap hides', () => {
    const lines = [line(0, 4), line(12, 16)];
    assert.equal(R.columnAlpha(lines, 7, opts({ gaps: 'hide', hideGap: 8 })), 0);
  });
  test('gaps "dots" never hides', () => {
    const lines = [line(0, 4), line(30, 34)];
    assert.equal(R.columnAlpha(lines, 15, opts({ gaps: 'dots', hideGap: 6 })), 1);
  });
  test('the break starts when the words finish (quiet), not at the block end', () => {
    const lines = [line(0, 12, 4), line(14, 18)];
    assert.equal(R.columnAlpha(lines, 8, opts({ gaps: 'hide', hideGap: 8 })), 0);
  });
  test('never goes above the song-edge envelope', () => {
    const lines = [line(1, 3), line(15, 17), line(19, 19.5)];
    const o = opts({ songStart: 0.2, songEnd: 19.6, ownStart: 1, appear: 'first', whenDone: 'fade', gaps: 'hide', hideGap: 6 });
    for (let t = 0; t <= 20; t += 0.05) assert.ok(R.columnAlpha(lines, t, o) <= oldAlpha(0.2, 19.6, t) + 1e-12, 't=' + t);
  });
  test('no lines gives 0', () => {
    assert.equal(R.columnAlpha([], 5, opts()), 0);
  });
});
