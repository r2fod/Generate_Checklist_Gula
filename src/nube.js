// ─── SINCRONIZACIÓN EN LA NUBE (Firestore) ─────────────────────────────────────
// El SDK de Firebase se carga con import() dinámico SOLO si hay configuración:
// con firebaseConfig = null la app no descarga nada extra y funciona como siempre.
// La conexión y el armazón de las suscripciones viven en firestore.js: estaban
// escritos aquí y otra vez en formulario/envios.js, con una variable de promesa en
// cada uno. Se reexporta nubeActiva porque medio proyecto la importa de aquí.
import { getDb, nubeActiva, suscribir } from "./firestore.js";

export { nubeActiva };

// ─── CÓDIGO DEL FORMULARIO DE OFICINA ─────────────────────────────────────────
// El código del link que se le pasa a la oficina vive en el archivo (colección
// "indice"), no en el navegador: si viviera en cada móvil, cada uno generaría el suyo
// y el link que la oficina ya tiene guardado dejaría de recibir la lista de eventos.
// El lector del archivo se salta todo lo que no empiece por "evt_", así que este
// documento no se cuela como si fuera un evento.
const DOC_FORMULARIO = "formulario";

export async function leerConfigFormulario() {
  const conexion = await getDb();
  if (!conexion) return { codigo: "", avisos: [] };
  const { db, fs } = conexion;
  try {
    const snap = await fs.getDoc(fs.doc(db, COL_ARCHIVO, DOC_FORMULARIO));
    if (!snap.exists()) return { codigo: "", avisos: [] };
    const d = snap.data();
    return { codigo: d.codigo || "", avisos: Array.isArray(d.avisos) ? d.avisos : [] };
  } catch (e) { return { codigo: "", avisos: [] }; }
}

export async function guardarConfigFormulario({ codigo, avisos = [] }) {
  const conexion = await getDb();
  if (!conexion) return;
  const { db, fs } = conexion;
  await fs.setDoc(fs.doc(db, COL_ARCHIVO, DOC_FORMULARIO), { codigo, avisos, actualizado: Date.now() });
}

// Id corto y legible para el link (~8 caracteres sin ambiguos: 31^8 combinaciones).
// El largo se puede pedir mayor: el calendario usa 12 porque su enlace no caduca con el
// evento —vive todo el año y da paso a la agenda entera—, así que conviene que adivinarlo
// sea mucho más caro que adivinar el de una boda concreta.
export function nuevoIdEvento(largo = 8) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: largo }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
}

// Devuelve la marca de tiempo con la que se ha guardado. Quien llama la apunta para
// reconocer DESPUÉS su propio eco cuando vuelva por la suscripción: es la única forma
// de distinguir "esto lo escribí yo hace un momento" de "esto lo ha cambiado otro".
export async function guardarEventoNube(id, estado) {
  const conexion = await getDb();
  if (!conexion) return null;
  const { db, fs } = conexion;
  const actualizado = Date.now();
  await fs.setDoc(fs.doc(db, "eventos", id), {
    estado: JSON.stringify(estado),
    actualizado,
  });
  return actualizado;
}

// Borra la copia compartida de un evento. Se llama al borrar el evento guardado: sin
// esto, cada evento que se comparte alguna vez deja su documento en la nube PARA
// SIEMPRE, aunque el evento ya no exista en ningún sitio. Nadie los referencia y nadie
// los ve — solo ocupan.
//
// Ojo con lo que implica: el link "?evento=<id>" lee de aquí, así que al borrarlo ese
// link deja de abrir. Los links viejos que llevan la checklist dentro ("?c=...") no se
// tocan, porque no dependen de la nube.
export async function borrarEventoNube(id) {
  const conexion = await getDb();
  if (!conexion || !id) return;
  const { db, fs } = conexion;
  await fs.deleteDoc(fs.doc(db, "eventos", id));
}

export async function cargarEventoNube(id) {
  const conexion = await getDb();
  if (!conexion) return null;
  const { db, fs } = conexion;
  const snap = await fs.getDoc(fs.doc(db, "eventos", id));
  return snap.exists() ? JSON.parse(snap.data().estado) : null;
}

