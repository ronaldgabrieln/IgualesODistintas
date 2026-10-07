'use strict';

const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const { RoomManager } = require('./src/rooms');

const PORT = process.env.PORT || 3000;

const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);
const io = new Server(server);

const rooms = new RoomManager(send);
setInterval(() => rooms.sweep(), 60 * 1000).unref();

function send(room, scope) {
  if ((!scope || scope.host) && room.hostSocketId) {
    io.to(room.hostSocketId).emit('state', room.hostView());
  }
  for (const player of room.players.values()) {
    if (!player.socketId) continue;
    if (scope && scope.playerId !== player.id) continue;
    io.to(player.socketId).emit('state', room.playerView(player.id));
  }
}

function reply(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function hostRoom(socket) {
  if (socket.data.role !== 'host') return null;
  const room = rooms.get(socket.data.code);
  return room && room.hostSocketId === socket.id ? room : null;
}

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('/healthz', (req, res) => res.send('ok'));

app.get('/qr/:code', async (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).send('Sala no encontrada');
  const url = `${req.protocol}://${req.get('host')}/?sala=${room.code}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1 });
  res.type('image/svg+xml').send(svg);
});

io.on('connection', (socket) => {
  socket.on('host:join', (data, ack) => {
    const d = data || {};
    let room = rooms.get(d.code);
    if (!room || room.hostId !== d.hostId) room = rooms.create();
    room.hostSocketId = socket.id;
    socket.data = { role: 'host', code: room.code };
    reply(ack, { code: room.code, hostId: room.hostId });
    room.changed({ host: true });
  });

  socket.on('host:config', (partial) => hostRoom(socket)?.setConfig(partial));
  socket.on('host:start', () => hostRoom(socket)?.start());
  socket.on('host:reveal', () => hostRoom(socket)?.reveal());
  socket.on('host:next', () => hostRoom(socket)?.next());
  socket.on('host:lobby', () => hostRoom(socket)?.backToLobby());

  socket.on('player:join', (data, ack) => {
    const d = data || {};
    const room = rooms.get(d.code);
    if (!room) return reply(ack, { ok: false, error: 'No existe una sala con ese código.' });
    const result = room.join(d.name, d.playerId, socket.id);
    if (result.ok) socket.data = { role: 'player', code: room.code, playerId: result.playerId };
    reply(ack, result);
    if (result.ok) room.changed();
  });

  socket.on('player:answer', (data) => {
    if (socket.data.role !== 'player') return;
    rooms.get(socket.data.code)?.answer(socket.data.playerId, data && data.same);
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.code);
    if (!room) return;
    if (socket.data.role === 'player') room.disconnect(socket.data.playerId, socket.id);
    else if (room.hostSocketId === socket.id) room.hostSocketId = null;
  });
});

server.listen(PORT, () => {
  console.log(`Anfitrión: http://localhost:${PORT}/host`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`En la red local: http://${net.address}:${PORT}/host`);
      }
    }
  }
});
