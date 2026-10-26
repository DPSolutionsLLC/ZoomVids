import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const VocalExport = loadModule('VocalExport');

function videoSong(overrides) {
  return Object.assign({
    id: 's1', key: 'clip.mp4', name: 'Clip song', in: 2, out: 120, role: 'vocal',
    pic: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 },
    lyrics: { text: 'la la la' },
    pair: { key: 'inst.wav', name: 'Inst', offset: 0.25, gainDb: -2, role: 'instrumental', mute: true }
  }, overrides || {});
}

function withoutMute(items) {
  return JSON.parse(JSON.stringify(items, (k, v) => (k === 'mute' ? undefined : v)));
}

describe('cleanPick and versionsFor', () => {
  test('the three picks map to their version lists', () => {
    assert.deepEqual(VocalExport.versionsFor('both'), ['vocals', 'music']);
    assert.deepEqual(VocalExport.versionsFor('vocals'), ['vocals']);
    assert.deepEqual(VocalExport.versionsFor('music'), ['music']);
  });

  test('a bad pick falls back to both', () => {
    for (const bad of ['Both', '', undefined, 42]) {
      assert.equal(VocalExport.cleanPick(bad), 'both');
      assert.deepEqual(VocalExport.versionsFor(bad), ['vocals', 'music']);
    }
  });
});

describe('forVersion', () => {
  test('music only mutes the vocal video track and sounds the muted instrumental', () => {
    const out = VocalExport.forVersion([videoSong()], 'music');
    assert.equal(out[0].mute, true);
    assert.equal('mute' in out[0].pair, false);
  });

  test('with vocals sounds a muted vocal track and leaves the instrumental alone', () => {
    const out = VocalExport.forVersion([videoSong({ mute: true })], 'vocals');
    assert.equal('mute' in out[0], false);
    assert.equal(out[0].pair.mute, true);
  });

  test('a track with no role keeps its Sound tick in both versions', () => {
    const muted = [{ id: 'a', key: 'a.wav', mute: true }];
    const sounding = [{ id: 'b', key: 'b.wav' }];
    for (const version of ['vocals', 'music']) {
      assert.equal(VocalExport.forVersion(muted, version)[0].mute, true);
      assert.equal('mute' in VocalExport.forVersion(sounding, version)[0], false);
    }
  });

  test('does not change the input', () => {
    const items = [videoSong(), { id: 'b', key: 'b.wav', role: 'instrumental', mute: true }];
    const before = JSON.parse(JSON.stringify(items));
    VocalExport.forVersion(items, 'music');
    VocalExport.forVersion(items, 'vocals');
    assert.deepEqual(items, before);
  });

  test('changes nothing but mute, so the picture and timing stay the same', () => {
    const items = [videoSong(), { id: 'b', key: 'b.wav', name: 'B', role: 'vocal', in: 1, out: 30 }];
    for (const version of ['vocals', 'music']) {
      const out = VocalExport.forVersion(items, version);
      assert.deepEqual(withoutMute(out), withoutMute(items));
      assert.equal(out[0].pair.offset, 0.25);
      assert.deepEqual(out[0].pic, items[0].pic);
    }
  });

  test('an unknown version throws', () => {
    assert.throws(() => VocalExport.forVersion([videoSong()], 'instrumental'), /unknown version instrumental/);
  });
});

