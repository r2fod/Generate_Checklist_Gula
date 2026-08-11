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
import Equipo from "./Equipo.jsx";
import { saneaLista, saneaEquipo } from "./apuntes.js";
import { nubeActiva, cargarCalendarioNube, guardarCalendarioNube, suscribirCalendarioNube } from "../nube.js";

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

function AppCalendario() {
  const [apuntes, setApuntes] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!nubeActiva()) { setCargando(false); return; }
    let vivo = true;
    cargarCalendarioNube()
      .then(d => { if (vivo && d) { setApuntes(saneaLista(d.apuntes)); setEquipo(saneaEquipo(d.equipo)); } })
      .catch(() => { /* sin conexión: se queda vacío y la suscripción lo traerá */ })
      .finally(() => { if (vivo) setCargando(false); });
    // Y en vivo: si alguien apunta una boda desde otro móvil, aparece sola. Es un
    // calendario de equipo; tener que recargar para ver lo que acaba de poner otro lo
    // convertiría otra vez en una hoja que hay que refrescar.
    const corta = suscribirCalendarioNube(({ apuntes: nuevos, equipo: suEquipo }) => {
      if (!vivo) return;
      setApuntes(saneaLista(nuevos));
      setEquipo(saneaEquipo(suEquipo));
    });
    return () => { vivo = false; corta(); };
  }, []);

  // Se guarda la lista entera, no el apunte suelto: son sesenta apuntes de cuatro
  // campos, cabe de sobra en un documento, y así no hay que resolver mezclas raras.
  //
  // Apuntes y equipo van en el MISMO documento, así que cada escritura manda las dos
  // listas. Se pasan explícitas —y no se leen del estado dentro de la función— para que
  // guardar el equipo no suba una foto vieja de los apuntes, ni al revés.
  const escribir = (siguienteApuntes, siguienteEquipo) => {
    const apuntesLimpios = saneaLista(siguienteApuntes);
    const equipoLimpio = saneaEquipo(siguienteEquipo);
    setApuntes(apuntesLimpios);      // se pinta ya, sin esperar a la nube
    setEquipo(equipoLimpio);
    guardarCalendarioNube(apuntesLimpios, equipoLimpio).catch(() => { /* se reintenta al siguiente cambio */ });
  };

  const guardar = (apunte) => escribir([...apuntes.filter(a => a.id !== apunte.id), apunte], equipo);
  const borrar = (id) => escribir(apuntes.filter(a => a.id !== id), equipo);
  const cambiarEquipo = (siguiente) => escribir(apuntes, siguiente);

  // Abrir el evento de la checklist desde el calendario. Es otra app, así que se va por
  // dirección; el nombre del evento viaja en el parámetro que ya entiende la checklist.
  const abrirEvento = (nombre) => {
    window.location.href = `../checklist/index.html?abrir=${encodeURIComponent(nombre)}`;
  };

  if (cargando) return <div className="cal-cargando">Cargando el calendario…</div>;

  return (
    <div className="app-wrapper">
      {/* Traer apuntes de golpe PEGÁNDOLOS, no desde un archivo del repositorio.
          Los nombres de clientes y las vacaciones del equipo son datos personales y el
          repositorio es público: eso vive en Firestore, que para eso está. Se pega una
          vez, se guarda en la nube del equipo, y el repositorio no se entera. */}
      {apuntes.length === 0 && <PegarApuntes onTraer={(lista) => escribir(lista, equipo)} />}
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
