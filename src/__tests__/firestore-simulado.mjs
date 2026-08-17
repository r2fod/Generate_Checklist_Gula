// Firestore de mentira con las MISMAS reglas de seguridad del proyecto
export const almacen = new Map();          // "coleccion/id" -> data
export const limpiarPrevios = () => previos.clear();
const oyentes = [];
export function reglasPermiten(ruta, op, auth = true) {
  const [col] = ruta.split('/');
  if (col === 'eventos') return op === 'get' || op === 'write';
  // El calendario: quien conoce el nombre del documento entra, con o sin cuenta. Es lo
  // que hace que funcionen los dos enlaces compartidos. Listar la colección, no.
  if (col === 'calendario') return op === 'get' || op === 'write';
  if (col === 'indice') return auth;       // read+write solo con sesión
  return false;                            // todo lo demás denegado
}
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
    const ruta = b === undefined ? a : `${a}/${b}`;
    const i = ruta.indexOf('/');
    return { ruta, col: ruta.slice(0, i), id: ruta.slice(i + 1) };
  },
  collection: (_db, col) => ({ col }),
  async setDoc(ref, data) {
    if (!reglasPermiten(ref.ruta, 'write', sesionIniciada)) throw new Error('Missing or insufficient permissions.');
    almacen.set(ref.ruta, data); notificar(ref.col);
  },
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
    if (!reglasPermiten(ref.col + '/x', 'read', sesionIniciada)) throw new Error('Missing or insufficient permissions.');
    return snapDe(ref.col);
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
