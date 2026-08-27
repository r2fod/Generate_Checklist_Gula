// ─── LOS NÚMEROS DE LA BEBIDA ─────────────────────────────────────────────────
// Todo lo que decide CUÁNTA bebida y cuánta cristalería se carga. Vive fuera de
// App.jsx por una razón práctica: aquí dentro no hay React ni navegador, así que se
// puede probar directamente con node en milisegundos. Los fallos de este cálculo
// (la cerveza que bajaba al poner media hora de barra, las champaneras fijas a 4)
// costaron levantar un navegador entero para cada comprobación; ahora se cazan con
// una prueba unitaria que tarda nada. Ver src/__tests__/calculos.test.mjs.
//
// Nada de aquí toca estado ni pantalla: entra un número, sale un número.
//
// Los ratios de bebida y su factor por tipo de evento viven en bebida.js: aquí se
// calcula con ellos, allí se decide cuáles son. Ese fichero no importa nada, así que
// esta flecha no tiene vuelta.
import { RATIOS_BEBIDA, factoresDeTipo, esFactorValido, TIPOS_BEBIDA } from "./bebida.js";
import { factorComidaVigente } from "./comida.js";

// Margen de seguridad del 10% SOLO sobre cristalería, vajilla y servilletas: es el
// buffer estándar del sector por roturas/pérdidas (los alquileres recomiendan pedir un
// 10-20% extra de copas y platos). Las bebidas, licores y cápsulas NO llevan margen
// extra: sus ratios ya vienen calibrados por encima de los rangos del sector.
//
// Aquí no hay una constante 1.1 que usar, y es a propósito: multiplicar por 1,1 es justo
// lo que da el error de abajo. El 10% se aplica SIEMPRE con conMargen().
//
// Se multiplica por 11 y se divide entre 10, no por 1,1. Parece lo mismo y no lo es:
// en coma flotante 100 * 1.1 da 110.00000000000001, así que el redondeo hacia arriba
// se llevaba una unidad de más SIEMPRE que la cuenta caía justo en un entero — 100
// copas pedían 111. Multiplicando por un entero primero no queda resto que redondear.
/** @param {number} n @returns {number} */
export const conMargen = (n) => Math.ceil((n * 11) / 10);

// ─── HIELO ────────────────────────────────────────────────────────────────────
// Un "taxi" es la saca de transporte: 12 bolsas de 2 kg = 24 kg.
export const KG_POR_TAXI = 24;
export const KG_POR_BOLSA = 2;

// Kilos por persona. El sector maneja 0,7-1 kg/pax con barra en verano y 0,3-0,5 sin
// barra o en invierno: eso cubre lo que va en el vaso Y lo de conservar bebida en las
// bañeras. Aquí se coge el extremo alto, como en toda la bebida.
// Exportada para que sector.js pueda comparar este número contra el del sector sin
// duplicarlo — sigue siendo calculos.js quien decide el valor, sector.js solo lo lee.
export const KG_HIELO_POR_PAX = { verano: 0.9, invierno: 0.5 };

// Sin barra se sigue necesitando hielo —los refrescos y el agua de la comida van fríos—
// pero bastante menos: no hay cubatas.
const FACTOR_SIN_BARRA = 0.6;

// La merma por derretimiento. Con congelador o arca en el sitio el hielo se guarda y
// aguanta; sin él vive en neveras portátiles y termos, y en una jornada de verano se
// pierde un tercio largo antes de llegar al vaso. Este es el número que decide si el
// hielo se acaba a media barra.
const MERMA_SIN_CONGELADOR = { verano: 1.35, invierno: 1.2 };

// ─── EL FACTOR DE HIELO, POR TIPO DE EVENTO ───────────────────────────────────
// La merma de arriba salió de una estimación, no de una medición (ver PLAN_MEJORAS
// C2). El número honesto está en los eventos ya hechos: lo que salió en el camión
// menos lo que volvió, por comensal — la misma cuenta que calibracion.js ya hace con
// la bebida, porque la vuelta del hielo ya soporta cantidad (true = volvió todo, o
// los kilos que volvieron). El ajuste vive aquí como multiplicador por tipo de
// evento, con las mismas reglas que los factores de bebida: solo se guarda lo
// tocado (esparcido), para que una corrección de los valores de partida en una
// versión nueva siga llegando a todo lo que nadie ha tocado.
//
// Multiplica los kilos FINALES (después de temporada, barra y merma), no el ratio
// base: así el factor absorbe a la vez "llevamos más hielo de lo que dice el
// manual" y "la merma de 1,35 no es la nuestra", y converge igual que la bebida —
// aplicar la sugerencia y volver a medir da 1, no otra corrección encima.
/** @type {Record<string, number>} */
let factoresHielo = {};

