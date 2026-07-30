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
    return `${(n ? n.textContent : "").trim()}=${q ? q.value : ""}`;
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
    const anchos = await p.evaluate(() => {
      const fila = document.querySelector(".form-row");
      const ancho = fila ? fila.getBoundingClientRect().width : 0;
      return [...document.querySelectorAll(".form-group-ancho input")].map(i => ({
        et: (i.closest(".form-group").querySelector(".form-label") || {}).textContent,
        parte: ancho ? +(i.getBoundingClientRect().width / ancho).toFixed(2) : 0,
      }));
    });
    const estrechos = anchos.filter(a => a.parte < 0.9);
    ok(anchos.length === 2 && estrechos.length === 0,
      `${w}px: el nombre y la ubicación ocupan la fila entera${estrechos.length ? ` → ${estrechos.map(e => `${e.et} ${e.parte}`).join(", ")}` : ""}`);
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

  // ── Zonas táctiles en móvil ─────────────────────────────────────────────────
  // Cargando un camión con las manos frías se falla un botón de 27px. El mínimo cómodo
  // son 44; se exige al menos 32 contando la capa invisible que extiende las casillas.
  console.log("\n── Zonas táctiles ──");
  for (const w of [320, 390]) {
    const c = await navegador.newContext({ viewport: { width: w, height: 900 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "produccion", pax: 25, notasEvento: "Hielo" }), { waitUntil: "domcontentloaded" });
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
    ok(pequenos.length === 0, `${w}px: ninguna zona táctil por debajo de 32px${pequenos.length ? ` → ${pequenos.slice(0, 4).join(", ")}` : ""}`);
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
    const jsViejo = fs3.readdirSync(`${dir}/assets`).find(f => /^index-.*\.js$/.test(f));
    ok(!!jsViejo && await p.locator(".item-row").count() > 20, `la app queda instalada (bundle ${jsViejo})`);
    // Se "despliega" una versión nueva con un cambio visible
    const nuevo = "index-VERSIONNUEVA.js";
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
      bundles: performance.getEntriesByType("resource").map(e => e.name.split("/").pop()).filter(n => /^index-.*\.js$/.test(n)),
      cambio: [...document.querySelectorAll(".item-name")].some(n => /CAMBIO VERSION NUEVA/.test(n.textContent)),
    }));
    ok(conRed.cambio && conRed.bundles.includes("index-VERSIONNUEVA.js"),
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
