import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const W = loadModule('WordTiming');
const L = loadModule('Lyrics');

function counter(prefix = 'w') {
  let n = 0;
  return () => prefix + (++n);
}
const slideOf = (text, prefix = 'w') => L.parse(text, counter(prefix)).slides[0];
const sylIds = (slide) => W.list(slide).map((e) => e.sylId);
function timed(text, times, prefix = 'w') {
  let slide = slideOf(text, prefix);
  const ids = sylIds(slide);
  times.forEach((pair, i) => { if (pair) slide = W.setTime(slide, ids[i], pair[0], pair[1]); });
  return slide;
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, actual + ' is not ' + expected);

describe('list', () => {
  test('gives every syllable in reading order across lines and words', () => {
    const all = W.list(slideOf('Glo-ri-a in\nex-cel-sis'));
    assert.deepEqual(all.map((e) => e.text), ['Glo', 'ri', 'a', 'in', 'ex', 'cel', 'sis']);
    assert.deepEqual(all.map((e) => e.wordIndex), [0, 0, 0, 1, 2, 2, 2]);
    assert.deepEqual(all.map((e) => e.sylIndex), [0, 1, 2, 0, 0, 1, 2]);
    assert.deepEqual(all.map((e) => e.index), [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(all[1].word, 'Gloria');
  });
  test('an untimed syllable has t and d of null', () => {
    const e = W.list(slideOf('Peace'))[0];
    assert.equal(e.t, null);
    assert.equal(e.d, null);
  });
  test('counts and checks', () => {
    const half = timed('One two', [[0, 0.5]]);
    assert.equal(W.timedCount(half), 1);
    assert.equal(W.anyTimed(half), true);
    assert.equal(W.isTimed(half), false);
    assert.equal(W.isTimed(timed('One two', [[0, 0.5], [1, 0.5]])), true);
    assert.equal(W.anyTimed(slideOf('One')), false);
  });
});

describe('setTime and clearing', () => {
  test('setTime rounds to milliseconds and does not change its input', () => {
    const slide = slideOf('Peace'), before = JSON.stringify(slide), id = sylIds(slide)[0];
    const out = W.setTime(slide, id, 1.23456, 0.4004);
    assert.equal(W.list(out)[0].t, 1.235);
    assert.equal(W.list(out)[0].d, 0.4);
    assert.equal(JSON.stringify(slide), before);
  });
  test('setTime keeps the length at least MIN_LEN', () => {
    const slide = slideOf('Peace');
    assert.equal(W.list(W.setTime(slide, sylIds(slide)[0], 1, 0.01))[0].d, W.MIN_LEN);
  });
  test('clearTime clears one syllable and clearAll clears them all', () => {
    const slide = timed('One two', [[0, 0.5], [1, 0.5]]), ids = sylIds(slide);
    assert.deepEqual(W.list(W.clearTime(slide, ids[0])).map((e) => e.t), [null, 1]);
    assert.deepEqual(W.list(W.clearAll(slide)).map((e) => e.t), [null, null]);
    assert.equal(W.timedCount(slide), 2);
  });
});

describe('tapLength, shift and span', () => {
  test('a short tap is stretched to MIN_TAP', () => {
    assert.equal(W.tapLength(1, 1.02), 0.15);
    close(W.tapLength(1, 1.6), 0.6);
  });
  test('shift moves only timed syllables', () => {
    const slide = timed('One two three', [[0, 0.5], null, [2, 0.5]]);
    assert.deepEqual(W.list(W.shift(slide, 1.5)).map((e) => e.t), [1.5, null, 3.5]);
  });
  test('span gives the first start and the last end, or null', () => {
    assert.deepEqual(W.span(timed('One two', [[0.4, 0.5], [1, 0.75]])), { first: 0.4, last: 1.75 });
    assert.equal(W.span(slideOf('One two')), null);
  });
});

describe('windows', () => {
  test('a wide gap gives the lead before and the tail after exactly', () => {
    const out = W.windows([{ first: 10, last: 12 }, { first: 20, last: 22 }]);
    assert.deepEqual(out, [{ start: 9, end: 12.5 }, { start: 19, end: 22.5 }]);
  });
  test('a narrow gap shares the boundary and never covers a sung word', () => {
    const a = { first: 10, last: 12 }, b = { first: 12.6, last: 14, fadeIn: 0.4 };
    const [wa, wb] = W.windows([a, b]);
    assert.ok(wb.start >= a.last, 'the next slide starts after the last word of this one');
    assert.ok(wa.end <= b.first, 'this slide ends before the first word of the next');
    assert.deepEqual([wa.end, wb.start], [12.4, 12]);
  });
  test('a narrow gap without a fade gives one shared split point', () => {
    const [wa, wb] = W.windows([{ first: 10, last: 12 }, { first: 12.6, last: 14 }]);
    assert.equal(wa.end, 12.2);
    assert.equal(wb.start, 12.2);
  });
  test('overlapping words meet in the middle', () => {
    const [wa, wb] = W.windows([{ first: 10, last: 12 }, { first: 11.6, last: 14 }]);
    assert.equal(wa.end, 11.8);
    assert.equal(wb.start, 11.8);
  });
  test('a window never ends at or before its start', () => {
    const [, wb] = W.windows([{ first: 0, last: 10 }, { first: 2, last: 3 }]);
    assert.ok(wb.end > wb.start);
  });
  test('the first start is clamped at 0', () => {
    assert.equal(W.windows([{ first: 0.3, last: 1 }])[0].start, 0);
  });
  test('an untimed entry comes back null and the timed ones still pair up', () => {
    const out = W.windows([{ first: 10, last: 12 }, { first: null, last: null }, { first: 12.6, last: 14 }]);
    assert.equal(out[1], null);
    assert.equal(out[0].end, 12.2);
    assert.equal(out[2].start, 12.2);
  });
  test('lead and tail can be changed', () => {
    assert.deepEqual(W.windows([{ first: 5, last: 6 }], { lead: 2, tail: 1 }), [{ start: 3, end: 7 }]);
  });
});

describe('move', () => {
  const three = () => timed('One two three', [[0, 0.5], [1, 0.5], [2, 0.5]]);
  test('moves freely between its neighbours and keeps its length', () => {
    const slide = three(), res = W.move(slide, sylIds(slide)[1], 1.2, 0.5);
    assert.deepEqual([res.t, res.d, res.clamped], [1.2, 0.5, false]);
    assert.equal(W.list(res.slide)[1].t, 1.2);
  });
  test('stops at the end of the previous syllable', () => {
    const slide = three(), res = W.move(slide, sylIds(slide)[1], 0.2, 0.5);
    assert.deepEqual([res.t, res.d, res.clamped], [0.5, 0.5, true]);
  });
  test('stops before the start of the next syllable', () => {
    const slide = three(), res = W.move(slide, sylIds(slide)[1], 1.8, 0.5);
    assert.deepEqual([res.t, res.d, res.clamped], [1.5, 0.5, true]);
  });
  test('shrinks to fit a gap shorter than its length', () => {
    const slide = timed('One two three', [[0, 0.5], [0.6, 0.5], [0.9, 0.5]]);
    const res = W.move(slide, sylIds(slide)[1], 0.6, 0.5);
    close(res.d, 0.4);
    assert.equal(res.t, 0.5);
    assert.equal(res.clamped, true);
  });
  test('leaves the slide unchanged when not even MIN_LEN fits', () => {
    const slide = timed('One two three', [[0, 0.5], [0.505, 0.01], [0.52, 0.5]]);
    const res = W.move(slide, sylIds(slide)[1], 0.51, 0.1);
    assert.equal(res.slide, slide);
    assert.equal(res.clamped, true);
  });
  test('times an untimed syllable with the default length', () => {
    const slide = timed('One two', [[0, 0.5]]);
    const res = W.move(slide, sylIds(slide)[1], 2);
    assert.deepEqual([res.t, res.d], [2, W.DEFAULT_LEN]);
  });
  test('does not change its input', () => {
    const slide = three(), before = JSON.stringify(slide);
    W.move(slide, sylIds(slide)[1], 1.3, 0.5);
    assert.equal(JSON.stringify(slide), before);
  });
});

describe('edge', () => {
  const three = () => timed('One two three', [[0, 0.5], [1, 0.5], [2, 0.5]]);
  test('the start edge stops at the previous syllable and keeps the end', () => {
    const slide = three(), res = W.edge(slide, sylIds(slide)[1], 'start', 0.2);
    assert.deepEqual([res.t, res.d, res.clamped], [0.5, 1, true]);
  });
  test('the start edge keeps at least MIN_LEN', () => {
    const slide = three(), res = W.edge(slide, sylIds(slide)[1], 'start', 1.49);
    close(res.t, 1.45);
    close(res.d, W.MIN_LEN);
    assert.equal(res.clamped, true);
  });
  test('the end edge stops at the next syllable', () => {
    const slide = three(), res = W.edge(slide, sylIds(slide)[1], 'end', 2.4);
    assert.deepEqual([res.t, res.d, res.clamped], [1, 1, true]);
  });
  test('the end edge keeps at least MIN_LEN', () => {
    const slide = three(), res = W.edge(slide, sylIds(slide)[1], 'end', 1.01);
    close(res.d, W.MIN_LEN);
    assert.equal(res.clamped, true);
  });
  test('the end edge moves freely inside the gap', () => {
    const slide = three(), res = W.edge(slide, sylIds(slide)[1], 'end', 1.8);
    assert.deepEqual([res.t, res.d, res.clamped], [1, 0.8, false]);
  });
});

describe('outside', () => {
  test('counts timed syllables before the slide starts or after it ends', () => {
    const slide = timed('One two three four', [[-0.2, 0.3], [1, 0.5], [3.8, 0.5], null]);
    assert.equal(W.outside(slide, 4), 2);
    assert.equal(W.outside(slide, 10), 1);
  });
});

describe('norm and sameWords', () => {
  test('norm drops case and punctuation and keeps apostrophes', () => {
    assert.equal(W.norm('Earth,'), 'earth');
    assert.equal(W.norm('“Wait”'), 'wait');
    assert.equal(W.norm("Don't!"), "don't");
    assert.equal(W.norm('Élan'), 'élan');
  });
  test('the same words with different capitals and punctuation match', () => {
    assert.equal(W.sameWords(slideOf('Peace on earth,'), slideOf('peace on Earth')), true);
  });
  test('a different syllable split does not match', () => {
    assert.equal(W.sameWords(slideOf('Glo-ri-a'), slideOf('Gloria')), false);
    assert.equal(W.sameWords(slideOf('Glo-ri-a'), slideOf('Glo ri a')), false);
  });
  test('a different word does not match', () => {
    assert.equal(W.sameWords(slideOf('Peace on earth'), slideOf('Peace in earth')), false);
  });
});

describe('copyTimes', () => {
  const source = () => timed('Peace on earth', [[0.5, 0.4], [1, 0.3], [1.5, 0.6]], 'a');
  test('with no anchor the relative times are copied as they are', () => {
    const out = W.copyTimes(source(), slideOf('peace on Earth!', 'b'), null);
    assert.deepEqual(W.list(out).map((e) => [e.t, e.d]), [[0.5, 0.4], [1, 0.3], [1.5, 0.6]]);
    assert.equal(sylIds(out)[0], 'b2');
  });
  test('anchored on the first word, the copy lines up with the target’s first start', () => {
    let target = slideOf('Peace on earth', 'b');
    target = W.setTime(target, sylIds(target)[0], 3, 0.2);
    const out = W.copyTimes(source(), target, 'first');
    assert.deepEqual(W.list(out).map((e) => [e.t, e.d]), [[3, 0.4], [3.5, 0.3], [4, 0.6]]);
  });
  test('mismatched words give null', () => {
    assert.equal(W.copyTimes(source(), slideOf('Peace in earth', 'b'), null), null);
  });
  test('an untimed source gives null', () => {
    assert.equal(W.copyTimes(slideOf('Peace on earth', 'a'), slideOf('Peace on earth', 'b'), null), null);
  });
  test('a syllable untimed in the source is untimed in the copy', () => {
    const partial = timed('Peace on earth', [[0.5, 0.4], null, [1.5, 0.6]], 'a');
    let target = timed('Peace on earth', [[9, 0.1], [9.5, 0.1], [10, 0.1]], 'b');
    const out = W.copyTimes(partial, target, null);
    assert.deepEqual(W.list(out).map((e) => e.t), [0.5, null, 1.5]);
  });
});

describe('placeAll', () => {
  const untimed = (read) => ({ first: null, last: null, read, fadeIn: 0.3 });
  const timedAt = (first, last, read = 2) => ({ first, last, read, fadeIn: 0.3 });
  test('untimed entries go back to back from the start point', () => {
    assert.deepEqual(W.placeAll([untimed(2), untimed(3), untimed(1.5)], 10), [{ start: 10, dur: 2 }, { start: 12, dur: 3 }, { start: 15, dur: 1.5 }]);
  });
  test('timed entries get a 1 s lead and 0.5 s tail, like windows', () => {
    const out = W.placeAll([timedAt(20, 22), timedAt(30, 33)], 0);
    assert.deepEqual(out, [{ start: 19, dur: 3.5 }, { start: 29, dur: 4.5 }]);
    const wins = W.windows([timedAt(20, 22), timedAt(30, 33)]);
    out.forEach((p, i) => { assert.equal(p.start, wins[i].start); assert.equal(Math.round((p.start + p.dur) * 100) / 100, wins[i].end); });
  });
  test('an untimed entry after a timed one starts at that one’s end', () => {
    const out = W.placeAll([timedAt(20, 22), untimed(3)], 0);
    assert.deepEqual(out[1], { start: 22.5, dur: 3 });
  });
  test('starts are never negative, and a length is never under the minimum', () => {
    const out = W.placeAll([timedAt(0.2, 1), untimed(0)], -5);
    assert.equal(out[0].start, 0);
    assert.ok(out[1].dur >= W.MIN_LEN);
    assert.equal(W.placeAll([untimed(2)], -5)[0].start, 0);
  });
});
