// ─── LA FÍSICA DEL GRAFO, SIN JSX ──────────────────────────────────────────────
// Aparte de Grafo.jsx a propósito: son las funciones puras (entra un array de nodos,
// sale un array de posiciones) que antes vivían mezcladas con el SVG. Separadas, se
// pueden probar con node de verdad en calculos.test.mjs, sin levantar un navegador —
// el mismo motivo por el que personal.js y bebida.js están aparte de sus paneles.
export const ANCHO = 600;
export const ALTO = 420;
export const ITERACIONES = 200;
export const ITERACIONES_POR_FOTOGRAMA = 4;

/** @param {Array<{id:string,tipo:string,nombre:string,peso:number}>} nodos */
export function estadoInicial(nodos) {
  return nodos.map((n, i) => {
    // Arrancan repartidos en un círculo, no todos amontonados en el centro: así la
    // repulsión tiene desde el primer instante en qué apoyarse para separarlos.
    const angulo = (i / nodos.length) * Math.PI * 2;
    const radio = 90 + (i % 5) * 22;
    return {
      ...n,
      x: ANCHO / 2 + Math.cos(angulo) * radio,
      y: ALTO / 2 + Math.sin(angulo) * radio,
      vx: 0, vy: 0,
    };
  });
}

/**
 * Una vuelta de la relajación, MUTANDO `sim` en el sitio: se llama muchas veces
 * seguidas (de golpe si no hay animación, fotograma a fotograma si la hay), y
 * copiar el array en cada vuelta sería trabajo tirado que nadie ve.
 * @param {Array<{x:number,y:number,vx:number,vy:number}>} sim
 * @param {Array<[number,number]>} bordes
 */
export function paso(sim, bordes) {
  const REPULSION = 900, MUELLE = 0.05, LARGO = 46, CENTRO = 0.004, FRICCION = 0.85;
  const cx = ANCHO / 2, cy = ALTO / 2;
  for (let i = 0; i < sim.length; i++) {
    for (let j = i + 1; j < sim.length; j++) {
      const a = sim[i], b = sim[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy + 0.01;
      const f = REPULSION / d2;
      const d = Math.sqrt(d2);
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  for (const [ai, bi] of bordes) {
    const a = sim[ai], b = sim[bi];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
    const delta = (d - LARGO) * MUELLE;
    const fx = (dx / d) * delta, fy = (dy / d) * delta;
    a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
  }
  for (const n of sim) {
    n.vx += (cx - n.x) * CENTRO;
    n.vy += (cy - n.y) * CENTRO;
    n.vx *= FRICCION; n.vy *= FRICCION;
    // Sin esto un nodo suelto (sin enlaces, cerca del borde) podía acabar fuera
    // del viewBox tras 200 vueltas de repulsión sin nada que lo frenase.
    n.x = Math.min(ANCHO - 14, Math.max(14, n.x + n.vx));
    n.y = Math.min(ALTO - 14, Math.max(14, n.y + n.vy));
  }
}

/**
 * A qué índice de `nodos` apunta cada enlace — se usa igual con animación o sin
 * ella, así que no depende de las posiciones.
 * @param {Array<{id:string}>} nodos
 * @param {Array<{de:string,a:string}>} enlaces
 */
export function bordesDe(nodos, enlaces) {
  const indice = new Map(nodos.map((n, i) => [n.id, i]));
  return enlaces
    .map(e => [indice.get(e.de), indice.get(e.a)])
    .filter(([a, b]) => a !== undefined && b !== undefined);
}
