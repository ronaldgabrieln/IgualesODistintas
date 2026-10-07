'use strict';

const crypto = require('node:crypto');
const { generateRound, levelForRound, DIFFICULTIES } = require('./rounds');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 4;
const MAX_PLAYERS = 60;
const MAX_NAME = 16;
const MODES = ['colores', 'personas'];
const ROUND_OPTIONS = [5, 10, 15];
const BASE_POINTS = 500;
const SPEED_POINTS = 500;
const STREAK_MIN = 3;
const STREAK_BONUS = 100;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

class Room {
  constructor(code, onUpdate) {
    this.code = code;
    this.onUpdate = onUpdate || (() => {});
    this.hostId = crypto.randomUUID();
    this.hostSocketId = null;
    this.phase = 'lobby';
    this.config = { rounds: 10, difficulty: 'progresiva', mode: 'colores' };
    this.players = new Map();
    this.roundIndex = -1;
    this.round = null;
    this.counts = null;
    this.timer = null;
    this.lastActivity = Date.now();
  }

  // scope: undefined = todos; { host, playerId } = solo esos destinatarios.
  changed(scope) {
    this.lastActivity = Date.now();
    this.onUpdate(this, scope);
  }

  setConfig(partial) {
    if (this.phase !== 'lobby' || !partial) return;
    if (ROUND_OPTIONS.includes(partial.rounds)) this.config.rounds = partial.rounds;
    if (DIFFICULTIES.includes(partial.difficulty)) this.config.difficulty = partial.difficulty;
    if (MODES.includes(partial.mode)) this.config.mode = partial.mode;
    this.changed();
  }

  join(rawName, playerId, socketId) {
    const known = typeof playerId === 'string' ? this.players.get(playerId) : null;
    if (known) {
      known.socketId = socketId;
      known.connected = true;
      return { ok: true, code: this.code, playerId: known.id, name: known.name };
    }

    const name = String(rawName || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
    if (!name) return { ok: false, error: 'Escribe tu nombre.' };
    if (this.players.size >= MAX_PLAYERS) return { ok: false, error: 'La sala está llena.' };
    const lower = name.toLowerCase();
    for (const p of this.players.values()) {
      if (p.name.toLowerCase() === lower) {
        return { ok: false, error: 'Ese nombre ya está en uso. Prueba con otro.' };
      }
    }

    const player = {
      id: crypto.randomUUID(),
      name,
      socketId,
      connected: true,
      score: 0,
      streak: 0,
      answer: null,
      answerMs: 0,
      last: null,
    };
    this.players.set(player.id, player);
    return { ok: true, code: this.code, playerId: player.id, name };
  }

  disconnect(playerId, socketId) {
    const player = this.players.get(playerId);
    if (!player || player.socketId !== socketId) return;
    player.connected = false;
    player.socketId = null;
    this.changed({ host: true });
    this.revealIfAllAnswered();
  }

  start() {
    if (this.phase !== 'lobby' || this.players.size === 0) return;
    for (const p of this.players.values()) {
      p.score = 0;
      p.streak = 0;
    }
    this.roundIndex = -1;
    this.beginRound();
  }

  beginRound() {
    this.roundIndex += 1;
    const level = levelForRound(this.config.difficulty, this.roundIndex, this.config.rounds);
    const now = Date.now();
    const round = generateRound(level);
    this.round = { ...round, startedAt: now, endsAt: now + round.time * 1000 };
    this.counts = null;
    for (const p of this.players.values()) {
      p.answer = null;
      p.answerMs = 0;
      p.last = null;
    }
    this.phase = 'question';
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reveal(), round.time * 1000);
    this.changed();
  }

  answer(playerId, same) {
    if (this.phase !== 'question' || typeof same !== 'boolean') return;
    const player = this.players.get(playerId);
    const now = Date.now();
    if (!player || player.answer !== null || now > this.round.endsAt) return;
    player.answer = same;
    player.answerMs = now - this.round.startedAt;
    this.changed({ host: true, playerId });
    this.revealIfAllAnswered();
  }

