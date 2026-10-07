'use strict';

const { shuffle } = require('./rounds');

const THEORY_TIME = 20;

// Afirmaciones de verdadero o falso; `same` es la respuesta (true = verdadero).
const QUESTIONS = [
  {
    text: 'El número de permutaciones circulares de n elementos es (n − 1)!',
    same: true,
    explain: 'Se fija un elemento y se permutan los otros n − 1.',
  },
  {
    text: '4 personas pueden sentarse alrededor de una mesa redonda de 24 maneras distintas.',
    same: false,
    explain: 'Son (4 − 1)! = 6. 24 serían las maneras de ordenarlas en fila.',
  },
  {
    text: '5 personas pueden sentarse alrededor de una mesa redonda de 24 maneras distintas.',
    same: true,
    explain: '(5 − 1)! = 4! = 24.',
  },
  {
    text: '6 personas pueden sentarse alrededor de una mesa redonda de 720 maneras distintas.',
    same: false,
    explain: 'Son (6 − 1)! = 120. 720 = 6! cuenta los órdenes en fila.',
  },
  {
    text: '3 personas solo pueden sentarse alrededor de una mesa redonda de 2 maneras distintas.',
    same: true,
    explain: '(3 − 1)! = 2: un orden y su sentido contrario.',
  },
  {
    text: 'Si todos en una mesa redonda se corren un lugar a la derecha, el arreglo circular cambia.',
    same: false,
    explain: 'Girar todo el arreglo no lo cambia: cada quien conserva a sus vecinos.',
  },
  {
    text: 'Cada arreglo circular de n elementos corresponde a n ordenamientos en fila.',
    same: true,
    explain: 'Se puede empezar a leer el círculo desde cualquiera de sus n elementos.',
  },
  {
    text: 'Con los mismos 5 elementos hay más permutaciones circulares que en fila.',
    same: false,
    explain: 'Hay menos: 4! = 24 circulares contra 5! = 120 en fila.',
  },
  {
    text: 'Sentar a 4 personas en el mismo orden pero en sentido contrario da el mismo arreglo circular.',
    same: false,
    explain: 'El reflejo cambia quién queda a la izquierda y a la derecha de cada persona.',
  },
  {
    text: 'En una permutación circular importa quién está al lado de quién, no en qué silla se sienta.',
    same: true,
    explain: 'Solo cuenta la posición relativa entre los elementos.',
  },
];

// Pocas: una pregunta de teoría por cada cinco rondas.
function theoryCount(rounds) {
  return Math.min(QUESTIONS.length, Math.round(rounds / 5));
}

// Reparte las preguntas a lo largo de la partida, nunca en la primera ronda.
// Devuelve un Map de índice de ronda a la ronda de teoría que la reemplaza.
function planTheory(rounds, rng = Math.random) {
  const count = theoryCount(rounds);
  const picked = shuffle(QUESTIONS, rng).slice(0, count);
  const plan = new Map();
  picked.forEach((q, k) => {
    const index = Math.floor(((k + 1) * rounds) / (count + 1));
    plan.set(index, { ...q, theory: true, kind: 'teoria', time: THEORY_TIME });
  });
  return plan;
}

module.exports = { QUESTIONS, THEORY_TIME, theoryCount, planTheory };
