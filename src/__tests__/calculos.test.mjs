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
} from "../calculos.js";
import { sanearEstado, CAMPOS_VIGILADOS, cambiosDeCantidad } from "../estado.js";
import { queAvisoToca, yaEsApp, estaSilenciado, DIAS_SILENCIO } from "../formulario/instalar.js";
import { codigoDeTexto, direccionConCodigo, leerGuardado, guardar } from "../formulario/codigo.js";
import { saneaEquipo, personaDeTexto, disponiblesEn, saneaLista, choques, estadoDesdeApunte, apuntesPorPromover, checklistsPorCrear } from "../calendario/apuntes.js";
import { personalNecesario, horasEntre, resumenAsignados, loQueFalta, saneaAsignados,
  PAX_POR_CAMARERO, saneaRatios, ponRatios, leerRatios, ratiosCambiados } from "../personal.js";
import { MODOS, enlaceDeLaUrl, direccionDelCalendario, enlacesDeCalendario } from "../calendario/enlace.js";
import { leerPrecios, guardarPrecios, soloLosCambiados, fusionarPreciosNube, parsePreciosPegados } from "../precios.js";

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
  const conRo = saneaEquipo([{ nombre: "Rocío", apodos: ["ro"] }, "Rodrigo"]);
  ok(personaDeTexto("Boda de Rodrigo", conRo) === "Rodrigo",
    '"Rodrigo" no es "ro": se busca por palabras completas, no por trozos');
  ok(personaDeTexto("VACAS RO", conRo) === "Rocío",
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
  ok(personalNecesario("boda", 60).logistica === 2 && personalNecesario("boda", 150).logistica === 2,
    "y logística son 2 tanto en 60 como en 150: no depende de los comensales, depende del camión");
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
  ok(falta.sala === 14 && falta.cocina === 4 && falta.logistica === 1,
    `de una boda de 135 pax, con tres asignados faltan ${falta.sala} de sala`);
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
  ok(Object.keys(e).sort().join(",") === "evento,fechaEvento,horaInicio,nombreEvento,pax,ubicacion",
    `solo van los seis campos que el apunte sabe → ${Object.keys(e).join(", ")}`);

  // Un apunte a medias (lo normal cuando te acaban de dar la fecha) no inventa nada
  const flaco = estadoDesdeApunte({ fecha: dia(3), titulo: "Boda sin datos", tipo: "boda" });
  ok(Object.keys(flaco).sort().join(",") === "evento,fechaEvento,nombreEvento",
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

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Todo correcto.");