/** @param {unknown} nuevos @returns {Record<string, number>} */
export function ponFactoresHielo(nuevos) {
  factoresHielo = saneaFactoresHielo(nuevos);
  return leerFactoresHielo();
}

/** @returns {Record<string, number>} */
export function leerFactoresHielo() {
  return { ...factoresHielo };
}

// Lo que se sube a la nube: como ya se guarda esparcido, es la propia lista limpia.
// Subir un 1 congelado taparía la corrección del valor de partida (mismo motivo que
// en los factores de bebida).
/** @param {Record<string, number>} [valores] @returns {Record<string, number>} */
export function factoresHieloCambiados(valores = {}) { return saneaFactoresHielo(valores); }

/** @param {unknown} brutos @returns {Record<string, number>} */
function saneaFactoresHielo(brutos) {
  /** @type {Record<string, number>} */
  const limpio = {};
  if (!brutos || typeof brutos !== "object") return limpio;
  const datos = /** @type {Record<string, any>} */ (brutos);
  // La lista de tipos es la de la calibración de bebida: son los cinco tipos de
  // evento que la app calcula (el nombre es histórico, la lista es la lista).
  TIPOS_BEBIDA.forEach(tipo => {
    const n = Number(datos[tipo]);
    // El mismo rango válido que en la bebida: fuera de 0,3–2 no hay un evento raro,
    // hay un dedo resbalando.
    if (esFactorValido(n)) limpio[tipo] = n;
  });
  return limpio;
}

// Un solo factor, con su 1 por defecto. Es la única forma de leerlo en el cálculo:
// así da igual que el tipo no exista (un evento antiguo) o que nunca se haya tocado.
/** @param {string} [tipo] @returns {number} */
export function factorHieloDe(tipo = "") {
  const f = Number(factoresHielo[tipo]);
  return esFactorValido(f) ? f : 1;
}

// Inmutable: devuelve la lista nueva. Poner el neutro es QUITAR el factor, no
// guardar un 1: guardarlo congelaría el ratio de partida el día que se corrija en
// una versión nueva.
/** @param {Record<string, number>|null|undefined} factores @param {string} tipo @param {number} valor @returns {Record<string, number>} */
export function conFactorHielo(factores, tipo, valor) {
  const siguiente = { ...(factores || {}) };
  const n = Number(valor);
  if (!esFactorValido(n) || n === 1) delete siguiente[tipo];
  else siguiente[tipo] = n;
  return siguiente;
}

// Devuelve las tres unidades porque las tres se usan: los kilos para pedirlo, las bolsas
// para contarlo al cargar y los taxis para saber cuánto sitio ocupa en el camión.
/**
 * @param {number} pax
 * @param {{ mesVerano?: boolean, horasBarra?: number, tieneCongelador?: boolean, tipo?: string }} [opciones]
 * @returns {{ kg: number, bolsas: number, taxis: number }}
 */
export function calcHielo(pax, { mesVerano = false, horasBarra = 0, tieneCongelador = false, tipo = "" } = {}) {
  const n = Math.max(0, Math.round(pax) || 0);
  if (!n) return { kg: 0, bolsas: 0, taxis: 0 };
  const temporada = mesVerano ? "verano" : "invierno";
  const merma = tieneCongelador ? 1 : MERMA_SIN_CONGELADOR[temporada];
  const kg = Math.ceil(n * KG_HIELO_POR_PAX[temporada] * (horasBarra > 0 ? 1 : FACTOR_SIN_BARRA) * merma * factorHieloDe(tipo));
  return {
    kg,
    bolsas: Math.ceil(kg / KG_POR_BOLSA),
    taxis: Math.max(1, Math.ceil(kg / KG_POR_TAXI)),
  };
}

// Cuántas copas/vasos caben en cada batea, por tipo
export const BATEA = { vino: 25, cava: 36, agua: 25, cubata: 25, chupito: 49 };
/** @param {number} units @param {number} size @returns {number} */
export function bateas(units, size) { return Math.ceil(units / size); }

