// ─── GENERADORES DE CHECKLIST ──────────────────────────────────────────────────
// La lógica pura que construye la checklist de cada tipo de evento a partir de sus
// opciones. Sin React, sin estado: dado un pax y unas opciones, siempre el mismo
// resultado — por eso vive aparte de App.jsx y se puede probar sin montar nada.
import {
  calcBebidas, calcDestilados, calcCristaleria, champaneras, calcBandejas,
  terciosConBarril, BOTELLAS_AGUA_POR_PAX, conMargen,
} from "./calculos.js";
import { factoresDeTipo } from "./bebida.js";
import { categoriaMenusEspeciales } from "./menus-especiales.js";
import { conSufijo } from "./checklist-format.js";
import { calcCarpas, CARPAS_EN_ALMACEN } from "./carpas.js";
import { repartoManteles, colorPorDefecto } from "./manteles.js";
import { lineasDeMesas, mesasParaVestir, TIPO_MESA_POR_DEFECTO } from "./mesas.js";
import { calcPaella } from "./paella.js";
import { leerRatios } from "./personal.js";

// Item "opcional": SIEMPRE ocupa su sitio en el array (nunca se quita del todo con un
// spread condicional), aunque la condición sea falsa — con cantidad null en ese caso.
// Así el orden natural de la categoría no depende de qué esté activo: si luego alguien
// edita a mano ese item y la condición deja de cumplirse, sigue en su misma posición en
// vez de "resucitar" al final de la lista (el render se encarga de ocultarlo salvo que
// haya una edición manual, ver el useMemo de "checklist").
function opt(condicion, tupla) {
  return condicion ? tupla : [tupla[0], null, ...tupla.slice(2)];
}

// El nombre y la etiqueta ALQUILER de la línea de sillas. Solo "Dealde" y "Carvillo" son
// alquiler de verdad — "Nuestras" y "No llevan" no lo son, y así hay que tratar también
// un origen sin elegir todavía (cadena vacía, un evento recién creado desde el
// calendario): antes de esto un origen vacío heredaba el nombre de un proveedor de
// mentira ("Sillas (alquiler )"), porque el único caso aparte era "Nuestras". Mismo
// criterio que ya usan App.jsx (esAlquiler, al sincronizar la recogida) y alquileres.js.
function sillasAlquiler(origenSillas, incluyeCojines = false) {
  if (origenSillas === "Nuestras") return { label: "Sillas (nuestras)", esAlquiler: false };
  if (origenSillas === "Dealde" || origenSillas === "Carvillo") {
    return { label: `Sillas (alquiler ${origenSillas}${incluyeCojines ? ", con cojines" : ""})`, esAlquiler: true };
  }
  return { label: "Sillas (proveedor sin elegir)", esAlquiler: false };
}

// ─── HELPERS DE CÁLCULO ───────────────────────────────────────────────────────

// Las mesas de trabajo: las de cocina. Dicho por quien las monta, son de 4 a 6 según el
// tamaño del evento, no más. En producción el buffet y la del camión se cuentan aparte,
// en su propio bloque, porque allí esa línea no es solo cocina.
//
// Antes salían de una tabla 7/11/13 que además se plantaba en 13 a partir de 100 pax:
// una boda de 120 y una de 300 cargaban las mismas. Para 100 personas pedía 11 mesas de
// cocina donde se montan 4 — siete de más en el camión, con sus manteles.
function calcMesasCocina(pax) {
  if (pax <= 100) return 4;
  if (pax <= 200) return 5;
  return 6;
}

