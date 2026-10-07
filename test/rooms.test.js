'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('../src/rooms');

function setup(t) {
  const manager = new RoomManager(() => {});
  const room = manager.create();
  t.after(() => room.destroy());
  return room;
}

test('rechaza nombres vacíos y duplicados, y reconecta por playerId', (t) => {
  const room = setup(t);
  const ana = room.join('  Ana  ', null, 's1');
  assert.equal(ana.ok, true);
  assert.equal(ana.name, 'Ana');
  assert.equal(room.join('', null, 's2').ok, false);
  assert.equal(room.join('ana', null, 's2').ok, false);

  const again = room.join('Otro nombre', ana.playerId, 's3');
  assert.equal(again.ok, true);
  assert.equal(again.name, 'Ana');
  assert.equal(room.players.size, 1);
});

test('puntúa aciertos, ignora respuestas repetidas y revela cuando todos responden', (t) => {
  const room = setup(t);
  const ana = room.join('Ana', null, 's1').playerId;
  const luis = room.join('Luis', null, 's2').playerId;
  room.start();
  assert.equal(room.phase, 'question');
  assert.equal(room.hostView().reveal, null);
  assert.equal(room.playerView(ana).result, null);

  const correct = room.round.same;
  room.answer(ana, correct);
  room.answer(ana, !correct);
  assert.equal(room.phase, 'question');
  room.answer(luis, !correct);
  assert.equal(room.phase, 'reveal');

  const scoreAna = room.players.get(ana).score;
  assert.ok(scoreAna >= 500 && scoreAna <= 1000);
  assert.equal(room.players.get(luis).score, 0);
  assert.equal(room.playerView(ana).rank, 1);
  assert.equal(room.playerView(luis).rank, 2);
  assert.equal(room.playerView(ana).result.correct, true);
});

test('la partida termina tras el número de rondas configurado y vuelve al lobby', (t) => {
  const room = setup(t);
  const ana = room.join('Ana', null, 's1').playerId;
  room.setConfig({ rounds: 5, mode: 'personas', difficulty: 'nope' });
  assert.deepEqual(room.config, {
    rounds: 5, difficulty: 'progresiva', mode: 'personas', theory: false,
  });

  room.start();
  for (let i = 0; i < 5; i++) {
    assert.equal(room.phase, 'question');
    room.answer(ana, room.round.same);
    room.next();
  }
  assert.equal(room.phase, 'final');
  // Racha de 5: las rondas 3, 4 y 5 llevan bono.
  assert.ok(room.players.get(ana).score >= 5 * 500 + 3 * 100);

  room.backToLobby();
  assert.equal(room.phase, 'lobby');
  assert.equal(room.players.get(ana).score, 0);
});

test('con teoría activada, unas pocas rondas son de verdadero o falso', (t) => {
  const room = setup(t);
  const ana = room.join('Ana', null, 's1').playerId;
  room.setConfig({ rounds: 10, theory: true });
  room.start();

  const textos = new Set();
  for (let i = 0; i < 10; i++) {
    const view = room.playerView(ana).round;
    if (view.theory) {
      assert.ok(i > 0);
      assert.equal(view.a, undefined);
      textos.add(view.text);
    } else {
      assert.equal(view.a.length, view.b.length);
    }
    room.answer(ana, room.round.same);
    if (view.theory) assert.ok(room.playerView(ana).result.explain);
    room.next();
  }
  assert.equal(textos.size, 2);
  assert.equal(room.phase, 'final');
  assert.ok(room.players.get(ana).score >= 10 * 500);
});
