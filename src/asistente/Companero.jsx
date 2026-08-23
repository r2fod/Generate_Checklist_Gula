// ─── EL COMPAÑERO ─────────────────────────────────────────────────────────────
// El muñeco del asistente. No es adorno: es el estado del asistente donde se está
// mirando. Sin él, "está pensando" o "algo ha fallado" hay que leerlo; con él se ve de
// reojo mientras se hace otra cosa, que es como se usa esto de verdad —con el móvil en
// una mano y una caja en la otra.
//
// Dibujado con SVG a mano y no con una imagen a propósito: pesa unos cientos de bytes,
// se pinta nítido en cualquier pantalla, cambia de color solo con el tema y no hay que
// cargar ningún fichero. Cinco para elegir, porque el que le hace gracia a uno le
// cansa a otro y esto va a estar en pantalla todos los días.
//
// Ninguno se parece al de OpenHuman: son formas simples de la casa.
import { useState, useEffect } from "react";
import { COMPANEROS, COMPANERO_POR_DEFECTO } from "./companeros.js";
import Jarvis from "./Jarvis.jsx";

// La lista vive en companeros.js: la comparten las dos pantallas y la leen las pruebas,
// que corren en node y no entienden JSX. Se reexporta para no romper lo que ya importaba
// de aquí.
export { COMPANEROS, CLAVES_COMPANERO } from "./companeros.js";

// Los ojos son lo único que cambia entre estados, y es suficiente: mirando a un lado
// mientras piensa, cerrados en cruz cuando algo ha fallado, abiertos el resto del rato.
function Ojos({ estado }) {
  if (estado === "error") {
    return (
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M25 26 l5 5 M30 26 l-5 5" />
        <path d="M34 26 l5 5 M39 26 l-5 5" />
      </g>
    );
  }
  // Pensando: las pupilas se van a un lado. Es el gesto de estar buscando algo.
  const dx = estado === "pensando" ? 2.5 : 0;
  return (
    <g fill="currentColor">
      <circle cx={27 + dx} cy="29" r="2.6" />
      <circle cx={37 + dx} cy="29" r="2.6" />
    </g>
  );
}

const Boca = ({ estado }) => (
  estado === "error"
    ? <path d="M27 38 q5 -4 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    : <path d="M27 36 q5 5 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
);

// A 30px no cabe una persona entera con brazos: se queda en una mancha. Así que aquí
// va el BUSTO —cabeza, hombros y lo que lleva puesto—, que es lo que de verdad se lee
// a ese tamaño. Los mismos siete oficios que el grande y en la misma postura, para que
// al elegir uno no parezca que has cambiado de personaje.
const BUSTO = (
  <>
    <path d="M14 56 a18 18 0 0 1 36 0 z" fill="url(#compVolumen)" />
    <circle cx="32" cy="30" r="16" fill="url(#compVolumen)" />
  </>
);

const GORRO = (
  <>
    <path d="M20 15 a8 8 0 0 1 7 -8 a9 9 0 0 1 14 0 a8 8 0 0 1 7 8 v4 h-28 z" className="comp-viste" />
    <rect x="19" y="17" width="30" height="6" rx="3" className="comp-detalle" />
  </>
);
const PELO_LARGO = <path d="M16 30 q-3 10 1 14 h4 q-4 -7 -2 -14 z M48 30 q3 10 -1 14 h-4 q4 -7 2 -14 z" className="comp-viste" />;
const PAJARITA = <path d="M28 47 l-5 -3 v6 z M36 47 l5 -3 v6 z" className="comp-detalle" />;

