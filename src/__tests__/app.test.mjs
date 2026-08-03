// Prueba de la app entera en un navegador de verdad: los cinco tipos de evento, el
// responsive en nueve anchos y dos temas, Modo carga, las exportaciones y los casos
// límite. Es la red de seguridad antes de desplegar — si algo de aquí falla, no se
// sube. Sirve las páginas ya construidas (dist/), así que hay que construir antes.
//
//   npm run test
//
import { chromium } from "playwright-core";
import { aRespuestasDeLaApp } from "../formulario/preguntas.js";
import { recogidasConAlquileres } from "../alquileres.js";
import { spawn } from "child_process";
import { existsSync } from "fs";

const CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PUERTO = 4178;
const BASE = `http://localhost:${PUERTO}/index.html`;
// El formulario es otra app, en su propia carpeta: por eso se instala aparte de la
// checklist en vez de abrirse dentro de ella (ver formulario/index.html).
const RAIZ = `http://localhost:${PUERTO}/`;
const BASE_FORM = `http://localhost:${PUERTO}/formulario/index.html`;
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
  // Si el puerto ya responde, hay otra prueba corriendo: se para aquí en vez de usar
  // su servidor, que se lleva por delante esta ejecución en cuanto la otra termina.
  try {
    await fetch(BASE);
    console.error(`El puerto ${PUERTO} ya está ocupado por otra ejecución. Espera a que termine.`);
    process.exit(1);
  } catch (e) { /* libre, seguimos */ }
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
  servidorGlobal = srv;
  const navegador = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  navegadorGlobal = navegador;

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
      // La vista de la hoja está ahora dentro de Compartir, no en la cabecera
      await page.locator(".compartir-menu-wrap > .btn").first().click(); await page.waitForTimeout(400);
      await page.locator(".compartir-menu button", { hasText: "Ver la hoja" }).first().click(); await page.waitForTimeout(800);
      await mide("vista previa");
      // Se cierra con su ✕: en móvil el panel ocupa la pantalla entera, así que ya no
      // hay "fuera" donde tocar para cerrarlo (ese hueco era justo el que sobraba).
      await page.locator(".preview-close-btn").first().click().catch(() => {});
      await page.waitForTimeout(500);
      await page.locator("button", { hasText: "Modo carga" }).first().click(); await page.waitForTimeout(950);
      for (const t of ["Prep.", "Salida", "Vuelta", "Resumen"]) {
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

  // ── Todo el texto se tiene que poder leer, en los dos temas ─────────────────
  // Un color fijo en el CSS se lee bien en claro y desaparece en oscuro (o al revés).
  // Se mide el contraste real de cada texto contra su fondo con la fórmula WCAG y se
  // exige el mínimo AA: 4,5 normal y 3 para texto grande o en negrita.
  console.log("\n── Contraste en los dos temas ──");
  const SONDA_CONTRASTE = `window.__contraste = () => {
    const lum = (c) => { const [r,g,b] = c.map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; };
    const parse = (s) => { const m=(s||"").match(/[\\d.]+/g); return m ? m.slice(0,3).map(Number) : null; };
    const alpha = (s) => { const m=(s||"").match(/[\\d.]+/g); return m && m.length>3 ? Number(m[3]) : 1; };
    const fondoDe = (el) => { let n=el; while(n && n!==document.documentElement){ const bg=getComputedStyle(n).backgroundColor; if(alpha(bg)>0.85) return parse(bg); n=n.parentElement; } return [255,255,255]; };
    const malos = [];
    document.querySelectorAll("span,label,button,strong,p,h1,h2,h3,td,th,a,div,em").forEach(e => {
      if (e.children.length || !e.offsetParent) return;
      const t = (e.textContent||"").trim(); if (!t) return;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || Number(cs.opacity) < 0.5) return;
      const fg = parse(cs.color), bg = fondoDe(e); if (!fg||!bg) return;
      const l1=lum(fg), l2=lum(bg); const r=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
      const px=parseFloat(cs.fontSize), grande = px>=24 || (px>=18.66 && Number(cs.fontWeight)>=700);
      const min = grande?3:4.5;
      if (r < min) malos.push("«"+t.slice(0,24)+"» "+r.toFixed(2)+"/"+min);
    });
    return [...new Set(malos)];
  };`;
  for (const tema of ["claro", "oscuro"]) {
    const c = await navegador.newContext({ viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    await c.addInitScript(t => localStorage.setItem("gula_tema", t), tema);
    await c.addInitScript(SONDA_CONTRASTE);
    const p = await nuevaPagina(c);
    await p.goto(url({
      evento: "produccion", pax: 25, nombreEvento: "Produ kitten", fechaEvento: "2027-07-29",
      notasEvento: "Coger comida del congelador\nHielo",
      logisticaEquipo: [{ nombre: "Irene", inicio: "10:00", fin: "17:10" }],
      recogidas: [{ concepto: "Recoger generador", fecha: "2027-07-28", fechaDevolucion: "2027-07-30" }],
      compras: [{ concepto: "Aguas", cantidad: "5 cajas", fecha: "2027-07-28" }],
    }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    const malos = await p.evaluate(() => window.__contraste());
    await p.locator("button", { hasText: "Modo carga" }).first().click();
    await p.waitForTimeout(1100);
    const malosCarga = await p.evaluate(() => window.__contraste());
    const todos = [...new Set([...malos, ...malosCarga])];
    ok(todos.length === 0, `${tema}: todo el texto llega al mínimo legible${todos.length ? ` → ${todos.slice(0, 4).join(", ")}${todos.length > 4 ? ` +${todos.length - 4}` : ""}` : ""}`);
    await c.close();
  }

  // ── Todos los selectores de Equipamiento tienen que hacer algo ──────────────
  // El selector de horno en producción estaba puesto pero el item iba fijo a "Horno
  // pequeño": elegir Grande no cambiaba nada. Se prueba cada opción de cada control
  // en los cinco tipos de evento y se exige que la checklist cambie.
  console.log("\n── Los selectores cambian la checklist ──");
  const listaItems = (p) => p.locator(".item-row").evaluateAll(rs => rs.map(r => {
    const n = r.querySelector(".item-name, .item-label");
    const q = r.querySelector(".item-qty-input");
    // El sufijo cuenta: hay cambios que SOLO se ven ahí (el envase de las aguas de
    // un rodaje, el "de 8 en almacén" de las carpas). Sin él, la prueba daba por
    // mudo un control que sí cambiaba lo que se carga.
    const suf = r.querySelector(".item-batea-info");
    return `${(n ? n.textContent : "").trim()}=${q ? q.value : ""}${suf ? "|" + suf.textContent.trim() : ""}`;
  }));
  const escapa = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const tipo of TIPOS) {
    await page.goto(url({ evento: tipo, pax: 100, ninos: 10 }), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1900);
    const grupos = await page.locator(".segment-group").evaluateAll(gs => gs.map(g => ({
      label: (g.querySelector(".segment-label") || {}).textContent || "",
      opciones: [...g.querySelectorAll(".segment-btn")].map(b => b.textContent.trim()),
      activo: ((g.querySelector(".segment-btn.active") || {}).textContent || "").trim(),
    })));
    const mudos = [];
    for (const g of grupos) {
      // "Temporada" no entra aquí: en Auto la app ya resuelve a verano o invierno, así
      // que una de las tres opciones siempre coincide con lo que hay puesto. Además su
      // etiqueta cambia al elegir ("Temporada · ahora verano" → "Temporada"). Tiene su
      // propia comprobación, más completa, en la sección de temporada.
      if (/^Temporada/.test(g.label)) continue;
      const boton = (txt) => page.locator(".segment-group", { hasText: g.label }).first()
        .locator(".segment-btn", { hasText: new RegExp(`^${escapa(txt)}$`) }).first();
      for (const op of g.opciones) {
        if (op === g.activo) continue;
        const antes = await listaItems(page);
        await boton(op).click();
        await page.waitForTimeout(420);
        if (JSON.stringify(antes) === JSON.stringify(await listaItems(page))) mudos.push(`${g.label} → ${op}`);
        await boton(g.activo).click();
        await page.waitForTimeout(380);
      }
    }
    ok(mudos.length === 0, `${tipo}: los ${grupos.length} controles cambian la checklist${mudos.length ? ` → sin efecto: ${mudos.join(", ")}` : ""}`);
  }

  // Los campos NUMÉRICOS de la configuración no entran en el barrido de arriba, que solo
  // recorre los selectores. Y son justo los que dicen CUÁNTO se carga: si uno se queda
  // desconectado del cálculo, la pantalla enseña el número que has puesto y el camión
  // sale con otro, que es la peor forma de fallar. Ya pasó con el color de manteles.
  console.log("\n── Los números de la configuración ──");
  {
    await page.goto(url({ evento: "boda", pax: 100, ninos: 10, llevaPaella: true, tieneFrituras: true }),
      { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1900);
    const campo = (etiqueta) => page.locator(".controls-mini", { hasText: etiqueta }).first().locator('input[type="number"]');
    const cantidadDe = async (trozo) => (await listaItems(page)).find(i => i.includes(trozo)) || "";

    // Con 100 personas salen 4 paelleras (una cada 30). Poner 2 tiene que dejarlas en 2.
    ok(/=4/.test(await cantidadDe("Paella ")), `de partida salen 4 paellas por la gente → "${await cantidadDe("Paella ")}"`);
    await campo("Nº de paellas").fill("2");
    await page.waitForTimeout(500);
    ok(/=2/.test(await cantidadDe("Paella ")), `y poner 2 a mano manda sobre la cuenta → "${await cantidadDe("Paella ")}"`);
    ok(/=2/.test(await cantidadDe("Paletas de paella")), "y las paletas van con ellas, una por paella");

    // Y volver a dejarlo en blanco tiene que devolver la cuenta de siempre
    await campo("Nº de paellas").fill("");
    await page.waitForTimeout(500);
    ok(/=4/.test(await cantidadDe("Paella ")), "y dejarlo en blanco vuelve a las que salen por la gente");

    const antesFrituras = await listaItems(page);
    await campo("Nº sartenes parisiene").fill("3");
    await page.waitForTimeout(500);
    ok(JSON.stringify(antesFrituras) !== JSON.stringify(await listaItems(page)),
      "y el nº de sartenes parisiene también mueve la carga");

    // Cada plancha de gas lleva SU bombona. Antes la plancha era un sí/no y sumaba una
    // sola: poniendo una segunda a mano el gas no subía y se salía con una de menos.
    await page.goto(url({ evento: "produccion", pax: 40, diasProduccion: ["40"], llevaPaella: false, tieneFrituras: false }),
      { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1900);
    const bombonas = async () => {
      const f = (await listaItems(page)).find(i => i.startsWith("Bombonas llenas=")) || "";
      return parseInt(f.split("=")[1], 10);
    };
    const planchas = async () => {
      const f = (await listaItems(page)).find(i => i.startsWith("Plancha de gas=")) || "";
      return parseInt(f.split("=")[1], 10);
    };
    const bombonasAntes = await bombonas();
    ok(await planchas() === 1, `de partida va una plancha (${await planchas()})`);
    await campo("Nº planchas de gas").fill("3");
    await page.waitForTimeout(600);
    ok(await planchas() === 3, `poner 3 planchas se ve en la carga (${await planchas()})`);
    ok(await bombonas() === bombonasAntes + 2,
      `y las bombonas suben solas con ellas (${bombonasAntes} → ${await bombonas()})`);

    // Los otros dos números que había sin red. El de barriles es el que destapó que en
    // el formulario el número no llegaba a la app: aquí se comprueba el lado de la app.
    await page.goto(url({ evento: "boda", pax: 100, ninos: 10, tamanoBarril: "30L", llevaChillOut: true }),
      { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1900);
    for (const [etiqueta, valor, trozo] of [["Nº barriles", "3", "Barril de cerveza"], ["Nº chill out", "4", null]]) {
      const c = campo(etiqueta);
      if (!await c.count()) { ok(false, `no se encuentra el campo "${etiqueta}"`); continue; }
      const antes = await listaItems(page);
      await c.fill(valor);
      await page.waitForTimeout(500);
      const despues = await listaItems(page);
      ok(JSON.stringify(antes) !== JSON.stringify(despues), `"${etiqueta}" cambia la checklist`);
      if (trozo) {
        const fila = despues.find(i => i.includes(trozo)) || "";
        ok(new RegExp(`=${valor}`).test(fila), `y con el número puesto → "${fila}"`);
      }
    }
  }

  // ── Cantidades que iban fijas y no debían ───────────────────────────────────
  // Números que estaban puestos a ojo y salían mal en la punta pequeña: en un rodaje
  // de 40 personas se cargaban 4 champaneras (el doble de las que se usan) y, en
  // cambio, solo 2 bandejas metálicas (la mitad de las que se acaban usando).
  console.log("\n── Cantidades que iban fijas ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1400, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const cantidad = async (nombre) => {
      const f = (await listaItems(p)).find(i => i.startsWith(nombre + "=")) || "";
      return f ? parseInt(f.split("=")[1], 10) : null;
    };
    const abrir = async (estado) => {
      await p.goto(url(estado), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
    };

    await abrir({ evento: "produccion", pax: 40, diasProduccion: ["40"] });
    ok(await cantidad("Champanera metálica grande") === 2,
      `40 personas → 2 champaneras, no 4 (${await cantidad("Champanera metálica grande")})`);
    ok(await cantidad("Bandejas metálicas") === 10 && await cantidad("Bandejas metálicas brillantes") === 8,
      `las bandejas metálicas van las del almacén (${await cantidad("Bandejas metálicas")} y ${await cantidad("Bandejas metálicas brillantes")})`);
    // Y ya que se mira un rodaje: las dos líneas que sobraban tienen que haberse ido
    const items = await listaItems(p);
    ok(!items.some(i => /^Mesa larga=/.test(i)),
      "la mesa larga ya no está: las largas son las de 1,8m");
    ok(!items.some(i => /^Butano=/.test(i)) && items.some(i => /^Bombonas llenas=/.test(i)),
      "y el butano tampoco, que era la misma bombona contada dos veces");

    // Y en los eventos grandes, más: antes iban 4 aunque fueran 200 personas, así que
    // esto no es solo quitar. Los números son los que ha dado quien carga el camión.
    for (const [gente, cuantas] of [[100, 3], [150, 4], [200, 5]]) {
      await abrir({ evento: "boda", pax: gente, ninos: 0 });
      ok(await cantidad("Champanera metálica grande") === cuantas,
        `una boda de ${gente} lleva ${cuantas} (${await cantidad("Champanera metálica grande")})`);
    }
    await c.close();
  }

  // ── Los nombres de los items tienen que ser estables y limpios ──────────────
  // La identidad de cada item ES su nombre: los checks de Modo carga, las cantidades
  // editadas a mano y los nombres corregidos se guardan como "categoría::nombre". Si el
  // nombre lleva dentro algo que cambia (el pax, un ratio), al mover el pax la app lo
  // toma por otro item y se pierde todo eso sin avisar. Pasaba con "Cápsulas café ...
  // para 110 pax" y con "Platos extra entrante (1 × cada 4 pax)".
  // Y la unidad ("bolsa", "taxis") va SIEMPRE en el sufijo, nunca dentro de la cantidad,
  // que es un campo editable.
  console.log("\n── Nombres de los items ──");
  {
    const EXTRAS = { llevaPaella: true, tieneFrituras: true, hayDesayuno: true, entranteCompartido: true, barraCoctel: true, horasCoctel: 3, barraCopas: true, horasCopas: 4 };
    const leer = async (p, tipo, pax) => {
      await p.goto(url({ evento: tipo, pax, ninos: 0, ...EXTRAS }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1900);
      return p.evaluate(() => {
        const filas = [];
        document.querySelectorAll(".category-section").forEach(sec => {
          const cat = ((sec.querySelector(".category-header") || {}).textContent || "").split("\n")[0].trim();
          sec.querySelectorAll(".item-row").forEach(r => {
            const n = ((r.querySelector(".item-name") || {}).textContent || "").replace(/\s*ALQUILER\s*/, "").trim();
            const q = r.querySelector(".item-qty-input");
            filas.push({ cat, n, q: q ? q.value : "" });
          });
        });
        return filas;
      });
    };
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const inestables = [], conUnidad = [], repetidos = [];
    for (const tipo of TIPOS) {
      const a = await leer(p, tipo, 100), b = await leer(p, tipo, 160);
      const na = a.map(x => x.n), nb = b.map(x => x.n);
      na.filter(x => !nb.includes(x)).forEach(x => inestables.push(`${tipo}: «${x}»`));
      nb.filter(x => !na.includes(x)).forEach(x => inestables.push(`${tipo}: «${x}»`));
      a.forEach(x => { if (/\d\s*[a-záéíóúñ]/i.test(x.q)) conUnidad.push(`${tipo}: «${x.n}» = "${x.q}"`); });
      const vistos = new Set();
      a.forEach(x => { const k = `${x.cat}::${x.n}`; if (vistos.has(k)) repetidos.push(`${tipo}: «${x.n}»`); vistos.add(k); });
    }
    ok(inestables.length === 0, `ningún nombre de item cambia al cambiar el pax${inestables.length ? ` → ${[...new Set(inestables)].slice(0, 4).join(", ")}` : ""}`);
    ok(conUnidad.length === 0, `ninguna cantidad lleva la unidad dentro${conUnidad.length ? ` → ${conUnidad.slice(0, 4).join(", ")}` : ""}`);
    ok(repetidos.length === 0, `ningún nombre repetido dentro de la misma categoría${repetidos.length ? ` → ${repetidos.slice(0, 4).join(", ")}` : ""}`);
    await c.close();
  }

  // ── Recalcular cantidades ───────────────────────────────────────────────────
  console.log("\n── Recalcular cantidades ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1600, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 100, ninos: 0, nombreEvento: "Boda R" }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2300);
    const filaDe = (n) => p.locator(".item-row", { hasText: n }).first().locator(".item-qty-input");
    const recalcular = async () => {
      await p.locator("button", { hasText: "Recalcular cantidades" }).click();
      await p.waitForTimeout(750);
      if (!await p.locator(".recalcular-modal").count()) return { modal: false };
      return { modal: true, filas: await p.locator(".recalcular-row").evaluateAll(rs => rs.map(r => r.innerText.replace(/\n+/g, " ¦ "))) };
    };
    // Se guarda para que exista la foto de cantidades contra la que comparar
    await p.locator("button", { hasText: "Guardar evento" }).first().click();
    await p.waitForTimeout(600);
    await p.locator(".dialogo-modal input").fill("Boda R");
    await p.locator(".dialogo-acciones button").last().click();
    await p.waitForTimeout(1400);
    ok((await recalcular()).modal === false, "recién guardado: no pregunta nada");

    // Una cantidad a mano que se queda desfasada al cambiar el pax SÍ se ofrece:
    // es justo la única que no se actualiza sola.
    const auto100 = await filaDe("Servilletas cocktail").inputValue();
    await filaDe("Servilletas cocktail").fill("999");
    await p.waitForTimeout(600);
    await p.locator("input[type=number]").first().fill("400");
    await p.waitForTimeout(1500);
    const auto400 = await p.locator(".item-row", { hasText: "Manteles" }).first().locator(".item-qty-input").inputValue();
    const r1 = await recalcular();
    const suya = (r1.filas || []).filter(f => /Servilletas cocktail/.test(f));
    ok(r1.modal && suya.length === 1 && /a mano/i.test(suya[0]),
      `la cantidad puesta a mano aparece marcada "a mano" → ${JSON.stringify(suya)}`);
    ok(auto100 !== auto400 && r1.filas.length > 1, `y también las automáticas que han cambiado (${(r1.filas || []).length} en total)`);

    // "Usar" el nuevo tiene que QUITAR la edición manual, si no la cantidad se queda clavada
    await p.locator(".recalcular-row", { hasText: "Servilletas cocktail" }).locator("button", { hasText: "Usar" }).click();
    await p.locator(".dialogo-acciones button").last().click();
    await p.waitForTimeout(1200);
    const tras = await filaDe("Servilletas cocktail").inputValue();
    ok(tras !== "999" && tras !== auto100, `al elegir "Usar" la cantidad pasa al cálculo nuevo (${auto100} → ${tras})`);
    ok((await recalcular()).modal === false, "y lo ya decidido no se vuelve a preguntar");
    await c.close();
  }

  // ── Ningún campo puede quedar recortado ─────────────────────────────────────
  // Que la página no desborde no basta: a un campo al que no se le da el ancho que
  // necesita el navegador le RECORTA el valor por dentro, sin desbordar nada. Pasaba
  // con las fechas ("28/" en vez de "28/07/2026"), con las horas ("10:0(") y también
  // con el nombre del evento y la ubicación, que se quedaban en 145px en la barra
  // lateral. Se miden TODOS los campos: los de fecha y hora contra un clon suyo
  // dejado crecer, y el resto midiendo el ancho real del texto del valor.
  console.log("\n── Nada se corta ──");
  const CON_FECHAS = {
    evento: "produccion", pax: 25, nombreEvento: "Produ kitten", fechaEvento: "2027-07-29",
    horaInicio: "07:00", ubicacion: "Solo Houses",
    logisticaEquipo: [{ nombre: "Irene", inicio: "10:00", fin: "17:10" }, { nombre: "Raúl", inicio: "10:00", fin: "17:10" }],
    tarifaLogistica: 10, plusFurgoneta: 25,
    recogidas: [{ concepto: "Recoger generador", fecha: "2027-07-28", hora: "12:00", fechaDevolucion: "2027-07-30" }],
    compras: [{ concepto: "Aguas Makro", cantidad: "5 cajas", fecha: "2027-07-28" }],
  };
  for (const w of [320, 412, 768, 1280, 1920]) {
    const c = await navegador.newContext({ viewport: { width: w, height: 1100 }, isMobile: w < 768, hasTouch: w < 768 });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url(CON_FECHAS), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    const cortados = await p.evaluate(() => {
      const ctx2d = document.createElement("canvas").getContext("2d");
      const malos = [];
      const etiqueta = (e) => {
        const g = e.closest(".form-group, .logistica-row, .item-row, .recogida-card, .controls-mini");
        const l = g && g.querySelector(".form-label, .segment-label");
        return String(e.title || (l && l.textContent.trim()) || e.className || e.type).slice(0, 30);
      };
      document.querySelectorAll("input, select").forEach(e => {
        if (!e.offsetParent) return;
        const cs = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        if (r.width < 2) return;
        if (e.type === "date" || e.type === "time") {
          // El valor lo pinta el navegador con su icono: se compara con un clon libre
          const probe = e.cloneNode();
          probe.style.cssText = "position:absolute;visibility:hidden;width:auto;min-width:0;max-width:none;flex:none";
          e.parentNode.appendChild(probe);
          const nat = Math.ceil(probe.getBoundingClientRect().width);
          probe.remove();
          if (r.width < nat - 1) malos.push(`${etiqueta(e)}: ${Math.round(r.width)}px de ${nat}`);
          return;
        }
        // Texto, número y select: se mide el ancho real del valor con la misma fuente
        const texto = e.value || "";
        if (!texto) return;
        const hueco = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
          - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth)
          - (e.tagName === "SELECT" ? 18 : 0); // el select reserva sitio para la flecha
        ctx2d.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const ancho = ctx2d.measureText(texto).width;
        if (ancho > hueco + 0.5) malos.push(`${etiqueta(e)} "${texto.slice(0, 20)}": ${Math.round(hueco)}px de ${Math.ceil(ancho)}`);
      });
      return malos;
    });
    ok(cortados.length === 0, `${w}px: ningún campo recortado${cortados.length ? ` → ${cortados.join(", ")}` : ""}`);
    // Se mide el CONTROL entero de cada uno, no solo su recuadro de texto: la ubicación
    // lleva al lado el botón de "Cómo llegar", y el hueco que ocupa ese botón no es
    // sitio perdido. Lo que no puede pasar es que entre los dos no llenen la fila, que
    // era el fallo original (el nombre del evento en 145px en la barra lateral). Que el
    // texto quepa de verdad lo garantiza la comprobación de arriba, "ningún campo
    // recortado", que mide el ancho real de lo escrito.
    const anchos = await p.evaluate(() => {
      const fila = document.querySelector(".form-row");
      const ancho = fila ? fila.getBoundingClientRect().width : 0;
      return [...document.querySelectorAll(".form-group-ancho input")].map(i => {
        const control = i.closest(".ubicacion-row") || i;
        return {
          et: (i.closest(".form-group").querySelector(".form-label") || {}).textContent,
          parte: ancho ? +(control.getBoundingClientRect().width / ancho).toFixed(2) : 0,
          // Y el campo de escribir, por su cuenta, no puede quedarse en una rendija
          suyo: ancho ? +(i.getBoundingClientRect().width / ancho).toFixed(2) : 0,
        };
      });
    });
    const estrechos = anchos.filter(a => a.parte < 0.9 || a.suyo < 0.5);
    ok(anchos.length === 2 && estrechos.length === 0,
      `${w}px: el nombre y la ubicación ocupan la fila entera${estrechos.length ? ` → ${estrechos.map(e => `${e.et} ${e.parte} (campo ${e.suyo})`).join(", ")}` : ""}`);
    await c.close();
  }

  // ── Tema automático por horario ──────────────────────────────────────────────
  // El botón tiene tres posiciones: automático (oscuro de 20:00 a 7:00), siempre claro y
  // siempre oscuro. Se falsea el reloj del navegador para comprobar cada tramo.
  console.log("\n── Tema automático ──");
  {
    const abrirAlas = async (hora, pref) => {
      const c = await navegador.newContext({ viewport: { width: 1400, height: 900 } });
      for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
      await c.addInitScript(([h, pr]) => {
        if (pr) localStorage.setItem("gula_tema", pr); else localStorage.removeItem("gula_tema");
        const Real = Date;
        const fijo = new Real(2027, 6, 15, h, 30, 0).getTime();
        Date = class extends Real {
          constructor(...a) { return a.length ? new Real(...a) : new Real(fijo); }
          static now() { return fijo; }
        };
      }, [hora, pref]);
      const p = await nuevaPagina(c);
      await p.goto(url({ evento: "produccion", pax: 25 }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2000);
      const r = await p.evaluate(() => document.documentElement.dataset.tema);
      await c.close();
      return r;
    };
    const tramos = [[6, "oscuro"], [8, "claro"], [14, "claro"], [19, "claro"], [20, "oscuro"], [23, "oscuro"]];
    const fallos = [];
    for (const [h, esperado] of tramos) {
      const t = await abrirAlas(h, null);
      if (t !== esperado) fallos.push(`${h}:30 → ${t} (esperado ${esperado})`);
    }
    ok(fallos.length === 0, `en automático el tema va por hora${fallos.length ? ` → ${fallos.join(", ")}` : " (oscuro de 20:00 a 7:00)"}`);
    const deNoche = await abrirAlas(23, "claro"), deDia = await abrirAlas(8, "oscuro");
    ok(deNoche === "claro" && deDia === "oscuro", `fijado a mano manda sobre la hora (23h→${deNoche}, 8h→${deDia})`);

    // El botón cicla y recuerda lo elegido
    const c = await navegador.newContext({ viewport: { width: 1400, height: 900 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "produccion", pax: 25 }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2100);
    const ciclo = [];
    for (let i = 0; i < 4; i++) {
      ciclo.push(await p.evaluate(() => localStorage.getItem("gula_tema")));
      await p.locator(".btn-tema").click();
      await p.waitForTimeout(600);
    }
    ok(JSON.stringify(ciclo) === JSON.stringify(["auto", "claro", "oscuro", "auto"]),
      `el botón cicla automático → claro → oscuro (${ciclo.join(" → ")})`);
    await c.close();
  }

  // ── Sin cobertura la app tiene que abrir ────────────────────────────────────
  // El caso real: el equipo llega a un mas sin cobertura y abre la app. Antes salía la
  // pantalla de "sin conexión" del navegador: los eventos estaban guardados en el móvil
  // pero no se podía llegar a ellos. El service worker (public/sw.js) guarda la app.
  console.log("\n── Sin cobertura ──");
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "produccion", pax: 25 }), { waitUntil: "load" });
    await p.waitForTimeout(3000);
    const activo = await p.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return !!(r && r.active);
    });
    ok(activo, "el service worker queda instalado en la primera visita");
    await c.setOffline(true);
    await p.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await p.waitForTimeout(3000);
    const items = await p.locator(".item-row").count().catch(() => 0);
    ok(items > 20, `sin conexión la app abre con la checklist (${items} items)`);
    if (items > 20) {
      await p.locator("button", { hasText: "Modo carga" }).first().click();
      await p.waitForTimeout(1300);
      await p.locator(".carga-row").first().locator("input[type=checkbox]").first().check({ force: true });
      await p.waitForTimeout(900);
      const marcados = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("gula_checklist_estado") || "{}").checkeados || {}).length);
      ok(marcados > 0, "y sin conexión se puede seguir cargando y se guarda");
    } else ok(false, "y sin conexión se puede seguir cargando y se guarda");
    await c.setOffline(false);
    await c.close();
  }

  // ── Lo que se queda fijo al hacer scroll ────────────────────────────────────
  // Con 150 items en la lista, subir hasta arriba del todo para buscar algo o para
  // cambiar de Salida a Vuelta es media docena de gestos cada vez.
  console.log("\n── Barras fijas ──");
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 120, ninos: 10, nombreEvento: "Boda Anna y Mario" }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    const visible = async () => (await p.locator(".barra-fija").evaluate(e => getComputedStyle(e).opacity)) === "1";
    ok(!await visible(), "arriba del todo la barra fina no estorba");
    // Bajar de verdad: si la lista todavía no ha terminado de pintarse, el documento
    // aún no llega a 900px, el scroll no mueve nada y la barra no tiene por qué salir.
    // Esperar a que haya sitio para bajar, y luego a que termine el fundido, en vez de
    // dar por hecho un tiempo fijo: eso hacía fallar la prueba de vez en cuando.
    await p.waitForFunction(() => document.documentElement.scrollHeight > window.innerHeight + 900,
      null, { timeout: 15000 });
    await p.evaluate(() => window.scrollTo(0, 900));
    for (let i = 0; i < 20 && !await visible(); i++) await p.waitForTimeout(150);
    ok(await visible(), "al bajar aparece la barra fina");
    const caja = await p.locator(".barra-fija").boundingBox();
    ok(caja && caja.y >= 0 && caja.y < 20, `y se queda pegada arriba (y=${caja ? Math.round(caja.y) : "?"})`);
    // El buscador de la barra fina filtra igual que el de la lista
    await p.locator(".barra-fija-buscar").fill("mantel");
    await p.waitForTimeout(700);
    const nombres = await p.locator(".item-row .item-name").allInnerTexts();
    ok(nombres.length > 0 && nombres.every(n => /mantel/i.test(n)), `y su buscador filtra la lista (${nombres.length} items)`);
    await p.locator(".barra-fija-buscar").fill("");
    await p.waitForTimeout(500);

    // Dentro de Modo carga, el cambio Salida/Vuelta y el recuento no pueden irse
    await p.locator(".barra-fija-carga").click();
    await p.waitForTimeout(1400);
    await p.evaluate(() => { document.querySelector(".carga-modal").scrollTop = 1500; });
    await p.waitForTimeout(600);
    const t = await p.locator(".carga-modo-toggle").boundingBox();
    ok(t && t.y < 120, `en Modo carga el toggle sigue arriba tras bajar (y=${t ? Math.round(t.y) : "?"})`);
    const cuenta = await p.locator(".carga-toggle-cuenta").innerText();
    ok(/^\d+\/\d+$/.test(cuenta.trim()), `y con él el recuento a la vista (${cuenta.trim()})`);
    await c.close();
  }

  // ── Auto-guardado desde el primer momento ───────────────────────────────────
  // Antes, un evento nuevo vivía SOLO en ese navegador hasta que le dabas a "Guardar
  // evento": si se rompía el móvil o cambiabas de aparato, se perdía el trabajo. Ahora
  // se guarda solo en cuanto tiene nombre — sin pisar nunca un evento que ya existe y
  // sin dejar un evento por cada trozo del nombre mientras se escribe.
  console.log("\n── Auto-guardado ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const guardados = () => p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("gula_eventos_guardados") || "{}")));
    const campoNombre = () => p.locator(".form-group", { hasText: "NOMBRE DEL EVENTO" }).locator("input");

    await p.goto(url({ evento: "boda", pax: 90 }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2100);
    ok((await guardados()).length === 0, "un evento sin nombre no se guarda solo");

    // Se escribe el nombre a trozos, como se escribe de verdad
    await campoNombre().fill("Boda Ana");
    await p.waitForTimeout(3600);
    await campoNombre().fill("Boda Ana y Luis");
    await p.waitForTimeout(3600);
    const tras = await guardados();
    ok(tras.length === 1 && tras[0] === "Boda Ana y Luis",
      `escribir el nombre a trozos deja UN evento con el nombre final → ${JSON.stringify(tras)}`);

    // Y sigue guardándose solo con cada cambio
    await p.locator("input[type=number]").first().fill("150");
    await p.waitForTimeout(2000);
    const pax = await p.evaluate(() => JSON.parse(localStorage.getItem("gula_eventos_guardados"))["Boda Ana y Luis"].pax);
    ok(pax === 150, `y los cambios posteriores se guardan solos (pax=${pax})`);
    await c.close();
  }

  // ── Un borrador no puede pisar un evento guardado ───────────────────────────
  console.log("\n── Nombres repetidos ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    // Ya hay un evento guardado "Boda Ana y Luis" de 200 pax, y NO es el activo
    await c.addInitScript(() => {
      localStorage.setItem("gula_eventos_guardados", JSON.stringify({
        "Boda Ana y Luis": { evento: "boda", pax: 200, nombreEvento: "Boda Ana y Luis" },
      }));
      localStorage.removeItem("gula_evento_activo");
    });
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 30 }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2100);
    await p.locator(".form-group", { hasText: "NOMBRE DEL EVENTO" }).locator("input").fill("Boda Ana y Luis");
    await p.waitForTimeout(4000);
    const pax = await p.evaluate(() => JSON.parse(localStorage.getItem("gula_eventos_guardados"))["Boda Ana y Luis"].pax);
    ok(pax === 200, `un borrador con el mismo nombre NO pisa el evento guardado (sigue con ${pax} pax)`);
    ok(await p.locator(".aviso-nombre-ocupado").count() === 1,
      "y se avisa de que ese nombre ya está cogido");
    await c.close();
  }

  // ── El formulario de oficina ────────────────────────────────────────────────
  // Se abre con ?enviar=<código> y NO da acceso a nada más: ni checklist, ni
  // configuración, ni eventos. Esa es la garantía que sostiene todo lo demás.
  console.log("\n── El formulario de oficina ──");
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(BASE_FORM + "?enviar=PRUEBA1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2400);

    ok(await p.locator(".app-header").count() === 0 && await p.locator(".item-row").count() === 0
      && await p.locator(".config-card").count() === 0,
      "con el link del formulario no se llega a la app ni a la checklist");
    ok(/De qué evento son los datos/i.test(await p.locator(".form-titulo").innerText()),
      "empieza preguntando a qué evento van los datos");

    // Ningún botón puede estirarse a lo alto para llenar la pantalla: el principal
    // lleva flex para repartir el ANCHO en la fila de acciones, y como hijo directo de
    // la pantalla (que es una columna) eso lo convertía en un botonazo de 1200px
    const altos = await p.locator(".form-btn-principal, .form-opcion, .form-evento")
      .evaluateAll(bs => bs.map(b => ({ t: b.innerText.trim().slice(0, 22), h: Math.round(b.getBoundingClientRect().height) })));
    const estirados = altos.filter(b => b.h > 110);
    ok(estirados.length === 0,
      `ningún botón se estira a lo alto${estirados.length ? ` → ${JSON.stringify(estirados)}` : ""}`);

    await p.locator(".form-btn-principal", { hasText: "Es un evento nuevo" }).click();
    await p.waitForTimeout(500);

    // Desde la PRIMERA pregunta se tiene que poder volver. Sin esto, en cuanto elegías
    // el evento te quedabas encerrada en las preguntas: no había forma de mirar los
    // eventos que hay ni lo que ya habías mandado sin cerrar la aplicación entera.
    await p.locator(".form-btn-atras").click();
    await p.waitForTimeout(500);
    ok(/De qué evento son los datos/i.test(await p.locator(".form-titulo").innerText()),
      "desde la primera pregunta se vuelve a la lista de eventos");
    await p.locator(".form-btn-principal", { hasText: "Es un evento nuevo" }).click();
    await p.waitForTimeout(500);

    await p.locator(".form-opcion", { hasText: "Boda" }).first().click();
    await p.waitForTimeout(600);
    ok(/Cómo lo llamamos/i.test(await p.locator(".form-titulo").innerText()),
      "al elegir el tipo pasa sola a la siguiente");

    await p.locator(".form-input").first().fill("Boda de Ana y Luis");
    await p.locator(".form-input").nth(1).fill("Finca La Alquería");
    await p.locator(".form-btn-principal").click();
    await p.waitForTimeout(400);

    // El nombre y el día no se pueden dejar en blanco (sin día no hay recogidas), así
    // que al pasar por esas dos pantallas hay que rellenarlas: en el resto vale "No lo sé".
    const rellenarObligatorio = async (titulo) => {
      if (/Cómo lo llamamos/i.test(titulo)) {
        await p.locator(".form-input").first().fill("Evento de prueba");
        await p.locator(".form-input").nth(1).fill("Finca de prueba");
        await p.locator(".form-btn-principal").click();
        await p.waitForTimeout(300);
        return true;
      }
      if (/Qué día/i.test(titulo)) {
        await p.locator('input[type="date"]').first().fill("2027-08-11");
        await p.waitForTimeout(200);
        await p.locator(".form-btn-principal").click();
        await p.waitForTimeout(300);
        return true;
      }
      return false;
    };

    // El resto se contesta con "No lo sé": es la respuesta que más se va a usar y no
    // puede dejar el formulario atascado en ninguna pregunta
    let vueltas = 0;
    while (vueltas++ < 32) {
      const t = await p.locator(".form-titulo").innerText();
      if (/Está todo bien/i.test(t)) break;
      if (await rellenarObligatorio(t)) continue;
      const nose = p.locator(".form-btn-nose");
      if (await nose.count()) await nose.click(); else await p.locator(".form-btn-principal").click();
      await p.waitForTimeout(280);
    }
    ok(/Está todo bien/i.test(await p.locator(".form-titulo").innerText()),
      `se llega al final contestando "No lo sé" a todo lo que no es obligatorio (${vueltas} pantallas)`);
    ok(await p.locator(".form-btn-principal", { hasText: "Falta algo" }).count() === 0,
      "y con el nombre y el día puestos, el repaso deja enviar");

    const repaso = await p.locator(".form-repaso-fila").allInnerTexts();
    ok(repaso.some(t => /Boda de Ana y Luis|Evento de prueba/.test(t)) && repaso.some(t => /no lo sé/i.test(t)),
      "y el repaso enseña lo contestado y lo que se dejó en blanco");
    ok(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0,
      "sin desbordamiento en el móvil");

    // Las carpas: se propone un número sacado de la gente y se puede cambiar. Si pasa
    // de las 8 del almacén, tiene que decirlo AHÍ, no descubrirse el día del rodaje.
    const preguntaDe = async (texto) => {
      let vueltas = 0;
      while (vueltas++ < 32) {
        const t = await p.locator(".form-titulo").innerText();
        if (new RegExp(texto, "i").test(t)) return true;
        if (/Está todo bien/i.test(t)) return false;
        if (await rellenarObligatorio(t)) continue;
        const nose = p.locator(".form-btn-nose");
        if (await nose.count()) await nose.click(); else await p.locator(".form-btn-principal").click();
        await p.waitForTimeout(260);
      }
      return false;
    };
    await p.evaluate(() => localStorage.clear());
    await p.goto(BASE_FORM + "?enviar=PRUEBA1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2400);
    await p.locator(".form-btn-principal", { hasText: "Es un evento nuevo" }).click();
    await p.waitForTimeout(400);
    await p.locator(".form-opcion", { hasText: "Producción o rodaje" }).first().click();
    await p.waitForTimeout(600);
    // Los días, que son los que dan la recomendación
    ok(await preguntaDe("Cuántos días"), "en un rodaje se pregunta por los días y la gente");
    // Primero cuántos días, y eso abre un campo por día: la gente va en el segundo
    await p.locator(".form-campos input[type=number]").first().fill("1");
    await p.waitForTimeout(400);
    await p.locator(".form-campos input[type=number]").nth(1).fill("40");
    await p.waitForTimeout(400);
    // Con "Siguiente", no con "No lo sé": ese borra lo que se acaba de rellenar
    await p.locator(".form-btn-principal").first().click();
    await p.waitForTimeout(400);

    ok(await preguntaDe("Hacen falta carpas"),
      `se pregunta por las carpas, no por la sombra → "${await p.locator(".form-titulo").innerText()}"`);
    await p.locator(".form-opcion", { hasText: "Sí" }).first().click();
    await p.waitForTimeout(500);
    const numero = p.locator(".form-subcampo input[type=number]").first();
    const propuesto = Number(await numero.inputValue());
    // 40 pax → 4 para comer (40/12) + buffet + camión = 6
    ok(propuesto === 6, `propone las que salen de la gente puesta (${propuesto})`);
    ok(/no hay que alquilar ninguna/i.test(await p.locator(".form-nota-aviso").innerText()),
      "y con 6 dice que caben en el almacén");
    await numero.fill("11");
    await p.waitForTimeout(400);
    ok(/alquilar 3/i.test(await p.locator(".form-nota-aviso").innerText()),
      `si se piden 11 dice cuántas hay que alquilar → "${await p.locator(".form-nota-aviso").innerText()}"`);

    // El borrador sobrevive a cerrar el navegador a media pregunta
    await p.evaluate(() => localStorage.clear());
    await p.goto(BASE_FORM + "?enviar=PRUEBA1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2400);
    await p.locator(".form-btn-principal", { hasText: "Es un evento nuevo" }).click();
    await p.waitForTimeout(400);
    await p.locator(".form-opcion", { hasText: "Boda" }).first().click();
    await p.waitForTimeout(600);
    await p.locator(".form-input").first().fill("Boda de Ana y Luis");
    await p.locator(".form-input").nth(1).fill("Finca La Alquería");
    await p.locator(".form-btn-principal").click();
    await p.waitForTimeout(400);
    // Con tope y rellenando lo obligatorio: sin tope, una pregunta que no deja pasar
    // (el día, que ahora es obligatorio) deja esta prueba dando vueltas para siempre
    // en vez de fallar y decir por qué.
    let vueltasBorrador = 0;
    while (vueltasBorrador++ < 32) {
      const t = await p.locator(".form-titulo").innerText();
      if (/Está todo bien/i.test(t)) break;
      if (await rellenarObligatorio(t)) continue;
      const nose = p.locator(".form-btn-nose");
      if (await nose.count()) await nose.click(); else await p.locator(".form-btn-principal").click();
      await p.waitForTimeout(260);
    }
    ok(vueltasBorrador < 32, "el recorrido llega al repaso sin quedarse atascado");
    await p.reload({ waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    ok((await p.locator(".form-repaso-fila").allInnerTexts()).some(t => /Boda de Ana y Luis/.test(t)),
      "y si cierran y vuelven, siguen donde lo dejaron");
    await c.close();
  }

  // ── Dos apps separadas ──────────────────────────────────────────────────────
  // La checklist y el formulario tienen que poder instalarse por separado. Antes
  // compartían dirección y, con ella, el ámbito del manifiesto: para el navegador dos
  // manifiestos con el mismo ámbito son la MISMA app, así que quien tenía la checklist
  // instalada, al abrir el formulario se lo encontraba dentro de ella. Aquí se comprueba
  // justo eso —que ya no comparten ámbito— y que los enlaces ya repartidos con la
  // dirección vieja siguen llevando al formulario.
  console.log("\n── Dos apps separadas ──");
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);

    const manifiestoDe = async (dir) => {
      await p.goto(dir, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(300);
      const href = await p.locator('link[rel="manifest"]').getAttribute("href");
      const abs = new URL(href, p.url()).href;
      const m = await (await fetch(abs)).json();
      return { abs, ambito: new URL(m.scope, abs).pathname, arranque: new URL(m.start_url, abs).pathname, nombre: m.name };
    };

    const mChecklist = await manifiestoDe(BASE);
    const mForm = await manifiestoDe(BASE_FORM);
    ok(mChecklist.ambito !== mForm.ambito,
      `cada app tiene su propio ámbito (checklist ${mChecklist.ambito} · formulario ${mForm.ambito})`);
    ok(mForm.ambito === "/formulario/" && mForm.arranque === "/formulario/index.html",
      `el formulario arranca y vive en su carpeta (${mForm.arranque})`);
    ok(mChecklist.nombre === "Checklist Gula" && mForm.nombre === "Formulario Gula",
      `y cada una se instala con su nombre ("${mChecklist.nombre}" / "${mForm.nombre}")`);
    // Los iconos tienen que existir de verdad: una app instalada con el icono roto es
    // lo primero que se ve y no hay forma de arreglarlo desde el móvil
    const iconosOk = await p.evaluate(async (dir) => {
      const m = await (await fetch(dir)).json();
      const rs = await Promise.all(m.icons.map(i => fetch(new URL(i.src, dir).href)));
      return rs.every(r => r.ok);
    }, mForm.abs);
    ok(iconosOk, "y sus iconos se descargan (no quedan rotos al instalarla)");

    // La checklist ya no monta el formulario: quien llegue con el enlace se desvía
    await p.goto(BASE + "?enviar=PRUEBA1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    ok(p.url().includes("/formulario/") && p.url().includes("enviar=PRUEBA1"),
      `un enlace viejo (?enviar=) acaba en el formulario → ${p.url().replace(RAIZ, "…/")}`);
    ok(await p.locator(".form-titulo").count() > 0,
      "y llega funcionando, no a una pantalla en blanco");

    // Quien instaló el formulario ANTES de la mudanza tiene un icono que abre
    // "?formulario=1". Ese icono no puede acabar en el login del equipo.
    await p.evaluate(() => localStorage.setItem("gula_formulario_codigo", "PRUEBA1"));
    await p.goto(BASE + "?formulario=1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    ok(p.url().includes("/formulario/") && await p.locator(".login-tarjeta").count() === 0,
      "el icono viejo del formulario tampoco cae en el login del equipo");

    // Y al revés: desde la carpeta del formulario no se llega a la checklist
    await p.goto(BASE_FORM + "?enviar=PRUEBA1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1500);
    ok(await p.locator(".app-header").count() === 0 && await p.locator(".item-row").count() === 0
      && await p.locator(".config-card").count() === 0,
      "y en la carpeta del formulario no hay checklist por ningún lado");
    await c.close();
  }

  // ── Del formulario a la checklist ───────────────────────────────────────────
  // El formulario de la oficina no calcula nada: recoge respuestas y las traduce a los
  // mismos campos que rellenarías tú a mano. Esta prueba recorre el camino entero —
  // respuestas → configuración → checklist generada — para los tipos de evento, y es
  // la garantía de que el formulario no necesita tocar ni una línea de los generadores.
  console.log("\n── Del formulario a la checklist ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const desdeElFormulario = async (respuestas) => {
      const estado = aRespuestasDeLaApp(respuestas);
      await p.goto(url(estado), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1900);
      const nombres = await p.locator(".item-row .item-name").allInnerTexts();
      return { estado, nombres: nombres.map(n => n.replace(/\s*ALQUILER\s*/, "").trim()) };
    };
    const tiene = (l, txt) => l.some(n => n.toLowerCase().includes(txt.toLowerCase()));

    // Una boda de cóctel de pie: sin platos, con paella, horno grande y barril
    const boda = await desdeElFormulario({
      tipo: "boda", nombre: "Boda Ana y Luis", sitio: "Finca La Alquería",
      fecha: "2027-12-11", horaInicio: "12:30", horaFin: "23:00",
      adultos: 120, ninos: 10, coctel: 3, copas: 5,
      servicio: "bandeja", menu: ["paella", "frito"], entrante: ["compartir"], entrantePersonas: 3,
      horno: "Grande", extras: ["brindis", "barril50", "chillout"], chilloutNumero: 2,
      sillas: "finca", notas: "Alergia al marisco en la mesa 4",
    });
    ok(boda.estado.evento === "boda" && boda.estado.pax === 120 && boda.estado.soloBandeja === true
      && boda.estado.tipoHorno === "Grande" && boda.estado.tamanoBarril === "50L"
      && boda.estado.origenSillas === "No llevan" && boda.estado.personasPorPlatoEntrante === 3,
      `las respuestas se traducen a los campos de la app → ${JSON.stringify(boda.estado.tipoHorno)}, ${JSON.stringify(boda.estado.tamanoBarril)}`);
    ok(tiene(boda.nombres, "Horno grande") && !tiene(boda.nombres, "Horno pequeño"),
      "y la checklist carga el horno que se pidió");
    ok(tiene(boda.nombres, "Paella") && tiene(boda.nombres, "Parisiene"),
      "la paella y las frituras salen con su equipo");
    ok(!tiene(boda.nombres, "Platos trinchero"),
      "de pie y en bandeja: no se cargan platos");
    ok(!tiene(boda.nombres, "Sillas"),
      "si las sillas las pone la finca, no se cargan ni se alquilan");
    ok(tiene(boda.nombres, "Barril de cerveza (50L)") && tiene(boda.nombres, "Chill out"),
      "y lo presupuestado aparece: barril y chill out");

    // Un rodaje de tres días sin sombra y con generador de alquiler
    const produ = await desdeElFormulario({
      tipo: "produccion", nombre: "Produ Movistar", sitio: "Solo Houses",
      fecha: "2027-07-29", horaInicio: "07:00",
      dias: [12, 17, 12], carpas: "si", numCarpas: 4, generador: "si",
      menu: ["paella"], horno: "Pequeño", extras: [], notas: "",
    });
    ok(produ.estado.llevaCarpas === true && produ.estado.llevaGenerador === true
      && produ.estado.origenSillas === "Nuestras"
      && JSON.stringify(produ.estado.diasProduccion) === JSON.stringify(["12", "17", "12"]),
      `el rodaje traduce días, carpas, generador y sillas propias → ${JSON.stringify(produ.estado.diasProduccion)}`);
    ok(tiene(produ.nombres, "Carpas") && tiene(produ.nombres, "Generador"),
      "las carpas van con el generador y su gasolina");
    ok(tiene(produ.nombres, "Sillas (nuestras)"),
      "y las sillas del rodaje son las nuestras, sin alquiler");
    ok(produ.estado.alquilaCarpas === false && produ.estado.numCarpas === 4,
      `4 carpas caben en el almacén: no se alquila ninguna (${JSON.stringify(produ.estado.alquilaCarpas)})`);

    // A quién se alquilan las sillas lo sabe la oficina y la app no lo puede deducir:
    // cada proveedor es una recogida distinta
    const conCarvillo = aRespuestasDeLaApp({ tipo: "boda", nombre: "Boda C", adultos: 90, sillas: "Carvillo" });
    ok(conCarvillo.origenSillas === "Carvillo",
      `el proveedor de las sillas viaja tal cual → ${conCarvillo.origenSillas}`);
    ok(recogidasConAlquileres(conCarvillo).some(r => r.concepto === "Sillas (Carvillo)"),
      "y trae su recogida en Carvillo, no en Dealde");
    const carpasSOS = aRespuestasDeLaApp({
      tipo: "produccion", nombre: "Rodaje X", fecha: "2027-07-29",
      dias: [20], carpas: "si", numCarpas: 11,
    });
    ok(carpasSOS.llevaCarpas === true && carpasSOS.alquilaCarpas === true
      && recogidasConAlquileres(carpasSOS).some(r => r.concepto === "Carpas (Support On Set)"),
      "pedir más carpas de las que hay en almacén crea sola su recogida en SOS");
    {
      // En un rodaje se separa mucho más residuo que en un banquete
      const cubos = await p.locator(".item-row", { hasText: "Cubo basura reciclaje" }).first().locator(".item-qty-input").inputValue();
      ok(cubos === "3", `y van 3 cubos de basura de reciclaje, no 1 (${cubos})`);

      // Este rodaje es de tres días (12+17+12): lo reutilizable se dimensiona para el
      // DÍA GRANDE (17) y lo que se gasta para la SUMA (41). Los cubiertos y los platos
      // se friegan, así que van por el día grande; las cápsulas se gastan.
      const DIA_GRANDE = 17, RACIONES = 41;
      const margen = (n) => Math.ceil(n * 1.1);
      const uno = async (t) => Number(await p.locator(".item-row", { hasText: t }).first().locator(".item-qty-input").inputValue());
      const [tenedores, cuchPostre, platosPostre] = [
        await uno("Tenedores grandes"), await uno("Cucharas postre"), await uno("Platos postre"),
      ];
      // En un rodaje se come dos veces (desayuno y comida): cubiertos para las dos
      ok(tenedores === margen(DIA_GRANDE * 2) && cuchPostre === margen(DIA_GRANDE * 2),
        `los cubiertos del rodaje van para dos servicios (${tenedores} tenedores, ${cuchPostre} cucharas de postre)`);
      // Y el desayuno usa su plato pequeño: uno por cabeza de más
      ok(platosPostre === margen(DIA_GRANDE) + DIA_GRANDE,
        `y el plato de postre lleva uno por cabeza de más para el desayuno (${platosPostre})`);

      // En un rodaje se bebe café todo el día, no los 2-3 de una sobremesa
      const capsulas = await uno("Cápsulas café");
      ok(capsulas === Math.ceil(RACIONES * 5.5),
        `y las cápsulas de café van a 5,5 por persona y día (${capsulas} para ${RACIONES} raciones)`);
    }

    // Lo que no se contesta no se toca: se queda con el valor por defecto de la app
    const minimo = aRespuestasDeLaApp({ tipo: "cumpleanos", nombre: "Cumple Marta", adultos: 40 });
    ok(minimo.evento === "cumpleanos" && minimo.pax === 40
      && minimo.tipoHorno === undefined && minimo.llevaPaella === undefined,
      `lo que no se contesta no viaja: ${JSON.stringify(Object.keys(minimo))}`);
    await c.close();
  }

  // ── La hoja (antes "Vista previa") ──────────────────────────────────────────
  // Es la hoja tal como sale en el Word y en el PDF, así que su sitio es dentro de
  // Compartir, un segundo antes de exportar, y no un botón más en una cabecera que en
  // el móvil ocupaba casi un tercio de la pantalla. Y sus columnas Sale/Vuelve/Roturas
  // solo tienen sentido cuando hay algo marcado: vacías se comían 78px de ancho.
  console.log("\n── La hoja ──");
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const abrirHoja = async (estado) => {
      await p.goto(url(estado), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2100);
      await p.locator(".compartir-menu-wrap > .btn").first().click();
      await p.waitForTimeout(400);
      await p.locator(".compartir-menu button", { hasText: "Ver la hoja" }).first().click();
      await p.waitForTimeout(1000);
      // Solo la primera tabla: hay una por categoría y allInnerTexts las juntaría todas
      return p.locator(".preview-table").first().locator("thead th").allInnerTexts();
    };

    await p.goto(url({ evento: "boda", pax: 120 }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2100);
    ok(await p.locator(".header-actions button", { hasText: "Vista previa" }).count() === 0,
      "la cabecera ya no lleva el botón de Vista previa");

    const sinMarcas = await abrirHoja({ evento: "boda", pax: 120 });
    ok(sinMarcas.length === 2 && /Concepto/i.test(sinMarcas[0]) && /Cant/i.test(sinMarcas[1]),
      `sin nada marcado la hoja va a dos columnas → ${JSON.stringify(sinMarcas)}`);

    const conMarcas = await abrirHoja({
      evento: "boda", pax: 120,
      checkeados: { "Personal::Camareros": true },
      roturas: { "Personal::Camareros": "2" },
    });
    ok(conMarcas.length === 6 && conMarcas.some(t => /Prep/i.test(t)) && conMarcas.some(t => /Roturas/i.test(t)),
      `y con algo marcado aparecen Prep., Sale, Vuelve y Roturas → ${JSON.stringify(conMarcas)}`);

    // La marca de preparación sola ya justifica las columnas: si alguien preparó pero
    // aún no ha cargado nada, la hoja tiene que enseñarlo igual
    const soloPrep = await abrirHoja({
      evento: "boda", pax: 120,
      preparados: { "Personal::Camareros": true },
    });
    ok(soloPrep.length === 6 && soloPrep.some(t => /Prep/i.test(t)),
      `y con solo la preparación marcada la hoja ya las enseña → ${JSON.stringify(soloPrep)}`);
    await c.close();
  }

  // ── Cuánto sitio se come antes de poder marcar ──────────────────────────────
  // Medido en un móvil de 844px: el primer item de Modo carga estaba a 615px (73% de
  // la pantalla gastada en margen, cabecera, selector y dos cronómetros) y solo se
  // veían tres. Cargando un camión eso es scroll constante. Se exige que el panel
  // empiece pegado arriba y que quepan al menos cinco items sin tocar nada.
  console.log("\n── Sitio útil en Modo carga ──");
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "produccion", pax: 30, nombreEvento: "Produccion Elche" }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    await p.locator("button", { hasText: "Modo carga" }).first().click();
    await p.waitForTimeout(1400);
    const m = await p.evaluate(() => {
      const y = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null; };
      return {
        modal: y(".carga-modal"),
        primero: y(".carga-row"),
        visibles: [...document.querySelectorAll(".carga-row")].filter(e => e.getBoundingClientRect().top < window.innerHeight).length,
        crono: Math.round((document.querySelector(".crono-box") || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height),
      };
    });
    ok(m.modal === 0, `en móvil el panel de carga empieza pegado arriba (y=${m.modal})`);
    ok(m.crono <= 80, `los cronómetros caben en una línea (${m.crono}px de alto)`);
    ok(m.primero !== null && m.primero < 500, `el primer item entra en la primera pantalla (y=${m.primero})`);
    ok(m.visibles >= 5, `y se ven al menos cinco items de una vez (${m.visibles})`);
    await c.close();
  }

  // ── Zonas táctiles en móvil ─────────────────────────────────────────────────
  // Cargando un camión con las manos frías se falla un botón de 27px. El mínimo cómodo
  // son 44; se exige al menos 32 contando la capa invisible que extiende las casillas.
  // Se miden DOS eventos, no uno: medir solo una producción dejaba fuera las filas de
  // logística (el botón "Extra" y la casilla de furgoneta), el "+ Añadir persona/
  // recogida/compra" y las casillas de la barra libre, que estaban por debajo del
  // mínimo sin que nadie lo viera.
  console.log("\n── Zonas táctiles ──");
  const PANTALLAS_TACTILES = [
    { evento: "produccion", pax: 25, notasEvento: "Hielo" },
    {
      evento: "boda", pax: 120, ninos: 15, fechaEvento: "2027-12-11",
      barraCoctel: true, horasCoctel: 3, barraCopas: true, horasCopas: 5, llevaPaella: true,
      logisticaEquipo: [{ nombre: "Raúl", inicio: "08:00", fin: "20:00", furgoneta: true }],
      recogidas: [{ concepto: "Camión plataforma", fecha: "2027-12-09", fechaDevolucion: "2027-12-13" }],
      compras: [{ concepto: "Hielo", cantidad: "20 sacos", fecha: "2027-12-10" }],
    },
  ];
  for (const [i, w] of [[0, 320], [1, 390], [1, 320]]) {
    const c = await navegador.newContext({ viewport: { width: w, height: 900 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url(PANTALLAS_TACTILES[i]), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    const pequenos = await p.evaluate(() => {
      const malos = [];
      document.querySelectorAll("button, a, input[type=checkbox], select").forEach(e => {
        if (!e.offsetParent) return;
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        let ancho = r.width, alto = r.height;
        const cs = getComputedStyle(e, "::after");
        if (cs && cs.content !== "none" && cs.position === "absolute") {
          ancho = Math.max(ancho, parseFloat(cs.width) || 0);
          alto = Math.max(alto, parseFloat(cs.height) || 0);
        }
        if (alto < 32 || ancho < 32) malos.push(`${(e.textContent || e.className || e.type).trim().slice(0, 20)} ${Math.round(ancho)}x${Math.round(alto)}`);
      });
      return malos;
    });
    ok(pequenos.length === 0, `${PANTALLAS_TACTILES[i].evento} a ${w}px: ninguna zona táctil por debajo de 32px${pequenos.length ? ` → ${pequenos.slice(0, 4).join(", ")}` : ""}`);
    await c.close();
  }

  // ── Items quitados: se pueden recuperar ─────────────────────────────────────
  // Antes solo los devolvía "Deshacer", que vive en memoria: al recargar, el item se
  // había ido para siempre en ese evento.
  console.log("\n── Items quitados ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1400, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "produccion", pax: 25 }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    const antes = await p.locator(".item-row").count();
    for (let i = 0; i < 2; i++) { await p.locator(".item-row").first().locator(".item-action-borrar").click(); await p.waitForTimeout(600); }
    const linea = await p.locator(".items-quitados").first().innerText().catch(() => "");
    ok(await p.locator(".item-row").count() === antes - 2 && /2 items quitados/.test(linea),
      `al quitar 2 items lo dice y da cómo recuperarlos ("${linea.replace(/\n/g, " · ")}")`);
    // Y al volver a abrir el evento (con los quitados ya guardados) sigue estando
    await p.goto(url({ evento: "produccion", pax: 25, itemsOcultos: { "Electricidad y otros::Focos de luz": true } }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2300);
    const hayLinea = await p.locator(".items-quitados").count() === 1;
    ok(hayLinea, "al abrir un evento que ya tenía items quitados, sigue pudiéndose recuperar");
    if (hayLinea) {
      const conQuitado = await p.locator(".item-row").count();
      await p.locator(".items-quitados-btn").first().click();
      await p.waitForTimeout(900);
      ok(await p.locator(".item-row").count() === conQuitado + 1, "y al recuperarlos vuelven a la lista");
    } else ok(false, "y al recuperarlos vuelven a la lista");
    await c.close();
  }

  // ── La app instalada tiene que recibir los cambios ──────────────────────────
  // El fallo clásico de una app instalada: el service worker se queda con la versión
  // guardada y no vuelve a coger nada nunca. Aquí se simula un despliegue de verdad —
  // bundle con OTRO nombre (llevan hash), index.html apuntando al nuevo y version.json
  // actualizado— con el service worker ya instalado, y se exige que el cambio se vea.
  console.log("\n── La app instalada recibe los cambios ──");
  {
    const fs3 = await import("fs");
    const PUERTO2 = 4179, BASE2 = `http://localhost:${PUERTO2}/publicado/index.html`;
    fs3.rmSync("/tmp/gula-publicado", { recursive: true, force: true });
    fs3.mkdirSync("/tmp/gula-publicado", { recursive: true });
    fs3.cpSync("dist", "/tmp/gula-publicado/publicado", { recursive: true });
    const srv2 = spawn("python3", ["-m", "http.server", String(PUERTO2), "--directory", "/tmp/gula-publicado"], { stdio: "ignore" });
    for (let i = 0; i < 40; i++) { try { const r = await fetch(BASE2); if (r.ok) break; } catch (e) { /* levantando */ } await new Promise(r => setTimeout(r, 250)); }
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await nuevaPagina(c);
    const estado = encodeURIComponent(JSON.stringify({ evento: "produccion", pax: 25 }));
    await p.goto(`${BASE2}?c=${estado}`, { waitUntil: "load" });
    await p.waitForTimeout(3000);
    const dir = "/tmp/gula-publicado/publicado";
    // El nombre del bundle se saca del propio index.html, no de un patrón a mano: al
    // separar el formulario en su carpeta la entrada pasó a llamarse "checklist-…" y
    // una prueba que buscaba "index-…" se quedó sin encontrar nada.
    const entrada = (fs3.readFileSync(`${dir}/index.html`, "utf8")
      .match(/src="[^"]*assets\/([^"]+\.js)"/) || [])[1];
    const jsViejo = entrada;
    ok(!!jsViejo && await p.locator(".item-row").count() > 20, `la app queda instalada (bundle ${jsViejo})`);
    // Se "despliega" una versión nueva con un cambio visible
    const nuevo = "checklist-VERSIONNUEVA.js";
    fs3.writeFileSync(`${dir}/assets/${nuevo}`,
      fs3.readFileSync(`${dir}/assets/${jsViejo}`, "utf8").replaceAll("Cubo basura reciclaje", "CAMBIO VERSION NUEVA"));
    fs3.rmSync(`${dir}/assets/${jsViejo}`);
    fs3.writeFileSync(`${dir}/index.html`, fs3.readFileSync(`${dir}/index.html`, "utf8").replace(jsViejo, nuevo));
    const pre = JSON.parse(fs3.readFileSync(`${dir}/precache.json`, "utf8"));
    fs3.writeFileSync(`${dir}/precache.json`, JSON.stringify({ id: "NUEVA", ficheros: pre.ficheros.map(f => f.replace(jsViejo, nuevo)) }));
    fs3.writeFileSync(`${dir}/version.json`, JSON.stringify({ id: "NUEVA" }));
    // Se vuelve a abrir la app instalada, con cobertura
    await p.goto(`${BASE2}?c=${estado}`, { waitUntil: "load" });
    await p.waitForTimeout(3000);
    const conRed = await p.evaluate(() => ({
      bundles: performance.getEntriesByType("resource").map(e => e.name.split("/").pop()).filter(n => /^checklist-.*\.js$/.test(n)),
      cambio: [...document.querySelectorAll(".item-name")].some(n => /CAMBIO VERSION NUEVA/.test(n.textContent)),
    }));
    ok(conRed.cambio && conRed.bundles.includes("checklist-VERSIONNUEVA.js"),
      `al reabrirla con cobertura carga la versión nueva (${conRed.bundles.join(", ")})`);
    // Y a partir de ahí, sin cobertura abre con la NUEVA
    await c.setOffline(true);
    await p.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await p.waitForTimeout(3000);
    const sinRed = await p.evaluate(() => [...document.querySelectorAll(".item-name")].some(n => /CAMBIO VERSION NUEVA/.test(n.textContent)));
    ok(sinRed, "y sin cobertura abre ya con la versión nueva guardada");
    await c.setOffline(false);
    await c.close();
    srv2.kill();
    fs3.rmSync("/tmp/gula-publicado", { recursive: true, force: true });
  }

  // ── Aviso de versión nueva ──────────────────────────────────────────────────
  // Los .js llevan hash en el nombre, así que un index.html cacheado en el móvil sigue
  // cargando la compilación vieja indefinidamente y no te enteras: pasó de verdad, con
  // una pantalla del móvil mostrando la checklist de dos versiones antes. La app compara
  // el id de la compilación cargada con el version.json del servidor.
  console.log("\n── Aviso de versión nueva ──");
  {
    const fs2 = await import("fs");
    const original = fs2.readFileSync("dist/version.json", "utf8");
    const c = await navegador.newContext({ viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "produccion", pax: 25 }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2300);
    ok(await p.locator(".version-nueva-banner").count() === 0, "con la misma versión no avisa de nada");
    // Se publica una versión nueva con la app abierta
    fs2.writeFileSync("dist/version.json", JSON.stringify({ id: "2099-01-01T00:00:00.000Z" }));
    await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await p.waitForTimeout(1300);
    const avisa = await p.locator(".version-nueva-banner").count() === 1;
    ok(avisa, "al publicar una versión nueva, avisa");
    if (avisa) {
      await p.locator(".version-nueva-btn").click();
      await p.waitForTimeout(2600);
      ok(await p.locator(".item-row").count() > 20, `y el botón recarga sin perder el evento (${await p.locator(".item-row").count()} items)`);
    } else ok(false, "y el botón recarga sin perder el evento");
    fs2.writeFileSync("dist/version.json", original);
    await c.close();
  }

  // ── Avisos de recogidas, devoluciones y compras ─────────────────────────────
  // Un alquiler tiene DOS avisos (recogerlo y devolverlo) y salían los dos a la vez,
  // así que el mismo concepto aparecía dos veces seguidas y parecía duplicado. La
  // devolución solo debe avisar cuando ya se ha recogido... o cuando vence.
  console.log("\n── Avisos de recogidas y compras ──");
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const chips = (p) => p.locator(".aviso-recogida-chip .aviso-recogida-texto").allInnerTexts();

  const abrirConAvisos = async (recogidas) => {
    const c = await navegador.newContext({ viewport: { width: 1440, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const estado = {
      evento: "produccion", pax: 25, nombreEvento: "Produ kitten", fechaEvento: dia(1),
      recogidas, compras: [{ concepto: "Aguas", cantidad: "5 cajas", fecha: dia(0) }],
    };
    await c.addInitScript(e => {
      localStorage.setItem("gula_eventos_guardados", JSON.stringify({ "Produ kitten": e }));
      localStorage.setItem("gula_evento_activo", "Produ kitten");
    }, estado);
    const p = await nuevaPagina(c);
    await p.goto(url(estado), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2600);
    return { c, p };
  };

  // 1) Recogida pendiente → se avisa de la recogida, NO de la devolución
  const a1 = await abrirConAvisos([{ concepto: "Recoger generador", fecha: dia(0), fechaDevolucion: dia(2) }]);
  let t = await chips(a1.p);
  ok(t.length === 2 && t.some(x => /Recogida: "Recoger generador"/.test(x)) && !t.some(x => /Devoluci/.test(x)),
    `sin recoger: solo recogida y compra, sin devolución → ${JSON.stringify(t)}`);
  const ficha = await a1.p.locator(".resumen-ficha.is-aviso .resumen-ficha-valor").innerText().catch(() => "");
  ok(parseInt(ficha, 10) === t.length, `la ficha PENDIENTES (${parseInt(ficha, 10)}) coincide con los avisos (${t.length})`);

  // 2) Al marcar la recogida como hecha aparece la devolución, ya sin el verbo delante
  await a1.p.locator(".aviso-recogida-chip", { hasText: "Recogida" }).locator(".aviso-recogida-hecho").click();
  await a1.p.waitForTimeout(1500);
  t = await chips(a1.p);
  ok(t.length === 2 && t.some(x => /Devolución: "generador"/.test(x)) && !t.some(x => /Recogida:/.test(x)),
    `tras recogerlo: aparece la devolución sin repetir el verbo → ${JSON.stringify(t)}`);
  await a1.c.close();

  // 3) Devolución vencida sin recogida marcada: se avisa igual (no se pagan días de más)
  const a2 = await abrirConAvisos([{ concepto: "Recoger generador", fecha: dia(-4), fechaDevolucion: dia(-1) }]);
  t = await chips(a2.p);
  ok(t.some(x => /Devolución/.test(x)), `devolución atrasada: se avisa aunque no se marcara la recogida → ${JSON.stringify(t)}`);
  await a2.c.close();

  // ── Verano o invierno, según la fecha ───────────────────────────────────────
  // El dato existía en el código pero no se podía cambiar desde ningún sitio: estaba
  // fijo en verano todo el año, así que una boda de diciembre cargaba cerveza de agosto
  // y el doble de blanco que de tinto. Ahora sale de la fecha del evento.
  console.log("\n── Temporada ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const bebidas = async (estado) => {
      await p.goto(url({ evento: "boda", pax: 100, ninos: 0, barraCoctel: true, horasCoctel: 4, ...estado }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1900);
      const uno = async (n) => Number(await p.locator(".item-row", { hasText: n }).first().locator(".item-qty-input").inputValue());
      return { cerveza: await uno("Cerveza Alhambra"), blanco: await uno("Vino blanco"), tinto: await uno("Vino tinto") };
    };
    const agosto = await bebidas({ fechaEvento: "2027-08-14" });
    const diciembre = await bebidas({ fechaEvento: "2027-12-11" });

    ok(agosto.cerveza > diciembre.cerveza,
      `en agosto se carga más cerveza que en diciembre: ${agosto.cerveza} vs ${diciembre.cerveza} tercios`);
    ok(agosto.blanco > agosto.tinto && diciembre.tinto > diciembre.blanco,
      `y el vino se da la vuelta: agosto ${agosto.blanco}/${agosto.tinto} blanco-tinto, diciembre ${diciembre.blanco}/${diciembre.tinto}`);

    // Forzar la temporada a mano manda sobre la fecha
    const dicForzadoVerano = await bebidas({ fechaEvento: "2027-12-11", estacion: "verano" });
    ok(dicForzadoVerano.cerveza === agosto.cerveza && dicForzadoVerano.blanco === agosto.blanco,
      "forzar Verano en diciembre manda sobre la fecha");

    // Los eventos guardados ANTES de esto llevan mesVerano true y ningún dato de
    // temporada. Los que YA HAN PASADO no pueden cambiar de cifras: su lista es
    // historia. Los que están por venir sí se corrigen solos por su fecha.
    const yaPasado = await bebidas({ fechaEvento: "2024-12-11", mesVerano: true });
    ok(yaPasado.cerveza === agosto.cerveza && yaPasado.blanco === agosto.blanco && yaPasado.tinto === agosto.tinto,
      `un evento ya pasado no cambia ni una cifra: ${JSON.stringify(yaPasado)}`);
    const porVenir = await bebidas({ fechaEvento: "2027-12-11", mesVerano: true });
    ok(porVenir.cerveza === diciembre.cerveza && porVenir.tinto === diciembre.tinto,
      `y uno que está por venir sí se corrige por su fecha: ${JSON.stringify(porVenir)}`);
    await c.close();
  }

  // ── El brindis con cava ─────────────────────────────────────────────────────
  // Marcarlo hace dos cosas distintas y conviene no confundirlas: suma 4 botellas (la
  // referencia del sector para un brindis es 1 copa por cabeza) y DOBLA las copas,
  // porque en el brindis todo el mundo coge copa a la vez. Antes subía el ratio de
  // botellas a 0,28 y salían 28 para 100 pax: dos copas por cabeza, el techo de lo que
  // alguien bebe en un brindis, no la media.
  console.log("\n── Brindis con cava ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const cava = async (brindis) => {
      await p.goto(url({ evento: "boda", pax: 100, ninos: 0, barraCoctel: true, horasCoctel: 4, tieneBrindisCava: brindis }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1900);
      // Por nombre EXACTO: buscando "Cava" a secas se cazaba antes "Copas de cava",
      // que aparece más arriba en la lista
      const porNombre = await p.locator(".item-row").evaluateAll(rs => Object.fromEntries(rs.map(r => [
        ((r.querySelector(".item-name") || {}).textContent || "").replace(/\s*ALQUILER\s*/, "").trim(),
        Number((r.querySelector(".item-qty-input") || {}).value),
      ])));
      return { botellas: porNombre["Cava"], copas: porNombre["Copas de cava"] };
    };
    const sin = await cava(false), con = await cava(true);
    ok(sin.botellas === 20 && con.botellas === 24,
      `el brindis suma 4 botellas de cava, no un ratio entero (${sin.botellas} → ${con.botellas})`);
    // El cálculo dobla (110 → 220 copas), pero lo que se carga va redondeado a bateas
    // completas de 36, así que en pantalla se ve 144 → 252
    ok(con.copas >= sin.copas * 1.7,
      `y dobla las copas, que en el brindis todo el mundo coge una a la vez — en bateas de 36 (${sin.copas} → ${con.copas})`);
    await c.close();
  }

  // ── Bandejas y servicio de bandeja ──────────────────────────────────────────
  // "Lleva canapés" hacía dos cosas a la vez: sumar bandejas y dejar los platos fuera
  // de la carga. Una boda normal lleva canapés en el cóctel Y platos en el banquete,
  // así que marcarlo te dejaba sin platos. Ahora las bandejas para pasar comida van
  // siempre (por pax) y lo único que se marca es si el servicio es entero de bandeja.
  console.log("\n── Bandejas y solo bandeja ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const lee = async (estado) => {
      await p.goto(url({ evento: "boda", pax: 100, ninos: 0, ...estado }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1900);
      return p.locator(".item-row").evaluateAll(rs => rs.map(r => {
        const n = r.querySelector(".item-name");
        const q = r.querySelector(".item-qty-input");
        return { n: (n ? n.textContent : "").replace(/\s*ALQUILER\s*/, "").trim(), q: q ? q.value : "" };
      }));
    };
    const bandejas = (filas) => filas.filter(x => /^Bandejas de (madera|plata)/.test(x.n)).map(x => Number(x.q));
    const hayPlatos = (filas) => filas.some(x => /^Platos trinchero/.test(x.n));

    const base = await lee({});
    const soloBandeja = await lee({ soloBandeja: true });

    ok(hayPlatos(base) && bandejas(base).length > 0 && bandejas(base).every(v => v >= Math.ceil(100 / 10)),
      `sin marcar nada ya van bandejas por pax, y los platos del banquete → ${JSON.stringify(bandejas(base))}`);
    ok(!hayPlatos(soloBandeja), '"Solo bandeja" deja los platos fuera de la carga');
    ok(bandejas(soloBandeja).every((v, i) => v > bandejas(base)[i]),
      `y suma unas cuantas bandejas más: ${JSON.stringify(bandejas(base))} → ${JSON.stringify(bandejas(soloBandeja))}`);

    // Un evento guardado de ANTES del cambio solo tiene llevaCanapes (sin soloBandeja),
    // y entonces esa casilla hacía las dos cosas: tiene que seguir dando la misma lista
    ok(!hayPlatos(await lee({ llevaCanapes: true })),
      "un evento guardado antes del cambio sigue sin cargar platos");
    await c.close();
  }

  // ── Alquileres: recogida y devolución solas ─────────────────────────────────
  // Un alquiler no es solo una línea más en la carga: hay que ir a buscarlo y
  // devolverlo. Antes esas dos fechas se escribían a mano evento tras evento (y por
  // eso se olvidaban). Ahora el interruptor crea y quita su recogida, con las fechas
  // sacadas de la del evento — y sin tocar nunca las escritas a mano.
  console.log("\n── Alquileres ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const bloque = () => p.locator(".logistica-block").filter({ hasText: /RECOGIDAS \(/ });
    const tarjetas = () => bloque().locator(".recogida-card").evaluateAll(cs => cs.map(x => ({
      concepto: (x.querySelector('input[type="text"]') || {}).value || "",
      fechas: [...x.querySelectorAll('input[type="date"]')].map(d => d.value),
      auto: !!x.querySelector(".recogida-auto-badge"),
    })));
    const sillas = (op) => p.locator(".segment-group", { hasText: "Sillas" }).first()
      .locator(".segment-btn", { hasText: new RegExp(`^${op}$`) }).first();
    const armario = () => p.locator(".checkbox-label-normal", { hasText: "Armario caliente" }).locator("input");
    const fechaDelEvento = () => p.locator(".form-group", { hasText: "FECHA" }).first().locator('input[type="date"]');

    await p.goto(url({
      evento: "boda", pax: 80, nombreEvento: "Boda alquileres", fechaEvento: "2027-08-11",
      origenSillas: "Nuestras",
      recogidas: [{ concepto: "Camión plataforma", fecha: "2027-08-09", fechaDevolucion: "2027-08-13" }],
    }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    ok((await tarjetas()).length === 1, "de partida solo está la recogida escrita a mano");

    // Sillas de alquiler → su recogida el día antes y su devolución el día después
    await sillas("Dealde").click();
    await p.waitForTimeout(600);
    await armario().check();
    await p.waitForTimeout(600);
    let t = await tarjetas();
    const sillasCard = t.find(x => /^Sillas/.test(x.concepto));
    const armarioCard = t.find(x => /^Armario/.test(x.concepto));
    ok(t.length === 3 && sillasCard && armarioCard, `los dos alquileres crean su recogida → ${JSON.stringify(t.map(x => x.concepto))}`);
    ok(sillasCard && sillasCard.concepto === "Sillas (Dealde)" && sillasCard.auto
      && sillasCard.fechas[0] === "2027-08-10" && sillasCard.fechas[1] === "2027-08-12",
      `sillas: recoger el día antes y devolver el día después → ${JSON.stringify(sillasCard)}`);
    ok(armarioCard && armarioCard.concepto === "Armario caliente (Dealde)" && armarioCard.auto,
      `armario caliente: lleva su proveedor → ${JSON.stringify(armarioCard)}`);

    // Cambiar el proveedor renombra la recogida, no crea otra
    await sillas("Carvillo").click();
    await p.waitForTimeout(600);
    t = await tarjetas();
    ok(t.length === 3 && t.some(x => x.concepto === "Sillas (Carvillo)"),
      `cambiar de proveedor renombra la recogida en vez de duplicarla → ${JSON.stringify(t.map(x => x.concepto))}`);

    // Mover la fecha del evento arrastra las fechas automáticas… y solo esas
    await fechaDelEvento().fill("2027-09-05");
    await p.waitForTimeout(800);
    t = await tarjetas();
    const aMano = t.find(x => x.concepto === "Camión plataforma");
    ok(t.filter(x => x.auto).every(x => x.fechas[0] === "2027-09-04" && x.fechas[1] === "2027-09-06"),
      `al mover la fecha del evento se recolocan las automáticas → ${JSON.stringify(t.filter(x => x.auto).map(x => x.fechas))}`);
    ok(aMano && aMano.fechas[0] === "2027-08-09" && !aMano.auto,
      `y la recogida escrita a mano se queda como estaba → ${JSON.stringify(aMano)}`);

    // Una fecha automática que se toca a mano deja de seguir a la del evento.
    // (El concepto vive en el valor de un input, así que la tarjeta se localiza por su
    // posición, no por texto: filter({ hasText }) no ve los valores de los campos.)
    const posSillas = t.findIndex(x => /^Sillas/.test(x.concepto));
    await bloque().locator(".recogida-card").nth(posSillas).locator('input[type="date"]').first().fill("2027-09-01");
    await p.waitForTimeout(500);
    await fechaDelEvento().fill("2027-09-20");
    await p.waitForTimeout(800);
    t = await tarjetas();
    ok(t.find(x => /^Sillas/.test(x.concepto)).fechas[0] === "2027-09-01",
      "una fecha puesta a mano ya no se mueve sola");
    ok(t.find(x => /^Armario/.test(x.concepto)).fechas[0] === "2027-09-19",
      "y la que no se ha tocado sigue a la del evento");

    // Quitar el alquiler se lleva su recogida, sin tocar las demás
    await armario().uncheck();
    await p.waitForTimeout(700);
    t = await tarjetas();
    ok(t.length === 2 && !t.some(x => /^Armario/.test(x.concepto)) && t.some(x => x.concepto === "Camión plataforma"),
      `quitar el alquiler se lleva solo su recogida → ${JSON.stringify(t.map(x => x.concepto))}`);

    // La ✕ de un item de alquiler tiene que quitarlo de verdad: los generaba con un
    // dato de más que la app leía como "añadido a mano", así que no hacía nada
    const filaSillas = () => p.locator(".item-row").filter({ hasText: "Sillas (alquiler" });
    ok(await filaSillas().count() === 1, "la silla de alquiler está en la lista");
    await filaSillas().locator(".item-action-borrar").click();
    await p.waitForTimeout(700);
    ok(await filaSillas().count() === 0, "y la ✕ la quita de la lista");

    // Y el nombre corregido de un item de alquiler tiene que quedarse puesto
    await armario().check();
    await p.waitForTimeout(700);
    const filaArmario = () => p.locator(".item-row").filter({ hasText: "Armario caliente" });
    await filaArmario().locator(".item-action-btn").first().click();
    await p.waitForTimeout(400);
    await p.locator(".item-name-input").fill("Armario caliente de Dealde");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(800);
    ok(await p.locator(".item-row").filter({ hasText: "Armario caliente de Dealde" }).count() === 1,
      "el nombre corregido de un item de alquiler se queda puesto");

    // Mobiliario extra: lo puede pedir el cliente en cualquier evento menos en un
    // rodaje (los chill out son nuestros y van aparte, sin recogida)
    const casilla = (txt) => p.locator(".checkbox-label-normal", { hasText: txt }).locator("input");
    await casilla("Mobiliario extra").check();
    await p.waitForTimeout(700);
    t = await tarjetas();
    ok(t.some(x => x.concepto === "Mobiliario (Event Style)"),
      `el mobiliario extra crea su recogida en Event Style → ${JSON.stringify(t.map(x => x.concepto))}`);
    ok(await p.locator(".item-row").filter({ hasText: "Mobiliario (alquiler Event Style)" }).count() === 1,
      "y el mobiliario alquilado sale en la carga");

    // En producción el generador (marcado de serie) y las carpas que falten van a SOS,
    // y el mobiliario extra ni se ofrece
    await p.locator("select.form-select").first().selectOption("produccion");
    await p.waitForTimeout(1000);
    ok(await p.locator(".checkbox-label-normal", { hasText: "Mobiliario extra" }).count() === 0,
      "en un rodaje no se ofrece mobiliario de Event Style");
    await casilla("Carpas de alquiler").check();
    await p.waitForTimeout(700);
    t = await tarjetas();
    ok(!t.some(x => x.concepto === "Mobiliario (Event Style)"),
      `y al pasar a rodaje se retira su recogida → ${JSON.stringify(t.map(x => x.concepto))}`);
    ok(t.some(x => x.concepto === "Carpas (Support On Set)"),
      `las carpas de alquiler van a SOS → ${JSON.stringify(t.map(x => x.concepto))}`);
    ok(t.some(x => x.concepto === "Generador (Support On Set)" && x.fechas[0] === "2027-09-19"),
      `el generador de producción crea su recogida en SOS → ${JSON.stringify(t.map(x => x.concepto))}`);

    // Separar los alquileres en el formulario NO los saca de la lista: se cargan y se
    // devuelven como todo lo demás, así que tienen que estar en Modo carga para marcarlos
    await casilla("Armario caliente").check();
    await p.waitForTimeout(600);
    await p.locator("button", { hasText: "Modo carga" }).first().click();
    await p.waitForTimeout(1400);
    const enCarga = async () => (await p.locator(".carga-nombre").allInnerTexts()).map(x => x.trim());
    let cargaSalida = await enCarga();
    const debenEstar = ["Generador", "Armario caliente (alquiler Dealde)", "Carpas"];
    const faltan = debenEstar.filter(n => !cargaSalida.some(x => x === n));
    ok(faltan.length === 0, `los alquileres están en Modo carga para marcarlos${faltan.length ? ` → faltan: ${faltan.join(", ")}` : ""}`);
    await p.locator(".carga-modo-toggle button", { hasText: "Vuelta" }).first().click();
    await p.waitForTimeout(700);
    const cargaVuelta = await enCarga();
    ok(debenEstar.every(n => cargaVuelta.some(x => x === n)),
      "y también en Vuelta, que es donde se comprueba que el alquiler se devuelve entero");
    await c.close();
  }

  // ── La bandeja del formulario ──────────────────────────────────────────────
  // El lado de la app: de dónde sale el enlace que se le pasa a la oficina y dónde se
  // revisa lo que mandan. Aquí la nube está cortada a propósito, así que se comprueba
  // justo lo que se ve sin conexión: que se llega, que se explica y que cabe.
  console.log("\n── La bandeja del formulario ──");
  {
    for (const ancho of [320, 390]) {
      const c = await navegador.newContext({ viewport: { width: ancho, height: 780 }, isMobile: true, hasTouch: true });
      for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
      const p = await nuevaPagina(c);
      await p.goto(url({ evento: "boda", pax: 100, nombreEvento: "Boda bandeja" }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2200);
      await p.locator(".compartir-menu-wrap > .btn").first().click();
      await p.waitForTimeout(400);
      const entrada = p.locator(".compartir-menu button", { hasText: "Formulario del evento" });
      if (ancho === 320) ok(await entrada.count() === 1, "el formulario del evento se abre desde Compartir");
      await entrada.first().click();
      await p.waitForTimeout(900);
      const titulo = await p.locator(".preview-header-title").first().innerText();
      if (ancho === 320) {
        ok(/Formulario del evento/i.test(titulo), `abre su pantalla → "${titulo.trim()}"`);
        ok(await p.locator(".btn", { hasText: "Crear el enlace" }).count() === 1,
          "sin enlace creado, lo primero que ofrece es crearlo");
        ok(/No hay envíos sin revisar/i.test(await p.locator(".preview-body").innerText()),
          "y dice claramente que el buzón está vacío");
      }
      const desborda = await p.evaluate(() => {
        const m = document.querySelector(".preview-modal");
        return {
          pagina: document.documentElement.scrollWidth > window.innerWidth,
          modal: m ? m.scrollWidth > m.clientWidth + 1 : true,
        };
      });
      ok(!desborda.pagina && !desborda.modal, `cabe en ${ancho}px sin desbordarse`);
      await p.locator(".preview-close-btn").first().click();
      await p.waitForTimeout(400);
      ok(await p.locator(".preview-modal").count() === 0, `y se cierra con su ✕ (${ancho}px)`);
      await c.close();
    }
  }

  // ── El check de preparación ────────────────────────────────────────────────
  // Preparar (sacarlo del almacén y dejarlo listo) y cargarlo en el camión son dos
  // momentos distintos, a menudo de personas distintas. Con un solo check no había
  // forma de controlar la preparación: o estaba cargado o no existía. Ahora cada fase
  // lleva su marca, y cada una enseña en pequeño cómo va la otra.
  console.log("\n── El check de preparación ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ ...EVENTO_COMPLETO, nombreEvento: "Boda preparación" }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    await p.locator("button", { hasText: "Modo carga" }).first().click();
    await p.waitForTimeout(1400);

    const pestana = (t) => p.locator(".carga-modo-toggle .segment-btn").filter({ hasText: t }).first();
    const guardado = (clave) => p.evaluate(k => Object.keys(JSON.parse(localStorage.getItem("gula_checklist_estado") || "{}")[k] || {}).length, clave);
    const cuenta = () => p.locator(".carga-toggle-cuenta").first().innerText();

    const tabs = (await p.locator(".carga-modo-toggle .segment-btn").allInnerTexts()).map(t => t.trim());
    ok(tabs.length === 4 && /Prep/.test(tabs[0]) && /Salida/.test(tabs[1]),
      `Modo carga abre con Preparación antes de Salida → ${JSON.stringify(tabs)}`);

    await pestana("Prep.").click();
    await p.waitForTimeout(700);
    ok(await p.locator(".crono-label", { hasText: "Cronómetro de preparación" }).count() === 1,
      "la preparación tiene su propio cronómetro, que ya alimentaba el tiempo estimado de prep");

    const nombrePrimero = (await p.locator(".carga-nombre").first().innerText()).trim();
    await p.locator(".carga-row input[type=checkbox]").nth(0).check({ force: true });
    await p.locator(".carga-row input[type=checkbox]").nth(1).check({ force: true });
    await p.waitForTimeout(900);
    ok(await guardado("preparados") === 2, `marcar en Preparación se guarda aparte (preparados: ${await guardado("preparados")})`);
    ok(await guardado("checkeados") === 0, "y no toca lo que está cargado en el camión");
    const cuentaPrep = await cuenta();
    ok(/^2\//.test(cuentaPrep), `el recuento cuenta lo preparado, no lo cargado (${cuentaPrep})`);

    // En Salida esas dos filas siguen SIN marcar (son dos cosas distintas), pero se ve
    // que venían preparadas
    await pestana("Salida").click();
    await p.waitForTimeout(700);
    ok(await p.locator(".carga-row input[type=checkbox]:checked").count() === 0,
      "preparado no es cargado: en Salida siguen sin marcar");
    ok(await p.locator(".carga-marca-otra.is-preparado").count() === 2,
      "pero al cargar se ve cuáles venían preparadas");
    ok(/^0\//.test(await cuenta()), "y el recuento de Salida empieza de cero");

    await p.locator(".carga-row input[type=checkbox]").nth(0).check({ force: true });
    await p.waitForTimeout(900);
    ok(await guardado("checkeados") === 1 && await guardado("preparados") === 2,
      "cargar en el camión no borra la marca de preparado");
    ok((await p.locator(".preview-header-subtitle").first().innerText()).includes("2 preparados"),
      "la cabecera de Salida recuerda cuántos hay preparados");

    await pestana("Prep.").click();
    await p.waitForTimeout(700);
    ok(await p.locator(".carga-marca-otra.is-cargado").count() === 1,
      "y preparando se ve lo que ya está subido al camión");

    // Cambiar la cantidad NO puede borrar lo ya marcado. Antes lo desmarcaba, y eso
    // era perder trabajo hecho: alguien había ido al almacén, lo había contado y lo
    // había marcado, y con cambiar una cifra desde otro sitio se perdía sin avisar.
    // Ahora la marca se queda y el item se señala para volver a contarlo.
    await p.locator(".preview-close-btn").first().click();
    await p.waitForTimeout(700);
    const antesDeTocar = await guardado("preparados");
    await p.locator(".item-row", { hasText: nombrePrimero }).first().locator(".item-qty-input").fill("999");
    await p.waitForTimeout(1200);
    ok(await guardado("preparados") === antesDeTocar,
      `cambiar la cantidad NO borra lo preparado (siguen ${await guardado("preparados")} de ${antesDeTocar})`);
    ok(await guardado("marcasRevisar") === 1,
      "pero el item queda señalado para volver a contarlo");

    // Y el aviso se ve en Modo carga, junto a la marca que sigue puesta
    await p.locator("button", { hasText: /Modo carga/i }).first().click();
    await p.waitForTimeout(900);
    const fila = p.locator(".carga-row", { hasText: nombrePrimero }).first();
    ok(await fila.locator(".carga-marca-otra.is-revisar").count() === 1,
      "y en Modo carga sale el aviso de \"revisar\" en esa fila");
    ok(await fila.locator('input[type="checkbox"]').isChecked(),
      "con su casilla todavía marcada: lo hecho no se ha perdido");

    // Volver a tocarla es haberla revisado: el aviso desaparece
    await fila.locator('input[type="checkbox"]').click();
    await p.waitForTimeout(400);
    await fila.locator('input[type="checkbox"]').click();
    await p.waitForTimeout(900);
    ok(await fila.locator(".carga-marca-otra.is-revisar").count() === 0,
      "y al volver a marcarla el aviso se va, que ya está revisada");
    await c.close();
  }

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

// Se recuerdan aquí para poder cerrarlos aunque la prueba reviente a mitad: si no, el
// servidor se quedaba vivo con el puerto cogido y la siguiente ejecución no arrancaba.
let servidorGlobal = null, navegadorGlobal = null;
async function limpiar() {
  try { if (navegadorGlobal) await navegadorGlobal.close(); } catch (e) { /* ya estaba cerrado */ }
  try { if (servidorGlobal) servidorGlobal.kill(); } catch (e) { /* ya estaba muerto */ }
}
process.on("SIGINT", async () => { await limpiar(); process.exit(130); });
process.on("SIGTERM", async () => { await limpiar(); process.exit(143); });

main()
  .catch(async (e) => { console.error(e); await limpiar(); process.exit(1); })
  .finally(limpiar);
