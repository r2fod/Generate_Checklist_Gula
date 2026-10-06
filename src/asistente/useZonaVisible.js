import { useEffect } from "react";

// ─── LA ZONA QUE SE VE, CON EL TECLADO ABIERTO ────────────────────────────────
// Abrir el teclado en el móvil no encoge la pantalla "de diseño": encoge la zona que
// se VE (visualViewport) y la desplaza para enseñar el campo. Un panel fijo a pantalla
// completa se queda igual de alto y de él solo se ve la parte de abajo: el asistente
// perdía la cabecera y los mensajes, y encima del campo de escribir quedaba un hueco en
// blanco (captura del dueño, Android). Mientras el panel está montado, se pega a esa
// zona: su alto (--zona-alto) y dónde empieza (--zona-arriba), que siguen al teclado
// al abrir y al cerrar. Solo en el asistente: el resto de la app sigue como estaba.
export function useZonaVisible(ref, alCambiar) {
  useEffect(() => {
    const zona = typeof window !== "undefined" ? window.visualViewport : null;
    const el = ref.current;
    if (!zona || !el) return undefined;
    const ajusta = () => {
      el.style.setProperty("--zona-alto", `${zona.height}px`);
      el.style.setProperty("--zona-arriba", `${zona.offsetTop}px`);
      if (alCambiar) alCambiar();
    };
    ajusta();
    zona.addEventListener("resize", ajusta);
    zona.addEventListener("scroll", ajusta);
    return () => {
      zona.removeEventListener("resize", ajusta);
      zona.removeEventListener("scroll", ajusta);
    };
  }, [ref, alCambiar]);
}