describe('check', () => {
  test('available only when some track is marked vocal', () => {
    const noVocal = [{ key: 'a', role: 'instrumental' }, { key: 'b', pair: { key: 'c' } }];
    assert.equal(VocalExport.check(noVocal).available, false);
    const pairVocal = [{ key: 'a', role: 'instrumental', pair: { key: 'b', role: 'vocal' } }];
    assert.equal(VocalExport.check(pairVocal).available, true);
  });

  test('silent lists a single-track vocal song only', () => {
    const items = [
      { key: 'solo.wav', name: 'Solo', role: 'vocal' },
      videoSong({ name: 'Paired' }),
      { key: 'quiet.wav', name: 'Quiet', mute: true }
    ];
    assert.deepEqual(VocalExport.check(items).silent, ['Solo']);
  });

  test('unmarked lists a two-track song with no vocal mark, not a one-track song', () => {
    const items = [
      { key: 'a.wav', name: 'Two', pair: { key: 'b.wav', role: 'instrumental' } },
      { key: 'c.wav', name: 'One' },
      { key: 'v.wav', role: 'vocal' }
    ];
    assert.deepEqual(VocalExport.check(items).unmarked, ['Two']);
  });

  test('names fall back to the key', () => {
    const items = [{ key: 'solo.wav', role: 'vocal' }, { key: 'two.wav', pair: { key: 'x.wav' } }];
    const ck = VocalExport.check(items);
    assert.deepEqual(ck.silent, ['solo.wav']);
    assert.deepEqual(ck.unmarked, ['two.wav']);
  });
});

describe('fileBase and label', () => {
  test('exact strings', () => {
    assert.equal(VocalExport.fileBase('karaoke-2026-10-25', 'vocals'), 'karaoke-2026-10-25-with-vocals');
    assert.equal(VocalExport.fileBase('karaoke-2026-10-25', 'music'), 'karaoke-2026-10-25-music-only');
    assert.equal(VocalExport.label('vocals'), 'with vocals');
    assert.equal(VocalExport.label('music'), 'music only');
  });
});

describe('clean', () => {
  const good = { date: '2026-10-25', time: '21:41', made: ['vocals', 'music'] };

  test('missing or garbage input gives both with no last', () => {
    for (const raw of [undefined, null, 'x', 42, { pick: 'loud', last: 'yesterday' }]) {
      const out = VocalExport.clean(raw);
      assert.deepEqual(out, { pick: 'both' });
      assert.equal('last' in out, false);
    }
  });

  test('keeps a valid pick and last', () => {
    assert.deepEqual(VocalExport.clean({ pick: 'music', last: good }), { pick: 'music', last: good });
  });

  test('each bad last field on its own drops last', () => {
    const bad = [
      Object.assign({}, good, { date: '2026-13' }),
      Object.assign({}, good, { time: '9:41' }),
      Object.assign({}, good, { made: [] }),
      Object.assign({}, good, { made: ['music', 'vocals'] }),
      Object.assign({}, good, { made: ['vocals', 'vocals'] })
    ];
    for (const last of bad) {
      const out = VocalExport.clean({ pick: 'vocals', last });
      assert.deepEqual(out, { pick: 'vocals' });
    }
  });
});

describe('withPick and withExport', () => {
  const last = { date: '2026-10-25', time: '21:41', made: ['music'] };

  test('withPick sets the pick, keeps last and leaves the input alone', () => {
    const state = { pick: 'both', last };
    const out = VocalExport.withPick(state, 'music');
    assert.notEqual(out, state);
    assert.deepEqual(out, { pick: 'music', last });
    assert.deepEqual(state, { pick: 'both', last });
  });

  test('withExport sets last, keeps the pick and leaves the input alone', () => {
    const state = { pick: 'vocals' };
    const out = VocalExport.withExport(state, ['vocals'], '2026-10-26', '08:05');
    assert.notEqual(out, state);
    assert.deepEqual(out, { pick: 'vocals', last: { date: '2026-10-26', time: '08:05', made: ['vocals'] } });
    assert.deepEqual(state, { pick: 'vocals' });
  });
});

describe('noteText', () => {
  test('null when nothing was exported', () => {
    assert.equal(VocalExport.noteText(undefined), null);
  });

  test('both versions', () => {
    assert.equal(
      VocalExport.noteText({ date: '2026-10-25', time: '21:41', made: ['vocals', 'music'] }),
      'Last exported 25 Oct 2026 at 21:41: with vocals and music only.'
    );
  });

  test('music only', () => {
    assert.equal(
      VocalExport.noteText({ date: '2026-01-05', time: '07:00', made: ['music'] }),
      'Last exported 5 Jan 2026 at 07:00: music only.'
    );
  });
});
