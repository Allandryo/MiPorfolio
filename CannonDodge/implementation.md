# Plan de Implementación: Mejoras en CannonDodge

Este documento detalla el plan técnico para agregar una estética de fondo blanco premium, estela de movimiento para el cubo, trayectorias parabólicas naturales para las balas de cañón y un sistema de 3 vidas con invulnerabilidad temporal para el jugador.

## Decisiones Clave de Diseño

### 1. Cambio de Estética a Fondo Claro:
- Al cambiar el fondo del juego a blanco/claro, se adaptarán todos los textos (Score, Título del Menú, etc.) y elementos de la cuadrícula a colores oscuros/contrastantes para que sean perfectamente legibles y se mantenga una apariencia sumamente moderna y pulida.

### 2. Mecánica de Vidas e Invulnerabilidad:
- Para evitar que una sola bala de cañón (o múltiples balas seguidas en milisegundos) reste todas las vidas al instante, implementaremos un tiempo de inmunidad temporal de **1.5 segundos (90 fotogramas)** tras recibir daño. Durante este tiempo, el cubo parpadeará para indicar visualmente que es invulnerable.

---

## Cambios Propuestos

### [Game Logic & Aesthetics]

#### [MODIFY] [GameScreen.kt](app/src/main/java/com/example/cannondodge/ui/game/GameScreen.kt)

Realizaremos los siguientes cambios detallados en el archivo de interfaz principal del juego:

1. **Ajuste de Colores para Fondo Blanco:**
   - Cambiar `DarkBackground` a un tono grisáceo claro muy limpio y prémium: `Color(0xFFF8FAFC)` (Slate 50).
   - Ajustar `GridLineColor` a `Color(0xFFE2E8F0)` (Slate 200) para una rejilla de fondo sutil.
   - Cambiar `StarColor` a un celeste suave con baja opacidad para representar partículas flotantes en lugar de estrellas espaciales.
   - Adaptar colores de interfaz (SCORE y puntuación) a colores oscuros (`Color(0xFF0F172A)` para legibilidad óptima).
   - Ajustar el color de "DODGE" en el menú a carbón oscuro (`Color(0xFF1E293B)`) y las descripciones a un tono gris medio.

2. **Estela del Jugador (Player Trail):**
   - Definir una lista reactiva mutable `playerTrail = remember { mutableStateListOf<Offset>() }` que registrará las últimas posiciones.
   - En el bucle de juego, añadir la posición actual a la estela y limitar su longitud (máximo 8 posiciones).
   - Limpiar la estela al iniciar o reiniciar el juego.
   - Dibujar la estela en el canvas antes de dibujar el cubo principal, con tamaños descendentes y opacidades decrecientes para crear un efecto de movimiento fluido.

3. **Física Parabólica y Movimientos Naturales de Cañón:**
   - Modificar la clase de datos `Cannonball` para soportar velocidad en dos dimensiones (`vx`, `vy`) y fuerza de gravedad (`gravity`).
   - Crear tres tipos de lanzamiento aleatorios al generar balas de cañón:
     - **Desde arriba (Top):** Caída con ligero ángulo lateral y gravedad baja.
     - **Desde la izquierda (Left):** Disparo lateral parabólico hacia la derecha.
     - **Desde la derecha (Right):** Disparo lateral parabólico hacia la izquierda.
   - Actualizar las posiciones en el bucle utilizando fórmulas de física de proyectiles estándar.
   - Actualizar el rango de descarte lateral para que las balas de cañón que salgan por los lados de la pantalla también sean removidas.

4. **Sistema de 3 Vidas y Daño:**
   - Añadir el estado `lives` inicializado en 3, y `lastHitFrame` para la inmunidad.
   - Restar 1 vida en la colisión si no se es invulnerable, gatillar una pequeña explosión en la bala de cañón, y eliminar dicha bala.
   - Si las vidas llegan a 0, ejecutar la gran explosión de Game Over tradicional.
   - Dibujar una barra de vidas visualmente atractiva con 3 corazones (❤️) en la esquina superior izquierda usando una tipografía y estilo prémium.
   - Añadir un efecto visual de parpadeo (flashing) al cubo del jugador mientras esté inmune.

---

## Plan de Verificación

### Verificación Manual
- Compilar y ejecutar la aplicación en el emulador de Android o dispositivo físico para verificar:
  - El fondo claro con la rejilla y partículas flotantes.
  - La estela fluida que sigue al cubo al arrastrarlo.
  - Las trayectorias parabólicas de las balas de cañón que provienen de los bordes laterales y superiores.
  - El sistema de 3 vidas, el parpadeo de invulnerabilidad temporal y la transición a la pantalla de Game Over cuando las vidas llegan a 0.
