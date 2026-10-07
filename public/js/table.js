'use strict';

// Dibujo de un arreglo circular en sus dos modos y animación de giro.
// Compartido por la pantalla del anfitrión y la del jugador.
const Circulo = (() => {
  const PALETA = [
    { nombre: 'Ana', color: '#ff3355' },
    { nombre: 'Beto', color: '#ff9500' },
    { nombre: 'Carla', color: '#ffd60a' },
    { nombre: 'Dani', color: '#2fe06b' },
    { nombre: 'Elsa', color: '#00d5e6' },
    { nombre: 'Fede', color: '#3d7bff' },
    { nombre: 'Gabi', color: '#e23cf0' },
  ];
  const SEPARADOR = '#0e1230';
  const RADIO_ASIENTO = 37;
  // En personas la marca va sobre la mesa, para no tapar la inicial del asiento.
  const RADIO_MARCA = { colores: 47, personas: 16 };

  function punto(grados, radio) {
    const rad = (grados * Math.PI) / 180;
    return { left: `${50 + radio * Math.sin(rad)}%`, top: `${50 - radio * Math.cos(rad)}%` };
  }

  // Sectores de color con un separador fino; el sector 0 queda centrado arriba.
  function gradiente(arreglo) {
    const paso = 360 / arreglo.length;
    const hueco = 0.45;
    const tramos = arreglo.map((id, i) => {
      const ini = i * paso;
      const fin = ini + paso;
      const color = PALETA[id].color;
      return `${SEPARADOR} ${ini}deg ${ini + hueco}deg, ${color} ${ini + hueco}deg ${fin - hueco}deg, ${SEPARADOR} ${fin - hueco}deg ${fin}deg`;
    });
    return `radial-gradient(circle, rgba(255,255,255,.28) 0%, rgba(255,255,255,0) 70%), conic-gradient(from ${-paso / 2}deg, ${tramos.join(', ')})`;
  }

  // opciones: { modo: 'colores' | 'personas', inclinacion: fracción de sector }
  function crear(contenedor, arreglo, opciones) {
    const modo = opciones.modo === 'personas' ? 'personas' : 'colores';
    const paso = 360 / arreglo.length;
    const raiz = document.createElement('div');
    raiz.className = `circulo circulo--${modo}`;
    const giro = document.createElement('div');
    giro.className = 'circulo__giro';
    const letras = [];

    if (modo === 'colores') {
      giro.style.background = gradiente(arreglo);
    } else {
      arreglo.forEach((id, i) => {
        const asiento = document.createElement('div');
        asiento.className = 'circulo__asiento';
        Object.assign(asiento.style, punto(i * paso, RADIO_ASIENTO));
        asiento.style.background = PALETA[id].color;
        const letra = document.createElement('span');
        letra.className = 'circulo__letra';
        letra.textContent = PALETA[id].nombre[0];
        asiento.appendChild(letra);
        giro.appendChild(asiento);
        letras.push(letra);
      });
    }

    const marcas = document.createElement('div');
    marcas.className = 'circulo__marcas';
    raiz.append(giro, marcas);
    contenedor.replaceChildren(raiz);

    let angulo = modo === 'colores' ? (opciones.inclinacion || 0) * paso : 0;
    function aplicar(animado) {
      raiz.classList.toggle('circulo--animado', animado);
      giro.style.transform = `rotate(${angulo}deg)`;
      // Las iniciales giran en sentido contrario para seguir derechas.
      for (const letra of letras) letra.style.transform = `rotate(${-angulo}deg)`;
    }
    aplicar(false);

    return {
      inclinacion: angulo / paso,
      girar(grados) {
        angulo += grados;
        aplicar(true);
      },
      marcar(posiciones) {
        marcas.replaceChildren(
          ...posiciones.map((j) => {
            const marca = document.createElement('span');
            marca.className = 'circulo__marca';
            marca.textContent = '✕';
            Object.assign(marca.style, punto(j * paso, RADIO_MARCA[modo]));
            return marca;
          }),
        );
      },
      resaltar(clase) {
        raiz.classList.add(clase);
      },
    };
  }

  // Giro (en grados, por el camino corto) que lleva el elemento a[0] de B a la
  // posición 0, y las posiciones que aun así no coinciden con A.
  function alineacion(a, b, inclinacion) {
    const n = a.length;
    const paso = 360 / n;
    const i = b.indexOf(a[0]);
    let grados = -(i + inclinacion) * paso;
    grados = ((((grados + 180) % 360) + 360) % 360) - 180;
    const desajustes = [];
    for (let j = 0; j < n; j++) {
      if (a[j] !== b[(j + i) % n]) desajustes.push(j);
    }
    return { grados, desajustes };
  }

  // Gira B hasta alinearlo con A y luego muestra si coinciden.
  function revelar(circuloA, circuloB, a, b) {
    const { grados, desajustes } = alineacion(a, b, circuloB.inclinacion);
    setTimeout(() => circuloB.girar(grados), 350);
    setTimeout(() => {
      if (desajustes.length === 0) {
        circuloA.resaltar('circulo--igual');
        circuloB.resaltar('circulo--igual');
      } else {
        circuloA.marcar(desajustes);
        circuloB.marcar(desajustes);
      }
    }, 1900);
  }

  return { PALETA, crear, alineacion, revelar };
})();
