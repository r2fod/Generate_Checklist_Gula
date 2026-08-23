// ─── SUSCRIPCIONES QUE PUEDEN ESPERAR ─────────────────────────────────────────
// No todo lo que la app escucha en Firestore hace falta para pintar la checklist. La
// memoria del asistente, sus objetivos, sus tareas y el catálogo de precios no se ven en
// la primera pantalla: se usan al abrir el asistente o al entrar en Modo carga. Aun así
// se pedían las cuatro en el arranque, a la vez que el archivo de eventos —que ese sí es
// lo que la persona está esperando— y compitiendo con él por la conexión y por el hilo.
//
// Aquí se retrasan al primer rato muerto (`alSobrarTiempo`, el mismo helper que precarga
// el panel del asistente). Si nunca hay rato muerto, entran igual a los tres segundos.
//
// Y de paso deja de haber cuatro efectos idénticos en App.jsx: los cuatro hacían
// "cargar, aplicar si sigo vivo, suscribir, cortar al salir", que es justo la clase de
// copia que se separa en cuanto alguien arregla una sola.
//
// **Sin `clave` en `alSobrarTiempo`**: la deduplicación por clave es permanente, y aquí
// el efecto se monta dos veces a propósito en StrictMode (montar → limpiar → montar). Con
// clave, la segunda vuelta se saltaría y la app se quedaría SIN suscripción. La guardia
// aquí es la limpieza del efecto, que cancela el rato muerto pendiente.
import { useEffect, useRef } from "react";
import { alSobrarTiempo } from "../precarga.js";

/**
 * @param {boolean} activa si no, ni se carga ni se escucha (sin sesión o sin nube)
 * @param {{ cargar: () => Promise<any>, suscribir: (cb: (d: any) => void) => () => void,
 *           aplicar: (d: any) => void, espera?: number }} pieza
 */
export default function useSuscripcionDiferida(activa, { cargar, suscribir, aplicar, espera = 3000 }) {
  // El `aplicar` es una función nueva en cada render; en una referencia para que no
  // reenganche la suscripción a cada pintada (eso son lecturas de Firestore de verdad).
  const alDia = useRef(aplicar);
  alDia.current = aplicar;

  useEffect(() => {
    if (!activa) return undefined;
    let vivo = true;
    let corta = () => {};
    const arrancar = () => {
      if (!vivo) return;
      cargar().then(d => { if (vivo && d) alDia.current(d); })
        .catch(() => { /* sin conexión: se queda con lo que hubiera y lo traerá la suscripción */ });
      corta = suscribir(d => { if (vivo && d) alDia.current(d); });
    };
    const cancelar = alSobrarTiempo(arrancar, { espera });
    return () => { vivo = false; cancelar(); corta(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cargar/suscribir son módulos, no cambian; aplicar va por referencia
  }, [activa]);
}
