// ─── EL CALENDARIO, DENTRO DE LA CHECKLIST ────────────────────────────────────
// Para ir del mes a la boda sin cambiar de app. La app suelta (/calendario/) sigue
// existiendo para quien solo necesita ver el mes y no quiere la checklist entera en el
// móvil; esto es lo mismo para quien ya está dentro.
//
// Se carga con import() perezoso desde App.jsx: quien no abra el calendario no se
// descarga ni un byte de él. Por eso el CSS se importa AQUÍ y no en App.jsx — así viaja
// con este trozo y no engorda la checklist de todos.
import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";
import "./calendario.css";
import Calendario from "./Calendario.jsx";
import Equipo from "./Equipo.jsx";
import Compartir from "./Compartir.jsx";
import Traer from "./Traer.jsx";
import useCalendarioNube from "./useCalendarioNube.js";

// Aquí dentro siempre se entra con cuenta —es la checklist del equipo—, así que no hay
// modo enlace que valorar: se pide el calendario del equipo y punto.
export default function CalendarioEnChecklist({ onCerrar, onAbrirEvento, onCrearChecklists }) {
  const { apuntes, equipo, cargando, codigos, traer, guardar, borrar, cambiarEquipo } = useCalendarioNube();
  // Qué se ha creado al abrir. Se enseña: automático no puede querer decir invisible —
  // en tu archivo aparecen eventos y tienes que poder enterarte de cuáles.
  const [creadas, setCreadas] = useState([]);
  // Una vez por apertura. Sin esta guardia sería un bucle: crear marca los apuntes, eso
  // repinta, y al repintar se volvería a mirar.
  const yaMirado = useRef(false);

  useEffect(() => {
    if (cargando || yaMirado.current || !onCrearChecklists) return;
    yaMirado.current = true;
    // Se pide DESPUÉS de cargar: con la lista todavía vacía no habría nada que crear y
    // la guardia de arriba daría el asunto por hecho para toda la sesión.
    const enlaces = onCrearChecklists(apuntes);
    if (!enlaces.length) return;
    setCreadas(enlaces.filter(e => e.nueva).map(e => e.nombre));
    // Los apuntes se marcan en UNA sola escritura, no uno a uno. Llamando a guardar()
    // tres veces seguidas, las tres parten de la MISMA foto de la lista y solo la
    // última sobreviviría: se perderían dos enlaces y esas bodas se volverían a crear
    // en la siguiente apertura, ya duplicadas.
    const porId = new Map(enlaces.map(e => [e.id, e.nombre]));
    traer(apuntes.map(a => (porId.has(a.id) ? { ...a, evento: porId.get(a.id) } : a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando]);

  // Con Escape se sale, como en el resto de pantallas grandes de la app
  useEffect(() => {
    const alPulsar = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  return (
    <div className="cal-pantalla">
      <div className="cal-pantalla-barra">
        <strong>Calendario</strong>
        <button type="button" className="cal-pantalla-cerrar" onClick={onCerrar} aria-label="Cerrar el calendario">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="cal-pantalla-cuerpo">
        {cargando
          ? <div className="cal-cargando">Cargando el calendario…</div>
          : (
            <>
              {/* Traer apuntes también desde aquí. Estaba solo en la app suelta, así que
                  quien abría el calendario desde la checklist se encontraba un mes vacío
                  y ninguna forma de rellenarlo. */}
              {creadas.length > 0 && (
                <div className="cal-creadas">
                  <Check size={15} aria-hidden="true" />
                  <span>
                    {creadas.length === 1
                      ? <>He creado la checklist de <b>{creadas[0]}</b>, que ya está cerca.</>
                      : <>He creado <b>{creadas.length} checklists</b> de eventos que ya están cerca: {creadas.join(", ")}.</>}
                    {" "}Están en tu archivo, listas para que la oficina les cuelgue los datos del formulario.
                  </span>
                  <button type="button" className="cal-creadas-cerrar" onClick={() => setCreadas([])} aria-label="Cerrar el aviso">
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
              <Traer apuntes={apuntes} onTraer={traer} />
              {/* Los enlaces para compartir, también desde aquí: el calendario se abre
                  más veces desde dentro de la checklist que en su app suelta, y tener
                  que cambiar de app para copiar un enlace es la clase de rodeo que hace
                  que no se use. */}
              <Compartir codigos={codigos} href={window.location.href} />
              <Equipo equipo={equipo} onCambiar={cambiarEquipo} />
              {/* onAbrirEvento aquí NO cambia de página: abre el evento guardado en esta
                  misma app, que es justo lo que se venía a hacer. */}
              <Calendario
                apuntes={apuntes}
                equipo={equipo}
                onGuardar={guardar}
                onBorrar={borrar}
                onAbrirEvento={onAbrirEvento}
              />
            </>
          )}
      </div>
    </div>
  );
}
