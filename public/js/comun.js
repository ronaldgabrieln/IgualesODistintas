'use strict';

const Util = {
  esc(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  },

  // El almacenamiento puede fallar en modo privado; el juego sigue sin él.
  leer(clave) {
    try {
      return JSON.parse(localStorage.getItem(clave));
    } catch {
      return null;
    }
  },

  guardar(clave, valor) {
    try {
      if (valor === null) localStorage.removeItem(clave);
      else localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento no hay reconexión automática, nada más.
    }
  },

  // Textos de las dos respuestas: [verdadera, falsa].
  opciones(teoria) {
    return teoria ? ['Verdadero', 'Falso'] : ['Iguales', 'Distintas'];
  },

  explicacion(same, kind) {
    if (same) return 'El círculo 2 es el círculo 1 girado.';
    if (kind === 'reflejo') return 'Es el reflejo: mismo orden, pero en sentido contrario.';
    return 'Dos lugares están intercambiados.';
  },

  // Cuenta regresiva local a partir del tiempo restante que informa el servidor.
  temporizador(alTic) {
    let fin = 0;
    let duracion = 1;
    setInterval(() => {
      if (!fin) return;
      const restante = Math.max(0, fin - performance.now());
      alTic(restante, restante / duracion);
    }, 100);
    return {
      iniciar(restanteMs, duracionMs) {
        fin = performance.now() + restanteMs;
        duracion = duracionMs;
      },
      detener() {
        fin = 0;
      },
    };
  },
};
