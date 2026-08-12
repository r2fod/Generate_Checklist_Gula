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
import RedDeSeguridad from "../RedDeSeguridad.jsx";
import PuertaSesion from "../PuertaSesion.jsx";
import "../index.css";
import "./calendario.css";
import Calendario from "./Calendario.jsx";
import Equipo from "./Equipo.jsx";
import useCalendarioNube from "./useCalendarioNube.js";
import Traer from "./Traer.jsx";

function AppCalendario() {
  const { apuntes, equipo, cargando, traer, guardar, borrar, cambiarEquipo } = useCalendarioNube();

  // Abrir el evento de la checklist desde el calendario. Es otra app, así que se va por
  // dirección; el nombre del evento viaja en el parámetro que ya entiende la checklist.
  const abrirEvento = (nombre) => {
    window.location.href = `../checklist/index.html?abrir=${encodeURIComponent(nombre)}`;
  };

  if (cargando) return <div className="cal-cargando">Cargando el calendario…</div>;

  return (
    <div className="app-wrapper">
      {/* Traer apuntes de golpe pegándolos o por enlace, NUNCA desde un archivo del
          repositorio. Los nombres de clientes y las vacaciones del equipo son datos de
          personas, y tanto el repositorio como lo publicado en GitHub Pages son
          públicos: eso vive en Firestore, que para eso está. */}
      <Traer apuntes={apuntes} onTraer={traer} />
      <Equipo equipo={equipo} onCambiar={cambiarEquipo} />
      <Calendario apuntes={apuntes} equipo={equipo} onGuardar={guardar} onBorrar={borrar} onAbrirEvento={abrirEvento} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RedDeSeguridad>
      {/* El calendario es del equipo: los apuntes viven en indice/, que las reglas solo
          abren con sesión iniciada. Sin login no habría nada que leer. */}
      <PuertaSesion Contenido={AppCalendario} />
    </RedDeSeguridad>
  </StrictMode>,
);
