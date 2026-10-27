import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
const L = loadModule('Lyrics');
const R = loadModule('RollView');

function counter(prefix = 'w') {
  let n = 0;
  return () => prefix + (++n);
}
const word = (id, ...syls) => ({ id, syls: syls.map((text, i) => ({ id: id + 's' + i, text })) });
const line = (id, text, same) => {
  const out = { words: text.split(' ').map((w, i) => word(id + i, ...w.split('-'))) };
  if (same) out.same = true;
  return out;
};
const verse = (id, ...lines) => ({ id, lines });

describe('cleanSong with two columns', () => {
  const full = () => ({
    view: 'roll',
    columns: true,
    roll: { heading: 'Men' },
    second: {
      verses: [verse('v1', line('a', 'Glo-ri-a', true), line('b', 'Peace on earth'))],
      heading: 'Women',
      frame: { x: 0.5, y: 0.2, w: 0.4, h: 0.6 },
      size: 80,
      solo: { x: 0.06, y: 0.52, w: 0.88, h: 0.42 },
      parked: { texts: [{ id: 't1', lyric: { lines: [line('c', 'Sing')], col: 2 } }], groups: [{ id: 'g1', name: 'Lines' }] }
    }
  });
  test('every new field survives a round trip', () => {
    const once = L.cleanSong(full());
    assert.equal(once.columns, true);
    assert.equal(once.roll.heading, 'Men');
    assert.equal(once.second.heading, 'Women');
    assert.deepEqual(once.second.frame, { x: 0.5, y: 0.2, w: 0.4, h: 0.6 });
    assert.equal(once.second.size, 80);
    assert.deepEqual(once.second.solo, { x: 0.06, y: 0.52, w: 0.88, h: 0.42 });
    assert.equal(once.second.verses[0].lines[0].same, true);
    assert.equal(once.second.verses[0].lines[1].same, undefined);
    assert.equal(once.second.parked.texts[0].lyric.col, 2);
    assert.deepEqual(once.second.parked.groups, [{ id: 'g1', name: 'Lines' }]);
    assert.deepEqual(L.cleanSong(once), once);
  });
  test('columns is turned off when the view is slides', () => {
    const out = L.cleanSong(Object.assign(full(), { view: 'slides' }));
    assert.equal(out.columns, undefined);
    assert.ok(out.second, 'column 2 is kept while columns are off');
  });
  test('a song without columns gets no new keys', () => {
    const out = L.cleanSong({ view: 'roll' });
    assert.equal('columns' in out, false);
    assert.equal('second' in out, false);
    assert.equal('heading' in out.roll, false);
  });
  test('an empty or blank heading becomes null, never an empty string', () => {
    assert.equal(L.cleanHeading(''), null);
    assert.equal(L.cleanHeading('   '), null);
    assert.equal(L.cleanHeading(5), null);
    assert.equal(L.cleanSecond({ heading: '  ' }).heading, null);
    assert.equal('heading' in L.cleanSong({ view: 'roll', roll: { heading: '' } }).roll, false);
  });
  test('a heading over 40 characters is cut', () => {
    assert.equal(L.cleanHeading('x'.repeat(50)), 'x'.repeat(40));
    assert.equal(L.cleanHeading('  Men  '), 'Men');
  });
  test('size is clamped to 24 to 180 and defaults to the roll size', () => {
    assert.equal(L.cleanSecond({ size: 5 }).size, 24);
    assert.equal(L.cleanSecond({ size: 999 }).size, 180);
    assert.equal(L.cleanSecond({}).size, L.ROLL_SIZE);
  });
  test('a bad frame falls back to the column 2 default, not the roll default', () => {
    assert.deepEqual(L.cleanSecond({ frame: { x: 'a' } }).frame, L.COL2_FRAME);
    assert.deepEqual(L.cleanSecond({}).frame, L.COL2_FRAME);
  });
  test('a bad solo frame is dropped', () => {
    assert.equal('solo' in L.cleanSecond({ solo: { x: 1 } }), false);
  });
  test('cleanSecond refuses anything that is not an object', () => {
    assert.equal(L.cleanSecond(null), null);
    assert.equal(L.cleanSecond([]), null);
    assert.equal(L.cleanSecond('x'), null);
  });
});

