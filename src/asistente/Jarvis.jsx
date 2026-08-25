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
// late como quien habla, error urge—: solo el color se notaba poco a 30px, que es el
// tamaño real de la cabecera, así que el ritmo es lo que lo distingue de un vistazo ahí.
const RADIO = 92;

// A 30px (la cabecera, el único sitio que queda por debajo del umbral) 60 marcas se
// emborronan en un aro difuso: no se leen como dial, solo como textura. Menos marcas y
// más gruesas siguen leyéndose ahí.
//
// El umbral está en 50 y no en 80 a propósito: la burbuja flotante mide 54px
// (BotonAsistente.jsx) y el dueño pidió que se viera "como la de Humano" —el mismo
// dibujo, con el mismo detalle, solo que más pequeño—, no una versión simplificada. Con
// el umbral en 80 la burbuja caía del lado compacto y perdía el anillo y los arcos
// justo donde más se ve el asistente (la esquina de la pantalla, todo el rato).
//
// 24 barras y no 16: en el vídeo de referencia ("esa animación es la que quiero para
// Jarvis") el aro de barras se ve tupido, como una turbina, casi sin huecos entre una
// y la siguiente. Con 16 y más finas quedaba más como marcas de reloj sueltas que como
// una turbina girando.
function conteos(size) {
  const compacto = size < 50;
  return { marcas: compacto ? 24 : 60, barras: compacto ? 12 : 24, grosor: compacto ? 3 : 1.5 };
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
    x="95.5" y="29" width="9" height="19" rx="1.5"
    transform={`rotate(${(i / total) * 360} 100 100)`}
  />
);

export default function Jarvis({ estado = "quieto", size = 40 }) {
  const { marcas, barras, grosor } = conteos(size);
  const compacto = size < 50;
  return (
    <span className={`jarvis-aro es-${estado}`} aria-hidden="true" title="Jarvis">
      <svg width={size} height={size} viewBox="0 0 200 200" role="presentation">
        {/* El resplandor del núcleo: un círculo desenfocado DEBAJO del núcleo de verdad,
            igual que la sombra del suelo de los otros compañeros (Humano.jsx). Sin él el
            centro quedaba plano —capas de opacidad, sin luz de verdad—, que es justo lo
            que tenía la imagen de referencia y esto no. */}
        <filter id="jarvisResplandor" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <circle className="jarvis-resplandor" cx="100" cy="100" r="16" filter="url(#jarvisResplandor)" />
        <circle className="jarvis-borde" cx="100" cy="100" r={RADIO} fill="none" />
        <g className="jarvis-marcas" stroke="currentColor" strokeWidth={grosor}>
          {Array.from({ length: marcas }, (_, i) => <Marca key={i} i={i} total={marcas} />)}
        </g>
        <g className="jarvis-barras" fill="currentColor">
          {Array.from({ length: barras }, (_, i) => <Barra key={i} i={i} total={barras} />)}
        </g>
        {/* El anillo y el arco de detalle solo se quitan a 30px (la cabecera) —ahí sí
            quedan por debajo del píxel—; a partir de 50px, incluida la burbuja
            flotante (54px), se pintan igual que en la pestaña Humano. */}
        {!compacto && (
          <>
            <circle className="jarvis-anillo" cx="100" cy="100" r="50" fill="none" />
            {/* Dos arcos, cada uno a su propio radio y girando a su propia velocidad (uno
                a favor, otro en contra — ver index.css): es lo que hace que el centro no
                se vea nunca igual dos veces seguidas, como el aro de referencia que pidió
                el dueño ("que cambia líneas"). Un solo arco quieto no lo conseguía. */}
            <path className="jarvis-arco" d="M128 66 a46 46 0 0 1 8 44" fill="none" />
            <path className="jarvis-arco2" d="M72 134 a38 38 0 0 1 -6 -34" fill="none" />
          </>
        )}
        <circle className="jarvis-disco" cx="100" cy="100" r="40" />
        <circle className="jarvis-disco-medio" cx="100" cy="100" r="24" />
        <circle className="jarvis-nucleo" cx="100" cy="100" r="10" />
      </svg>
    </span>
  );
}
