// Pruebas UNITARIAS de los números de la bebida. Sin navegador y sin React: entra un
// número, sale un número, y tarda milisegundos.
//
//   node src/__tests__/calculos.test.mjs
//
// Existen por una razón concreta. Los tres fallos de cálculo que aparecieron —la
// cerveza que BAJABA al poner media hora de barra, las champaneras fijas a 4 y el agua
// de rodaje a 3,5 botellas— se cazaron levantando un navegador entero para cada
// comprobación, con una vuelta de dos minutos. Aquí la vuelta es instantánea, así que
// se puede barrer el rango completo en vez de mirar un caso suelto: es justo lo que
// destapó lo de la cerveza, que en un caso aislado no se ve.
//
// Lo que NO va aquí: nada que dependa de pantalla, de estado o de la nube. Eso vive en
// app.test.mjs (navegador) y en sincronizacion.test.mjs.
import {
  calcBebidas, calcDestilados, calcCristaleria, champaneras,
  terciosConBarril, conMargen, bateas, BATEA, calcBandejas,
  BOTELLAS_AGUA_POR_PAX, RESPALDO_TERCIOS_CON_BARRIL, RENDIMIENTO_BARRIL,
  calcHielo, KG_POR_TAXI, KG_POR_BOLSA,
} from "../calculos.js";
import { sanearEstado, CAMPOS_VIGILADOS, cambiosDeCantidad } from "../estado.js";
import { queAvisoToca, yaEsApp, estaSilenciado, DIAS_SILENCIO } from "../formulario/instalar.js";
import { codigoDeTexto, direccionConCodigo, leerGuardado, guardar } from "../formulario/codigo.js";
import { saneaEquipo, personaDeTexto, disponiblesEn, saneaLista, choques, estadoDesdeApunte, apuntesPorPromover, checklistsPorCrear } from "../calendario/apuntes.js";
import { personalNecesario, horasEntre, resumenAsignados, loQueFalta, saneaAsignados,
  PAX_POR_CAMARERO, saneaRatios, ponRatios, leerRatios, ratiosCambiados } from "../personal.js";
import { MODOS, enlaceDeLaUrl, direccionDelCalendario, enlacesDeCalendario, enlaceCorto } from "../calendario/enlace.js";
import { mesasComensales, lineasDeMesas, mesasParaVestir, tipoMesaValido, TIPOS_MESA, TIPO_MESA_POR_DEFECTO } from "../mesas.js";
import { leerPrecios, guardarPrecios, soloLosCambiados, fusionarPreciosNube, parsePreciosPegados } from "../precios.js";
import { BEBIDAS, CLAVES_BEBIDA, TIPOS_BEBIDA, RATIOS_BEBIDA, FACTOR_NEUTRO,
  saneaFactores, ponFactores, leerFactores, factorDe, factoresDeTipo, conFactor,
  esFactorValido, cuantosAjustados } from "../bebida.js";
import { calibracionBebida, catsDeEventoGuardado } from "../calibracion.js";
import { menusEspeciales, totalMenusEspeciales, alergiasDeLasNotas, categoriaMenusEspeciales } from "../menus-especiales.js";
import { escaletaDelEvento, resumenEscaleta, MARGEN_ANTES_MIN, VIAJE_POR_DEFECTO_MIN } from "../escaleta.js";
import { buildChecklist } from "../checklist-generadores.js";

let pasan = 0;
const fallos = [];
const ok = (cond, msg) => {
  if (cond) { pasan++; console.log(`  ✅ ${msg}`); }
  else { fallos.push(msg); console.log(`  ❌ ${msg}`); }
};

// Comprueba que una cantidad NUNCA baja al subir las horas. Los cálculos por tramos
// con topes y suelos son justo donde se cuelan estos saltos, y mirando un caso suelto
// no se ven: hay que recorrer la curva.
const noBaja = (nombre, valores) => {
  for (let i = 1; i < valores.length; i++) {
    const [h0, a] = valores[i - 1], [h1, b] = valores[i];
    if (b < a) return `${nombre}: ${h0}h→${a} pero ${h1}h→${b}`;
  }
  return null;
};

console.log("\n══ Los helpers de siempre ══");
{
  ok(conMargen(100) === 110, "el margen de seguridad es un 10% redondeado hacia arriba (100 → 110)");
  ok(conMargen(0) === 0, "y sobre cero no inventa nada");
  // La coma flotante hacía que 100 * 1.1 diera 110.00000000000001 y el redondeo se
  // llevara una unidad de más justo cuando la cuenta caía redonda. Se comprueba en el
  // rango entero, que es donde se nota.
  {
    const deMas = [];
    for (let n = 0; n <= 500; n++) if (conMargen(n) !== Math.ceil(n * 11 / 10)) deMas.push(n);
    ok(deMas.length === 0, `y no se cuela una unidad de más por la coma flotante (0-500)`);
    ok(conMargen(10) === 11 && conMargen(20) === 22 && conMargen(200) === 220,
      "las cuentas redondas salen redondas (10→11, 20→22, 200→220)");
  }
  ok(bateas(50, 25) === 2 && bateas(51, 25) === 3, "las bateas se redondean hacia arriba (51 de 25 → 3)");
  ok(BATEA.vino === 25 && BATEA.cava === 36, "cada tipo de copa tiene su tamaño de batea");
}

console.log("\n══ Cerveza: las horas no pueden restar ══");
{
  const cerveza = (h) => calcBebidas(100, h, true, false).cerveza;
  const curva = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 12].map(h => [h, cerveza(h)]);
  const mal = noBaja("cerveza", curva);
  ok(!mal, `subir las horas nunca baja la cerveza${mal ? ` → ${mal}` : ` (${curva.map(([h, v]) => `${h}h:${v}`).join(" ")})`}`);

  // El caso exacto que falló: un evento sin barra lleva la cerveza de la comida, y eso
  // se resolvía llamando con un 2 fijo. Media hora de barra caía por debajo de ese 2.
  ok(cerveza(0.5) >= cerveza(0),
    `media hora de barra no pide menos que no tener barra (${cerveza(0)} → ${cerveza(0.5)})`);
  ok(cerveza(0) === cerveza(2),
    `sin barra se calcula como 2 horas, que es el suelo (${cerveza(0)})`);
  ok(cerveza(4) === cerveza(8) && cerveza(8) === cerveza(12),
    `y de 4h en adelante ya no sube: nadie bebe el doble porque la barra dure el doble (${cerveza(4)})`);
  ok(cerveza(4) % 24 === 0, `siempre en cajas de 24 (${cerveza(4)})`);

  // En verano se bebe más cerveza que en invierno, a igualdad de todo lo demás
  ok(calcBebidas(100, 4, true, false).cerveza > calcBebidas(100, 4, false, false).cerveza,
    "en verano entra más cerveza que en invierno");

  // Los ratios los dicta quien lleva los eventos, no los manuales: 3 tercios por pax
  // en verano y 2 en invierno. Van por encima del rango del sector (1,5-2) a propósito.
  // Se fijan aquí para que no se muevan sin que nadie se entere: un cambio de ratio es
  // dinero en cerveza que sobra o una boda de agosto que se queda seca.
  const verano = calcBebidas(100, 4, true, false).cerveza;
  const invierno = calcBebidas(100, 4, false, false).cerveza;
  ok(verano === 312, `100 pax con 4h de barra en verano: ${verano} tercios (${verano / 24} cajas, ~3/pax)`);
  ok(invierno === 192, `y en invierno: ${invierno} tercios (${invierno / 24} cajas, ~2/pax)`);
  // Que el ratio se mantenga a cualquier tamaño, no solo en el caso de 100
  const fuera = [];
  for (const pax of [40, 65, 150, 200, 300, 500]) {
    for (const [esVerano, ratio] of [[true, 3], [false, 2]]) {
      const t = calcBebidas(pax, 4, esVerano, false).cerveza;
      // Media caja de margen por el redondeo a cajas de 24
      if (Math.abs(t - pax * ratio) > 12) fuera.push(`${pax}pax ${esVerano ? "verano" : "invierno"}: ${t} (esperado ~${pax * ratio})`);
    }
  }
  ok(fuera.length === 0,
    `y el ratio se mantiene a cualquier tamaño${fuera.length ? ` → ${fuera.slice(0, 4).join(" · ")}` : " (12 combinaciones)"}`);
}

console.log("\n══ Red Bull: eso sí es de la barra ══");
{
  ok(calcBebidas(100, 0, true, false).redbull === 0,
    "sin barra no va ni uno");
  ok(calcBebidas(100, 0.5, true, false).redbull > 0,
    "con barra, aunque sea media hora, ya va");
}

console.log("\n══ Tónica: solo con barra de COPAS ══");
{
  // La tónica es mezcla de ginebra. Salían 8 botellas sin barra ninguna y 11 con solo
  // cóctel, porque el mínimo de 6 se aplicaba siempre y las horas que miraba eran las
  // TOTALES. En el aperitivo se sirve vermut, cerveza y refresco; ginebra no.
  const tonica = (total, copas) => calcBebidas(100, total, true, false, false, copas).tonica;
  ok(tonica(0, 0) === 0, "sin barra ninguna no va ni una botella");
  ok(tonica(3, 0) === 0, "y con solo cóctel tampoco, que ahí no se sirve ginebra");
  ok(tonica(4, 4) > 0, "con barra de copas sí");
  ok(tonica(8, 5) > tonica(4, 4),
    `y una barra más larga pide más (${tonica(4, 4)} → ${tonica(8, 5)})`);
  // Media hora de copas ya cuenta: el mínimo de 6 botellas es de compra, no de consumo
  ok(tonica(0.5, 0.5) >= 6, `media hora de copas ya lleva el mínimo de compra (${tonica(0.5, 0.5)})`);
  // Quien llame sin el dato de copas sigue viendo lo de siempre: no se rompe nada
  ok(calcBebidas(100, 4, true, false).tonica > 0,
    "y llamando sin decir las horas de copas se comporta como antes");
}

console.log("\n══ Destilados: solo dependen de las copas ══");
{
  const gin = (h) => calcDestilados(100, h).ginebraPremium;
  const curva = [1, 2, 3, 4, 5, 6, 7, 8, 10, 14].map(h => [h, gin(h)]);
  const mal = noBaja("ginebra", curva);
  ok(!mal, `más horas de copas nunca piden menos ginebra${mal ? ` → ${mal}` : ""}`);
  ok(gin(7) === gin(10) && gin(10) === gin(14),
    `y de 7h en adelante se estabiliza (${gin(7)})`);
  ok(gin(8) > gin(4), `pero hasta ahí sí sube (4h:${gin(4)} → 8h:${gin(8)})`);

  // Los licores que se piden fijos no escalan con nada
  const d4 = calcDestilados(100, 4), d200 = calcDestilados(400, 8);
  ok(d4.mistela === d200.mistela && d4.baileys === d200.baileys,
    "los licores de curiosidad van fijos, no escalan con la gente ni con las horas");
  ok(d4.ballantines >= 2 && calcDestilados(10, 1).ballantines >= 2,
    "y los que se compran de dos en dos nunca bajan de dos");
}

