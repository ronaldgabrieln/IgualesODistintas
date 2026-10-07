'use strict';

const { rotate, reflect, sameCircular } = require('./circular');

// Cantidad de colores/personas disponibles en la paleta del cliente.
const PALETTE_SIZE = 7;

const LEVELS = {
  facil: { sizes: [4], time: 20, reflect: false, tilt: false },
  medio: { sizes: [5, 6], time: 15, reflect: false, tilt: true },
  dificil: { sizes: [6, 7], time: 12, reflect: true, tilt: true },
};

const DIFFICULTIES = ['progresiva', 'facil', 'medio', 'dificil'];

function randInt(rng, max) {
  return Math.floor(rng() * max);
}

function shuffle(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// En modo progresivo la partida se divide en tercios: fácil, medio, difícil.
function levelForRound(difficulty, index, total) {
  if (LEVELS[difficulty]) return difficulty;
  const third = (index * 3) / total;
  if (third < 1) return 'facil';
  if (third < 2) return 'medio';
  return 'dificil';
}

function generateRound(levelName, rng = Math.random) {
  const level = LEVELS[levelName] || LEVELS.facil;
  const n = level.sizes[randInt(rng, level.sizes.length)];
  const ids = Array.from({ length: PALETTE_SIZE }, (_, i) => i);
  const a = shuffle(ids, rng).slice(0, n);
  const same = rng() < 0.5;

  let b;
  let kind;
  if (same) {
    kind = 'rotacion';
    b = rotate(a, 1 + randInt(rng, n - 1));
  } else {
    kind = level.reflect && rng() < 0.5 ? 'reflejo' : 'intercambio';
    do {
      let base;
      if (kind === 'reflejo') {
        base = reflect(a);
      } else {
        base = a.slice();
        const i = randInt(rng, n);
        const j = (i + 1 + randInt(rng, n - 1)) % n;
        [base[i], base[j]] = [base[j], base[i]];
      }
      b = rotate(base, randInt(rng, n));
    } while (sameCircular(a, b));
  }

  return {
    a,
    b,
    same,
    kind,
    level: levelName,
    time: level.time,
    // Fracción de sector que el segundo círculo aparece girado (solo modo colores).
    tilt: level.tilt && rng() < 0.5 ? 0.5 : 0,
  };
}

module.exports = { LEVELS, DIFFICULTIES, PALETTE_SIZE, shuffle, levelForRound, generateRound };
