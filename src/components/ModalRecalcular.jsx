import React, { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function ModalRecalcular({ cambios, onClose, onAplicar }) {
  const [decisiones, setDecisiones] = useState(() => Object.fromEntries(cambios.map(c => [c.key, "mantener"])));
  const elegir = (key, valor) => setDecisiones(prev => ({ ...prev, [key]: valor }));
  return (
    <div className="dialogo-overlay" onClick={onClose}>
      <div className="dialogo-modal recalcular-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dialogo-titulo"><RefreshCw size={16} /> Recalcular cantidades</div>
        <p className="dialogo-mensaje">
          En estas {cambios.length} cantidades el cálculo automático de ahora no coincide con lo que
          tienes puesto: o las editaste a mano (marcadas <strong>a mano</strong>) o han cambiado desde
          el último "Guardar evento". Elige para cada una si mantienes tu valor (queda fijo, no se
          volverá a mover solo) o usas el nuevo cálculo.
        </p>
        <div className="recalcular-lista">
          {cambios.map(c => (
            <div className="recalcular-row" key={c.key}>
              <div className="recalcular-nombre">
                {c.label}
                {c.aMano && <span className="recalcular-tag">a mano</span>}
                <span className="recalcular-categoria">{c.categoria}</span>
              </div>
              <div className="recalcular-opciones">
                <button
                  className={`btn btn-outline recalcular-opcion ${decisiones[c.key] === "mantener" ? "active" : ""}`}
                  onClick={() => elegir(c.key, "mantener")}
                >Mantener {c.anterior}</button>
                <button
                  className={`btn btn-outline recalcular-opcion ${decisiones[c.key] === "nuevo" ? "active" : ""}`}
                  onClick={() => elegir(c.key, "nuevo")}
                >Usar {c.nuevo}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="dialogo-acciones">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-green" onClick={() => onAplicar(decisiones)}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}
