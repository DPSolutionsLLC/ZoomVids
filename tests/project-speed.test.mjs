import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const ProjectSpeed = loadModule('ProjectSpeed');

test('clean gives the defaults for missing or invalid settings', () => {
  for (const raw of [null, undefined, 'x', [], 5, [90]]) {
    assert.deepEqual(ProjectSpeed.clean(raw), { pct: 100, keepPitch: true, semis: 0 });
  }
});

test('clean returns a new object each time', () => {
  const a = ProjectSpeed.clean(null);
  a.pct = 90;
  assert.equal(ProjectSpeed.clean(null).pct, 100);
  assert.equal(ProjectSpeed.DEFAULTS.pct, 100);
});

test('clean keeps a valid setting as it is', () => {
  assert.deepEqual(ProjectSpeed.clean({ pct: 90, keepPitch: false }), { pct: 90, keepPitch: false, semis: 0 });
  assert.deepEqual(ProjectSpeed.clean({ pct: 125, keepPitch: true }), { pct: 125, keepPitch: true, semis: 0 });
});

test('clean keeps the speed between 75 and 125', () => {
  assert.equal(ProjectSpeed.clean({ pct: 300, keepPitch: true }).pct, 125);
  assert.equal(ProjectSpeed.clean({ pct: 10, keepPitch: true }).pct, 75);
  assert.equal(ProjectSpeed.clean({ pct: -50, keepPitch: true }).pct, 75);
});

test('clean rounds the speed to the nearest 5', () => {
  assert.equal(ProjectSpeed.clean({ pct: 92, keepPitch: true }).pct, 90);
  assert.equal(ProjectSpeed.clean({ pct: 93, keepPitch: true }).pct, 95);
  assert.equal(ProjectSpeed.clean({ pct: 101, keepPitch: true }).pct, 100);
});

test('clean falls back to 100 for a speed that is not a number', () => {
  for (const pct of ['90', NaN, Infinity, null]) {
    assert.equal(ProjectSpeed.clean({ pct, keepPitch: true }).pct, 100);
  }
});

test('clean keeps the pitch unless it is turned off', () => {
  assert.equal(ProjectSpeed.clean({ pct: 90 }).keepPitch, true);
  assert.equal(ProjectSpeed.clean({ pct: 90, keepPitch: 'no' }).keepPitch, true);
  assert.equal(ProjectSpeed.clean({ pct: 90, keepPitch: false }).keepPitch, false);
});

test('steps lists 75% to 125% in steps of 5', () => {
  assert.deepEqual(ProjectSpeed.steps(), [75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125]);
});

test('factor applies the speed on the karaoke page only', () => {
  const slow = { pct: 90, keepPitch: true };
  assert.equal(ProjectSpeed.factor(slow, 'karaoke'), 0.9);
  assert.equal(ProjectSpeed.factor(slow, 'hymn'), 1);
  assert.equal(ProjectSpeed.factor(null, 'karaoke'), 1);
  assert.equal(ProjectSpeed.factor({ pct: 125, keepPitch: false }, 'karaoke'), 1.25);
});

test('isNormal is true at 100% and on the hymn page', () => {
  assert.equal(ProjectSpeed.isNormal({ pct: 100, keepPitch: true }, 'karaoke'), true);
  assert.equal(ProjectSpeed.isNormal({ pct: 90, keepPitch: true }, 'hymn'), true);
  assert.equal(ProjectSpeed.isNormal({ pct: 90, keepPitch: true }, 'karaoke'), false);
});

test('outputLength and songTimeAt turn song time into file time and back', () => {
  assert.equal(ProjectSpeed.outputLength(180, 0.9), 200);
  assert.equal(ProjectSpeed.songTimeAt(200, 0.9), 180);
  for (const k of [0.75, 0.9, 1, 1.1, 1.25]) {
    assert.ok(Math.abs(ProjectSpeed.songTimeAt(ProjectSpeed.outputLength(123.4, k), k) - 123.4) < 1e-9);
  }
});

test('label names the speed and the pitch choice', () => {
  assert.equal(ProjectSpeed.label({ pct: 90, keepPitch: true }), 'Project speed 90% · keep pitch');
  assert.equal(ProjectSpeed.label({ pct: 110, keepPitch: false }), 'Project speed 110% · pitch changes');
});

test('fileSuffix adds the speed only when it is not normal', () => {
  assert.equal(ProjectSpeed.fileSuffix({ pct: 90, keepPitch: true }, 'karaoke'), ' (90%)');
  assert.equal(ProjectSpeed.fileSuffix({ pct: 110, keepPitch: false }, 'karaoke'), ' (110%)');
  assert.equal(ProjectSpeed.fileSuffix({ pct: 100, keepPitch: true }, 'karaoke'), '');
  assert.equal(ProjectSpeed.fileSuffix({ pct: 90, keepPitch: true }, 'hymn'), '');
});

