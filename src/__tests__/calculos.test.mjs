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
  terciosConBarril, conMargen, bateas, BATEA,
  BOTELLAS_AGUA_POR_PAX, RESPALDO_TERCIOS_CON_BARRIL, RENDIMIENTO_BARRIL,
} from "../calculos.js";

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
}

console.log("\n══ Red Bull: eso sí es de la barra ══");
{
  ok(calcBebidas(100, 0, true, false).redbull === 0,
    "sin barra no va ni uno");
  ok(calcBebidas(100, 0.5, true, false).redbull > 0,
    "con barra, aunque sea media hora, ya va");
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

console.log("\n══ Cristalería ══");
{
  const copas = (hc, hp) => calcCristaleria(100, hc, hp, false, false, false);
  // Las copas de mesa dependen del TOTAL de horas (cóctel + copas), así que la curva
  // se ordena por ese total. Mezclar los dos ejes sin ordenar comparaba 3 horas contra
  // 2 y daba un falso positivo: ese fallo era de la prueba, no del cálculo.
  const curva = [[0,0],[1,0],[0,2],[2,0],[3,0],[0,4],[2,4],[3,5],[4,8],[6,12]]
    .sort((x, y) => (x[0] + x[1]) - (y[0] + y[1]))
    .map(([a, b]) => [`${a}+${b}`, copas(a, b).vino.u]);
  const mal = noBaja("copas de vino", curva);
  ok(!mal, `más horas de barra nunca piden menos copas de vino${mal ? ` → ${mal}` : ""}`);
  ok(copas(0, 0).vino.u > 0, "sin barra siguen haciendo falta copas: se come y se bebe igual");
  ok(copas(3, 5).cubata.u > copas(3, 0).cubata.u,
    "los vasos de cubata solo aparecen con barra de copas, no con el cóctel");
  ok(copas(3, 0).cubata.u === 0, "sin copas no se llevan vasos de cubata");
  ok(copas(2, 2).vino.u % BATEA.vino === 0,
    "las copas se piden por bateas completas, que es como se transportan");
  // Doble servicio dobla la cristalería de mesa
  const normal = copas(3, 5), doble = calcCristaleria(100, 3, 5, true, false, false);
  ok(doble.vino.u > normal.vino.u, "el doble servicio dobla las copas de mesa");
  // El brindis dobla las copas de cava (todo el mundo coge copa a la vez)
  const conBrindis = calcCristaleria(100, 3, 5, false, true, false);
  ok(conBrindis.cava.u > normal.cava.u, "y el brindis dobla las de cava");
  ok(normal.chupito === null && calcCristaleria(100, 3, 5, false, false, true).chupito !== null,
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

console.log("\n══ Casos límite: nada puede salir en negativo ni en NaN ══");
{
  const raros = [];
  for (const pax of [0, 1, 7, 1000]) {
    for (const h of [0, 0.5, 4, 24]) {
      const b = calcBebidas(pax, h, true, false);
      const c = calcCristaleria(pax, h / 2, h / 2, false, false, false);
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

console.log("\n──────────────────────────────────────────────────────────");
console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
if (fallos.length) { console.log("\n  Fallos:"); fallos.forEach(f => console.log(`   · ${f}`)); process.exit(1); }
console.log("  Todo correcto.");
