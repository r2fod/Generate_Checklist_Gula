// Prueba de la app entera en un navegador de verdad: los cinco tipos de evento, el
// responsive en nueve anchos y dos temas, Modo carga, las exportaciones y los casos
// límite. Es la red de seguridad antes de desplegar — si algo de aquí falla, no se
// sube. Sirve las páginas ya construidas (dist/), así que hay que construir antes.
//
//   npm run test
//
import { chromium } from "playwright-core";
import { spawn } from "child_process";
import { existsSync } from "fs";

const CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PUERTO = 4178;
const BASE = `http://localhost:${PUERTO}/index.html`;
// Las llamadas a la nube se cortan: la prueba va sobre lo que la app hace en local,
// que es lo que tiene que aguantar aunque no haya conexión. La sincronización tiene
// su propia prueba (sincronizacion.test.mjs).
const HOSTS_NUBE = ["**://*.googleapis.com/**", "**://*.firebaseio.com/**", "**://*.firebaseapp.com/**", "**://*.gstatic.com/**"];

const ANCHOS = [320, 360, 390, 412, 480, 768, 1024, 1280, 1920];
const TIPOS = ["boda", "comunion", "cumpleanos", "corporativo", "produccion"];

const EVENTO_COMPLETO = {
  evento: "boda", pax: 100, ninos: 20, nombreEvento: "Boda Anna y Mario",
  fechaEvento: "2027-08-11", horaInicio: "12:30", ubicacion: "Mas de león",
  barraCoctel: true, horasCoctel: 3, barraCopas: true, horasCopas: 4,
  logisticaEquipo: [{ nombre: "Raúl", inicio: "08:00", fin: "20:00" }, { nombre: "Ana", inicio: "08:00", fin: "20:00" }],
  tarifaLogistica: 12, plusFurgoneta: 30,
  recogidas: [{ concepto: "Apollo paella y jamonero", fecha: "2027-08-12" }],
  compras: [{ concepto: "Hielo", cantidad: "20 sacos" }],
};

let pasan = 0;
const fallos = [];
const errores = [];
const ok = (cond, msg) => {
  if (cond) { pasan++; console.log(`  ✅ ${msg}`); }
  else { fallos.push(msg); console.log(`  ❌ ${msg}`); }
};
const url = (estado) => BASE + "?c=" + encodeURIComponent(JSON.stringify(estado));

async function arrancarServidor() {
  if (!existsSync("dist/index.html")) {
    console.error('No hay dist/. Construye antes con "npm run build".');
    process.exit(1);
  }
  const srv = spawn("python3", ["-m", "http.server", String(PUERTO), "--directory", "dist"], { stdio: "ignore" });
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(BASE); if (r.ok) return srv; } catch (e) { /* aún levantando */ }
    await new Promise(r => setTimeout(r, 250));
  }
  srv.kill();
  throw new Error("el servidor de pruebas no arrancó");
}

async function nuevaPagina(ctx) {
  const page = await ctx.newPage();
  page.on("pageerror", e => errores.push(e.message));
  page.on("console", m => {
    if (m.type() !== "error") return;
    // Los fallos de red hacia la nube son esperados aquí: se cortan a propósito.
    if (/firestore|net::|Failed to load resource/i.test(m.text())) return;
    errores.push(m.text().slice(0, 140));
  });
  return page;
}

