'use strict';

// Un arreglo circular se representa como una lista de enteros distintos,
// leída en sentido horario a partir de una posición cualquiera.

function rotate(arr, k) {
  const n = arr.length;
  const s = ((k % n) + n) % n;
  return arr.slice(s).concat(arr.slice(0, s));
}

// Mismo círculo recorrido en sentido contrario.
function reflect(arr) {
  return [arr[0], ...arr.slice(1).reverse()];
}

// Representante único de todas las rotaciones: el elemento menor va primero.
function canonical(arr) {
  if (arr.length === 0) return [];
  return rotate(arr, arr.indexOf(Math.min(...arr)));
}

function sameCircular(a, b) {
  if (a.length !== b.length) return false;
  const ca = canonical(a);
  const cb = canonical(b);
  return ca.every((v, i) => v === cb[i]);
}

module.exports = { rotate, reflect, canonical, sameCircular };
