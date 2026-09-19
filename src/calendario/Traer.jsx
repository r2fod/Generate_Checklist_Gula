// ─── TRAER APUNTES AL CALENDARIO ──────────────────────────────────────────────
// Pegar una lista en JSON para meter de golpe lo que hubiera en otro sitio (la hoja de
// pared, otro calendario). Con el calendario vacío sale siempre abierto: es lo primero
// que hace falta. Con apuntes ya puestos, empieza plegado (mismo patrón que
// "Compartir", justo debajo) y solo AÑADE: un apunte cuyo id (fecha + título, ver
// idDeApunte en apuntes.js) coincida con uno que ya había no se toca — pegar de más
// nunca puede pisar un apunte que alguien ya haya editado a mano.
//
// Vive aparte porque lo montan LOS DOS calendarios: la app suelta (/calendario/) y la
// vista de dentro de la checklist. Estuvo solo en la app suelta, y quien lo abría desde
// la checklist se encontraba un mes vacío y ninguna forma de rellenarlo.
//
// HUBO TAMBIÉN una importación por enlace ("#traer=<datos>"): se usó una vez para traer
// la hoja de Google y se quitó en cuanto terminó, a propósito. Mientras existía,
// cualquiera que pasara un enlace preparado a alguien con sesión podía escribir en el
// calendario del equipo. Los datos NUNCA estuvieron en el código —viajaban en el
// fragmento de la dirección, que no llega a ningún servidor—, pero una puerta que no se
// usa es una puerta que sobra. Si algún día hace falta otra vez, está en el historial.
//
// Los nombres de clientes y las vacaciones del equipo son datos de personas y el
// repositorio es público: eso vive en Firestore, y aquí solo está el mecanismo, vacío.
import { useState } from "react";
import { ChevronDown, Upload } from "lucide-react";
import { saneaLista, mezclaApuntes } from "./apuntes.js";

export default function Traer({ apuntes, onTraer }) {
  const vacio = apuntes.length === 0;
  const [abierto, setAbierto] = useState(vacio);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [anadidos, setAnadidos] = useState(null);

  const traer = () => {
    try {
      const lista = saneaLista(JSON.parse(texto));
      if (!lista.length) return setError("No he encontrado ningún apunte válido. Cada uno necesita al menos fecha y título.");
      // Con el calendario vacío no hay nada que pisar: entra tal cual. Con apuntes ya
      // puestos, lo que ya había manda (mezclaApuntes, en apuntes.js).
      const nuevos = vacio ? lista : mezclaApuntes(apuntes, lista);
      onTraer([...apuntes, ...nuevos]);
      setAnadidos(nuevos.length);
      setTexto("");
    } catch (e) {
      setError("Eso no es JSON válido. Tiene que ser una lista entre corchetes.");
    }
  };

  if (!vacio && !abierto) {
    return (
      <button type="button" className="cal-traer-cab" onClick={() => setAbierto(true)}>
        <Upload size={15} aria-hidden="true" />
        <span>Añadir varios apuntes de golpe</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="cal-traer">
      <strong>{vacio ? "El calendario está vacío." : "Añadir varios apuntes de golpe"}</strong>
      <span>
        {vacio
          ? "Puedes apuntar los eventos uno a uno, o pegar aquí una lista para traerlos todos de golpe."
          : "Se añaden a los que ya hay: uno que coincida en fecha y título con otro que ya estaba no se toca."}
      </span>
      <textarea
        className="cal-traer-texto"
        rows={4}
        value={texto}
        onChange={e => { setTexto(e.target.value); setError(""); setAnadidos(null); }}
        placeholder='[{"fecha":"2026-09-13","titulo":"Boda ...","tipo":"boda"}]'
      />
      {error && <span className="cal-traer-error">{error}</span>}
      {anadidos !== null && !error && (
        <span className="cal-traer-ok">
          {anadidos > 0 ? `Añadidos ${anadidos} apuntes nuevos.` : "Nada nuevo: todos coincidían con los que ya había."}
        </span>
      )}
      <div className="cal-traer-botones">
        <button className="btn btn-green" disabled={!texto.trim()} onClick={traer}>Traer los apuntes</button>
        {!vacio && <button type="button" className="btn btn-ghost" onClick={() => setAbierto(false)}>Cerrar</button>}
      </div>
    </div>
  );
}
