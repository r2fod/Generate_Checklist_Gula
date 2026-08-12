// ─── TRAER APUNTES AL CALENDARIO ──────────────────────────────────────────────
// Dos formas de meter de golpe lo que había en otro sitio (la hoja de pared, otro
// calendario): pegando una lista, o abriendo un enlace que la lleva dentro.
//
// Vive aparte porque lo montan LOS DOS calendarios: la app suelta (/calendario/) y la
// vista de dentro de la checklist. Estaba solo en la app suelta, y quien abría el
// calendario desde la checklist se encontraba un mes vacío sin ninguna forma de
// rellenarlo. Con una copia en cada sitio volvería a pasar lo mismo en cuanto se toque
// uno de los dos.
//
// Los datos NO van nunca dentro del código: los nombres de clientes y las vacaciones del
// equipo son datos de personas, y tanto el repositorio como lo publicado en GitHub Pages
// son públicos. Aquí solo está el mecanismo, vacío.
import { useEffect, useState } from "react";
import { saneaLista } from "./apuntes.js";
import { leerApuntesDelEnlace, limpiaEnlace } from "./traer.js";

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

// Lo que trae un enlace, ANTES de meterlo. Un enlace que escribiera solo en el
// calendario del equipo sería un enlace que cualquiera puede mandar; aquí se ve qué trae
// y lo mete quien lo abre. Sin tocar el botón, no entra nada.
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

// El panel que toque, o nada. `apuntes` es lo que ya hay en el calendario: el cuadro de
// pegar solo estorba cuando ya hay cosas apuntadas, pero el del enlace sale siempre,
// porque quien abre un enlace de importación lo abre a propósito.
export default function Traer({ apuntes, onTraer }) {
  const [delEnlace, setDelEnlace] = useState(() => leerApuntesDelEnlace());

  // La dirección se limpia nada más leerla, no al aceptar: así una recarga no vuelve a
  // preguntar, y el enlace con los datos dentro no se queda en la barra de direcciones a
  // la vista de quien pase por al lado.
  useEffect(() => { if (delEnlace) limpiaEnlace(); }, [delEnlace]);

  if (delEnlace) {
    return (
      <TraerDelEnlace
        apuntes={delEnlace}
        onTraer={() => { onTraer([...apuntes, ...delEnlace]); setDelEnlace(null); }}
        onDescartar={() => setDelEnlace(null)}
      />
    );
  }
  if (apuntes.length === 0) return <PegarApuntes onTraer={(lista) => onTraer([...apuntes, ...lista])} />;
  return null;
}
