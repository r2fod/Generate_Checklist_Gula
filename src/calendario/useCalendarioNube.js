// ─── EL CALENDARIO, ENCHUFADO A LA NUBE ───────────────────────────────────────
// Calendario.jsx y Equipo.jsx no saben nada de Firestore: reciben las listas y avisan de
// los cambios. Esto es lo que las trae y las guarda.
//
// Vive aquí y no dentro de la app del calendario porque lo usan DOS sitios: la app suelta
// (/calendario/) y la vista de dentro de la checklist, para poder ir del mes a la boda
// sin cambiar de app. Con una copia en cada uno, el día que se toque uno el otro se
// queda atrás — y son datos compartidos por todo el equipo.
import { useEffect, useState } from "react";
import { saneaLista, saneaEquipo } from "./apuntes.js";
import { nubeActiva, cargarCalendarioNube, guardarCalendarioNube, suscribirCalendarioNube } from "../nube.js";

export default function useCalendarioNube() {
  const [apuntes, setApuntes] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!nubeActiva()) { setCargando(false); return; }
    let vivo = true;
    cargarCalendarioNube()
      .then(d => { if (vivo && d) { setApuntes(saneaLista(d.apuntes)); setEquipo(saneaEquipo(d.equipo)); } })
      .catch(() => { /* sin conexión: se queda vacío y la suscripción lo traerá */ })
      .finally(() => { if (vivo) setCargando(false); });
    // Y en vivo: si alguien apunta una boda desde otro móvil, aparece sola. Es un
    // calendario de equipo; tener que recargar para ver lo que acaba de poner otro lo
    // convertiría otra vez en una hoja que hay que refrescar.
    const corta = suscribirCalendarioNube(({ apuntes: nuevos, equipo: suEquipo }) => {
      if (!vivo) return;
      setApuntes(saneaLista(nuevos));
      setEquipo(saneaEquipo(suEquipo));
    });
    return () => { vivo = false; corta(); };
  }, []);

  // Se guarda la lista entera, no el apunte suelto: son sesenta apuntes de cuatro
  // campos, cabe de sobra en un documento, y así no hay que resolver mezclas raras.
  //
  // Apuntes y equipo van en el MISMO documento, así que cada escritura manda las dos
  // listas. Se pasan explícitas —y no se leen del estado aquí dentro— para que guardar
  // el equipo no suba una foto vieja de los apuntes, ni al revés.
  const escribir = (siguienteApuntes, siguienteEquipo) => {
    const apuntesLimpios = saneaLista(siguienteApuntes);
    const equipoLimpio = saneaEquipo(siguienteEquipo);
    setApuntes(apuntesLimpios);      // se pinta ya, sin esperar a la nube
    setEquipo(equipoLimpio);
    guardarCalendarioNube(apuntesLimpios, equipoLimpio).catch(() => { /* se reintenta al siguiente cambio */ });
  };

  return {
    apuntes,
    equipo,
    cargando,
    traer: (lista) => escribir(lista, equipo),
    guardar: (apunte) => escribir([...apuntes.filter(a => a.id !== apunte.id), apunte], equipo),
    borrar: (id) => escribir(apuntes.filter(a => a.id !== id), equipo),
    cambiarEquipo: (siguiente) => escribir(apuntes, siguiente),
  };
}
