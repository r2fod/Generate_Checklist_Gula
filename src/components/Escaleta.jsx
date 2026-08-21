// ─── LA ESCALETA DEL DÍA ──────────────────────────────────────────────────────
// Una línea de tiempo con la hora de cada cosa, desde salir del obrador hasta cerrar
// el camión. Vive en el Modo carga y al lado de los cronómetros a propósito: cada
// tramo dice a qué hora TOCABA y el cronómetro de al lado, cuánto se tardó de verdad.
//
// Va plegada por defecto. Quien está cargando el camión quiere ver la lista, no una
// escaleta; quien la necesita —el que organiza la salida— la abre una vez el día antes.
import { useState } from "react";
import { CalendarClock, ChevronDown, AlertTriangle } from "lucide-react";
import { escaletaDelEvento, resumenEscaleta } from "../escaleta.js";

const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);

export default function Escaleta({ datos }) {
  const [abierto, setAbierto] = useState(false);
  const tramos = escaletaDelEvento(datos);
  // Sin hora de inicio no hay escaleta que valga, y enseñar una que empieza a las 00:00
  // sería enseñar una mentira ordenada. Se calla y ya está.
  if (!tramos.length) return null;

  const prep = tramos.find(t => t.fase === "prep");
  const tarde = prep && prep.desfaseMin > 15;

  return (
    <div className="cal-ratios escaleta">
      <button type="button" className="cal-ratios-cab" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
        <CalendarClock size={16} aria-hidden="true" />
        <span className="cal-ratios-titulo">
          Escaleta del día
          <em> · {resumenEscaleta(tramos)}</em>
        </span>
        {tarde && <AlertTriangle size={15} aria-hidden="true" className="escaleta-alerta-icono" />}
        <ChevronDown size={16} aria-hidden="true" className={`cal-ratios-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-ratios-cuerpo">
          {/* Lo que ya se ha decidido manda sobre lo estimado, pero el desfase se dice:
              si el equipo entra hora y media más tarde de lo que sale la cuenta, eso no
              es un detalle, es tiempo que va a faltar en el montaje. */}
          {tarde && (
            <p className="escaleta-alerta">
              <AlertTriangle size={14} aria-hidden="true" />
              El equipo de logística entra a las {prep.horaDecidida} y la cuenta dice
              que hay que empezar a las {prep.hora}: son {fmtMin(prep.desfaseMin)} de menos.
              O se entra antes, o se va con el tiempo justo.
            </p>
          )}
          <ol className="escaleta-lista">
            {tramos.map((t, i) => (
              <li className={`escaleta-tramo es-${t.fase}`} key={`${t.fase}-${i}`}>
                <span className="escaleta-hora">{t.hora}</span>
                <span className="escaleta-cuerpo">
                  <span className="escaleta-titulo">{t.titulo}</span>
                  <span className="escaleta-dura">
                    {fmtMin(t.minutos)} · hasta {t.fin}
                    {/* El viaje no lo sabe la app: se marca en vez de disimularlo. */}
                    {t.estimado && <em> · a ojo, corrígelo</em>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="cal-ratios-nota">
            Se calcula hacia atrás desde la hora de inicio, que es la única que no se
            negocia. Los tramos de preparación, carga, montaje y recogida salen de los
            mismos tiempos estimados de aquí arriba; el viaje no lo sabe la app.
          </p>
        </div>
      )}
    </div>
  );
}
