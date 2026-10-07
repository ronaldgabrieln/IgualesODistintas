'use strict';

// Simula una clase completa contra un servidor en marcha:
//   node scripts/carga.js [url] [jugadores]
const { io } = require('socket.io-client');

const URL = process.argv[2] || 'http://localhost:3000';
const JUGADORES = Number(process.argv[3]) || 40;
const RONDAS = 5;

function conectar() {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { transports: ['websocket'], forceNew: true });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

async function main() {
  const anfitrion = await conectar();
  const sala = await new Promise((r) => anfitrion.emit('host:join', {}, r));
  console.log(`Sala ${sala.code} creada`);

  let rondasVistas = 0;
  let filtraciones = 0;
  const fin = new Promise((resolve) => {
    let fase = null;
    anfitrion.on('state', (s) => {
      if (s.phase === fase && s.phase !== 'question') return;
      const cambio = s.phase !== fase;
      fase = s.phase;
      if (s.phase === 'question' && cambio) rondasVistas += 1;
      if (s.phase === 'reveal') {
        const c = s.reveal.counts;
        console.log(
          `Ronda ${s.roundIndex + 1}: ${s.reveal.same ? 'iguales' : 'distintas'} (${s.reveal.kind}) ` +
          `-> ${c.iguales} iguales, ${c.distintas} distintas, ${c.nada} sin respuesta`,
        );
        anfitrion.emit('host:next');
      }
      if (s.phase === 'final') resolve(s);
    });
  });

  const jugadores = await Promise.all(
    Array.from({ length: JUGADORES }, async (_, i) => {
      const socket = await conectar();
      let respondida = -1;
      socket.on('state', (s) => {
        if (s.phase === 'question' && s.result) filtraciones += 1;
        if (s.phase === 'question' && respondida !== s.roundIndex) {
          respondida = s.roundIndex;
          setTimeout(
            () => socket.emit('player:answer', { same: Math.random() < 0.5 }),
            200 + Math.random() * 1500,
          );
        }
      });
      const r = await new Promise((res) => {
        socket.emit('player:join', { code: sala.code, name: `Jugador ${i + 1}` }, res);
      });
      if (!r.ok) throw new Error(`No pudo unirse: ${r.error}`);
      return socket;
    }),
  );
  console.log(`${jugadores.length} jugadores unidos`);

  const inicio = Date.now();
  anfitrion.emit('host:config', { rounds: RONDAS });
  anfitrion.emit('host:start');
  const final = await fin;

  console.log(`Partida completa en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
  console.log('Podio:', final.players.slice(0, 3).map((p) => `${p.name} (${p.score})`).join(', '));

  const errores = [];
  if (rondasVistas !== RONDAS) errores.push(`se esperaban ${RONDAS} rondas, hubo ${rondasVistas}`);
  if (final.players.length !== JUGADORES) errores.push(`faltan jugadores: ${final.players.length}`);
  if (filtraciones) errores.push(`el resultado se filtró antes de revelar ${filtraciones} veces`);
  if (!final.players.some((p) => p.score > 0)) errores.push('nadie puntuó');

  for (const s of [anfitrion, ...jugadores]) s.close();
  if (errores.length) {
    console.error('FALLÓ:', errores.join('; '));
    process.exit(1);
  }
  console.log('OK');
}

main().catch((err) => {
  console.error('FALLÓ:', err.message);
  process.exit(1);
});
