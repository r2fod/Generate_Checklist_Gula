// ─── EL GRAFO DE VERDAD ────────────────────────────────────────────────────────
// La pestaña Grafo de Cerebro.jsx pintaba los nodos como una lista de píldoras
// sueltas —el nombre y un número de conexiones— sin ninguna línea entre ellos: los
// datos (nodos + enlaces, ver arbol.js) ya estaban listos para un grafo de verdad
// desde el principio, pero la pantalla no llegaba a dibujarlo como tal.
//
// Esto SÍ existe en OpenHuman de verdad —comprobado en su código, no solo en la
// imagen de referencia—: un grafo de fuerzas dibujado a mano en SVG puro, sin
// ninguna librería (`app/src/components/intelligence/MemoryGraph.tsx`). El mismo
// enfoque encaja aquí sin traer nada nuevo: es la misma idea que Jarvis o
// Companero, geometría calculada en vez de un fichero que cargar.
//
// La física es una relajación de muelles+repulsión que corre UNA VEZ, síncrona,
// antes de pintar —no una animación en marcha—: con 40 nodos como mucho (el mismo
// tope que ya tenía la lista) son unas pocas decenas de miles de operaciones,
// nada que note ni un móvil viejo, y sin nada que limpiar al desmontar ni que
// apagar con prefers-reduced-motion, porque no se mueve nada después de pintar.
import { useMemo, useState } from "react";

const ANCHO = 600;
const ALTO = 420;

/**
 * @param {Array<{id:string,tipo:string,nombre:string,peso:number}>} nodos
 * @param {Array<{de:string,a:string,por:string}>} enlaces
 */
function relajar(nodos, enlaces) {
  const indice = new Map(nodos.map((n, i) => [n.id, i]));
  const sim = nodos.map((n, i) => {
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
  const bordes = enlaces
    .map(e => [indice.get(e.de), indice.get(e.a)])
    .filter(([a, b]) => a !== undefined && b !== undefined);

  const REPULSION = 900, MUELLE = 0.05, LARGO = 46, CENTRO = 0.004, FRICCION = 0.85;
  const cx = ANCHO / 2, cy = ALTO / 2;
  for (let iter = 0; iter < 200; iter++) {
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
  return { sim, bordes };
}

const RADIO_MIN = 5, RADIO_MAX = 15;

export default function Grafo({ nodos, enlaces, colores }) {
  const [elegido, setElegido] = useState(null);
  const limitados = nodos.slice(0, 40);
  const idsLimitados = new Set(limitados.map(n => n.id));
  const enlacesLimitados = enlaces.filter(e => idsLimitados.has(e.de) && idsLimitados.has(e.a));

  // Memoizado por los propios datos: recalcular la física en cada pulsación de tecla
  // de otra pestaña sería trabajo tirado, ya que las posiciones no dependen de nada
  // más que de qué nodos y enlaces hay.
  const { sim, bordes } = useMemo(
    () => relajar(limitados, enlacesLimitados),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(limitados.map(n => n.id)), JSON.stringify(enlacesLimitados)],
  );

  const pesoMax = Math.max(1, ...limitados.map(n => n.peso));
  const radioDe = (n) => RADIO_MIN + (RADIO_MAX - RADIO_MIN) * (Math.min(n.peso, pesoMax) / pesoMax);
  const conexionesDe = (id) => bordes.filter(([a, b]) => sim[a].id === id || sim[b].id === id).length;

  if (!limitados.length) return <p className="asis-vacio">Sin nada que conectar todavía.</p>;

  const tipos = [...new Set(limitados.map(n => n.tipo))];

  return (
    <div className="cer-grafo-svg-wrap">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="cer-grafo-svg" role="img"
        aria-label="Cómo se conecta lo que sabe el asistente">
        <g className="cer-grafo-enlaces">
          {bordes.map(([ai, bi], i) => {
            const a = sim[ai], b = sim[bi];
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>
        <g>
          {sim.map(n => {
            const activo = elegido === n.id;
            return (
              <circle
                key={n.id} cx={n.x} cy={n.y} r={activo ? radioDe(n) + 2 : radioDe(n)}
                fill={colores[n.tipo] || "#94a3b8"}
                className={`cer-grafo-nodo${activo ? " es-elegido" : ""}`}
                onClick={() => setElegido(activo ? null : n.id)}
                tabIndex={0} role="button" aria-pressed={activo}
                aria-label={`${n.nombre}, ${n.tipo}`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setElegido(activo ? null : n.id); } }}
              >
                <title>{n.nombre} · {n.tipo}</title>
              </circle>
            );
          })}
        </g>
      </svg>

      <div className="cer-grafo-leyenda">
        {tipos.map(t => (
          <span key={t} className="cer-grafo-leyenda-item">
            <em style={{ background: colores[t] || "#94a3b8" }} />
            {t}
          </span>
        ))}
      </div>

      {/* El detalle de lo elegido, debajo del dibujo y no flotando encima: en un móvil
          un tooltip pegado al dedo tapa el propio nodo que se acaba de tocar. */}
      {elegido && (() => {
        const n = sim.find(x => x.id === elegido);
        if (!n) return null;
        return (
          <div className="cer-grafo-detalle">
            <strong>{n.nombre}</strong>
            <span>{n.tipo} · {conexionesDe(n.id)} conexion{conexionesDe(n.id) === 1 ? "" : "es"}</span>
          </div>
        );
      })()}
    </div>
  );
}