console.log("\n══ Destilados: el reparto del sector (40/30/20/10) ══");
{
  // Referencia de barra libre española: 40% ginebra, 30% ron, 20% whisky, 10% vodka.
  // La ginebra iba por encima y se dejó; ron, whisky y vodka se subieron hasta cuadrar.
  // Este test es el que impide que un retoque suelto vuelva a descuadrar el reparto.
  const reparto = (pax, h) => {
    const d = calcDestilados(pax, h);
    const gin = d.ginebraPremium + d.ginebraSabor;
    const ron = d.ron + d.ronBlanco + d.barcelo;   // Bacardí + Negrita + Barceló
    const total = gin + ron + d.ballantines + d.vodka;
    return { gin, ron, whisky: d.ballantines, vodka: d.vodka, total };
  };
  const OBJETIVO = { gin: 40, ron: 30, whisky: 20, vodka: 10 };
  // Margen de 3 puntos: son botellas enteras, el redondeo no da para más fino. Y solo
  // se comprueba en pedidos con cuerpo (10+ botellas de ginebra): en un evento chico
  // los mínimos de 2 botellas mandan sobre el ratio, y eso es a propósito — antes se
  // queda uno con dos botellas de vodka de sobra que sin vodka a media boda.
  const fuera = [];
  let comprobadas = 0;
  for (const pax of [65, 80, 100, 150, 200, 300]) {
    for (const h of [2, 4, 6]) {
      const r = reparto(pax, h);
      if (r.gin < 10) continue;
      comprobadas++;
      for (const k of Object.keys(OBJETIVO)) {
        const pct = Math.round((r[k] / r.total) * 100);
        if (Math.abs(pct - OBJETIVO[k]) > 3) fuera.push(`${pax}pax ${h}h ${k}=${pct}% (esperado ${OBJETIVO[k]}%)`);
      }
    }
  }
  ok(fuera.length === 0,
    `en pedidos con cuerpo el reparto cuadra con el sector${fuera.length ? ` → ${fuera.slice(0, 4).join(" · ")}` : ` (${comprobadas} combinaciones)`}`);

  const cien = reparto(100, 4);
  ok(cien.gin === 17 && cien.ron === 13 && cien.whisky === 8 && cien.vodka === 4,
    `100 pax y 4h de copas: ginebra ${cien.gin}, ron ${cien.ron}, whisky ${cien.whisky}, vodka ${cien.vodka}`);

  // El ajuste solo podía SUBIR: si alguna de las tres bajase respecto a lo que había,
  // saldríamos cortos en un evento ya presupuestado. Se fijan los mínimos de antes.
  const antes = (pax, h) => {
    const f = Math.min(1.75, h / 4);
    const r = (b) => Math.max(1, Math.round(b * f)), r2 = (b) => Math.max(2, Math.round(b * f));
    return { ron: r(pax / 60) + r2(pax / 50) + r2(pax / 16), whisky: r2(pax / 16), vodka: r(pax / 40) };
  };
  const bajadas = [];
  for (const pax of [10, 30, 50, 65, 80, 100, 150, 200, 300, 500]) {
    for (const h of [0, 1, 2, 4, 6, 8, 12]) {
      const a = antes(pax, h), d = reparto(pax, h);
      for (const k of ["ron", "whisky", "vodka"]) {
        if (d[k] < a[k]) bajadas.push(`${pax}pax ${h}h ${k}: ${a[k]} → ${d[k]}`);
      }
    }
  }
  ok(bajadas.length === 0,
    `y ron, whisky y vodka solo suben, nunca bajan de lo que ya se pedía${bajadas.length ? ` → ${bajadas.slice(0, 4).join(" · ")}` : " (70 combinaciones)"}`);
}

console.log("\n══ Cristalería ══");
{
  const copas = (hp) => calcCristaleria(100, hp, false, false, false);
  // El vino, el agua y el cava NO miran las horas de barra, y esto es lo que se
  // comprueba. Antes se multiplicaban por un factor de horas y dos bodas iguales de 100
  // personas —mismo vino, misma comida— salían con 500 y con 200 copas según si había
  // barra de copas detrás. Se bebe el mismo vino en las dos.
  //
  // La prueba de antes decía "más horas nunca piden MENOS copas de vino". Con el
  // cálculo de ahora esa frase es cierta pase lo que pase (la cifra es constante), así
  // que no comprobaba nada: pasaría igual si el vino se calculara mal. Ahora se exige
  // que sea la MISMA cifra, que es lo que de verdad se decidió.
  const porHoras = [0, 2, 4, 5, 8, 12].map(h => [h, copas(h).vino.u]);
  const distintas = porHoras.filter(([, v]) => v !== porHoras[0][1]);
  ok(distintas.length === 0,
    `las copas de vino no cambian con las horas de barra: ${porHoras.map(([h, v]) => `${h}h:${v}`).join(" ")}`);
  ok(copas(0).vino.u > 0, "sin barra siguen haciendo falta copas: se come y se bebe igual");
  ok(copas(5).cubata.u > copas(0).cubata.u,
    "los vasos de cubata sí crecen con la barra de copas");
  ok(copas(0).cubata.u === 0, "sin copas no se llevan vasos de cubata");
  ok(copas(2).vino.u % BATEA.vino === 0,
    "las copas se piden por bateas completas, que es como se transportan");
  // Doble servicio dobla la cristalería de mesa
  const normal = copas(5), doble = calcCristaleria(100, 5, true, false, false);
  ok(doble.vino.u > normal.vino.u, "el doble servicio dobla las copas de mesa");
  // El brindis sube las copas de cava de 1 a 1,5 por cabeza (todos cogen copa a la vez).
  // Cifras exactas: 110 con margen → 144 en bateas de 36; 165 → 180.
  const conBrindis = calcCristaleria(100, 5, false, true, false);
  ok(normal.cava.u === 144 && conBrindis.cava.u === 180,
    `y el brindis sube las de cava a 1,5 por cabeza (${normal.cava.u} → ${conBrindis.cava.u})`);
  ok(normal.chupito === null && calcCristaleria(100, 5, false, false, true).chupito !== null,
    "los vasos de chupito solo salen si hay entrante de chupito");
}

console.log("\n══ Champaneras ══");
{
  ok(champaneras(40) === 2 && champaneras(100) === 3 && champaneras(150) === 4 && champaneras(200) === 5,
    `2 de mínimo y una más por cada 50 (40:${champaneras(40)} 100:${champaneras(100)} 150:${champaneras(150)} 200:${champaneras(200)})`);
  ok(champaneras(0) === 2 && champaneras(1) === 2,
    "nunca bajan de 2, ni en un evento sin gente puesta todavía");
  const curva = [0, 20, 40, 60, 100, 150, 200, 300, 500].map(p => [p, champaneras(p)]);
  ok(!noBaja("champaneras", curva), "y más gente nunca pide menos");
}

console.log("\n══ Barril y tercios ══");
{
  // 192 tercios = 63,4 L. Un barril de 50L rinde 42,5 útiles.
  ok(terciosConBarril(192, 0, 1) === 192,
    `sin barril se llevan todos los tercios (${terciosConBarril(192, 0, 1)})`);
  ok(terciosConBarril(192, 50, 1) === 72,
    `un barril de 50L descuenta lo suyo (${terciosConBarril(192, 50, 1)})`);
  ok(terciosConBarril(192, 30, 1) === 120,
    `y uno de 30L descuenta menos (${terciosConBarril(192, 30, 1)})`);
  ok(terciosConBarril(192, 50, 2) === RESPALDO_TERCIOS_CON_BARRIL
    && terciosConBarril(192, 50, 5) === RESPALDO_TERCIOS_CON_BARRIL,
    `por muchos barriles que se lleven quedan ${RESPALDO_TERCIOS_CON_BARRIL} de respaldo: si el tirador falla, cero es quedarse sin cerveza`);
  ok(terciosConBarril(0, 0, 1) === 0, "y sin cerveza que llevar, no se inventa ninguna");
  ok(RENDIMIENTO_BARRIL === 0.85, "el barril se cuenta al 85%: espuma, purgado y el culo que no sale");
  // Más barriles nunca pueden pedir MÁS tercios
  const curva = [0, 1, 2, 3, 4].map(n => [n, terciosConBarril(192, 50, n)]);
  for (let i = 1; i < curva.length; i++) {
    if (curva[i][1] > curva[i - 1][1]) { ok(false, `añadir barriles no puede subir los tercios (${JSON.stringify(curva)})`); break; }
    if (i === curva.length - 1) ok(true, `añadir barriles solo baja los tercios (${curva.map(([n, v]) => `${n}:${v}`).join(" ")})`);
  }
}

console.log("\n══ El agua de un rodaje ══");
{
  const cajas = (pax, verano) => Math.max(1, Math.ceil(pax * BOTELLAS_AGUA_POR_PAX[verano ? "verano" : "invierno"] / 35));
  ok(BOTELLAS_AGUA_POR_PAX.verano > BOTELLAS_AGUA_POR_PAX.invierno,
    `en verano se bebe más agua que en invierno (${BOTELLAS_AGUA_POR_PAX.verano} vs ${BOTELLAS_AGUA_POR_PAX.invierno})`);
  ok(cajas(30, true) === 6 && cajas(30, false) === 4,
    `30 personas: 6 cajas en verano, 4 en invierno (${cajas(30, true)}/${cajas(30, false)})`);
  ok(cajas(90, true) === 17, `y tres días de 30 piden el triple (${cajas(90, true)})`);
  ok(BOTELLAS_AGUA_POR_PAX.verano * 0.33 >= 2,
    `en verano son al menos 2 litros por cabeza y día (${(BOTELLAS_AGUA_POR_PAX.verano * 0.33).toFixed(1)} L)`);
}

console.log("\n══ Bandejas ══");
{
  const b = (pax, opts) => calcBandejas(pax, opts);
  ok(b(100, {}).pasar === 5, `las de pasar comida van por gente (100 → ${b(100, {}).pasar})`);
  ok(b(0, {}).pasar === 2 && b(5, {}).pasar === 2, "con 2 de mínimo, que algo se pasa siempre");
  ok(b(100, { soloBandeja: true }).pasar > b(100, {}).pasar,
    "si el servicio es entero en bandeja hacen falta más");
  // El tipo elegido suma sobre las de pasar
  ok(b(100, { tipoBandejas: "Madera" }).madera > b(100, { tipoBandejas: "Madera" }).plata,
    "eligiendo madera salen más de madera que de plata");
  ok(b(100, { tipoBandejas: "Plata" }).plata > b(100, { tipoBandejas: "Plata" }).madera,
    "y al revés con la plata");
  ok(b(100, { tipoBandejas: "Mixto" }).madera === b(100, { tipoBandejas: "Mixto" }).plata,
    "en mixto van las mismas de cada");
  ok(b(100, { extraMadera: 7 }).madera === b(100, {}).madera + 7,
    "y lo que se añada a mano se suma tal cual");
  const curva = [0, 20, 50, 100, 200, 400].map(p => [p, b(p, {}).pasar]);
  ok(!noBaja("bandejas", curva), "más gente nunca pide menos bandejas");
}

console.log("\n══ Casos límite: nada puede salir en negativo ni en NaN ══");
{
  const raros = [];
  for (const pax of [0, 1, 7, 1000]) {
    for (const h of [0, 0.5, 4, 24]) {
      const b = calcBebidas(pax, h, true, false);
      const c = calcCristaleria(pax, h / 2, false, false, false);
      const d = calcDestilados(pax, h);
      for (const [nombre, valor] of [...Object.entries(b), ...Object.entries(d)]) {
        if (typeof valor === "number" && (isNaN(valor) || valor < 0)) raros.push(`${nombre}=${valor} (pax ${pax}, ${h}h)`);
      }
      for (const [nombre, v] of Object.entries(c)) {
        if (v && (isNaN(v.u) || v.u < 0)) raros.push(`copas ${nombre}=${v.u} (pax ${pax}, ${h}h)`);
      }
    }
  }
  ok(raros.length === 0, `ninguna cantidad sale negativa ni inválida${raros.length ? ` → ${raros.slice(0, 5).join(" · ")}` : " (16 combinaciones)"}`);
}


console.log("\n══ Sanear el estado que entra ══");
{
  // Un campo con el tipo equivocado tumbaba la app al dibujar, y como el estado se
  // guarda, recargar volvía a tumbarla: se quedaba uno fuera sin salida.
  ok(JSON.stringify(sanearEstado({ evento: "boda", pax: 100 })) === JSON.stringify({ evento: "boda", pax: 100 }),
    "un estado bueno pasa entero, sin tocar nada");
  const roto = sanearEstado({ evento: "boda", pax: 100, recogidas: "esto no es una lista" });
  ok(roto.recogidas === undefined && roto.evento === "boda" && roto.pax === 100,
    "una lista que llega como texto se descarta, y el resto del evento se salva");
  ok(sanearEstado({ checkeados: [1, 2, 3] }).checkeados === undefined,
    "un mapa que llega como lista también se descarta");
  ok(sanearEstado({ preparados: 7 }).preparados === undefined,
    "y un mapa que llega como número");
  ok(sanearEstado({ recogidas: [] }).recogidas !== undefined
    && sanearEstado({ checkeados: {} }).checkeados !== undefined,
    "pero una lista vacía y un mapa vacío son válidos: no se tiran");
  // Lo que no vigila no se toca: un campo de una versión futura no se puede perder
  ok(sanearEstado({ campoQueAunNoExiste: "algo" }).campoQueAunNoExiste === "algo",
    "los campos que no vigila pasan tal cual, que mañana puede haber otros");
  // Y la entrada basura no revienta
  for (const basura of [null, undefined, "texto", 42, [1, 2]]) {
    const r = sanearEstado(basura);
    if (r === null || typeof r !== "object" || Array.isArray(r)) { ok(false, `sanearEstado(${JSON.stringify(basura)}) no devuelve un objeto`); break; }
  }
  ok(true, "y con basura de entrada (null, texto, número, lista) devuelve un objeto vacío, no un error");
  // Todos los campos vigilados están cubiertos por uno de los dos tipos
  ok(CAMPOS_VIGILADOS.LISTAS.length >= 6 && CAMPOS_VIGILADOS.MAPAS.length >= 13,
    `vigila ${CAMPOS_VIGILADOS.LISTAS.length} listas y ${CAMPOS_VIGILADOS.MAPAS.length} mapas`);
}

