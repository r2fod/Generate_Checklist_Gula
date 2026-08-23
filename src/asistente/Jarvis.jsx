// ─── EL ARO ─────────────────────────────────────────────────────────────────
// Excepción a propósito a "personas, no objetos" (ver companeros.js): esto lo pidió el
// dueño tal cual —un aro que gira y cambia de color según lo que hace el asistente, no
// una persona con hombros que gesticula—. Por eso no comparte nada con el CUERPO/BUSTO
// de los demás compañeros: ni cuerpo, ni parpadeo, ni gestos por herramienta. Es su
// propio dibujo, generado por número en vez de a mano, así que sirve igual de chico
// (cabecera) que de grande (pestaña Humano) sin dibujarlo dos veces.
//
// Los estados que sabe pintar son los mismos cinco que ya usa el resto del asistente:
// quieto, pensando, oyendo, hablando, error.

const MARCAS = 60, BARRAS = 16, RADIO = 92;

// Cada marca del dial: las de cada 5ª posición (como las horas de un reloj) más largas.
const Marca = ({ i }) => (
  <line
    x1="100" y1={100 - RADIO} x2="100" y2={100 - RADIO + (i % 5 === 0 ? 7 : 3)}
    transform={`rotate(${(i / MARCAS) * 360} 100 100)`}
  />
);

// El aro de barras, como el de la referencia: es lo que gira y da la sensación de que
// está trabajando.
const Barra = ({ i }) => (
  <rect
    x="96.5" y="30" width="7" height="16" rx="1.5"
    transform={`rotate(${(i / BARRAS) * 360} 100 100)`}
  />
);

export default function Jarvis({ estado = "quieto", size = 40 }) {
  return (
    <span className={`jarvis-aro es-${estado}`} aria-hidden="true" title="Jarvis">
      <svg width={size} height={size} viewBox="0 0 200 200" role="presentation">
        <circle className="jarvis-borde" cx="100" cy="100" r={RADIO} fill="none" />
        <g className="jarvis-marcas" stroke="currentColor" strokeWidth="1.5">
          {Array.from({ length: MARCAS }, (_, i) => <Marca key={i} i={i} />)}
        </g>
        <g className="jarvis-barras" fill="currentColor">
          {Array.from({ length: BARRAS }, (_, i) => <Barra key={i} i={i} />)}
        </g>
        <circle className="jarvis-anillo" cx="100" cy="100" r="50" fill="none" />
        <path className="jarvis-arco" d="M128 66 a46 46 0 0 1 8 44" fill="none" />
        <circle className="jarvis-disco" cx="100" cy="100" r="40" />
        <circle className="jarvis-disco-medio" cx="100" cy="100" r="24" />
        <circle className="jarvis-nucleo" cx="100" cy="100" r="10" />
      </svg>
    </span>
  );
}