  revealIfAllAnswered() {
    if (this.phase !== 'question') return;
    const active = [...this.players.values()].filter((p) => p.connected);
    if (active.length > 0 && active.every((p) => p.answer !== null)) this.reveal();
  }

  reveal() {
    if (this.phase !== 'question') return;
    clearTimeout(this.timer);
    const duration = this.round.time * 1000;
    const counts = { iguales: 0, distintas: 0, nada: 0 };
    for (const p of this.players.values()) {
      const answered = p.answer !== null;
      const correct = answered && p.answer === this.round.same;
      let gained = 0;
      if (correct) {
        const speed = Math.max(0, 1 - p.answerMs / duration);
        p.streak += 1;
        gained = BASE_POINTS + Math.round(SPEED_POINTS * speed);
        if (p.streak >= STREAK_MIN) gained += STREAK_BONUS;
      } else {
        p.streak = 0;
      }
      p.score += gained;
      p.last = { answered, correct, gained };
      if (!answered) counts.nada += 1;
      else if (p.answer) counts.iguales += 1;
      else counts.distintas += 1;
    }
    this.counts = counts;
    this.phase = 'reveal';
    this.changed();
  }

  next() {
    if (this.phase !== 'reveal') return;
    if (this.roundIndex + 1 >= this.config.rounds) {
      this.phase = 'final';
      this.round = null;
      this.changed();
    } else {
      this.beginRound();
    }
  }

  backToLobby() {
    clearTimeout(this.timer);
    for (const p of this.players.values()) {
      p.score = 0;
      p.streak = 0;
      p.answer = null;
      p.last = null;
    }
    this.phase = 'lobby';
    this.roundIndex = -1;
    this.round = null;
    this.counts = null;
    this.changed();
  }

  destroy() {
    clearTimeout(this.timer);
  }

  ranking() {
    return [...this.players.values()].sort(
      (x, y) => y.score - x.score || x.name.localeCompare(y.name, 'es'),
    );
  }

  // La respuesta correcta no viaja en esta vista: solo lo necesario para dibujar.
  roundView() {
    if (!this.round) return null;
    return {
      a: this.round.a,
      b: this.round.b,
      tilt: this.round.tilt,
      duration: this.round.time * 1000,
      remainingMs: Math.max(0, this.round.endsAt - Date.now()),
    };
  }

  revealView() {
    if (this.phase !== 'reveal') return null;
    return { same: this.round.same, kind: this.round.kind, counts: this.counts };
  }

  hostView() {
    const players = this.ranking();
    return {
      role: 'host',
      code: this.code,
      phase: this.phase,
      config: this.config,
      players: players.map((p) => ({ name: p.name, score: p.score, connected: p.connected })),
      roundIndex: this.roundIndex,
      totalRounds: this.config.rounds,
      round: this.roundView(),
      answered: players.filter((p) => p.answer !== null).length,
      active: players.filter((p) => p.connected).length,
      reveal: this.revealView(),
    };
  }

  playerView(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;
    const ranking = this.ranking();
    const reveal = this.revealView();
    return {
      role: 'player',
      code: this.code,
      phase: this.phase,
      mode: this.config.mode,
      name: player.name,
      score: player.score,
      rank: 1 + ranking.filter((p) => p.score > player.score).length,
      playerCount: ranking.length,
      roundIndex: this.roundIndex,
      totalRounds: this.config.rounds,
      round: this.roundView(),
      answer: player.answer,
      result: reveal && player.last
        ? { ...player.last, same: reveal.same, kind: reveal.kind, streak: player.streak }
        : null,
      podium: this.phase === 'final'
        ? ranking.slice(0, 3).map((p) => ({ name: p.name, score: p.score }))
        : null,
    };
  }
}

class RoomManager {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.rooms = new Map();
  }

  create() {
    let code;
    do {
      code = Array.from(
        { length: CODE_LENGTH },
        () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)],
      ).join('');
    } while (this.rooms.has(code));
    const room = new Room(code, this.onUpdate);
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || '').trim().toUpperCase()) || null;
  }

  sweep(now = Date.now()) {
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > ROOM_TTL_MS) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
  }
}

module.exports = { Room, RoomManager, MAX_PLAYERS, MODES, ROUND_OPTIONS };
