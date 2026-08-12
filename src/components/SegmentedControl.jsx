import { memo } from "react";

// Selector de opciones en botones (Sillas, Horno, Cafetera...). Va a nivel de módulo
// a propósito: definido dentro de App, React lo trata como un componente NUEVO en cada
// render y desmonta y vuelve a montar los nueve selectores con cada tecla que se pulse.
const SegmentedControl = memo(({ value, onChange, options, label }) => (
  <div className="segment-group">
    <span className="segment-label">{label}</span>
    <div className="segmented-control">
      {options.map(opt => (
        <button key={opt} className={`segment-btn ${value === opt ? "active" : ""}`} onClick={() => onChange(opt)}>{opt}</button>
      ))}
    </div>
  </div>
));

export default SegmentedControl;
