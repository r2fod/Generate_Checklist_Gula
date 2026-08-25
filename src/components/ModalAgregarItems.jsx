import { useState } from "react";
import { ListPlus, X, Info, AlertTriangle } from "lucide-react";
import { detectarDelimitador, normalizar, sugerirCategoria, CATEGORIA_MANUAL } from "../checklist-format.js";

// Cada línea pegada se interpreta como "nombre" o "nombre <tab/2 espacios/":"/"-"> cantidad".
// Antes de tocar la checklist se normaliza cada nombre y se compara con lo que ya existe
// (categorías actuales + items ya añadidos a mano) para no duplicar nada, y se muestra
// una pantalla de confirmación con lo que se va a añadir/omitir antes de aplicar el cambio.
function parseItemsPegados(texto) {
  const delim = detectarDelimitador(texto);
  return texto.split("\n").map(l => l.trim()).filter(Boolean).map(linea => {
    if (delim !== "," && linea.includes(delim)) {
      const [nombre, cantidad] = linea.split(delim).map(p => p.trim());
      return { label: nombre, qty: cantidad || "1" };
    }
    const m = linea.match(/^(.*\S)\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*$/) || linea.match(/^(.*\S)\s{2,}(\d+(?:[.,]\d+)?)\s*$/);
    if (m) return { label: m[1].trim(), qty: m[2].replace(",", ".") };
    return { label: linea, qty: "1" };
  }).filter(it => it.label);
}

export default function ModalAgregarItems({ checklist, categoriasDisponibles, onClose, onConfirm }) {
  const [texto, setTexto]           = useState("");
  const [error, setError]           = useState("");
  const [propuestos, setPropuestos] = useState([]); // [{label, qty, categoria, duplicado, incluir}]
  const [paso, setPaso]             = useState("pegar"); // pegar → confirmar

  const analizar = () => {
    setError("");
    if (!texto.trim()) { setError("Pega primero los items que quieras añadir, uno por línea."); return; }
    const items = parseItemsPegados(texto);
    if (items.length === 0) { setError("No he podido interpretar ningún item en el texto pegado."); return; }
    const existentes = new Set();
    checklist.forEach(cat => cat.items.forEach(([label]) => existentes.add(normalizar(label))));
    const vistos = new Set();
    const props = items.map(it => {
      const norm = normalizar(it.label);
      const duplicado = existentes.has(norm) || vistos.has(norm);
      vistos.add(norm);
      return {
        ...it,
        categoria: sugerirCategoria(it.label, categoriasDisponibles) || CATEGORIA_MANUAL,
        duplicado,
        incluir: !duplicado,
      };
    });
    setPropuestos(props);
    setPaso("confirmar");
  };

  const toggleIncluir = (idx) => setPropuestos(prev => prev.map((p, i) => i === idx ? { ...p, incluir: !p.incluir } : p));

  const confirmar = () => {
    onConfirm(propuestos.filter(p => p.incluir));
    onClose();
  };

  const nInclu = propuestos.filter(p => p.incluir).length;

  const selectStyle = {
    padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: 6, fontSize: "0.85rem",
    background: "var(--card-bg)", color: "var(--text-main)", width: "100%", cursor: "pointer",
  };

  const tituloPaso = { pegar: "Pega los items que quieras añadir", confirmar: "Revisa antes de añadir" }[paso];

  return (
    <div className="agregar-overlay" onClick={onClose}>
      <div className="agregar-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="agregar-cabecera">
          <div>
            <div className="agregar-titulo"><ListPlus size={18} /> Añadir varios items</div>
            <div className="agregar-subtitulo">{tituloPaso}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="agregar-cerrar"><X size={14} /></button>
        </div>

        <div className="agregar-cuerpo">

          {/* PASO PEGAR */}
          {paso === "pegar" && (
            <>
              <div className="agregar-nota">
                <Info size={14} />
                {/* Todo el texto en UN solo span: "agregar-nota" es flex, así que sin este
                    envoltorio cada trozo de texto que quedaba suelto entre el <em> (antes y
                    después) se convertía en su propia columna flex en vez de fluir como un
                    párrafo — se veía partido en 3 bloques uno al lado del otro. */}
                <span>Pega una lista de items, uno por línea. Puedes incluir la cantidad separada por tabulador, dos puntos o guion (ej. <em>"Vasos de tubo: 50"</em>); si no pones cantidad se añade con "1".</span>
              </div>
              <div className="agregar-campo">
                <label className="agregar-label">Items a añadir</label>
                <textarea
                  placeholder={"Vasos de tubo: 50\nManteles negros\nFocos led - 4"}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  rows={10}
                  style={{ ...selectStyle, padding: "12px 14px", fontSize: "0.85rem", fontFamily: "monospace", cursor: "text", resize: "vertical" }}
                />
              </div>
              {error && <div className="agregar-error"><AlertTriangle size={14} /> <span>{error}</span></div>}
              <button onClick={analizar} disabled={!texto.trim()} className="agregar-btn-principal">
                Analizar →
              </button>
            </>
          )}

          {/* PASO CONFIRMAR: aviso previo — qué se añade, qué se omite por estar ya en la checklist */}
          {paso === "confirmar" && (
            <>
              <div className="agregar-ok">
                <span>✓ {propuestos.length} items interpretados. Desmarca los que no quieras añadir — los ya presentes en la checklist aparecen desmarcados por defecto para no duplicar.</span>
              </div>
              <div className="agregar-lista">
                {propuestos.map((p, idx) => (
                  <label key={idx} className={`agregar-fila ${p.duplicado ? "is-duplicado" : ""}`}>
                    <input type="checkbox" checked={p.incluir} onChange={() => toggleIncluir(idx)} />
                    <div style={{ flex: 1 }}>
                      <div className="agregar-fila-nombre">{p.label} <span className="agregar-fila-qty">· {p.qty}</span></div>
                      <div className="agregar-fila-nota">
                        {p.duplicado ? "⚠ Ya existe en la checklist (se omite)" : `Se añadirá a: ${p.categoria}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="agregar-acciones">
                <button onClick={() => setPaso("pegar")} className="agregar-btn-atras">← Atrás</button>
                <button onClick={confirmar} disabled={nInclu === 0} className="agregar-btn-confirmar">
                  ✓ Añadir {nInclu} item{nInclu === 1 ? "" : "s"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