// Avisa (cb) cada vez que alguien guarda cambios en este evento. Devuelve una
// función para cancelar la suscripción.
//
// Además del estado se pasa CUÁNDO se guardó y si el aviso viene de una escritura
// nuestra todavía sin confirmar. Antes solo se pasaba el estado, y sin saber la hora
// no había forma de distinguir un cambio de otra persona del eco tardío de uno
// nuestro: al mover un deslizador varias veces seguidas (4 → 5 → 6), el eco del "5"
// llegaba cuando ya ibas por el 6 y lo pisaba. Se veía como que las horas de barra
// se cambiaban solas, sin que nadie tocara nada desde ningún otro sitio.
export function suscribirEventoNube(id, cb) {
  return suscribir(({ db, fs }) => fs.onSnapshot(
      fs.doc(db, "eventos", id),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        cb(d.estado, {
          actualizado: typeof d.actualizado === "number" ? d.actualizado : 0,
          // Firestore avisa DOS veces de cada escritura: primero con lo que acabas de
          // escribir sin confirmar (pendiente) y luego con lo que ha guardado el
          // servidor. La primera es siempre nuestra y no hay nada que aplicar.
          pendiente: Boolean(snap.metadata && snap.metadata.hasPendingWrites),
        });
      },
      () => { /* sin conexión: se ignora, la app sigue en local */ },
    ));
}

// ─── EL ÍNDICE VIEJO: SOLO SE LEE, YA NO SE ESCRIBE ───────────────────────────
// Un único documento con TODOS los eventos juntos. Fue el archivo compartido hasta que
// se partió en un documento por evento (ver más abajo), porque no cabía: Firestore no
// admite más de 1 MiB por documento y se llenaba sobre los 88 eventos.
//
// Desde entonces NADIE LO ESCRIBE. Se conserva y se lee UNA vez al arrancar, y solo si
// no hay ningún "evt_": es la red que trae los eventos de quien todavía no se ha migrado.
// Sus funciones de guardar y de suscribirse se han quitado, que llevaban sin llamarse
// desde la migración.
//
// Ojo con lo que es: una foto congelada del día que se migró, no datos vivos.
const DOC_INDICE = "indice/eventosGuardados";

export async function cargarIndiceEventosNube() {
  const conexion = await getDb();
  if (!conexion) return null;
  const { db, fs } = conexion;
  const snap = await fs.getDoc(fs.doc(db, DOC_INDICE));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { mapa: JSON.parse(d.mapa), actualizado: d.actualizado ?? 0 };
}

// ─── ARCHIVO DE EVENTOS: UN DOCUMENTO POR EVENTO ──────────────────────────────
// El índice de arriba mete TODOS los eventos en un solo documento, y Firestore no
// admite documentos de más de 1 MiB: un evento con Modo carga terminado pesa ~12 KB,
// así que el archivo se llenaba sobre los 88 eventos y a partir de ahí los guardados
// fallaban. Aquí cada evento es su propio documento, así que ya no hay techo: lo
// único que limita es el tamaño de un evento suelto, que es 90 veces menor.
// Los documentos por evento viven DENTRO de "indice", que es la colección que las
// reglas de seguridad ya permiten al equipo con sesión iniciada. Una colección nueva
// ("archivo") caía en el "todo lo demás: denegado" de las reglas, así que ni se leía
// ni se escribía: por eso dejaban de verse eventos y saltaba el aviso rojo. Con el
// prefijo se distinguen del documento antiguo "indice/eventosGuardados", que sigue
// donde estaba como copia de seguridad.
const COL_ARCHIVO = "indice";
const PREFIJO_EVENTO = "evt_";

// Id estable y válido para Firestore a partir del nombre del evento: el mismo
// nombre da siempre el mismo id (para poder actualizarlo en vez de duplicarlo) y
// el sufijo hash evita que dos nombres distintos caigan en el mismo id al limpiar
// tildes y símbolos ("Boda Ana/Luis" y "Boda Ana Luis").
export function idDeNombreEvento(nombre) {
  const txt = String(nombre ?? "");
  const base = txt.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "evento";
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (Math.imul(h, 31) + txt.charCodeAt(i)) | 0;
  return `${PREFIJO_EVENTO}${base}-${(h >>> 0).toString(36)}`;
}

