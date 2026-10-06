import { useState } from "react";

// ─── "ACABA DE…" ──────────────────────────────────────────────────────────────
// true solo cuando `valor` pasa de no a sí con el componente ya montado. Así la
// animación de "hecho" (la casilla que rebota, la categoría que se celebra) se ve al
// marcar, y no en las cincuenta filas ya marcadas cada vez que se abre el modo carga:
// una animación CSS puesta con la clase sin más arranca también al montarse.
//
// Si cambia `grupo` no cuenta como marcar: en el modo carga Prep. y Salida son la misma
// fila con otra marca, y pasar de una pestaña a otra no es haber hecho nada.
//
// Lo de antes se guarda en el estado y se compara al pintar, que es como pide React
// guardar "lo que había en el render anterior" (sin efecto ni un repintado de más).
// `terminar` quita la marca al acabar la animación: sin eso, una categoría plegada y
// vuelta a abrir repetiría el salto de todo lo marcado en esa sesión.
export function useAcabaDe(siONo, grupo) {
  const valor = Boolean(siONo);
  const [antes, setAntes] = useState({ valor, grupo });
  const [ahora, setAhora] = useState(false);
  if (valor !== antes.valor || grupo !== antes.grupo) {
    setAntes({ valor, grupo });
    setAhora(valor && grupo === antes.grupo);
  }
  return [ahora, () => setAhora(false)];
}
