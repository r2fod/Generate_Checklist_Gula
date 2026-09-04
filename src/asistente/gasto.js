// ─── CUÁNTO SE ESTÁ GASTANDO ──────────────────────────────────────────────────
// Un asistente que cobra por palabra y no dice cuánto lleva gastado es un asistente
// que un día trae una factura. Aquí se cuenta lo que consume cada proveedor y se pone
// un tope: pasado el tope, los de pago dejan de contestar y lo dicen.
//
// Se cuenta POR MES, que es como se factura, y se guarda en este navegador. No va a la
// nube a propósito: subir un contador en cada pregunta serían escrituras constantes por
// un número que solo sirve para mirarlo. Si el equipo entero usa Gemini gratis, cada
// uno verá lo suyo y da igual; el tope de verdad lo pone el proveedor.
//
// Sin React: entran tokens, sale un número.
import { leerTexto, leerJSON, guardarTexto, guardarJSON, borrar } from "../almacen.js";
import { aISO } from "../fecha.js";

// Precio por millón de tokens, en euros aproximados. Son de la web de cada uno y
// cambian: el número exacto importa menos que el orden de magnitud, que es lo que hace
// falta para decidir si una pregunta merece el modelo caro.
//
// Gemini a cero es la capa gratuita. Si algún día se pasa a la de pago, se cambia aquí.
export const PRECIOS = {
  gemini:     { entrada: 0,    salida: 0,    nombre: "Gemini" },
  claude:     { entrada: 4.6,  salida: 23,   nombre: "Claude" },
  openai:     { entrada: 0.14, salida: 0.55, nombre: "OpenAI" },
  compatible: { entrada: 1,    salida: 4,    nombre: "Otro" },
  // Los siete de abajo son gratis en la capa que usa esta app (ver worker/index.js): si
  // algún día alguno pasa a cobrar, se cambia aquí, igual que el resto.
  groq:       { entrada: 0,    salida: 0,    nombre: "Groq" },
  cerebras:   { entrada: 0,    salida: 0,    nombre: "Cerebras" },
  zai:        { entrada: 0,    salida: 0,    nombre: "Z.AI" },
  mistral:    { entrada: 0,    salida: 0,    nombre: "Mistral" },
  openrouter: { entrada: 0,    salida: 0,    nombre: "OpenRouter" },
  nvidia:     { entrada: 0,    salida: 0,    nombre: "NVIDIA" },
  // Gratis mientras no se salga del cupo diario compartido de Neuronas (10.000/día,
  // repartido entre TODOS los modelos que se usen en la cuenta, no uno por modelo).
  cloudflare: { entrada: 0,    salida: 0,    nombre: "Cloudflare" },
};

const CLAVE = "gula_asistente_gasto";
export const mesActual = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
// El gasto "de hoy" es el del día que va por el móvil de quien pregunta: preguntar a la
// una de la mañana y ver el gasto de ayer no se entiende.
export const diaActual = (d = new Date()) => aISO(d);

const numero = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);

// { mes: "2026-08", proveedores: { gemini: { entrada, salida, preguntas } } }
export function saneaGasto(bruto, mes = mesActual()) {
  const vacio = { mes, proveedores: {} };
  if (!bruto || typeof bruto !== "object") return vacio;
  // Mes distinto: se empieza de cero. Un contador que arrastra meses no dice nada de
  // lo que va a llegar en la próxima factura, que es justo para lo que se mira.
  if (bruto.mes !== mes) return vacio;
  const proveedores = {};
  Object.entries(bruto.proveedores || {}).forEach(([p, v]) => {
    if (!PRECIOS[p] || !v || typeof v !== "object") return;
    proveedores[p] = { entrada: numero(v.entrada), salida: numero(v.salida), preguntas: numero(v.preguntas) };
  });
  // El contador del día va aparte del mes, y no es un capricho: las capas gratuitas
  // limitan POR DÍA (y por minuto). El número mensual no avisa de que estás a punto de
  // tocar techo esta tarde, que es justo cuando te deja tirado.
  const dia = bruto.dia === diaActual() ? { dia: bruto.dia, entrada: numero(bruto.hoy && bruto.hoy.entrada), salida: numero(bruto.hoy && bruto.hoy.salida), preguntas: numero(bruto.hoy && bruto.hoy.preguntas) } : null;
  return { mes, proveedores, dia: diaActual(), hoy: dia && dia.dia === diaActual() ? { entrada: dia.entrada, salida: dia.salida, preguntas: dia.preguntas } : { entrada: 0, salida: 0, preguntas: 0 } };
}

export function leerGasto() {
  return saneaGasto(leerJSON(CLAVE, null));
}

