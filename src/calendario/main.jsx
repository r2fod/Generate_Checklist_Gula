// ─── ARRANQUE DEL CALENDARIO ──────────────────────────────────────────────────
// Tercera app del repo, junto a la checklist y el formulario. Vive en /calendario/ con
// su propio index.html y su propio manifiesto, así que se instala aparte y quien solo
// necesita ver el mes —oficina, logística— no se lleva la checklist entera al móvil.
//
// Los mismos componentes los usa también la checklist desde dentro, para que el equipo
// pueda ir del mes a la boda sin cambiar de app. Por eso Calendario.jsx no sabe nada de
// Firestore: recibe los apuntes y avisa de los cambios. Lo de la nube se monta aquí.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import RedDeSeguridad from "../RedDeSeguridad.jsx";
import PuertaSesion from "../PuertaSesion.jsx";
import "../index.css";
import "./calendario.css";
import Calendario from "./Calendario.jsx";
import { saneaLista } from "./apuntes.js";
import { nubeActiva, cargarCalendarioNube, guardarCalendarioNube, suscribirCalendarioNube } from "../nube.js";

function AppCalendario() {
  const [apuntes, setApuntes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!nubeActiva()) { setCargando(false); return; }
    let vivo = true;
    cargarCalendarioNube()
      .then(d => { if (vivo && d) setApuntes(saneaLista(d.apuntes)); })
      .catch(() => { /* sin conexión: se queda vacío y la suscripción lo traerá */ })
      .finally(() => { if (vivo) setCargando(false); });
    // Y en vivo: si alguien apunta una boda desde otro móvil, aparece sola. Es un
    // calendario de equipo; tener que recargar para ver lo que acaba de poner otro lo
    // convertiría otra vez en una hoja que hay que refrescar.
    const corta = suscribirCalendarioNube(({ apuntes: nuevos }) => {
      if (vivo) setApuntes(saneaLista(nuevos));
    });
    return () => { vivo = false; corta(); };
  }, []);

  // Se guarda la lista entera, no el apunte suelto: son sesenta apuntes de cuatro
  // campos, cabe de sobra en un documento, y así no hay que resolver mezclas raras.
  const escribir = (siguiente) => {
    const limpia = saneaLista(siguiente);
    setApuntes(limpia);              // se pinta ya, sin esperar a la nube
    guardarCalendarioNube(limpia).catch(() => { /* se reintenta al siguiente cambio */ });
  };

  const guardar = (apunte) => escribir([...apuntes.filter(a => a.id !== apunte.id), apunte]);
  const borrar = (id) => escribir(apuntes.filter(a => a.id !== id));

  // Abrir el evento de la checklist desde el calendario. Es otra app, así que se va por
  // dirección; el nombre del evento viaja en el parámetro que ya entiende la checklist.
  const abrirEvento = (nombre) => {
    window.location.href = `../checklist/index.html?abrir=${encodeURIComponent(nombre)}`;
  };

  if (cargando) return <div className="cal-cargando">Cargando el calendario…</div>;

  return (
    <div className="app-wrapper">
      <Calendario apuntes={apuntes} onGuardar={guardar} onBorrar={borrar} onAbrirEvento={abrirEvento} />
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
