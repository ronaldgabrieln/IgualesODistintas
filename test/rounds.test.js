'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sameCircular } = require('../src/circular');
const { LEVELS, PALETTE_SIZE, generateRound, levelForRound } = require('../src/rounds');

for (const name of Object.keys(LEVELS)) {
  test(`rondas de nivel ${name}: la etiqueta coincide con la comparación circular`, () => {
    const level = LEVELS[name];
    let iguales = 0;
    for (let i = 0; i < 3000; i++) {
      const r = generateRound(name);
      assert.ok(level.sizes.includes(r.a.length));
      assert.equal(new Set(r.a).size, r.a.length);
      assert.ok(r.a.every((id) => id >= 0 && id < PALETTE_SIZE));
      assert.deepEqual([...r.b].sort(), [...r.a].sort());
      assert.equal(sameCircular(r.a, r.b), r.same);
      assert.equal(r.kind === 'rotacion', r.same);
      // Una ronda "igual" nunca muestra el círculo sin girar.
      if (r.same) assert.notDeepEqual(r.a, r.b);
      if (!level.reflect) assert.notEqual(r.kind, 'reflejo');
      if (!level.tilt) assert.equal(r.tilt, 0);
      if (r.same) iguales += 1;
    }
    assert.ok(iguales > 1200 && iguales < 1800);
  });
}

test('la dificultad progresiva sube por tercios', () => {
  const levels = Array.from({ length: 9 }, (_, i) => levelForRound('progresiva', i, 9));
  assert.deepEqual(levels, [
    'facil', 'facil', 'facil', 'medio', 'medio', 'medio', 'dificil', 'dificil', 'dificil',
  ]);
  assert.equal(levelForRound('medio', 0, 10), 'medio');
});