console.log("\n══ Instalar el formulario: qué aviso toca en cada móvil ══");
{
  // Agentes de verdad, copiados de dispositivos reales
  const UA = {
    safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    whatsappIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    instagramIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.113",
    chromeIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0 Mobile/15E148 Safari/604.1",
    chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36",
    ipadOS: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    macDeVerdad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  };
  const aviso = (ua, tactiles = 0) => queAvisoToca({ ua, puntosTactiles: tactiles });

  ok(aviso(UA.safariIphone) === "iphone",
    "en Safari del iPhone se explican los pasos a mano (ahí no hay botón de instalar)");
  // Este es el caso que dejaba a la gente sin poder instalar: el enlace llega por
  // WhatsApp, se abre en SU navegador y "Añadir a pantalla de inicio" no existe allí.
  ok(aviso(UA.whatsappIphone) === "enSafari",
    "abierto desde WhatsApp, primero manda abrirlo en Safari, no a buscar Compartir");
  ok(aviso(UA.instagramIphone) === "enSafari",
    "y lo mismo con las apps que sí se identifican (Instagram)");
  ok(aviso(UA.chromeIphone) === "iphone",
    "Chrome en iPhone sí es un navegador de verdad: se explican los pasos");
  ok(aviso(UA.chromeAndroid) === null,
    "en Android no se dice nada hasta que el navegador avisa de que se puede instalar");
  ok(queAvisoToca({ ua: UA.chromeAndroid, hayEventoDelNavegador: true }) === "puede",
    "y cuando avisa, sale el botón de instalar de verdad");
  ok(queAvisoToca({ ua: UA.whatsappIphone, hayEventoDelNavegador: true }) === "puede",
    "si el navegador deja pedirlo, eso manda sobre cualquier otra cosa");
  // iPadOS 13+ se hace pasar por Mac: sin mirar el táctil, el iPad se quedaba sin aviso
  ok(aviso(UA.ipadOS, 5) === "iphone", "un iPad, aunque diga que es un Mac, recibe los pasos");
  ok(aviso(UA.macDeVerdad, 0) === null, "y un Mac de verdad, que no tiene táctil, no");
  ok(aviso("") === null && aviso(undefined) === null,
    "sin agente conocido no se inventa nada");

  // El "Ahora no" ya no es para siempre: un toque sin querer dejaba a alguien sin
  // saber nunca cómo instalarlo, y no había forma de recuperar el aviso.
  const almacen = (v) => ({ getItem: () => v, setItem: () => {} });
  const AHORA = 1770000000000;
  const dias = (n) => n * 24 * 60 * 60 * 1000;
  ok(estaSilenciado(almacen(null), AHORA) === false, "sin silenciar, el aviso sale");
  ok(estaSilenciado(almacen(String(AHORA - dias(3))), AHORA) === true,
    "recién silenciado, no molesta");
  ok(estaSilenciado(almacen(String(AHORA - dias(DIAS_SILENCIO + 1))), AHORA) === false,
    `pasados ${DIAS_SILENCIO} días vuelve a ofrecerse`);
  ok(estaSilenciado(almacen("no"), AHORA) === false,
    'quien lo silenció "para siempre" con la versión vieja recupera el aviso');
  ok(estaSilenciado({ getItem: () => { throw new Error("modo privado"); } }, AHORA) === false,
    "y si el navegador no deja leer nada guardado, tampoco se calla");

  // Ya instalado: no se ofrece instalar otra vez
  ok(yaEsApp({ matchMedia: () => ({ matches: true }), navigator: {} }) === true,
    "abierto ya como app, no se ofrece instalarlo");
  ok(yaEsApp({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }) === true,
    "y el iPhone lo dice a su manera (navigator.standalone)");
  ok(yaEsApp({ matchMedia: () => ({ matches: false }), navigator: {} }) === false,
    "en el navegador normal sí se ofrece");
  ok(yaEsApp(null) === false, "y sin ventana no revienta");
}

console.log("\n══ El código del buzón: que no se pierda al guardar la app ══");
{
  // Lo que pasó de verdad: se abre el enlace desde WhatsApp, se guarda en la pantalla
  // de inicio siguiendo los pasos, y al abrir el icono sale "Falta el enlace". En iOS
  // la app guardada estrena su propio almacén y no ve el código que dejó el navegador,
  // así que el código TIENE que ir en la dirección.
  ok(codigoDeTexto("https://r2fod.github.io/Generate_Checklist_Gula/formulario/?enviar=ABC123") === "ABC123",
    "del enlace entero se saca el código");
  ok(codigoDeTexto("  https://ejemplo.com/formulario/index.html?enviar=ABC123&otra=1  ") === "ABC123",
    "aunque venga con espacios, index.html y más parámetros detrás");
  ok(codigoDeTexto("https://ejemplo.com/formulario/?x=1&enviar=ABC123#final") === "ABC123",
    "y aunque el código no sea el primer parámetro");
  ok(codigoDeTexto("ABC123") === "ABC123", "y si pegan el código a pelo, también vale");
  ok(codigoDeTexto("https://ejemplo.com/formulario/") === "",
    "un enlace SIN código no cuela: mejor decirlo que abrir un formulario mudo");
  ok(codigoDeTexto("") === "" && codigoDeTexto(null) === "" && codigoDeTexto(undefined) === "",
    "y con el campo vacío no se inventa nada");
  ok(codigoDeTexto("hola que tal") === "", "ni con texto suelto que no es un código");

  // La dirección tiene que acabar llevando el código, porque es lo que el móvil se
  // guarda al añadir a la pantalla de inicio.
  ok(direccionConCodigo("https://ejemplo.com/formulario/", "ABC123") === "https://ejemplo.com/formulario/?enviar=ABC123",
    "sin código en la dirección, se le pone");
  ok(direccionConCodigo("https://ejemplo.com/formulario/?enviar=ABC123", "ABC123") === null,
    "si ya lo lleva, no se toca nada");
  ok(direccionConCodigo("https://ejemplo.com/formulario/?enviar=VIEJO", "ABC123") === "https://ejemplo.com/formulario/?enviar=ABC123",
    "y si lleva otro distinto, manda el bueno");
  ok(direccionConCodigo("https://ejemplo.com/formulario/", "") === null,
    "sin código guardado no hay nada que poner");
  ok(direccionConCodigo("no es una dirección", "ABC123") === null,
    "y una dirección rara no revienta");

  // Leer y guardar nunca pueden tumbar el arranque, ni en modo privado
  const roto = { getItem: () => { throw new Error("modo privado"); }, setItem: () => { throw new Error("modo privado"); } };
  ok(leerGuardado(roto) === "" && leerGuardado(null) === "",
    "si el navegador no deja leer lo guardado, se sigue sin código en vez de reventar");
  let exploto = false;
  try { guardar(roto, "ABC123"); guardar(null, "ABC123"); } catch (e) { exploto = true; }
  ok(!exploto, "y guardar tampoco revienta cuando no se puede guardar");
}

console.log("\n══ Qué cantidad ha cambiado, y de cuánto a cuánto ══");
{
  // Quien está cargando el camión tiene que enterarse de que le han cambiado una
  // cantidad de algo que ya había marcado. El aviso decía "Cantidades editadas a mano
  // (modificado)": ni qué item, ni de cuánto a cuánto. Eso no es un aviso.
  const c = (a, b) => cambiosDeCantidad(a, b);
  ok(JSON.stringify(c({}, { "Electricidad y camión::Regletas": "5" })) === JSON.stringify(["Regletas: auto → 5"]),
    "poner una cantidad a mano se dice con nombre y valor");
  ok(JSON.stringify(c({ "Electricidad y camión::Regletas": "3" }, { "Electricidad y camión::Regletas": "5" })) === JSON.stringify(["Regletas: 3 → 5"]),
    "y cambiarla dice de cuánto a cuánto, que es lo que hay que volver a contar");
  ok(JSON.stringify(c({ "Barra::Hielo": "8" }, {})) === JSON.stringify(["Hielo: 8 → auto"]),
    'quitar el número escrito a mano no es dejarlo en blanco: vuelve a "auto"');
  ok(c({ "A::Uno": "1" }, { "A::Uno": "1" }).length === 0,
    "y si no cambia nada, no se dice nada");
  // Varios a la vez, ordenados para que el aviso salga siempre igual
  const varios = c({ "A::Sillas": "10", "B::Mesas": "4" }, { "A::Sillas": "12", "B::Mesas": "6" });
  ok(varios.length === 2 && varios[0] === "Mesas: 4 → 6" && varios[1] === "Sillas: 10 → 12",
    `varios cambios salen todos y en orden fijo → ${JSON.stringify(varios)}`);
  // La categoría no se enseña: ya se ve al llegar a la fila y el aviso tiene que caber
  ok(!c({}, { "Electricidad y camión::Regletas": "5" })[0].includes("::"),
    "sin la categoría delante, que el aviso tiene que caber en una línea de móvil");
  // Nada de esto puede tumbar el arranque si llega basura desde la nube
  ok(c(null, undefined).length === 0 && c("texto", 7).length === 0 && c([1, 2], {}).length === 0,
    "y con basura de entrada devuelve una lista vacía, no un error");
}

console.log("\n══ El equipo del calendario: quién queda un día ══");
{
  // Nombres inventados: esto se sube al repositorio, que es público.
  const equipo = saneaEquipo([
    "Fulanita",
    { nombre: "Menganito", apodos: ["Mengano", "MENGANO"] },
    { nombre: "  " },
    "fulanita",
  ]);
  ok(equipo.length === 2, `las repetidas y las vacías no cuentan → ${equipo.length} personas`);
  ok(equipo[0].apodos.includes("fulanita"),
    "el propio nombre entra siempre como apodo, aunque no se escriba ninguno");
  ok(equipo[1].apodos.includes("mengano") && equipo[1].apodos.filter(a => a === "mengano").length === 1,
    "los apodos van en minúsculas y sin repetir");

  // La razón de ser de los apodos: en la hoja cada uno se apunta como le sale.
  ok(personaDeTexto("VACAS MENGANO", equipo) === "Menganito",
    'el apodo en mayúsculas cae en su persona: "VACAS MENGANO" → Menganito');
  ok(personaDeTexto("Vacaciones Menganito", equipo) === "Menganito",
    "y el nombre completo cae en la misma, no crea un segundo fantasma");
  // El fallo que hubo que arreglar: buscar por trozos convertía media hoja en
  // vacaciones de quien tuviera el apodo más corto.
  const conFu = saneaEquipo([{ nombre: "Fulgencia", apodos: ["fu"] }, "Fulanito"]);
  ok(personaDeTexto("Boda de Fulanito", conFu) === "Fulanito",
    '"Fulanito" no es "fu": se busca por palabras completas, no por trozos');
  ok(personaDeTexto("VACAS FU", conFu) === "Fulgencia",
    "pero el apodo suelto sí cae donde toca");
  ok(personaDeTexto("Boda de unos clientes", equipo) === null,
    "y un texto sin nadie del equipo no inventa a nadie");

  // Nombre compuesto: buscándolo palabra a palabra no se encontraba nunca, así que se
  // podía configurar a alguien en el equipo y no asignarle sus vacaciones jamás.
  const compuesto = saneaEquipo(["Zutana Mengana", "Zutana"]);
  ok(personaDeTexto("VACAS ZUTANA MENGANA", compuesto) === "Zutana Mengana",
    "un nombre de dos palabras se reconoce entero, no se pierde");
  ok(personaDeTexto("Vacaciones Zutana", compuesto) === "Zutana",
    "y la Zutana a secas sigue siendo la otra persona, no la compuesta");
  // Sin la Ana suelta en el equipo, para que lo único que pueda casar sea el compuesto
  const soloCompuesto = saneaEquipo(["Zutana Mengana"]);
  ok(personaDeTexto("Mengana y Zutana libran", soloCompuesto) === null,
    "las dos palabras tienen que ir seguidas y en orden, no sueltas por el texto");
  ok(personaDeTexto("Vacas Zutana", soloCompuesto) === null,
    "y media parte del nombre no basta: media plantilla se llamaría igual");

  // Lo que de verdad se enseña en pantalla: cuánta gente queda un día con dos eventos.
  const apuntes = [
    { id: "a", fecha: "2026-09-12", titulo: "Vacas Mengano", tipo: "vacaciones" },
    { id: "b", fecha: "2026-09-12", titulo: "Boda de prueba", tipo: "boda" },
  ];
  const quedan = disponiblesEn(apuntes, "2026-09-12", equipo);
  ok(quedan.length === 1 && quedan[0] === "Fulanita",
    `el que está de vacaciones no cuenta ese día → quedan ${JSON.stringify(quedan)}`);
  ok(disponiblesEn(apuntes, "2026-09-13", equipo).length === 2,
    "y al día siguiente vuelve a estar el equipo entero");
  // Sin equipo configurado no puede quedar nadie: el aviso se calla, no miente.
  ok(disponiblesEn(apuntes, "2026-09-12", []).length === 0,
    "sin equipo configurado no se inventa gente disponible");
}

