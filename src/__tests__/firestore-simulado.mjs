// Firestore de mentira con las MISMAS reglas de seguridad del proyecto.
//
// Ojo con lo que ESTO es y lo que no: aquí las reglas están REESCRITAS en JavaScript, así
// que comprueban lo que alguien creyó que dice `firestore.rules`, no lo que dice. Un
// paréntesis mal puesto en el fichero de verdad no se caza desde aquí. Para eso está
// `pruebas/reglas.test.mjs`, que pasa los mismos casos por el motor real de Google.
//
// Lo que sí garantiza este de aquí: que la sincronización entre dos dispositivos funciona
// sin red y en milisegundos. Y para que los dos no se separen en silencio, más abajo se
// declara qué colecciones cubre y hay una prueba que lo compara con el fichero real.
export const almacen = new Map();          // "coleccion/id" -> data

// Las colecciones que este simulado sabe aplicar. Si alguien añade una a
// `firestore.rules` y no la pone aquí, la prueba de coherencia lo dice: el agujero
// silencioso sería que el simulado la denegara todo y nadie se enterase hasta producción.
export const COLECCIONES_CUBIERTAS = ["eventos", "indice", "calendario", "publico", "envios"];
export const limpiarPrevios = () => previos.clear();
const oyentes = [];
// `datos` es lo que se quiere escribir y `previo` lo que ya había: las reglas de
// envios/ miran las dos cosas (que no se cambie el código, que no esté ya revisado…),
// y sin eso el simulado dejaba pasar escrituras que Firestore rechaza — que es
// exactamente el fallo que estas pruebas tienen que cazar.
export function reglasPermiten(ruta, op, auth = true, datos = null, previo = null) {
  const [col] = ruta.split('/');
  if (col === 'eventos') return op === 'get' || op === 'write';
  // El calendario: quien conoce el nombre del documento entra, con o sin cuenta. Es lo
  // que hace que funcionen los dos enlaces compartidos. Listar la colección, no.
  if (col === 'calendario') return op === 'get' || op === 'write';
  if (col === 'indice') return auth;       // read+write solo con sesión

  // ─── publico/<codigo> ───────────────────────────────────────────────────────
  // La lista corta de próximos eventos que ve la oficina. Se lee conociendo el código
  // (es el nombre del documento) y la escribe la app, que sí tiene sesión. Listar la
  // colección NO: sin eso, cualquiera recorrería todos los buzones.
  if (col === 'publico') {
    if (op === 'get') return true;
    if (op === 'list') return false;
    return auth;
  }

  // ─── envios/<id> ────────────────────────────────────────────────────────────
  // El buzón de la oficina. Quien tiene el código puede CREAR y puede CORREGIR lo suyo
  // mientras nadie lo haya revisado; nada más. Leer, listar y borrar es del equipo.
  if (col === 'envios') {
    if (auth) return true;                 // el equipo con sesión hace de todo
    if (op === 'list' || op === 'get' || op === 'delete') return false;
    const d = datos || {};
    const claves = Object.keys(d);
    const esMapa = d.respuestas && typeof d.respuestas === 'object' && !Array.isArray(d.respuestas);
    // enviado == request.time: la fecha la pone el servidor, no el reloj del móvil.
    const fechaDelServidor = d.enviado === MARCA_SERVIDOR;
    if (op === 'create' || (op === 'write' && !previo)) {
      const permitidas = ['codigo', 'respuestas', 'enviado', 'eventoDestino', 'version'];
      return claves.every(k => permitidas.includes(k)) && claves.length <= 5 && esMapa && fechaDelServidor;
    }
    if (op === 'update' || op === 'write') {
      // Se pregunta si el campo EXISTE, no si vale null: un envío recién mandado no
      // tiene "revisado", y con la comparación a null no se podría corregir ninguno.
      if (!previo || 'revisado' in previo) return false;
      const permitidas = ['codigo', 'respuestas', 'enviado', 'eventoDestino', 'version', 'corregido'];
      const fusion = { ...previo, ...d };
      if (fusion.codigo !== previo.codigo) return false;
      return Object.keys(fusion).every(k => permitidas.includes(k)) && Object.keys(fusion).length <= 6
        && esMapa && fechaDelServidor;
    }
    return false;
  }

  return false;                            // todo lo demás denegado
}

