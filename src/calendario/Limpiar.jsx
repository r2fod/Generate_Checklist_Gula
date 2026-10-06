// ─── LIMPIAR EL CALENDARIO ────────────────────────────────────────────────────
// Lo que sobra tras las importaciones (repetidos, "posibles" ya confirmados, el mismo
// evento leído también en el mes de al lado), a la vista y con su casilla. La cuenta de
// qué sobra está en limpieza.js; aquí solo se enseña y se borra lo que la persona deja
// marcado, después de confirmarlo, y con "Deshacer" mientras no se cierre la pantalla.
// Y lo que esa cuenta no ve (solo mira eventos), desde una lista pegada (grupoDeLista).
//
// Borrar es escribir la lista sin esos apuntes (onCambiar), igual que el botón "Borrar"
// del editor pero de golpe: no hace falta ningún permiso nuevo, y quien entra con el
// enlace de solo mirar no lo ve (lo monta solo quien puede escribir).
//
// Vive aparte, como Traer, porque lo montan LOS DOS calendarios: la app suelta y la
// vista de dentro de la checklist.
import { useMemo, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { sugerenciasDeLimpieza, grupoDeLista } from "./limpieza.js";
import { aFecha } from "./apuntes.js";

const MOTIVO = {
  repetido: "El mismo evento dos veces el mismo día",
  posible: "Era «posible» y ya está confirmado ese día",
  mes: "El mismo evento con un mes justo de diferencia",
  dia: "El mismo evento en días seguidos",
  lista: "Los de la lista que has pegado",
};
// Solo el del mes, el de días seguidos y el de la lista necesitan explicación: los otros se ven a simple vista
const AYUDA = {
  mes: "La hoja de pared pinta al principio y al final de cada mes días del mes de al lado, y al traerla se leyeron con el mes equivocado. Mira cuál es el día de verdad.",
  dia: "Uno de los dos tiene el día mal. Mira cuál es el bueno y marca el otro.",
  lista: "Lo que tiene checklist o personal sale sin marcar: ese, decídelo tú.",
};

const fechaConDia = (iso) => {
  const f = aFecha(iso);
  return f ? f.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : iso;
};

export default function Limpiar({ apuntes, onCambiar }) {
  // La lista pegada se guarda como texto y se vuelve a buscar con cada cambio del
  // calendario: si otro dispositivo borra uno mientras tanto, deja de salir marcado.
  const [textoLista, setTextoLista] = useState("");
  const deLista = useMemo(() => (textoLista ? grupoDeLista(apuntes, textoLista) : null), [apuntes, textoLista]);
  const sugerencias = useMemo(() => sugerenciasDeLimpieza(apuntes), [apuntes]);
  const grupos = useMemo(() => (deLista?.grupo ? [deLista.grupo, ...sugerencias] : sugerencias), [deLista, sugerencias]);
  const sugeridos = useMemo(() => new Set(grupos.flatMap(g => g.quitar)), [grupos]);
  const [abierto, setAbierto] = useState(false);
  // null = los que sugiere limpieza.js; en cuanto se toca una casilla, lo que se marque
  const [marcados, setMarcados] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [borrados, setBorrados] = useState(null);
  const [pegando, setPegando] = useState(false);
  const [texto, setTexto] = useState("");
  const [errorLista, setErrorLista] = useState("");

  if (!apuntes.length) return null;

  const marcarLista = () => {
    const r = grupoDeLista(apuntes, texto);
    if (r.error) return setErrorLista(r.error);
    setTextoLista(texto);
    setTexto("");
    setPegando(false);
    setMarcados(null); // que manden las marcas de la lista recién pegada
    setConfirmando(false);
  };
  const quitarLista = () => { setTextoLista(""); setMarcados(null); setConfirmando(false); };

  const elegidos = marcados ?? sugeridos;
  const aBorrar = apuntes.filter(a => elegidos.has(a.id));

  const alternar = (id) => {
    const siguiente = new Set(elegidos);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    setMarcados(siguiente);
    setConfirmando(false);
  };
  const borrar = () => {
    onCambiar(apuntes.filter(a => !elegidos.has(a.id)));
    setBorrados(aBorrar);
    setMarcados(null);
    setConfirmando(false);
    setTextoLista(""); // ya está hecho: si siguiera, saldrían todos como "no están"
  };
  const deshacer = () => {
    onCambiar([...apuntes, ...borrados]);
    setBorrados(null);
  };

  return (
    <div className="cal-ratios cal-limpiar">
      <button type="button" className="cal-ratios-cab" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
        <Sparkles size={16} aria-hidden="true" />
        <span className="cal-ratios-titulo">
          Limpiar el calendario
          <em>{grupos.length ? `${grupos.length} por revisar` : "todo en orden"}</em>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`cal-ratios-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-ratios-cuerpo">
          {borrados && (
            <div className="cal-limpiar-hecho" role="status">
              <span>{borrados.length === 1 ? "Borrado 1 apunte." : `Borrados ${borrados.length} apuntes.`}</span>
              <button type="button" className="btn btn-outline" onClick={deshacer}>Deshacer</button>
            </div>
          )}

          {grupos.length === 0 ? (
            <p className="cal-ratios-nota">No hay repetidos, ni «posibles» ya confirmados, ni eventos repetidos con un mes de diferencia.</p>
          ) : (
            <>
              <p className="cal-ratios-nota">
                Van marcados los que probablemente sobran. Revísalos: no se borra nada hasta que lo confirmes,
                y lo que tiene checklist o personal no se marca nunca solo.
              </p>
              <ul className="cal-limpiar-lista">
                {grupos.map(g => (
                  <li key={`${g.clase}:${g.apuntes.map(a => a.id).join("|")}`} className={`cal-limpiar-grupo es-${g.clase}`}>
                    <span className="cal-limpiar-motivo">{MOTIVO[g.clase]}</span>
                    {AYUDA[g.clase] && <span className="cal-limpiar-ayuda">{AYUDA[g.clase]}</span>}
                    {g.apuntes.map(a => {
                      const datos = [
                        fechaConDia(a.fecha), a.hora, a.pax && `${a.pax} pax`, a.sitio,
                        a.evento && "con checklist", a.personal?.length && "con personal",
                      ].filter(Boolean).join(" · ");
                      return (
                        <label key={a.id} className={`cal-limpiar-fila${elegidos.has(a.id) ? " es-marcado" : ""}`}>
                          <input type="checkbox" checked={elegidos.has(a.id)} onChange={() => alternar(a.id)} />
                          <span className="cal-limpiar-caja" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                          <span className="cal-limpiar-texto">
                            <span className="cal-limpiar-titulo">{a.titulo}</span>
                            <span className="cal-limpiar-datos">{datos}</span>
                          </span>
                        </label>
                      );
                    })}
                  </li>
                ))}
              </ul>
              <div className="cal-limpiar-acciones">
                {confirmando ? (
                  <>
                    <span className="cal-limpiar-pregunta">
                      ¿Borrar {aBorrar.length === 1 ? "1 apunte" : `${aBorrar.length} apuntes`}?
                    </span>
                    <button type="button" className="btn btn-outline" onClick={() => setConfirmando(false)}>Cancelar</button>
                    <button type="button" className="btn cal-limpiar-borrar" onClick={borrar}>Sí, borrar</button>
                  </>
                ) : (
                  <button type="button" className="btn btn-outline cal-limpiar-borrar" disabled={!aBorrar.length}
                    onClick={() => setConfirmando(true)}>
                    Borrar {aBorrar.length === 1 ? "1 marcado" : `${aBorrar.length} marcados`}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Lo que las sugerencias no ven (tareas, recogidas, días cerrados) llega en una
              lista de quien ha cruzado la hoja con la app: se pega y sale todo marcado. */}
          <div className="cal-limpiar-pegar">
            {deLista ? (
              <div className="cal-limpiar-de-lista" role="status">
                <span>
                  {deLista.grupo ? `De la lista: ${deLista.grupo.apuntes.length} encontrados, arriba.` : "No he encontrado ninguno de la lista."}
                  {deLista.noEstan.length > 0 && ` ${deLista.noEstan.length === 1 ? "1 ya no está" : `${deLista.noEstan.length} ya no están`} en el calendario.`}
                </span>
                <button type="button" className="btn btn-ghost" onClick={quitarLista}>Quitar la lista</button>
              </div>
            ) : pegando ? (
              <>
                <span className="cal-limpiar-ayuda">Pega la lista de lo que sobra (la que te han pasado). Solo se marca: no se borra nada hasta que lo confirmes.</span>
                <textarea
                  className="cal-traer-texto"
                  rows={4}
                  value={texto}
                  onChange={e => { setTexto(e.target.value); setErrorLista(""); }}
                  placeholder='["2026-10-28_ejemplo", {"fecha":"2026-11-02","titulo":"Día cerrado"}]'
                />
                {errorLista && <span className="cal-traer-error">{errorLista}</span>}
                <div className="cal-traer-botones">
                  <button type="button" className="btn btn-green" disabled={!texto.trim()} onClick={marcarLista}>Marcar los de la lista</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setPegando(false); setTexto(""); setErrorLista(""); }}>Cancelar</button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn-outline cal-limpiar-abrir-pegar" onClick={() => setPegando(true)}>
                Pegar una lista de lo que sobra
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