console.log("\n══ Cuánta gente hace falta: contra lo que se puso de verdad ══");
{
  // Los 19 eventos de la hoja de costes, con el personal que se puso realmente.
  // No son nombres: son cuentas. [tipo, pax, sala, cocina, logistica]
  const REALES = [
    ["boda", 135, 15, 4, 2], ["boda", 100, 14, 5, 2], ["boda", 45, 5, 3, 2],
    ["boda", 40, 6, 2, 2], ["comunion", 26, 3, 2, 2],
    ["corporativo", 150, 13, 5, 2], ["corporativo", 65, 9, 5, 2],
    ["corporativo", 32, 3, 3, 0], ["corporativo", 20, 4, 2, 1],
  ];

  // Lo que importa no es clavar cada evento —eso depende del formato de cada uno— sino
  // no quedarse corto SIEMPRE, que es lo que pasaba: con 1 cada 12 en boda y 1 cada 25
  // en corporativo, el cálculo iba por debajo en todos y cada uno de los casos medidos.
  let bajo = 0, desvios = [];
  for (const [tipo, pax, sala] of REALES) {
    const n = personalNecesario(tipo, pax).sala;
    desvios.push(n - sala);
    if (n < sala) bajo++;
  }
  const medio = desvios.reduce((a, b) => a + Math.abs(b), 0) / desvios.length;
  ok(medio <= 1.5, `el cálculo de sala se acerca a lo que se puso de verdad (desvío medio ${medio.toFixed(1)} personas)`);
  ok(bajo <= REALES.length / 2,
    `y ya no se queda corto de forma sistemática (${bajo} de ${REALES.length}, antes eran los ${REALES.length})`);

  // Los dos casos que destaparon el problema, fijados con su cifra exacta
  ok(personalNecesario("boda", 135).sala === 15,
    "la boda de 135 pax pide 15 camareros, que son los que se pusieron (antes pedía 12)");
  ok(personalNecesario("corporativo", 150).sala === 15,
    "y el corporativo de 150 pide 15, no los 6 de antes");

  // Cocina y logística, que antes no se calculaban en ningún sitio
  ok(personalNecesario("boda", 40).cocina === 2 && personalNecesario("boda", 150).cocina === 5,
    "la cocina va por tramos: 2 hasta 40 pax y 5 de 120 en adelante");
  // La logística no escala con los comensales —depende del camión— pero tampoco se
  // queda clavada en 2 para siempre: una boda de 300 son dos viajes y el doble de
  // material. Sube despacio y con tope.
  ok(personalNecesario("boda", 60).logistica === 2 && personalNecesario("boda", 150).logistica === 3,
    "la logística sube despacio: 2 en 60 pax, 3 en 150");
  ok(personalNecesario("boda", 0).total === 0,
    "sin comensales no hace falta nadie");

  // Un banquete nunca sale con una sola persona de sala
  ok(personalNecesario("boda", 5).sala === 2, "y por pequeño que sea, nunca menos de dos de sala");

  // El ratio a mano del formulario manda: los almuerzos ligeros van a 1 cada 22 medido
  ok(personalNecesario("corporativo", 66, 22).sala === 3,
    "si se fija el ratio a mano, manda el suyo (66 pax a 1 cada 22 → 3)");

  // Lo que NO está medido se dice, en vez de dar un número por bueno
  ok(personalNecesario("cumpleanos", 100).sinMedir && !personalNecesario("boda", 100).sinMedir,
    "cumpleaños y producción se marcan como no medidos: nadie ha comprobado su ratio");
}

console.log("\n══ Quién va a cada evento: horas e importe ══");
{
  // Una boda acaba de madrugada. Entrar a las 17:00 y salir a las 3:00 son DIEZ horas,
  // no menos catorce: restando a secas el total salía negativo y el coste, disparatado.
  ok(horasEntre("17:00", "03:00") === 10, "un turno que acaba de madrugada cuenta las horas bien (17:00→03:00 = 10h)");
  ok(horasEntre("08:00", "14:30") === 6.5, "y uno normal también (08:00→14:30 = 6,5h)");
  ok(horasEntre("08:00", "") === null && horasEntre("", "") === null,
    "sin las dos horas no se inventa una duración");

  // Un asignado sin nombre no es nadie: no se guarda
  ok(saneaAsignados([{ nombre: "Fulanita", rol: "sala" }, { nombre: "  ", rol: "sala" }, null]).length === 1,
    "un asignado sin nombre no se guarda");
  ok(saneaAsignados([{ nombre: "Mengano", rol: "inventado" }])[0].rol === "sala",
    "un rol que no existe cae en sala");

  const gente = [
    { nombre: "Fulanita", rol: "sala", inicio: "15:00", fin: "01:00", importe: 110 },
    { nombre: "Mengano", rol: "logistica", inicio: "07:30", fin: "23:00", importe: 130 },
    { nombre: "Zutana", rol: "cocina" },
  ];
  const r = resumenAsignados(gente);
  ok(r.total === 3 && r.porRol.sala === 1 && r.porRol.cocina === 1 && r.porRol.logistica === 1,
    "se cuenta cuánta gente hay de cada rol");
  ok(r.horas === 25.5 && r.importe === 240,
    `y se suman horas e importe solo de quien los tiene (${r.horas}h · ${r.importe}€)`);
  // Un total a medias se dice, no se disfraza de total: si no, se cierra un evento
  // creyendo que cuesta 240 cuando falta por meter a un tercio de la gente.
  ok(r.sinHoras === 1 && r.sinImporte === 1,
    "y se avisa de cuántos van sin horario y sin importe");

  // Lo que falta por cubrir, contra lo que hace falta de verdad
  const falta = loQueFalta(personalNecesario("boda", 135), gente);
  ok(falta.sala === 14 && falta.cocina === 4 && falta.logistica === 2,
    `de una boda de 135 pax, con tres asignados faltan ${falta.sala} de sala y ${falta.logistica} de logística`);
  ok(loQueFalta({ sala: 2, cocina: 1, logistica: 1 }, gente).sala === 1,
    "y si sobra gente de un rol, no sale un número negativo");
}

console.log("\n══ Tareas: tienen fecha, pero no son eventos ══");
{
  // La hoja de pared está llena de pruebas de menú y visitas técnicas. Antes no tenían
  // tipo, así que no cabían en el calendario — que es tanto como no tenerlas.
  const lista = saneaLista([
    { fecha: "2026-09-03", titulo: "Prueba de menú", tipo: "tarea" },
    { fecha: "2026-09-03", titulo: "Visita técnica", tipo: "tarea" },
    { fecha: "2026-09-12", titulo: "Boda una", tipo: "boda" },
    { fecha: "2026-09-12", titulo: "Boda otra", tipo: "boda" },
  ]);
  ok(lista.length === 4 && lista.filter(a => a.tipo === "tarea").length === 2,
    "una tarea se guarda como tarea, no se convierte en boda por defecto");
  // Lo importante: dos tareas el mismo día NO son un choque. Si contaran, el aviso de
  // "dos eventos el mismo día" saltaría por dos llamadas de teléfono y dejaría de
  // mirarse justo el día que hay dos bodas de verdad.
  const dias = choques(lista).map(c => c.dia);
  ok(dias.length === 1 && dias[0] === "2026-09-12",
    `solo choca el día de las dos bodas, no el de las dos tareas → ${JSON.stringify(dias)}`);
  // Y un tipo que no existe cae en boda, que es el comportamiento de siempre
  ok(saneaLista([{ fecha: "2026-09-03", titulo: "X", tipo: "inventado" }])[0].tipo === "boda",
    "un tipo desconocido sigue cayendo en boda, como antes");
}

console.log("\n══ Los dos enlaces del calendario ══");
{
  // Qué modo abre cada dirección. El que se equivoque aquí abre el calendario de verdad
  // a quien solo tenía que mirar, así que se comprueban los tres casos y los bordes.
  ok(enlaceDeLaUrl("") === null, "sin parámetros es el equipo, que entra por login");
  ok(enlaceDeLaUrl("?abrir=Boda%20X") === null, "un parámetro de otra app no abre ningún modo de enlace");

  const editar = enlaceDeLaUrl("?cal=kq7mfp2xd4rj");
  ok(editar && editar.modo === MODOS.EDICION && editar.codigo === "kq7mfp2xd4rj",
    "?cal= abre en modo edición con su código");

  const mirar = enlaceDeLaUrl("?ver=wz3nbh8tsy6c");
  ok(mirar && mirar.modo === MODOS.LECTURA && mirar.codigo === "wz3nbh8tsy6c",
    "?ver= abre en modo solo lectura");

  // Un código vacío NO es un modo: "?ver=" entraría en solo lectura contra el documento
  // "", que no existe, y se quedaría en un calendario en blanco sin explicación.
  ok(enlaceDeLaUrl("?ver=") === null && enlaceDeLaUrl("?cal=%20%20") === null,
    "un código vacío o en blanco no cuenta como enlace");

  // Con los dos puestos manda el de editar: es el más restrictivo de conceder por error
  // en la dirección contraria (quedarse mirando cuando podías editar se nota; poder
  // editar cuando solo tenías que mirar, no).
  const ambos = enlaceDeLaUrl("?ver=aaa&cal=bbb");
  ok(ambos.modo === MODOS.EDICION, "con los dos parámetros gana el de edición");

  // La dirección de la app del calendario, se copie el enlace desde donde se copie
  const casos = [
    ["https://x.github.io/Repo/calendario/index.html", "https://x.github.io/Repo/calendario/"],
    ["https://x.github.io/Repo/calendario/", "https://x.github.io/Repo/calendario/"],
    // Desde dentro de la checklist: el enlace tiene que salir apuntando al CALENDARIO,
    // no a la checklist. Es el caso que más se va a usar.
    ["https://x.github.io/Repo/checklist/index.html", "https://x.github.io/Repo/calendario/"],
    ["https://x.github.io/Repo/formulario/", "https://x.github.io/Repo/calendario/"],
    ["http://localhost:4178/pruebas/calendario.html", "http://localhost:4178/calendario/"],
    ["https://x.github.io/Repo/", "https://x.github.io/Repo/calendario/"],
  ];
  casos.forEach(([desde, espera]) => {
    ok(direccionDelCalendario(desde) === espera,
      `desde ${desde} → ${direccionDelCalendario(desde)}`);
  });
  ok(direccionDelCalendario("esto no es una dirección") === "",
    "una dirección rota devuelve vacío, no revienta el panel entero");

  // Y los enlaces completos, que es lo que se pega en un WhatsApp
  const es = enlacesDeCalendario("https://x.github.io/Repo/checklist/index.html", { codigo: "aaa", ver: "bbb" });
  ok(es.editar === "https://x.github.io/Repo/calendario/?cal=aaa", `el editable: ${es.editar}`);
  ok(es.ver === "https://x.github.io/Repo/calendario/?ver=bbb", `el de mirar: ${es.ver}`);
  // Lo importante de los dos enlaces: el de mirar NO lleva dentro el código de editar.
  // Si lo llevara, cualquiera que reciba el de ver podría cambiarse el parámetro y
  // ponerse a editar, y los dos enlaces serían el mismo con otra pintura.
  ok(!es.ver.includes("aaa"), "el enlace de mirar no contiene el código de edición");

  // Y de vuelta: lo que se genera se entiende igual al abrirlo
  ok(enlaceDeLaUrl(new URL(es.ver).search).modo === MODOS.LECTURA
     && enlaceDeLaUrl(new URL(es.editar).search).modo === MODOS.EDICION,
    "los enlaces generados se leen de vuelta en el modo que les toca");

  // Lo que se ENSEÑA no es lo que se copia. El entero mide unos 70 caracteres: en un
  // móvil solo se veía "https://r2fod.github.io/Generate_Ch…", justo la parte IDÉNTICA
  // en los dos. Mandar el editable creyendo que mandabas el de mirar no tiene arreglo:
  // ese enlace no se le quita a una persona sin invalidárselo a todas.
  ok(enlaceCorto(es.ver) === "…/calendario/?ver=bbb",
    `el enlace se enseña corto y por el final → "${enlaceCorto(es.ver)}"`);
  ok(enlaceCorto(es.editar) === "…/calendario/?cal=aaa",
    `y así se distingue de un vistazo del otro → "${enlaceCorto(es.editar)}"`);
  ok(enlaceCorto(es.ver).length < 30,
    `y cabe en un móvil estrecho (${enlaceCorto(es.ver).length} caracteres)`);
  // Pero lo que se copia y lo que abre el botón sigue siendo el ENTERO: un enlace
  // recortado que alguien pegue no lleva a ninguna parte.
  ok(es.ver.startsWith("https://") && es.ver.length > enlaceCorto(es.ver).length,
    "lo que se copia sigue siendo el enlace entero, no el recortado");
  ok(enlaceCorto("esto no es una dirección") === "esto no es una dirección",
    "y algo que no es una dirección se enseña tal cual, sin reventar");

  // Sin códigos todavía (recién estrenado, o sin nube) no se ofrece un enlace roto
  ok(enlacesDeCalendario("https://x.github.io/Repo/calendario/", null) === null
     && enlacesDeCalendario("https://x.github.io/Repo/calendario/", { codigo: "aaa", ver: "" }) === null,
    "sin los dos códigos no se ofrece ningún enlace");
}

