'use strict';

(() => {
  const CLAVE_SESION = 'iod-anfitrion';
  const { esc } = Util;
  const app = document.getElementById('app');
  const socket = io();

  const OPCIONES = {
    rounds: [[5, '5'], [10, '10'], [15, '15']],
    difficulty: [
      ['progresiva', 'Progresiva'], ['facil', 'Fácil'], ['medio', 'Medio'], ['dificil', 'Difícil'],
    ],
    theory: [[false, 'No'], [true, 'Sí']],
  };
  const MUESTRA = [0, 3, 5, 1, 6];

  let estado = null;
  let pantalla = null;
  let faseRonda = null;
  let circulos = null;

  const reloj = Util.temporizador((restante, fraccion) => {
    const numero = document.getElementById('tiempo-num');
    const barra = document.getElementById('tiempo-barra');
    if (numero) numero.textContent = Math.ceil(restante / 1000);
    if (barra) barra.style.width = `${fraccion * 100}%`;
  });

  socket.on('connect', () => {
    socket.emit('host:join', Util.leer(CLAVE_SESION) || {}, (r) => Util.guardar(CLAVE_SESION, r));
  });

  socket.on('state', (nuevo) => {
    estado = nuevo;
    pintar();
  });

  app.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const { accion, campo, valor } = boton.dataset;
    if (accion === 'config') {
      const convertir = { rounds: Number, theory: (v) => v === 'true' };
      socket.emit('host:config', { [campo]: convertir[campo] ? convertir[campo](valor) : valor });
    } else if (accion === 'nueva') {
      Util.guardar(CLAVE_SESION, null);
      location.reload();
    } else {
      socket.emit(`host:${accion}`);
    }
  });

  function pintar() {
    const s = estado;
    const destino = s.phase === 'lobby' || s.phase === 'final' ? s.phase : `ronda${s.roundIndex}`;
    if (destino !== pantalla) {
      pantalla = destino;
      faseRonda = null;
      if (s.phase === 'lobby') construirLobby();
      else if (s.phase === 'final') pintarFinal();
      else construirRonda();
    }
    if (s.phase === 'lobby') actualizarLobby();
    else if (s.phase !== 'final') actualizarRonda();
  }

  function segmentos(campo) {
    return OPCIONES[campo]
      .map(([valor, texto]) => (
        `<button data-accion="config" data-campo="${campo}" data-valor="${valor}">${texto}</button>`
      ))
      .join('');
  }

  function construirLobby() {
    reloj.detener();
    const s = estado;
    app.innerHTML = `
    <p>Proyecto por elina elena y ronald</p>
      <section class="lobby">
        <div class="lobby__unirse tarjeta">
          <p class="tenue">Entra desde tu teléfono en</p>
          <p class="direccion">${esc(location.host)}</p>
          <p class="tenue">con el código</p>
          <p class="codigo">${esc(s.code)}</p>
          <img class="qr" src="/qr/${esc(s.code)}" alt="Código QR para unirse a la sala">
        </div>
        <div class="lobby__ajustes">
          <h1>¿Iguales o distintas?</h1>
          <div class="ajuste"><h2>Rondas</h2><div class="segmentos">${segmentos('rounds')}</div></div>
          <div class="ajuste"><h2>Dificultad</h2><div class="segmentos">${segmentos('difficulty')}</div></div>
          <div class="ajuste">
            <h2>Cómo se ven los círculos</h2>
            <div class="modos">
              <button class="modo" data-accion="config" data-campo="mode" data-valor="colores">
                <div id="muestra-colores"></div><span>Colores</span>
              </button>
              <button class="modo" data-accion="config" data-campo="mode" data-valor="personas">
                <div id="muestra-personas"></div><span>Personas</span>
              </button>
            </div>
          </div>
          <div class="ajuste">
            <h2>Preguntas de teoría (unas pocas, de verdadero o falso)</h2>
            <div class="segmentos">${segmentos('theory')}</div>
          </div>
          <h2 id="cuenta"></h2>
          <div class="jugadores" id="jugadores"></div>
          <div class="acciones">
            <button class="boton boton--principal" id="empezar" data-accion="start">Empezar</button>
            <button class="enlace" data-accion="nueva">Crear sala nueva</button>
          </div>
        </div>
      </section>`;
    Circulo.crear(document.getElementById('muestra-colores'), MUESTRA, { modo: 'colores' });
    Circulo.crear(document.getElementById('muestra-personas'), MUESTRA, { modo: 'personas' });
  }

  function actualizarLobby() {
    const s = estado;
    for (const boton of app.querySelectorAll('[data-accion="config"]')) {
      const actual = String(s.config[boton.dataset.campo]) === boton.dataset.valor;
      boton.classList.toggle('activo', actual);
      boton.setAttribute('aria-pressed', actual);
    }
    document.getElementById('cuenta').textContent =
      s.players.length === 1 ? '1 jugador' : `${s.players.length} jugadores`;
    document.getElementById('jugadores').innerHTML = s.players.length
      ? s.players
        .map((p) => `<span class="ficha${p.connected ? '' : ' ficha--ausente'}">${esc(p.name)}</span>`)
        .join('')
      : '<span class="tenue">Esperando jugadores…</span>';
    document.getElementById('empezar').disabled = s.players.length === 0;
  }

  function construirRonda() {
    const s = estado;
    app.innerHTML = `
      <header class="barra">
        <span>Ronda ${s.roundIndex + 1} / ${s.totalRounds}</span>
        <span>Sala ${esc(s.code)}</span>
      </header>
      <div class="tiempo"><div id="tiempo-barra"></div></div>
      <section class="ronda">
        ${s.round.theory ? `<p class="enunciado tarjeta">${esc(s.round.text)}</p>` : `
        <div class="duelo">
          <figure><div id="c1"></div><figcaption>1</figcaption></figure>
          <figure><div id="c2"></div><figcaption>2</figcaption></figure>
        </div>`}
        <div class="ronda__panel" id="panel"></div>
      </section>`;
    circulos = s.round.theory ? null : [
      Circulo.crear(document.getElementById('c1'), s.round.a, { modo: s.config.mode }),
      Circulo.crear(document.getElementById('c2'), s.round.b, {
        modo: s.config.mode,
        inclinacion: s.round.tilt,
      }),
    ];
  }

  function actualizarRonda() {
    const s = estado;
    if (s.phase !== faseRonda) {
      faseRonda = s.phase;
      if (s.phase === 'question') {
        reloj.iniciar(s.round.remainingMs, s.round.duration);
        document.getElementById('panel').innerHTML = `
          <h1>${s.round.theory ? '¿Verdadero o falso?' : '¿Iguales o distintas?'}</h1>
          <p class="tiempo-num" id="tiempo-num"></p>
          <p class="tenue" id="respondieron"></p>
          <button class="boton" data-accion="reveal">Revelar ya</button>`;
      } else {
        reloj.detener();
        document.getElementById('tiempo-barra').style.width = '0%';
        if (circulos) Circulo.revelar(circulos[0], circulos[1], s.round.a, s.round.b);
        pintarRevelacion();
      }
    }
    if (s.phase === 'question') {
      document.getElementById('respondieron').textContent =
        `${s.answered} de ${s.active} respondieron`;
    }
  }

  function barra(texto, cantidad, total, correcta) {
    const ancho = total ? (cantidad / total) * 100 : 0;
    return `
      <div class="conteo${correcta ? ' conteo--correcta' : ''}">
        <span>${texto}${correcta ? ' ✓' : ''}</span>
        <div class="conteo__pista"><div style="width:${ancho}%"></div></div>
        <span>${cantidad}</span>
      </div>`;
  }

  function pintarRevelacion() {
    const s = estado;
    const { same, kind, explain, counts } = s.reveal;
    const [si, no] = Util.opciones(s.round.theory);
    const total = counts.iguales + counts.distintas + counts.nada;
    const ultima = s.roundIndex + 1 >= s.totalRounds;
    const lideres = s.players
      .slice(0, 5)
      .map((p, i) => `<li><span>${i + 1}.º ${esc(p.name)}</span><span>${p.score}</span></li>`)
      .join('');
    document.getElementById('panel').innerHTML = `
      <h1 class="veredicto">${same ? si : no}</h1>
      <p>${esc(explain || Util.explicacion(same, kind))}</p>
      <div class="conteos">
        ${barra(si, counts.iguales, total, same)}
        ${barra(no, counts.distintas, total, !same)}
        ${barra('Sin respuesta', counts.nada, total, false)}
      </div>
      <ol class="lista">${lideres}</ol>
      <button class="boton boton--principal" data-accion="next">
        ${ultima ? 'Ver resultados' : 'Siguiente ronda'}
      </button>`;
  }

  function pintarFinal() {
    reloj.detener();
    const s = estado;
    const [primero, segundo, tercero] = s.players;
    const escalon = (p, puesto) => (p ? `
      <div class="escalon escalon--${puesto}">
        <span class="escalon__nombre">${esc(p.name)}</span>
        <span class="escalon__puntos">${p.score}</span>
        <div class="escalon__base">${puesto}</div>
      </div>` : '');
    const resto = s.players
      .slice(3)
      .map((p, i) => `<li><span>${i + 4}.º ${esc(p.name)}</span><span>${p.score}</span></li>`)
      .join('');
    app.innerHTML = `
      <section class="final">
        <h1>Resultados</h1>
        <div class="podio">${escalon(segundo, 2)}${escalon(primero, 1)}${escalon(tercero, 3)}</div>
        ${resto ? `<ol class="lista lista--columnas">${resto}</ol>` : ''}
        <button class="boton boton--principal" data-accion="lobby">Jugar otra vez</button>
        <p class="referencia tenue">Referencia: Rosen, K. H. (2004). <em>Matemática discreta y sus
          aplicaciones</em> (5.ª ed.). McGraw-Hill. Cap. 4, «Combinatoria» (permutaciones y
          principio de multiplicación).</p>
      </section>`;
  }
})();
