// ─── EL ARO ─────────────────────────────────────────────────────────────────
// Excepción a propósito a "personas, no objetos" (ver companeros.js): esto lo pidió el
// dueño tal cual —un aro que gira y cambia de color según lo que hace el asistente, no
// una persona con hombros que gesticula—. Por eso no comparte nada con el CUERPO/BUSTO
// de los demás compañeros: ni cuerpo, ni parpadeo, ni gestos por herramienta. Es su
// propio dibujo, generado por número en vez de a mano, así que sirve igual de chico
// (cabecera) que de grande (pestaña Humano) sin dibujarlo dos veces.
//
// Los estados que sabe pintar son los mismos cinco que ya usa el resto del asistente:
// quieto, pensando, oyendo, hablando, error. Cada uno tiene su color (ver index.css) Y
// su ritmo propio —pensando busca deprisa, oyendo respira tranquilo esperando, hablando
// late como quien habla, error urge—: solo el color se notaba poco a 40px, que es el
// tamaño real de la cabecera, así que el ritmo es lo que lo distingue de un vistazo ahí.
const RADIO = 92;

// A 40px (la cabecera) 60 marcas se emborronan en un aro difuso: no se leen como dial,
// solo como textura. Menos marcas y más gruesas siguen leyéndose ahí; a tamaño grande
// (la pestaña Humano) el detalle fino sí se aprecia.
function conteos(size) {
  const compacto = size < 80;
  return { marcas: compacto ? 24 : 60, barras: compacto ? 10 : 16, grosor: compacto ? 3 : 1.5 };
}

// Cada 5ª marca del dial, más larga, como las horas de un reloj.
const Marca = ({ i, total }) => (
  <line
    x1="100" y1={100 - RADIO} x2="100" y2={100 - RADIO + (i % 5 === 0 ? 7 : 3)}
    transform={`rotate(${(i / total) * 360} 100 100)`}
  />
);

// El aro de barras: lo que gira y da la sensación de que está trabajando.
const Barra = ({ i, total }) => (
  <rect
    x="96.5" y="30" width="7" height="16" rx="1.5"
    transform={`rotate(${(i / total) * 360} 100 100)`}
  />
);

export default function Jarvis({ estado = "quieto", size = 40 }) {
  const { marcas, barras, grosor } = conteos(size);
  const compacto = size < 80;
  return (
    <span className={`jarvis-aro es-${estado}`} aria-hidden="true" title="Jarvis">
      <svg width={size} height={size} viewBox="0 0 200 200" role="presentation">
        <circle className="jarvis-borde" cx="100" cy="100" r={RADIO} fill="none" />
        <g className="jarvis-marcas" stroke="currentColor" strokeWidth={grosor}>
          {Array.from({ length: marcas }, (_, i) => <Marca key={i} i={i} total={marcas} />)}
        </g>
        <g className="jarvis-barras" fill="currentColor">
          {Array.from({ length: barras }, (_, i) => <Barra key={i} i={i} total={barras} />)}
        </g>
        {/* El anillo y el arco de detalle no se ven a 40px —quedan por debajo del
            píxel—, así que ahí ni se pintan: es DOM que nadie mira, en un icono que
            está siempre en pantalla en la cabecera. */}
        {!compacto && (
          <>
            <circle className="jarvis-anillo" cx="100" cy="100" r="50" fill="none" />
            <path className="jarvis-arco" d="M128 66 a46 46 0 0 1 8 44" fill="none" />
          </>
        )}
        <circle className="jarvis-disco" cx="100" cy="100" r="40" />
        <circle className="jarvis-disco-medio" cx="100" cy="100" r="24" />
        <circle className="jarvis-nucleo" cx="100" cy="100" r="10" />
      </svg>
    </span>
  );
}