console.log("\n══ De un apunte del calendario a una checklist empezada ══");
{
  const hoy = new Date("2026-09-01T09:00:00");
  const dia = (n) => {
    const f = new Date(2026, 8, 1 + n);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  };

  const e = estadoDesdeApunte({
    fecha: dia(5), titulo: "Boda de prueba", tipo: "boda", pax: 120, sitio: "Finca inventada", hora: "14:00",
  });
  ok(e.evento === "boda" && e.nombreEvento === "Boda de prueba" && e.fechaEvento === dia(5),
    "el tipo, el nombre y el día pasan tal cual a la checklist");
  ok(e.pax === 120 && e.ubicacion === "Finca inventada" && e.horaInicio === "14:00",
    "y también los pax, el sitio y la hora, que es lo que no hay que volver a teclear");

  // LO IMPORTANTE: el objeto va INCOMPLETO. La checklist lee cada campo con "?? por
  // defecto", así que todo lo que no esté aquí arranca limpio. Si se colara un campo de
  // más, se estaría fijando en la checklist nueva un valor que nadie ha elegido.
  ok(Object.keys(e).sort().join(",") === "evento,fechaEvento,horaInicio,nombreEvento,pax,sinConfigurar,ubicacion",
    `solo van los seis campos que el apunte sabe, más la marca → ${Object.keys(e).join(", ")}`);
  // LA MARCA: sin ella, una checklist recién nacida se ve EXACTAMENTE igual que una
  // terminada —mismo aspecto, mismos valores por defecto— y nadie sabría que el pax que
  // lee es el de fábrica. Cargar un camión con eso es el fallo caro de todo esto.
  ok(e.sinConfigurar === true,
    "lo creado se marca como pendiente de configurar, para que no se confunda con una terminada");

  // Un apunte a medias (lo normal cuando te acaban de dar la fecha) no inventa nada
  const flaco = estadoDesdeApunte({ fecha: dia(3), titulo: "Boda sin datos", tipo: "boda" });
  ok(Object.keys(flaco).sort().join(",") === "evento,fechaEvento,nombreEvento,sinConfigurar",
    `sin pax ni sitio ni hora no se manda ninguno de los tres → ${Object.keys(flaco).join(", ")}`);
  ok(!("pax" in flaco),
    "y sobre todo NO se manda pax: un 0 pisaría el 80 por defecto y saldría una checklist de cero personas");

  // Lo que no es un evento no tiene checklist que empezar
  ["vacaciones", "recogida", "cerrado", "tarea"].forEach(tipo => {
    ok(estadoDesdeApunte({ fecha: dia(2), titulo: "X", tipo }) === null,
      `un apunte de tipo "${tipo}" no genera checklist`);
  });
  ok(estadoDesdeApunte({ fecha: "", titulo: "", tipo: "boda" }) === null,
    "y un apunte sin día ni nombre tampoco");

  // La gente asignada NO se hereda: en el calendario es previsión de turnos y coste, y
  // en la checklist "numCamareros" mueve cantidades de material. Colarlo cambiaría
  // cuánta comida se carga por lo que alguien apuntó como horario.
  const conGente = estadoDesdeApunte({
    fecha: dia(5), titulo: "Boda con gente", tipo: "boda", pax: 100,
    personal: [{ nombre: "Fulanita", rol: "sala", inicio: "08:00", fin: "02:00", importe: 110 }],
  });
  ok(!("numCamareros" in conGente) && !("personal" in conGente) && !("logisticaEquipo" in conGente),
    "la gente asignada del calendario no se cuela en la checklist");

  // Y los que hay que ofrecer: los que vienen y todavía no tienen checklist
  const lista = saneaLista([
    { fecha: dia(3), titulo: "Boda con checklist", tipo: "boda", evento: "Boda con checklist" },
    { fecha: dia(4), titulo: "Boda sin checklist", tipo: "boda" },
    { fecha: dia(40), titulo: "Boda muy lejos", tipo: "boda" },
    { fecha: dia(2), titulo: "Vacaciones de alguien", tipo: "vacaciones" },
  ]);
  const faltan = apuntesPorPromover(lista, { hoy }).map(a => a.titulo);
  ok(faltan.length === 1 && faltan[0] === "Boda sin checklist",
    `solo se ofrece la que viene y no la tiene → ${JSON.stringify(faltan)}`);
  // Lo pasado no se promueve: crear la checklist de una boda de hace un mes solo
  // ensucia el archivo, y encima aparecería en el desplegable de la oficina.
  const conPasada = saneaLista([...lista, { fecha: "2026-08-20", titulo: "Boda de agosto", tipo: "boda" }]);
  ok(!apuntesPorPromover(conPasada, { hoy }).some(a => a.titulo === "Boda de agosto"),
    "un evento que ya pasó no se promueve");
}

console.log("\n══ Qué checklists se crean solas, y cuáles NO ══");
{
  const hoy = new Date("2026-09-01T09:00:00");
  const lista = saneaLista([
    { fecha: "2026-09-04", titulo: "Boda nueva", tipo: "boda", pax: 120, sitio: "Finca inventada" },
    { fecha: "2026-09-06", titulo: "Boda ya montada", tipo: "boda", pax: 90 },
    { fecha: "2026-09-08", titulo: "Boda ya enlazada", tipo: "boda", evento: "Boda ya enlazada" },
    { fecha: "2026-11-20", titulo: "Boda de noviembre", tipo: "boda", pax: 200 },
    { fecha: "2026-09-05", titulo: "Vacaciones de alguien", tipo: "vacaciones" },
    { fecha: "2026-09-07", titulo: "Prueba de menú", tipo: "tarea" },
  ]);
  // El archivo YA tiene dos de ellas: una con trabajo hecho dentro y otra que además
  // está enlazada desde su apunte. El enlace solo vale si el evento sigue existiendo —
  // uno que apunte a algo borrado se vuelve a crear (se comprueba más abajo).
  const archivo = {
    "Boda ya montada": { evento: "boda", pax: 95, checkeados: { "Bebida::Cerveza": true }, itemsManuales: [{ nombre: "Hielo" }] },
    "Boda ya enlazada": { evento: "boda", pax: 70 },
  };

  const { nuevas, enlaces } = checklistsPorCrear(lista, archivo, { hoy });

  ok(Object.keys(nuevas).length === 1 && nuevas["Boda nueva"],
    `solo se crea la que falta de verdad → ${JSON.stringify(Object.keys(nuevas))}`);

  // LA REGLA QUE PROTEGE EL TRABAJO: una checklist que ya existe NO se toca. Pisarla con
  // una recién nacida borraría sus checks y sus items a mano — justo lo que no se puede
  // permitir que pase solo, sin que nadie lo haya pedido.
  ok(!nuevas["Boda ya montada"],
    "una checklist que ya existe NO se sobrescribe, aunque el apunte no esté enlazado");
  ok(archivo["Boda ya montada"].checkeados["Bebida::Cerveza"] === true
     && archivo["Boda ya montada"].itemsManuales.length === 1,
    "y el archivo que se le pasa no se toca: los checks y los items a mano siguen ahí");

  // Pero sí se ENLAZA: el apunte se queda pegado a la que ya había, para que no vuelva
  // a intentarlo en cada apertura.
  const porNombre = Object.fromEntries(enlaces.map(e => [e.nombre, e]));
  ok(porNombre["Boda ya montada"] && porNombre["Boda ya montada"].nueva === false,
    "la que ya existía se enlaza, pero no cuenta como creada");
  ok(porNombre["Boda nueva"].nueva === true, "y la que se crea sí cuenta como nueva");

  ok(!porNombre["Boda ya enlazada"], "la que ya tenía checklist no se vuelve a mirar");
  ok(!porNombre["Boda de noviembre"], "la de dentro de dos meses todavía no: aún puede moverse");
  ok(!porNombre["Vacaciones de alguien"] && !porNombre["Prueba de menú"],
    "y ni las vacaciones ni una prueba de menú generan checklist");

  // Lo creado lleva lo que sabe el calendario, que es de lo que se trata
  ok(nuevas["Boda nueva"].evento === "boda" && nuevas["Boda nueva"].pax === 120
     && nuevas["Boda nueva"].ubicacion === "Finca inventada" && nuevas["Boda nueva"].fechaEvento === "2026-09-04",
    "lo creado llega con el tipo, el pax, el sitio y el día del apunte");

  // Dos apuntes que se llamen igual dentro de la misma tanda son UN evento, no dos
  const dobles = saneaLista([
    { fecha: "2026-09-04", titulo: "Boda repetida", tipo: "boda" },
    { fecha: "2026-09-05", titulo: "Boda repetida", tipo: "boda" },
  ]);
  const r = checklistsPorCrear(dobles, {}, { hoy });
  ok(Object.keys(r.nuevas).length === 1 && r.enlaces.filter(e => e.nueva).length === 1,
    "dos apuntes con el mismo nombre crean UNA checklist, no dos");

  // Sin nada que hacer no se devuelve nada que hacer: es lo que evita escribir en el
  // archivo (y en la nube) cada vez que alguien abre el calendario.
  const nada = checklistsPorCrear(lista, { ...archivo, "Boda nueva": {} }, { hoy });
  ok(Object.keys(nada.nuevas).length === 0,
    "con todo ya creado no se escribe nada en el archivo");

  // ── EL ENLACE ROTO: borraste la checklist y el apunte sigue apuntando a ella ──
  // Es el agujero de verdad de enlazar por nombre. Sin esto, el calendario cree que esa
  // boda está montada y NO la vuelve a crear nunca: la oficina no la ve en su
  // desplegable, y el botón "Abrir" lleva a un evento que no existe.
  {
    const conEnlace = saneaLista([
      { fecha: "2026-09-04", titulo: "Boda borrada", tipo: "boda", pax: 100, evento: "Boda borrada" },
      { fecha: "2026-09-05", titulo: "Boda viva", tipo: "boda", pax: 80, evento: "Boda viva" },
    ]);
    // En el archivo solo queda una: la otra se borró
    const r = checklistsPorCrear(conEnlace, { "Boda viva": { evento: "boda" } }, { hoy });
    ok(Object.keys(r.nuevas).length === 1 && r.nuevas["Boda borrada"],
      `la que apunta a un evento borrado se vuelve a crear → ${JSON.stringify(Object.keys(r.nuevas))}`);
    ok(!r.enlaces.some(e => e.nombre === "Boda viva"),
      "y la que apunta a un evento que sí existe no se toca");

    // Pero lo que ya pasó no se resucita: borrar la checklist de una boda de hace un mes
    // para hacer limpieza no puede traerla de vuelta en cada arranque.
    const pasada = saneaLista([
      { fecha: "2026-08-01", titulo: "Boda de agosto", tipo: "boda", pax: 100, evento: "Boda de agosto" },
    ]);
    ok(Object.keys(checklistsPorCrear(pasada, {}, { hoy }).nuevas).length === 0,
      "una boda pasada con la checklist borrada NO se resucita");
  }

  // Un apunte SIN id no genera enlace. Parece un detalle y no lo es: quien aplica los
  // enlaces busca el apunte por su id, un id vacío coincide con todos los que tampoco
  // lo tengan, y acaba marcando media lista con el nombre equivocado. Salió así en la
  // prueba de arranque —se marcó una boda de dentro de dos meses— y se rompe callado.
  const sinId = checklistsPorCrear(
    [{ fecha: "2026-09-04", titulo: "Boda sin id", tipo: "boda", pax: 100 }], {}, { hoy });
  ok(sinId.enlaces.length === 0 && Object.keys(sinId.nuevas).length === 0,
    "un apunte sin id no genera enlace: sin él no se puede marcar y marcaría a los demás");
}

{
  // La marca viaja dentro del estado del evento, así que pasa por sanearEstado cada vez
  // que se abre, se comparte o llega de la nube. Si ahí se perdiera, el aviso saldría
  // una vez y no volvería: sanearEstado conserva lo que no conoce, y esto lo fija.
  const conMarca = sanearEstado({ nombreEvento: "Boda X", sinConfigurar: true, recogidas: [] });
  ok(conMarca.sinConfigurar === true,
    "la marca de 'sin configurar' sobrevive al saneado del estado");
  // Y sigue sobreviviendo aunque el estado traiga basura que sí hay que tirar
  const conBasura = sanearEstado({ sinConfigurar: true, recogidas: "esto no es una lista" });
  ok(conBasura.sinConfigurar === true && !("recogidas" in conBasura),
    "y se conserva aunque se tire un campo con el tipo equivocado");
}

