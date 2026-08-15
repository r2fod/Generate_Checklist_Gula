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
import { saneaEquipo, personaDeTexto, disponiblesEn, saneaLista, choques } from "../calendario/apuntes.js";

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

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Todo correcto.");
