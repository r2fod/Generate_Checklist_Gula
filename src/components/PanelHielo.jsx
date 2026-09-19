// ─── CUÁNTO HIELO POR TIPO DE EVENTO ──────────────────────────────────────────
// El hermano del panel de bebida, con la misma regla: el ajuste se hace donde se ve el
// dato que lo justifica —en el Resumen del Modo carga, donde están, uno al lado del
// otro, lo que salió y lo que volvió. Aquí el multiplicador no calibra un gusto, calibra
// una merma: la pérdida por derretimiento (1,35 verano / 1,2 invierno) salió de una
// estimación, y con tres eventos con la vuelta del hielo apuntada (puede ser en kilos)
// aquí sale el número real y un botón para usarlo.
import { useState } from "react";
import { Snowflake, ChevronDown, RotateCcw, Check } from "lucide-react";
import { TIPOS_BEBIDA, FACTOR_NEUTRO } from "../bebida.js";
import { conFactorHielo } from "../calculos.js";
import { enTexto, enNumero } from "../texto.js";
import { NOMBRE_TIPO } from "./PanelBebida.jsx";

export default function PanelHielo({ factores = {}, calibracion = {}, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  // Lo que se está escribiendo, sin sanear: igual que en el panel de bebida, borrar el
  // "1" de "1,2" para escribir "0,9" no puede devolver el campo a 1 a mitad de camino.
  const [enCurso, setEnCurso] = useState({});

  const ajustados = TIPOS_BEBIDA.reduce((acc, t) =>
    acc + ((factores[t] ?? FACTOR_NEUTRO) !== FACTOR_NEUTRO ? 1 : 0), 0);
  const medidos = Object.values(calibracion).length;

  // El factor se valida y se guarda con la misma función que la app (conFactorHielo):
  // una regla, un sitio.
  const poner = (tipo, valor) => onCambiar(conFactorHielo(factores, tipo, valor));

  return (
    <div className="cal-ratios">
      <button type="button" className="cal-ratios-cab" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
        <Snowflake size={16} aria-hidden="true" />
        <span className="cal-ratios-titulo">
          Cuánto hielo por tipo de evento
          {ajustados > 0 && <em> · {ajustados} ajustado{ajustados === 1 ? "" : "s"}</em>}
          {ajustados === 0 && medidos > 0 && <em> · {medidos} medido{medidos === 1 ? "" : "s"} sin aplicar</em>}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`cal-ratios-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-ratios-cuerpo">
          <p className="cal-ratios-nota">
            Un multiplicador sobre los kilos que carga la app hoy: 1 es lo de siempre,
            0,6 es un 40% menos. La merma por derretimiento es una estimación, no una
            medición — en cuanto haya 3 eventos con la vuelta del hielo apuntada (puede
            ser en kilos), aquí sale el número real y un botón para usarlo.
          </p>

          {TIPOS_BEBIDA.map(tipo => {
            const valor = factores[tipo] ?? FACTOR_NEUTRO;
            const cambiado = valor !== FACTOR_NEUTRO;
            const medida = calibracion[tipo];
            const yaEsLaMedida = medida && Math.abs(medida.factor - valor) < 0.005;
            const texto = enCurso[tipo] !== undefined ? enCurso[tipo] : enTexto(valor);
            return (
              <div className={`cal-ratio${cambiado ? " es-cambiado" : ""}`} key={tipo}>
                <span className="cal-ratio-nombre">
                  {NOMBRE_TIPO[tipo]}
                  {!medida && <em className="cal-ratio-avisa">sin medir</em>}
                </span>
                <label className="cal-ratio-campo">
                  <span className="cal-ratio-uno">×</span>
                  <input
                    type="text" inputMode="decimal"
                    value={texto}
                    aria-label={`Factor de hielo en ${NOMBRE_TIPO[tipo]}`}
                    onChange={e => {
                      setEnCurso(p => ({ ...p, [tipo]: e.target.value }));
                      const n = enNumero(e.target.value);
                      if (Number.isFinite(n)) poner(tipo, n);
                    }}
                    // Al salir del campo se enseña lo que de verdad ha quedado guardado:
                    // si se escribió un 9, el factor se rechazó y el campo tiene que decirlo.
                    onBlur={() => setEnCurso(p => { const q = { ...p }; delete q[tipo]; return q; })}
                  />
                </label>
                {/* El número que sale del histórico, con cuántos eventos lo sostienen. Es
                    un botón porque lo único que hay que hacer con él es usarlo. */}
                {medida && !yaEsLaMedida && (
                  <button
                    type="button" className="cal-ratio-medido"
                    title={`Medido en ${medida.nEventos} eventos con la vuelta del hielo apuntada`}
                    onClick={() => { setEnCurso(p => { const q = { ...p }; delete q[tipo]; return q; }); poner(tipo, medida.factor); }}
                  >
                    <Check size={12} aria-hidden="true" /> {enTexto(medida.factor)}
                    <em> · {medida.nEventos} ev.</em>
                  </button>
                )}
                {medida && yaEsLaMedida && (
                  <span className="cal-ratio-medido es-puesto" title={`Medido en ${medida.nEventos} eventos`}>
                    <Check size={12} aria-hidden="true" /> medido
                  </span>
                )}
                <button
                  type="button" className="cal-ratio-volver"
                  disabled={!cambiado}
                  title="Volver a lo de siempre (×1)"
                  aria-label={`Volver a lo de siempre en ${NOMBRE_TIPO[tipo]}`}
                  onClick={() => { setEnCurso(p => { const q = { ...p }; delete q[tipo]; return q; }); poner(tipo, FACTOR_NEUTRO); }}
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
