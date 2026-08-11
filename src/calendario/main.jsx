// ─── ARRANQUE DEL CALENDARIO ──────────────────────────────────────────────────
// Tercera app del repo, junto a la checklist y el formulario. Vive en /calendario/ con
// su propio index.html y su propio manifiesto, así que se instala aparte y quien solo
// necesita ver el mes —oficina, logística— no se lleva la checklist entera al móvil.
//
// Los mismos componentes los usa también la checklist desde dentro, para que el equipo
// pueda ir del mes a la boda sin cambiar de app. Por eso Calendario.jsx no sabe nada de
// Firestore: recibe los apuntes y avisa de los cambios. Lo de la nube va en el hook
// useCalendarioNube, que comparten los dos sitios para que no se separen.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import RedDeSeguridad from "../RedDeSeguridad.jsx";
import PuertaSesion from "../PuertaSesion.jsx";
import "../index.css";
import "./calendario.css";
import Calendario from "./Calendario.jsx";
import Equipo from "./Equipo.jsx";
import useCalendarioNube from "./useCalendarioNube.js";
import { saneaLista } from "./apuntes.js";
import { leerApuntesDelEnlace, limpiaEnlace } from "./traer.js";

// Pegar una lista de apuntes en JSON para rellenar el calendario de una vez. Se usa
// para traer lo que hubiera en otro sitio (una hoja, otro calendario) sin que esos
// datos —clientes, vacaciones del equipo— tengan que pasar por el repositorio.
function PegarApuntes({ onTraer }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const traer = () => {
    try {
      const lista = saneaLista(JSON.parse(texto));
      if (!lista.length) return setError("No he encontrado ningún apunte válido. Cada uno necesita al menos fecha y título.");
      onTraer(lista);
    } catch (e) {
      setError("Eso no es JSON válido. Tiene que ser una lista entre corchetes.");
    }
  };
  return (
    <div className="cal-traer">
      <strong>El calendario está vacío.</strong>
      <span>Puedes apuntar los eventos uno a uno, o pegar aquí una lista para traerlos todos de golpe.</span>
      <textarea
        className="cal-traer-texto"
        rows={4}
        value={texto}
        onChange={e => { setTexto(e.target.value); setError(""); }}
        placeholder='[{"fecha":"2026-09-13","titulo":"Boda ...","tipo":"boda"}]'
      />
      {error && <span className="cal-traer-error">{error}</span>}
      <button className="btn btn-green" disabled={!texto.trim()} onClick={traer}>Traer los apuntes</button>
    </div>
  );
}

// Lo que trae un enlace de importación, ANTES de meterlo. Un enlace que escribiera solo
// en el calendario del equipo sería un enlace que cualquiera puede mandar; aquí se ve
// qué trae y lo mete quien lo abre. Sin tocar el botón, no entra nada.
function TraerDelEnlace({ apuntes, onTraer, onDescartar }) {
  const muestra = apuntes.slice(0, 3).map(a => a.titulo).join(", ");
  return (
    <div className="cal-traer">
      <strong>Este enlace trae {apuntes.length} {apuntes.length === 1 ? "apunte" : "apuntes"}.</strong>
      <span>{muestra}{apuntes.length > 3 ? `, y ${apuntes.length - 3} más` : ""}.</span>
      <span>Se añaden a lo que ya haya, y los que ya estén no se duplican.</span>
      <div className="cal-traer-botones">
        <button className="btn btn-green" onClick={onTraer}>Traerlos al calendario</button>
        <button className="btn btn-ghost" onClick={onDescartar}>No, gracias</button>
      </div>
    </div>
  );
}

function AppCalendario() {
  const { apuntes, equipo, cargando, traer, guardar, borrar, cambiarEquipo } = useCalendarioNube();
  // Apuntes que vienen dentro del enlace, todavía sin meter
  const [delEnlace, setDelEnlace] = useState(() => leerApuntesDelEnlace());

  // La dirección se limpia nada más leerla, no al aceptar: así una recarga no vuelve a
  // preguntar, y el enlace con los datos dentro no se queda en la barra de direcciones
  // a la vista de quien pase por al lado.
  useEffect(() => { if (delEnlace) limpiaEnlace(); }, [delEnlace]);

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
      {delEnlace
        ? <TraerDelEnlace
            apuntes={delEnlace}
            onTraer={() => { traer([...apuntes, ...delEnlace]); setDelEnlace(null); }}
            onDescartar={() => setDelEnlace(null)}
          />
        : apuntes.length === 0 && <PegarApuntes onTraer={(lista) => traer([...apuntes, ...lista])} />}
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
