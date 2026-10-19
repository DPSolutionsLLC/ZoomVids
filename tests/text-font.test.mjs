import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const TextFont = loadModule('TextFont');

const openSans = { id: 'g:Open Sans', family: 'Open Sans', styles: { b: true, i: true, bi: true } };
const boldOnly = { id: 'g:Oswald', family: 'Oswald', styles: { b: true, i: false, bi: false } };

describe('upgrade', () => {
  test('Clean bold becomes Clean with Bold', () => {
    const tx = TextFont.upgrade({ font: 'bold' });
    assert.deepEqual(tx, { font: 'sans', bold: true });
  });

  test('Classic italic becomes Classic with Italic', () => {
    const tx = TextFont.upgrade({ font: 'italic' });
    assert.deepEqual(tx, { font: 'serif', italic: true });
  });

  test('Clean and Classic stay as they are with no style flags', () => {
    assert.deepEqual(TextFont.upgrade({ font: 'sans' }), { font: 'sans' });
    assert.deepEqual(TextFont.upgrade({ font: 'serif' }), { font: 'serif' });
  });

  test('a missing font becomes Clean', () => {
    assert.equal(TextFont.upgrade({}).font, 'sans');
    assert.equal(TextFont.upgrade({ font: 7 }).font, 'sans');
  });

  test('false style flags are removed', () => {
    const tx = TextFont.upgrade({ font: 'lora', bold: false, italic: false });
    assert.equal('bold' in tx, false);
    assert.equal('italic' in tx, false);
  });
});

describe('cssFont keeps the old look', () => {
  test('Clean draws Figtree at weight 500', () => {
    assert.equal(TextFont.cssFont({ font: 'sans' }, 64), '500 64px "Figtree", "Segoe UI", system-ui, sans-serif');
  });

  test('Clean bold draws Figtree at weight 700', () => {
    assert.ok(TextFont.cssFont({ font: 'sans', bold: true }, 64).startsWith('700 64px "Figtree"'));
  });

  test('Classic draws Libre Caslon with a serif fallback', () => {
    assert.equal(TextFont.cssFont({ font: 'serif' }, 64), '400 64px "Libre Caslon Text", Georgia, serif');
  });

  test('Classic italic draws italic Libre Caslon', () => {
    assert.ok(TextFont.cssFont({ font: 'serif', italic: true }, 64).startsWith('italic 400 64px "Libre Caslon Text"'));
  });

  test('old values that were never upgraded draw the same as upgraded ones', () => {
    assert.equal(TextFont.cssFont({ font: 'bold' }, 50), TextFont.cssFont({ font: 'sans', bold: true }, 50));
    assert.equal(TextFont.cssFont({ font: 'italic' }, 50), TextFont.cssFont({ font: 'serif', italic: true }, 50));
  });

  test('an added font uses its own family', () => {
    assert.equal(TextFont.cssFont({ font: 'g:Open Sans', italic: true }, 30, [openSans]), 'italic 400 30px "Open Sans", "Segoe UI", system-ui, sans-serif');
  });
});

describe('resolve and fitStyle', () => {
  test('Libre Caslon has no bold italic, so italic is dropped', () => {
    const caslon = TextFont.find('serif');
    assert.deepEqual(TextFont.fitStyle(caslon, true, true), { bold: true, italic: false, dropped: 'italic' });
  });

  test('an added font without italic drops italic', () => {
    const rf = TextFont.resolve({ font: 'g:Oswald', italic: true }, [boldOnly]);
    assert.equal(rf.entry.family, 'Oswald');
    assert.equal(rf.italic, false);
  });

  test('a font with only regular drops both', () => {
    const plain = { styles: { b: false, i: false, bi: false } };
    assert.deepEqual(TextFont.fitStyle(plain, true, true), { bold: false, italic: false, dropped: 'both' });
  });

  test('an unknown font shows in Clean and is marked missing', () => {
    const rf = TextFont.resolve({ font: 'g:Gone Font', bold: true });
    assert.equal(rf.entry.id, 'sans');
    assert.equal(rf.missing, true);
    assert.equal(rf.bold, true);
  });

  test('an added font is found only when it is passed in', () => {
    assert.equal(TextFont.resolve({ font: 'g:Open Sans' }, [openSans]).missing, false);
    assert.equal(TextFont.resolve({ font: 'g:Open Sans' }, []).missing, true);
  });
});

describe('can', () => {
  test('regular is always available', () => {
    assert.equal(TextFont.can({ styles: { b: false, i: false, bi: false } }, false, false), true);
  });

  test('Libre Caslon has bold and italic but not both', () => {
    const caslon = TextFont.find('serif');
    assert.equal(TextFont.can(caslon, true, false), true);
    assert.equal(TextFont.can(caslon, false, true), true);
    assert.equal(TextFont.can(caslon, true, true), false);
  });

  test('there are eight built-in fonts and Clean and Classic keep their ids', () => {
    assert.equal(TextFont.BUILT_IN.length, 8);
    assert.equal(TextFont.find('sans').family, 'Figtree');
    assert.equal(TextFont.find('serif').family, 'Libre Caslon Text');
  });
});

