// ─── CUÁNTO SE BEBE EN CADA TIPO DE EVENTO ────────────────────────────────────
// El hermano del panel de "gente por comensal" del calendario, pero para la bebida, y
// vive AQUÍ —en el Resumen del Modo carga— por una razón: es la única pantalla donde
// están, uno al lado del otro, lo que salió y lo que volvió. El ajuste se hace donde se
// ve el dato que lo justifica, no en otro sitio de memoria.
//
// Lo que enseña es un multiplicador sobre lo de siempre: 1 es "lo que cargaba la app",
// 0,6 es "aquí se bebe un 40% menos". Y cuando hay tres eventos con la vuelta apuntada,
// enseña el número que sale del histórico y un botón para usarlo — que es la diferencia
// entre un ajuste a ojo y uno medido.
import { useState } from "react";
import { Wine, ChevronDown, RotateCcw, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import { BEBIDAS, CLAVES_BEBIDA, TIPOS_BEBIDA, FACTOR_NEUTRO, factorDe, conFactor } from "../bebida.js";
import { enTexto, enNumero } from "../texto.js";
import { comprobarBebidaSector, comprobarCambioBrusco } from "../asistente/sector.js";

// Los nombres como los lee quien ajusta: la MISMA lista para los dos paneles de ratios
// (bebida y hielo) — una sola fuente, no dos que se separen.
export const NOMBRE_TIPO = {
  boda: "Boda", comunion: "Comunión / bautizo", corporativo: "Corporativo",
  cumpleanos: "Cumpleaños", produccion: "Producción / rodaje",
};

export default function PanelBebida({ factores = {}, calibracion = {}, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [bebida, setBebida] = useState(CLAVES_BEBIDA[0]);
  // Lo que se está escribiendo, sin sanear: si se saneara en cada tecla, borrar el "1"
  // de "1,2" para escribir "0,9" devolvería el campo a 1 a mitad de camino.
  const [enCurso, setEnCurso] = useState({});

  const ajustados = TIPOS_BEBIDA.reduce((acc, t) =>
    acc + CLAVES_BEBIDA.filter(b => factorDe(factores, t, b) !== FACTOR_NEUTRO).length, 0);
  const medidos = Object.values(calibracion).reduce((acc, fila) => acc + Object.keys(fila).length, 0);

  const poner = (tipo, valor) => onCambiar(conFactor(factores, tipo, bebida, valor));

  return (
    <div className="cal-ratios">
      <button type="button" className="cal-ratios-cab" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
        <Wine size={16} aria-hidden="true" />
        <span className="cal-ratios-titulo">
          Cuánto se bebe por tipo de evento
          {ajustados > 0 && <em>{ajustados} ajustado{ajustados === 1 ? "" : "s"}</em>}
          {ajustados === 0 && medidos > 0 && <em>{medidos} medido{medidos === 1 ? "" : "s"} sin aplicar</em>}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`cal-ratios-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-ratios-cuerpo">
          <p className="cal-ratios-nota">
            Un multiplicador sobre lo que carga la app hoy: 1 es lo de siempre, 0,6 es un 40% menos.
            Todos arrancan en 1 a propósito — el ratio salió de bodas y nadie ha medido las demás.
            {" "}<strong>Ojo con las vueltas:</strong> si no se apuntan devoluciones de forma recurrente, el ratio medido saldrá a la baja y pondrá bebida de menos. Si un valor cae por debajo de la banda del sector, se resalta con aviso.
          </p>

          {/* La bebida primero y los tipos después: son 4 × 5 casillas, y enseñarlas todas
              a la vez llena la pantalla de un móvil de números que no se están mirando. */}
          <div className="bebida-chips" role="tablist" aria-label="Bebida a ajustar">
            {CLAVES_BEBIDA.map(k => (
              <button
                key={k} type="button" role="tab" aria-selected={bebida === k}
                className={`bebida-chip${bebida === k ? " es-activa" : ""}`}
                onClick={() => setBebida(k)}
              >
                {BEBIDAS[k].nombre}
              </button>
            ))}
          </div>

          {TIPOS_BEBIDA.map(tipo => {
            const valor = factorDe(factores, tipo, bebida);
            const cambiado = valor !== FACTOR_NEUTRO;
            const medida = (calibracion[tipo] || {})[bebida];
            const yaEsLaMedida = medida && Math.abs(medida.factor - valor) < 0.005;
            const texto = enCurso[tipo] !== undefined ? enCurso[tipo] : enTexto(valor);

            const compActual = comprobarBebidaSector(bebida, valor);
            const compMedida = medida ? comprobarBebidaSector(bebida, medida.factor) : null;
            const bruscoMedida = medida ? comprobarCambioBrusco(valor, medida.factor) : null;

            return (
              <div className={`cal-ratio${cambiado ? " es-cambiado" : ""}${compActual?.peligroBajo ? " es-bajo-sector" : ""}`} key={tipo}>
                <span className="cal-ratio-nombre">
                  {NOMBRE_TIPO[tipo]}
                  {!medida && <em className="cal-ratio-avisa">sin medir</em>}
                  {medida?.ajustadoPorSuelo && (
                    <em className="cal-ratio-avisa es-suelo" title={`La medición daba ×${enTexto(medida.factorBruto)}, pero se frena en el suelo de seguridad del sector (×${enTexto(medida.factor)}) para no poner bebida de menos.`}>
                      <ShieldCheck size={11} aria-hidden="true" /> suelo sector
                    </em>
                  )}
                  {compActual?.peligroBajo && (
                    <em className="cal-ratio-avisa es-peligro" title={compActual.aviso}>
                      <AlertTriangle size={11} aria-hidden="true" /> {compActual.avisoCorto}
                    </em>
                  )}
                  {bruscoMedida?.esBrusco && !compActual?.peligroBajo && (
                    <em className="cal-ratio-avisa es-brusco" title={bruscoMedida.aviso}>
                      <AlertTriangle size={11} aria-hidden="true" /> {bruscoMedida.deltaPct > 0 ? "+" : ""}{bruscoMedida.deltaPct}% salto
                    </em>
                  )}
                </span>
                <label className="cal-ratio-campo">
                  <span className="cal-ratio-uno">×</span>
                  <input
                    type="text" inputMode="decimal"
                    value={texto}
                    aria-label={`Factor de ${BEBIDAS[bebida].nombre.toLowerCase()} en ${NOMBRE_TIPO[tipo]}`}
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
                    type="button"
                    className={`cal-ratio-medido${compMedida?.peligroBajo ? " es-alerta-sector" : ""}${bruscoMedida?.esBrusco ? " es-brusco" : ""}`}
                    title={compMedida?.peligroBajo
                      ? `Medido en ${medida.nEventos} eventos pero queda por debajo del sector (${enTexto(compMedida.ratioEfectivo)} vs mín ${enTexto(compMedida.banda[0])} ${compMedida.unidad}). ¡Cuidado si faltaron vueltas por registrar!`
                      : (bruscoMedida?.esBrusco
                          ? `${bruscoMedida.aviso} (Medido en ${medida.nEventos} eventos)`
                          : `Medido en ${medida.nEventos} eventos con la vuelta apuntada`)}
                    onClick={() => { setEnCurso(p => { const q = { ...p }; delete q[tipo]; return q; }); poner(tipo, medida.factor); }}
                  >
                    {compMedida?.peligroBajo || bruscoMedida?.esBrusco ? <AlertTriangle size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                    {" "}{enTexto(medida.factor)}
                    <em> · {medida.nEventos} ev.{medida.ajustadoPorSuelo ? " (suelo)" : (bruscoMedida?.esBrusco ? ` (${bruscoMedida.deltaPct}%)` : "")}</em>
                  </button>
                )}
                {medida && yaEsLaMedida && (
                  <span
                    className={`cal-ratio-medido es-puesto${compMedida?.peligroBajo ? " es-alerta-sector" : ""}`}
                    title={compMedida?.peligroBajo
                      ? `Medido en ${medida.nEventos} eventos pero queda por debajo del sector. Revisar si faltan vueltas.`
                      : `Medido en ${medida.nEventos} eventos`}
                  >
                    {compMedida?.peligroBajo ? <AlertTriangle size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                    {" "}medido{medida.ajustadoPorSuelo ? " (suelo)" : ""}{compMedida?.peligroBajo ? " (bajo sector)" : ""}
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
