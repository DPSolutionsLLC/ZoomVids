import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const Engine = loadModule('Engine');
const SR = Engine.SR;

const opts = { level: false, trimSilence: false, defaultXf: 5, fadeIn: 0, fadeOut: 0, duckDb: -14 };
const lib = {
  vocal: { v: 2, duration: 20, peak: 0.5, lufs: -20, head: 0, tail: 20 },
  inst: { v: 2, duration: 20, peak: 0.5, lufs: -20, head: 0, tail: 20 },
  loud: { v: 2, duration: 20, peak: 1, lufs: -20, head: 0, tail: 20 }
};
function mixOf(item, extra) {
  return { opts: { ...opts, ...extra }, items: [{ id: 'm1', key: 'vocal', ...item }], spoken: [] };
}

describe('layout', () => {
  test('a plain song lays out exactly as before', () => {
    const clip = Engine.layout(mixOf({}), lib).music[0];
    assert.equal(clip.mute, false);
    assert.equal(clip.start, 0);
    assert.equal(clip.len, 20);
    assert.equal(clip.gain, 1);
    assert.equal(clip.fi, 0.01);
    assert.equal(clip.fo, 0.01);
    assert.equal('pair' in clip, false);
    assert.equal('pairMissing' in clip, false);
  });

  test('a plain song keeps its leveled gain', () => {
    const plan = Engine.layout(mixOf({}, { level: true }), lib);
    assert.equal(plan.target, -16);
    assert.ok(Math.abs(plan.music[0].gain - Math.pow(10, 4 / 20)) < 1e-12);
  });

  test('a muted main track gets no gain and is not decoded', () => {
    const plan = Engine.layout(mixOf({ mute: true }), lib);
    assert.equal(plan.music[0].gain, 0);
    assert.deepEqual(Engine.keysBetween(plan, 0, 20), []);
  });

  test('a second track that plays is listed for decoding', () => {
    const plan = Engine.layout(mixOf({ pair: { key: 'inst', offset: 0 } }), lib);
    assert.equal(plan.music[0].pair.gain, 1);
    assert.equal(plan.music[0].pair.dur, 20);
    assert.equal('meta' in plan.music[0].pair, false);
    assert.deepEqual(Engine.keysBetween(plan, 0, 20).sort(), ['inst', 'vocal']);
  });

  test('a muted second track is not decoded', () => {
    const plan = Engine.layout(mixOf({ pair: { key: 'inst', offset: 0, mute: true } }), lib);
    assert.equal(plan.music[0].pair.gain, 0);
    assert.deepEqual(Engine.keysBetween(plan, 0, 20), ['vocal']);
  });

  test('a missing second track file is flagged', () => {
    const clip = Engine.layout(mixOf({ pair: { key: 'gone', offset: 0 } }), lib).music[0];
    assert.equal(clip.pairMissing, true);
    assert.equal('pair' in clip, false);
  });

  test('the second track counts toward the loudness target, even when muted', () => {
    const alone = Engine.layout(mixOf({}, { level: true }), lib);
    const paired = Engine.layout(mixOf({ pair: { key: 'loud', offset: 0, mute: true } }, { level: true }), lib);
    assert.ok(paired.target < alone.target);
    assert.ok(Math.abs(paired.target - (-20 + 20 * Math.log10(0.89))) < 1e-9);
  });
});

describe('renderBlock', () => {
  const n = 20 * SR;
  const mainPcm = { ch0: new Float32Array(n).fill(0.1), ch1: new Float32Array(n).fill(0.1) };
  const pairPcm = { ch0: new Float32Array(n).fill(0.2), ch1: new Float32Array(n).fill(0.2) };
  const pcm = (key) => (key === 'vocal' ? mainPcm : pairPcm);
  const middle = 10 * SR;

  test('only the second track sounds when the main track is muted', () => {
    const plan = Engine.layout(mixOf({ mute: true, pair: { key: 'inst', offset: 0 } }), lib);
    const out = Engine.renderBlock(plan, middle, 10, (key) => {
      if (key === 'vocal') throw new Error('the muted main track was read');
      return pairPcm;
    });
    assert.ok(Math.abs(out.L[0] - 0.2) < 1e-6);
  });

  test('both tracks add up when both play', () => {
    const plan = Engine.layout(mixOf({ pair: { key: 'inst', offset: 0 } }), lib);
    const out = Engine.renderBlock(plan, middle, 10, pcm);
    assert.ok(Math.abs(out.L[0] - 0.3) < 1e-6);
    assert.ok(Math.abs(out.R[5] - 0.3) < 1e-6);
  });

  test('a negative offset leaves silence until the second track starts', () => {
    const plan = Engine.layout(mixOf({ mute: true, pair: { key: 'inst', offset: -2 } }), lib);
    const out = Engine.renderBlock(plan, 1 * SR, 2 * SR, pcm);
    assert.equal(out.L[0], 0);
    assert.equal(out.L[SR - 10], 0);
    assert.ok(Math.abs(out.L[SR + 10] - 0.2) < 1e-6);
  });

  test('a plain song renders the same samples as before', () => {
    const plan = Engine.layout(mixOf({}), lib);
    const out = Engine.renderBlock(plan, middle, 10, pcm);
    assert.ok(Math.abs(out.L[0] - 0.1) < 1e-6);
  });
});
