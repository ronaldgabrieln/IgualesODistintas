'use strict';

(() => {
  const CLAVE_SESION = 'iod-jugador';
  const { esc } = Util;
  const app = document.getElementById('app');
  const socket = io();
  const salaUrl = (new URLSearchParams(location.search).get('sala') || '').toUpperCase();

  let sesion = Util.leer(CLAVE_SESION);
  // Un QR de otra sala manda sobre la sesión guardada.
  if (sesion && salaUrl && sesion.code !== salaUrl) sesion = null;

  let estado = null;
  let pantalla = null;
  let faseRonda = null;
  let circulos = null;

  const reloj = Util.temporizador((restante, fraccion) => {
    const barra = document.getElementById('tiempo-barra');
    if (barra) barra.style.width = `${fraccion * 100}%`;
  });

  function unirse(datos) {
    socket.emit('player:join', datos, (r) => {
      if (r.ok) {
        sesion = { code: r.code, name: r.name, playerId: r.playerId };
        Util.guardar(CLAVE_SESION, sesion);
      } else {
        const previo = sesion;
        sesion = null;
        Util.guardar(CLAVE_SESION, null);
        // Si falló una reconexión automática, la sala ya no existe: formulario limpio.
        formulario(previo ? '' : r.error, datos);
      }
    });
  }

  function formulario(error, previo) {
    estado = null;
    pantalla = 'formulario';
    reloj.detener();
    app.innerHTML = `
      <form class="tarjeta entrada" id="entrada">
        <h1>¿Iguales o distintas?</h1>
        <p class="tenue">Permutación circular</p>
        <label>Código de sala
          <input id="codigo" maxlength="4" autocomplete="off" autocapitalize="characters"
                 placeholder="ABCD" value="${esc((previo && previo.code) || salaUrl)}" required>
        </label>
        <label>Tu nombre
          <input id="nombre" maxlength="16" autocomplete="off" placeholder="Nombre"
                 value="${esc((previo && previo.name) || '')}" required>
        </label>
        ${error ? `<p class="error">${esc(error)}</p>` : ''}
        <button class="boton boton--principal" type="submit">Entrar</button>
      </form>`;
    const codigo = document.getElementById('codigo');
    (codigo.value ? document.getElementById('nombre') : codigo).focus();
  }

  app.addEventListener('submit', (e) => {
    e.preventDefault();
    unirse({
      code: document.getElementById('codigo').value.trim().toUpperCase(),
      name: document.getElementById('nombre').value,
    });
  });

  app.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    if (boton.dataset.accion === 'responder' && estado && estado.answer === null) {
      estado.answer = boton.dataset.valor === '1';
      socket.emit('player:answer', { same: estado.answer });
      pintarPie();
    } else if (boton.dataset.accion === 'salir') {
      Util.guardar(CLAVE_SESION, null);
      location.href = '/';
    }
  });

  socket.on('connect', () => {
    if (sesion) unirse(sesion);
    else if (pantalla !== 'formulario') formulario('');
  });

  socket.on('state', (nuevo) => {
    if (!nuevo) return;
    estado = nuevo;
    pintar();
  });

  function pintar() {
    const s = estado;
    const destino = s.phase === 'lobby' || s.phase === 'final' ? s.phase : `ronda${s.roundIndex}`;
    if (destino !== pantalla) {
      pantalla = destino;
      faseRonda = null;
      if (s.phase === 'lobby') pintarEspera();
      else if (s.phase === 'final') pintarFinal();
      else construirRonda();
    }
    if (s.phase === 'question' || s.phase === 'reveal') actualizarRonda();
  }

  function pintarEspera() {
    reloj.detener();
    app.innerHTML = `
      <section class="tarjeta centro">
        <p class="tenue">Sala ${esc(estado.code)}</p>
        <h1>¡Listo, ${esc(estado.name)}!</h1>
        <p>Mira la pantalla del frente. La partida empieza pronto.</p>
        <p class="pista">Dos círculos son <strong>iguales</strong> si uno se obtiene girando el otro.</p>
        <button class="enlace" data-accion="salir">Salir de la sala</button>
      </section>`;
  }

  function construirRonda() {
    const s = estado;
    app.innerHTML = `
      <header class="barra">
        <span>Ronda ${s.roundIndex + 1} / ${s.totalRounds}</span>
        <span id="puntos"></span>
      </header>
      <div class="tiempo"><div id="tiempo-barra"></div></div>
      ${s.round.theory ? `<p class="enunciado tarjeta">${esc(s.round.text)}</p>` : `
      <div class="duelo">
        <figure><div id="c1"></div><figcaption>1</figcaption></figure>
        <figure><div id="c2"></div><figcaption>2</figcaption></figure>
      </div>`}
      <div id="pie"></div>`;
    circulos = s.round.theory ? null : [
      Circulo.crear(document.getElementById('c1'), s.round.a, { modo: s.mode }),
      Circulo.crear(document.getElementById('c2'), s.round.b, {
        modo: s.mode,
        inclinacion: s.round.tilt,
      }),
    ];
  }

  function actualizarRonda() {
    const s = estado;
    document.getElementById('puntos').textContent = `${s.score} pts`;
    if (s.phase === faseRonda) return;
    faseRonda = s.phase;
    if (s.phase === 'question') {
      reloj.iniciar(s.round.remainingMs, s.round.duration);
    } else {
      reloj.detener();
      document.getElementById('tiempo-barra').style.width = '0%';
      if (circulos) Circulo.revelar(circulos[0], circulos[1], s.round.a, s.round.b);
    }
    pintarPie();
  }

  function pintarPie() {
    const s = estado;
    const pie = document.getElementById('pie');
    if (!pie) return;
    const teoria = s.round.theory;
    const [si, no] = Util.opciones(teoria);

    if (s.phase === 'question') {
      const elegido = s.answer;
      const clase = (valor) => (elegido === valor ? ' elegido' : '');
      pie.innerHTML = `
        <div class="respuestas">
          <button class="respuesta respuesta--iguales${clase(true)}" data-accion="responder"
                  data-valor="1" ${elegido !== null ? 'disabled' : ''}><span>${teoria ? '✓' : '='}</span>${si}</button>
          <button class="respuesta respuesta--distintas${clase(false)}" data-accion="responder"
                  data-valor="0" ${elegido !== null ? 'disabled' : ''}><span>${teoria ? '✗' : '≠'}</span>${no}</button>
        </div>
        <p class="tenue centro">${elegido !== null ? 'Respuesta enviada. Mira la pantalla.' : teoria ? '¿La afirmación es verdadera?' : '¿Son el mismo arreglo girado?'}</p>`;
      return;
    }

    const r = s.result;
    if (!r) {
      pie.innerHTML = '<p class="tenue centro">Entraste a mitad de ronda. Juegas en la siguiente.</p>';
      return;
    }
    const titulo = r.correct ? '¡Correcto!' : r.answered ? 'Incorrecto' : 'Sin respuesta';
    pie.innerHTML = `
      <section class="resultado ${r.correct ? 'resultado--bien' : 'resultado--mal'}">
        <h2>${titulo}</h2>
        <p class="ganado">+${r.gained}</p>
        <p>${teoria ? 'Era' : 'Eran'} <strong>${teoria ? (r.same ? 'verdadero' : 'falso') : (r.same ? 'iguales' : 'distintas')}</strong>. ${esc(r.explain || Util.explicacion(r.same, r.kind))}</p>
        ${r.streak >= 3 ? `<p class="racha">Racha de ${r.streak}: +100</p>` : ''}
        <p class="tenue">Vas en el puesto ${s.rank} de ${s.playerCount}</p>
      </section>`;
  }

  function pintarFinal() {
    const s = estado;
    reloj.detener();
    const podio = (s.podium || [])
      .map((p, i) => `<li><span>${i + 1}.º ${esc(p.name)}</span><span>${p.score}</span></li>`)
      .join('');
    app.innerHTML = `
      <section class="tarjeta centro">
        <p class="tenue">Fin de la partida</p>
        <h1>Puesto ${s.rank} de ${s.playerCount}</h1>
        <p class="ganado">${s.score} pts</p>
        <ol class="lista">${podio}</ol>
        <p class="tenue">Espera a que el anfitrión inicie otra partida.</p>
      </section>`;
  }

  if (sesion) app.innerHTML = '<p class="aviso">Reconectando…</p>';
  else formulario('');
})();
