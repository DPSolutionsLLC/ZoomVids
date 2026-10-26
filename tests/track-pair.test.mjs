import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TrackPair = loadModule('TrackPair');

describe('cleanPair', () => {
  test('returns null for a missing or empty key, or a non-object', () => {
    assert.equal(TrackPair.cleanPair(null), null);
    assert.equal(TrackPair.cleanPair('song.mp3'), null);
    assert.equal(TrackPair.cleanPair({ name: 'Song' }), null);
    assert.equal(TrackPair.cleanPair({ key: '', name: 'Song' }), null);
    assert.equal(TrackPair.cleanPair({ key: 42 }), null);
  });

  test('clamps the offset to 600 s each way and rounds it to 3 decimals', () => {
    assert.equal(TrackPair.cleanPair({ key: 'a', offset: 1234 }).offset, 600);
    assert.equal(TrackPair.cleanPair({ key: 'a', offset: -999 }).offset, -600);
    assert.equal(TrackPair.cleanPair({ key: 'a', offset: 1.23456 }).offset, 1.235);
  });

  test('a NaN offset becomes 0', () => {
    assert.equal(TrackPair.cleanPair({ key: 'a', offset: NaN }).offset, 0);
  });

  test('drops a bad role and keeps a good one', () => {
    assert.equal('role' in TrackPair.cleanPair({ key: 'a', role: 'drums' }), false);
    assert.equal(TrackPair.cleanPair({ key: 'a', role: 'vocal' }).role, 'vocal');
  });

  test('keeps mute only when it is exactly true', () => {
    assert.equal('mute' in TrackPair.cleanPair({ key: 'a', mute: 'yes' }), false);
    assert.equal(TrackPair.cleanPair({ key: 'a', mute: true }).mute, true);
  });

  test('fills the name from the key and clamps the volume', () => {
    const pair = TrackPair.cleanPair({ key: 'inst.wav', gainDb: 40 });
    assert.equal(pair.name, 'inst.wav');
    assert.equal(pair.gainDb, 12);
  });
});

describe('cleanTrack', () => {
  test('removes a pair that has no valid key', () => {
    const item = TrackPair.cleanTrack({ id: 'i1', key: 'song', pair: { key: '' } });
    assert.equal('pair' in item, false);
  });

  test('keeps a valid pair', () => {
    const item = TrackPair.cleanTrack({ id: 'i1', key: 'song', pair: { key: 'inst', name: 'Inst', offset: 1.5 } });
    assert.deepEqual(item.pair, { key: 'inst', name: 'Inst', offset: 1.5, gainDb: 0 });
  });

  test('leaves a plain item exactly as it was', () => {
    const plain = { id: 'i1', key: 'song', name: 'Song', in: 2, out: 60, xf: 4, gainDb: -3 };
    assert.deepEqual(TrackPair.cleanTrack({ ...plain }), plain);
  });

  test('drops a mute that is not true and a bad role', () => {
    const item = TrackPair.cleanTrack({ id: 'i1', key: 'song', mute: 1, role: 'lead' });
    assert.equal('mute' in item, false);
    assert.equal('role' in item, false);
  });
});

describe('guessRole', () => {
  test('spots instrumental names', () => {
    assert.equal(TrackPair.guessRole('Song (Instrumental).mp3'), 'instrumental');
    assert.equal(TrackPair.guessRole('Song - Karaoke Version.m4a'), 'instrumental');
    assert.equal(TrackPair.guessRole('Accompaniment track.wav'), 'instrumental');
  });

  test('never guesses from a plain name', () => {
    assert.equal(TrackPair.guessRole('Song.mp3'), null);
  });
});

