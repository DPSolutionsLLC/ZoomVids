import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const ClipMute = loadModule('ClipMute');

function pairItem(mainExtra = {}, pairExtra = {}) {
  return { key: 'a', ...mainExtra, pair: { key: 'b', ...pairExtra } };
}

describe('states', () => {
  test('a single track gives one state', () => {
    const list = ClipMute.states({ key: 'a' }, false, false);
    assert.deepEqual(list, [{ which: 'main', n: 1, role: null, muted: false, silent: false }]);
  });

  test('a pair gives two states with which and n set', () => {
    const list = ClipMute.states(pairItem({ role: 'vocal' }, { role: 'instrumental', mute: true }), false, false);
    assert.equal(list.length, 2);
    assert.deepEqual(list.map((s) => [s.which, s.n, s.role, s.muted]), [['main', 1, 'vocal', false], ['pair', 2, 'instrumental', true]]);
  });

  test('a silent track counts as muted without the flag', () => {
    const [state] = ClipMute.states({ key: 'a' }, true, false);
    assert.equal(state.muted, true);
    assert.equal(state.silent, true);
  });

  test('mute set to "yes" is not true, so it reads as not muted', () => {
    assert.equal(ClipMute.states({ key: 'a', mute: 'yes' }, false, false)[0].muted, false);
  });
});

describe('names', () => {
  test('a single track has no name', () => {
    assert.deepEqual(ClipMute.names(ClipMute.states({ key: 'a' }, false, false)), [null]);
  });

  test('vocal and instrumental give the role names', () => {
    const list = ClipMute.states(pairItem({ role: 'vocal' }, { role: 'instrumental' }), false, false);
    assert.deepEqual(ClipMute.names(list), ['vocal', 'instrumental']);
  });

  test('two vocal tracks fall back to track numbers', () => {
    const list = ClipMute.states(pairItem({ role: 'vocal' }, { role: 'vocal' }), false, false);
    assert.deepEqual(ClipMute.names(list), ['track 1', 'track 2']);
  });

  test('one missing role gives track numbers', () => {
    const list = ClipMute.states(pairItem({ role: 'vocal' }), false, false);
    assert.deepEqual(ClipMute.names(list), ['track 1', 'track 2']);
  });
});

describe('set', () => {
  test('mutes, and unmutes by deleting the flag', () => {
    const track = { key: 'a' };
    assert.equal(ClipMute.set(track, true, false), true);
    assert.equal(track.mute, true);
    assert.equal(ClipMute.set(track, false, false), true);
    assert.equal('mute' in track, false);
  });

  test('a silent track refuses to unmute and keeps its flag', () => {
    const track = { key: 'a', mute: true };
    assert.equal(ClipMute.set(track, false, true), false);
    assert.equal(track.mute, true);
  });

  test('a silent track can still be set to muted', () => {
    const track = { key: 'a' };
    assert.equal(ClipMute.set(track, true, true), true);
    assert.equal(track.mute, true);
  });
});

describe('toggleTarget', () => {
  test('both playing means mute', () => {
    assert.equal(ClipMute.toggleTarget(ClipMute.states(pairItem(), false, false)), true);
  });

  test('one muted means unmute', () => {
    assert.equal(ClipMute.toggleTarget(ClipMute.states(pairItem({}, { mute: true }), false, false)), false);
  });

  test('both muted means unmute', () => {
    assert.equal(ClipMute.toggleTarget(ClipMute.states(pairItem({ mute: true }, { mute: true }), false, false)), false);
  });

  test('a single silent track gives null', () => {
    assert.equal(ClipMute.toggleTarget(ClipMute.states({ key: 'a', mute: true }, true, false)), null);
  });

  test('a silent track 2 is ignored', () => {
    assert.equal(ClipMute.toggleTarget(ClipMute.states(pairItem({}, { mute: true }), false, true)), true);
    assert.equal(ClipMute.toggleTarget(ClipMute.states(pairItem({ mute: true }, { mute: true }), false, true)), false);
  });
});

describe('buttonLabel', () => {
  test('reads Mute or Unmute, with the track name when there is one', () => {
    assert.equal(ClipMute.buttonLabel({ muted: false }, null), 'Mute');
    assert.equal(ClipMute.buttonLabel({ muted: true }, null), 'Unmute');
    assert.equal(ClipMute.buttonLabel({ muted: false }, 'vocal'), 'Mute vocal');
    assert.equal(ClipMute.buttonLabel({ muted: true }, 'track 2'), 'Unmute track 2');
  });
});

describe('mark', () => {
  test('nothing muted gives null', () => {
    assert.equal(ClipMute.mark(ClipMute.states(pairItem(), false, false)), null);
  });

  test('everything muted gives no text and Sound off', () => {
    assert.deepEqual(ClipMute.mark(ClipMute.states(pairItem({ mute: true }, { mute: true }), false, false)), { text: '', title: 'Sound off' });
    assert.deepEqual(ClipMute.mark(ClipMute.states({ key: 'a', mute: true }, false, false)), { text: '', title: 'Sound off' });
  });

  test('a single silent track says the video has no sound', () => {
    assert.deepEqual(ClipMute.mark(ClipMute.states({ key: 'a', mute: true }, true, false)), { text: '', title: 'This video has no sound' });
  });

  test('one of two muted names that track', () => {
    const vocal = ClipMute.states(pairItem({ role: 'vocal', mute: true }, { role: 'instrumental' }), false, false);
    assert.deepEqual(ClipMute.mark(vocal), { text: 'Vocal', title: 'Vocal sound off' });
    const second = ClipMute.states(pairItem({}, { mute: true }), false, false);
    assert.deepEqual(ClipMute.mark(second), { text: 'Track 2', title: 'Track 2 sound off' });
  });
});

describe('silentNote', () => {
  test('single and paired wording', () => {
    assert.equal(ClipMute.silentNote({}, null), 'This video has no sound');
    assert.equal(ClipMute.silentNote({}, 'track 2'), 'Track 2 has no sound');
  });
});
