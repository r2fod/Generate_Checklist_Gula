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
// La física es la misma relajación de muelles+repulsión de siempre, pero ahora
// repartida en fotogramas con requestAnimationFrame en vez de las 200 vueltas de
// golpe: se ve a los nodos buscar su sitio, no aparecer ya colocados. Con 40 nodos
// como mucho (el mismo tope que ya tenía la lista) cada fotograma es barato — el
// coste total es el mismo de siempre, solo que repartido en el tiempo. Se apaga
// con prefers-reduced-motion (las 200 vueltas corren de golpe, como antes) y el
// bucle se limpia al desmontar o si cambian los nodos a mitad de animación.
//
// Las funciones puras (nada de JSX) viven en grafoFisica.js, aparte: así se prueban
// con node de verdad en calculos.test.mjs, sin levantar un navegador.
import { useEffect, useMemo, useState } from "react";
import { ANCHO, ALTO, ITERACIONES, ITERACIONES_POR_FOTOGRAMA, estadoInicial, paso, bordesDe } from "./grafoFisica.js";

const RADIO_MIN = 5, RADIO_MAX = 15;

export default function Grafo({ nodos, enlaces, colores }) {
  const [elegido, setElegido] = useState(null);
  const limitados = nodos.slice(0, 40);
  const idsLimitados = new Set(limitados.map(n => n.id));
  const enlacesLimitados = enlaces.filter(e => idsLimitados.has(e.de) && idsLimitados.has(e.a));

  const clave = JSON.stringify(limitados.map(n => n.id)) + "|" + JSON.stringify(enlacesLimitados);

  // Los bordes son solo índices (qué posición del array conecta con cuál): no se
  // mueven fotograma a fotograma, así que se memoizan aparte de las posiciones.
  const bordes = useMemo(
    () => bordesDe(limitados, enlacesLimitados),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clave],
  );

  // `sim` (las posiciones) y `bordes` (a qué índice apunta cada enlace) tienen que
  // tener siempre la MISMA forma o pintar una línea revienta con un índice que ya
  // no existe. Si `clave` cambió, se resetean las posiciones aquí mismo, durante
  // el render (el patrón de React para estado derivado de las props) — así nunca
  // hay un fotograma de por medio con `sim` viejo y `bordes` nuevo a la vez.
  const [sim, setSim] = useState(() => estadoInicial(limitados));
  const [claveDeSim, setClaveDeSim] = useState(clave);
  if (clave !== claveDeSim) {
    setClaveDeSim(clave);
    setSim(estadoInicial(limitados));
  }

  useEffect(() => {
    const propios = estadoInicial(limitados);

    // Quien prefiere menos movimiento se lleva el mismo resultado, pero de golpe:
    // ni una animación de por medio ni un bucle que limpiar después.
    const menosMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (menosMovimiento) {
      for (let i = 0; i < ITERACIONES; i++) paso(propios, bordes);
      setSim(propios);
      return;
    }

    let vivo = true;
    let hecho = 0;
    let idFotograma;
    const fotograma = () => {
      if (!vivo) return;
      for (let i = 0; i < ITERACIONES_POR_FOTOGRAMA && hecho < ITERACIONES; i++, hecho++) {
        paso(propios, bordes);
      }
      setSim([...propios]);
      if (hecho < ITERACIONES) idFotograma = requestAnimationFrame(fotograma);
    };
    idFotograma = requestAnimationFrame(fotograma);

    return () => { vivo = false; cancelAnimationFrame(idFotograma); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

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
