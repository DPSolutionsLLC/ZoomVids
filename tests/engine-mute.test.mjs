import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const Engine = loadModule('Engine');
const SR = Engine.SR;

const opts = { level: false, trimSilence: false, defaultXf: 5, fadeIn: 0, fadeOut: 0, duckDb: -14 };
const lib = {
  song: { v: 2, duration: 20, peak: 0.5, lufs: -20, head: 0, tail: 20 },
  talk: { v: 2, duration: 10, peak: 0.5, lufs: -20, head: 0, tail: 10 },
  quiet: { v: 2, duration: 10, peak: 0, lufs: -70, head: 0, tail: 10, silent: true }
};
function mixWith(spoken) {
  return { opts, items: [{ id: 'm1', key: 'song' }], spoken };
}

describe('layout', () => {
  test('a muted clip keeps its place but gets no sound', () => {
    const plan = Engine.layout(mixWith([{ id: 's1', key: 'talk', at: 5, mute: true }]), lib);
    const clip = plan.spoken[0];
    assert.equal(clip.mute, true);
    assert.equal(clip.gain, 0);
    assert.equal(clip.start, 5);
    assert.equal(clip.len, 10);
  });

  test('a video with no sound is muted even without the mute flag', () => {
    const clip = Engine.layout(mixWith([{ id: 's1', key: 'quiet', at: 5 }]), lib).spoken[0];
    assert.equal(clip.mute, true);
    assert.equal(clip.gain, 0);
  });

  test('a clip that plays its sound is not muted', () => {
    const clip = Engine.layout(mixWith([{ id: 's1', key: 'talk', at: 5 }]), lib).spoken[0];
    assert.equal(clip.mute, false);
    assert.equal(clip.gain, 1);
  });
});

test('keysBetween leaves out a muted clip', () => {
  const plan = Engine.layout(mixWith([{ id: 's1', key: 'talk', at: 5, mute: true }]), lib);
  assert.deepEqual(Engine.keysBetween(plan, 0, 20), ['song']);
  const loud = Engine.layout(mixWith([{ id: 's1', key: 'talk', at: 5 }]), lib);
  assert.deepEqual(Engine.keysBetween(loud, 0, 20).sort(), ['song', 'talk']);
});

test('renderBlock does not dip the music under a muted clip, and never reads its audio', () => {
  const n = 20 * SR, ch = new Float32Array(n).fill(0.5);
  const pcm = (key) => {
    if (key === 'talk') throw new Error('the muted clip’s audio was read');
    return { ch0: ch, ch1: ch };
  };
  const muted = Engine.layout(mixWith([{ id: 's1', key: 'talk', at: 5, mute: true }]), lib);
  const alone = Engine.layout(mixWith([]), lib);
  const from = 4 * SR, len = 12 * SR;
  const withClip = Engine.renderBlock(muted, from, len, pcm);
  const without = Engine.renderBlock(alone, from, len, pcm);
  assert.deepEqual(withClip.L, without.L);
  assert.deepEqual(withClip.R, without.R);
  assert.ok(Math.abs(withClip.L[3 * SR] - 0.5) < 1e-6); // 7 s in, during the clip, the music is still at 0.5
});
