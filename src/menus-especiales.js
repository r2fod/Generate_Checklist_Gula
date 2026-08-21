// ─── LOS MENÚS QUE HAY QUE HACER APARTE ───────────────────────────────────────
// Las alergias se preguntan en el formulario y acaban arriba de las notas del evento,
// marcadas con ⚠️ para que quien está en el sitio las lea. Eso resuelve la mitad del
// problema —que se lean— y deja la otra mitad sin resolver: cocina necesita SABER
// CUÁNTOS menús distintos hay que sacar, y ese número no estaba en ninguna parte. Se
// contaba a mano leyendo un párrafo, el día del evento, con prisa.
//
// Esto lo cuenta. No pretende entender el texto: busca las palabras que importan y el
// número que las acompaña, y lo que no reconoce lo saca igual como "revisar a mano" —
// que es mucho mejor que callárselo. Una alergia que la app no entiende y no enseña es
// exactamente el fallo que esto viene a evitar.
//
// No sabe nada de React ni de la nube: entra un texto, sale una lista.

// Las familias se ordenan de más específica a menos: "sin gluten" y "vegano" pueden
// aparecer en la misma frase ("un vegano celíaco") y gana la primera que casa, así que
// van antes las que obligan a una cocina distinta.
export const FAMILIAS = [
  { clave: "gluten",  label: "Menú sin gluten",       palabras: ["celiac", "celíac", "sin gluten", "gluten"] },
  { clave: "vegano",  label: "Menú vegano",           palabras: ["vegano", "vegana", "veganos", "veganas"] },
  { clave: "vegetar", label: "Menú vegetariano",      palabras: ["vegetarian"] },
  { clave: "lactosa", label: "Menú sin lactosa",      palabras: ["lactosa", "lácteo", "lacteo", "leche"] },
  { clave: "marisco", label: "Menú sin marisco",      palabras: ["marisco", "crustáceo", "crustaceo", "gamba", "langostino"] },
  { clave: "pescado", label: "Menú sin pescado",      palabras: ["pescado", "anisakis"] },
  { clave: "secos",   label: "Menú sin frutos secos", palabras: ["fruto seco", "frutos secos", "nuez", "nueces", "almendra", "cacahuete", "avellana", "pistacho"] },
  { clave: "huevo",   label: "Menú sin huevo",        palabras: ["huevo"] },
  { clave: "soja",    label: "Menú sin soja",         palabras: ["soja"] },
  { clave: "cerdo",   label: "Menú sin cerdo",        palabras: ["cerdo", "halal", "kosher"] },
  { clave: "picante", label: "Menú sin picante",      palabras: ["picante"] },
];

// Palabras que convierten una mención en una PETICIÓN. Sin una de estas, "el postre
// lleva frutos secos" contaría como un menú especial que nadie ha pedido.
const MARCAS = ["sin ", "alergi", "alérgi", "alergen", "alérgen", "intoleran", "celiac", "celíac",
  "vegano", "vegana", "vegetarian", "no come", "no puede", "no toma", "evitar", "halal", "kosher"];

// "no hay", "ninguna", "-"… Cuando alguien contesta que no hay nada, no hay nada.
const NADA = /^\s*(-+|no|no hay|ninguna?|ningunos?|nada|sin alergias?|sin ninguna|n\/a|ok)\s*\.?\s*$/i;

const NUMEROS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };

// Sin tildes y en minúsculas: la mitad de la gente escribe "celiaco" y la otra mitad
// "celíaco", y las dos tienen razón.
const normaliza = (t) => String(t || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "");

// El texto de alergias dentro de las notas del evento. Si no lleva la marca del
// formulario se devuelve todo: alguien puede haberlas escrito a mano en las notas.
export function alergiasDeLasNotas(notas) {
  const t = String(notas || "");
  const i = t.search(/alergias?\s*:/i);
  return i === -1 ? t : t.slice(t.indexOf(":", i) + 1);
}

// Cuántos comensales lleva el fragmento. Sin número se cuenta 1: "un celíaco" y
// "celíaco" son la misma persona, y quedarse corto en cocina es el fallo caro.
function cuantos(fragmento) {
  const conCifra = fragmento.match(/(\d{1,3})/);
  if (conCifra) {
    const n = parseInt(conCifra[1], 10);
    // Un 4 de "en la mesa 4" no son cuatro menús. Si el número va detrás de "mesa" se
    // ignora y se cuenta uno, que es lo que hay escrito de verdad.
    if (!/mesa\s*\d/.test(fragmento) || /^\s*\d/.test(fragmento)) {
      return n >= 1 && n <= 300 ? n : 1;
    }
  }
  const palabra = Object.keys(NUMEROS).find(p => new RegExp(`(^|\\s)${p}\\s`).test(fragmento));
  return palabra ? NUMEROS[palabra] : 1;
}

// [{ clave, label, n }] ordenado como FAMILIAS, sumando los fragmentos de la misma
// familia ("2 celíacos" en una frase y "1 celíaco más" en otra son 3 menús sin gluten).
export function menusEspeciales(texto) {
  const crudo = String(texto || "").trim();
  if (!crudo || NADA.test(crudo)) return [];
  const fragmentos = crudo
    .split(/[,;.\n]|\sy\s|\s\+\s/)
    .map(f => f.trim())
    .filter(Boolean);

  const cuenta = {};
  const sinReconocer = [];
  fragmentos.forEach(frag => {
    const n = normaliza(frag);
    if (!MARCAS.some(m => n.includes(normaliza(m)))) return;   // una mención, no una petición
    const familia = FAMILIAS.find(f => f.palabras.some(p => n.includes(normaliza(p))));
    if (!familia) { sinReconocer.push(frag); return; }
    cuenta[familia.clave] = (cuenta[familia.clave] || 0) + cuantos(n);
  });

  const salida = FAMILIAS
    .filter(f => cuenta[f.clave])
    .map(f => ({ clave: f.clave, label: f.label, n: cuenta[f.clave] }));

  // Lo que no se ha sabido clasificar sale igual, contado y con el texto tal cual. Una
  // alergia que la app no entiende y se calla es peor que una que no entiende y avisa.
  if (sinReconocer.length) {
    salida.push({
      clave: "revisar",
      label: "Menú especial (revisar en notas)",
      n: sinReconocer.reduce((a, f) => a + cuantos(normaliza(f)), 0),
      textos: sinReconocer,
    });
  }
  return salida;
}

export function totalMenusEspeciales(lista = []) {
  return lista.reduce((a, m) => a + m.n, 0);
}

// La categoría lista para la checklist, o null si no hay ninguno. Va como categoría
// propia y no colgando de Cocina a propósito: es lo primero que hay que mirar y lo
// último que puede perderse entre ciento cincuenta líneas.
export function categoriaMenusEspeciales(notas) {
  const lista = menusEspeciales(alergiasDeLasNotas(notas));
  if (!lista.length) return null;
  return {
    nombre: "Menús especiales",
    items: lista.map(m => [m.label, String(m.n)]),
  };
}