describe('clean', () => {
  test('bad input gives an empty list', () => {
    assert.deepEqual(TextFont.clean(null), { v: 1, items: [] });
    assert.deepEqual(TextFont.clean({ items: 'x' }), { v: 1, items: [] });
  });

  test('drops items with no family, duplicates and built-in families', () => {
    const out = TextFont.clean({ items: [{ family: '' }, { family: 'Open Sans' }, { family: 'open sans' }, { family: 'lora' }, null] });
    assert.deepEqual(out.items.map((it) => it.family), ['Open Sans']);
  });

  test('gives each font an id and boolean styles', () => {
    const out = TextFont.clean({ items: [{ family: '  Open   Sans ', styles: { b: 1, i: 0 } }] });
    assert.deepEqual(out.items[0], { id: 'g:Open Sans', family: 'Open Sans', styles: { b: true, i: false, bi: false } });
  });
});

describe('nameCandidates', () => {
  test('tries the name as typed, then with capitals', () => {
    assert.deepEqual(TextFont.nameCandidates('  open   sans '), ['open sans', 'Open Sans']);
  });

  test('a name that is already capitalised is tried once', () => {
    assert.deepEqual(TextFont.nameCandidates('EB Garamond'), ['EB Garamond']);
  });

  test('a pasted Google Fonts link gives the font name', () => {
    assert.deepEqual(TextFont.nameCandidates('https://fonts.google.com/specimen/Open+Sans?query=x'), ['Open Sans']);
  });

  test('nothing typed gives nothing to try', () => {
    assert.deepEqual(TextFont.nameCandidates(''), []);
    assert.deepEqual(TextFont.nameCandidates('   '), []);
  });
});

describe('probeUrl and cssUrl', () => {
  test('spaces become plus signs', () => {
    assert.equal(TextFont.probeUrl('Open Sans'), 'https://fonts.googleapis.com/css2?family=Open+Sans');
    assert.equal(TextFont.probeUrl('Open Sans', '1,700'), 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@1,700');
  });

  test('lists only the styles a font has, in order', () => {
    const url = TextFont.cssUrl(TextFont.entries([boldOnly]).filter((e) => e.added));
    assert.equal(url, 'https://fonts.googleapis.com/css2?family=Oswald:ital,wght@0,400;0,700&display=swap');
  });

  test('joins several fonts', () => {
    const url = TextFont.cssUrl(TextFont.entries([openSans, boldOnly]).filter((e) => e.added));
    assert.equal(url, 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Oswald:ital,wght@0,400;0,700&display=swap');
  });

  test('no fonts gives no address', () => {
    assert.equal(TextFont.cssUrl([]), null);
  });
});

describe('duplicateOf', () => {
  test('finds a built-in whatever the capitals', () => {
    assert.equal(TextFont.duplicateOf('MONTSERRAT').id, 'montserrat');
  });

  test('finds an added font', () => {
    assert.equal(TextFont.duplicateOf('open sans', [openSans]).id, 'g:Open Sans');
  });

  test('an unknown name is not a duplicate', () => {
    assert.equal(TextFont.duplicateOf('Roboto', [openSans]), null);
  });
});

describe('usage and replaceFont', () => {
  const texts = [
    { id: 'a', font: 'g:Open Sans', bold: true, italic: true },
    { id: 'b', font: 'lora' },
    { id: 'c', font: 'g:Open Sans' },
    { id: 'd', font: 'bold' }
  ];

  test('counts only texts using that font', () => {
    assert.equal(TextFont.usage(texts, 'g:Open Sans'), 2);
    assert.equal(TextFont.usage(texts, 'sans'), 1);
    assert.equal(TextFont.usage(texts, 'g:Nothing'), 0);
  });

  test('switches those texts to Clean and keeps bold and italic', () => {
    const res = TextFont.replaceFont(texts, 'g:Open Sans');
    assert.equal(res.changed, 2);
    assert.deepEqual(res.texts[0], { id: 'a', font: 'sans', bold: true, italic: true });
    assert.equal(res.texts[2].font, 'sans');
    assert.equal(res.texts[1], texts[1]);
  });

  test('leaves the input unchanged', () => {
    const before = JSON.parse(JSON.stringify(texts));
    TextFont.replaceFont(texts, 'g:Open Sans');
    assert.deepEqual(texts, before);
  });
});

describe('faces', () => {
  test('skips hidden texts, collapses repeats and uses one size', () => {
    const list = TextFont.faces([
      { font: 'lora', size: 72 },
      { font: 'lora', size: 30 },
      { font: 'serif', hidden: true },
      { font: 'sans', bold: true }
    ]);
    assert.deepEqual(list, ['400 40px "Lora", Georgia, serif', '700 40px "Figtree", "Segoe UI", system-ui, sans-serif']);
  });
});
