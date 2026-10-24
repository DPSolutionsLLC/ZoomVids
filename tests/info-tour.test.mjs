import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const InfoTour = loadModule('InfoTour');

const keys = (list) => list.map((e) => e.key + '@' + e.lane);

test('order lists the songs row left to right, then the talks row left to right', () => {
  const music = [{ key: 'b', start: 200 }, { key: 'a', start: 0 }];
  const spoken = [{ key: 'y', start: 300 }, { key: 'x', start: 50 }];
  assert.deepEqual(keys(InfoTour.order(music, spoken)), ['a@items', 'b@items', 'x@spoken', 'y@spoken']);
});

test('order lists a recording placed twice once, at its first spot', () => {
  const music = [{ key: 'a', start: 0 }, { key: 'shared', start: 100 }];
  const spoken = [{ key: 'talk', start: 400 }, { key: 'shared', start: 10 }, { key: 'talk', start: 20 }];
  assert.deepEqual(keys(InfoTour.order(music, spoken)), ['a@items', 'shared@items', 'talk@spoken']);
});

test('order keeps the given order for equal starts and leaves the inputs alone', () => {
  const music = [{ key: 'b', start: 5 }, { key: 'a', start: 5 }];
  const before = JSON.parse(JSON.stringify(music));
  assert.deepEqual(keys(InfoTour.order(music, [])), ['b@items', 'a@items']);
  assert.deepEqual(music, before);
});

test('order with no recordings is empty', () => {
  assert.deepEqual(InfoTour.order([], []), []);
  assert.deepEqual(InfoTour.order(undefined, undefined), []);
});

const tour = [{ key: 'a', lane: 'items' }, { key: 'b', lane: 'items' }, { key: 'c', lane: 'spoken' }];

test('step moves forward and back through the middle', () => {
  assert.equal(InfoTour.step(tour, 'b', 1).key, 'c');
  assert.equal(InfoTour.step(tour, 'b', -1).key, 'a');
});

test('step wraps at both ends', () => {
  assert.equal(InfoTour.step(tour, 'c', 1).key, 'a');
  assert.equal(InfoTour.step(tour, 'a', -1).key, 'c');
});

test('step from a recording not on the timeline goes to the first or the last', () => {
  assert.equal(InfoTour.step(tour, 'elsewhere', 1).key, 'a');
  assert.equal(InfoTour.step(tour, 'elsewhere', -1).key, 'c');
});

test('step on an empty list gives null, and a one-item list gives that item', () => {
  assert.equal(InfoTour.step([], 'a', 1), null);
  assert.equal(InfoTour.step([tour[0]], 'a', 1).key, 'a');
  assert.equal(InfoTour.step([tour[0]], 'a', -1).key, 'a');
});

test('indexOf finds a recording or gives -1', () => {
  assert.equal(InfoTour.indexOf(tour, 'c'), 2);
  assert.equal(InfoTour.indexOf(tour, 'z'), -1);
});

test('label numbers a song by its title', () => {
  assert.equal(InfoTour.label(1, { kind: 'song', title: 'Come, Thou Fount', speaker: 'ignored' }), '1. Come, Thou Fount');
});

test('label names a talk by speaker and talk title', () => {
  assert.equal(InfoTour.label(3, { kind: 'talk', title: 'file name', speaker: 'Elder Holland', talk: 'The Atonement' }), '3. Elder Holland — The Atonement');
});

test('label uses whichever of speaker or talk title a talk has', () => {
  assert.equal(InfoTour.label(2, { kind: 'talk', title: 'file name', speaker: 'Sister Jones', talk: '' }), '2. Sister Jones');
  assert.equal(InfoTour.label(2, { kind: 'talk', title: 'file name', speaker: '   ', talk: 'Faith' }), '2. Faith');
});

test('label falls back to the title for a talk with neither speaker nor talk title', () => {
  assert.equal(InfoTour.label(4, { kind: 'talk', title: 'holland atonement', speaker: ' ', talk: '' }), '4. holland atonement');
});
