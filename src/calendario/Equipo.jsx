// ─── QUIÉN FORMA EL EQUIPO ────────────────────────────────────────────────────
// Este panel no sabe nada de Firestore, igual que Calendario.jsx: recibe la lista y
// avisa de los cambios. Así lo puede montar tanto la app del calendario (que lo guarda
// en la nube) como el banco de pruebas (que lo guarda en memoria) — y mañana la
// checklist, cuando lleve el calendario dentro.
import { useState } from "react";
import { Users, X, ChevronDown } from "lucide-react";

// Quién forma el equipo. Sin esta lista el calendario sabe que el 10 hay dos bodas,
// pero no que ese día solo quedan dos personas — que es la mitad de la gracia.
//
// Se configura aquí, en la app, y se guarda en Firestore junto a los apuntes: son
// nombres de gente real y el repositorio es público, así que en el código no van.
export default function Equipo({ equipo, onCambiar }) {
  // Arranca abierto solo si no hay nadie: es entonces cuando hay algo que hacer. Con el
  // equipo ya puesto es un ajuste que se toca una vez al año, y no debe robarle sitio
  // al mes en un móvil.
  const [abierto, setAbierto] = useState(equipo.length === 0);
  const [nombre, setNombre] = useState("");
  const [apodos, setApodos] = useState("");
  // A quién se está editando. Sin esto solo se podía añadir y quitar: cambiar un nombre
  // mal escrito obligaba a borrar a la persona y volver a darla de alta, y corregirle un
  // apodo funcionaba —reescribiendo el mismo nombre— pero no había forma de saberlo.
  const [editando, setEditando] = useState("");

  const empezarAEditar = (p) => {
    setEditando(p.nombre);
    setNombre(p.nombre);
    // El primer apodo es siempre el propio nombre, puesto por saneaEquipo: no se enseña
    // porque no lo escribió nadie.
    setApodos(p.apodos.slice(1).join(", "));
  };

  const cancelar = () => { setEditando(""); setNombre(""); setApodos(""); };

  const anadir = () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    // Fuera el que se está editando (por su nombre VIEJO, que es el que puede haber
    // cambiado) y fuera cualquiera que ya se llame igual, para no duplicar.
    const resto = equipo.filter(p =>
      p.nombre.toLowerCase() !== limpio.toLowerCase()
      && p.nombre.toLowerCase() !== editando.toLowerCase());
    const nuevo = { nombre: limpio, apodos: apodos.split(/[,;]/).map(a => a.trim()).filter(Boolean) };
    // Se conserva el sitio que ocupaba, para que al corregir una letra no salte al final
    const donde = equipo.findIndex(p => p.nombre.toLowerCase() === editando.toLowerCase());
    if (editando && donde >= 0) resto.splice(Math.min(donde, resto.length), 0, nuevo);
    else resto.push(nuevo);
    onCambiar(resto);
    cancelar();
  };

  return (
    <div className={`cal-equipo${equipo.length === 0 ? " es-vacio" : ""}`}>
      <button
        type="button"
        className="cal-equipo-cab"
        aria-expanded={abierto}
        onClick={() => setAbierto(v => !v)}
      >
        <Users size={16} aria-hidden="true" />
        <span className="cal-equipo-titulo">
          {equipo.length === 0 ? "Configura el equipo" : `Equipo · ${equipo.length} ${equipo.length === 1 ? "persona" : "personas"}`}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`cal-equipo-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-equipo-cuerpo">
          <p className="cal-equipo-nota">
            {equipo.length === 0
              ? "Apunta aquí a quien trabaja. Con la lista puesta, el calendario avisa de cuánta gente queda un día con dos eventos."
              : "Los apodos son para que “VACAS FULA” y “Vacaciones Fulanita” cuenten como la misma persona."}
          </p>

          {equipo.length > 0 && (
            <ul className="cal-equipo-lista">
              {equipo.map(p => (
                <li className={`cal-persona${editando === p.nombre ? " es-editando" : ""}`} key={p.nombre}>
                  {/* Tocar a alguien lo carga en el formulario para corregirlo. Antes el
                      chip no hacía nada y no había forma de cambiar un nombre. */}
                  <button
                    type="button"
                    className="cal-persona-editar"
                    aria-label={`Editar a ${p.nombre}`}
                    onClick={() => empezarAEditar(p)}
                  >
                    <span className="cal-persona-nombre">{p.nombre}</span>
                    {p.apodos.length > 1 && (
                      <span className="cal-persona-apodos">{p.apodos.slice(1).join(", ")}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="cal-persona-quitar"
                    aria-label={`Quitar a ${p.nombre} del equipo`}
                    onClick={() => { if (editando === p.nombre) cancelar(); onCambiar(equipo.filter(q => q.nombre !== p.nombre)); }}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="cal-equipo-form">
            <label className="cal-equipo-campo">
              <span>Nombre</span>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") anadir(); }}
                placeholder="Fulanita"
              />
            </label>
            <label className="cal-equipo-campo">
              <span>Apodos <em>(opcional)</em></span>
              <input
                type="text"
                value={apodos}
                onChange={e => setApodos(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") anadir(); }}
                placeholder="fula, fulani"
              />
            </label>
            <button type="button" className="btn btn-green cal-equipo-anadir" disabled={!nombre.trim()} onClick={anadir}>
              {editando ? "Guardar" : "Añadir"}
            </button>
            {editando && (
              <button type="button" className="btn btn-ghost cal-equipo-anadir" onClick={cancelar}>Cancelar</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
