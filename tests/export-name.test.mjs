import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const ExportName = loadModule('ExportName');

test('auto uses the playlist name and the date on the hymn page', () => {
  assert.equal(ExportName.auto({ name: 'Easter Program', workspace: 'hymn', date: '2026-11-01' }), 'Easter Program-2026-11-01');
});

test('auto uses the project name and the date on the karaoke page', () => {
  assert.equal(ExportName.auto({ name: 'Amazing Grace', workspace: 'karaoke', date: '2026-10-28' }), 'Amazing Grace-2026-10-28');
});

test('auto falls back to sacrament or karaoke when there is no name', () => {
  assert.equal(ExportName.auto({ name: '', workspace: 'hymn', date: '2026-11-01' }), 'sacrament-2026-11-01');
  assert.equal(ExportName.auto({ name: undefined, workspace: 'hymn', date: '2026-11-01' }), 'sacrament-2026-11-01');
  assert.equal(ExportName.auto({ name: '', workspace: 'karaoke', date: '2026-10-28' }), 'karaoke-2026-10-28');
  assert.equal(ExportName.auto({ name: undefined, workspace: 'karaoke', date: '2026-10-28' }), 'karaoke-2026-10-28');
});

test('auto prefers the remembered name over the playlist name', () => {
  assert.equal(ExportName.auto({ name: 'Easter', remembered: 'Choir Mix', workspace: 'hymn', date: '2026-11-01' }), 'Choir Mix-2026-11-01');
});

test('auto ignores a remembered name that cleans to nothing', () => {
  assert.equal(ExportName.auto({ name: 'Easter', remembered: '   ', workspace: 'hymn', date: '2026-11-01' }), 'Easter-2026-11-01');
});

test('auto removes characters a file name cannot hold', () => {
  const out = ExportName.auto({ name: 'Easter / Spring: 2026', workspace: 'hymn', date: '2026-11-01' });
  assert.equal(out, 'Easter - Spring- 2026-2026-11-01');
  assert.doesNotMatch(out, /[\\/:*?"<>|]/);
});

test('auto falls back when the name is only spaces', () => {
  assert.equal(ExportName.auto({ name: '   ', workspace: 'hymn', date: '2026-11-01' }), 'sacrament-2026-11-01');
  assert.equal(ExportName.auto({ name: '   ', workspace: 'karaoke', date: '2026-10-28' }), 'karaoke-2026-10-28');
});

test('clean strips a trailing date', () => {
  assert.equal(ExportName.clean('Choir Mix-2026-10-28'), 'Choir Mix');
  assert.equal(ExportName.clean('Choir Mix 2026-10-28'), 'Choir Mix');
  assert.equal(ExportName.clean('Choir Mix_2026-10-28'), 'Choir Mix');
});

test('clean strips a file extension', () => {
  assert.equal(ExportName.clean('Choir Mix.mp4'), 'Choir Mix');
  assert.equal(ExportName.clean('Choir Mix-2026-10-28.mp3'), 'Choir Mix');
});

test('clean keeps a date that is not at the end', () => {
  assert.equal(ExportName.clean('2026-10-28 Choir'), '2026-10-28 Choir');
});

test('clean returns null for blank input, a bare date, and non-strings', () => {
  assert.equal(ExportName.clean(''), null);
  assert.equal(ExportName.clean('   '), null);
  assert.equal(ExportName.clean('2026-10-28'), null);
  assert.equal(ExportName.clean(null), null);
  assert.equal(ExportName.clean(undefined), null);
  assert.equal(ExportName.clean(5), null);
  assert.equal(ExportName.clean({}), null);
});

test('safe removes the extension and bad characters, and turns null into an empty string', () => {
  assert.equal(ExportName.safe('mix.mp3'), 'mix');
  assert.equal(ExportName.safe('mix.mp3 '), 'mix');
  assert.equal(ExportName.safe('a/b'), 'a-b');
  assert.equal(ExportName.safe(null), '');
});

test('fallback names each workspace', () => {
  assert.equal(ExportName.fallback('karaoke'), 'karaoke');
  assert.equal(ExportName.fallback('hymn'), 'sacrament');
});
