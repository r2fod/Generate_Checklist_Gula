import { useState } from "react";
import { Plus, X } from "lucide-react";

// Opciones "de siempre" (nombre, tipo de sitio...) que el usuario va añadiendo a mano
// con "+ Otro...". Se guardan en este navegador (no en la nube: son de comodidad) y a la
// próxima vez ya aparezcan como una opción más de la lista, en cualquier evento.
function leerExtrasGuardados(clave) {
  try { return JSON.parse(localStorage.getItem(`gula_opciones_extra::${clave}`) || "[]"); }
  catch (e) { return []; }
}
function guardarExtra(clave, valor) {
  if (!valor || !valor.trim()) return;
  try {
    const actuales = leerExtrasGuardados(clave);
    if (!actuales.includes(valor)) localStorage.setItem(`gula_opciones_extra::${clave}`, JSON.stringify([...actuales, valor]));
  } catch (e) { /* localStorage no disponible */ }
}
export default function SelectConOtro({ label, value, onChange, options, opcionNinguna }) {
  const [extras, setExtras] = useState(() => leerExtrasGuardados(label));
  const opcionesCompletas = [...options, ...extras.filter(e => !options.includes(e))];
  const esPersonalizado = value && value !== opcionNinguna && !opcionesCompletas.includes(value);
  const [modoOtro, setModoOtro] = useState(false);
  const [texto, setTexto] = useState("");
  // Guarda el texto escrito como una opción reutilizable (en este navegador) y lo
  // deja seleccionado. Así queda disponible en la lista para cualquier otro evento.
  const anadirOtro = () => {
    const val = texto.trim();
    if (!val) return;
    guardarExtra(label, val);
    setExtras(prev => (prev.includes(val) ? prev : [...prev, val]));
    onChange(val);
    setTexto("");
    setModoOtro(false);
  };
  // Guarda como opción reutilizable un valor personalizado que venía cargado del
  // evento (aún no estaba en la lista), sin tener que reescribirlo.
  const guardarValorActual = () => {
    if (!value || !value.trim()) return;
    guardarExtra(label, value);
    setExtras(prev => (prev.includes(value) ? prev : [...prev, value]));
  };
  if (modoOtro) {
    return (
      <div className="form-group">
        <span className="form-label">{label}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            className="form-input"
            autoFocus
            placeholder="Ej: Relieve grande"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); anadirOtro(); } if (e.key === "Escape") { setModoOtro(false); setTexto(""); } }}
          />
          <button
            type="button"
            className="item-action-btn item-action-add"
            title="Añadir esta opción y guardarla para otros eventos"
            aria-label="Añadir opción"
            disabled={!texto.trim()}
            onClick={anadirOtro}
          ><Plus size={14} /></button>
          <button
            type="button"
            className="item-action-btn"
            title="Cancelar y volver a la lista"
            aria-label="Cancelar"
            onClick={() => { setModoOtro(false); setTexto(""); }}
          ><X size={14} /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="form-group">
      <span className="form-label">{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <select
          className="form-select"
          style={{ flex: 1 }}
          value={value}
          onChange={e => { if (e.target.value === "__otro__") { setModoOtro(true); setTexto(""); } else onChange(e.target.value); }}
        >
          {opcionesCompletas.map(o => <option key={o} value={o}>{o}</option>)}
          {esPersonalizado && <option value={value}>{value}</option>}
          {opcionNinguna && <option value={opcionNinguna}>{opcionNinguna}</option>}
          <option value="__otro__">+ Otro...</option>
        </select>
        {esPersonalizado && (
          <button
            type="button"
            className="item-action-btn item-action-add"
            title="Guardar este valor como opción para otros eventos"
            aria-label="Guardar opción"
            onClick={guardarValorActual}
          ><Plus size={14} /></button>
        )}
      </div>
    </div>
  );
}