describe('cleanSlide column mark', () => {
  const lyric = (col) => ({ lines: [line('a', 'Sing')], col });
  test('keeps col 2 and drops anything else', () => {
    assert.equal(L.cleanSlide(lyric(2)).col, 2);
    [1, '2', 3, undefined].forEach((col) => assert.equal('col' in L.cleanSlide(lyric(col)), false, String(col)));
  });
});

describe('parking', () => {
  test('the slides/roll parking never holds column 2 blocks', () => {
    const out = L.cleanSong({
      view: 'slides',
      parked: { view: 'roll', texts: [{ id: 'a', lyric: { lines: [line('a', 'One')] } }, { id: 'b', lyric: { lines: [line('b', 'Two')], col: 2 } }], groups: [] }
    });
    assert.deepEqual(out.parked.texts.map((t) => t.id), ['a']);
  });
  test('column 2 parking drops texts without col 2', () => {
    const out = L.cleanSecond({ parked: { texts: [{ id: 'a', lyric: { lines: [line('a', 'One')] } }, { id: 'b', lyric: { lines: [line('b', 'Two')], col: 2 } }] } });
    assert.deepEqual(out.parked.texts.map((t) => t.id), ['b']);
  });
  test('column 2 parking with nothing left is left out', () => {
    assert.equal('parked' in L.cleanSecond({ parked: { texts: [{ id: 'a', lyric: { lines: [line('a', 'One')] } }] } }), false);
  });
});

describe('cleanRecord and the same mark', () => {
  const rec = () => [verse('v', line('a', 'Glo-ri-a', true))];
  test('drops same without opts', () => {
    assert.equal('same' in L.cleanRecord(rec()).verses[0].lines[0], false);
  });
  test('keeps same with opts.same', () => {
    assert.equal(L.cleanRecord(rec(), { same: true }).verses[0].lines[0].same, true);
  });
});

describe('parse with the = mark', () => {
  const parse = (text, opts) => L.parse(text, counter(), [], opts);
  test('= with a space and = touching the word both mark the line', () => {
    ['= Glo-ri-a', '=Glo-ri-a'].forEach((text) => {
      const out = parse(text, { same: true });
      const ln = out.slides[0].lines[0];
      assert.equal(ln.same, true, text);
      assert.equal(ln.words.length, 1, text);
      assert.equal(L.wordText(ln.words[0]), 'Gloria', text);
      assert.equal(ln.words[0].syls.length, 3, text);
    });
  });
  test('a part tag after = still works', () => {
    const out = L.parse('= High: Sing', counter(), ['High'], { same: true });
    const ln = out.slides[0].lines[0];
    assert.equal(ln.same, true);
    assert.equal(ln.words[0].part, 'High');
  });
  test('without opts = stays a word, as before', () => {
    const ln = parse('= Glo-ri-a').slides[0].lines[0];
    assert.equal('same' in ln, false);
    assert.deepEqual(ln.words.map(L.wordText), ['=', 'Gloria']);
  });
  test('a line of only = is skipped', () => {
    assert.equal(parse('=\nSing', { same: true }).slides[0].lines.length, 1);
  });
});

describe('markup and recordText with the = mark', () => {
  test('a same line prints with = and applyText keeps same and the word ids', () => {
    const verses = [verse('v1', line('a', 'Glo-ri-a', true), line('b', 'Peace'))];
    const text = L.recordText(verses);
    assert.equal(text, '= Glo-ri-a\nPeace');
    const out = L.applyText(verses, text, counter('n'), [], { same: true });
    assert.equal(out.verses[0].lines[0].same, true);
    assert.equal('same' in out.verses[0].lines[1], false);
    assert.equal(out.verses[0].lines[0].words[0].id, 'a0');
    assert.equal(out.verses[0].lines[1].words[0].id, 'b0');
  });
  test('removing the = mark drops same', () => {
    const verses = [verse('v1', line('a', 'Glo-ri-a', true))];
    const out = L.applyText(verses, 'Glo-ri-a', counter('n'), [], { same: true });
    assert.equal('same' in out.verses[0].lines[0], false);
  });
  test('column 1 output is unchanged', () => {
    const verses = [Object.assign(verse('v1', line('a', 'A-maz-ing grace'), line('b', 'how sweet')), { label: 'Chorus' }), verse('v2', line('c', 'well--known'))];
    assert.equal(L.recordText(verses), '[Chorus]\nA-maz-ing grace\nhow sweet\n\nwell--known');
  });
});