const desbordamiento = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function main() {
  const srv = await arrancarServidor();
  const navegador = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });

  // ── Responsive: ningún ancho ni tema puede desbordar en ninguna pantalla ────
  console.log("\n── Responsive: 9 anchos × 2 temas × 5 pantallas ──");
  for (const tema of ["claro", "oscuro"]) {
    const desbordan = [];
    for (const w of ANCHOS) {
      const ctx = await navegador.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 768, hasTouch: w < 768 });
      for (const h of HOSTS_NUBE) await ctx.route(h, r => r.abort());
      await ctx.addInitScript(t => localStorage.setItem("gula_tema", t), tema);
      const page = await nuevaPagina(ctx);
      await page.goto(url(EVENTO_COMPLETO), { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const mide = async (pantalla) => { const n = await desbordamiento(page); if (n > 0) desbordan.push(`${w}px ${pantalla} +${n}`); };
      await mide("config");
      await page.locator("button", { hasText: "Vista previa" }).first().click(); await page.waitForTimeout(800);
      await mide("vista previa");
      await page.locator(".preview-overlay").first().click({ position: { x: 3, y: 3 } }).catch(() => {});
      await page.waitForTimeout(500);
      await page.locator("button", { hasText: "Modo carga" }).first().click(); await page.waitForTimeout(950);
      for (const t of ["Salida", "Vuelta", "Resumen"]) {
        await page.locator(".carga-modo-toggle button").filter({ hasText: t }).first().click();
        await page.waitForTimeout(550);
        await mide("carga·" + t);
      }
      await ctx.close();
    }
    ok(desbordan.length === 0, `${tema}: sin desbordamiento en ${ANCHOS.length} anchos${desbordan.length ? ` → ${desbordan.join(", ")}` : ""}`);
  }

  // ── Las cifras del resumen caben en una fila en el móvil ────────────────────
  console.log("\n── Resumen del evento ──");
  for (const w of [320, 412]) {
    const ctx = await navegador.newContext({ viewport: { width: w, height: 900 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await ctx.route(h, r => r.abort());
    const page = await nuevaPagina(ctx);
    await page.goto(url({ evento: "boda", pax: 80 }), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const filas = await page.locator(".resumen-ficha").evaluateAll(fs => {
      const porY = {};
      fs.forEach(f => { const r = f.getBoundingClientRect(); (porY[Math.round(r.y)] ||= []).push(Math.round(r.width)); });
      return Object.values(porY);
    });
    ok(filas.length === 1 && new Set(filas[0]).size === 1,
      `${w}px: las 3 cifras en una fila y del mismo ancho ${JSON.stringify(filas)}`);
    await ctx.close();
  }

  // ── Cada tipo de evento genera una checklist coherente y usable ─────────────
  console.log("\n── Los cinco tipos de evento ──");
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  for (const h of HOSTS_NUBE) await ctx.route(h, r => r.abort());
  const page = await nuevaPagina(ctx);
  for (const tipo of TIPOS) {
    await page.goto(url({ evento: tipo, pax: 100, ninos: 10 }), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1900);
    const items = await page.locator(".item-row").count();
    const iconos = await page.locator(".item-icon").count();
    const invalidas = await page.locator(".item-qty-input").evaluateAll(is =>
      is.filter(i => /NaN|undefined|Infinity/.test(i.value) || parseFloat(i.value) < 0).length);
    const selectores = await page.locator(".equip-grid select").count();
    // Modo carga: el botón de marcar todo tiene que cubrir TODAS las filas
    await page.locator("button", { hasText: "Modo carga" }).first().click(); await page.waitForTimeout(1000);
    await page.locator(".carga-modo-toggle button").filter({ hasText: "Vuelta" }).first().click(); await page.waitForTimeout(650);
    const filas = await page.locator(".carga-row").count();
    await page.locator(".carga-todo-vuelto").click(); await page.waitForTimeout(1200);
    const marcados = await page.evaluate(() =>
      Object.keys(JSON.parse(localStorage.getItem("gula_checklist_estado") || "{}").vueltos || {}).length);
    await page.locator(".carga-modo-toggle button").filter({ hasText: "Resumen" }).first().click(); await page.waitForTimeout(800);
    const resumen = await page.locator(".resumen-tabla").first().innerText();
    ok(items > 20 && iconos === items && invalidas === 0 && selectores === 2 && marcados === filas && !/NaN/.test(resumen),
      `${tipo}: ${items} items · ${iconos} iconos · ${invalidas} inválidas · ${selectores} selectores · ${marcados}/${filas} vueltos · Resumen sin NaN`);
  }

  // ── Casos límite de pax ─────────────────────────────────────────────────────
  console.log("\n── Casos límite ──");
  for (const pax of [0, 1, 999]) {
    await page.goto(url({ evento: "boda", pax }), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1700);
    const malas = await page.locator(".item-qty-input").evaluateAll(is =>
      is.filter(i => /NaN|undefined|Infinity/.test(i.value) || parseFloat(i.value) < 0).length);
    ok(malas === 0, `pax=${pax}: ninguna cantidad inválida`);
  }

  // ── Exportaciones ───────────────────────────────────────────────────────────
  console.log("\n── Exportaciones ──");
  await page.goto(url(EVENTO_COMPLETO), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  for (const opcion of ["Word", "PDF", "WhatsApp", "Copiar texto", "Link para el móvil"]) {
    await page.locator("button", { hasText: "Compartir" }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    const antes = errores.length;
    const [descarga] = await Promise.all([
      page.waitForEvent("download", { timeout: 3500 }).catch(() => null),
      page.locator("button", { hasText: opcion }).first().click().catch(() => null),
    ]);
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape").catch(() => {});
    ok(errores.length === antes, `${opcion}: sin errores${descarga ? ` (${descarga.suggestedFilename()})` : ""}`);
  }
  // El Word tiene que llevar las recogidas y las compras, que antes se quedaban fuera
  await page.locator("button", { hasText: "Compartir" }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  const [doc] = await Promise.all([
    page.waitForEvent("download", { timeout: 6000 }).catch(() => null),
    page.locator("button", { hasText: "Word" }).first().click(),
  ]);
  if (doc) {
    const html = (await import("fs")).readFileSync(await doc.path(), "utf8");
    ok(html.includes("Recogidas y devoluciones") && html.includes("Compras") && html.includes("Apollo paella"),
      "el Word incluye Recogidas y Compras");
  } else ok(false, "el Word se descarga");

  // ── Editar un evento guardado no puede perder los demás ─────────────────────
  console.log("\n── Eventos guardados ──");
  const ctx2 = await navegador.newContext({ viewport: { width: 1440, height: 1100 } });
  for (const h of HOSTS_NUBE) await ctx2.route(h, r => r.abort());
  const guardados = { "Boda Anna y Mario": EVENTO_COMPLETO };
  for (let i = 0; i < 3; i++) guardados[`Próximo ${i}`] = { evento: "boda", pax: 80, fechaEvento: `2027-0${i + 1}-01` };
  for (let i = 0; i < 3; i++) guardados[`Pasado ${i}`] = { evento: "boda", pax: 80, fechaEvento: `2024-0${i + 1}-01` };
  await ctx2.addInitScript(e => {
    localStorage.setItem("gula_eventos_guardados", e);
    localStorage.setItem("gula_evento_activo", "Boda Anna y Mario");
  }, JSON.stringify(guardados));
  const page2 = await nuevaPagina(ctx2);
  await page2.goto(url(EVENTO_COMPLETO), { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(3000);
  const cuenta = () => page2.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("gula_eventos_guardados") || "{}")).length);
  ok(await cuenta() === 7, `arranca con los 7 eventos (${await cuenta()})`);
  await page2.locator("input[type=number]").first().fill("175");
  await page2.waitForTimeout(2500);
  ok(await cuenta() === 7, `editar el pax no pierde ninguno (${await cuenta()})`);
  await page2.locator("button", { hasText: "Modo carga" }).first().click(); await page2.waitForTimeout(1200);
  await page2.locator(".carga-row").nth(0).locator("input[type=checkbox], .carga-check, button").first().click();
  await page2.waitForTimeout(2500);
  ok(await cuenta() === 7, `marcar en Modo carga tampoco (${await cuenta()})`);
  const ev = await page2.evaluate(() => JSON.parse(localStorage.getItem("gula_eventos_guardados") || "{}")["Boda Anna y Mario"]);
  ok(ev && ev.pax === 175 && Object.keys(ev.checkeados || {}).length > 0,
    `y los cambios se guardan en su evento (pax=${ev?.pax}, ${Object.keys(ev?.checkeados || {}).length} checks)`);

  // ── Copia de seguridad: exportar e importar sin pisar nada ─────────────────
  console.log("\n── Copia de seguridad ──");
  const fs = await import("fs");
  const ctx3 = await navegador.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  for (const h of HOSTS_NUBE) await ctx3.route(h, r => r.abort());
  await ctx3.addInitScript(e => localStorage.setItem("gula_eventos_guardados", e), JSON.stringify({
    "Boda A": { evento: "boda", pax: 100, fechaEvento: "2027-05-01" },
    "Boda B": { evento: "boda", pax: 80, fechaEvento: "2027-06-01" },
    "Prod C": { evento: "produccion", pax: 20, fechaEvento: "2027-07-01" },
  }));
  const page3 = await nuevaPagina(ctx3);
  await page3.goto(url({ evento: "boda", pax: 80 }), { waitUntil: "domcontentloaded" });
  await page3.waitForTimeout(2400);
  const [copiaDl] = await Promise.all([
    page3.waitForEvent("download", { timeout: 8000 }),
    page3.locator("button", { hasText: "Copia de seguridad" }).click(),
  ]);
  const rutaCopia = await copiaDl.path();
  const copia = JSON.parse(fs.readFileSync(rutaCopia, "utf8"));
  ok(copia.formato === "gula-checklist-copia" && Object.keys(copia.eventos).length === 3 && copia.precios,
    `la copia lleva los 3 eventos y los precios (${Object.keys(copia.precios || {}).length} items)`);

  // Restaurar sobre un dispositivo que ya tiene datos NUNCA puede pisarlos
  const ctx4 = await navegador.newContext({ viewport: { width: 1440, height: 1100 } });
  for (const h of HOSTS_NUBE) await ctx4.route(h, r => r.abort());
  await ctx4.addInitScript(e => localStorage.setItem("gula_eventos_guardados", e), JSON.stringify({
    "Boda A": { evento: "boda", pax: 999, fechaEvento: "2027-05-01" },   // versión MÁS NUEVA
    "Solo aquí": { evento: "boda", pax: 50 },
  }));
  const page4 = await nuevaPagina(ctx4);
  await page4.goto(url({ evento: "boda", pax: 80 }), { waitUntil: "domcontentloaded" });
  await page4.waitForTimeout(2400);
  await page4.locator("input[type=file]").setInputFiles(rutaCopia);
  await page4.waitForTimeout(1200);
  await page4.locator(".dialogo-acciones button").last().click();
  await page4.waitForTimeout(1800);
  const tras = await page4.evaluate(() => JSON.parse(localStorage.getItem("gula_eventos_guardados") || "{}"));
  ok(tras["Boda A"].pax === 999 && tras["Solo aquí"] && Object.keys(tras).length === 4,
    `restaurar suma sin pisar: "Boda A" sigue con pax 999 y quedan ${Object.keys(tras).length} eventos`);

  // Un fichero que no es una copia se rechaza sin tocar nada
  fs.writeFileSync("/tmp/no-es-copia.json", '{"cosa":1}');
  await page4.locator("input[type=file]").setInputFiles("/tmp/no-es-copia.json");
  await page4.waitForTimeout(1200);
  const aviso = await page4.locator(".guardado-confirm").innerText().catch(() => "");
  const sigue = await page4.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("gula_eventos_guardados") || "{}")).length);
  ok(/no es una copia/.test(aviso) && sigue === 4, "un fichero que no es una copia se rechaza y no toca nada");

  await navegador.close();
  srv.kill();

  console.log(`\n${"─".repeat(58)}`);
  console.log(`  ${pasan} comprobaciones pasadas, ${fallos.length} fallidas`);
  console.log(`  errores de JS: ${errores.length ? [...new Set(errores)].join(" | ") : "ninguno"}`);
  if (fallos.length || errores.length) {
    console.log(`\n  FALLA: ${[...fallos, ...new Set(errores)].join("\n         ")}`);
    process.exit(1);
  }
  console.log("  Todo correcto.");
}

main().catch(e => { console.error(e); process.exit(1); });
