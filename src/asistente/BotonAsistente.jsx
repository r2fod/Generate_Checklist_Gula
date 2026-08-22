// ─── EL ASISTENTE, EN CUALQUIERA DE LAS TRES APPS ─────────────────────────────
// El botón y el panel juntos, con la carga perezosa dentro. Existe por una razón muy
// concreta: el asistente vivía escrito a mano dentro de App.jsx —el botón, el estado y
// quince líneas armando el contexto— así que montarlo en el calendario y en el
// formulario habría sido copiar eso tres veces. Y lo copiado se separa: se arregla algo
// en uno y los otros dos se quedan atrás. Ya nos pasó con el espejo de la nube.
//
// Cada app pone una línea:
//
//   <BotonAsistente contexto={{ eventosGuardados, apuntes, ... }} />
//
// y lo que no le pase, el asistente no lo verá. Esa es la parte importante: el contexto
// es lo único que existe para él, así que decirlo app por app es decir qué puede mirar
// en cada sitio.
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";

const Panel = React.lazy(() => import("./Asistente.jsx"));

export default function BotonAsistente({
  contexto = {},
  onOlvidar,
  etiqueta = "Asistente",
  className = "btn btn-ghost",
  titulo = "Preguntar al asistente",
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setAbierto(true)} title={titulo}>
        <Sparkles size={14} aria-hidden="true" /> {etiqueta}
      </button>
      {abierto && createPortal(
        // Con un portal a propósito, y no montado donde vive el botón: el panel es
        // "position: fixed" para cubrir toda la pantalla, pero fixed deja de ser fixed
        // de verdad en cuanto un antepasado tiene un transform puesto — y el <header>
        // de la app lo tiene, de su animación de entrada, que se queda ahí para siempre
        // aunque termine (animation ... both). Sin el portal, el panel se quedaba
        // "fijo" respecto al header en vez de respecto a la pantalla: una tira
        // recortada arriba en vez del modal entero. Iba a pasar en cualquiera de las
        // tres apps el día que el botón viviera dentro de un header con esa animación,
        // así que se soluciona aquí, en el sitio compartido, y no parcheando cada header.
        <React.Suspense fallback={null}>
          <Panel contexto={contexto} onOlvidar={onOlvidar} onCerrar={() => setAbierto(false)} />
        </React.Suspense>,
        document.body,
      )}
    </>
  );
}
