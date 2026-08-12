// ─── EL CALENDARIO, DENTRO DE LA CHECKLIST ────────────────────────────────────
// Para ir del mes a la boda sin cambiar de app. La app suelta (/calendario/) sigue
// existiendo para quien solo necesita ver el mes y no quiere la checklist entera en el
// móvil; esto es lo mismo para quien ya está dentro.
//
// Se carga con import() perezoso desde App.jsx: quien no abra el calendario no se
// descarga ni un byte de él. Por eso el CSS se importa AQUÍ y no en App.jsx — así viaja
// con este trozo y no engorda la checklist de todos.
import { useEffect } from "react";
import { X } from "lucide-react";
import "./calendario.css";
import Calendario from "./Calendario.jsx";
import Equipo from "./Equipo.jsx";
import Traer from "./Traer.jsx";
import useCalendarioNube from "./useCalendarioNube.js";

export default function CalendarioEnChecklist({ onCerrar, onAbrirEvento }) {
  const { apuntes, equipo, cargando, traer, guardar, borrar, cambiarEquipo } = useCalendarioNube();

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
              <Traer apuntes={apuntes} onTraer={traer} />
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
