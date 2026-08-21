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

export const COMPANEROS = {
  chef:    { nombre: "Gorro", emoji: "👨‍🍳" },
  cazuela: { nombre: "Cazuela", emoji: "🍲" },
  copa:    { nombre: "Copa", emoji: "🥂" },
  camion:  { nombre: "Camión", emoji: "🚚" },
  ninguno: { nombre: "Ninguno", emoji: "—" },
};
export const CLAVES_COMPANERO = Object.keys(COMPANEROS);

// Los ojos son lo único que cambia entre estados, y es suficiente: mirando a un lado
// mientras piensa, cerrados en cruz cuando algo ha fallado, abiertos el resto del rato.
function Ojos({ estado }) {
  if (estado === "error") {
    return (
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 27 l5 5 M25 27 l-5 5" />
        <path d="M39 27 l5 5 M44 27 l-5 5" />
      </g>
    );
  }
  // Pensando: las pupilas se van a un lado. Es el gesto de estar buscando algo.
  const dx = estado === "pensando" ? 2.5 : 0;
  return (
    <g fill="currentColor">
      <circle cx={22 + dx} cy="30" r="3.2" />
      <circle cx={42 + dx} cy="30" r="3.2" />
    </g>
  );
}

const Boca = ({ estado }) => (
  estado === "error"
    ? <path d="M25 43 q7 -5 14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    : <path d="M25 40 q7 6 14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
);

// Cada uno es el mismo par de ojos y boca dentro de una silueta distinta.
const SILUETAS = {
  chef: (
    <>
      <path d="M18 22 a9 9 0 0 1 8 -9 a10 10 0 0 1 16 0 a9 9 0 0 1 8 9 v4 h-32 z" fill="currentColor" opacity="0.22" />
      <rect x="17" y="25" width="30" height="5" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="16" y="29" width="32" height="26" rx="11" fill="currentColor" opacity="0.12" />
    </>
  ),
  cazuela: (
    <>
      <path d="M14 30 h36 v12 a14 14 0 0 1 -36 0 z" fill="currentColor" opacity="0.16" />
      <rect x="12" y="27" width="40" height="4" rx="2" fill="currentColor" opacity="0.35" />
      <path d="M26 20 q3 -5 0 -9 M32 19 q3 -6 0 -11 M38 20 q3 -5 0 -9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  copa: (
    <>
      <path d="M18 20 h28 l-4 18 a10 10 0 0 1 -20 0 z" fill="currentColor" opacity="0.16" />
      <path d="M32 48 v8 M25 56 h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <circle cx="24" cy="16" r="1.6" fill="currentColor" opacity="0.5" />
      <circle cx="40" cy="13" r="1.2" fill="currentColor" opacity="0.4" />
    </>
  ),
  camion: (
    <>
      <rect x="12" y="22" width="26" height="24" rx="3" fill="currentColor" opacity="0.16" />
      <path d="M38 30 h8 l6 7 v9 h-14 z" fill="currentColor" opacity="0.22" />
      <circle cx="21" cy="50" r="4.5" fill="currentColor" opacity="0.4" />
      <circle cx="44" cy="50" r="4.5" fill="currentColor" opacity="0.4" />
    </>
  ),
};

// "estado" es uno de: quieto, pensando, error.
export default function Companero({ cual = "chef", estado = "quieto", size = 40 }) {
  // Un parpadeo de vez en cuando. Sin él la cara se queda mirando fijo y resulta
  // desagradable a los diez segundos; con él parece que está ahí y ya está.
  const [parpadea, setParpadea] = useState(false);
  useEffect(() => {
    if (cual === "ninguno" || estado !== "quieto") return;
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

  if (cual === "ninguno" || !SILUETAS[cual]) return null;

  return (
    <span className={`companero es-${estado}`} aria-hidden="true" title={COMPANEROS[cual].nombre}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="presentation">
        {SILUETAS[cual]}
        {parpadea
          ? <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M19 30 h6" /><path d="M39 30 h6" />
            </g>
          : <Ojos estado={estado} />}
        <Boca estado={estado} />
      </svg>
    </span>
  );
}
