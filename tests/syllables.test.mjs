import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

globalThis.TextLook = loadModule('TextLook');
const S = loadModule('Syllables');
globalThis.ColumnMoves = loadModule('ColumnMoves');
const L = loadModule('Lyrics');

function counter() {
  let n = 0;
  return () => 'w' + (++n);
}
const shown = (text) => L.parse(text, counter(), [], { same: true }).slides.map((slide) => L.display(slide, true)).join('\n\n');

describe('markWord: singing splits', () => {
  const table = [
    ['Gloria', 'Glo-ri-a'], ['about', 'a-bout'], ['alone', 'a-lone'], ['glory', 'glo-ry'], ['Father', 'Fa-ther'],
    ['Jesus', 'Je-sus'], ['agree', 'a-gree'], ['children', 'chil-dren'], ['hundred', 'hun-dred'], ['humble', 'hum-ble'],
    ['table', 'ta-ble'], ['sister', 'sis-ter'], ['happy', 'hap-py'], ['kingdom', 'king-dom'], ['angel', 'an-gel'],
    ['Hosanna', 'Ho-san-na'], ['Hallelujah', 'Hal-le-lu-jah'], ['excelsis', 'ex-cel-sis'], ['Deo', 'De-o'],
    ['glorious', 'glo-ri-ous'], ['nation', 'na-tion'], ['salvation', 'sal-va-tion'], ['precious', 'pre-cious'],
    ['singing', 'sing-ing'], ['praying', 'pray-ing'], ['loving', 'lov-ing'], ['lovingly', 'lov-ing-ly'],
    ['faithfulness', 'faith-ful-ness'], ['wonderful', 'won-der-ful'], ['beautiful', 'beau-ti-ful'], ['wanted', 'want-ed'],
    ['praises', 'prai-ses'], ['rejoice', 're-joice'], ['redeemer', 're-dee-mer'], ['awake', 'a-wake'], ['power', 'pow-er'],
    ['heavenly', 'heav-en-ly'], ['Savior', 'Sav-ior'], ['beyond', 'be-yond'], ['amazing', 'a-maz-ing'],
    ['exalt', 'ex-alt'], ['rocket', 'rock-et'], ['daughter', 'daugh-ter'], ['pilgrim', 'pil-grim'], ['temple', 'tem-ple'],
    ['sacred', 'sa-cred'], ['Zion', 'Zi-on'], ['dying', 'dy-ing'], ['going', 'go-ing'], ['flowers', 'flow-ers'], ['towards', 'to-wards'],
    ['temptation', 'temp-ta-tion'], ['Christmas', 'Christ-mas'], ['mountain', 'moun-tain'], ['remember', 're-mem-ber']
  ];
  for (const [word, expected] of table) {
    test(word + ' → ' + expected, () => assert.equal(S.markWord(word), expected));
  }
});

describe('markWord: one-syllable words stay whole', () => {
  for (const word of ['God', 'Lord', 'grace', 'loved', 'comes', 'king', 'bring', 'thing', 'fire', 'the', 'a', "Heav'n", "o'er", "pow'r", 'blessed', 'joy', 'day']) {
    test(word, () => assert.equal(S.markWord(word), word));
  }
});

describe('markWord: keeps capitals, punctuation and apostrophes', () => {
  test('trailing punctuation', () => assert.equal(S.markWord('Gloria!'), 'Glo-ri-a!'));
  test('leading quote and trailing comma', () => assert.equal(S.markWord('“Holy,'), '“Ho-ly,'));
  test('brackets', () => assert.equal(S.markWord('(glory)'), '(glo-ry)'));
  test('all capitals', () => assert.equal(S.markWord('GLORIA'), 'GLO-RI-A'));
  test('a dash never touches an apostrophe', () => {
    for (const word of ["wand'ring", "heav'nly", "o'erflowing", "ev’ry", "pray'rful"]) {
      const out = S.markWord(word);
      assert.ok(!/-['’]|['’]-/.test(out), word + ' → ' + out);
      assert.equal(out.split('-').join(''), word);
    }
  });
});

describe('markWord: tokens it leaves alone', () => {
  for (const token of ['Glo-ria', 'well--known', '-ing', 'pre-', '-', '123', '4th', '…', 'a&b']) {
    test(token, () => assert.equal(S.markWord(token), token));
  }
});