// Lo que Firestore pone donde va serverTimestamp(). En el simulado basta con que sea
// reconocible: lo que se comprueba es que la app NO manda una fecha suya.
export const MARCA_SERVIDOR = '__hora-del-servidor__';
export let sesionIniciada = true;
export const setSesion = (v) => { sesionIniciada = v; };
export const fakeDb = {};
// La foto se calcula UNA vez por notificación y se pasa a todos los oyentes: si se
// calculara por oyente, el primero se llevaría los cambios y los demás verían cero.
const notificar = (col) => {
  const suscritos = oyentes.filter(o => o.col === col);
  if (!suscritos.length) return;
  const snap = snapDe(col);
  suscritos.forEach(o => o.cb(snap));
};
const previos = new Map();   // col -> Map(id -> data), para calcular los cambios
const snapDe = (col) => {
  const docs = [...almacen.entries()].filter(([k]) => k.startsWith(col + '/'))
    .map(([k, v]) => ({ id: k.slice(col.length + 1), data: () => v }));
  const antes = previos.get(col) || new Map();
  const ahora = new Map(docs.map(d => [d.id, d.data()]));
  const cambios = [];
  ahora.forEach((v, id) => {
    if (!antes.has(id)) cambios.push({ type: 'added', doc: { id, data: () => v } });
    else if (JSON.stringify(antes.get(id)) !== JSON.stringify(v)) cambios.push({ type: 'modified', doc: { id, data: () => v } });
  });
  antes.forEach((v, id) => { if (!ahora.has(id)) cambios.push({ type: 'removed', doc: { id, data: () => v } }); });
  previos.set(col, ahora);
  return { empty: docs.length === 0, forEach: (f) => docs.forEach(f), docChanges: () => cambios };
};
export const fakeFs = {
  // doc(db, "col/id") y doc(db, "col", "id") son las dos formas válidas en Firestore
  doc: (_db, a, b) => {
    // doc(collection(db, "envios")) va con UN solo argumento: el primero es la colección,
    // no la base de datos. Así es como se crea un envío con id inventado por Firestore.
    if (_db && _db.esColeccion) a = _db;
    if (a && a.esColeccion) {
      const id = `id${Math.random().toString(36).slice(2, 10)}`;
      return { ruta: `${a.col}/${id}`, col: a.col, id };
    }
    const ruta = b === undefined ? a : `${a}/${b}`;
    const i = ruta.indexOf('/');
    return { ruta, col: ruta.slice(0, i), id: ruta.slice(i + 1) };
  },
  // doc(collection(db, "envios")) sin id: Firestore inventa uno. Así es como se crea un
  // envío, y el id es lo único que guarda el móvil de quien lo mandó para corregirlo.
  collection: (_db, col) => ({ col, esColeccion: true }),
  async setDoc(ref, data) {
    // Se pasa 'write' y ya distingue cada colección si es alta o cambio mirando si
    // había algo: en Firestore, create y update son reglas distintas solo en envios/.
    const previo = almacen.get(ref.ruta);
    if (!reglasPermiten(ref.ruta, 'write', sesionIniciada, data, previo || null)) throw new Error('Missing or insufficient permissions.');
    almacen.set(ref.ruta, data); notificar(ref.col);
  },
  // updateDoc no es setDoc: escribe ENCIMA de lo que hay. Lo usan corregirEnvio y
  // marcarRevisado, que son justo las dos operaciones que las reglas separan.
  async updateDoc(ref, data) {
    const previo = almacen.get(ref.ruta);
    if (previo === undefined) throw new Error('No document to update.');
    if (!reglasPermiten(ref.ruta, 'update', sesionIniciada, data, previo)) throw new Error('Missing or insufficient permissions.');
    almacen.set(ref.ruta, { ...previo, ...data }); notificar(ref.col);
  },
  serverTimestamp: () => MARCA_SERVIDOR,
  async getDoc(ref) {
    if (!reglasPermiten(ref.ruta, 'get', sesionIniciada)) throw new Error('Missing or insufficient permissions.');
    const d = almacen.get(ref.ruta);
    return { exists: () => d !== undefined, data: () => d };
  },
  async deleteDoc(ref) {
    if (!reglasPermiten(ref.ruta, 'write', sesionIniciada)) throw new Error('Missing or insufficient permissions.');
    almacen.delete(ref.ruta); notificar(ref.col);
  },
  async getDocs(ref) {
    if (!reglasPermiten(ref.col + '/x', 'list', sesionIniciada)) throw new Error('Missing or insufficient permissions.');
    const snap = snapDe(ref.col);
    // leerEnvios usa snap.docs; el archivo usa forEach. Van los dos.
    const docs = [];
    snap.forEach(d => docs.push(d));
    return { ...snap, docs };
  },
  // Lo justo que usa el proyecto: leer un documento y dejarlo escrito sin que se cuele
  // nadie en medio. Sirve para estrenar el calendario, donde dos móviles a la vez
  // generarían cada uno su pareja de códigos.
  async runTransaction(_db, cuerpo) {
    const escrituras = [];
    const tx = {
      get: (ref) => fakeFs.getDoc(ref),
      set: (ref, data, opciones) => { escrituras.push([ref, data, opciones]); },
    };
    const r = await cuerpo(tx);
    for (const [ref, data, opciones] of escrituras) {
      if (!reglasPermiten(ref.ruta, 'write', sesionIniciada)) throw new Error('Missing or insufficient permissions.');
      const previo = (opciones && opciones.merge) ? (almacen.get(ref.ruta) || {}) : {};
      almacen.set(ref.ruta, { ...previo, ...data });
      notificar(ref.col);
    }
    return r;
  },
  onSnapshot(ref, cb) {
    const o = { col: ref.col, cb }; oyentes.push(o);
    cb(snapDe(ref.col));
    return () => { const i = oyentes.indexOf(o); if (i >= 0) oyentes.splice(i, 1); };
  },
};