test('clean gives key 0 by default and for old settings without a key', () => {
  assert.equal(ProjectSpeed.clean(null).semis, 0);
  assert.equal(ProjectSpeed.clean({ pct: 90, keepPitch: true }).semis, 0);
});

test('clean keeps a valid key', () => {
  assert.deepEqual(ProjectSpeed.clean({ pct: 100, keepPitch: true, semis: -3 }), { pct: 100, keepPitch: true, semis: -3 });
});

test('clean keeps the key between -6 and 6', () => {
  assert.equal(ProjectSpeed.clean({ pct: 100, keepPitch: true, semis: 9 }).semis, 6);
  assert.equal(ProjectSpeed.clean({ pct: 100, keepPitch: true, semis: -9 }).semis, -6);
});

test('clean rounds the key and ignores a key that is not a number', () => {
  assert.equal(ProjectSpeed.clean({ pct: 100, keepPitch: true, semis: 2.6 }).semis, 3);
  assert.equal(ProjectSpeed.clean({ pct: 100, keepPitch: true, semis: '3' }).semis, 0);
  assert.equal(ProjectSpeed.clean({ pct: 100, keepPitch: true, semis: NaN }).semis, 0);
  assert.ok(Object.is(ProjectSpeed.clean({ pct: 100, keepPitch: true, semis: -0.2 }).semis, 0));
});

test('keyRatio is exactly 1 at key 0 and follows half steps on karaoke only', () => {
  assert.equal(ProjectSpeed.keyRatio({ pct: 100, keepPitch: true, semis: 0 }, 'karaoke'), 1);
  assert.ok(Math.abs(ProjectSpeed.keyRatio({ pct: 100, keepPitch: true, semis: -3 }, 'karaoke') - 0.8409) < 1e-4);
  assert.equal(ProjectSpeed.keyRatio({ pct: 100, keepPitch: true, semis: -3 }, 'hymn'), 1);
});

test('keySteps lists the 13 keys from -6 to 6', () => {
  assert.deepEqual(ProjectSpeed.keySteps(), [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]);
});

test('keyText uses a real minus sign below 0 and a plus above', () => {
  assert.equal(ProjectSpeed.keyText(-3), '−3');
  assert.equal(ProjectSpeed.keyText(2), '+2');
  assert.equal(ProjectSpeed.keyText(0), '0');
});

test('a changed key alone is not unchanged, but is still normal speed', () => {
  const keyOnly = { pct: 100, keepPitch: true, semis: -3 };
  assert.equal(ProjectSpeed.isUnchanged(keyOnly, 'karaoke'), false);
  assert.equal(ProjectSpeed.isNormal(keyOnly, 'karaoke'), true);
  assert.equal(ProjectSpeed.isOriginalKey(keyOnly, 'karaoke'), false);
  assert.equal(ProjectSpeed.isUnchanged({ pct: 100, keepPitch: true, semis: 0 }, 'karaoke'), true);
  assert.equal(ProjectSpeed.isUnchanged(keyOnly, 'hymn'), true);
});

test('label names the speed, the key, both or neither', () => {
  assert.equal(ProjectSpeed.label({ pct: 90, keepPitch: true, semis: 0 }), 'Project speed 90% · keep pitch');
  assert.equal(ProjectSpeed.label({ pct: 100, keepPitch: true, semis: -3 }), 'Key −3');
  assert.equal(ProjectSpeed.label({ pct: 90, keepPitch: true, semis: -3 }), 'Project speed 90% · keep pitch · key −3');
  assert.equal(ProjectSpeed.label({ pct: 100, keepPitch: true, semis: 0 }), '');
});

test('fileSuffix adds the key with a plain hyphen, next to the speed', () => {
  assert.equal(ProjectSpeed.fileSuffix({ pct: 100, keepPitch: true, semis: -3 }, 'karaoke'), ' (-3 key)');
  assert.equal(ProjectSpeed.fileSuffix({ pct: 100, keepPitch: true, semis: 2 }, 'karaoke'), ' (+2 key)');
  assert.equal(ProjectSpeed.fileSuffix({ pct: 90, keepPitch: true, semis: -3 }, 'karaoke'), ' (90%, -3 key)');
  assert.equal(ProjectSpeed.fileSuffix({ pct: 100, keepPitch: true, semis: -3 }, 'hymn'), '');
});