console.log("\n══ Los ratios de personal se pueden ajustar ══");
{
  const base = { ...PAX_POR_CAMARERO };
  ok(base.boda === 9 && base.corporativo === 10,
    `los de partida salen de los 19 eventos medidos (boda 1 cada ${base.boda}, corporativo 1 cada ${base.corporativo})`);

  // Antes de tocar nada, cumpleaños avisa de que su ratio no lo ha comprobado nadie
  ok(personalNecesario("cumpleanos", 100).sinMedir === true,
    "cumpleaños avisa de que su ratio no está comprobado");
  ok(personalNecesario("boda", 100).sinMedir === false,
    "y una boda no, porque el suyo está medido");

  // Ajustarlo cambia la gente de sala, que es de donde salen delantales, bandejas,
  // litos y menús de personal: no es un número decorativo.
  const antes = personalNecesario("boda", 180).sala;
  ponRatios({ boda: 12 });
  const despues = personalNecesario("boda", 180).sala;
  ok(antes === 20 && despues === 15,
    `una boda de 180: 1 cada 9 son ${antes} de sala, 1 cada 12 son ${despues}`);

  // Lo que no se toca se queda en su valor de partida. Importa: así una corrección de
  // los medidos en una versión nueva llega igual a todo lo que nadie haya cambiado.
  ok(leerRatios().corporativo === base.corporativo,
    "lo que nadie ha ajustado sigue en su valor de partida");

  // Y en cuanto alguien pone el suyo, el aviso de "sin comprobar" sobra: ese número ya
  // no es una suposición, sale de quien ha hecho el evento.
  ponRatios({ cumpleanos: 15 });
  ok(personalNecesario("cumpleanos", 100).sinMedir === false,
    "poner el ratio de cumpleaños quita el aviso de 'sin comprobar'");
  ok(personalNecesario("produccion", 100).sinMedir === true,
    "pero producción, que sigue sin ajustar, lo mantiene");

  // Nada de valores que revientan la cuenta: un 0 dividiría por cero y un 500 diría que
  // una boda de 300 se saca con dos personas. Los dos vienen de un dedo resbalando.
  const malos = saneaRatios({ boda: 0, comunion: -3, corporativo: 500, cumpleanos: "doce", produccion: 11 });
  ok(Object.keys(malos).length === 1 && malos.produccion === 11,
    `solo pasan los números con sentido → ${JSON.stringify(malos)}`);
  ponRatios({ boda: 0 });
  ok(leerRatios().boda === base.boda && personalNecesario("boda", 90).sala === 10,
    "un 0 no se aplica: se vuelve al de partida en vez de dividir por cero");

  // Se sube solo lo cambiado, para no congelar los de partida en la nube
  const cambios = ratiosCambiados({ ...base, boda: 11 });
  ok(Object.keys(cambios).length === 1 && cambios.boda === 11,
    `solo se sube lo que alguien ha cambiado → ${JSON.stringify(cambios)}`);

  // Y el parámetro explícito de la checklist (numCamareros de ese evento concreto)
  // sigue mandando sobre el ratio general: es el dato de ESA boda.
  ponRatios({ boda: 12 });
  ok(personalNecesario("boda", 180, 9).sala === 20,
    "el pax por camarero de un evento concreto manda sobre el ratio general");

  ponRatios({});   // se dejan como estaban para el resto de la batería
  ok(leerRatios().boda === base.boda && personalNecesario("cumpleanos", 100).sinMedir === true,
    "y restablecerlos los devuelve a los de partida, avisos incluidos");
}

console.log("\n══ Los precios, los mismos para todo el equipo ══");
{
  // localStorage de mentira: precios.js lo usa directamente y aquí no hay navegador
  const almacen = new Map();
  globalThis.localStorage = {
    getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v)),
    removeItem: (k) => almacen.delete(k),
  };

  const base = leerPrecios();
  const unItem = "Copas de vino";
  ok(base[unItem] === 1.63, `de partida, ${unItem} cuesta ${base[unItem]} €`);

  // LO IMPORTANTE: se guarda solo lo CAMBIADO, no el catálogo entero. Guardando la
  // mezcla completa, el día que se corrija un precio de partida en una versión nueva la
  // copia guardada lo taparía y nadie del equipo vería la corrección.
  guardarPrecios({ ...base, [unItem]: 2.50 });
  const guardado = JSON.parse(almacen.get("gula_precios_items"));
  ok(Object.keys(guardado).length === 1 && guardado[unItem] === 2.50,
    `solo se guarda lo que alguien ha cambiado → ${JSON.stringify(guardado)}`);
  ok(leerPrecios()[unItem] === 2.50, "y al leer, lo cambiado pisa al de partida");
  ok(leerPrecios()["Cava"] === base["Cava"], "lo que nadie ha tocado sigue en su precio de partida");

  // Volver a poner el de partida deja de ser un cambio: no se arrastra para siempre
  guardarPrecios({ ...leerPrecios(), [unItem]: 1.63 });
  ok(Object.keys(JSON.parse(almacen.get("gula_precios_items"))).length === 0,
    "devolver un precio a su valor de partida lo saca de lo guardado");

  // soloLosCambiados no se cuela nada raro: un texto o un NaN pegado a mano no es precio
  const sucio = soloLosCambiados({ ...base, "Cava": "carísimo", "Vodka": NaN, "Tónica": 9.9 });
  ok(Object.keys(sucio).length === 1 && sucio["Tónica"] === 9.9,
    `un valor que no es un número no se sube → ${JSON.stringify(sucio)}`);

  // Lo que llega de la nube gana sobre lo de este navegador —es lo que ha decidido el
  // equipo— pero no borra lo de aquí que aún no haya subido.
  guardarPrecios({ ...base, "Vodka": 12.0 });
  const fusionado = fusionarPreciosNube({ "Cava": 4.5 });
  ok(fusionado["Cava"] === 4.5 && fusionado["Vodka"] === 12.0,
    `llega el precio del equipo y se conserva el de aquí (${fusionado["Cava"]} / ${fusionado["Vodka"]})`);
  const trasFusion = JSON.parse(almacen.get("gula_precios_items"));
  ok(trasFusion["Cava"] === 4.5 && trasFusion["Vodka"] === 12.0,
    "y queda guardado en este navegador, para poder dibujar sin esperar a la nube");
  ok(fusionarPreciosNube(null)["Cava"] === 4.5,
    "un documento vacío o corrupto no borra los precios que ya había");

  // El pegado sigue funcionando igual: es como se corrigen
  const pegado = parsePreciosPegados("Cava: 5,20\nVodka  11.40\nlínea que no es un precio");
  ok(pegado["Cava"] === 5.2 && pegado["Vodka"] === 11.4 && Object.keys(pegado).length === 2,
    `pegar precios entiende coma y punto, y se salta lo que no lo es → ${JSON.stringify(pegado)}`);

  delete globalThis.localStorage;
}

console.log("\n══ Los niños beben agua y refresco, no vino ══");
{
  // Comunión de 60 adultos + 25 niños. Antes TODO se calculaba sobre los adultos, así
  // que faltaba agua y refresco para veinticinco personas — y son justo quienes más
  // refresco beben.
  const con = calcBebidas(85, 6, true, false, true, 4, { alcoholPax: 60 });
  const sin = calcBebidas(60, 6, true, false, true, 4);

  ok(con.agua15 > sin.agua15 && con.cocaNormal > sin.cocaNormal,
    `el agua y el refresco cuentan a los niños (${sin.agua15}→${con.agua15} agua · ${sin.cocaNormal}→${con.cocaNormal} coca)`);
  // Pero un niño no bebe el agua de un adulto: cuenta como 0,6. Contarlo entero
  // hinchaba el agua de una comunión sin motivo.
  ok(con.agua15 === 60,
    `25 niños suman como 15 adultos en el agua, no como 25 (${sin.agua15}→${con.agua15}, entero serían 68)`);
  // Las de 33cl NO llevan la corrección: donde más se usan es en producción, y allí no
  // suele haber niños.
  ok(con.aguasPequenasUds === Math.round(85 * 3),
    `las de 33cl van sobre todos, sin corregir (${con.aguasPequenasUds} uds)`);
  ok(con.vinoBlanco + con.vinoTinto === sin.vinoBlanco + sin.vinoTinto,
    "pero el vino no: se calcula solo sobre los adultos");
  ok(con.cerveza === sin.cerveza && con.cava === sin.cava && con.tonica === sin.tonica,
    "ni la cerveza, ni el cava, ni la tónica");
  ok(con.hieloKg > sin.hieloKg,
    `y el hielo sí, que los refrescos de los niños también van fríos (${sin.hieloKg}→${con.hieloKg} kg)`);

  // Sin niños se comporta exactamente igual que antes: alcoholPax cae en pax
  const solo = calcBebidas(100, 6, true, false, true, 4);
  ok(solo.vinoBlanco + solo.vinoTinto === 72 && solo.agua15 === 80,
    "sin niños no cambia nada de lo de siempre");
}

console.log("\n══ Refrescos: los cuatro que nadie calibró ══");
{
  // Coca normal, Zero y Nestea cuadran EXACTOS con el evento de 65 pax del que salieron
  // (120 / 72 / 12). Esos no se tocan.
  const b = calcBebidas(65, 4, true, false);
  ok(b.cocaNormal === 120 && b.cocaZero === 72 && b.nestea === 12,
    `los tres calibrados siguen clavados en su fuente → ${b.cocaNormal}/${b.cocaZero}/${b.nestea}`);

  // Los otros cuatro se añadieron después sin ningún dato: sumaban 2,6 uds/pax ellos
  // solos y hacían que el total sobrepasara en un 84% su propia calibración.
  const total = b.cocaNormal + b.cocaZero + b.nestea + b.fantaNaranja + b.fantaLimon + b.aquarius + b.sprite;
  const porPax = total / 65;
  ok(porPax > 4 && porPax < 5,
    `el total baja a ${porPax.toFixed(1)} uds/pax (antes 5,7, calibración 3,1)`);
  const sinCalibrar = (b.fantaNaranja + b.fantaLimon + b.aquarius + b.sprite) / 65;
  ok(sinCalibrar < 1.5,
    `y los cuatro sin calibrar pesan ahora ${sinCalibrar.toFixed(1)} uds/pax, no 2,6`);
}

console.log("\n══ Cocina y logística dejan de aplanarse ══");
{
  const n = (pax) => personalNecesario("boda", pax);
  // Se quedaban clavadas: 5 de cocina y 2 de logística lo mismo para 130 que para 400.
  ok(n(300).cocina > n(150).cocina && n(400).cocina > n(300).cocina,
    `la cocina sube con el evento (150→${n(150).cocina} · 300→${n(300).cocina} · 400→${n(400).cocina})`);
  ok(n(300).logistica > n(100).logistica,
    `y la logística también (100→${n(100).logistica} · 300→${n(300).logistica})`);
  // Los tramos MEDIDOS no se tocan: esos sí salen de los 19 eventos de la hoja
  ok(n(40).cocina === 2 && n(60).cocina === 3 && n(120).cocina === 4,
    "los tramos medidos (≤40, ≤60, ≤120) se quedan exactamente como estaban");
  ok(n(30).logistica === 1 && n(100).logistica === 2,
    "y la logística pequeña también");
  // Ni se dispara: por encima de 4 de logística no se ha visto nunca
  ok(n(1000).logistica === 4, "la logística tiene tope en 4, no crece sin freno");
}

