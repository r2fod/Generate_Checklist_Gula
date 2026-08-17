// ─── ARRANQUE DEL CALENDARIO ──────────────────────────────────────────────────
// Tercera app del repo, junto a la checklist y el formulario. Vive en /calendario/ con
// su propio index.html y su propio manifiesto, así que se instala aparte y quien solo
// necesita ver el mes —oficina, logística— no se lleva la checklist entera al móvil.
//
// Los mismos componentes los usa también la checklist desde dentro, para que el equipo
// pueda ir del mes a la boda sin cambiar de app. Por eso Calendario.jsx no sabe nada de
// Firestore: recibe los apuntes y avisa de los cambios. Lo de la nube va en el hook
// useCalendarioNube, que comparten los dos sitios para que no se separen.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Eye } from "lucide-react";
import RedDeSeguridad from "../RedDeSeguridad.jsx";
import PuertaSesion from "../PuertaSesion.jsx";
import "../index.css";
import "./calendario.css";
import Calendario from "./Calendario.jsx";
import Equipo from "./Equipo.jsx";
import Compartir from "./Compartir.jsx";
import useCalendarioNube from "./useCalendarioNube.js";
import Traer from "./Traer.jsx";
import { enlaceDeLaUrl } from "./enlace.js";

// Se lee UNA vez, al arrancar, y no en cada render: es la dirección con la que se ha
// entrado y no cambia. Además así el objeto es el mismo siempre y el hook no reengancha
// la suscripción en cada pintada.
const ENLACE = enlaceDeLaUrl(window.location.search);

function AppCalendario() {
  const { apuntes, equipo, cargando, soloVer, codigos, traer, guardar, borrar, cambiarEquipo } = useCalendarioNube(ENLACE);

  // Abrir el evento de la checklist desde el calendario. Es otra app, así que se va por
  // dirección; el nombre del evento viaja en el parámetro que ya entiende la checklist.
  const abrirEvento = (nombre) => {
    window.location.href = `../checklist/index.html?abrir=${encodeURIComponent(nombre)}`;
  };

  if (cargando) return <div className="cal-cargando">Cargando el calendario…</div>;

  return (
    <div className="app-wrapper">
      {soloVer && (
        <div className="cal-aviso-lectura">
          <Eye size={15} aria-hidden="true" />
          <span>Estás viendo el calendario en <b>solo lectura</b>. Los cambios los hace el equipo.</span>
        </div>
      )}

      {/* Traer apuntes de golpe pegándolos, NUNCA desde un archivo del repositorio. Los
          nombres de clientes y las vacaciones del equipo son datos de personas, y tanto
          el repositorio como lo publicado en GitHub Pages son públicos: eso vive en
          Firestore, que para eso está. */}
      {!soloVer && <Traer apuntes={apuntes} onTraer={traer} />}

      {/* Los enlaces solo los reparte quien entra con cuenta: el que ya viene por un
          enlace no tiene por qué poder fabricar otros, y del de mirar no se puede
          llegar al de editar. */}
      {!ENLACE && <Compartir codigos={codigos} href={window.location.href} />}

      {!soloVer && <Equipo equipo={equipo} onCambiar={cambiarEquipo} />}

      {/* Desde un enlace no se ofrece abrir la checklist: es otra app y pide cuenta,
          así que el botón solo llevaría a una pantalla de login. */}
      <Calendario
        apuntes={apuntes}
        equipo={equipo}
        onGuardar={guardar}
        onBorrar={borrar}
        onAbrirEvento={ENLACE ? null : abrirEvento}
        soloVer={soloVer}
      />
    </div>
  );
}

// El service worker hace que la app abra sin cobertura y es lo que hace que Chrome
// ofrezca instalarla: sin él, el calendario tenía manifiesto e iconos pero Android no
// daba la opción de "instalar", solo el "añadir a pantalla de inicio" pelado de iOS.
// Vive en la RAÍZ y cubre las tres apps con una sola caché; es él quien decide a qué
// documento volver sin red según la dirección (ver public/sw.js).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("../sw.js", window.location.href), { scope: "../" })
      .catch(() => { /* sin service worker la app funciona igual, solo pierde el offline */ });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RedDeSeguridad>
      {/* El calendario del equipo pide cuenta. Los dos enlaces compartidos no: llevan su
          propio código, que es lo que Firestore comprueba, y quien los recibe —la
          oficina, la gente del día— no tiene usuario. */}
      <PuertaSesion Contenido={AppCalendario} sinLogin={Boolean(ENLACE)} />
    </RedDeSeguridad>
  </StrictMode>,
);
