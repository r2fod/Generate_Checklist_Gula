// ─── LOS AJUSTES DEL CALENDARIO, DETRÁS DE UN BOTÓN EN EL MÓVIL ─────────────────
// Traer, limpiar, compartir, el asistente, el equipo y la gente por comensal iban
// apilados ANTES del mes: en el móvil eran media pantalla de barras antes de ver un día,
// y lo que se viene a ver es el mes. Ahí van detrás de un solo botón, cerrado al entrar.
// En pantalla grande siguen a la vista como siempre: el botón solo existe por debajo de
// 768px (calendario.css, "Ajustes plegables").
//
// Lo usan los tres sitios que montan el calendario: la app suelta, la vista dentro de la
// checklist y el banco de pruebas, para que los tres se comporten igual. El banco los
// abre al entrar (`abiertosAlEntrar`): sus pruebas son de lo que hay DENTRO de cada panel,
// a todos los anchos; el botón se prueba aparte con "?cerrados=1".
import { Children, useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { sugerenciasDeLimpieza } from "./limpieza.js";

export default function Ajustes({ apuntes, conLimpiar = true, abiertosAlEntrar = false, children }) {
  const [abiertos, setAbiertos] = useState(abiertosAlEntrar);
  // Lo que hay por limpiar se dice en el botón: dentro de un panel cerrado no se vería
  const porLimpiar = useMemo(
    () => (conLimpiar && apuntes?.length ? sugerenciasDeLimpieza(apuntes).length : 0),
    [apuntes, conLimpiar],
  );
  // Desde un enlace de solo mirar no hay ningún ajuste: ni botón que no abre nada
  if (!Children.toArray(children).length) return null;
  return (
    <div className={`cal-ajustes-bloque${abiertos ? " es-abierto" : ""}`}>
      <div className="cal-ratios cal-ajustes-boton">
        <button type="button" className="cal-ratios-cab" aria-expanded={abiertos} onClick={() => setAbiertos(v => !v)}>
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span className="cal-ratios-titulo">
            Ajustes del calendario
            <em>{porLimpiar ? `${porLimpiar} por revisar` : "traer, limpiar, compartir, equipo"}</em>
          </span>
          <ChevronDown size={16} aria-hidden="true" className={`cal-ratios-flecha${abiertos ? " es-abierta" : ""}`} />
        </button>
      </div>
      <div className="cal-ajustes">{children}</div>
    </div>
  );
}