describe('lineKey', () => {
  test('ignores case, punctuation and syllable marks', () => {
    assert.equal(L.lineKey(line('a', 'Glo-ri-a, in   ex-cel-sis!')), 'gloria in excelsis');
    assert.equal(L.lineKey(line('a', 'Ça-va Été')), 'çava été');
  });
});

describe('sharedLinks', () => {
  const one = [verse('v1', line('a', 'Glo-ri-a'), line('b', 'Peace on earth'), line('c', 'Glo-ri-a')), verse('v2', line('d', 'Good will'))];
  test('links in order', () => {
    const two = [verse('w', line('x', 'Peace on earth', true), line('y', 'Good will', true))];
    assert.deepEqual(L.sharedLinks(one, two), { links: [{ col2: 0, col1: 1 }, { col2: 1, col1: 3 }], unmatched: [] });
  });
  test('a repeated chorus links to successive copies', () => {
    const two = [verse('w', line('x', 'Glo-ri-a', true), line('y', 'Hi'), line('z', 'Glo-ri-a', true))];
    assert.deepEqual(L.sharedLinks(one, two).links, [{ col2: 0, col1: 0 }, { col2: 2, col1: 2 }]);
  });
  test('matching ignores case, punctuation and syllable marks', () => {
    const two = [verse('w', line('x', 'PEACE, on ea-rth!', true))];
    assert.deepEqual(L.sharedLinks(one, two).links, [{ col2: 0, col1: 1 }]);
  });
  test('an unmatched = line goes to unmatched', () => {
    const two = [verse('w', line('x', 'Hosanna', true))];
    assert.deepEqual(L.sharedLinks(one, two), { links: [], unmatched: [0] });
  });
  test('lines without = are never linked', () => {
    const two = [verse('w', line('x', 'Glo-ri-a'))];
    assert.deepEqual(L.sharedLinks(one, two), { links: [], unmatched: [] });
  });
  test('wraps back to an earlier unused line', () => {
    const two = [verse('w', line('x', 'Good will', true), line('y', 'Peace on earth', true))];
    assert.deepEqual(L.sharedLinks(one, two).links, [{ col2: 0, col1: 3 }, { col2: 1, col1: 1 }]);
  });
  test('a line already linked is not linked twice', () => {
    const two = [verse('w', line('x', 'Good will', true), line('y', 'Good will', true))];
    assert.deepEqual(L.sharedLinks(one, two), { links: [{ col2: 0, col1: 3 }], unmatched: [1] });
  });
});

const row = (start, end, more = {}) => Object.assign({ start, end, h: 1, verse: 'v', verseStart: false }, more);
const restOpts = { gap: 5, approach: 3 };

describe('withRests', () => {
  test('no rest when the gap is under the break value', () => {
    const lines = [row(0, 4), row(8, 10)];
    assert.deepEqual(R.withRests(lines, null, restOpts), lines);
  });
  test('a rest runs from sung to the next start minus the approach', () => {
    const out = R.withRests([row(0, 4, { sung: 3 }), row(12, 15)], null, restOpts);
    assert.deepEqual(out[1], { rest: true, start: 3, end: 9, h: 1, verse: 'v', verseStart: false });
    assert.equal(out.length, 3);
  });
  test('without sung the rest starts at the line end', () => {
    const out = R.withRests([row(0, 4), row(12, 15)], null, restOpts);
    assert.equal(out[1].start, 4);
  });
  test('no rest when it would be shorter than 1 s', () => {
    assert.equal(R.withRests([row(0, 4), row(7.5, 9)], null, { gap: 3, approach: 3 }).length, 2);
  });
  test('a leading rest from the panel start takes over the verse start', () => {
    const out = R.withRests([row(10, 12, { verseStart: true }), row(12, 14)], 0, restOpts);
    assert.deepEqual(out[0], { rest: true, start: 0, end: 7, h: 1, verse: 'v', verseStart: true });
    assert.equal(out[1].verseStart, false);
  });
  test('no leading rest without a panel start', () => {
    assert.equal(R.withRests([row(10, 12)], null, restOpts).length, 1);
  });
  test('the input is not changed', () => {
    const lines = [row(10, 12, { verseStart: true }), row(20, 22)];
    const before = JSON.stringify(lines);
    R.withRests(lines, 0, restOpts);
    assert.equal(JSON.stringify(lines), before);
  });
});