// Qué eventos hay que escribir y cuáles borrar entre dos versiones del archivo.
// Función pura y sin Firestore, para poder razonarla y probarla por separado.
export function calcularCambiosArchivo(anterior = {}, nuevo = {}) {
  const escribir = [];
  const borrar = [];
  Object.entries(nuevo).forEach(([nombre, ev]) => {
    const antes = anterior[nombre];
    if (antes !== undefined && JSON.stringify(antes) === JSON.stringify(ev)) return;
    escribir.push({ nombre, id: idDeNombreEvento(nombre), estado: JSON.stringify(ev) });
  });
  Object.keys(anterior).forEach(nombre => {
    if (nuevo[nombre] === undefined) borrar.push({ nombre, id: idDeNombreEvento(nombre) });
  });
  return { escribir, borrar };
}

// Sube solo lo que ha cambiado y borra lo que ya no está. Escribir evento a evento
// (en vez del mapa entero) es lo que quita el techo del documento único.
export async function sincronizarArchivoNube(anterior = {}, nuevo = {}) {
  const conexion = await getDb();
  if (!conexion) return;
  const { db, fs } = conexion;
  const { escribir, borrar } = calcularCambiosArchivo(anterior, nuevo);
  if (!escribir.length && !borrar.length) return;
  const ahora = Date.now();
  await Promise.all([
    ...escribir.map(e => fs.setDoc(fs.doc(db, COL_ARCHIVO, e.id), { nombre: e.nombre, estado: e.estado, actualizado: ahora })),
    ...borrar.map(e => fs.deleteDoc(fs.doc(db, COL_ARCHIVO, e.id))),
  ]);
}

// Lee el archivo entero. Devuelve { mapa, actualizado } igual que el índice viejo,
// para que quien lo use no note la diferencia.
export async function cargarArchivoNube() {
  const conexion = await getDb();
  if (!conexion) return null;
  const { db, fs } = conexion;
  const snap = await fs.getDocs(fs.collection(db, COL_ARCHIVO));
  return leerSnapshotArchivo(snap);
}

function leerSnapshotArchivo(snap) {
  const mapa = {};
  let actualizado = 0;
  snap.forEach(doc => {
    // El documento antiguo con TODOS los eventos vive en la misma colección: se salta
    // (no lleva "nombre"/"estado", lleva "mapa"), igual que cualquier otro que no sea
    // un evento suelto.
    if (!doc.id.startsWith(PREFIJO_EVENTO)) return;
    const d = doc.data();
    if (!d || !d.nombre || !d.estado) return;
    try { mapa[d.nombre] = JSON.parse(d.estado); } catch (e) { /* documento corrupto: se salta */ }
    if ((d.actualizado ?? 0) > actualizado) actualizado = d.actualizado ?? 0;
  });
  return { mapa, actualizado, vacio: Object.keys(mapa).length === 0 };
}

// Avisa de CADA CAMBIO (alta, edición o borrado) en el archivo, no de la foto entera.
// Es importante: una foto de la colección no es la lista completa. Estando sin
// conexión, o mientras hay una escritura en vuelo, Firestore entrega una foto con
// solo los documentos que conoce en ese momento, y tomarla por la lista buena borraba
// de la pantalla todos los demás eventos. Con los cambios se puede aplicar lo que de
// verdad ha pasado: los que llegan se añaden o actualizan, y solo desaparecen los que
// Firestore marca explícitamente como borrados.
export function suscribirArchivoNube(cb) {
  return suscribir(({ db, fs }) => fs.onSnapshot(
      fs.collection(db, COL_ARCHIVO),
      (snap) => {
        const cambios = [];
        let actualizado = 0;
        (snap.docChanges ? snap.docChanges() : []).forEach(c => {
          if (!c.doc || !c.doc.id.startsWith(PREFIJO_EVENTO)) return;
          const d = c.doc.data();
          if (c.type === "removed") {
            if (d && d.nombre) cambios.push({ tipo: "borrado", nombre: d.nombre });
            return;
          }
          if (!d || !d.nombre || !d.estado) return;
          try { cambios.push({ tipo: "alta", nombre: d.nombre, estado: JSON.parse(d.estado) }); }
          catch (e) { /* documento corrupto: se salta */ }
          if ((d.actualizado ?? 0) > actualizado) actualizado = d.actualizado ?? 0;
        });
        if (cambios.length) cb({ cambios, actualizado });
      },
      () => { /* sin conexión: se ignora, la app sigue en local */ },
    ));
}