// Botellas de 33cl por persona y DÍA en un rodaje. Va por temporada porque la
// diferencia es enorme: una jornada de doce horas al sol en agosto no se parece en
// nada a una de enero. Son ~2,1 litros por cabeza en verano y ~1,5 en invierno,
// además de los refrescos y del agua de 1,5L que va aparte.
export const BOTELLAS_AGUA_POR_PAX = { verano: 6.5, invierno: 4.5 };

// Tercios de respaldo que van SIEMPRE que se lleve barril. La cuenta de litros puede
// dar cero (dos barriles de 50L cubren de sobra a 100 personas), y salir sin una sola
// botella deja el evento entero colgando de que el tirador y el barril funcionen.
export const RESPALDO_TERCIOS_CON_BARRIL = 24;

// Rendimiento útil de un barril: se pierde ~15% entre espuma y el culo que no sale.
export const RENDIMIENTO_BARRIL = 0.85;

// Cuántos tercios hay que llevar además del barril (o en vez de él). Con barril nunca
// se baja del respaldo: si el tirador falla, quedarse a cero es quedarse sin cerveza.
/** @param {number} terciosNecesarios @param {number} litrosBarril @param {number} numBarriles @returns {number} */
export function terciosConBarril(terciosNecesarios, litrosBarril, numBarriles) {
  const litrosUtiles = litrosBarril * Math.max(1, numBarriles) * RENDIMIENTO_BARRIL;
  const restantes = Math.max(0, terciosNecesarios * 0.33 - litrosUtiles);
  return Math.max(
    litrosBarril > 0 ? RESPALDO_TERCIOS_CON_BARRIL : 0,
    Math.ceil(restantes / 0.33 / 24) * 24,
  );
}

// "h" son las horas de barra TOTALES (cóctel + copas) y mandan el volumen general.
// "horasCopas" se pasa aparte para lo que solo existe en la barra de copas: la tónica,
// que es mezcla de ginebra y en el aperitivo no se sirve. Por defecto vale lo mismo que
// h, para que quien llame sin ese dato siga viendo lo de siempre.
// "pax" es TODO el mundo (adultos + niños) y "alcoholPax" solo los adultos. La
// diferencia importa en comuniones: los niños no beben vino ni cerveza, pero sí agua y
// refresco — y son justo los que más refresco beben. Antes todo se calculaba sobre los
// adultos, así que en una comunión de 60+25 faltaba agua y refresco para 25 personas.
// "tipo" es el tipo de evento (boda, comunion...) y solo sirve para coger su factor de
// bebida. Sin él todos valen 1, que es exactamente lo que salía antes de que existieran.
/**
 * @param {number} pax comensales totales (adultos + niños)
 * @param {number} h horas de barra
 * @param {boolean} mesVerano
 * @param {boolean} tieneCongelador
 * @param {boolean} [tieneBrindisCava]
 * @param {number} [horasCopas]
 * @param {{ alcoholPax?: number, tipo?: string }} [opciones] alcoholPax = solo adultos
 * @returns {Record<string, any>}
 */