// Buscar la ubicación del evento en Google Maps. Lo que se escribe es el nombre del
// sitio ("Finca La Alquería"), no unas coordenadas, y Maps lo busca igual de bien: se
// usa la URL de búsqueda, que funciona en el navegador, en Android y en iPhone (donde
// abre la aplicación de Maps si está instalada) sin depender de ninguna clave.
export function enlaceMapa(sitio) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((sitio || "").trim())}`;
}

// Personal de sala: usa el nº de camareros importado del Excel si lo hay; si no,
// lo calcula automáticamente por pax. El ratio del sector es 1 camarero cada 10-15
// pax en banquete sentado (boda/comunión/corporativo) y 1 cada 20 en formato buffet
// más informal (cumpleaños/producción) — de ahí el divisor configurable.
// El mínimo es 2 (en un banquete nunca se va con una sola persona de sala), pero en
// producciones pequeñas se pasa a 1: para 25 pax de rodaje no van 2 y 2.
function personalSala(pax, numCamareros, divisor = 20, minimo = 2) {
  return numCamareros > 0 ? numCamareros : Math.max(minimo, Math.ceil(pax / divisor));
}

// Consumibles para el propio personal de sala/cocina (no para los invitados). El
// "staff" extra (cocina, producción, refuerzo...) se suma a los camareros de sala,
// porque también bebe agua y usa vasos aunque no sirva mesas.
// Los packs de vasos de cartón y plástico vienen de 50 unidades
function calcPersonal(pax, numCamareros, numStaff = 0, divisor = 20, minimoSala = 2) {
  const n = personalSala(pax, numCamareros, divisor, minimoSala) + numStaff;
  return {
    n,
    // Los vasos de café son "mini" (tamaño espresso/cortado): siempre se llevan 3 packs
    vasosCartonPacks: 3,
    aguaVidaquaPacks: Math.max(1, Math.ceil(n / 6)),
    vasosPlasticoPacks: Math.max(1, Math.ceil(n / 50)),
  };
}

// Las mesas donde se SIENTA la gente viven en mesas.js: la cuenta depende del tipo
// elegido (rectangular nuestra o redonda de alquiler) y la usan los tres generadores.
//
// Las de COCINA no se eligen: son siempre rectangulares de 1,80, que es sobre lo que se
// prepara el servicio.

// Categoría de Café, compartida por los 3 tipos de evento
// Las 3 cafeteras son propiedad de la empresa (no alquiler):
// - Nespresso: cápsulas, cantidad calculada para cubrir el pax.
// - Bar: cafetera tipo bar (portátil), también funciona con cápsulas, no café molido.
// - Grande: la única cafetera industrial, hace cargas de ~100 cafés con café molido.
// En una producción se bebe café todo el día, desde que se monta a las 6 hasta que se
// recoge: no tiene nada que ver con los 2-3 cafés de sobremesa de un banquete. Por eso
// el ratio se pasa desde fuera en vez de salir del interruptor de desayuno.
const CAPSULAS_POR_PAX_PRODUCCION = 5.5;

function calcCafe(totalPax, tipoCafetera, hayDesayuno, paxConsumo = totalPax, sinVajilla = false, ratioCapsulas = null, paraInvitados = true, numPersonal = 0) {
  const items = [];
  // Sin invitados de por medio (formulario: "el café es solo para el personal") no se
  // pide nada de lo de invitados — ni tazas, ni platos, ni las cápsulas de sobra que
  // antes "tomaba prestadas" el personal de la máquina de invitados. Los vasos de
  // cartón del personal siguen siendo aparte y no dependen de este flag (calcPersonal,
  // en Servicio y limpieza) — lo único que cambia es si además hay máquina y cápsulas
  // para hacer ese café. En producción no hace falta nada de esto: ya lleva su propia
  // cafetera de mantenimiento sin depender de calcCafe (ver buildChecklistProduccion).
  if (paraInvitados) {
  // paxConsumo ≠ totalPax solo en producciones de varios días: lo que se gasta
  // (cápsulas, café, infusiones, azúcar, leches) se calcula sobre la suma de pax
  // de todos los días; lo reutilizable (tazas, platos, jarras) sobre el día mayor.
  // El estándar del sector es 1-1,5 tazas/pax (una boda real de 116 invitados usó 100
  // cafés, 0,86/pax); aquí se sube a ~2,2/3,2 para cubrir varios momentos de café en
  // una boda española (sobremesa, tarta, recogida) sin llegar a triplicar lo que de
  // verdad se sirve, como pasaba con el ratio anterior (3,1/4,5, sin relación con las
  // tazas realmente calculadas más abajo: 0,6+0,4 = 1 taza/pax)
  const capsulas = Math.ceil(paxConsumo * (ratioCapsulas ?? (hayDesayuno ? 3.2 : 2.2)));
  if (tipoCafetera === "Grande") {
    items.push(["Cafetera grande (industrial)", "1"], ["Café molido (industrial)", conSufijo(Math.max(1, Math.ceil(paxConsumo / 100)), "carga(s)")]);
  } else if (tipoCafetera === "Bar") {
    items.push(["Cafetera de bar", "1"], ["Cápsulas café (estándar/descafeinado)", conSufijo(capsulas, `para ${paxConsumo} pax`)], ["Cuencos para calentar leche", "2"]);
  } else {
    items.push(["Cafetera Nespresso", "1"], ["Cápsulas café (estándar/descafeinado)", conSufijo(capsulas, `para ${paxConsumo} pax`)], ["Cuencos para calentar leche", "2"]);
  }
  // Con desayuno se sirve más café por persona (todos toman, no solo parte de los pax)
  const factorLeche = hayDesayuno ? 0.9 : 0.6;
  const factorSolo  = hayDesayuno ? 0.7 : 0.4;
  // En producciones/rodajes el café se sirve en vaso de cartón con palito de madera, así
  // que no van tazas, platos ni cucharas de café (esos consumibles se cargan aparte).
  if (!sinVajilla) items.push(
    [`Tazas café con leche e infusiones${hayDesayuno ? " (desayuno)" : ""}`, String(conMargen(totalPax * factorLeche))],
    [`Tazas café solo y cortado${hayDesayuno ? " (desayuno)" : ""}`, String(conMargen(totalPax * factorSolo))],
    ["Platos de café", String(conMargen(totalPax))],
  );
  items.push(
    ["Infusiones (té variado + descafeinado)", conSufijo(Math.ceil(paxConsumo / 30), "caja")],
    ["Azucarillos y edulcorantes", conSufijo(Math.ceil(paxConsumo / 50), "caja")],
    [`Leches variadas (entera/desnatada/sin lactosa/avena)${hayDesayuno ? " (desayuno)" : ""}`, String(Math.max(4, Math.ceil(paxConsumo / (hayDesayuno ? 8 : 40))))],
    ["Jarras de leche", String(Math.max(2, Math.ceil(totalPax / (hayDesayuno ? 20 : 40))))],
  );
  } else if (numPersonal > 0) {
    // El personal curra horas largas y sigue queriendo su café aunque los invitados
    // no lo pidan: sin la máquina de invitados de la que "tomar prestado", hace falta
    // una propia, aunque sea modesta. ~2 cápsulas por persona cubren un par de rondas
    // durante el turno — muchas menos que las de invitados (2,2-3,2/pax), porque aquí
    // no hay sobremesa ni tarta, solo cortar el cansancio.
    items.push(
      ["Cafetera Nespresso (para el personal)", "1"],
      ["Cápsulas café (para el personal)", conSufijo(Math.max(2, Math.ceil(numPersonal * 2)), `para ${numPersonal} personas`)],
    );
  }
  return { nombre: "Café", items };
}

// ─── BUILD CHECKLIST ──────────────────────────────────────────────────────────
export function buildChecklist(evtKey, pax, horasCoctel, horasCopas, ninos, opts) {
  const cats = generadorDe(evtKey)(evtKey, pax, horasCoctel, horasCopas, ninos, opts);
  // Los menús especiales se cuentan de las alergias de las notas y salen los PRIMEROS,
  // en su propia categoría. Van aquí y no dentro de cada generador porque son los mismos
  // en los cinco tipos de evento: una alergia no depende de si es boda o rodaje. Si no
  // hay ninguna, la categoría no existe y la checklist sale exactamente igual que antes.
  const especiales = categoriaMenusEspeciales((opts && opts.notasEvento) || "");
  return especiales ? [especiales, ...cats] : cats;
}

function generadorDe(evtKey) {
  if (evtKey === "cumpleanos") return (k, ...a) => buildChecklistCumpleanos(...a);
  if (evtKey === "produccion") return (k, ...a) => buildChecklistProduccion(...a);
  return buildChecklistBoda;   // boda, comunión y evento corporativo
}

// Boda y comunión — fiel a "Checklist de Carga – BODA"
// La categoría de alcoholes. Estaba escrita DOS veces, palabra por palabra, en el
// generador de bodas y en el de cumpleaños... salvo por una línea: la boda lleva
// Martini y Crema de arroz y el cumpleaños no. Es decir, ya habían empezado a
// separarse, que es exactamente lo que pasa cuando la misma lista vive en dos sitios:
// se cambia una marca y nadie se acuerda de la otra.
//
// Los extras van como parámetro para no cambiar nada de lo que sale hoy: quien quiera
// que el cumpleaños lleve Martini tendrá que decirlo, no heredarlo por descuido.
function categoriaAlcoholes(destilados, extras = []) {
  return { nombre: "Alcoholes y licores", items: [
    ["Ginebra (Seagrams/Tanqueray)", String(destilados.ginebraPremium)],
    ["Ginebra de sabor (Puerto de Indias)", String(destilados.ginebraSabor)],
    ["Ron (Bacardí)", String(destilados.ron)], ["Ron saborizado (Negrita)", String(destilados.ronBlanco)],
    ["Tequila", String(destilados.tequila)], ["Tequila Rosa", String(destilados.tequilaSabor)],
    ["Vodka", String(destilados.vodka)],
    ["Mistela", String(destilados.mistela)], ["Baileys", String(destilados.baileys)],
    ["Tía María", String(destilados.tiaMaria)], ["Limoncello", String(destilados.limoncello)],
    ["Jagger (Jägermeister)", String(destilados.jagger)], ["Peche (licor de melocotón)", String(destilados.peach)],
    ["Crema de orujo", String(destilados.cremaOrujo)], ["Cazalla", String(destilados.cazalla)],
    ["Orujo de hierbas", String(destilados.orujoHierbas)],
    ["Ballantines", String(destilados.ballantines)], ["Barceló", String(destilados.barcelo)],
    ...extras,
    ["Otros licores marca blanca (Smirnoff)", String(destilados.marcaBlanca)],
  ] };
}

function buildChecklistBoda(evtKey, pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    dobleServicio, tamanoBarril = "No lleva", numBarriles = 1, llevaPaella, tipoBandejas, tipoBBQ = "", tipoHorno = "",
    mesVerano, tieneBrindisCava, fuerzaTextilTela, colorManteles, porcentajeBeige,
    tieneFrituras, numFrituras, llevaEntrante, llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas = 1, llevaPlatos, llevaCubiertos, numCamareros, numStaff = 0,
    soloBandeja,
    llevaPlatosPostre = llevaPlatos,
    llevaChillOut, numChillOut = 1,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera, cafeParaInvitados = true, llevaMobiliarioAlquiler,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero, llevaTarta = true,
    personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno,
    entranteCompartido, numEntrantesCompartir = 1,
    tipoNevera = "Mediana", tipoCongelador = "Mediana", tipoPaella, numPaellas = 0, origenSillas = "",
    tipoMesa = TIPO_MESA_POR_DEFECTO,
    estiloPlatoPrincipal = "Blanco liso", estiloPlatoPostre = "Blanco",
    paxPorCamarero = 0, numLogisticaEquipo = 0,
    llevaCarpas = false,
  } = opts;
  // Nº de logística para la lista de Personal: la gente real que hayas añadido en el
  // "Equipo de logística"; si no hay nadie, el recomendado (1 cada 60 pax).
  const numLogistica = numLogisticaEquipo > 0 ? numLogisticaEquipo : Math.max(1, Math.ceil(pax / 60));
  // El origen de las sillas (alquiler Dealde/Carvillo o propias) se refleja en el
  // nombre del item — el tag ALQUILER sale solo al detectar la palabra en el nombre.
  // Los cojines vienen incluidos con la silla de alquiler en bodas (no es un item
  // aparte que se pueda pedir por separado), así que se anota en el propio nombre
  // en vez de generar una línea "Cojines para sillas" suelta.
  const incluyeCojines = (origenSillas === "Dealde" || origenSillas === "Carvillo") && evtKey === "boda";
  // Las nuestras (y un origen aún sin elegir) no son alquiler, así que no llevan el tag
  // ni generan recogida — ver sillasAlquiler(), arriba.
  const { label: labelSillas, esAlquiler: esAlquilerSillas } = sillasAlquiler(origenSillas, incluyeCojines);

  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;
  // Si se lleva congelador (propio o de la finca) se puede hacer/almacenar hielo in situ:
  // solo hace falta pedir taxis de hielo cuando NO se lleva ninguno.
  const hayCongelador = tipoCongelador !== "No lleva";
  // Boda, Comunión/Bautizo y Corporativo comparten la mayor parte de la lista; estas
  // banderas activan/ocultan lo que es propio de cada uno (ver items con opt() abajo).
  const esComunion = evtKey === "comunion";
  const esCorporativo = evtKey === "corporativo";
  // Los ratios NO salen de los manuales del sector: salen de contar el personal que se
  // puso DE VERDAD en 19 eventos (la hoja de costes por evento). Los del sector se
  // quedaban cortos para cómo se trabaja aquí:
  //
  //   Banquete    iba a 1 cada 12 → la boda de 135 pax pedía 12 camareros y se
  //               pusieron 15; la de 100 pedía 9 y se pusieron 14.
  //               Medido: 9,0 · 7,1 · 9,0 · 6,7 · 8,7 pax por camarero → 1 cada 9.
  //
  //   Corporativo iba a 1 cada 25, pensado para cóctel de pie. Pero los de aquí no son
  //               de pie: 150 pax llevaron 13 camareros y la app pedía 6.
  //               Medido: 11,5 · 7,2 · 5,0 · 10,7 → 1 cada 10.
  //
  // Quedarse corto no es solo poner menos gente: de este número salen también los
  // delantales, las bandejas, los litos y los menús de personal.
  //
  // La excepción son los almuerzos ligeros (1 cada 22 medido). Para eso está el ratio
  // a mano del formulario, que sigue mandando sobre esto.
  //
  // Bug real, cazado al conectar el asistente: esto leía un 9/10 escrito aquí mismo,
  // sin mirar el ratio que ya se podía ajustar desde el panel del calendario
  // (leerRatios(), en personal.js) — cambiarlo ahí movía la previsión del calendario y
  // lo que calculaba el asistente, pero NUNCA la checklist de verdad. leerRatios()
  // siempre trae los 9/10/20 de fábrica si nadie ha tocado nada, así que esto no
  // cambia ni un número de los que ya salían — solo hace que ajustar el ratio, por fin,
  // llegue también aquí.
  const divisorCam = paxPorCamarero > 0 ? paxPorCamarero : (leerRatios()[evtKey] || (esCorporativo ? 10 : 9));

  // El agua, los refrescos y el hielo van sobre TODOS (los niños beben); el alcohol solo
  // sobre los adultos. Antes todo iba sobre los adultos y en una comunión de 60+25
  // faltaba agua y refresco para veinticinco personas.
  const bebidas    = calcBebidas(totalPax, horasBarraTotal, mesVerano, hayCongelador, tieneBrindisCava, horasCopas, { alcoholPax: pax, tipo: evtKey });
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  // Los vasos de cubata solo dependen de la barra libre de copas (0 si no está activada):
  // el cóctel/aperitivo no sirve cubatas. El vino, el agua y el cava NO miran las horas:
  // se bebe el mismo vino con la misma comida haya barra detrás o no.
  const cristal    = calcCristaleria(totalPax, horasCopas, dobleServicio, tieneBrindisCava, llevaEntrante, hayDesayuno ? Math.ceil(totalPax * 1.2) : 0);
  const usaTela    = evtKey === "boda" || fuerzaTextilTela;
  const cats       = [];

  cats.push({ nombre: "Electricidad y camión", items: [
    ["Regletas", String(Math.max(3, Math.ceil(pax / 50)))], ["Alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"], ["Cinta aislante", conSufijo(1, "rollo")],
    ["Bridas", conSufijo(1, "bolsa")], ["Imperdibles", conSufijo(1, "paquete")],
    ["Carros de servicio/transporte", "2"], ["Walkies", "2"],
  ]});

  // Personal (banquete emplatado): camareros según el ratio configurado, logística
  // 1 cada 60 pax (carga/transporte/montaje), cocina ~3 cada 50 pax.
  cats.push({ nombre: "Personal", items: [
    ["Camareros", String(personalSala(pax, numCamareros, divisorCam))],
    ["Logística", String(numLogistica)],
    ["Cocina", String(Math.max(2, Math.ceil(pax * 3 / 50)))],
  ]});

  // Bandejas para pasar comida (canapés, aperitivos, lo que sea): van SIEMPRE y se
  // dimensionan por pax, además de las que salgan por el tipo de bandeja elegido para
  // el servicio. Antes solo salían si marcabas "lleva canapés", y como en casi todos
  // los eventos se pasa algo en bandeja, lo normal era ir corto por no acordarse de
  // marcarlo. Si el servicio es entero de bandeja hacen falta unas cuantas más.
  // La fórmula vive en calculos.js: estaba escrita tres veces, una por generador
  const { madera: bandejasMadera, plata: bandejasPl } =
    calcBandejas(pax, { soloBandeja, tipoBandejas, extraMadera: extraBandejasMadera, extraPlata: extraBandejasPlata, tipo: evtKey });
  // Mesas altas (cóctel de pie): solo hacen falta si hay barra libre/aperitivo con la gente de pie
  const mesasAltas = hayBarra ? Math.max(2, Math.ceil(pax / 15)) : 0;
  // Carpas: antes solo existían en producción (sitios siempre al aire libre). Aquí son
  // la excepción, no la norma (fincas con nave/interior), de ahí que lleguen apagadas
  // por defecto — mismo cálculo compartido que producción (carpas.js), con el pax
  // normal del evento en vez de paxDelDiaGrande.
  const { numCarpas, faltanCarpas, paredes: paredesCarpas, pesas: pesasCarpas } =
    llevaCarpas ? calcCarpas(pax, opts.numCarpas) : {};
  cats.push({ nombre: "Mobiliario, sala y decoración", items: [
    ...lineasDeMesas(calcMesasCocina(pax), totalPax, tipoMesa).map(([n, c, alq]) => (alq ? [n, c, true] : [n, c])),
    opt(llevaCarpas, ["Carpas", faltanCarpas > 0
      ? conSufijo(numCarpas, `de ${CARPAS_EN_ALMACEN} en almacén · faltan ${faltanCarpas}, hay que alquilarlas`)
      : String(numCarpas)]),
    opt(llevaCarpas, ["Paredes de carpas", String(paredesCarpas)]),
    opt(llevaCarpas, ["Pesas (15kg)", String(pesasCarpas)]),
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax), esAlquilerSillas]),
    opt(llevaMobiliarioAlquiler, ["Mobiliario (alquiler Event Style)", "1", true]),
    opt(evtKey === "boda" && llevaTarta, ["Mesa redonda especial para Tarta", "1"]),
    ["Mesa 1x1 cuadrada", "—"], ["Mesa alta", mesasAltas > 0 ? String(mesasAltas) : "—"], ["Taburetes", "—"],
    ["Marcos para menú", "—"], ["Caja deco", "—"], ["Servilleteros de madera", "—"],
    opt(!esCorporativo, ["Guirnaldas de luces", "—"]),
    // Propio de Comunión / Bautizo
    opt(esComunion && llevaTarta, ["Mesa redonda (tarta comunión)", "1"]),
    opt(esComunion, ["Candy bar / mesa dulce", "—"]),
    opt(esComunion, ["Photocall / atrezzo", "—"]),
    // Propio de Evento corporativo
    opt(esCorporativo, ["Señalética / cartelería con logo", "—"]),
    opt(esCorporativo, ["Porta-nombres / acreditaciones", "—"]),
    opt(esCorporativo, ["Atril + micrófono", "—"]),
    opt(esCorporativo, ["Photocall / roll-up corporativo", "—"]),
    ["Cajas de madera para alturas", "—"], ["Tronas", ninos > 0 ? String(ninos) : "—"], ["Cestas de mimbre", "—"],
    opt(llevaPaella, ["Descansadores de paella", String(calcPaella(pax, tipoPaella, numPaellas, evtKey).n)]),
    ["Cubo basura cocina", "2"],
    // "Nevera roja" es la propia nevera grande de la empresa, no un mueble aparte
    opt(tipoNevera !== "No lleva", [tipoNevera === "Grande" ? "Nevera roja (grande)" : `Nevera (${tipoNevera})`, "1"]),
    opt(hayCongelador, [`Congelador (${tipoCongelador})`, "1"]),
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
  ]});

  const numPaella  = llevaPaella ? calcPaella(pax, tipoPaella, numPaellas, evtKey).n : 0;
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  // 1 bombona por paella + 1 por cada sartén de fritura + 1 si hay plancha de gas
  const nPlanchas  = llevaPlanchaGas ? Math.max(1, numPlanchasGas) : 0;
  const bombonas   = numPaella + numFritura + nPlanchas;
  // Paella y fuego: todo el equipo de fuego/paella junto (paella, difusores, trípode,
  // paravientos, bombonas, parisiene, barbacoa…), para distinguirlo y cargarlo cómodo.
  const paellaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella, numPaellas, evtKey);
    // Difusor y trípode se comparten con las frituras (misma herramienta), se suman en vez de listar aparte
    paellaItems.push([`Paella ${p.talla}`, String(p.n)], ["Paletas de paella", String(p.n)], ["Difusor", String(p.n + numFritura)], ["Trípode", String(p.n + numFritura)], ["Paravientos", String(p.n)]);
  }
  if (tieneFrituras) {
    paellaItems.push(["Sartén Parisiene (frituras)", String(numFritura)], ["Espumadera grande", String(Math.max(2, numFritura))]);
    if (!llevaPaella) paellaItems.push(["Difusor", String(numFritura)], ["Trípode", String(numFritura)]);
  }
  if (llevaPlanchaGas) paellaItems.push(["Plancha de gas", String(nPlanchas)]);
  // Sin fuego no hay bombonas: sin esto la categoría "Paella y fuego" se quedaba en
  // pantalla con una sola línea a 0, que no dice nada a quien carga.
  if (bombonas > 0) paellaItems.push(["Bombonas llenas", String(bombonas)]);
  if (tipoBBQ !== "no lleva") {
    paellaItems.push([`Barbacoa${tipoBBQ ? ` ${tipoBBQ}` : ""}`, String(Math.max(1, Math.ceil(pax / 60)))], ["Reja BBQ grande", "1"], ["Carbón", String(Math.max(2, Math.ceil(pax / 30)))], ["Leña", "1"], ["Pastillas de encender", "1"]);
  }
  cats.push({ nombre: "Paella y fuego", items: paellaItems });

  const cocinaItems = [];
  cocinaItems.push(["Cazuelas de barro", "—"], ["Cazuelas rojas", "—"], ["Gastros", "—"], ["Plancha (cocina)", "—"]);
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande", "1"]);
  cocinaItems.push(["Microondas", "1"], ["Batidora de vaso", "1"], ["Vitro", "1"]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  if (llevaArmarioCaliente) cocinaItems.push(["Armario caliente (alquiler Dealde)", "1", true]);
  cats.push({ nombre: "Cocina", items: cocinaItems });

  cats.push({ nombre: "Menaje y utensilios", items: [
    ["Maletín de cuchillos", "1"], ["Tablas de corte", "2"], ["Aceiteras de cristal", "—"], ["Saleros", "6"], ["Pimenteros", "6"],
    ["Olla mediana", "1"], ["Olla grande", "1"], ["Sartenes", "1"], ["Colador", "1"], ["Boles metálicos", "4"],
    ["Cucharones grandes", "3"], ["Pinzas largas", "2"], ["Copas metálicas", "Todas"],
    // La mesa de la tarta y los platos ya se cargaban; la pala y el cuchillo con los que
    // se corta, no. Es de esas cosas que solo se echan en falta con la tarta delante.
    opt(llevaTarta, ["Pala de tarta", "1"]),
    opt(llevaTarta, ["Cuchillo de tarta", "1"]),
  ]});

  cats.push({ nombre: "Cristalería", items: [
    [`Vasos de agua${dobleServicio ? " (doble)" : ""}`,  String(cristal.agua.u)],
    opt(cristal.cubata.u > 0, ["Vasos de cubata", String(cristal.cubata.u)]),
    opt(hayBarra, ["Vasos de chupito de plástico (barra libre)", conSufijo(Math.max(1, conMargen(pax * 1.5 / 80)), "paq. (80 uds)")]),
    [`Copas de vino${dobleServicio ? " (doble)" : ""}`,  String(cristal.vino.u)],
    ["Copas de cava",                                     String(cristal.cava.u)],
    ["Copa martini", "—"], ["Vaso whiskey", "—"],
    opt(!!cristal.chupito, ["Vasos chupito cristal (entrante)", cristal.chupito ? String(cristal.chupito.u) : ""]),
    opt(llevaJarrasCristal, ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))]),
    // Herramientas de barra/servicio de bebida: van con la cristalería, no con el mobiliario
    ["Champanera metálica grande", String(champaneras(pax))], ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"],
    ["Sacacorchos", "2"], ["Abridores de cerveza", "2"], ["Palangana cerveza/agua", String(Math.max(2, Math.ceil(pax / 25)))],
  ]});

  cats.push({ nombre: "Mantelería y textiles", items: [
    ...repartoManteles(mesasParaVestir(calcMesasCocina(pax), totalPax, tipoMesa) + 2 + mesasAltas, colorManteles || colorPorDefecto(evtKey), porcentajeBeige),
    ["Delantales", String(personalSala(pax, numCamareros, divisorCam) + 2)],
    ["Plancha de vapor (manteles)", "1"],
    ...(usaTela
      ? [["Servilletas de tela", String(conMargen(totalPax))], ["Servilletas grandes (extra)", conSufijo(conMargen(totalPax / 50), "paq. (50)")]]
      : [["Servilletas grandes", conSufijo(conMargen(totalPax * 3 / 50), "paq. (50)")]]),
    ["Servilletas cocktail", conSufijo(conMargen(totalPax * 3.5 / 100), "paq. (100)")],
  ]});

  {/* Jamón, tarta y desayuno se sirven en plato pequeño (mismo estilo que el postre):
     se suman al recuento de "Platos postre" en vez de generar una línea aparte.
     El entrante sí se queda aparte porque suele llevar su propio plato de plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0)
    + (evtKey === "boda" && llevaTarta ? totalPax : 0)
    + (hayDesayuno ? totalPax : 0);
  // Con doble servicio no basta con doblar 1:1: hace falta margen extra para el cambio
  // de plato/cubierto entre pases (roturas, retrasos en el fregado, etc.)
  const platosDoble = conMargen(dobleServicio ? totalPax * 2 + 50 : totalPax);
  const cubiertosDoble = conMargen(dobleServicio ? totalPax * 2 + 70 : totalPax);
  cats.push({ nombre: "Vajilla", items: [
    ...((!soloBandeja && llevaPlatos) ? [
      [`Platos trinchero (${estiloPlatoPrincipal})`, String(platosDoble)],
      ["Platos hondos", "—"], ["Plato pan", "—"], ["Boles negros", "—"], ["Boles blancos", "—"], ["Platos metálicos", "—"],
    ] : []),
    // El plato de postre va aparte del principal: se puede llevar postre aunque el
    // resto vaya en bandeja (y al revés), así que tiene su propio "No llevan".
    opt(!soloBandeja && llevaPlatosPostre, [`Platos postre (${estiloPlatoPostre})`, String(platosDoble + platosPostreExtra)]),
    ...(llevaCubiertos ? [
      ["Tenedores grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cuchillos grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cucharas grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cucharas postre", String(conMargen(totalPax))],
      ["Cucharas café", String(conMargen(totalPax * 0.8))],
    ] : []),
    opt(entranteCompartido, ["Platos extra entrante", conSufijo(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante), `${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax`)]),
  ]});

  const personal = calcPersonal(pax, numCamareros, numStaff, divisorCam);
  cats.push({ nombre: "Servicio y limpieza", items: [
    ["Fairy", conSufijo(1, "bote")], ["Estropajo", conSufijo(1, "paquete")], ["Papel plata", conSufijo(1, "rollo")], ["Film", conSufijo(1, "rollo")],
    ["Escoba", "1"], ["Mocho", "1"], ["Cubo", "1"], ["Recogedor", "1"],
    ["Bayetas", "4"], ["Trapos de horno", "4"], ["Papel Chemine", conSufijo(2, "rollo")], ["Bolsas de basura", "10"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
    ["Bandeja camareros", String(personalSala(pax, numCamareros, divisorCam))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, numCamareros, divisorCam))],
    ["Hojas de fichaje", "1"],
  ]});

  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno, totalPax, false, null, cafeParaInvitados, personal.n));

  // El barril de cerveza (30L/50L) descuenta esos litros de los tercios necesarios en
  // vez de sustituirlos del todo: puede haber tercios + barril (el barril cubre parte
  // y el resto se completa con botellín), solo barril (si cubre todo lo necesario) o
  // solo tercios (si no se lleva barril) — nunca se piden de más ni de menos.
  // El litraje nominal del barril NO es todo aprovechable: purgado del grifo/línea al
  // conectar, espuma y los restos que quedan sin servir al final suponen ~10-15% de
  // merma real en barra (estándar del sector para barriles de cerveza de barril). Se
  // calcula con un 85% de rendimiento útil para no quedarnos cortos de tercios de
  // repuesto si el barril rinde menos de lo nominal.
  // La cuenta vive en calculos.js (terciosConBarril). Estaba escrita dos veces —aquí y
  // en cumpleaños— y dos copias de la misma fórmula son una que se queda atrás.
  const litrosBarrilUd = tamanoBarril === "30L" ? 30 : tamanoBarril === "50L" ? 50 : 0;
  const tercerosRestantes = terciosConBarril(bebidas.cerveza, litrosBarrilUd, numBarriles);
  cats.push({ nombre: "Bebidas frías", items: [
    opt(litrosBarrilUd > 0, [`Barril de cerveza (${tamanoBarril})`, String(Math.max(1, numBarriles))]),
    opt(litrosBarrilUd > 0, ["Tirador de cerveza", "1"]),
    opt(tercerosRestantes > 0, ["Cerveza Alhambra (tercios)", String(tercerosRestantes)]),
    ["Vino blanco", conSufijo(bebidas.vinoBlanco, "botellas")], ["Vino tinto", conSufijo(bebidas.vinoTinto, "botellas")],
    ["Tinto de verano (1,5L)", conSufijo(bebidas.tintoVerano, "botellas")],
    ["Cava", conSufijo(bebidas.cava, "botellas")], ["Agua 1,5L (Solán de Cabras, cliente)", conSufijo(bebidas.agua15Packs, "packs (6 uds)")],
    ["Agua Vidaqua 1,5L (personal)", conSufijo(personal.aguaVidaquaPacks, "packs (6 uds)")],
    opt(llevaAguasPequenas, ["Aguas pequeñas (33cl)", conSufijo(bebidas.aguasPequenasCajas, "cajas (35 uds)")]),
    ["Coca-Cola normal", String(bebidas.cocaNormal)], ["Coca-Cola Zero", String(bebidas.cocaZero)],
    ["Fanta naranja", String(bebidas.fantaNaranja)], ["Fanta limón", String(bebidas.fantaLimon)], ["Aquarius", String(bebidas.aquarius)],
    ["Sprite", String(bebidas.sprite)], ["Nestea", String(bebidas.nestea)],
    // La tónica solo existe si hay barra libre de COPAS: es mezcla de ginebra, y en el
    // aperitivo no se sirve. Sin copas no aparece la línea siquiera — una línea a cero
    // en la lista de compra es una línea que alguien acaba comprando por si acaso.
    opt(horasCopas > 0, ["Tónica", conSufijo(bebidas.tonica, "botellas")]),
    ["Agua con gas", String(bebidas.aguaConGas)],
    ["Cerveza 0,0", String(bebidas.cerveza00)], ["Cerveza sin gluten", String(bebidas.sinGluten)],
    ["Vermut rojo", String(bebidas.vermutRojo)], ["Vermut blanco", String(bebidas.vermutBlanco)],
    ["Hielo", conSufijo(bebidas.hieloKg, `kg · ${bebidas.taxisHielo} taxis`)],
    opt(hayBarra, ["Redbull", String(bebidas.redbull)]),
  ]});

  // El carrito de licores de la boda lleva además Martini y Crema de arroz
  if (destilados) cats.push(categoriaAlcoholes(destilados, [["Martini", "1"], ["Crema de arroz", "1"]]));

  cats.push({ nombre: "Logística y retorno", items: [
    ["Cajas extra platos sucios", "1"], ["Cajas extra cubiertos sucios", "1"],
    ["Caja azul extra", "1"], ["Taxis comida", "—"],
  ]});

  return cats;
}

// Cumpleaños — fiel a "Checklist de Carga – cumpleaños"
function buildChecklistCumpleanos(pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    dobleServicio, llevaPaella, tipoHorno, tieneFrituras, numFrituras, llevaEntrante, soloBandeja,
    tieneBrindisCava, mesVerano, fuerzaTextilTela, colorManteles, porcentajeBeige, tipoCafetera, cafeParaInvitados = true,
    tamanoBarril = "No lleva", numBarriles = 1,
    llevaJamonero, personasPorPlatoEntrante, llevaAguasPequenas, hayDesayuno, llevaMobiliarioAlquiler,
    entranteCompartido, numEntrantesCompartir = 1,
    llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas = 1, llevaPlatos, llevaCubiertos, llevaPalomitera, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    llevaPlatosPostre = llevaPlatos, estiloPlatoPrincipal = "Blanco liso", estiloPlatoPostre = "Blanco",
    tipoPaella, numPaellas = 0, tipoNevera = "Mediana", tipoCongelador = "Mediana", llevaTarta = true, origenSillas = "",
    tipoMesa = TIPO_MESA_POR_DEFECTO,
    llevaChillOut, numChillOut = 1,
    llevaCarpas = false,
  } = opts;
  const { label: labelSillas, esAlquiler: esAlquilerSillas } = sillasAlquiler(origenSillas);
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarra = horasBarraTotal > 0;
  const totalPax = pax + ninos;
  const hayCongelador = tipoCongelador !== "No lleva";
  // Cumpleaños: formato informal, 1 camarero cada 20 pax salvo que se fije otro ratio
  // (a mano en el formulario, o el ajustable en leerRatios() — mismo bug y mismo
  // arreglo que en buildChecklistBoda, ver el comentario de allí).
  const divisorCam = opts.paxPorCamarero > 0 ? opts.paxPorCamarero : (leerRatios().cumpleanos || 20);

  const bebidas = calcBebidas(totalPax, horasBarraTotal, mesVerano, hayCongelador, tieneBrindisCava, horasCopas, { alcoholPax: pax, tipo: "cumpleanos" });
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  // Los vasos de cubata solo dependen de la barra libre de copas: el cóctel/aperitivo no sirve cubatas
  const cristal = calcCristaleria(totalPax, horasCopas, dobleServicio, tieneBrindisCava, llevaEntrante, hayDesayuno ? Math.ceil(totalPax * 1.2) : 0);
  // Bandejas para pasar comida (canapés, aperitivos, lo que sea): van SIEMPRE y se
  // dimensionan por pax, además de las que salgan por el tipo de bandeja elegido para
  // el servicio. Antes solo salían si marcabas "lleva canapés", y como en casi todos
  // los eventos se pasa algo en bandeja, lo normal era ir corto por no acordarse de
  // marcarlo. Si el servicio es entero de bandeja hacen falta unas cuantas más.
  // La fórmula vive en calculos.js: estaba escrita tres veces, una por generador
  const { madera: bandejasMadera, plata: bandejasPl } =
    calcBandejas(pax, { soloBandeja, tipoBandejas, extraMadera: extraBandejasMadera, extraPlata: extraBandejasPlata, tipo: "cumpleanos" });
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Regletas", String(Math.max(3, Math.ceil(pax / 50)))], ["Alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"],
    ["Cinta aislante", conSufijo(1, "rollo")], ["Bridas", conSufijo(1, "bolsa")], ["Walkies", "2"],
  ]});

  // Personal: en cumpleaños suele ser formato más informal (1:20); logística 1 cada
  // 60 pax (carga/transporte), cocina ~2 cada 50 pax.
  cats.push({ nombre: "Personal", items: [
    ["Camareros", String(personalSala(pax, opts.numCamareros, divisorCam))],
    ["Logística", String(opts.numLogisticaEquipo > 0 ? opts.numLogisticaEquipo : Math.max(1, Math.ceil(pax / 60)))],
    ["Cocina", String(Math.max(1, Math.ceil(pax * 2 / 50)))],
  ]});

  const { numCarpas: numCarpasCumple, faltanCarpas: faltanCarpasCumple,
    paredes: paredesCarpasCumple, pesas: pesasCarpasCumple } = llevaCarpas ? calcCarpas(pax, opts.numCarpas) : {};
  cats.push({ nombre: "Mobiliario", items: [
    // Igual que un banquete: las de cocina más las de la gente que se sienta
    ...lineasDeMesas(calcMesasCocina(pax), totalPax, tipoMesa).map(([n, c, alq]) => (alq ? [n, c, true] : [n, c])),
    opt(llevaCarpas, ["Carpas", faltanCarpasCumple > 0
      ? conSufijo(numCarpasCumple, `de ${CARPAS_EN_ALMACEN} en almacén · faltan ${faltanCarpasCumple}, hay que alquilarlas`)
      : String(numCarpasCumple)]),
    opt(llevaCarpas, ["Paredes de carpas", String(paredesCarpasCumple)]),
    opt(llevaCarpas, ["Pesas (15kg)", String(pesasCarpasCumple)]),
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax), esAlquilerSillas]),
    opt(llevaMobiliarioAlquiler, ["Mobiliario (alquiler Event Style)", "1", true]),
    ["Cubo basura reciclaje", "1"], ["Cubo basura cocina", "1"],
    ["Tronas", ninos > 0 ? String(ninos) : "—"], ["Cestas de mimbre", "—"],
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
    // En un cumpleaños siempre hay tarta y no se cargaba mesa para ella
    opt(llevaTarta, ["Mesa redonda para tarta", "1"]),
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
    opt(tipoNevera !== "No lleva", [`Nevera (${tipoNevera})`, "1"]),
    opt(hayCongelador, [`Congelador (${tipoCongelador})`, "1"]),
  ]});

  // Paella y fuego: todo el equipo de fuego/paella junto (para distinguirlo y cargarlo cómodo)
  const paellaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella, numPaellas, "cumpleanos");
    // El trípode se comparte con las frituras (misma herramienta), se suma en vez de listar aparte
    paellaItems.push([`Paella ${p.talla}`, String(p.n)], ["Paletas de paella", String(p.n)], ["Descansadores de paella", "2"], ["Trípode", String(p.n + numFritura)]);
  }
  if (tieneFrituras) {
    paellaItems.push(["Sartén Parisiene (frituras)", String(numFritura)], ["Difusor", String(numFritura)], ["Paravientos", "1"]);
    if (!llevaPaella) paellaItems.push(["Trípode", String(numFritura)]);
  }
  const nPlanchasCumple = llevaPlanchaGas ? Math.max(1, numPlanchasGas) : 0;
  if (llevaPlanchaGas) paellaItems.push(["Plancha de gas", String(nPlanchasCumple)]);
  // 1 bombona por paella + 1 por cada sartén de fritura + 1 si hay plancha de gas
  const bombonasCumple = (llevaPaella ? calcPaella(pax, tipoPaella, numPaellas, "cumpleanos").n : 0) + numFritura + nPlanchasCumple;
  if (bombonasCumple > 0) paellaItems.push(["Bombonas llenas", String(bombonasCumple)]);
  cats.push({ nombre: "Paella y fuego", items: paellaItems });

  const cocinaItems = [];
  if (tipoHorno === "pequeño" || tipoHorno === "ambos") cocinaItems.push(["Horno pequeño", "1"]);
  if (tipoHorno === "grande"  || tipoHorno === "ambos") cocinaItems.push(["Horno grande", "1"]);
  cocinaItems.push(["Microondas", "1"], ["Batidora de vaso", "1"], ["Vitro", "1"], ["Aceiteras de cristal", "—"], ["Saleros", "6"], ["Pimenteros", "6"]);
  if (llevaArmarioCaliente) cocinaItems.push(["Armario caliente (alquiler Dealde)", "1", true]);
  if (hayDesayuno) cocinaItems.push(["Sandwichera", "1"]);
  cats.push({ nombre: "Cocina y Electro", items: cocinaItems });

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín de cuchillos", "1"], ["Tablas de corte", "2"],
    ["Olla mediana", "1"], ["Olla grande", "1"], ["Sartenes", "1"], ["Colador", "1"],
    ["Caja salsas y arroces", "1"], ["Boles metálicos", "4"], ["Cucharones grandes", "3"],
    ["Servilleteros de madera", "2"], ["Caja cocina (varios)", "1"],
    // Con lo que se corta la tarta, que tampoco se cargaba aquí
    opt(llevaTarta, ["Pala de tarta", "1"]),
    opt(llevaTarta, ["Cuchillo de tarta", "1"]),
  ]});

  const usaTela = fuerzaTextilTela;
  cats.push({ nombre: "Mantelería y Textiles", items: [
    ...repartoManteles(mesasParaVestir(calcMesasCocina(pax), totalPax, tipoMesa) + 1, colorManteles || colorPorDefecto("cumpleanos"), porcentajeBeige),
    ["Plancha de vapor (manteles)", "1"],
    ["Delantales", String(personalSala(pax, opts.numCamareros, divisorCam) + 2)], ["Bayetas", "4"], ["Trapos de horno", "4"],
    ...(usaTela
      ? [["Servilletas de tela", String(conMargen(totalPax))], ["Servilletas grandes (extra)", conSufijo(conMargen(totalPax / 50), "paq. (50)")]]
      : [["Servilletas grandes", conSufijo(conMargen(totalPax * 3 / 50), "paq. (50)")]]),
    ["Servilletas cocktail", conSufijo(conMargen(totalPax * 3.5 / 100), "paq. (100)")],
  ]});

  {/* Jamón y desayuno se sirven en plato pequeño (mismo estilo que el postre): se suman
     al recuento de "Platos postre" en vez de generar una línea aparte. El entrante sí se
     queda aparte porque suele llevar su propio plato/bol distinto. */}
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0) + (hayDesayuno ? totalPax : 0);
  // Con doble servicio no basta con doblar 1:1: hace falta margen extra para el cambio
  // de plato/cubierto entre pases (roturas, retrasos en el fregado, etc.)
  const platosDoble = conMargen(dobleServicio ? totalPax * 2 + 50 : totalPax);
  const cubiertosDoble = conMargen(dobleServicio ? totalPax * 2 + 70 : totalPax);
  cats.push({ nombre: "Vajilla, Cubertería y Cristalería", items: [
    ...((!soloBandeja && llevaPlatos) ? [
      [`Platos trinchero (${estiloPlatoPrincipal})`, String(platosDoble)], ["Platos metálicos", "—"],
    ] : []),
    opt(!soloBandeja && llevaPlatosPostre, [`Platos postre (${estiloPlatoPostre})`, String(platosDoble + platosPostreExtra)]),
    ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))],
    ...(llevaCubiertos ? [
      ["Tenedores grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cuchillos grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cucharas grandes", String(cubiertosDoble + (hayDesayuno ? totalPax : 0))],
      ["Cucharas postre", String(conMargen(totalPax))],
    ] : []),
    [`Copas de vino${dobleServicio ? " (doble)" : ""}`, String(cristal.vino.u)],
    ["Vasos de agua", String(cristal.agua.u)],
    ["Copas de cava", String(cristal.cava.u)],
    opt(cristal.cubata.u > 0, ["Vasos de cubata", String(cristal.cubata.u)]),
    opt(hayBarra, ["Vasos de chupito de plástico (barra libre)", conSufijo(Math.max(1, conMargen(pax * 1.5 / 80)), "paq. (80 uds)")]),
    opt(!!cristal.chupito, ["Vasos chupito cristal (entrante)", cristal.chupito ? String(cristal.chupito.u) : ""]),
    opt(entranteCompartido, ["Platos extra entrante", conSufijo(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante), `${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax`)]),
    // Herramientas de barra/servicio de bebida: van con la cristalería, no con el mobiliario
    ["Champanera metálica grande", String(champaneras(pax))], ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"], ["Abridores de cerveza", "2"],
    ["Pinzas largas", "2"], ["Copas metálicas", "—"], ["Conchas", "—"],
  ]});

  const personal = calcPersonal(pax, opts.numCamareros, opts.numStaff, divisorCam);
  cats.push(calcCafe(totalPax, tipoCafetera, hayDesayuno, totalPax, false, null, cafeParaInvitados, personal.n));

  // Faltaban el vino, la cerveza y el cava: se cargaban las copas de vino y de cava pero
  // no había nada que servir en ellas. Se calculan igual que en la boda: si hay barril,
  // los litros que da se descuentan de los tercios en vez de sumarse.
  const barrilLitros = tamanoBarril === "30L" ? 30 : tamanoBarril === "50L" ? 50 : 0;
  // Misma cuenta que en la boda, y ahora literalmente la misma función (calculos.js)
  const terciosCerveza = terciosConBarril(bebidas.cerveza, barrilLitros, numBarriles);
  cats.push({ nombre: "Bebidas", items: [
    opt(barrilLitros > 0, [`Barril de cerveza (${tamanoBarril})`, String(Math.max(1, numBarriles))]),
    opt(barrilLitros > 0, ["Tirador de cerveza", "1"]),
    opt(terciosCerveza > 0, ["Cerveza Alhambra (tercios)", String(terciosCerveza)]),
    ["Vino blanco", conSufijo(bebidas.vinoBlanco, "botellas")],
    ["Vino tinto", conSufijo(bebidas.vinoTinto, "botellas")],
    ["Cava", conSufijo(bebidas.cava, "botellas")],
    ["Tinto de verano (1,5L)", conSufijo(bebidas.tintoVerano, "botellas")],
    ["Coca-Cola normal", String(bebidas.cocaNormal)], ["Coca-Cola Zero", String(bebidas.cocaZero)],
    ["Fanta naranja", String(bebidas.fantaNaranja)], ["Fanta limón", String(bebidas.fantaLimon)],
    ["Aquarius", String(bebidas.aquarius)], ["Sprite", String(bebidas.sprite)], ["Nestea", String(bebidas.nestea)],
    ["Agua 1,5L (Solán de Cabras, cliente)", conSufijo(bebidas.agua15Packs, "packs (6 uds)")],
    ["Agua Vidaqua 1,5L (personal)", conSufijo(personal.aguaVidaquaPacks, "packs (6 uds)")],
    opt(llevaAguasPequenas, ["Aguas pequeñas (33cl)", conSufijo(bebidas.aguasPequenasCajas, "cajas (35 uds)")]),
    ["Agua con gas", String(bebidas.aguaConGas)],
    ["Hielo", conSufijo(bebidas.hieloKg, `kg · ${bebidas.taxisHielo} taxis`)],
  ]});

  if (destilados) cats.push(categoriaAlcoholes(destilados));

  cats.push({ nombre: "Limpieza", items: [
    ["Fairy", conSufijo(1, "bote")], ["Estropajo", conSufijo(1, "paquete")], ["Papel plata", conSufijo(1, "rollo")], ["Film", conSufijo(1, "rollo")], ["Papel Chemine", conSufijo(2, "rollo")],
    ["Escoba", "1"], ["Mocho", "1"], ["Cubo", "1"], ["Recogedor", "1"],
    ["Cajas vacías", "2"], ["Caja azul", "1"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
    ["Bandeja camareros", String(personalSala(pax, opts.numCamareros, divisorCam))],
    ["Litos (paño bandeja camarero)", String(personalSala(pax, opts.numCamareros, divisorCam))],
    ["Hojas de fichaje", "1"],
  ]});

  return cats;
}

// Eventos corporativos / producciones — fiel a "Checklist de Carga – Producciones"
function buildChecklistProduccion(pax, horasCoctel, horasCopas, ninos, opts) {
  const {
    llevaPaella, tieneFrituras, numFrituras, tipoCafetera, cafeParaInvitados = true, dobleServicio, hayDesayuno,
    llevaArmarioCaliente, llevaPalomitera, llevaJamonero, llevaPlatos, llevaCubiertos, numPlanchasGas = 1,
    llevaPlatosPostre = llevaPlatos, estiloPlatoPrincipal = "Blanco liso", estiloPlatoPostre = "Negro/gris",
    soloBandeja, personasPorPlatoEntrante, tipoBandejas, extraBandejasMadera, extraBandejasPlata,
    entranteCompartido, numEntrantesCompartir = 1,
    tipoPaella, numPaellas = 0, numCamareros, numStaff = 0, fuerzaTextilTela, origenSillas = "",
    tipoMesa = TIPO_MESA_POR_DEFECTO,
    llevaChillOut, numChillOut = 1, tipoHorno = "pequeño",
    llevaCarpas = true, llevaGenerador = true, mesVerano = true,
  } = opts;
  const { label: labelSillas, esAlquiler: esAlquilerSillas } = sillasAlquiler(origenSillas);
  const numFritura = tieneFrituras ? Math.max(1, numFrituras) : 0;
  const usaTela = fuerzaTextilTela;
  // Producción de varios días con pax distinto por día (ej. 12+17+12): el equipo
  // reutilizable (mesas, plancha, vajilla...) se dimensiona para el día de MÁS pax,
  // y lo consumible (refrescos, aguas, vasos, servilletas, cápsulas...) para la SUMA
  // de todos los días. Sin días definidos funciona como siempre (un solo día).
  const diasPax = (opts.diasProduccion || []).map(d => parseInt(d, 10)).filter(n => n > 0);
  const nDias = Math.max(1, diasPax.length);
  if (diasPax.length) { pax = Math.max(...diasPax); ninos = 0; }
  const totalPax = pax + ninos;
  const paxConsumo = diasPax.length ? diasPax.reduce((a, b) => a + b, 0) : totalPax;
  // Producción: equipo de rodaje 1 cada 20 pax salvo que se fije otro ratio (a mano en
  // el formulario, o el ajustable en leerRatios() — mismo bug y mismo arreglo que en
  // buildChecklistBoda, ver el comentario de allí).
  const divisorCam = opts.paxPorCamarero > 0 ? opts.paxPorCamarero : (leerRatios().produccion || 20);
  // Producciones pequeñas (hasta 30 pax): 2 de sala/office y 1 de cocina. Estuvo en 1 y
  // 1 porque 2 y 2 parecía demasiado para un rodaje de 25 pax, pero al contar lo que se
  // puso de verdad salen 2 de sala en los dos casos medidos —un rodaje de 20 pax y una
  // producción de 30—, y en la de 30 exactamente 2 de sala y 1 de cocina. Se ajusta a
  // eso: los dos únicos datos que hay dicen lo mismo.
  const factorRefresco = factoresDeTipo("produccion").refresco;
  const produPequena = pax <= 30;
  const nSala = numCamareros > 0 ? numCamareros : (produPequena ? 2 : personalSala(pax, numCamareros, divisorCam));
  const nCocina = produPequena ? 1 : Math.max(2, Math.ceil(pax * 2 / 50));
  // En producciones no hay barra libre (ni cóctel ni copas): solo refrescos, agua
  // con gas y aguas (cajas de 33cl y botellas de 1,5L) — nada de alcohol ni cristalería
  const personal = calcPersonal(pax, nSala, numStaff, divisorCam);
  // Bandejas para pasar comida (canapés, aperitivos, lo que sea): van SIEMPRE y se
  // dimensionan por pax, además de las que salgan por el tipo de bandeja elegido para
  // el servicio. Antes solo salían si marcabas "lleva canapés", y como en casi todos
  // los eventos se pasa algo en bandeja, lo normal era ir corto por no acordarse de
  // marcarlo. Si el servicio es entero de bandeja hacen falta unas cuantas más.
  // La fórmula vive en calculos.js: estaba escrita tres veces, una por generador
  const { madera: bandejasMadera, plata: bandejasPl } =
    calcBandejas(pax, { soloBandeja, tipoBandejas, extraMadera: extraBandejasMadera, extraPlata: extraBandejasPlata, tipo: "produccion" });
  const cats = [];

  cats.push({ nombre: "Electricidad y otros", items: [
    ["Focos de luz", "1"],
    ["Regletas", String(Math.max(3, Math.ceil(pax / 50)))], ["Alargadores", String(Math.max(3, Math.ceil(pax / 50)))], ["Herramientas", "1"],
    ["Cinta aislante", conSufijo(1, "rollo")], ["Bridas", conSufijo(1, "bolsa")],
    // La garrafa de gasolina va con el generador: si no se lleva generador, tampoco.
    // El generador es alquilado (SOS) y va marcado como tal; la gasolina la ponemos nosotros.
    opt(llevaGenerador, ["Generador", "1", true]), opt(llevaGenerador, ["Garrafa gasolina (llena)", "1"]),
    ["Walkies", "2"], ["Máquina pegatinas", "1"],
  ]});

  // Personal de rodaje: equipo de sala/office (1:20) y cocina ~2 cada 50 pax.
  cats.push({ nombre: "Personal", items: [
    ["Camareros / office", String(nSala)],
    ["Logística", String(opts.numLogisticaEquipo > 0 ? opts.numLogisticaEquipo : Math.max(1, Math.ceil(pax / 60)))],
    ["Cocina", String(nCocina)],
  ]});

  // Carpas: las dos fijas de siempre (la del buffet y la del culo del camión) se suman
  // aparte de la zona de comer, igual que ya se hace con las mesas (por pax + 4 de
  // buffet + 1 del camión). Antes iba todo en una sola cuenta de pax/12, así que esas
  // dos se comían el número: con 25 pax salían 3 en total y quedaba UNA sola para que
  // comieran 25 personas. La zona de comer sigue el estándar de las alquiladoras: una
  // 3x3 cubre ~12 personas de pie (0,75 m²/pax). Todo editable a mano si el sitio ya
  // tiene sombra, nave o interior.
  // Cuántas hacen falta: la cuenta de siempre a partir del pax, salvo que alguien haya
  // dicho un número (desde el formulario o a mano), que manda sobre el cálculo — el
  // sitio lo ha visto una persona y la cuenta no.
  // Lo que hay en almacén: no se puede cargar más de lo que se tiene. La cantidad que
  // sale es la que se coge del almacén, y si hacen falta más se avisa al lado para
  // poder alquilar la diferencia a tiempo. Misma cuenta compartida que boda/cumpleaños
  // (carpas.js), aquí con el pax del día grande (ya resuelto arriba).
  const { numCarpas, faltanCarpas, paredes: paredesCarpas, pesas: pesasCarpas } = calcCarpas(pax, opts.numCarpas);
  const numChafers = Math.max(2, Math.ceil(pax / 40));
  // Las mesas de 1,8m van todas en un único total: las del BUFFET (4 en rodajes
  // normales, 5 en los grandes) + 1 para el camión + las de la gente que se sienta a
  // comer. La cuadrada 1x1 de la zona de cajas sucias va aparte porque es otro tipo.
  //
  // Antes la base salía de una tabla por pax (7/11/13, plantada en 13 por encima de 100)
  // y las de comer no se contaban: un rodaje de 25 personas cargaba 16 mesas sin que
  // ninguna fuera para sentarse. Ahora es al revés y cuadra con lo que se monta.
  const MESAS_BUFFET = pax <= 100 ? 4 : 5;
  const MESA_CAMION = 1;

  // En rodajes siempre aparece gente que no estaba en la lista (técnicos, productora,
  // visitas), así que las sillas se piden con 5 de más sobre el pax del día.
  // (con 0 pax no se suman: un evento aún sin rellenar no debe pedir 5 sillas)
  const SILLAS_EXTRA = totalPax > 0 ? 5 : 0;
  cats.push({ nombre: "Mobiliario", items: [
    ...lineasDeMesas(MESAS_BUFFET + MESA_CAMION, totalPax, tipoMesa).map(([n, c, alq]) => (alq ? [n, c, true] : [n, c])),
    ["Mesa 1x1 cuadrada (zona cajas sucias)", "1"],
    // Mesa larga fuera: las largas del rodaje son las de 1,8m de arriba, así que era
    // una línea repetida que solo hacía dudar de si había que cargar algo más.
    ["Mesa redonda", "—"],
    opt(origenSillas !== "No llevan", [labelSillas, String(totalPax + SILLAS_EXTRA), esAlquilerSillas]),
    // En un rodaje se separa mucho más residuo que en un banquete: van 3 de reciclaje
    ["Cubo basura reciclaje", "3"], ["Cubo basura cocina", "1"],
    ["Cajas de madera para alturas", "—"], ["Marcos para menú", "—"],
    // Carpas, paredes y pesas en tres líneas: antes ponía "Carpas con paredes y pesas"
    // y más abajo otra línea de paredes, así que no se sabía si las de la primera
    // estaban incluidas o no. Tres paredes por carpa (tres caras cerradas y una
    // abierta para entrar) y dos pesas por carpa.
    opt(llevaCarpas, ["Carpas", faltanCarpas > 0
      ? conSufijo(numCarpas, `de ${CARPAS_EN_ALMACEN} en almacén · faltan ${faltanCarpas}, hay que alquilarlas`)
      : String(numCarpas)]),
    opt(llevaCarpas, ["Paredes de carpas", String(paredesCarpas)]),
    // Las pesas son las que hay: se cargan todas y se reparten entre las carpas más
    // expuestas al viento, no van por carpa
    opt(llevaCarpas, ["Pesas (15kg)", String(pesasCarpas)]),
    ["Moqueta", "—"],
    ["Cestas de mimbre", "—"],
    // Decoración del buffet: la cantidad se pone a mano según el sitio, igual que
    // el resto de la decoración de esta categoría
    ["Jarrones de cristal", "—"], ["Flores", "—"],
    opt(llevaPalomitera, ["Carrito palomitera", "1"]),
    opt(llevaChillOut, ["Chill out", String(numChillOut)]),
  ]});

  // Paella y fuego: todo el equipo de fuego/paella junto (para distinguirlo y cargarlo cómodo).
  // Paravientos solo tienen sentido con fuego fuera (paellas/frituras): uno por foco.
  const numPaellaProd = llevaPaella ? calcPaella(pax, tipoPaella, numPaellas, "produccion").n : 0;
  const numParavientos = numPaellaProd + numFritura;
  const paellaItems = [];
  if (llevaPaella) {
    const p = calcPaella(pax, tipoPaella, numPaellas, "produccion");
    paellaItems.push([`Paella ${p.talla}`, String(p.n)], ["Paletas de paella", String(p.n)]);
  }
  paellaItems.push(["Trípode", String(1 + numFritura)]);
  if (numParavientos > 0) paellaItems.push(["Paravientos", String(numParavientos)]);
  if (tieneFrituras) paellaItems.push(["Sartén Parisiene (frituras)", String(numFritura)], ["Difusor", String(numFritura)]);
  // En producción la plancha de gas va fija, pero puede ir más de una: cada una lleva
  // su bombona, así que el número manda sobre las dos líneas.
  const nPlanchasProd = Math.max(1, numPlanchasGas);
  paellaItems.push(["Plancha de gas", String(nPlanchasProd)]);
  // 1 bombona por paella + 1 por cada sartén de fritura + 1 por cada plancha de gas
  paellaItems.push(["Bombonas llenas", String(numPaellaProd + numFritura + nPlanchasProd)]);
  cats.push({ nombre: "Paella y fuego", items: paellaItems });

  cats.push({ nombre: "Cocina y sala", items: [
    // (La plancha de gas va en "Paella y fuego" junto al resto de fuego)
    // Mesa caliente para mantener el pase: 1 por cada ~40 pax del día grande
    // El horno lo elige el selector de Equipamiento, igual que en el resto de
    // eventos: aquí estaba fijo en "Horno pequeño" y cambiar a Grande o Ambos no
    // hacía nada.
    opt(tipoHorno === "pequeño" || tipoHorno === "ambos", ["Horno pequeño", "1"]),
    opt(tipoHorno === "grande" || tipoHorno === "ambos", ["Horno grande", "1"]),
    ["Microondas", "1"], ["Batidora de vaso", "1"], ["Mesas calientes", String(Math.max(1, Math.ceil(pax / 40)))],
    // Termos de café/agua caliente: uno por cada ~25 pax (aguantan 8-10 tazas)
    // "Butano" fuera: era la misma bombona que ya sale contada en "Paella y fuego"
    // (una por paella, una por sartén de fritura y una por plancha de gas), así que
    // aparecía dos veces con dos nombres distintos.
    ["Vitro", "1"], ["Termos con tapa", String(Math.max(2, Math.ceil(pax / 25)))],
    ["Exprimidor", "1"], ["Sandwichera", "1"], ["Neveras playa grandes (llenar de hielo)", "2"],
    ["Neveras playa pequeñas", "2"], ["Chafers", String(numChafers)],
    opt(llevaArmarioCaliente, ["Armario caliente (alquiler Dealde)", "1", true]),
  ]});

  cats.push({ nombre: "Menaje y Utensilios", items: [
    ["Maletín de cuchillos", "1"], ["Tablas de corte", "2"],
    ["Olla mediana", "1"], ["Olla grande", "1"], ["Sartenes", "1"], ["Colador", "1"],
    ["Boles metálicos", "4"], ["Cucharones grandes", "3"], ["Pinzas largas", "2"],
    // Cada chafer trabaja con 2 gastros (el que está sirviendo + el de reposición)
    ["Servilleteros de madera", "2"], ["Gastros", String(numChafers * 2)], ["Caja cocina (varios)", "1"],
    ["Aceiteras de cristal", "—"], ["Saleros", "6"], ["Pimenteros", "6"], ["Caja salsas y arroces", "1"],
  ]});

  cats.push({ nombre: "Mantelería y Textiles", items: [
    // Un mantel por mesa de servicio y de buffet (la del camión y la de cajas
    // sucias van sin vestir) + 1 de repuesto
    ...repartoManteles(mesasParaVestir(MESAS_BUFFET + MESA_CAMION, totalPax, tipoMesa) + 1, opts.colorManteles || colorPorDefecto("produccion"), opts.porcentajeBeige),
    ["Plancha de vapor (manteles)", "1"],
    ["Delantales", String(nSala + 2)], ["Bayetas", "4"], ["Trapos de horno", "4"],
    ["Bandeja camareros", String(nSala)],
    ["Litos (paño bandeja camarero)", String(nSala)],
  ]});

  {/* Jamón y desayuno se sirven en plato pequeño (mismo estilo que el postre): se suman
     al recuento de "Platos postre" en vez de generar una línea aparte. El entrante sí se
     queda aparte porque suele llevar su propio plato/bol distinto. */}
  // En un rodaje se come DOS veces: el desayuno de la mañana y la comida. Las dos con
  // cubierto, y el desayuno además con su plato pequeño. Así que los cubiertos van
  // siempre para dos servicios y el plato de postre lleva uno por cabeza de más — no
  // depende de la casilla "Hay desayuno", que es para el evento suelto que lo pide.
  const cubiertosProdu = conMargen(totalPax * 2);
  const platosPostreExtra = (llevaJamonero ? Math.ceil(pax * 0.3) : 0) + totalPax;
  // Con doble servicio no basta con doblar 1:1: hace falta margen extra para el cambio
  // de plato/cubierto entre pases (roturas, retrasos en el fregado, etc.)
  const platosDoble = conMargen(dobleServicio ? totalPax * 2 + 50 : totalPax);
  cats.push({ nombre: "Vajilla y Cubertería", items: [
    opt(!soloBandeja && llevaPlatos, [`Platos trinchero (${estiloPlatoPrincipal})`, String(platosDoble)]),
    opt(!soloBandeja && llevaPlatosPostre, [`Platos postre (${estiloPlatoPostre})`, String(platosDoble + platosPostreExtra)]),
    ...((!soloBandeja && llevaPlatos) ? [
      ["Platos metálicos", "—"], ["Platos hondos", "—"],
    ] : []),
    ...(llevaCubiertos ? [
      ["Tenedores grandes", String(cubiertosProdu)],
      ["Cuchillos grandes", String(cubiertosProdu)],
      ["Cucharas grandes", String(cubiertosProdu)],
      ["Cucharas postre", String(cubiertosProdu)],
    ] : []),
    ["Jarras de cristal", String(Math.max(2, conMargen(totalPax / 8)))], ["Abridores de cerveza", "2"],
    ["Champanera metálica grande", String(champaneras(pax))], ["Cubiteras esmaltadas + pie", "2"], ["Pinzas de hielo", "2"],
    opt(bandejasMadera > 0, ["Bandejas de madera", String(bandejasMadera)]),
    opt(bandejasPl > 0, ["Bandejas de plata", String(bandejasPl)]),
    // Las metálicas van fijas, no por gente: son las que hay en el almacén y se cargan
    // todas. En un rodaje se usan para todo, y por gente salían 2 en un día de 40
    // personas, que es la mitad de las que de verdad se acaban usando.
    ["Bandejas metálicas", "10"],
    ["Bandejas metálicas brillantes", "8"],
    opt(entranteCompartido, ["Platos extra entrante", conSufijo(numEntrantesCompartir * Math.ceil(totalPax / personasPorPlatoEntrante), `${numEntrantesCompartir} × cada ${personasPorPlatoEntrante} pax`)]),
  ]});

  // Todo lo de esta categoría se gasta: con varios días se calcula sobre la suma
  // de pax de todos los días (paxConsumo), no sobre el día más grande
  cats.push({ nombre: "Desechables y Bebidas", items: [
    ...(usaTela
      ? [["Servilletas de tela", String(conMargen(paxConsumo))], ["Servilletas grandes (extra)", conSufijo(conMargen(paxConsumo / 50), "paq. (50)")]]
      : [["Servilletas grandes", conSufijo(conMargen(paxConsumo * 3 / 50), "paq. (50)")]]),
    ["Servilletas cocktail", conSufijo(conMargen(paxConsumo * 3.5 / 100), "paq. (100)")],
    ["Bandejas de cartón blancas", conSufijo(Math.ceil(paxConsumo / 20), "paq.")], ["Blondas", conSufijo(Math.ceil(paxConsumo / 20), "paq.")],
    ["Platitos de cartón", String(paxConsumo)], ["Envase bocadillos", String(paxConsumo)],
    ["Palitos brocheta", conSufijo(Math.ceil(paxConsumo / 20), "paq.")], ["Palitos café", conSufijo(Math.ceil(paxConsumo / 30), "paq.")],
    ["Calentador de agua", "1"], ["Kit té matcha", "1"],
    ["Cacao", conSufijo(1, "bote")], ["Canela", conSufijo(1, "bote")], ["Leche condensada", conSufijo(1, "lata")],
    // En un rodaje se bebe todo el día (café, agua, refrescos), así que no basta con
    // un vaso por persona: se calculan 4 por pax y día, más 1,2 extra si hay desayuno.
    // Antes salía 1 solo paquete para 25 pax, que son 2 vasos por persona en toda la
    // jornada.
    ["Vasos de cartón (L/M/S)", conSufijo(Math.max(2, Math.ceil(paxConsumo * (4 + (hayDesayuno ? 1.2 : 0)) / 50)), "paq. (50 uds)")], ["Bolsas grandes de papel", conSufijo(1, "paq.")],
    // Los vasos del personal van aquí, con el resto de vasos, y no en Limpieza
    ["Vasos de cartón café mini (personal)", conSufijo(personal.vasosCartonPacks, "packs (50 uds)")],
    ["Vasos de plástico (personal)", conSufijo(personal.vasosPlasticoPacks, "packs (50 uds)")],
    // Mismo volumen total que antes (1,5 Coca + 0,8 Fanta/Aquarius por pax), repartido
    // en cada bebida por separado en vez de en dos líneas combinadas.
    // El rodaje no pasa por calcBebidas (no hay barra ni alcohol), así que su factor de
    // refresco se aplica aquí a mano: si no, el panel enseñaría una casilla de producción
    // que no movería nada.
    ["Coca-Cola normal", String(Math.round(paxConsumo * 0.94 * factorRefresco))], ["Coca-Cola Zero", String(Math.round(paxConsumo * 0.56 * factorRefresco))],
    ["Fanta naranja", String(Math.round(paxConsumo * 0.24 * factorRefresco))], ["Fanta limón", String(Math.round(paxConsumo * 0.2 * factorRefresco))],
    ["Aquarius", String(Math.round(paxConsumo * 0.24 * factorRefresco))],
    // En producción el agua de beber son las CAJAS de 33cl (35 uds). El ratio va por
    // temporada: en un rodaje de doce horas al sol se bebe el doble que en enero, y
    // con 3,5 fijas se salía con poco más de un litro por cabeza y día. La de 1,5L es
    // solo un extra por si hace falta (paella, lavar, beber el personal), no va por
    // pax — un par de packs por día es de sobra.
    ["Aguas pequeñas (33cl)", conSufijo(
      Math.max(1, Math.ceil(paxConsumo * BOTELLAS_AGUA_POR_PAX[mesVerano ? "verano" : "invierno"] / 35)),
      // Corto a propósito: el sufijo va en la misma fila que el nombre y los botones,
      // y uno largo empujaba los de editar y borrar fuera de la pantalla en un móvil.
      `35 uds · ${mesVerano ? "verano" : "invierno"} ${String(BOTELLAS_AGUA_POR_PAX[mesVerano ? "verano" : "invierno"]).replace(".", ",")}/pax`
      + `${opts.tipoAguaPequena ? ` · ${opts.tipoAguaPequena.toLowerCase()}` : ""}`)],
    ["Agua 1,5L (extra: paella, lavar, personal)", conSufijo(2 * nDias, "packs")],
    ["Agua Vidaqua 1,5L (personal)", conSufijo(personal.aguaVidaquaPacks * nDias, "packs (6 uds)")],
    ["Agua con gas", String(Math.round(paxConsumo * 0.15))],
    ["Hielo", conSufijo(Math.max(2, Math.ceil(paxConsumo / 30)), "taxis")],
  ]});

  // En producciones/rodajes va una cafetera de mantenimiento aparte, encendida todo el
  // día para el equipo (café continuo), además de la de servicio que calcula calcCafe.
  const cafeProduccion = calcCafe(totalPax, tipoCafetera, hayDesayuno, paxConsumo, true, CAPSULAS_POR_PAX_PRODUCCION, cafeParaInvitados);
  // La de mantenimiento es del equipo, no de los invitados: se añade pase lo que pase,
  // aunque el flag de arriba haya dejado sin items lo que sí es para invitados.
  cafeProduccion.items.push(["Cafetera de mantenimiento (rodaje, siempre encendida)", "1"]);
  cats.push(cafeProduccion);

  cats.push({ nombre: "Limpieza y Despensa", items: [
    ["Fairy", conSufijo(1, "bote")], ["Estropajo", conSufijo(1, "paquete")], ["Papel plata", conSufijo(1, "rollo")], ["Film", conSufijo(1, "rollo")], ["Papel Chemine", conSufijo(3, "rollo")],
    ["Escoba", "1"], ["Mocho", "1"], ["Cubo", "1"], ["Recogedor", "1"],
    ["Cajas vacías", "2"], ["Ceniceros", String(Math.max(4, Math.ceil(totalPax / 15)))],
    ["Hojas de fichaje", "1"],
  ]});

  return cats;
}
