import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const A = loadModule('Anim');
const close = (actual, expected, tol = 1e-9) => assert.ok(Math.abs(actual - expected) < tol, actual + ' is not ' + expected);

const validItem = (over = {}) => ({
  id: 'a1', kind: 'clap', start: 10, dur: 6, color: '#33aaff',
  frame: { x: 0.5, y: 0.2, w: 0.2, h: 0.3 }, beats: [{ t: 1, d: 0.2 }, { t: 2, d: 0.3 }], ...over
});

describe('cleanItem', () => {
  test('keeps a valid item as it is', () => {
    assert.deepEqual(A.cleanItem(validItem()), validItem());
  });

  test('fills defaults for length, color, frame and arrow style', () => {
    const out = A.cleanItem({ id: 'a2', kind: 'arrow' });
    assert.equal(out.start, 0);
    assert.equal(out.dur, A.DEFAULT_DUR);
    assert.equal(out.color, A.DEFAULT_COLOR);
    assert.deepEqual(out.frame, A.defaultFrame('arrow', 0));
    assert.equal(out.style, 'up');
    assert.deepEqual(out.beats, []);
  });

  test('refuses an unknown kind even when everything else is valid', () => {
    assert.equal(A.cleanItem(validItem({ kind: 'juggle' })), null);
  });

  test('refuses something that is not an object', () => {
    assert.equal(A.cleanItem(null), null);
    assert.equal(A.cleanItem('clap'), null);
  });

  test('drops style on kinds other than arrow', () => {
    const out = A.cleanItem(validItem({ style: 'down' }));
    assert.equal('style' in out, false);
  });

  test('keeps a known arrow style and replaces an unknown one', () => {
    assert.equal(A.cleanItem(validItem({ kind: 'arrow', style: 'echo' })).style, 'echo');
    assert.equal(A.cleanItem(validItem({ kind: 'arrow', style: 'sideways' })).style, 'up');
  });

  test('replaces a bad color and keeps everything else', () => {
    for (const color of ['red', '#ff00']) {
      const out = A.cleanItem(validItem({ color }));
      assert.equal(out.color, A.DEFAULT_COLOR);
      assert.deepEqual({ ...out, color: '#33aaff' }, validItem());
    }
  });

  test('clamps the length and keeps the frame inside the canvas', () => {
    const out = A.cleanItem(validItem({ dur: 0.1, frame: { x: 0.95, y: -1, w: 0.01, h: 2 } }));
    assert.equal(out.dur, A.MIN_DUR);
    assert.equal(out.frame.w, A.MIN_W);
    assert.equal(out.frame.h, 1);
    assert.ok(out.frame.x + out.frame.w <= 1 + 1e-9);
    assert.equal(out.frame.y, 0);
  });
});

describe('cleanBeats', () => {
  test('sorts beats by time', () => {
    assert.deepEqual(A.cleanBeats([{ t: 3, d: 0.2 }, { t: 1, d: 0.2 }]), [{ t: 1, d: 0.2 }, { t: 3, d: 0.2 }]);
  });

  test('trims a beat that runs into the next one', () => {
    assert.deepEqual(A.cleanBeats([{ t: 1, d: 2 }, { t: 2, d: 0.5 }]), [{ t: 1, d: 1 }, { t: 2, d: 0.5 }]);
  });

  test('drops a beat that would end up shorter than the minimum', () => {
    assert.deepEqual(A.cleanBeats([{ t: 1, d: 0.5 }, { t: 1.01, d: 0.5 }]), [{ t: 1.01, d: 0.5 }]);
  });

  test('drops beats that are not numbers and keeps the valid ones', () => {
    const out = A.cleanBeats([{ t: 1, d: 0.2 }, { t: NaN, d: 0.2 }, { t: 2, d: 'x' }, null, { t: 3, d: 0.2 }]);
    assert.deepEqual(out, [{ t: 1, d: 0.2 }, { t: 3, d: 0.2 }]);
  });

  test('keeps beats before the block start so a start-grip drag can bring them back', () => {
    assert.deepEqual(A.cleanBeats([{ t: -1, d: 0.2 }]), [{ t: -1, d: 0.2 }]);
  });
});

