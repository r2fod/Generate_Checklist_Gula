// ─── UN NÚMERO CON MÍNIMO QUE SE PUEDE BORRAR Y REESCRIBIR ─────────────────────
// Con value={x} y el mínimo aplicado en cada tecla, al vaciar el campo saltaba al
// mínimo ("1") y escribir "2" daba "12". Mientras se escribe, lo tecleado vive aquí;
// al estado solo llega un número válido, y al salir del campo vuelve a enseñar el
// de verdad. Mismo arreglo que el del formulario de la oficina.
import { useState } from "react";

export default function CampoNumero({ valor, min = 1, onCambio, className = "form-input", ...resto }) {
  const [texto, setTexto] = useState(null);
  return (
    <input
      type="number" className={className} min={min} {...resto}
      value={texto ?? valor}
      onChange={e => {
        setTexto(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n) && n >= min) onCambio(n);
      }}
      onBlur={() => setTexto(null)}
    />
  );
}