describe('splitWord', () => {
  test('pieces join back to the word', () => {
    assert.deepEqual(S.splitWord('Hallelujah'), ['Hal', 'le', 'lu', 'jah']);
    assert.deepEqual(S.splitWord('Lord'), ['Lord']);
  });
  test('exceptions keep their own splits', () => {
    for (const [word, marked] of Object.entries(S.EXCEPTIONS)) assert.equal(S.splitWord(word).join('-'), marked, word);
  });
});

describe('markText', () => {
  const song = '[Hallelujah]\r\nHigh: Glory to the Father\r\nTenor: Hosanna Low: singing\r\n\r\n= Gloria in excelsis\r\n=Holy holy';
  test('Mark all marks only words and keeps every line, tag and label', () => {
    const res = S.markText(song, 0, 0);
    assert.equal(res.text, '[Hallelujah]\r\nHigh: Glo-ry to the Fa-ther\r\nTenor: Ho-san-na Low: sing-ing\r\n\r\n= Glo-ri-a in ex-cel-sis\r\n=Ho-ly ho-ly');
    assert.equal(res.marked, 8);
  });
  test('a label line with a long word is skipped', () => {
    assert.equal(S.markText('[Hallelujah]', 0, 0).marked, 0);
  });
  test('a mid-line tag stays as written', () => {
    assert.equal(S.markText('Tenor: Hosanna Tenor: again', 0, 0).text, 'Tenor: Ho-san-na Tenor: a-gain');
  });
  test('= stays on a shared line', () => {
    assert.equal(S.markText('=Gloria', 0, 0).text, '=Glo-ri-a');
    assert.equal(S.markText('= Gloria', 0, 0).text, '= Glo-ri-a');
  });
  test('Unix and old Mac line ends are kept', () => {
    assert.equal(S.markText('Gloria\nHosanna\rGlory', 0, 0).text, 'Glo-ri-a\nHo-san-na\rGlo-ry');
  });
  test('a highlight inside one word marks that whole word only', () => {
    const text = 'Hosanna in excelsis', at = text.indexOf('san');
    const res = S.markText(text, at, at + 3);
    assert.equal(res.text, 'Ho-san-na in excelsis');
    assert.equal(res.marked, 1);
  });
  test('a highlight over two words marks both', () => {
    const text = 'Hosanna glory Gloria', from = text.indexOf('anna'), to = text.indexOf('ory') + 1;
    assert.equal(S.markText(text, from, to).text, 'Ho-san-na glo-ry Gloria');
  });
  test('a highlight over spaces only marks nothing', () => {
    const res = S.markText('Hosanna   glory', 8, 9);
    assert.deepEqual(res, { text: 'Hosanna   glory', marked: 0, from: null, to: null, replacement: null });
  });
  test('from, to and replacement rebuild the new text', () => {
    const text = 'Lord, Glory to God\n\nHosanna Lord';
    const res = S.markText(text, 0, 0);
    assert.equal(res.from, text.indexOf('Glory'));
    assert.equal(res.to, text.length - ' Lord'.length);
    assert.equal(text.slice(0, res.from) + res.replacement + text.slice(res.to), res.text);
  });
  test('marking its own result changes nothing', () => {
    const once = S.markText(song, 0, 0).text;
    assert.equal(S.markText(once, 0, 0).marked, 0);
  });
  test('words the user marked are left as they are', () => {
    assert.equal(S.markText('Glo-ria Hosanna well--known', 0, 0).text, 'Glo-ria Ho-san-na well--known');
  });
  test('empty and missing text', () => {
    assert.equal(S.markText('', 0, 0).marked, 0);
    assert.equal(S.markText(null, 0, 0).text, '');
  });
  test('column tags are left alone and plain words are still marked', () => {
    const out = S.markText('@Women\nGloria Women', 0, 0).text;
    assert.equal(out, '@Women\nGlo-ri-a Wo-men');
  });
});

describe('markText with Lyrics', () => {
  test('marks never change what shows on screen', () => {
    const text = "[Chorus]\nHigh: Glory, glory, hallelujah!\nLow: His truth is marching on\n\n= O'er the wand'ring children\nRejoice, rejoice, Emmanuel";
    const marked = S.markText(text, 0, 0).text;
    assert.notEqual(marked, text);
    assert.equal(shown(marked), shown(text));
  });
  test('marked words become syllables', () => {
    const slide = L.parse(S.markText('Gloria in excelsis Deo', 0, 0).text, counter(), []).slides[0];
    assert.deepEqual(slide.lines[0].words.map((w) => w.syls.map((s) => s.text)), [['Glo', 'ri', 'a'], ['in'], ['ex', 'cel', 'sis'], ['De', 'o']]);
  });
});