const OFICIOS = {
  // "jarvis" no dibuja nada aquí: es el único que no comparte el BUSTO de los demás
  // (ver Jarvis.jsx). La clave vive igual en este objeto para que la prueba de paridad
  // con Humano.jsx lo siga contando como "dibujado, no solo listado" en los dos sitios.
  jarvis: null,
  cocinera:  <>{PELO_LARGO}{GORRO}</>,
  cocinero:  GORRO,
  camarero:  <><path d="M16 30 a16 16 0 0 1 32 0 q-8 -6 -18 -3 q-8 2 -14 3 z" className="comp-viste" />{PAJARITA}</>,
  camarera:  <><path d="M16 30 a16 16 0 0 1 32 0 v-3 a16 16 0 0 0 -32 0 z" className="comp-viste" /><circle cx="49" cy="33" r="4.5" className="comp-viste" />{PAJARITA}</>,
  logistica: (
    <>
      <path d="M17 22 a15 15 0 0 1 30 0 v3 h-30 z" className="comp-viste" />
      <path d="M15 24 h-7 a2.5 2.5 0 0 0 0 5 h8 z" className="comp-detalle" />
      <path d="M22 48 h20 v3 h-20 z" className="comp-detalle" />
      <rect x="24" y="52" width="16" height="10" rx="2" className="comp-viste" />
    </>
  ),
  parrillero: (
    <>
      <path d="M16 25 a16 16 0 0 1 32 0 v-1 a16 16 0 0 0 -32 0 z" className="comp-viste" />
      <path d="M46 22 l6 -3 l-1 5 z" className="comp-detalle" />
      <ellipse cx="32" cy="54" rx="11" ry="4" className="comp-detalle" />
    </>
  ),
  sumiller: (
    <>
      <path d="M17 24 a15 15 0 0 1 30 0 q-15 -7 -30 0 z" className="comp-viste" />
      <path d="M32 45 v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <circle cx="32" cy="52" r="3" className="comp-detalle" />
    </>
  ),
  repostera: (
    <>
      {PELO_LARGO}
      <path d="M16 27 a16 16 0 0 1 32 0 v-3 a16 16 0 0 0 -32 0 z" className="comp-viste" />
      <path d="M46 23 l6 -4 l-1 6 z" className="comp-detalle" />
      <path d="M25 50 h14 v9 h-14 z" className="comp-detalle" />
    </>
  ),
};

const SILUETAS = Object.fromEntries(
  Object.entries(OFICIOS).map(([k, extras]) => [k, <>{BUSTO}{extras}</>]),
);

// "estado" es uno de: quieto, pensando, error.
export default function Companero({ cual = COMPANERO_POR_DEFECTO, estado = "quieto", size = 40 }) {
  // Un parpadeo de vez en cuando. Sin él la cara se queda mirando fijo y resulta
  // desagradable a los diez segundos; con él parece que está ahí y ya está.
  const [parpadea, setParpadea] = useState(false);
  useEffect(() => {
    if (cual === "ninguno" || cual === "jarvis" || estado !== "quieto") return;
    let vivo = true;
    const ciclo = () => {
      const espera = 2600 + Math.random() * 3400;
      return setTimeout(() => {
        if (!vivo) return;
        setParpadea(true);
        setTimeout(() => { if (vivo) { setParpadea(false); id = ciclo(); } }, 130);
      }, espera);
    };
    let id = ciclo();
    return () => { vivo = false; clearTimeout(id); };
  }, [cual, estado]);

  if (cual === "ninguno") return null;
  // El aro no tiene parpadeo ni BUSTO que dibujar: es su propio SVG, con su propia
  // animación por CSS (ver .jarvis-aro en index.css).
  if (cual === "jarvis") return <Jarvis estado={estado} size={size} />;
  if (!SILUETAS[cual]) return null;

  return (
    <span className={`companero es-${estado}`} aria-hidden="true" title={COMPANEROS[cual].nombre}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="presentation">
        {/* El mismo volumen que el grande, en pequeño: degradado y un brillo. A 30px no
            se aprecia el detalle, pero sí la diferencia entre una mancha plana y algo
            con cuerpo. El id lleva prefijo propio porque en la página conviven los dos
            SVG y un id repetido hace que gane el primero que se pinte. */}
        <defs>
          <radialGradient id="compVolumen" cx="34%" cy="26%" r="82%">
            <stop offset="0%" className="hum-luz" />
            <stop offset="52%" className="hum-medio" />
            <stop offset="100%" className="hum-sombra" />
          </radialGradient>
        </defs>
        {SILUETAS[cual]}
        <ellipse className="comp-brillo" cx="26" cy="24" rx="6" ry="4" transform="rotate(-20 26 24)" />
        {parpadea
          ? <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M24 29 h6" /><path d="M34 29 h6" />
            </g>
          : <Ojos estado={estado} />}
        <Boca estado={estado} />
      </svg>
    </span>
  );
}