// ─── LOS AJUSTES QUE SON DEL EQUIPO, NO DE UN MÓVIL ───────────────────────────
// Precios, ratios de personal y factores de bebida son la misma cosa tres veces: un
// puñado de números que tienen que valer lo mismo para todo el mundo. Si cada uno
// tuviera los suyos, dos personas mirando el mismo sábado verían que hacen falta 22
// personas o 28 según quién mire, y el mismo evento costaría 340€ o 410€.
//
// Los tres cuelgan de "indice/", que las reglas ya abren solo al equipo con sesión: no
// hace falta tocar firestore.rules, y es lo correcto —esto son ajustes internos, no algo
// que deba leer quien entra por un enlace compartido. Guardan SOLO lo que
// alguien ha cambiado, para que una corrección de los valores de partida en una versión
// nueva siga llegando a todo lo que nadie ha tocado. Y los tres llegan solos desde otro
// dispositivo: un catálogo que hay que recargar para ver al día es otra vez una hoja
// suelta.
//
// Estaban escritos tres veces, palabra por palabra salvo el nombre del documento y el
// del campo. Aquí se escriben una.
function ajusteCompartido(ruta, campo) {
  return {
    async guardar(cambios) {
      const conexion = await getDb();
      if (!conexion) return 0;
      const { db, fs } = conexion;
      const actualizado = Date.now();
      await fs.setDoc(fs.doc(db, ruta), { [campo]: JSON.stringify(cambios), actualizado });
      return actualizado;
    },
    async cargar() {
      const conexion = await getDb();
      if (!conexion) return null;
      const { db, fs } = conexion;
      const snap = await fs.getDoc(fs.doc(db, ruta));
      if (!snap.exists()) return null;
      // Documento corrupto: mejor los de partida que reventar la app entera.
      try { return JSON.parse(snap.data()[campo]); } catch (e) { return null; }
    },
    suscribir(cb) {
      return suscribir(({ db, fs }) => fs.onSnapshot(
        fs.doc(db, ruta),
        (snap) => {
          if (!snap.exists()) return;
          try { cb(JSON.parse(snap.data()[campo])); }
          catch (e) { /* documento corrupto: se ignora */ }
        },
        () => { /* sin conexión: se usan los de este navegador */ },
      ));
    },
  };
}

// El coste unitario de cada item, para el Resumen del Modo carga. Los de partida van en
// el código (src/precios.js): son precios de proveedor, públicos, no negociados.
const PRECIOS = ajusteCompartido("indice/precios", "precios");
export const guardarPreciosNube = PRECIOS.guardar;
export const cargarPreciosNube = PRECIOS.cargar;
export const suscribirPreciosNube = PRECIOS.suscribir;

// Cuántos comensales lleva un camarero, por tipo de evento. Los de partida salen de
// contar el personal real de 19 eventos, pero cada catering trabaja distinto y los de
// cumpleaños y producción nadie los ha medido: se ajustan desde la app.
const RATIOS = ajusteCompartido("indice/ratios", "ratios");
export const guardarRatiosNube = RATIOS.guardar;
export const cargarRatiosNube = RATIOS.cargar;
export const suscribirRatiosNube = RATIOS.suscribir;

// Cuánto se bebe en cada tipo de evento respecto a lo de siempre (ver bebida.js). Es el
// ajuste que más se mueve solo: sale del histórico de lo que volvió sin abrir, así que
// tiene que verlo el equipo entero o cada móvil cargaría un camión distinto.
const BEBIDA = ajusteCompartido("indice/bebida", "bebida");
export const guardarBebidaNube = BEBIDA.guardar;
export const cargarBebidaNube = BEBIDA.cargar;
export const suscribirBebidaNube = BEBIDA.suscribir;

// Lo que el asistente ha aprendido del equipo (ver asistente/memoria.js). Es el ajuste
// compartido más claro de todos: si cada móvil recordara sus cosas, el asistente sabría
// una cosa distinta según quién preguntara. Y va aquí y no en el navegador porque lo
// que se aprende en una boda tiene que servir en la siguiente, la mire quien la mire.
const MEMORIA = ajusteCompartido("indice/memoria", "memoria");
export const guardarMemoriaNube = MEMORIA.guardar;
export const cargarMemoriaNube = MEMORIA.cargar;
export const suscribirMemoriaNube = MEMORIA.suscribir;

