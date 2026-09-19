// ─── CUÁNTA COMIDA POR TIPO DE EVENTO (PAELLA Y BANDEJAS) ─────────────────────
// El hermano de los paneles de bebida y hielo, con la misma regla: el ajuste se
// hace donde se ve el dato que lo justifica —en el Resumen del Modo carga, donde
// están, uno al lado del otro, lo que salió y lo que volvió.
//
// La nota dice la convención, que es lo que decide si el dato existe: lo que se
// marca como vuelto es lo que NO se usó — en la paella, las que no salieron; en
// las bandejas, las que no se usaron para pasar. Es la misma convención que la
// bebida ya usa (lo vuelto es lo sin abrir), hecha explícita para el equipo.
import { useState } from "react";
import { UtensilsCrossed, ChevronDown, RotateCcw, Check } from "lucide-react";
import { COMIDAS, CLAVES_COMIDA, conFactorComida } from "../comida.js";
import { TIPOS_BEBIDA, FACTOR_NEUTRO } from "../bebida.js";
import { enTexto, enNumero } from "../texto.js";
import { NOMBRE_TIPO } from "./PanelBebida.jsx";

export default function PanelComida({ factores = {}, calibracion = {}, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [comida, setComida] = useState(CLAVES_COMIDA[0]);
  // Lo que se está escribiendo, sin sanear: igual que en los paneles hermanos,
  // borrar el "1" de "1,2" para escribir "0,9" no puede devolver el campo a 1 a
  // mitad de camino.
  const [enCurso, setEnCurso] = useState({});

  const ajustados = TIPOS_BEBIDA.reduce((acc, t) =>
    acc + CLAVES_COMIDA.filter(k => (factores[t]?.[k] ?? FACTOR_NEUTRO) !== FACTOR_NEUTRO).length, 0);
  const medidos = Object.values(calibracion).reduce((acc, fila) => acc + Object.keys(fila).length, 0);

  const poner = (tipo, valor) => onCambiar(conFactorComida(factores, tipo, comida, valor));

  return (
    <div className="cal-ratios">
      <button type="button" className="cal-ratios-cab" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
        <UtensilsCrossed size={16} aria-hidden="true" />
        <span className="cal-ratios-titulo">
          Paella y bandejas por tipo de evento
          {ajustados > 0 && <em> · {ajustados} ajustado{ajustados === 1 ? "" : "s"}</em>}
          {ajustados === 0 && medidos > 0 && <em> · {medidos} medido{medidos === 1 ? "" : "s"} sin aplicar</em>}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`cal-ratios-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-ratios-cuerpo">
          <p className="cal-ratios-nota">
            Un multiplicador sobre lo que carga la app hoy: 1 es lo de siempre, 0,6 es
            un 40% menos. En equipo, lo que se marca como vuelto es lo que NO se usó —
            en la paella, las que no salieron; en las bandejas, las que no se usaron
            para pasar. Con 3 eventos marcados sale el número real y un botón para
            usarlo. Las paellas puestas a mano (no por la cuenta de la gente) no
            cuentan.
          </p>

          <div className="bebida-chips" role="tablist" aria-label="Comida a ajustar">
            {CLAVES_COMIDA.map(k => (
              <button
                key={k} type="button" role="tab" aria-selected={comida === k}
                className={`bebida-chip${comida === k ? " es-activa" : ""}`}
                onClick={() => setComida(k)}
              >
                {COMIDAS[k].nombre}
              </button>
            ))}
          </div>

          {TIPOS_BEBIDA.map(tipo => {
            const valor = factores[tipo]?.[comida] ?? FACTOR_NEUTRO;
            const cambiado = valor !== FACTOR_NEUTRO;
            const medida = (calibracion[tipo] || {})[comida];
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
                    aria-label={`Factor de ${COMIDAS[comida].nombre.toLowerCase()} en ${NOMBRE_TIPO[tipo]}`}
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
                    title={`Medido en ${medida.nEventos} eventos con la vuelta marcada`}
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
