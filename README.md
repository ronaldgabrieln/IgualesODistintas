# ¿Iguales o distintas?

Juego multijugador de aula sobre permutación circular. El docente proyecta la pantalla del anfitrión y los alumnos juegan desde el navegador de su teléfono: en cada ronda aparecen dos círculos y hay que decidir rápido si son el mismo arreglo girado o no.

## Cómo jugar

1. Abre `/host` en la computadora conectada al proyector. Se crea una sala con un código de 4 letras y un QR.
2. Los alumnos escanean el QR, o entran a la dirección que se muestra y escriben el código y su nombre.
3. Elige el número de rondas, la dificultad y cómo se ven los círculos:
   - **Colores**: un anillo dividido en sectores de colores.
   - **Personas**: una mesa redonda con asientos e iniciales.
4. Opcional: activa **Preguntas de teoría** para que unas pocas rondas (1, 2 o 3 según el total) sean afirmaciones de verdadero o falso sobre permutación circular.
5. Pulsa **Empezar**. Cada ronda termina cuando todos responden o se acaba el tiempo; después el círculo 2 gira hasta alinearse con el 1 y se ve si coinciden.

Puntuación: 500 puntos por acertar, hasta 500 más por rapidez y 100 extra desde el tercer acierto seguido.

Dificultad:

| Nivel | Elementos | Tiempo | Trampas |
|-------|-----------|--------|---------|
| Fácil | 4 | 20 s | Dos lugares intercambiados |
| Medio | 5 a 6 | 15 s | Lo anterior, y el círculo 2 puede aparecer girado medio sector |
| Difícil | 6 a 7 | 12 s | Lo anterior, y reflejos (mismo orden en sentido contrario) |

En **Progresiva** la partida pasa por los tres niveles.

## Correrlo en tu computadora

Requiere Node 18 o superior.

```
npm install
npm start
```

Abre `http://localhost:3000/host`. Para que los teléfonos de la misma WiFi puedan entrar, abre la pantalla del anfitrión con la dirección de red local que el servidor imprime al arrancar (por ejemplo `http://192.168.1.20:3000/host`): el QR apunta a la misma dirección desde la que se abrió el anfitrión.

## Publicarlo en internet (Render)

1. Sube este proyecto a un repositorio de GitHub.
2. En [render.com](https://render.com), elige **New → Blueprint** y selecciona el repositorio. El archivo `render.yaml` ya define el servicio.
3. Cuando termine el despliegue, abre `https://<tu-servicio>.onrender.com/host`.

El plan gratuito de Render apaga el servicio tras unos 15 minutos sin visitas y tarda cerca de un minuto en volver a arrancar: abre la página antes de empezar la clase. Las salas viven en memoria, así que se pierden si el servicio se reinicia.

## Pruebas

```
npm test                                     # lógica circular, rondas y salas
npm run carga -- http://localhost:3000 40    # simula 40 jugadores contra un servidor en marcha
```

## Estructura

- `server.js`: servidor Express y eventos de Socket.IO.
- `src/circular.js`: comparación de arreglos circulares (forma canónica).
- `src/rounds.js`: generación de rondas y niveles.
- `src/theory.js`: banco de preguntas de teoría y su reparto en la partida.
- `src/rooms.js`: salas, jugadores, fases de la partida y puntuación.
- `public/`: pantalla del anfitrión (`host.html`), del jugador (`index.html`) y el dibujo de los círculos (`js/table.js`).

## Referencia

Rosen, K. H. (2004). *Matemática discreta y sus aplicaciones* (5.ª ed.). McGraw-Hill. Cap. 4, "Combinatoria" (permutaciones y principio de multiplicación).