export function apuntar(proveedor, uso, gasto = leerGasto()) {
  if (!PRECIOS[proveedor] || !uso) return gasto;
  const mes = mesActual();
  const base = gasto.mes === mes ? gasto : { mes, proveedores: {} };
  const antes = base.proveedores[proveedor] || { entrada: 0, salida: 0, preguntas: 0 };
  const hoyPrevio = base.dia === diaActual() ? (base.hoy || { entrada: 0, salida: 0, preguntas: 0 }) : { entrada: 0, salida: 0, preguntas: 0 };
  const siguiente = {
    mes,
    dia: diaActual(),
    hoy: {
      entrada: hoyPrevio.entrada + numero(uso.entrada),
      salida: hoyPrevio.salida + numero(uso.salida),
      preguntas: hoyPrevio.preguntas + 1,
    },
    proveedores: {
      ...base.proveedores,
      [proveedor]: {
        entrada: antes.entrada + numero(uso.entrada),
        salida: antes.salida + numero(uso.salida),
        preguntas: antes.preguntas + 1,
      },
    },
  };
  guardarJSON(CLAVE, siguiente);
  return siguiente;
}

export function borrarGasto() {
  borrar(CLAVE);
  return saneaGasto(null);
}

// Lo que costó UNA pregunta, para poder enseñarlo debajo de su respuesta. Ver el gasto
// solo en un panel aparte no cambia cómo se pregunta; verlo pegado a la respuesta sí.
export function costeDeUna(proveedor, uso) {
  if (!uso) return null;
  const tokens = numero(uso.entrada) + numero(uso.salida);
  if (!tokens) return null;
  const p = PRECIOS[proveedor];
  const eur = p ? (numero(uso.entrada) / 1e6) * p.entrada + (numero(uso.salida) / 1e6) * p.salida : 0;
  return { tokens, euros: eur, gratis: !eur };
}

// Lo que cuesta un proveedor este mes, en euros.
export function euros(proveedor, gasto = leerGasto()) {
  const v = gasto.proveedores[proveedor];
  const p = PRECIOS[proveedor];
  if (!v || !p) return 0;
  return (v.entrada / 1e6) * p.entrada + (v.salida / 1e6) * p.salida;
}

export function eurosTotales(gasto = leerGasto()) {
  return Object.keys(gasto.proveedores).reduce((a, p) => a + euros(p, gasto), 0);
}

// ─── EL TOPE ──────────────────────────────────────────────────────────────────
// Un límite en euros al mes. Vale 0 = sin tope. Solo afecta a los de pago: parar Gemini
// porque se ha llegado a un tope de dinero cuando no cuesta nada sería absurdo.
const CLAVE_TOPE = "gula_asistente_tope";

export function leerTope() {
  const n = Number(leerTexto(CLAVE_TOPE, "0"));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ponerTope(euros) {
  const n = Number(euros);
  guardarTexto(CLAVE_TOPE, Number.isFinite(n) && n >= 0 ? n : 0);
  return leerTope();
}

export const esGratis = (proveedor) => {
  const p = PRECIOS[proveedor];
  return !!p && p.entrada === 0 && p.salida === 0;
};

// ¿Se puede preguntar a este proveedor? Devuelve el motivo si no, para poder decirlo en
// vez de fallar sin explicación.
export function puedePreguntar(proveedor, gasto = leerGasto(), tope = leerTope()) {
  if (!tope || esGratis(proveedor)) return { puede: true };
  const gastado = eurosTotales(gasto);
  if (gastado < tope) return { puede: true };
  return {
    puede: false,
    motivo: `Este mes llevas ${gastado.toFixed(2)}€ y el tope está en ${tope.toFixed(2)}€. Sube el tope en los ajustes o usa Gemini, que es gratis.`,
  };
}

// Los totales del mes, y la media por pregunta. La media es el número que de verdad
// sirve para afinar: si una pregunta normal sale por veinte mil tokens es que se está
// mandando de más, y ahí es donde hay que apretar la compresión.
export function totales(gasto = leerGasto()) {
  const v = Object.values(gasto.proveedores);
  const preguntas = v.reduce((a, x) => a + x.preguntas, 0);
  const tokens = v.reduce((a, x) => a + x.entrada + x.salida, 0);
  const hoy = gasto.hoy || { entrada: 0, salida: 0, preguntas: 0 };
  return {
    preguntas, tokens,
    media: preguntas ? Math.round(tokens / preguntas) : 0,
    euros: eurosTotales(gasto),
    hoyPreguntas: hoy.preguntas,
    hoyTokens: hoy.entrada + hoy.salida,
  };
}

// Lo que se enseña en pantalla, ya masticado y ordenado por lo que más cuesta.
export function resumen(gasto = leerGasto()) {
  return Object.keys(gasto.proveedores)
    .map(p => ({
      proveedor: p,
      nombre: (PRECIOS[p] || {}).nombre || p,
      ...gasto.proveedores[p],
      tokens: gasto.proveedores[p].entrada + gasto.proveedores[p].salida,
      euros: euros(p, gasto),
      gratis: esGratis(p),
    }))
    .sort((a, b) => b.euros - a.euros || b.tokens - a.tokens);
}