describe('alpha', () => {
  const item = { start: 10, dur: 4 };
  test('is 0 before the start and at the end', () => {
    assert.equal(A.alpha(item, 9.99), 0);
    assert.equal(A.alpha(item, 14), 0);
  });
  test('is 1 in the middle', () => {
    assert.equal(A.alpha(item, 12), 1);
  });
  test('is about 0.5 halfway through each fade', () => {
    close(A.alpha(item, 10 + A.FADE / 2), 0.5, 1e-6);
    close(A.alpha(item, 14 - A.FADE / 2), 0.5, 1e-6);
  });
  test('a block shorter than two fades still reaches its peak in the middle', () => {
    const short = { start: 0, dur: 0.5 };
    close(A.alpha(short, 0.25), 1);
    assert.ok(A.alpha(short, 0.1) < 1);
  });
});

describe('beatState', () => {
  const item = { start: 10, dur: 6, beats: [{ t: 1, d: 0.5 }, { t: 2, d: 0.2 }, { t: 7, d: 0.2 }, { t: -1, d: 0.2 }] };
  test('before the first beat', () => {
    const s = A.beatState(item, 10.5);
    assert.equal(s.index, -1);
    assert.equal(s.since, Infinity);
    assert.equal(s.holding, false);
    assert.equal(s.next, 1);
  });
  test('during a hold', () => {
    const s = A.beatState(item, 11.25);
    assert.equal(s.index, 0);
    assert.equal(s.holding, true);
    close(s.p, 0.5);
    assert.equal(s.since, 0);
  });
  test('after release, since counts up and neighbours are set', () => {
    const s = A.beatState(item, 11.8);
    assert.equal(s.holding, false);
    assert.equal(s.p, 1);
    close(s.since, 0.3);
    assert.equal(s.prev, 1);
    assert.equal(s.next, 2);
  });
  test('beats outside the block are ignored', () => {
    const s = A.beatState(item, 15.9);
    assert.equal(s.index, 1);
    assert.equal(s.next, null);
  });
});

describe('step', () => {
  test('cycles through four steps and leaves -1 alone', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 8].map(A.step), [0, 1, 2, 3, 0, 1, 0]);
    assert.equal(A.step(-1), -1);
  });
});

describe('moveBeat and edgeBeat', () => {
  const beats = [{ t: 1, d: 0.5 }, { t: 2, d: 0.5 }, { t: 3, d: 0.5 }];
  test('moves a beat and keeps its length', () => {
    const r = A.moveBeat(beats, 1, 2.2, 6);
    assert.deepEqual(r.beats[1], { t: 2.2, d: 0.5 });
    assert.equal(r.clamped, false);
  });
  test('stops at the previous beat end and the next beat start', () => {
    assert.deepEqual(A.moveBeat(beats, 1, 0, 6), { beats: [beats[0], { t: 1.5, d: 0.5 }, beats[2]], clamped: true });
    assert.equal(A.moveBeat(beats, 1, 9, 6).beats[1].t, 2.5);
  });
  test('stays inside the block', () => {
    const first = A.moveBeat(beats, 0, -5, 6);
    assert.equal(first.beats[0].t, 0);
    assert.equal(first.clamped, true);
    assert.equal(A.moveBeat(beats, 2, 10, 4).beats[2].t, 3.5);
  });
  test('does not change the original list', () => {
    A.moveBeat(beats, 1, 2.2, 6);
    assert.equal(beats[1].t, 2);
  });
  test('resizes the end edge up to the next beat', () => {
    const r = A.edgeBeat(beats, 0, 'end', 5, 6);
    assert.deepEqual(r.beats[0], { t: 1, d: 1 });
    assert.equal(r.clamped, true);
  });
  test('resizes the start edge back to the previous beat end', () => {
    const r = A.edgeBeat(beats, 1, 'start', 0, 6);
    assert.deepEqual(r.beats[1], { t: 1.5, d: 1 });
    assert.equal(r.clamped, true);
  });
  test('an edge never makes a beat shorter than the minimum', () => {
    const end = A.edgeBeat(beats, 1, 'end', 1, 6);
    close(end.beats[1].d, A.MIN_LEN);
    const start = A.edgeBeat(beats, 1, 'start', 9, 6);
    close(start.beats[1].d, A.MIN_LEN);
    close(start.beats[1].t, 2.5 - A.MIN_LEN);
  });
  test('the end edge stops at the block end', () => {
    const r = A.edgeBeat(beats, 2, 'end', 10, 3.8);
    close(r.beats[2].t + r.beats[2].d, 3.8);
    assert.equal(r.clamped, true);
  });
});

