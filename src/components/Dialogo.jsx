import { useState } from "react";

export default function Dialogo({ config, onCerrar }) {
  const [valor, setValor] = useState(config.valorInicial || "");
  const esPrompt = config.tipo === "prompt";
  const confirmar = () => {
    if (esPrompt && !valor.trim()) return;
    onCerrar();
    config.onConfirm(esPrompt ? valor.trim() : undefined);
  };
  return (
    <div className="dialogo-overlay" onClick={onCerrar}>
      <div className="dialogo-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={config.titulo}>
        <div className="dialogo-titulo">{config.titulo}</div>
        {config.mensaje && <p className="dialogo-mensaje">{config.mensaje}</p>}
        {esPrompt && (
          <input
            type="text"
            className="form-input"
            placeholder={config.placeholder || ""}
            value={valor}
            autoFocus
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") confirmar();
              if (e.key === "Escape") onCerrar();
            }}
          />
        )}
        <div className="dialogo-acciones">
          <button className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
          <button
            className={`btn ${config.peligro ? "btn-peligro" : "btn-green"}`}
            onClick={confirmar}
            disabled={esPrompt && !valor.trim()}
          >{config.textoConfirmar || "Aceptar"}</button>
        </div>
      </div>
    </div>
  );
}
