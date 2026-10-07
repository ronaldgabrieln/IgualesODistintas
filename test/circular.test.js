'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { rotate, reflect, canonical, sameCircular } = require('../src/circular');

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) =>
    permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((rest) => [x, ...rest]),
  );
}

test('rotate desplaza y acepta k negativo o mayor que n', () => {
  assert.deepEqual(rotate([1, 2, 3, 4], 1), [2, 3, 4, 1]);
  assert.deepEqual(rotate([1, 2, 3, 4], -1), [4, 1, 2, 3]);
  assert.deepEqual(rotate([1, 2, 3, 4], 5), [2, 3, 4, 1]);
});

test('canonical pone el menor primero', () => {
  assert.deepEqual(canonical([3, 0, 5, 2]), [0, 5, 2, 3]);
});

test('toda rotación es el mismo arreglo circular', () => {
  const a = [4, 1, 6, 0, 3];
  for (let k = 0; k < a.length; k++) assert.ok(sameCircular(a, rotate(a, k)));
});

test('intercambiar dos elementos da un arreglo distinto', () => {
  assert.equal(sameCircular([0, 1, 2, 3], [1, 0, 2, 3]), false);
  assert.equal(sameCircular([0, 1, 2, 3], [2, 1, 0, 3]), false);
});

test('el reflejo es distinto a partir de n = 3', () => {
  for (const a of [[0, 1, 2], [0, 1, 2, 3], [5, 2, 6, 1, 0, 3]]) {
    assert.equal(sameCircular(a, reflect(a)), false);
  }
});

test('longitudes distintas nunca coinciden', () => {
  assert.equal(sameCircular([0, 1, 2], [0, 1, 2, 3]), false);
});

test('hay (n-1)! arreglos circulares distintos', () => {
  const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
  for (let n = 3; n <= 6; n++) {
    const items = Array.from({ length: n }, (_, i) => i);
    const classes = new Set(permutations(items).map((p) => canonical(p).join(',')));
    assert.equal(classes.size, factorial(n - 1));
  }
});