// Lo que le importa al equipo ahora (ver asistente/objetivos.js). Un objetivo que solo
// ve quien lo escribió no es un objetivo del equipo, así que va aquí como los demás.
const OBJETIVOS = ajusteCompartido("indice/objetivos", "objetivos");
export const guardarObjetivosNube = OBJETIVOS.guardar;
export const cargarObjetivosNube = OBJETIVOS.cargar;
export const suscribirObjetivosNube = OBJETIVOS.suscribir;

// Lo que hay que hacer (ver asistente/tareas.js). Del equipo: una tarea que solo ve
// quien la apuntó no está apuntada.
const TAREAS = ajusteCompartido("indice/tareas", "tareas");
export const guardarTareasNube = TAREAS.guardar;
export const cargarTareasNube = TAREAS.cargar;
export const suscribirTareasNube = TAREAS.suscribir;

// La dirección del Worker del asistente. NO va en el código —el repositorio es
// público, y una URL publicada ahí es un blanco fácil para que cualquiera la encuentre
// buscando "*.workers.dev" y se ponga a golpearla hasta agotar la cuota diaria del
// equipo, aunque no consiga colarse (el Worker exige sesión). Guardarla aquí, detrás de
// las reglas de Firestore que ya exigen sesión para leer, es la misma protección que
// hoy tiene cualquier dato del equipo, y evita que cada móvil tenga que ir a buscarla:
// el primero que la configura la deja puesta para todos.
const PROXY = ajusteCompartido("indice/proxy", "proxy");
export const guardarProxyNube = PROXY.guardar;
export const cargarProxyNube = PROXY.cargar;
export const suscribirProxyNube = PROXY.suscribir;

// ─── EL REPASO DE LA NOCHE ────────────────────────────────────────────────────
// Lo que dejó escrito el cron del Worker mientras no había nadie: qué eventos de los
// próximos treinta días tienen algo sin poner. Aquí SOLO se lee — lo escribe el Worker,
// no la app— y por eso no se exporta el "guardar": una app que pudiera sobrescribirlo
// acabaría pisando el repaso con lo que sabe un solo navegador.
//
// Mismo sitio que los demás ajustes compartidos, así que las reglas que ya existen
// ("indice/{doc} con sesión") lo cubren sin tocar nada.
const AVISOS = ajusteCompartido("indice/avisos", "avisos");
export const cargarAvisosNube = AVISOS.cargar;
export const suscribirAvisosNube = AVISOS.suscribir;

// ─── EL CALENDARIO DEL EQUIPO ─────────────────────────────────────────────────
// Los apuntes del calendario (ver src/calendario/apuntes.js): qué día, qué es y cómo se
// llama. Van en UN documento porque son pocos y pequeños — un año entero son unos
// sesenta apuntes de cuatro campos, muy lejos del MiB por documento de Firestore. El
// archivo de eventos sí tuvo que partirse en un documento por evento, pero eso es
// porque cada uno lleva su checklist entera dentro.
//
// VIVÍA en "indice/calendario", que las reglas solo abren con sesión iniciada. Eso
// estaba bien mientras el calendario era solo del equipo, pero deja fuera al que entra
// por un enlace compartido, que no tiene cuenta. Y abrir "indice/" a los de fuera no es
// una opción: ahí dentro están TAMBIÉN todas las checklists guardadas.
//
// Así que el calendario tiene ahora su propia colección, con dos documentos:
//
//   calendario/<codigo>  el de verdad. Quien conoce el código lee y escribe.
//   calendario/<ver>     una copia para mirar. Quien conoce este código NO puede llegar
//                        al de arriba: son documentos distintos y este no se lee nunca
//                        de vuelta.
//
// El de verdad lleva dentro el código de su copia (campo "ver"), para que quien edita
// por enlace pueda refrescarla sin tener que conocer nada más. Al revés no: la copia no
// sabe de quién es copia.
const COL_CALENDARIO = "calendario";

// Dónde apuntamos los dos códigos: el documento de siempre, que sigue en "indice/" y
// solo lee el equipo con sesión iniciada. Es lo que impide que el enlace de solo ver
// lleve a nadie al de editar.
const DOC_PUNTERO = "indice/calendario";

