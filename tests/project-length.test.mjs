import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, readPage } from './extract-module.mjs';

const ProjectLength = loadModule('ProjectLength');
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

function oldContentEnd(total, texts, pictures, anims) {
  let end = total;
  texts.forEach((t) => { if (!t.whole) end = Math.max(end, t.start + t.dur); });
  pictures.forEach((it) => { end = Math.max(end, it.start + it.dur); });
  anims.forEach((it) => { end = Math.max(end, it.start + it.dur); });
  return end;
}

const visibleText = { start: 100, dur: 100, hidden: false, whole: false, toEnd: false, tied: false };

test('isAuto is true only on the karaoke page', () => {
  assert.equal(ProjectLength.isAuto('karaoke'), true);
  assert.equal(ProjectLength.isAuto('hymn'), false);
  assert.equal(ProjectLength.isAuto(undefined), false);
  assert.equal(ProjectLength.isAuto(''), false);
});

test('hymn page content end matches the old formula', () => {
  const texts = [
    { start: 10, dur: 400, hidden: true, whole: false, toEnd: false, tied: false },
    { start: 50, dur: 300, hidden: false, whole: false, toEnd: true, tied: false },
    { start: 0, dur: 900, hidden: false, whole: true, toEnd: false, tied: false },
  ];
  const pictures = [{ start: 20, dur: 100 }];
  const anims = [{ start: 30, dur: 40 }];
  const got = ProjectLength.contentEnd({ total: 192, texts, pictures, anims }, false);
  assert.equal(got, oldContentEnd(192, texts, pictures, anims));
  assert.equal(got, 410);
});

test('karaoke ignores a hidden text that ends last', () => {
  const texts = [{ ...visibleText, start: 150, dur: 100, hidden: true }];
  assert.equal(ProjectLength.contentEnd({ total: 192, texts }, true), 192);
});

test('karaoke ignores an untied run-to-the-end text that ends last', () => {
  const texts = [{ ...visibleText, toEnd: true }];
  assert.equal(ProjectLength.contentEnd({ total: 150, texts }, true), 150);
});

test('karaoke counts a tied run-to-the-end text', () => {
  const texts = [{ ...visibleText, toEnd: true, tied: true }];
  assert.equal(ProjectLength.contentEnd({ total: 150, texts }, true), 200);
});

test('karaoke ignores a whole-video text', () => {
  const texts = [{ ...visibleText, start: 0, dur: 900, whole: true }];
  assert.equal(ProjectLength.contentEnd({ total: 150, texts }, true), 150);
});

test('karaoke counts a picture or animation past the songs', () => {
  assert.equal(ProjectLength.contentEnd({ total: 150, pictures: [{ start: 100, dur: 90 }] }, true), 190);
  assert.equal(ProjectLength.contentEnd({ total: 150, anims: [{ start: 140, dur: 60 }] }, true), 200);
});

test('a lone text sets the length with no songs', () => {
  assert.equal(ProjectLength.contentEnd({ total: 0, texts: [visibleText] }, true), 200);
});

test('songs ending 3:12 and a text ending 3:20 give 3:20', () => {
  const texts = [{ ...visibleText, start: 180, dur: 20 }];
  assert.equal(ProjectLength.contentEnd({ total: 192, texts }, true), 200);
});

test('empty parts give 0', () => {
  assert.equal(ProjectLength.contentEnd({}, true), 0);
  assert.equal(ProjectLength.contentEnd({ total: 0, texts: [], pictures: [], anims: [] }, false), 0);
});

test('broken numbers are ignored and the result is never negative', () => {
  const texts = [
    { ...visibleText, start: NaN, dur: 10 },
    { ...visibleText, start: 10, dur: Infinity },
    { hidden: false, whole: false, toEnd: false, tied: false },
  ];
  assert.equal(ProjectLength.contentEnd({ total: NaN, texts, pictures: [{ start: -50, dur: 10 }] }, true), 0);
  assert.equal(ProjectLength.contentEnd({ total: 30, texts }, true), 30);
});

test('a visible text that ends last counts, and the same text hidden does not', () => {
  assert.equal(ProjectLength.contentEnd({ total: 150, texts: [visibleText] }, true), 200);
  assert.equal(ProjectLength.contentEnd({ total: 150, texts: [{ ...visibleText, hidden: true }] }, true), 150);
});

test('exportChoice keeps full only on the hymn page', () => {
  assert.equal(ProjectLength.exportChoice('full', 'hymn'), 'full');
  assert.equal(ProjectLength.exportChoice('full', 'karaoke'), 'mix');
  assert.equal(ProjectLength.exportChoice('mix', 'karaoke'), 'mix');
  assert.equal(ProjectLength.exportChoice(null, 'hymn'), 'mix');
  assert.equal(ProjectLength.exportChoice('weird', 'hymn'), 'mix');
});

test('toEndStop runs to the end, or half a second when it starts after', () => {
  assert.equal(ProjectLength.toEndStop(100, 50), 100.5);
  assert.equal(ProjectLength.toEndStop(100, 200), 200);
});

test('startsAfterEnd flags a start at the end but not just before it', () => {
  assert.equal(ProjectLength.startsAfterEnd(200, 200), true);
  assert.equal(ProjectLength.startsAfterEnd(250, 200), true);
  assert.equal(ProjectLength.startsAfterEnd(199, 200), false);
});

test('statusText shows the length or an empty message', () => {
  assert.deepEqual(ProjectLength.statusText(0, fmt), { text: 'Nothing on the timeline yet', short: true });
  assert.deepEqual(ProjectLength.statusText(200, fmt), { text: 'Project length ' + fmt(200), short: false });
});

test('karaoke hides the length to cover and the export length choice', () => {
  const page = readPage();
  assert.match(page, /<label data-hymn-only>Length to cover <span class="ctl"><input type="number" id="target"/);
  assert.match(page, /<label data-hymn-only><input type="radio" name="len" id="lenMix"/);
  assert.match(page, /<label data-hymn-only><input type="radio" name="len" id="lenFull"/);
  assert.match(page, /<p class="note" id="lenAuto" data-karaoke-only/);
});

test('every timeline redraw refreshes the karaoke length pill', () => {
  const page = readPage();
  const start = page.indexOf('  function renderTimeline() {');
  const end = page.indexOf('\n  }', start);
  assert.ok(start >= 0 && end > start);
  assert.match(page.slice(start, end), /if \(auto\) renderAutoLength\(\);/);
});

test('exportLen ignores a remembered full choice on karaoke', () => {
  assert.match(readPage(), /function exportLen\(\) \{ return ui\.expLen === 'full' && !ProjectLength\.isAuto\(WS\.id\) \?/);
});
