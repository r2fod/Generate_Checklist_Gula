// Estimación (en minutos) del tiempo de Preparación / Carga / Descarga / Montaje.
// Carga y descarga se reparten entre la gente de logística; la descarga lleva recargo por
// fatiga según las horas de jornada. El Montaje (colocar mesas, decoración, montar cocina
// in situ) es tiempo de todo el equipo — se estima como tiempo transcurrido (no se divide
// por logística), en línea con el estándar del sector (~2-4 h para un evento medio).
// Compartida entre Modo carga y el formulario (para sugerir la hora de fin de logística).
const CARGA_BASE_MIN = 20, CARGA_MIN_POR_ITEM = 1.5, DESCARGA_FACTOR = 0.6;
const PREP_BASE_MIN = 30, PREP_MIN_POR_PAX = 1, PREP_MIN_POR_ITEM = 0.5;
const MONTAJE_BASE_MIN = 45, MONTAJE_MIN_POR_PAX = 1.1, MONTAJE_MIN_POR_ITEM = 0.4;
const FATIGA_DESDE_H = 4, FATIGA_POR_HORA = 0.08, FATIGA_MAX = 0.6;
// El tiempo por item se cobraba igual en un evento de 25 pax que en uno de 200, y no
// es así: una produción de 25 pax tiene casi las mismas LÍNEAS de checklist que una
// boda de 150 (128 frente a 136) — lo que cambia es el volumen de cada línea, no
// cuántas hay. Se escala con la raíz del pax (el volumen crece, pero manejar 10 cajas
// no cuesta 10 veces manejar 1) tomando 100 pax como referencia, que es donde se
// calibró el modelo contra los tiempos de otros caterings: ahí el factor es 1 y los
// tiempos no se mueven. Los topes evitan disparates en los extremos.
const VOLUMEN_REF_PAX = 100, VOLUMEN_MIN = 0.45, VOLUMEN_MAX = 1.6;
const factorVolumen = (pax) =>
  Math.min(VOLUMEN_MAX, Math.max(VOLUMEN_MIN, Math.sqrt(Math.max(0, pax || 0) / VOLUMEN_REF_PAX)));
// Repartir el trabajo entre N personas NO divide el tiempo entre N: hay una parte
// que no se puede paralelizar (colocar la furgoneta, repasar la hoja, coordinarse) y
// cuellos de botella físicos (una puerta, un montacargas, una cocina). Se modela como
// en cualquier planificación de obra: una parte fija en serie + el resto repartido
// entre un equipo "efectivo" que crece por debajo de lo lineal.
//   1 persona → 1,00   ·   2 → 1,87   ·   3 → 2,69   ·   4 → 3,48   ·   5 → 4,26
const EXPONENTE_EQUIPO = 0.9;
const equipoEfectivo = (n) => Math.pow(Math.max(1, n || 1), EXPONENTE_EQUIPO);

export const FASES_TIEMPO = ["prep", "carga", "descarga", "montaje"];

export function estimarTiemposCarga({ totalItems = 0, pax = 0, numLogistica = 1, horasJornada = 0 }, calibracion) {
  const nEf = equipoEfectivo(numLogistica);
  const f = (fase) => (calibracion && calibracion.factores[fase]) || 1;
  const reparte = (base, trabajo, fase) => Math.round((base + trabajo / nEf) * f(fase));
  const vol = factorVolumen(pax);
  const prepMin = totalItems > 0 ? reparte(PREP_BASE_MIN, pax * PREP_MIN_POR_PAX + totalItems * PREP_MIN_POR_ITEM * vol, "prep") : 0;
  const cargaMin = totalItems > 0 ? reparte(CARGA_BASE_MIN, totalItems * CARGA_MIN_POR_ITEM * vol, "carga") : 0;
  const fatiga = Math.min(FATIGA_MAX, Math.max(0, (horasJornada - FATIGA_DESDE_H) * FATIGA_POR_HORA));
  // La recogida va más rápida que la carga (todo va a granel a las cajas), pero lleva
  // recargo por fatiga: es lo último de una jornada larga.
  const descargaMin = Math.round(cargaMin * DESCARGA_FACTOR * (1 + fatiga) * (f("descarga") / f("carga")));
  const montajeMin = totalItems > 0 ? reparte(MONTAJE_BASE_MIN, pax * MONTAJE_MIN_POR_PAX + totalItems * MONTAJE_MIN_POR_ITEM * vol, "montaje") : 0;
  return { prepMin, cargaMin, descargaMin, montajeMin, fatiga, totalMin: prepMin + cargaMin + descargaMin + montajeMin };
}

// "08:30" + 150 min → "11:00" (sumar minutos a una hora HH:MM, con vuelta de día)
export function sumarMinutosHora(hhmm, minutos) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const total = ((h * 60 + m + Math.round(minutos)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