export function calcBebidas(pax, h, mesVerano, tieneCongelador, tieneBrindisCava = false, horasCopas = h, { alcoholPax = pax, tipo = "" } = {}) {
  const factor = factoresDeTipo(tipo);
  // Suelo de 2 horas para el VOLUMEN. Un evento sin barra libre lleva cerveza igual —
  // la de la comida— y eso antes se resolvía llamando aquí con un 2 fijo cuando no
  // había barra. El efecto era absurdo: media hora de cóctel pedía MENOS que no tener
  // barra (24 tercios contra 96), porque 0,5 caía por debajo de ese 2 que solo se
  // aplicaba al caso "sin barra". Tratándolo como suelo, subir horas nunca baja nada.
  const hVolumen = Math.max(2, h);
  const barFactor = hVolumen / 4;
  // Tercios por pax. Estos SÍ son números de casa, dictados por quien lleva los
  // eventos: 3 en verano y 2 en invierno. Van por encima del rango que dan los
  // manuales del sector (1,5-2/pax) a propósito — aquí se bebe más cerveza que la
  // media, y quedarse corto en agosto no tiene arreglo a media boda. La cerveza que
  // sobra vuelve sin abrir y se reutiliza, así que pasarse cuesta poco; quedarse
  // corto, mucho.
  const cervezaFactor = (mesVerano ? RATIOS_BEBIDA.cerveza.verano : RATIOS_BEBIDA.cerveza.invierno) * factor.cerveza;
  // El consumo de cerveza por pax no crece sin límite cuanto más dura la barra: a partir
  // de las 4h de referencia el consumo por persona se estabiliza (nadie bebe el doble de
  // cerveza solo porque la barra esté abierta el doble de horas). Por eso el factor de
  // horas se limita a 1: el ratio de arriba ya es el techo, no un punto de partida.
  const cerveza = Math.round((alcoholPax * cervezaFactor * Math.min(1, barFactor)) / 24) * 24;
  // Vino: calibrado con datos reales (65 pax → 30 blanco, 16-17 tinto)
  const vinoTotal = Math.round(alcoholPax * RATIOS_BEBIDA.vino * factor.vino);
  const ratioBlanco = mesVerano ? 0.65 : 0.45;
  const vinoBlanco = Math.round(vinoTotal * ratioBlanco);
  const vinoTinto = vinoTotal - vinoBlanco;
  // Cava: 0,2 botellas por pax (1 cada 5). El brindis suma 4 botellas fijas, no un
  // ratio: la referencia del sector para un brindis es 1 copa por cabeza (1 botella
  // cada 5-6 personas, 7-8 copas por botella), y con la base ya puesta eso son unas
  // cuatro botellas de más. Se probó subiendo el ratio a 0,28 y salían 28 botellas para
  // 100 pax — dos copas por cabeza, que es el techo de lo que alguien bebe en un
  // brindis, no la media. Las COPAS sí suben (ver calcCristaleria: de 1 a 1,5 por
  // cabeza), porque en el brindis todo el mundo coge copa a la vez — que es cosa
  // distinta de cuánto se bebe.
  const BOTELLAS_EXTRA_BRINDIS = 4;
  const cava = Math.round(alcoholPax * RATIOS_BEBIDA.cava * factor.cava) + (tieneBrindisCava ? BOTELLAS_EXTRA_BRINDIS : 0);
  // Los refrescos (Coca-Cola, Fanta, Sprite, Nestea) se consumen durante todo el evento,
  // no solo en las horas de barra libre: calibrado con datos reales (65 pax → 120 Coca
  // normal, 72 Zero, 12 Nestea), ya no depende de las horas de barra
  // OJO con este número: las fracciones de abajo suman 0,775, así que lo que sale de
  // verdad son ~4,4 unidades por persona, no 7,4.
  //
  // Coca normal (0,25), Zero (0,15) y Nestea (0,025) SÍ están calibrados: cuadran
  // exactos con el evento de 65 pax del que salieron (120 / 72 / 12). Los otros cuatro
  // —las dos Fantas, Aquarius y Sprite— se añadieron después sin ningún dato detrás y
  // sumaban 2,6 uds/pax ellos solos: el total sobrepasaba en un 84% su propia fuente de
  // calibración. Se bajan a la mitad hasta que haya un evento medido que diga otra cosa.
  const refrescoTotal = Math.round(pax * RATIOS_BEBIDA.refresco * factor.refresco);
  // El factor de horas se acota (máx. 1,75) para que una barra muy larga no dispare
  // la tónica/refrescos de mezcla por encima de lo real, igual que en la cristalería.
  const barFactorTope = Math.min(1.75, barFactor);
  // La tónica es MEZCLA DE GINEBRA: sin barra libre de copas no se sirve ni una. Salía
  // igual con solo cóctel —donde no hay destilados— y hasta sin barra ninguna, porque
  // el mínimo de 6 botellas se aplicaba siempre. En el aperitivo se sirve vermut,
  // cerveza y refresco; la ginebra no aparece hasta las copas.
  const tonica = horasCopas > 0 ? Math.max(6, Math.round(alcoholPax * 0.15 * barFactorTope)) : 0;
  // Agua 1,5L (Solán de Cabras) es la de cliente en mesa/barra — no confundir con el
  // Agua Vidaqua de personal, que se calcula aparte en calcPersonal(). El ratio es
  // 0,8 BOTELLAS por pax (~1,2 L/pax, en el rango alto del sector: 0,5-1 L/pax);
  // se sirve en packs de 6. Antes la cifra de botellas se etiquetaba como "packs"
  // (64 packs = 384 botellas para 80 pax, 7 L/pax — un disparate multiplicado ×6).
  // Un niño bebe agua, pero no la de un adulto: cuenta como 0,6. Contarlo entero
  // hinchaba el agua de una comunión sin motivo. Las de 33cl NO llevan esta corrección
  // —van tal cual— porque donde más se usan es en producción, y allí no suele haber
  // niños (de hecho el generador de rodaje fuerza ninos = 0).
  const FACTOR_AGUA_NINO = 0.6;
  const paxAgua = alcoholPax + Math.max(0, pax - alcoholPax) * FACTOR_AGUA_NINO;
  const agua15 = Math.round(paxAgua * 0.8);
  const agua15Packs = Math.max(2, Math.ceil(agua15 / 6));
  // El Red Bull sí es cosa de la barra: sin barra no va ninguno. Por eso mira las horas
  // DE VERDAD (h), no el suelo — si mirara el suelo, saldría en eventos sin barra.
  const redbull = h > 0 ? Math.max(6, Math.round(alcoholPax * 0.06 * barFactorTope)) : 0;
  // Aguas pequeñas van en cajas de 35 uds, ~3 uds/pax (ej. 65 pax ≈ 200 uds ≈ 6 cajas)
  const aguasPequenasUds = Math.round(pax * 3);
  const aguasPequenasCajas = Math.max(1, Math.ceil(aguasPequenasUds / 35));
  // El hielo sale de calcHielo: kilos, bolsas y taxis, y depende de la temporada, de si
  // hay barra y de si en el sitio hay congelador donde guardarlo (ver arriba). Antes era
  // "taxis = pax/30" y con congelador CERO, dando por hecho que se hacía in situ: una
  // finca con arca te deja guardarlo, no fabricarlo.
  const hielo = calcHielo(pax, { mesVerano, horasBarra: h, tieneCongelador, tipo });
  const taxisHielo = hielo.taxis;
  // El vermut (rojo/blanco) se sirve en el aperitivo, no solo con barra libre de copas:
  // se calcula aquí (siempre presente) en vez de en calcDestilados (que sí depende de horasCopas).
  // Calibrado con datos reales (65 pax → 6 rojo, 5 blanco).
  const vermutRojo = Math.max(2, Math.round(alcoholPax / 11));
  const vermutBlanco = Math.max(2, Math.round(alcoholPax / 13));
  // Tinto de verano: bebida de verano habitual, más presente en meses cálidos
  const tintoVerano = Math.max(2, Math.round(alcoholPax * (mesVerano ? 0.25 : 0.12)));
  return {
    // Sin margen extra: los ratios ya van por encima de los rangos del sector (vino
    // 0,72 bot/pax vs 0,33-0,5 estándar; cerveza 3/pax en verano vs 1,5-2; cava 0,2
    // vs 0,17). Añadir un 10% encima era pasarse.
    cerveza, vinoBlanco, vinoTinto,
    cava, tonica, agua15, agua15Packs, redbull,
    aguasPequenasCajas, aguasPequenasUds,
    vermutRojo, vermutBlanco, tintoVerano,
    cocaNormal: Math.round(refrescoTotal * 0.25),
    cocaZero:   Math.round(refrescoTotal * 0.15),
    // Cada refresco por separado, sin unificar (datos reales: Fanta naranja y limón
    // se piden como productos distintos, no combinados en una sola línea)
    fantaNaranja: Math.round(refrescoTotal * 0.04),
    fantaLimon:   Math.round(refrescoTotal * 0.035),
    aquarius:     Math.round(refrescoTotal * 0.05),
    sprite:     Math.round(refrescoTotal * 0.05),
    nestea:     Math.round(refrescoTotal * 0.025),
    // Agua con gas y cerveza sin alcohol se piden en cajas de 24 (1 caja mínimo real)
    aguaConGas: Math.round(pax * 0.37),
    cerveza00:  Math.round(alcoholPax * 0.37),
    sinGluten:  Math.round(alcoholPax * 0.3),
    taxisHielo, hieloKg: hielo.kg, hieloBolsas: hielo.bolsas,
  };
}