describe('view with rests', () => {
  const opts = { above: 1, below: 2, move: 'stay', motion: 'smooth', verses: 'none', approach: 3 };
  const lines = () => R.withRests([row(0, 4, { sung: 3 }), row(12, 15), row(15, 17)], null, restOpts);
  const at = (t, list = lines(), o = opts) => Object.fromEntries(R.view(list, t, o).shown.map((s) => [s.index, s]));
  test('during the rest the rest is current and the next line is unlit', () => {
    const v = at(5);
    assert.equal(v[1].state, 'current');
    assert.equal(v[2].state, 'upcoming');
    assert.equal(v[2].y, 2);
  });
  test('halfway through the 3 s glide the next line is between its two places', () => {
    const v = at(10.5);
    assert.equal(v[2].state, 'next');
    assert.ok(Math.abs(v[2].y - 1.5) < 1e-9, String(v[2].y));
  });
  test('the glide is slower than the normal scroll at the same moment', () => {
    const glide = at(9.2)[2].y;
    assert.ok(Math.abs(glide - (2 - R.ease(0.2 / 3))) < 1e-9, String(glide));
    const normal = R.view([row(0, 4), row(4, 8), row(8, 12)], 4.2, opts).shown.find((s) => s.index === 1).y;
    assert.ok(Math.abs(normal - (2 - R.ease(0.5))) < 1e-9, String(normal));
    assert.notEqual(R.ease(0.2 / 3), R.ease(0.2 / R.SCROLL));
  });
  test('at the next start the next line is in the current spot', () => {
    const v = at(12);
    assert.equal(v[2].state, 'current');
    assert.equal(v[2].y, 1);
  });
  test('with approach set but no rests the output is unchanged', () => {
    const plain = [row(0, 4), row(4, 8, { sung: 7 }), row(9, 12), row(20, 22)];
    const without = { above: 1, below: 2, move: 'stay', motion: 'smooth', verses: 'mark' };
    [0.1, 4.2, 8.1, 9.3, 12.2, 20.1].forEach((t) => {
      assert.deepEqual(R.view(plain, t, Object.assign({ approach: 3 }, without)), R.view(plain, t, without), 'at ' + t);
    });
  });
});

describe('restAlpha and restDots', () => {
  const rest = { rest: true, start: 2, end: 6 };
  test('full while the rest runs, then fades over REST_FADE', () => {
    assert.equal(R.restAlpha(rest, 1.9), 0);
    assert.equal(R.restAlpha(rest, 2), 1);
    assert.equal(R.restAlpha(rest, 5.9), 1);
    assert.ok(Math.abs(R.restAlpha(rest, 6 + R.REST_FADE / 2) - 0.5) < 1e-9);
    assert.equal(R.restAlpha(rest, 6 + R.REST_FADE), 0);
  });
  test('dots at fixed times', () => {
    assert.deepEqual(R.restDots(0), [0.675, 0.42, 0.358]);
    assert.deepEqual(R.restDots(0.3), [1, 0.877, 0.601]);
  });
  test('dot alphas stay within 0.35 and 1', () => {
    for (let t = 0; t < 5; t += 0.05) R.restDots(t).forEach((a) => assert.ok(a >= 0.35 && a <= 1, t + ': ' + a));
  });
});
