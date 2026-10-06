import { memo, useLayoutEffect, useRef } from "react";

// Si las opciones no caben en una fila, van de dos en dos (data-rejilla, ver el CSS) en
// vez de dejar una suelta en la segunda: "Mesas de los comensales" en el móvil eran
// tres arriba y "Redonda 2m" sola abajo, dentro de una cápsula deformada. Se mide en
// la pantalla de verdad porque depende del ancho que le toque (móvil, columna de la
// configuración en escritorio...) y del texto de cada opción.
function useRejillaSiNoCaben(ref) {
  useLayoutEffect(() => {
    const control = ref.current;
    const caja = control?.parentElement;
    if (!control || !caja || typeof ResizeObserver === "undefined") return undefined;
    let ancho = -1;
    const mide = () => {
      if (caja.clientWidth === ancho) return;
      ancho = caja.clientWidth;
      control.removeAttribute("data-rejilla");
      const filas = new Set([...control.children].map(b => b.offsetTop));
      if (filas.size > 1) control.setAttribute("data-rejilla", "");
    };
    const observador = new ResizeObserver(mide);
    observador.observe(caja);
    return () => observador.disconnect();
  }, [ref]);
}

// Selector de opciones en botones (Sillas, Horno, Cafetera...). Va a nivel de módulo
// a propósito: definido dentro de App, React lo trata como un componente NUEVO en cada
// render y desmonta y vuelve a montar los nueve selectores con cada tecla que se pulse.
const SegmentedControl = memo(({ value, onChange, options, label }) => {
  const ref = useRef(null);
  useRejillaSiNoCaben(ref);
  return (
    <div className="segment-group">
      <span className="segment-label">{label}</span>
      <div className="segmented-control" ref={ref}>
        {options.map(opt => (
          <button key={opt} className={`segment-btn ${value === opt ? "active" : ""}`} onClick={() => onChange(opt)}>{opt}</button>
        ))}
      </div>
    </div>
  );
});

export default SegmentedControl;