/** @param {number} pax @param {number} h horas de copas @returns {Record<string, number>} */
export function calcDestilados(pax, h) {
  // Factor de horas de copas acotado (máx. 1,75): en barras muy largas el consumo
  // de destilados por pax no sigue creciendo linealmente, igual que la cerveza/cristalería.
  const f = Math.min(1.75, h / 4);
  const r  = (/** @type {number} */ base) => Math.max(1, Math.round(base * f));
  // Estos licores no se compran de uno en uno: mínimo 2 botellas
  const r2 = (/** @type {number} */ base) => Math.max(2, Math.round(base * f));
  // ─── Reparto entre destilados ───────────────────────────────────────────────
  // La referencia del sector para una barra libre española es 40% ginebra, 30% ron,
  // 20% whisky, 10% vodka. La ginebra ya iba por encima de esa referencia (47% del
  // total) y se deja como está: es la que de verdad se bebe aquí y bajarla sería
  // arriesgar quedarse corto. Lo que se sube es lo que iba por DEBAJO — ron 28%,
  // whisky 17%, vodka 8% — hasta cuadrar con el sector tomando la ginebra de ancla.
  //
  // Los divisores salen de ahí: con la ginebra fija, ron = 0,75 × ginebra,
  // whisky = 0,5 × ginebra, vodka = 0,25 × ginebra. De 65 pax en adelante el reparto
  // cae en 40/30/20/10 clavado; por debajo los mínimos de 2 botellas lo distorsionan,
  // que es inevitable (no se compran medias botellas) y siempre hacia arriba.
  //
  // Ojo: esto NO está calibrado con consumo real vuestro, porque los datos de los
  // eventos guardados todavía no son fiables. Cuando haya dos o tres eventos con lo
  // que volvió sin abrir apuntado de verdad, estos números se reajustan con eso.
  return {
    // La ginebra se queda como estaba: calibrada con datos reales (65 pax, barra
    // libre de copas 4h → Seagrams+Tanqueray 9). El resto va al reparto del sector.
    ginebraPremium: r2(pax / 7.2), ginebraSabor: r(pax / 35),
    // Ron: los tres se reparten el 30% manteniendo su peso relativo (Barceló es el
    // que más se mueve, Bacardí y Negrita van detrás).
    ron: r(pax / 44), ronBlanco: r2(pax / 40), barcelo: r2(pax / 13),
    // Whisky (20%) y vodka (10%)
    ballantines: r2(pax / 12), vodka: r(pax / 24),
    // El tequila no entra en el reparto del sector (no es un destilado de barra
    // libre clásico, se pide aparte para chupitos): se queda como estaba.
    tequila: r2(pax / 33), tequilaSabor: r2(pax / 26),
    // Estos licores curiosos se piden fijos, sin escalar con el pax (no tiene sentido
    // aplicarles margen: ya son la cantidad mínima de compra)
    mistela: 2, baileys: 1, tiaMaria: 1, limoncello: 1, jagger: 1, peach: 1,
    cremaOrujo: 1, cazalla: 1, orujoHierbas: 1, marcaBlanca: 1,
  };
}