describe('cutBefore and setBeat', () => {
  test('cutBefore trims the beat still held when a new tap starts', () => {
    assert.deepEqual(A.cutBefore([{ t: 1, d: 1 }], 1.4), [{ t: 1, d: 0.4 }]);
  });
  test('cutBefore leaves a beat that already ended', () => {
    assert.deepEqual(A.cutBefore([{ t: 1, d: 0.2 }], 1.4), [{ t: 1, d: 0.2 }]);
  });
  test('setBeat keeps the list sorted', () => {
    assert.deepEqual(A.setBeat([{ t: 1, d: 0.2 }, { t: 3, d: 0.2 }], { t: 2, d: 0.2 }).map((b) => b.t), [1, 2, 3]);
  });
});

describe('shiftBeats and outsideCount', () => {
  test('shiftBeats moves every beat and drops none', () => {
    assert.deepEqual(A.shiftBeats([{ t: 1, d: 0.2 }, { t: 3, d: 0.2 }], -2), [{ t: -1, d: 0.2 }, { t: 1, d: 0.2 }]);
  });
  test('outsideCount counts beats pushed outside the block', () => {
    const item = { dur: 2, beats: [{ t: -1, d: 0.2 }, { t: 1, d: 0.2 }, { t: 1.9, d: 0.2 }] };
    assert.equal(A.outsideCount(item), 2);
  });
});

describe('recordState', () => {
  const item = validItem();
  const info = (over = {}) => ({ karaoke: true, hasMix: true, recording: false, recordingThis: false, ...over });
  test('is null off the karaoke page', () => {
    assert.equal(A.recordState(item, info({ karaoke: false })), null);
  });
  test('shows Stop while recording this block', () => {
    assert.deepEqual(A.recordState(item, info({ recording: true, recordingThis: true })), { label: 'Stop', disabled: false, note: null });
  });
  test('is disabled while another run is going', () => {
    assert.deepEqual(A.recordState(item, info({ recording: true })), { label: 'Record beats', disabled: true, note: 'Finish the current recording first.' });
  });
  test('is disabled with no music in Order of music', () => {
    assert.deepEqual(A.recordState(item, info({ hasMix: false })), { label: 'Record beats', disabled: true, note: 'Add music to Order of music first.' });
  });
  test('is enabled otherwise, with a null note', () => {
    const out = A.recordState(item, info());
    assert.equal(out.disabled, false);
    assert.equal(out.note, null);
  });
});

describe('defaultFrame', () => {
  test('stays inside the canvas for every kind and slot', () => {
    for (const k of A.KINDS) {
      for (let slot = 0; slot <= 10; slot++) {
        const f = A.defaultFrame(k.id, slot);
        assert.ok(f.x >= 0 && f.y >= 0, k.id + ' slot ' + slot);
        assert.ok(f.x + f.w <= 1 + 1e-9 && f.y + f.h <= 1 + 1e-9, k.id + ' slot ' + slot);
      }
    }
  });
  test('each new slot moves down so animations do not stack exactly', () => {
    assert.notEqual(A.defaultFrame('clap', 0).y, A.defaultFrame('clap', 1).y);
  });
});

describe('SWATCHES', () => {
  test('every swatch is a color cleanItem keeps', () => {
    for (const sw of A.SWATCHES) assert.equal(A.cleanItem(validItem({ color: sw.hex })).color, sw.hex);
  });
});