// Los códigos del calendario del equipo, creándolos la primera vez.
//
// La mudanza COPIA lo que hubiera en indice/calendario y no borra nada: ese documento
// se queda exactamente como estaba, con sus apuntes y su equipo, y solo se le añaden los
// dos códigos. Si algo saliera mal, los datos siguen donde han estado siempre.
//
// Va en una transacción porque dos móviles abriendo el calendario a la vez la primera
// vez generarían cada uno su pareja de códigos, y el equipo acabaría partido en dos
// calendarios distintos sin enterarse.
export async function resolverCalendario() {
  const conexion = await getDb();
  if (!conexion) return null;
  const { db, fs } = conexion;
  const ref = fs.doc(db, DOC_PUNTERO);

  const r = await fs.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists() ? snap.data() : {};
    if (d.codigo && d.ver) return { codigo: d.codigo, ver: d.ver, estrenar: false };
    const codigo = nuevoIdEvento(12);
    const ver = nuevoIdEvento(12);
    tx.set(ref, { codigo, ver }, { merge: true });
    // Se llevan tal cual, ya en texto: no se parsean ni se vuelven a serializar, así lo
    // que llegue a la carpeta nueva es exactamente lo que había.
    return { codigo, ver, estrenar: true, apuntes: d.apuntes || "[]", equipo: d.equipo || "[]" };
  });

  if (r.estrenar) {
    const actualizado = Date.now();
    await Promise.all([
      fs.setDoc(fs.doc(db, COL_CALENDARIO, r.codigo), { apuntes: r.apuntes, equipo: r.equipo, ver: r.ver, actualizado }),
      fs.setDoc(fs.doc(db, COL_CALENDARIO, r.ver), { apuntes: r.apuntes, equipo: r.equipo, actualizado }),
    ]);
  }
  return { codigo: r.codigo, ver: r.ver };
}

// El equipo va en el MISMO documento que los apuntes, no en otro: son dos listas
// pequeñas que se leen siempre juntas (para saber quién falta un día hacen falta las
// dos), y separarlas obligaría a dos lecturas y a resolver que una llegue sin la otra.
//
// Y va en Firestore y no en el código porque son nombres de personas de verdad, y el
// repositorio es público.
function leerCalendario(d) {
  try {
    return {
      apuntes: JSON.parse(d.apuntes),
      // Los documentos guardados antes de que existiera el equipo no traen el campo:
      // se devuelve lista vacía en vez de reventar la carga entera.
      equipo: d.equipo ? JSON.parse(d.equipo) : [],
      ver: d.ver || "",
      actualizado: d.actualizado ?? 0,
    };
  }
  catch (e) { return null; } // documento corrupto: mejor sin calendario que reventando
}

export async function cargarCalendarioNube(codigo) {
  const conexion = await getDb();
  if (!conexion || !codigo) return null;
  const { db, fs } = conexion;
  const snap = await fs.getDoc(fs.doc(db, COL_CALENDARIO, codigo));
  return snap.exists() ? leerCalendario(snap.data()) : null;
}

// Guarda el calendario y, de paso, refresca la copia de mirar. Las dos escrituras van
// juntas a propósito: si la copia solo se rehiciera cuando abre el calendario alguien
// del equipo, el que edita por enlace dejaría a todos los que miran viendo turnos
// viejos, que es peor que no tener enlace.
export async function guardarCalendarioNube(codigo, apuntes, equipo = [], ver = "") {
  const conexion = await getDb();
  if (!conexion || !codigo) return 0;
  const { db, fs } = conexion;
  const actualizado = Date.now();
  const contenido = { apuntes: JSON.stringify(apuntes), equipo: JSON.stringify(equipo), actualizado };
  await Promise.all([
    fs.setDoc(fs.doc(db, COL_CALENDARIO, codigo), { ...contenido, ver }),
    ver ? fs.setDoc(fs.doc(db, COL_CALENDARIO, ver), contenido) : Promise.resolve(),
  ]);
  return actualizado;
}

// Igual que el resto de suscripciones: se avisa con el timestamp para poder distinguir
// el eco de lo que uno mismo acaba de escribir de un cambio de otro dispositivo.
export function suscribirCalendarioNube(codigo, cb) {
  if (!codigo) return () => {};
  return suscribir(({ db, fs }) => fs.onSnapshot(
      fs.doc(db, COL_CALENDARIO, codigo),
      (snap) => {
        if (!snap.exists()) return;
        const leido = leerCalendario(snap.data());
        if (leido) cb({ ...leido, pendiente: snap.metadata.hasPendingWrites });
      },
      () => { /* sin conexión: se ignora, la app sigue en local */ },
    ));
}