// Ojo: ya NO recibe las horas de cóctel. Cuando el vino, el agua y el cava dejaron de
// depender de las horas de barra, ese parámetro se quedó sin usar — y un hueco muerto en
// medio de siete argumentos posicionales es una bomba de relojería: al primero que le
// estorbe y lo quite, todos los de detrás se corren un sitio y "dobleCopa" pasa a leer
// las horas de copas. Fuera antes de que pase.
/**
 * @param {number} pax @param {number} horasCopas @param {boolean} dobleCopa
 * @param {boolean} tieneBrindisCava @param {boolean} llevaEntrante @param {number} [extraAguaDesayuno]
 * @returns {Record<string, { u: number, b: number, size: number } | null>}
 */
export function calcCristaleria(pax, horasCopas, dobleCopa, tieneBrindisCava, llevaEntrante, extraAguaDesayuno = 0) {
  // ─── CRISTALERÍA, AL EXTREMO ALTO DEL SECTOR ────────────────────────────────
  // Antes las copas de vino, agua y cava se multiplicaban por un factor de horas que
  // sumaba cóctel + copas, con tope 1,75. El razonamiento no se sostenía: durante la
  // barra de COPAS se beben cubatas —que tienen su cuenta aparte— no vino. Dos bodas
  // iguales de 100 personas, mismo vino y misma comida, salían con 500 y con 200 copas
  // de vino según si había barra de copas detrás. Se bebe el mismo vino en las dos.
  //
  // Ahora cada cosa va por su ratio del sector, cogiendo el extremo ALTO del rango, y
  // encima el 10% de siempre para roturas:
  //   vino   3/pax   (rango 2-3)
  //   agua   2/pax   (rango 1-2)
  //   cava   1,5/pax con brindis, 1 sin él (rango 1-1,5)
  //   cubata 4/pax   (rango 3-4), lo único que sí depende de las horas de barra
  const COPAS_VINO_POR_PAX = 3;
  const VASOS_AGUA_POR_PAX = 2;
  const COPAS_CAVA_POR_PAX = 1;
  const COPAS_CAVA_CON_BRINDIS = 1.5;
  const VASOS_CUBATA_TOPE = 4;

  // El cubata sí es de la barra: sin barra de copas no va ninguno, y crece con las
  // horas hasta el tope del sector. A las 4h ya está en 4/pax; de ahí no sube, porque
  // los camareros friegan y reutilizan durante el servicio.
  const copasBarraPorPax = horasCopas > 0 ? Math.min(VASOS_CUBATA_TOPE, 1 + horasCopas * 0.75) : 0;
  const mult = dobleCopa ? 2 : 1;
  // Margen de seguridad del 10% para cubrir roturas/pérdidas de cristalería durante el servicio
  const vino = conMargen(pax * COPAS_VINO_POR_PAX * mult);
  const agua = conMargen(pax * VASOS_AGUA_POR_PAX * mult) + extraAguaDesayuno;
  const cubata = conMargen(pax * copasBarraPorPax);
  const cavaCopas = conMargen(pax * (tieneBrindisCava ? COPAS_CAVA_CON_BRINDIS : COPAS_CAVA_POR_PAX));
  const fmt = (/** @type {number} */ u, /** @type {number} */ size) => ({ u: Math.ceil(u / size) * size, b: bateas(u, size), size });
  return {
    agua: fmt(agua, BATEA.agua), cubata: fmt(cubata, BATEA.cubata),
    vino: fmt(vino, BATEA.vino), cava: fmt(cavaCopas, BATEA.cava),
    chupito: llevaEntrante ? fmt(conMargen(pax), BATEA.chupito) : null,
  };
}