describe('defaultRoles', () => {
  test('one instrumental name makes the other track the vocal', () => {
    assert.deepEqual(TrackPair.defaultRoles('Song.mp3', 'Song (Instrumental).mp3'), { main: 'vocal', pair: 'instrumental' });
    assert.deepEqual(TrackPair.defaultRoles('Song karaoke.mp3', 'Song.mp3'), { main: 'instrumental', pair: 'vocal' });
  });

  test('neither or both leave the roles unset', () => {
    assert.deepEqual(TrackPair.defaultRoles('A.mp3', 'B.mp3'), { main: null, pair: null });
    assert.deepEqual(TrackPair.defaultRoles('A karaoke.mp3', 'B instrumental.mp3'), { main: null, pair: null });
  });
});

describe('window', () => {
  test('offset 0 inside the file covers the whole song', () => {
    assert.deepEqual(TrackPair.window(5, 30, 0, 100), { at: 0, srcIn: 5, len: 30 });
  });

  test('a negative offset larger than the song start leaves silence at the start', () => {
    const w = TrackPair.window(2, 30, -5, 100);
    assert.equal(w.at, 3);
    assert.equal(w.srcIn, 0);
    assert.equal(w.len, 27);
  });

  test('a second track shorter than the song is cut short', () => {
    assert.deepEqual(TrackPair.window(0, 30, 0, 20), { at: 0, srcIn: 0, len: 20 });
  });

  test('no overlap gives null', () => {
    assert.equal(TrackPair.window(0, 30, 50, 40), null);
    assert.equal(TrackPair.window(0, 30, -40, 100), null);
  });
});

describe('swap', () => {
  const item = {
    id: 'i1', key: 'vocal.wav', name: 'vocal.wav', in: 3, out: 25, xf: 4, gainDb: -2, role: 'vocal', mute: true,
    pair: { key: 'inst.wav', name: 'inst.wav', offset: 1.234, gainDb: 3, role: 'instrumental', pic: { show: false } }
  };

  test('swapping twice gives back the original', () => {
    const back = TrackPair.swap(TrackPair.swap(item, 30, 32), 32, 30);
    assert.equal(back.key, item.key);
    assert.equal(back.pair.key, item.pair.key);
    assert.equal(back.pair.offset, item.pair.offset);
    assert.ok(Math.abs(back.in - item.in) < 1e-9);
    assert.ok(Math.abs(back.out - item.out) < 1e-9);
  });

  test('moves the song window into the new main track’s time', () => {
    const swapped = TrackPair.swap(item, 30, 32);
    assert.ok(Math.abs(swapped.in - 4.234) < 1e-9);
    assert.ok(Math.abs(swapped.out - 26.234) < 1e-9);
    assert.equal(swapped.pair.offset, -1.234);
  });

  test('keeps the id and crossfade', () => {
    const swapped = TrackPair.swap(item, 30, 32);
    assert.equal(swapped.id, 'i1');
    assert.equal(swapped.xf, 4);
  });

  test('trades roles, mutes, volumes and pictures', () => {
    const swapped = TrackPair.swap(item, 30, 32);
    assert.equal(swapped.role, 'instrumental');
    assert.equal(swapped.pair.role, 'vocal');
    assert.equal('mute' in swapped, false);
    assert.equal(swapped.pair.mute, true);
    assert.equal(swapped.gainDb, 3);
    assert.equal(swapped.pair.gainDb, -2);
    assert.deepEqual(swapped.pic, { show: false });
    assert.equal('pic' in swapped.pair, false);
  });

  test('leaves in and out unset when the song had none', () => {
    const swapped = TrackPair.swap({ id: 'i2', key: 'a', name: 'a', pair: { key: 'b', name: 'b', offset: 2, gainDb: 0 } }, 30, 30);
    assert.equal('in' in swapped, false);
    assert.equal('out' in swapped, false);
  });
});

describe('offsetText', () => {
  test('describes zero, positive and negative offsets', () => {
    assert.equal(TrackPair.offsetText(0), 'Both start together');
    assert.equal(TrackPair.offsetText(1.234), 'Track 2 is moved 1.234 s earlier');
    assert.equal(TrackPair.offsetText(-0.5), 'Track 2 is moved 0.500 s later');
  });
});
