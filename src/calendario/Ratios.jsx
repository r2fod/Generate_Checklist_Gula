// ─── CUÁNTA GENTE POR COMENSAL ────────────────────────────────────────────────
// El único número de todo el cálculo de personal que de verdad cambia de un catering a
// otro: cuántos comensales lleva un camarero. De él sale la cifra de sala, y de la cifra
// de sala salen los delantales, las bandejas, los litos y los menús de personal.
//
// Los de partida salieron de contar el personal real de 19 eventos. Los de cumpleaños y
// producción NO: nadie los ha medido, y hasta que alguien ponga el suyo la app lo avisa
// en cada tarjeta. Ponerlo aquí es lo que quita ese aviso — porque entonces el número ya
// no es una suposición, sale de quien ha hecho el evento.
//
// No sabe nada de Firestore, igual que el resto del calendario: recibe los valores y
// avisa de los cambios.
import { useState } from "react";
import { Users, ChevronDown, RotateCcw } from "lucide-react";
import { PAX_POR_CAMARERO } from "../personal.js";
import { TIPOS } from "./apuntes.js";

// Los tramos de cocina y logística NO se editan aquí, y es a propósito: no son una
// división sino escalones medidos (2 hasta 40 pax, 3 hasta 60…), y logística ni siquiera
// escala con los comensales — depende del camión, que cuesta lo mismo cargarlo con 60
// que con 140. Convertirlos en una tabla editable sería mucha pantalla para un número
// que la hoja de costes daba clavado.
export default function Ratios({ ratios, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const tipos = Object.keys(PAX_POR_CAMARERO);
  const tocados = tipos.filter(t => (ratios[t] ?? PAX_POR_CAMARERO[t]) !== PAX_POR_CAMARERO[t]);

  const poner = (tipo, valor) => {
    const n = Number(valor);
    onCambiar({ ...ratios, [tipo]: Number.isFinite(n) && n > 0 ? n : PAX_POR_CAMARERO[tipo] });
  };

  return (
    <div className="cal-ratios">
      <button type="button" className="cal-ratios-cab" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
        <Users size={16} aria-hidden="true" />
        <span className="cal-ratios-titulo">
          Gente por comensal
          {tocados.length > 0 && <em> · {tocados.length} ajustado{tocados.length === 1 ? "" : "s"}</em>}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`cal-ratios-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-ratios-cuerpo">
          <p className="cal-ratios-nota">
            Un camarero cada cuántos comensales. De aquí sale la gente de sala, y con ella
            los delantales, las bandejas y los menús de personal. Cocina y logística van
            por tramos medidos y no se tocan.
          </p>

          {tipos.map(tipo => {
            const valor = ratios[tipo] ?? PAX_POR_CAMARERO[tipo];
            const cambiado = valor !== PAX_POR_CAMARERO[tipo];
            const medido = tipo !== "cumpleanos" && tipo !== "produccion";
            return (
              <div className={`cal-ratio${cambiado ? " es-cambiado" : ""}`} key={tipo}>
                <span className="cal-ratio-nombre">
                  {(TIPOS[tipo] || {}).nombre || tipo}
                  {!medido && !cambiado && <em className="cal-ratio-avisa">sin comprobar</em>}
                </span>
                <label className="cal-ratio-campo">
                  <span className="cal-ratio-uno">1 cada</span>
                  <input
                    type="number" min="1" max="60" inputMode="numeric"
                    value={valor}
                    aria-label={`Comensales por camarero en ${(TIPOS[tipo] || {}).nombre || tipo}`}
                    onChange={e => poner(tipo, e.target.value)}
                  />
                </label>
                {/* Volver al de partida sin tener que acordarse de cuál era */}
                <button
                  type="button"
                  className="cal-ratio-volver"
                  disabled={!cambiado}
                  title={`Volver a ${PAX_POR_CAMARERO[tipo]}`}
                  aria-label={`Volver al valor de partida en ${(TIPOS[tipo] || {}).nombre || tipo}`}
                  onClick={() => poner(tipo, PAX_POR_CAMARERO[tipo])}
                >
                  <RotateCcw size={13} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
