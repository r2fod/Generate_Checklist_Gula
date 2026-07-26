// Firestore de mentira con las MISMAS reglas de seguridad del proyecto
export const almacen = new Map();          // "coleccion/id" -> data
const oyentes = [];
export function reglasPermiten(ruta, op, auth = true) {
  const [col] = ruta.split('/');
  if (col === 'eventos') return op === 'get' || op === 'write';
  if (col === 'indice') return auth;       // read+write solo con sesión
  return false;                            // todo lo demás denegado
}
export let sesionIniciada = true;
export const setSesion = (v) => { sesionIniciada = v; };
export const fakeDb = {};
const notificar = (col) => oyentes.filter(o => o.col === col).forEach(o => o.cb(snapDe(col)));
const snapDe = (col) => {
  const docs = [...almacen.entries()].filter(([k]) => k.startsWith(col + '/'))
    .map(([k, v]) => ({ id: k.slice(col.length + 1), data: () => v }));
  return { empty: docs.length === 0, forEach: (f) => docs.forEach(f) };
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
  onSnapshot(ref, cb) {
    const o = { col: ref.col, cb }; oyentes.push(o);
    cb(snapDe(ref.col));
    return () => { const i = oyentes.indexOf(o); if (i >= 0) oyentes.splice(i, 1); };
  },
};
