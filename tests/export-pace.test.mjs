import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, readPage } from './extract-module.mjs';

const openChannels = [];
class TrackedMessageChannel extends MessageChannel {
  constructor() {
    super();
    openChannels.push(this);
  }
}
globalThis.MessageChannel = TrackedMessageChannel;
after(() => openChannels.forEach((channel) => { channel.port1.close(); channel.port2.close(); }));

const ExportPace = loadModule('ExportPace');

function withGuard(promise, ms = 1000) {
  let timer;
  const guard = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timed out')), ms); });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

class FakeCodec extends EventTarget {
  constructor(sizes) {
    super();
    this.ondequeue = null;
    this.state = 'configured';
    Object.assign(this, sizes);
  }
}

function functionSource(page, header) {
  const lines = page.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(header));
  if (start < 0) throw new Error(header + ' not found');
  const end = lines.findIndex((line, index) => index > start && /^  (async )?function /.test(line));
  return lines.slice(start, end < 0 ? undefined : end).join('\n');
}

test('yieldNow resolves', async () => {
  await withGuard(ExportPace.yieldNow());
});

test('yieldNow resolves several waiters in call order', async () => {
  const order = [];
  await withGuard(Promise.all([0, 1, 2, 3].map((index) => ExportPace.yieldNow().then(() => order.push(index)))));
  assert.deepEqual(order, [0, 1, 2, 3]);
});

test('untilRoom returns at once when the queue already has room', async () => {
  const codec = new FakeCodec({ encodeQueueSize: 3 });
  await withGuard(ExportPace.untilRoom(codec, 6), 50);
});

test('untilRoom waits for dequeue events until the queue is at the limit', async () => {
  const codec = new FakeCodec({ encodeQueueSize: 8 });
  let finished = false;
  const waiting = ExportPace.untilRoom(codec, 6).then(() => { finished = true; });
  await ExportPace.yieldNow();
  assert.equal(finished, false);
  codec.encodeQueueSize = 7;
  codec.dispatchEvent(new Event('dequeue'));
  await ExportPace.yieldNow();
  assert.equal(finished, false);
  codec.encodeQueueSize = 6;
  codec.dispatchEvent(new Event('dequeue'));
  await withGuard(waiting, 100);
  assert.equal(finished, true);
});

test('untilRoom reads decodeQueueSize when there is no encodeQueueSize', async () => {
  const codec = new FakeCodec({ decodeQueueSize: 9 });
  let finished = false;
  const waiting = ExportPace.untilRoom(codec, 4).then(() => { finished = true; });
  await ExportPace.yieldNow();
  assert.equal(finished, false);
  codec.decodeQueueSize = 4;
  codec.dispatchEvent(new Event('dequeue'));
  await withGuard(waiting, 100);
  assert.equal(finished, true);
});

test('untilRoom without dequeue support finishes once the queue drops', async () => {
  const codec = { encodeQueueSize: 10, state: 'configured' };
  let finished = false;
  const waiting = ExportPace.untilRoom(codec, 6).then(() => { finished = true; });
  for (let step = 0; step < 3; step++) await ExportPace.yieldNow();
  assert.equal(finished, false);
  codec.encodeQueueSize = 5;
  await withGuard(waiting, 100);
  assert.equal(finished, true);
});

test('untilRoom stops waiting when the codec closes with a full queue', async () => {
  const codec = new FakeCodec({ encodeQueueSize: 50 });
  let finished = false;
  const waiting = ExportPace.untilRoom(codec, 6).then(() => { finished = true; });
  await ExportPace.yieldNow();
  assert.equal(finished, false);
  codec.state = 'closed';
  codec.dispatchEvent(new Event('dequeue'));
  await withGuard(waiting, 100);
  assert.equal(finished, true);
  assert.equal(codec.encodeQueueSize, 50);
});

test('title shows the percent while exporting and never reaches 100', () => {
  assert.equal(ExportPace.title('progress', 'Hymn Playlist', 0), '0% · Exporting · Hymn Playlist');
  assert.equal(ExportPace.title('progress', 'Hymn Playlist', 0.426), '42% · Exporting · Hymn Playlist');
  assert.equal(ExportPace.title('progress', 'Hymn Playlist', 1), '99% · Exporting · Hymn Playlist');
  assert.equal(ExportPace.title('progress', 'Hymn Playlist', -0.3), '0% · Exporting · Hymn Playlist');
});

test('title shows done and stopped, and the plain name otherwise', () => {
  assert.equal(ExportPace.title('done', 'Karaoke'), '✓ Export done · Karaoke');
  assert.equal(ExportPace.title('stopped', 'Karaoke'), '✕ Export stopped · Karaoke');
  assert.equal(ExportPace.title('something else', 'Karaoke'), 'Karaoke');
});

test('the export loops pause without timers', () => {
  const page = readPage();
  for (const header of ['  async function encodeAudioFile', '  async function encodeMedia']) {
    const source = functionSource(page, header);
    assert.ok(source.length > 200, header + ' was not cut out of the page');
    assert.ok(!source.includes('sleep('), header + ' still calls sleep(');
  }
});
