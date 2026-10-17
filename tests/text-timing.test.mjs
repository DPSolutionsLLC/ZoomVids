import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextTiming = loadModule('TextTiming');

function words(count) {
  return Array.from({ length: count }, () => 'word').join(' ');
}

test('wordCount counts runs of non-space characters', () => {
  assert.equal(TextTiming.wordCount(''), 0);
  assert.equal(TextTiming.wordCount('  a  b\nc '), 3);
  assert.equal(TextTiming.wordCount(null), 0);
});

test('readSeconds never goes below the 4 second minimum', () => {
  assert.equal(TextTiming.readSeconds('one two three', 150, 0, 0), 4);
});

test('readSeconds adds both fades to the reading time', () => {
  assert.equal(TextTiming.readSeconds(words(150), 150, 2, 2), 64);
});

test('readSeconds scales with word count', () => {
  assert.equal(TextTiming.readSeconds(words(300), 150, 0, 0), 120);
});

test('readSeconds clamps a fast speed to 250 words a minute', () => {
  assert.equal(TextTiming.readSeconds(words(250), 1000, 0, 0), 60);
});

test('readSeconds uses 150 words a minute when the speed is not a number', () => {
  assert.equal(TextTiming.readSeconds(words(300), NaN, 0, 0), 120);
});

test('readSeconds clamps a slow speed to 80 words a minute', () => {
  assert.equal(TextTiming.readSeconds(words(80), 10, 0, 0), 60);
});

test('cutForTap shortens the previous item so it fades out from the tap', () => {
  assert.equal(TextTiming.cutForTap({ start: 10, dur: 20, fadeOut: 2 }, 15), 7);
  assert.equal(TextTiming.cutForTap({ start: 10, dur: 20, fadeOut: 2 }, 10.1), 2.1);
});

test('cutForTap leaves an item that has already ended alone', () => {
  assert.equal(TextTiming.cutForTap({ start: 10, dur: 20, fadeOut: 2 }, 31), null);
});

test('cutForTap never makes an item shorter than half a second', () => {
  assert.equal(TextTiming.cutForTap({ start: 10, dur: 20, fadeOut: 0 }, 10.2), 0.5);
});

const threeVerses = [{ text: words(150) }, { text: words(300) }, { text: words(5) }];

test('passageSchedule all at once equals the reading time of the joined text', () => {
  const joined = threeVerses.map((v) => v.text).join(' ');
  assert.equal(TextTiming.passageSchedule(threeVerses, 'together', 150, 2, 2).total, TextTiming.readSeconds(joined, 150, 2, 2));
});

test('passageSchedule of one verse equals its reading time in every mode', () => {
  for (const mode of ['each', 'build', 'together']) {
    assert.equal(TextTiming.passageSchedule([{ text: words(40) }], mode, 150, 2, 3).total, TextTiming.readSeconds(words(40), 150, 2, 3));
  }
});

test('passageSchedule one at a time adds each verse hold and the crossfades', () => {
  const schedule = TextTiming.passageSchedule(threeVerses, 'each', 150, 2, 2);
  assert.equal(schedule.total, 192);
  assert.equal(schedule.steps[1].inStart, 62);
  assert.equal(schedule.steps[1].inEnd, 64);
  assert.equal(schedule.steps[0].outStart, 62);
  assert.equal(schedule.steps[2].outStart, Infinity);
});

test('passageSchedule build up has the same length and never fades a verse out', () => {
  const schedule = TextTiming.passageSchedule(threeVerses, 'build', 150, 2, 2);
  assert.equal(schedule.total, 192);
  assert.ok(schedule.steps.every((step) => !isFinite(step.outStart)));
});

test('passageSchedule with no verses falls back to the minimum reading time', () => {
  assert.deepEqual(TextTiming.passageSchedule([], 'each', 150, 2, 2), { total: 8, steps: [] });
});

test('verseAlphas crossfades neighbours equally at the midpoint', () => {
  const alphas = TextTiming.verseAlphas(TextTiming.passageSchedule(threeVerses, 'each', 150, 2, 2), 63);
  assert.equal(alphas[0], 0.5);
  assert.equal(alphas[1], 0.5);
  assert.equal(alphas[2], 0);
});

test('verseAlphas keeps earlier verses at full strength in build up', () => {
  const alphas = TextTiming.verseAlphas(TextTiming.passageSchedule(threeVerses, 'build', 150, 2, 2), 190);
  assert.deepEqual(alphas, [1, 1, 1]);
});

test('verseAlphas hides a verse before it starts', () => {
  const alphas = TextTiming.verseAlphas(TextTiming.passageSchedule(threeVerses, 'each', 150, 2, 2), 61.9);
  assert.equal(alphas[0], 1);
  assert.equal(alphas[1], 0);
});

test('sizingTime shows the longest verse when one at a time', () => {
  const schedule = TextTiming.passageSchedule(threeVerses, 'each', 150, 2, 2);
  assert.equal(TextTiming.sizingTime(schedule, threeVerses, 'each'), 64.2);
});

test('sizingTime shows the last verse when building up', () => {
  const schedule = TextTiming.passageSchedule(threeVerses, 'build', 150, 2, 2);
  assert.equal(TextTiming.sizingTime(schedule, threeVerses, 'build'), schedule.steps[2].inEnd + 0.2);
});

test('sizingTime stays inside the block', () => {
  const schedule = { total: 5, steps: [{ inStart: 0, inEnd: 0 }, { inStart: 4.95, inEnd: 6 }] };
  assert.equal(TextTiming.sizingTime(schedule, [{ text: 'a' }, { text: 'b' }], 'build'), 4.9);
});
