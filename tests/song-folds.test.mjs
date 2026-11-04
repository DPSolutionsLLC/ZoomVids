import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, readPage } from './extract-module.mjs';

const SongFolds = loadModule('SongFolds');
const page = readPage();

const SECTION_KEYS = ['songLyrics', 'songParts', 'songHighlight', 'songPulse', 'songShapes', 'songColors', 'songCountdown', 'songRolling', 'songLook'];

function fullFacts(overrides = {}) {
  return {
    hasSong: true,
    viewName: 'Columns',
    columnName: 'Column 2 · Men',
    highlight: 'Whole word',
    pulseOn: true,
    countdown: 'Bar',
    ...overrides
  };
}

test('IDS lists the nine sections in page order', () => {
  assert.deepEqual([...SongFolds.IDS], SECTION_KEYS);
});

test('open unfolds folded ids and reports a change', () => {
  const result = SongFolds.open({ song: true, songLyrics: true }, ['song', 'songLyrics']);
  assert.equal(result.changed, true);
  assert.equal(result.next.song, false);
  assert.equal(result.next.songLyrics, false);
});

test('open leaves other keys as they are', () => {
  const result = SongFolds.open({ songLyrics: true, texts: true, songLook: true }, ['songLyrics']);
  assert.deepEqual(result.next, { songLyrics: false, texts: true, songLook: true });
});

test('open reports no change when the ids are already open or missing', () => {
  const openAlready = SongFolds.open({ song: false, songLyrics: false, texts: true }, ['song', 'songLyrics']);
  assert.equal(openAlready.changed, false);
  assert.deepEqual(openAlready.next, { song: false, songLyrics: false, texts: true });
  const missing = SongFolds.open({ texts: true }, ['song', 'songLyrics']);
  assert.equal(missing.changed, false);
  assert.deepEqual(missing.next, { texts: true });
});

test('open never changes its input', () => {
  const input = { song: true, songLyrics: true, texts: true };
  const before = structuredClone(input);
  const result = SongFolds.open(input, ['song', 'songLyrics']);
  assert.deepEqual(input, before);
  assert.notEqual(result.next, input);
});

test('open handles a null or undefined collapsed map', () => {
  for (const empty of [null, undefined]) {
    const result = SongFolds.open(empty, ['song']);
    assert.equal(result.changed, false);
    assert.deepEqual(result.next, {});
  }
});

test('summary for Lyrics shows the view, and the column when there is one', () => {
  assert.equal(SongFolds.summary('songLyrics', fullFacts()), 'Columns · Column 2 · Men');
  assert.equal(SongFolds.summary('songLyrics', fullFacts({ viewName: 'Slides', columnName: null })), 'Slides');
  assert.equal(SongFolds.summary('songLyrics', fullFacts({ viewName: 'Rolling lines', columnName: null })), 'Rolling lines');
});

test('summary for Highlight, Pulse and Countdown shows the current choice', () => {
  assert.equal(SongFolds.summary('songHighlight', fullFacts()), 'Whole word');
  assert.equal(SongFolds.summary('songPulse', fullFacts()), 'On');
  assert.equal(SongFolds.summary('songPulse', fullFacts({ pulseOn: false })), 'Off');
  assert.equal(SongFolds.summary('songCountdown', fullFacts()), 'Bar');
  assert.equal(SongFolds.summary('songCountdown', fullFacts({ countdown: 'Off' })), 'Off');
});

test('summary is empty for the five sections without one', () => {
  for (const id of ['songParts', 'songShapes', 'songColors', 'songRolling', 'songLook']) {
    assert.equal(SongFolds.summary(id, fullFacts()), '', id);
  }
});

test('summary is empty when there is no song, even with otherwise complete facts', () => {
  for (const id of SECTION_KEYS) {
    assert.equal(SongFolds.summary(id, fullFacts({ hasSong: false })), '', id);
  }
  assert.equal(SongFolds.summary('songLyrics', null), '');
});

test('summary is empty for an unknown id', () => {
  assert.equal(SongFolds.summary('texts', fullFacts()), '');
  assert.equal(SongFolds.summary('nope', fullFacts()), '');
});

test('the nine sections sit inside Song settings, in order, each with its own toggle', () => {
  const songStart = page.indexOf('id="sec-song"');
  const songEnd = page.indexOf('id="sec-texts"');
  assert.ok(songStart > 0 && songEnd > songStart);
  let last = songStart;
  for (const key of SECTION_KEYS) {
    const at = page.indexOf('id="sec-' + key + '"');
    assert.ok(at > last && at < songEnd, key + ' is in order inside Song settings');
    const toggle = page.indexOf('data-sec="' + key + '"', at);
    assert.ok(toggle > at && toggle < songEnd, key + ' has a toggle');
    last = at;
  }
});

test('the song picker sits above the sections', () => {
  assert.ok(page.indexOf('id="songSetSong"') < page.indexOf('id="sec-songLyrics"'));
  assert.ok(page.indexOf('id="songSetEmpty"') < page.indexOf('id="sec-songLyrics"'));
});

test('Rolling lines sits inside the wrapper that hides it', () => {
  const wrapper = page.indexOf('<div id="songRoll" hidden>');
  assert.ok(wrapper > 0);
  assert.ok(page.indexOf('id="sec-songRolling"') > wrapper);
  assert.ok(page.indexOf('id="sec-songRolling"') < page.indexOf('id="songRollAbove"'));
});

test('songLookHead is a span inside the toggle, not the heading', () => {
  assert.match(page, /<span id="songLookHead">/);
  assert.doesNotMatch(page, /<h4[^>]*id="songLookHead"/);
});

test('the old While it\'s sung heading is gone', () => {
  assert.equal(page.includes("While it's sung"), false);
});

test('fold toggles stay usable with no song chosen', () => {
  assert.ok(page.includes("$('songSet').querySelectorAll('input, select, button:not(.sectoggle)')"));
});

test('a folded sub-section keeps its h4 heading visible', () => {
  assert.ok(page.includes('.sec.collapsed > .headrow > :not(h2):not(h3):not(h4)'));
});

test('Float timeline button sits between Shape and Float in the preview bar, with no data-float', () => {
  const headStart = page.indexOf('id="floatHead"');
  const shape = page.indexOf('id="shapeModeHead"', headStart);
  const button = page.indexOf('id="floatTimelineHead"', headStart);
  const floatButton = page.indexOf('id="floatBtn"', headStart);
  assert.ok(headStart > 0 && shape > headStart && button > shape && floatButton > button);
  const tagStart = page.lastIndexOf('<button', button);
  const tag = page.slice(tagStart, page.indexOf('>', button) + 1);
  assert.doesNotMatch(tag, /data-float/);
  assert.doesNotMatch(tag, /aria-pressed/);
  assert.match(tag, /\shidden[\s>]/);
});
