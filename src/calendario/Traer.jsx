// ─── TRAER APUNTES AL CALENDARIO ──────────────────────────────────────────────
// Pegar una lista en JSON para meter de golpe lo que hubiera en otro sitio (la hoja de
// pared, otro calendario). Solo sale con el calendario vacío: es un empujón de una vez,
// no un ajuste.
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
import { saneaLista } from "./apuntes.js";

export default function Traer({ apuntes, onTraer }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");

  if (apuntes.length > 0) return null;

  const traer = () => {
    try {
      const lista = saneaLista(JSON.parse(texto));
      if (!lista.length) return setError("No he encontrado ningún apunte válido. Cada uno necesita al menos fecha y título.");
      onTraer([...apuntes, ...lista]);
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