// Champaneras: iban fijas a 4 en todos los eventos, y en un día de 40 personas eso son
// dos de más ocupando sitio en el camión — mientras que en una boda de 200 se quedaban
// cortas. Van por gente: 2 de mínimo y una más por cada 50 personas.
//   40 → 2 · 100 → 3 · 150 → 4 · 200 → 5
/** @param {number} pax @returns {number} */
export function champaneras(pax) {
  return Math.max(2, Math.ceil(pax / 50) + 1);
}

// ─── BANDEJAS ─────────────────────────────────────────────────────────────────
// Cuántas bandejas van, por gente y por el tipo elegido. Estaba escrita TRES veces,
// idéntica carácter por carácter, en los tres generadores: tres copias de la misma
// fórmula son dos que se quedan atrás en cuanto alguien toque una.
//
//   · las de pasar comida van siempre (canapés, aperitivos, lo que sea)
//   · si el servicio es entero en bandeja hacen falta bastantes más
//   · y encima suman las del tipo elegido para el servicio (madera, plata o mixto)
/**
 * @param {number} pax
 * @param {{ soloBandeja?: boolean, tipoBandejas?: string, extraMadera?: number, extraPlata?: number, tipo?: string }} [opciones]
 * @returns {{ pasar: number, madera: number, plata: number }}
 */
export function calcBandejas(pax, { soloBandeja = false, tipoBandejas = "Mixto", extraMadera = 0, extraPlata = 0, tipo = "" } = {}) {
  // El factor de comida (ver comida.js) escala la cuenta por pax, NO los extras
  // manuales: los extraMadera/extraPlata son una decisión puntual de este evento y no
  // se cargan en el factor.
  const f = factorComidaVigente(tipo, "bandejas");
  const pasar = Math.max(2, Math.ceil((pax / 20) * f)) + (soloBandeja ? Math.max(2, Math.ceil((pax / 30) * f)) : 0);
  const delTipo = (/** @type {string} */ suyo) => tipoBandejas === "Mixto" ? Math.max(2, Math.ceil((pax / 20) * f))
    : (tipoBandejas === suyo ? Math.max(2, Math.ceil((pax / 10) * f)) : 0);
  return {
    pasar,
    madera: pasar + delTipo("Madera") + extraMadera,
    plata: pasar + delTipo("Plata") + extraPlata,
  };
}
