// ─── COMPRIMIR LO QUE SE LE MANDA AL MODELO ───────────────────────────────────
// Cada vez que una herramienta contesta, su resultado entero viaja al modelo Y SE QUEDA
// en la conversación: en la segunda pregunta viaja otra vez, y en la tercera también. Una
// checklist de boda son ~150 líneas; pedirla tres veces en una charla son miles de
// palabras pagadas por enseñar lo mismo.
//
// Es la idea del "TokenJuice" de OpenHuman —comprimir la salida de la herramienta antes
// de que llegue al modelo—, y aquí se hace de la forma aburrida y comprobable: quitando
// lo que no dice nada y recortando las listas largas. Sin modelos resumiendo, que sería
// pagar por ahorrar y además podría inventarse lo que quita.
//
// La regla que no se salta: **lo que se recorta se dice**. Un resultado que se queda a
// medias sin avisar hace que el modelo conteste con seguridad sobre datos que no ha
// visto, y eso es peor que una respuesta larga. Por eso siempre queda un "…y N más".

// El tamaño de un resultado ya comprimido. No es un número mágico: es lo que cabe de una
// checklist entera dejando sitio a la conversación.
const MAX_RESULTADO = 3000;
// Las listas se recortan aquí. Con más de treinta líneas el modelo ya no está leyendo
// una lista, está buscando en ella, y para eso vale mejor volver a preguntar filtrando.
// Son varios topes y no uno porque se prueba de menos apretado a más: primero se intenta
// con treinta y solo si no cabe se baja, en vez de recortar de golpe lo que sí cabía.
const TOPES_LISTA = [30, 12, 5];

// Lo que no dice nada y ocupa: ceros, vacíos, falsos y nulos. Ojo con el false: en un
// resultado como { sinConfigurar: false } el false SÍ dice algo, pero lo dice también su
// ausencia, y el modelo lo entiende igual. Los ceros de una lista de bebida (0 tónicas)
// son justo lo mismo: no llevar ninguna.
const vacio = (v) =>
  v === null || v === undefined || v === "" || v === false || v === 0 ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

// Los decimales largos son ruido: 0.7200000000000001 ocupa el triple que 0,72 y dice lo
// mismo. Vienen de multiplicar factores, así que salen más de lo que parece.
const redondea = (n) => (Number.isInteger(n) ? n : Math.round(n * 100) / 100);

function podaValor(v, recortes, maxLista) {
  if (typeof v === "number") return redondea(v);
  if (Array.isArray(v)) {
    const limpia = v.map(x => podaValor(x, recortes, maxLista)).filter(x => !vacio(x));
    if (limpia.length <= maxLista) return limpia;
    // El aviso va DENTRO de la lista, en su último hueco: así viaja pegado a lo que
    // recorta y el modelo no puede leer la lista sin leerlo.
    recortes.push(`${limpia.length - maxLista} elementos`);
    return [...limpia.slice(0, maxLista), `…y ${limpia.length - maxLista} más (pregunta otra vez filtrando si hacen falta)`];
  }
  if (v && typeof v === "object") {
    const salida = {};
    Object.entries(v).forEach(([k, x]) => {
      const y = podaValor(x, recortes, maxLista);
      if (!vacio(y)) salida[k] = y;
    });
    return salida;
  }
  return v;
}

// Comprime el resultado de una herramienta. Devuelve { resultado, antes, despues } para
// poder enseñar cuánto se ha ahorrado — sin la cifra, "comprime" es una promesa.
export function comprimir(resultado) {
  const antes = JSON.stringify(resultado === undefined ? null : resultado).length;

  // Un error nunca se toca: es corto y es lo único que el modelo necesita leer entero.
  if (resultado && typeof resultado === "object" && resultado.error) {
    return { resultado, antes, despues: antes, recortado: false };
  }

  // Se aprieta por pasos, no cortando por la mitad. Truncar el JSON y volver a pegarlo
  // fue el primer intento y era una mala idea: producía texto que ya no era JSON, y el
  // modelo recibía basura en vez de datos. Aquí siempre sale algo válido, aunque lleve
  // menos dentro.
  for (const max of TOPES_LISTA) {
    const recortes = [];
    const salida = podaValor(resultado, recortes, max);
    const texto = JSON.stringify(salida === undefined ? null : salida);
    if (texto.length <= MAX_RESULTADO || max === TOPES_LISTA[TOPES_LISTA.length - 1]) {
      if (texto.length <= MAX_RESULTADO) {
        return { resultado: salida, antes, despues: texto.length, recortado: recortes.length > 0 || texto.length < antes };
      }
    }
  }

  // Ni con las listas al mínimo cabe. Entonces se dice lo que hay y cómo pedirlo mejor,
  // que es más útil que media checklist sin avisar de que está a medias.
  const claves = resultado && typeof resultado === "object" ? Object.keys(resultado) : [];
  const salida = {
    recortado: "El resultado no cabe entero. Vuelve a pedirlo acotando: por categoría, por fecha o por evento.",
    contiene: claves,
  };
  return { resultado: salida, antes, despues: JSON.stringify(salida).length, recortado: true };
}
// Lo ahorrado en toda una conversación, para poder enseñarlo. Un ahorro que no se ve no
// convence a nadie de que merece la pena.
export function ahorro(pasos = []) {
  const antes = pasos.reduce((a, p) => a + (p.antes || 0), 0);
  const despues = pasos.reduce((a, p) => a + (p.despues || 0), 0);
  if (!antes) return { antes: 0, despues: 0, porcentaje: 0 };
  return { antes, despues, porcentaje: Math.max(0, Math.round((1 - despues / antes) * 100)) };
}
