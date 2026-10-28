import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './extract-module.mjs';

const A = loadModule('Anim');
const D = loadModule('AnimDraw');

function stubContext() {
  const log = { save: 0, restore: 0, alphas: [] };
  const target = { globalAlpha: 1 };
  const g = new Proxy(target, {
    get(obj, key) {
      if (key === 'save') return () => { log.save++; };
      if (key === 'restore') return () => { log.restore++; };
      if (key === 'measureText') return (text) => ({ width: String(text).length * 10 });
      if (key in obj) return obj[key];
      return () => {};
    },
    set(obj, key, value) {
      if (key === 'globalAlpha') log.alphas.push(value);
      obj[key] = value;
      return true;
    }
  });
  return { g, log };
}

const box = { x: 10, y: 20, w: 200, h: 150 };
const item = { start: 5, dur: 10, beats: [{ t: 1, d: 0.5 }, { t: 3, d: 0.2 }] };
const at = (t) => Object.assign(A.beatState(item, t), { t, start: item.start });
const STATES = { rest: at(5.5), holding: at(6.2), released: at(6.6), betweenBeats: at(7) };

describe('AnimDraw', () => {
  test('has a drawing for every kind and no others', () => {
    assert.deepEqual([...D.KIND_IDS].sort(), A.KINDS.map((k) => k.id).sort());
  });

  for (const kind of A.KINDS.map((k) => k.id)) {
    const styles = kind === 'arrow' ? A.ARROW_STYLES.map((s) => s.id) : [undefined];
    for (const style of styles) {
      for (const [name, state] of Object.entries(STATES)) {
        test(kind + (style ? ' ' + style : '') + ' draws when ' + name + ' and balances save/restore', () => {
          const { g, log } = stubContext();
          D.draw(g, kind, box, '#ffd54a', state, style);
          assert.ok(log.save > 0);
          assert.equal(log.save, log.restore);
          assert.ok(log.alphas.every((a) => Number.isFinite(a) && a >= 0 && a <= 1));
        });
      }
    }
  }

  test('an unknown kind draws nothing and still balances', () => {
    const { g, log } = stubContext();
    D.draw(g, 'juggle', box, '#ffd54a', STATES.rest);
    assert.equal(log.save, 1);
    assert.equal(log.restore, 1);
  });

  test('shade mixes toward black', () => {
    assert.equal(D.shade('#ffffff', 0.5), '#808080');
    assert.equal(D.shade('#ffd54a', 0), '#ffd54a');
  });
});
