// ─── EL CALENDARIO, ENCHUFADO A LA NUBE ───────────────────────────────────────
// Calendario.jsx y Equipo.jsx no saben nada de Firestore: reciben las listas y avisan de
// los cambios. Esto es lo que las trae y las guarda.
//
// Vive aquí y no dentro de la app del calendario porque lo usan DOS sitios: la app suelta
// (/calendario/) y la vista de dentro de la checklist, para poder ir del mes a la boda
// sin cambiar de app. Con una copia en cada uno, el día que se toque uno el otro se
// queda atrás — y son datos compartidos por todo el equipo.
//
// Y ahora tres formas de entrar, no una (ver enlace.js):
//   · sin enlace  — el equipo con sesión iniciada. Sus códigos se resuelven solos.
//   · ?cal=…      — enlace editable: el calendario de verdad, sin cuenta.
//   · ?ver=…      — enlace de mirar: una copia. No se escribe nunca desde aquí.
import { useEffect, useRef, useState } from "react";
import { saneaLista, saneaEquipo } from "./apuntes.js";
import { MODOS } from "./enlace.js";
import { nubeActiva, resolverCalendario, cargarCalendarioNube, guardarCalendarioNube, suscribirCalendarioNube } from "../nube.js";

export default function useCalendarioNube(enlace = null) {
  const [apuntes, setApuntes] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Los dos códigos, para poder ofrecer los enlaces. Solo los tiene el equipo: quien
  // entra por un enlace nunca ve el otro.
  const [codigos, setCodigos] = useState(null);
  const soloVer = Boolean(enlace && enlace.modo === MODOS.LECTURA);

  // A dónde escribir. En una referencia y no en el estado porque lo usa el guardado, y
  // una foto vieja aquí significa escribir en el documento equivocado.
  const donde = useRef({ codigo: "", ver: "" });
  const clave = enlace ? `${enlace.modo}:${enlace.codigo}` : "equipo";

  useEffect(() => {
    if (!nubeActiva()) { setCargando(false); return; }
    let vivo = true;
    let corta = () => {};

    (async () => {
      // Quien entra por enlace ya trae su código en la dirección. El equipo lo pide, y
      // de paso se estrena la carpeta propia la primera vez.
      const cs = enlace
        ? { codigo: enlace.codigo, ver: "" }
        : await resolverCalendario().catch(() => null);
      if (!vivo) return;
      if (!cs || !cs.codigo) { setCargando(false); return; }
      donde.current = { codigo: cs.codigo, ver: cs.ver || "" };
      if (!enlace) setCodigos({ codigo: cs.codigo, ver: cs.ver });

      const aplicar = (d) => {
        if (!vivo || !d) return;
        setApuntes(saneaLista(d.apuntes));
        setEquipo(saneaEquipo(d.equipo));
        // El documento de verdad lleva dentro el código de su copia. Quien edita por
        // enlace no lo sabía al entrar: lo aprende aquí, y con él puede refrescarla.
        if (d.ver) donde.current.ver = d.ver;
      };

      cargarCalendarioNube(cs.codigo)
        .then(aplicar)
        .catch(() => { /* sin conexión: se queda vacío y la suscripción lo traerá */ })
        .finally(() => { if (vivo) setCargando(false); });

      // Y en vivo: si alguien apunta una boda desde otro móvil, aparece sola. Es un
      // calendario de equipo; tener que recargar para ver lo que acaba de poner otro lo
      // convertiría otra vez en una hoja que hay que refrescar.
      corta = suscribirCalendarioNube(cs.codigo, aplicar);
    })();

    return () => { vivo = false; corta(); };
  }, [clave]);   // eslint-disable-line react-hooks/exhaustive-deps -- enlace es un objeto nuevo cada render; lo que importa es su contenido, que es "clave"

  // Se guarda la lista entera, no el apunte suelto: son sesenta apuntes de cuatro
  // campos, cabe de sobra en un documento, y así no hay que resolver mezclas raras.
  //
  // Apuntes y equipo van en el MISMO documento, así que cada escritura manda las dos
  // listas. Se pasan explícitas —y no se leen del estado aquí dentro— para que guardar
  // el equipo no suba una foto vieja de los apuntes, ni al revés.
  const escribir = (siguienteApuntes, siguienteEquipo) => {
    if (soloVer || !donde.current.codigo) return;
    const apuntesLimpios = saneaLista(siguienteApuntes);
    const equipoLimpio = saneaEquipo(siguienteEquipo);
    setApuntes(apuntesLimpios);      // se pinta ya, sin esperar a la nube
    setEquipo(equipoLimpio);
    guardarCalendarioNube(donde.current.codigo, apuntesLimpios, equipoLimpio, donde.current.ver)
      .catch(() => { /* se reintenta al siguiente cambio */ });
  };

  return {
    apuntes,
    equipo,
    cargando,
    soloVer,
    codigos,
    traer: (lista) => escribir(lista, equipo),
    guardar: (apunte) => escribir([...apuntes.filter(a => a.id !== apunte.id), apunte], equipo),
    borrar: (id) => escribir(apuntes.filter(a => a.id !== id), equipo),
    cambiarEquipo: (siguiente) => escribir(apuntes, siguiente),
  };
}