console.log("\n══ El hielo: kilos, bolsas y taxis ══");
{
  ok(KG_POR_TAXI === 24 && KG_POR_BOLSA === 2,
    "un taxi son 12 bolsas de 2 kg = 24 kg");

  const v = (pax, o) => calcHielo(pax, o);

  // Boda de verano con barra y SIN arca en la finca: es el caso que se queda sin hielo
  const veranoSinArca = v(150, { mesVerano: true, horasBarra: 5, tieneCongelador: false });
  ok(veranoSinArca.kg === 183 && veranoSinArca.taxis === 8 && veranoSinArca.bolsas === 92,
    `150 pax, verano, con barra, sin arca → ${veranoSinArca.kg} kg · ${veranoSinArca.taxis} taxis · ${veranoSinArca.bolsas} bolsas`);
  // Las tres unidades tienen que cuadrar entre sí
  ok(veranoSinArca.bolsas === Math.ceil(veranoSinArca.kg / 2)
     && veranoSinArca.taxis === Math.ceil(veranoSinArca.kg / 24),
    "las bolsas y los taxis salen de los kilos, no son cuentas aparte");

  // LA MERMA: con arca el hielo se guarda; sin ella vive en neveras portátiles y en
  // verano se pierde un tercio antes de llegar al vaso.
  const conArca = v(150, { mesVerano: true, horasBarra: 5, tieneCongelador: true });
  ok(conArca.kg === 135 && veranoSinArca.kg > conArca.kg,
    `sin arca hacen falta ${veranoSinArca.kg} kg contra ${conArca.kg} con ella: es la merma por derretimiento`);
  ok(Math.round((veranoSinArca.kg / conArca.kg) * 100) === 136,
    "la merma de verano sin arca es del ~35%");

  // Y con arca YA NO SALE CERO. Antes con congelador no se cargaba hielo, dando por
  // hecho que se fabricaba in situ: un arca te deja guardarlo, no fabricarlo.
  ok(conArca.kg > 0 && conArca.taxis > 0,
    "con arca se sigue cargando hielo: sirve para guardarlo, no para fabricarlo");

  // Temporada y barra
  ok(v(150, { mesVerano: false, horasBarra: 5 }).kg < veranoSinArca.kg,
    "en invierno hace falta menos que en verano");
  const sinBarra = v(150, { mesVerano: true, horasBarra: 0 });
  ok(sinBarra.kg < v(150, { mesVerano: true, horasBarra: 4 }).kg && sinBarra.kg > 0,
    `sin barra hace falta menos, pero no cero: los refrescos y el agua van fríos igual (${sinBarra.kg} kg)`);

  // Nunca medio taxi ni cero taxis con hielo dentro
  ok(v(10, { mesVerano: true, horasBarra: 4 }).taxis === 1,
    "un evento pequeño pide un taxi, no cero");
  ok(v(0, {}).kg === 0 && v(0, {}).taxis === 0,
    "sin gente no se carga hielo");

  // Está en el rango del sector (0,7-1 kg/pax con barra en verano)
  const porPax = veranoSinArca.kg / 150;
  ok(porPax >= 0.7 && porPax <= 1.4,
    `sale a ${porPax.toFixed(2)} kg/pax, dentro del rango alto del sector`);
}

console.log("\n══ Las mesas de los comensales ══");
{
  // SEIS por mesa rectangular, no siete ni ocho: aquí se juntan varias para hacer mesas
  // largas, y al juntarlas se pierden las cabeceras, que es de donde salen los
  // comensales de más que dan las tablas del sector.
  ok(TIPOS_MESA[TIPO_MESA_POR_DEFECTO].porMesa === 6,
    "la rectangular de 1,8m va a 6, porque se juntan y se pierden las cabeceras");
  ok(mesasComensales(100) === 17 && mesasComensales(60) === 10,
    `100 pax → ${mesasComensales(100)} mesas rectangulares · 60 pax → ${mesasComensales(60)}`);
  ok(mesasComensales(0) === 0 && mesasComensales(1) === 1,
    "sin gente no hay mesas, y una persona ya pide una");

  // Las redondas son de alquiler y entran más por mesa
  ok(mesasComensales(120, "Redonda 2m") === 10 && TIPOS_MESA["Redonda 2m"].alquiler === true,
    `120 pax en redonda de 2m → ${mesasComensales(120, "Redonda 2m")} mesas, y son de alquiler`);
  ok(mesasComensales(100, "Redonda 1,5m") === 13 && mesasComensales(100, "Redonda 1,8m") === 10,
    `100 pax en redonda de 1,5 → 13 mesas · de 1,8 → 10`);
  ok(TIPOS_MESA["Redonda 1,5m"].alquiler === true && TIPOS_MESA[TIPO_MESA_POR_DEFECTO].alquiler === false,
    "las redondas son de alquiler; las rectangulares son nuestras");

  // Todo rectangular: UNA sola línea, con las de cocina sumadas, como ha sido siempre.
  // El nombre "Mesas de 1,8m" es la identidad del ítem: si cambiara, los eventos ya
  // guardados perderían sus marcas de carga y sus cantidades corregidas a mano.
  const rect = lineasDeMesas(4, 100);
  ok(rect.length === 1 && rect[0][0] === "Mesas de 1,8m" && rect[0][1] === "21",
    `en rectangular sale una línea con cocina incluida → ${JSON.stringify(rect)}`);

  // Con redondas se parten en dos: las de cocina SIGUEN siendo rectangulares, que es
  // sobre lo que se prepara el servicio, y no se mezclan con las de comer.
  const red = lineasDeMesas(4, 100, "Redonda 1,5m");
  ok(red.length === 2 && red[0][0] === "Mesas de 1,8m" && red[0][1] === "4",
    `las de cocina se quedan rectangulares y aparte → ${JSON.stringify(red[0])}`);
  ok(red[1][0] === "Mesas redondas 1,5m (alquiler)" && red[1][1] === "13" && red[1][2] === true,
    `y las de comer salen marcadas como alquiler → ${JSON.stringify(red[1])}`);

  // Los manteles visten TODAS las mesas, sean del tipo que sean
  ok(mesasParaVestir(4, 100) === 21 && mesasParaVestir(4, 100, "Redonda 1,8m") === 14,
    `se visten todas: 21 en rectangular, 14 en redonda de 1,8`);

  // Un tipo que no existe (de un evento viejo, o de un estado manipulado) cae en el de
  // siempre en vez de reventar la checklist entera
  ok(tipoMesaValido("Inventada") === TIPO_MESA_POR_DEFECTO && mesasComensales(60, "Inventada") === 10,
    "un tipo desconocido cae en la rectangular de siempre");
}

// ─── CUÁNTO SE BEBE EN CADA TIPO DE EVENTO ────────────────────────────────────
{
  console.log("\n── Factores de bebida ──");
  ponFactores({});   // se arranca limpio: otras pruebas de arriba no dejan nada puesto

  // Lo importante del módulo entero: sin tocar nada, TODO sale exactamente como antes
  // de que existiera. Si esta falla, la nueva pieza ha cambiado la carga de camiones
  // que llevan años saliendo bien.
  ok(TIPOS_BEBIDA.every(t => CLAVES_BEBIDA.every(b => factorDe({}, t, b) === FACTOR_NEUTRO)),
    "sin nada puesto, los veinte factores valen 1");
  const bodaBase = calcBebidas(100, 6, true, false, false, 4, { alcoholPax: 100, tipo: "boda" });
  const sinTipo  = calcBebidas(100, 6, true, false, false, 4, { alcoholPax: 100 });
  ok(JSON.stringify(bodaBase) === JSON.stringify(sinTipo),
    "y pasar el tipo sin factores da lo mismo que no pasarlo");

  // Un factor de 0,5 en el vino de comunión baja el vino de la comunión Y NADA MÁS.
  // Es el fallo que se cuela solo: tocar un ratio y llevarse por delante otro.
  ponFactores({ comunion: { vino: 0.5 } });
  const com = calcBebidas(100, 6, true, false, false, 4, { alcoholPax: 100, tipo: "comunion" });
  ok(com.vinoBlanco + com.vinoTinto === Math.round((bodaBase.vinoBlanco + bodaBase.vinoTinto) / 2),
    `el vino de comunión baja a la mitad → ${com.vinoBlanco + com.vinoTinto} de ${bodaBase.vinoBlanco + bodaBase.vinoTinto}`);
  ok(com.cerveza === bodaBase.cerveza && com.cava === bodaBase.cava && com.cocaNormal === bodaBase.cocaNormal,
    "y la cerveza, el cava y el refresco no se mueven");
  const bodaOtraVez = calcBebidas(100, 6, true, false, false, 4, { alcoholPax: 100, tipo: "boda" });
  ok(JSON.stringify(bodaOtraVez) === JSON.stringify(bodaBase),
    "y la boda sigue igual que antes de tocar la comunión");

  // Los cuatro factores llegan a su bebida, cada uno a la suya
  ponFactores({ boda: { cerveza: 0.5, cava: 0.5, refresco: 0.5 } });
  const mitad = calcBebidas(100, 6, true, false, false, 4, { alcoholPax: 100, tipo: "boda" });
  ok(mitad.cerveza < bodaBase.cerveza && mitad.cava < bodaBase.cava && mitad.cocaNormal < bodaBase.cocaNormal,
    "cerveza, cava y refresco bajan cada uno con el suyo");
  ok(mitad.vinoBlanco === bodaBase.vinoBlanco && mitad.vinoTinto === bodaBase.vinoTinto,
    "y el vino, que no se tocó, se queda donde estaba");

  // Un dedo resbalando en el móvil no puede dejar la boda sin vino ni pedir cinco veces
  // la bebida de un evento entero.
  ok(!esFactorValido(0) && !esFactorValido(0.1) && !esFactorValido(5) && !esFactorValido(NaN),
    "un 0, un 0,1 o un 5 no son factores");
  ok(esFactorValido(0.3) && esFactorValido(1) && esFactorValido(2), "0,3, 1 y 2 sí lo son");
  ok(Object.keys(saneaFactores({ boda: { vino: 9 }, inventado: { vino: 1.2 } })).length === 0,
    "lo que no cuela se tira, y un tipo que no existe también");

  // Poner el neutro es QUITAR el factor, no guardar un 1: guardarlo congelaría el ratio
  // de partida el día que se corrija en una versión nueva.
  const puesto = conFactor({}, "boda", "vino", 0.8);
  ok(puesto.boda.vino === 0.8, "conFactor pone el factor");
  ok(Object.keys(conFactor(puesto, "boda", "vino", 1)).length === 0,
    "y volver a 1 lo borra en vez de guardar un 1");
  const dos = conFactor(conFactor({}, "boda", "vino", 0.8), "boda", "cava", 1.2);
  ok(dos.boda.vino === 0.8 && dos.boda.cava === 1.2 && cuantosAjustados(dos) === 2,
    "dos factores del mismo tipo conviven");

  ponFactores({});
  ok(cuantosAjustados(leerFactores()) === 0, "y se puede volver a dejar todo limpio");
}

// ─── LO QUE DICE EL HISTÓRICO ─────────────────────────────────────────────────
{
  console.log("\n── Calibración de bebida con lo que volvió ──");
  ponFactores({});

  // Las etiquetas de BEBIDAS tienen que existir DE VERDAD en una checklist. Si alguien
  // renombra "Vino blanco" en el generador, la calibración deja de encontrarlo y se
  // queda callada para siempre — un fallo que no da error, solo silencio.
  const cats = buildChecklist("boda", 100, 2, 4, 0, {});
  const enLaChecklist = new Set(cats.flatMap(c => c.items.filter(Boolean).map(it => it[0])));
  CLAVES_BEBIDA.forEach(b => {
    const faltan = BEBIDAS[b].items.filter(l => !enLaChecklist.has(l));
    ok(faltan.length === 0, `las líneas de ${BEBIDAS[b].nombre} existen en la checklist${faltan.length ? ` → faltan ${faltan.join(", ")}` : ""}`);
  });

  // Un evento con la vuelta apuntada: sale X, vuelve la mitad → se bebió la mitad.
  const eventoBase = { evento: "comunion", pax: 100, ninos: 0, fechaEvento: "2026-05-01",
    barraCoctel: true, horasCoctel: 2, barraCopas: true, horasCopas: 4, mesVerano: true };
  const catsCom = catsDeEventoGuardado(eventoBase);
  // Se apunta que vuelve la mitad de cada línea de vino, con la clave real de la app
  const conVueltaVino = (frac) => {
    const vueltos = {};
    catsCom.forEach(c => c.items.filter(Boolean).forEach(it => {
      if (!BEBIDAS.vino.items.includes(it[0])) return;
      const qty = parseFloat(String(it[1] && it[1].u ? it[1].u : it[1]).replace(",", "."));
      vueltos[`${c.nombre}::${it[0]}`] = String(Math.round(qty * frac));
    }));
    return { ...eventoBase, vueltos };
  };

  // Con menos de tres eventos NO dice nada: dos eventos son una anécdota, y cambiar la
  // carga de todas las comuniones por dos casos es peor que no tocar nada.
  const dos = { a: conVueltaVino(0.5), b: conVueltaVino(0.5) };
  ok(Object.keys(calibracionBebida(dos, {})).length === 0, "con dos eventos no se pronuncia");

  const tres = { a: conVueltaVino(0.5), b: conVueltaVino(0.5), c: conVueltaVino(0.5) };
  const cal = calibracionBebida(tres, {});
  ok(cal.comunion && cal.comunion.vino && Math.abs(cal.comunion.vino.factor - 0.5) < 0.03,
    `con tres, vuelve la mitad → factor ~0,5 (${cal.comunion && cal.comunion.vino && cal.comunion.vino.factor})`);
  ok(cal.comunion.vino.nEventos === 3, "y dice en cuántos eventos se ha medido");
  ok(!cal.comunion.cerveza && !cal.comunion.cava,
    "y de lo que no se apuntó la vuelta no dice nada");

  // La mediana, no la media: un evento raro (un barril reventado, un cronómetro mal)
  // no puede llevarse por delante el factor de todos los demás.
  const conRaro = { a: conVueltaVino(0.5), b: conVueltaVino(0.5), c: conVueltaVino(0.5), d: conVueltaVino(0) };
  ok(Math.abs(calibracionBebida(conRaro, {}).comunion.vino.factor - 0.5) < 0.03,
    "un evento en el que no volvió nada no arrastra la mediana");

  // Converge: aplicar la sugerencia y volver a medir tiene que dar 1, no otra corrección
  // encima. Si no, cada visita al panel bajaría el vino otro tanto hasta dejarlo en nada.
  ponFactores({ comunion: { vino: 0.5 } });
  // Consumo clavado = no vuelve nada, no "vuelve todo": si volviera todo el consumo
  // sería cero y el factor también, que es otra cosa distinta.
  const yaAjustado = { a: conVueltaVino(0), b: conVueltaVino(0), c: conVueltaVino(0) };
  const seg = calibracionBebida(yaAjustado, { comunion: { vino: 0.5 } });
  ok(seg.comunion && Math.abs(seg.comunion.vino.factor - 0.5) < 0.03,
    `con el factor ya puesto y consumo clavado, se queda en 0,5 (${seg.comunion && seg.comunion.vino.factor})`);
  ponFactores({});

  // "Vuelven más de las que salieron" es imposible y no puede contarse como consumo 0
  const imposible = {};
  catsCom.forEach(c => c.items.filter(Boolean).forEach(it => {
    if (BEBIDAS.vino.items.includes(it[0])) imposible[`${c.nombre}::${it[0]}`] = "9999";
  }));
  const conImposible = { a: { ...eventoBase, vueltos: imposible }, b: conVueltaVino(0.5), c: conVueltaVino(0.5) };
  ok(!calibracionBebida(conImposible, {}).comunion,
    "una línea con más vuelta que carga tira ese evento entero, y quedan dos");

  // Un evento sin vueltos, uno con el tipo cambiado a mano y uno vacío no revientan nada
  ok(Object.keys(calibracionBebida({ x: { evento: "boda", pax: 50 }, y: {}, z: { evento: "inventado", vueltos: {} } }, {})).length === 0,
    "eventos sin datos, vacíos o de un tipo que no existe se ignoran sin reventar");
}

// ─── LOS MENÚS QUE HAY QUE HACER APARTE ───────────────────────────────────────
{
  console.log("\n── Menús especiales a partir de las alergias ──");
  const de = (t) => menusEspeciales(alergiasDeLasNotas(t));
  const cuantos = (t, clave) => (de(t).find(m => m.clave === clave) || {}).n;

  // El ejemplo que sale escrito en el propio formulario. Si esto falla, falla lo que la
  // gente va a escribir de verdad.
  const real = de("⚠️ ALERGIAS: 2 celíacos, 1 alérgico al marisco en la mesa 4, 1 vegano");
  ok(totalMenusEspeciales(real) === 4, `el ejemplo del formulario da 4 menús → ${totalMenusEspeciales(real)}`);
  ok(cuantos("⚠️ ALERGIAS: 2 celíacos, 1 alérgico al marisco en la mesa 4, 1 vegano", "gluten") === 2,
    "dos celíacos son dos menús sin gluten");
  // El 4 de "en la mesa 4" no son cuatro menús, y ese es el fallo que más caro sale:
  // cocina prepara cuatro raciones sin marisco y faltan tres platos normales.
  ok(cuantos("⚠️ ALERGIAS: 1 alérgico al marisco en la mesa 4", "marisco") === 1,
    "y el número de una mesa no se cuenta como comensales");

  // Escrito con números en palabra, que es como se contesta desde el móvil
  ok(cuantos("ALERGIAS: dos veganos y un intolerante a la lactosa", "vegano") === 2 &&
     cuantos("ALERGIAS: dos veganos y un intolerante a la lactosa", "lactosa") === 1,
    "\"dos veganos y un intolerante a la lactosa\" sale bien");

  // Sin número es UNA persona: quedarse corto en cocina es el fallo caro
  ok(cuantos("ALERGIAS: celíaco", "gluten") === 1, "sin número se cuenta uno");

  // La misma familia repartida en dos frases se suma
  ok(cuantos("ALERGIAS: 2 celíacos. 1 celíaco más que avisó ayer", "gluten") === 3,
    "la misma alergia en dos frases se suma");

  // Contestar que no hay no puede crear una categoría
  ["", "   ", "ninguna", "No", "no hay", "-", "sin alergias"].forEach(t => {
    ok(de(`ALERGIAS: ${t}`).length === 0, `"${t || "(vacío)"}" no crea ningún menú`);
  });

  // MENCIONAR un alérgeno no es PEDIR un menú. Sin esto, "el postre lleva frutos secos"
  // mandaba a cocina a preparar un menú que nadie ha pedido.
  ok(de("El postre lleva frutos secos").length === 0,
    "mencionar un alérgeno sin pedir nada no crea un menú");
  ok(cuantos("ALERGIAS: 1 sin frutos secos", "secos") === 1,
    "pero \"1 sin frutos secos\" sí");

  // Lo que la app NO entiende sale igual, contado y con el texto. Una alergia que se
  // calla porque no se ha sabido clasificar es justo lo que esto viene a evitar.
  const raro = de("ALERGIAS: 2 alérgicos al sésamo");
  ok(raro.length === 1 && raro[0].clave === "revisar" && raro[0].n === 2,
    `una alergia desconocida sale para revisar, no se pierde → ${JSON.stringify(raro)}`);

  // Las notas que no son alergias no ensucian la cuenta
  ok(de("⚠️ ALERGIAS: 1 vegano\nHablar con Marta al llegar. Aparcar detrás.").length === 1,
    "el resto de las notas no cuenta como menús");

  // Y sin la marca del formulario, escrito a mano en las notas, también se lee
  ok(cuantos("Ojo: hay 3 celíacos", "gluten") === 3, "escrito a mano en las notas también vale");

  // La categoría entra en la checklist SOLO si hay alguno, y va la primera
  ok(categoriaMenusEspeciales("nada que reseñar") === null, "sin alergias no hay categoría");
  const cat = categoriaMenusEspeciales("⚠️ ALERGIAS: 2 celíacos, 1 vegano");
  ok(cat.nombre === "Menús especiales" && cat.items.length === 2, "con alergias sale la categoría");

  const conAlergias = buildChecklist("boda", 100, 2, 4, 0, { notasEvento: "⚠️ ALERGIAS: 2 celíacos" });
  const sinAlergias = buildChecklist("boda", 100, 2, 4, 0, {});
  ok(conAlergias[0].nombre === "Menús especiales", "y va la primera de la checklist");
  ok(conAlergias.length === sinAlergias.length + 1, "sin tocar ninguna otra categoría");
  ok(JSON.stringify(conAlergias.slice(1)) === JSON.stringify(sinAlergias),
    "y el resto de la checklist sale exactamente igual que antes");

  // Los cinco tipos de evento la llevan: una alergia no depende de si es boda o rodaje
  ["boda", "comunion", "corporativo", "cumpleanos", "produccion"].forEach(t => {
    const c = buildChecklist(t, 60, 2, 2, 0, { notasEvento: "ALERGIAS: 1 celíaco" });
    ok(c[0] && c[0].nombre === "Menús especiales", `${t} también saca los menús especiales`);
  });
}

// ─── LA ESCALETA DEL DÍA ──────────────────────────────────────────────────────
{
  console.log("\n── Escaleta del día ──");
  const base = { horaInicio: "13:00", horasCoctel: 1, horasCopas: 4, totalItems: 140,
    pax: 100, numLogistica: 3, horasJornada: 10 };
  const e = escaletaDelEvento(base);
  const dame = (fase) => e.find(t => t.fase === fase);
  const enMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));

  // Sin hora de inicio no hay escaleta. Enseñar una que empieza a las 00:00 sería
  // enseñar una mentira ordenada, y alguien saldría del obrador a esa hora.
  ok(escaletaDelEvento({}).length === 0 && escaletaDelEvento({ horaInicio: "nolaes" }).length === 0,
    "sin hora de inicio no se inventa ninguna escaleta");

  // Va en orden y sin huecos: el fin de cada tramo es el principio del siguiente. Es lo
  // único que hace que una escaleta sirva para algo.
  let encadenada = true;
  for (let i = 1; i < e.length; i++) if (e[i - 1].fin !== e[i].hora) encadenada = false;
  ok(encadenada, "los tramos van encadenados, sin huecos ni solapes");

  // La hora de inicio es la única que no se negocia: el montaje tiene que estar acabado
  // antes, con su margen de respiro.
  ok(dame("margen").fin === "13:00" && dame("margen").minutos === MARGEN_ANTES_MIN,
    `el repaso acaba justo a la hora de inicio (${dame("margen").fin})`);
  ok(dame("montaje").fin === dame("margen").hora, "y el montaje acaba cuando empieza el repaso");

  // El cóctel arranca a la hora de inicio y las copas van después del servicio
  ok(dame("coctel").hora === "13:00", "el cóctel empieza a la hora de inicio");
  ok(enMin(dame("copas").hora) > enMin(dame("servicio").hora), "y las copas van después del servicio");
  ok(dame("recogida").hora === dame("copas").fin, "la recogida empieza al cerrar la barra");

  // Sin barra de cóctel no hay tramo de cóctel: no se pinta un tramo de cero minutos
  const sinCoctel = escaletaDelEvento({ ...base, horasCoctel: 0 });
  ok(!sinCoctel.find(t => t.fase === "coctel"), "sin cóctel no sale el tramo de cóctel");
  ok(sinCoctel.find(t => t.fase === "servicio").hora === "13:00",
    "y el servicio pasa a empezar a la hora de inicio");
  const sinCopas = escaletaDelEvento({ ...base, horasCopas: 0 });
  ok(!sinCopas.find(t => t.fase === "copas"), "y sin barra de copas tampoco sale el suyo");

  // El viaje no lo sabe la app y se marca. Una escaleta que se saca un tiempo de viaje
  // de la manga es peor que no tenerla, porque parece que lo sabe.
  ok(dame("viaje").estimado === true && dame("viaje").minutos === VIAJE_POR_DEFECTO_MIN,
    "el viaje sale marcado como estimado");
  ok(escaletaDelEvento({ ...base, viajeMin: 90 }).find(t => t.fase === "viaje").estimado !== true,
    "y si se dice cuánto se tarda, deja de estar marcado");

  // Más carga o menos gente empujan la salida hacia atrás, nunca hacia delante
  const masItems = escaletaDelEvento({ ...base, totalItems: 400 });
  ok(enMin(masItems[0].hora) < enMin(e[0].hora), "con más carga hay que salir antes");
  const menosGente = escaletaDelEvento({ ...base, numLogistica: 1 });
  ok(enMin(menosGente[0].hora) < enMin(e[0].hora), "y con menos gente de logística también");

  // El horario que ya se ha decidido manda, pero el desfase se dice en voz alta: es
  // tiempo que va a faltar en el montaje, no un detalle.
  const conEquipo = escaletaDelEvento({ ...base, logisticaEquipo: [{ inicio: "09:00" }, { inicio: "10:00" }] });
  const prep = conEquipo.find(t => t.fase === "prep");
  ok(prep.horaDecidida === "09:00", "coge la entrada más temprana del equipo, no la más tarde");
  ok(prep.desfaseMin > 0, `y avisa de cuánto se entra tarde (${prep.desfaseMin} min)`);
  const aTiempo = escaletaDelEvento({ ...base, logisticaEquipo: [{ inicio: "05:00" }] });
  ok(aTiempo.find(t => t.fase === "prep").desfaseMin < 0, "entrando pronto el desfase sale a favor");

  // Un evento de noche que se recoge pasada medianoche no puede reventar la escaleta
  const nocturno = escaletaDelEvento({ ...base, horaInicio: "21:00", horasCopas: 5 });
  ok(nocturno.every(t => /^\d{2}:\d{2}$/.test(t.hora) && /^\d{2}:\d{2}$/.test(t.fin)),
    "un evento que acaba de madrugada sigue dando horas válidas");

  // El resumen de una línea es lo que de verdad se pregunta por el grupo de WhatsApp
  ok(/^Salida \d{2}:\d{2} · inicio 13:00 · recogida hasta \d{2}:\d{2}$/.test(resumenEscaleta(e)),
    `el resumen sale en una línea → "${resumenEscaleta(e)}"`);
  ok(resumenEscaleta([]) === "", "y sin escaleta el resumen es vacío, no un texto a medias");
}

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Todo correcto.");
