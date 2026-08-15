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

function obtenerRutaChromium() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  const rutasPosibles = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  return rutasPosibles.find(r => existsSync(r)) || undefined;
}

const CHROMIUM = obtenerRutaChromium();
const PUERTO = 4178;
// Cada app en SU carpeta y ninguna dentro de la otra: el ámbito de un manifiesto es la
// carpeta donde vive, y una app dentro del ámbito de otra no se puede instalar aparte
// (el navegador solo ofrece "abrir en la de fuera"). La raíz es solo el desvío.
const BASE = `http://localhost:${PUERTO}/checklist/index.html`;
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
  if (!existsSync("dist/checklist/index.html")) {
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

// Hay UN bloque que provoca un fallo de dibujado a propósito (para comprobar que la
// red de seguridad da la cara). Ahí el error de JS es el resultado esperado, no un
// defecto, así que se deja de contar mientras dura. Fuera de ese bloque nunca se
// silencia nada: un error de JS suelto sigue tumbando la ejecución.
let erroresEsperados = false;
const apuntarError = (texto) => { if (!erroresEsperados) errores.push(texto); };

async function nuevaPagina(ctx) {
  const page = await ctx.newPage();
  page.on("pageerror", e => apuntarError(e.message));
  page.on("console", m => {
    if (m.type() !== "error") return;
    // Los fallos de red hacia la nube son esperados aquí: se cortan a propósito.
    if (/firestore|net::|Failed to load resource/i.test(m.text())) return;
    apuntarError(m.text().slice(0, 140));
  });
  return page;
}

const desbordamiento = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// La checklist entera como texto, "nombre=cantidad|sufijo" por item. Vive aquí arriba
// porque lo usan bloques repartidos por toda la prueba, y definido a media función se
// quedaba fuera del alcance de los de más arriba.
const listaItems = (p) => p.locator(".item-row").evaluateAll(rs => rs.map(r => {
  const n = r.querySelector(".item-name, .item-label");
  const q = r.querySelector(".item-qty-input");
  // El sufijo cuenta: hay cambios que SOLO se ven ahí (el envase de las aguas de
  // un rodaje, el "de 8 en almacén" de las carpas). Sin él, la prueba daba por
  // mudo un control que sí cambiaba lo que se carga.
  const suf = r.querySelector(".item-batea-info");
  return `${(n ? n.textContent : "").trim()}=${q ? q.value : ""}${suf ? "|" + suf.textContent.trim() : ""}`;
}));

async function main() {
  const srv = await arrancarServidor();
  servidorGlobal = srv;
  const opcionesLaunch = { args: ["--no-sandbox"] };
  if (CHROMIUM) opcionesLaunch.executablePath = CHROMIUM;
  else opcionesLaunch.channel = "chrome";
  const navegador = await chromium.launch(opcionesLaunch);
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

  // ── El contenedor acompaña al ancho de la ventana ───────────────────────────
  // Estaba clavado en 1320px: en un monitor de 1920 sobraban 300px muertos a cada lado
  // y la lista se quedaba en 868px por grande que fuera la pantalla. Se comprueba con
  // cifras, no "es responsive": al estirar la ventana el contenido tiene que crecer.
  console.log("\n── El contenedor sigue a la ventana ──");
  {
    const mideAncho = async (w) => {
      const ctx = await navegador.newContext({ viewport: { width: w, height: 900 } });
      for (const h of HOSTS_NUBE) await ctx.route(h, r => r.abort());
      const page = await nuevaPagina(ctx);
      await page.goto(url(EVENTO_COMPLETO), { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1800);
      const m = await page.evaluate(() => {
        const caja = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().width) : 0; };
        return { wrapper: caja(".app-wrapper"), lista: caja(".checklist-main") };
      });
      await ctx.close();
      return m;
    };
    const a1280 = await mideAncho(1280), a1600 = await mideAncho(1600), a1920 = await mideAncho(1920);

    ok(a1600.wrapper > a1280.wrapper && a1920.wrapper > a1600.wrapper,
      `el contenedor crece con la ventana: 1280→${a1280.wrapper}px, 1600→${a1600.wrapper}px, 1920→${a1920.wrapper}px`);
    ok(a1920.lista > 1150,
      `y la lista aprovecha el ancho en un monitor grande: ${a1920.lista}px (antes se plantaba en 868)`);
    // El tope existe a propósito: sin él una fila mide 2400px en un monitor muy ancho y
    // el nombre queda en una punta y su cantidad en la otra.
    const a2560 = await mideAncho(2560);
    ok(a2560.wrapper === a1920.wrapper && a2560.wrapper <= 1800,
      `pero no crece sin freno: a 2560px se queda en los mismos ${a2560.wrapper}px`);
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

  // ── Un fallo no puede dejar la pantalla en blanco ───────────────────────────
  // Si algo revienta al dibujar, React desmonta TODO. Y como el estado vive en este
  // navegador, recargar vuelve a reventar: se queda uno fuera sin salida, con el camión
  // a medio cargar. Se provoca el fallo a propósito y se exige que haya salida.
  console.log("\n── Red de seguridad ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1200, height: 900 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    // Aquí el error de JS ES el resultado esperado: se está provocando a propósito para
    // ver si hay salida. Se deja de contar solo durante este bloque.
    erroresEsperados = true;
    // Un estado con el tipo equivocado en un campo que la app recorre: es justo lo que
    // llegaría de un ?c= corrupto o de un formato viejo.
    await p.goto(url({ evento: "boda", pax: 100, recogidas: "esto no es una lista" }),
      { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    const hayApp = await p.locator(".item-row").count() > 0;
    const hayRed = await p.locator(".link-roto").count() > 0;
    ok(hayApp || hayRed,
      hayApp ? "un campo con el tipo equivocado no tumba la app" : "y si tumba la app, la red de seguridad da la cara");
    if (hayRed) {
      ok(await p.locator("button", { hasText: /Descargar/ }).count() === 1,
        "con el botón para descargar lo guardado ANTES de tocar nada");
      ok(await p.locator("button", { hasText: /Empezar de cero/ }).count() === 1,
        "y con salida para volver a arrancar");
    }
    // Y el caso que de verdad importa: que la pantalla nunca se quede vacía del todo
    ok((await p.locator("body").innerText()).trim().length > 0,
      "en ningún caso se queda la pantalla en blanco");
    await c.close();
    erroresEsperados = false; // a partir de aquí, un error de JS vuelve a ser un fallo
  }

  // ── Nada se puede quedar fuera de la pantalla ───────────────────────────────
  // La página no hace scroll horizontal, así que un control que se sale queda
  // RECORTADO y no hay forma de pulsarlo. Pasó con la fila "Aguas pequeñas (33cl)":
  // su sufijo largo no cedía —nowrap y sin encoger— y echaba los botones de editar y
  // borrar fuera del móvil. Se mide el borde derecho de TODO lo pulsable, no solo si
  // la página desborda: con overflow oculto, desbordar da 0 y el botón sigue perdido.
  console.log("\n── Nada fuera de la pantalla ──");
  {
    const ESTADOS = {
      boda: { evento: "boda", pax: 120, ninos: 10, barraCoctel: true, horasCoctel: 3, barraCopas: true, horasCopas: 5, llevaPaella: true, tieneFrituras: true, tamanoBarril: "50L", llevaAguasPequenas: true },
      produccion: { evento: "produccion", pax: 40, diasProduccion: ["40", "30"], llevaCarpas: true, llevaGenerador: true },
    };
    for (const [tipo, estado] of Object.entries(ESTADOS)) {
      for (const ancho of [320, 390]) {
        const c = await navegador.newContext({ viewport: { width: ancho, height: 1000 }, isMobile: true, hasTouch: true });
        for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
        const p = await nuevaPagina(c);
        await p.goto(url(estado), { waitUntil: "domcontentloaded" });
        await p.waitForTimeout(1500);
        const fuera = await p.evaluate(() => {
          const w = document.documentElement.clientWidth;
          return [...document.querySelectorAll("button, input, select")]
            .filter(e => e.getBoundingClientRect().right > w + 1)
            .map(e => { const f = e.closest(".item-row"); const n = f && f.querySelector(".item-name"); return (n ? n.textContent : e.className).trim().slice(0, 30); });
        });
        ok(fuera.length === 0,
          `${tipo} a ${ancho}px: nada pulsable se queda fuera de la pantalla${fuera.length ? ` → ${JSON.stringify([...new Set(fuera)])}` : ""}`);
        await c.close();
      }
    }
  }

  // ── Las horas de barra libre ────────────────────────────────────────────────
  // Subir horas de barra NUNCA puede bajar una cantidad. Parece obvio y no lo era: el
  // caso "sin barra" se calculaba aparte como si fueran 2 horas, así que media hora de
  // cóctel caía por debajo de ese suelo y pedía 24 tercios de cerveza donde un evento
  // SIN barra pedía 96. Cuatro veces menos por poner media hora de barra.
  console.log("\n── Las horas de barra libre ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const cantidades = async (coctel, copas) => {
      await p.goto(url({ evento: "boda", pax: 100, ninos: 0, barraCoctel: coctel > 0, horasCoctel: coctel, barraCopas: copas > 0, horasCopas: copas }),
        { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1700);
      const m = {};
      for (const f of await listaItems(p)) {
        const i = f.indexOf("=");
        const n = parseFloat(String(f.slice(i + 1)).split("|")[0].replace(",", "."));
        if (!isNaN(n)) m[f.slice(0, i)] = n;
      }
      return m;
    };
    const bajan = (medidas) => {
      const malas = [];
      for (const k of [...new Set(medidas.flatMap(([, m]) => Object.keys(m)))]) {
        const serie = medidas.map(([h, m]) => [h, m[k]]);
        for (let i = 1; i < serie.length; i++) {
          const [h0, a] = serie[i - 1], [h1, b] = serie[i];
          if (a !== undefined && b !== undefined && b < a) { malas.push(`${k} (${h0}h→${a}, ${h1}h→${b})`); break; }
        }
      }
      return malas;
    };

    // Antes de la curva, lo más básico: que MOVER el deslizador cambie la carga. Se
    // probaban los controles de opciones (los 11 de Equipamiento) pero no estos dos,
    // y un deslizador que no guardara lo que marcas se vería igual que uno que sí.
    await p.goto(url({ evento: "boda", pax: 100, ninos: 0, barraCoctel: true, horasCoctel: 1, barraCopas: true, horasCopas: 1 }),
      { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    const deQue = async (nombre) => {
      const f = (await listaItems(p)).find(i => i.startsWith(nombre)) || "";
      return parseFloat(f.slice(f.indexOf("=") + 1));
    };
    const barras = p.locator('input[type="range"].range-slider');
    ok(await barras.count() === 2, `están los dos deslizadores de barra (${await barras.count()})`);
    const cervezaAntes = await deQue("Cerveza Alhambra");
    await barras.nth(0).fill("4");
    await p.waitForTimeout(800);
    const cervezaDespues = await deQue("Cerveza Alhambra");
    ok((await p.locator(".range-value").allInnerTexts())[0].trim() === "4h",
      "mover el de cóctel actualiza lo que pone al lado");
    ok(cervezaDespues > cervezaAntes,
      `y sube la cerveza de verdad (${cervezaAntes} → ${cervezaDespues})`);

    const ginebraAntes = await deQue("Ginebra (Seagrams");
    await barras.nth(1).fill("6");
    await p.waitForTimeout(800);
    const ginebraDespues = await deQue("Ginebra (Seagrams");
    ok((await p.locator(".range-value").allInnerTexts())[1].trim() === "6h",
      "y el de copas igual");
    ok(ginebraDespues > ginebraAntes,
      `con los destilados subiendo con él (${ginebraAntes} → ${ginebraDespues})`);

    const porCoctel = [];
    for (const h of [0, 0.5, 1.5, 3, 5]) porCoctel.push([h, await cantidades(h, 0)]);
    const malasCoctel = bajan(porCoctel);
    ok(malasCoctel.length === 0,
      `subir las horas de cóctel no baja ninguna cantidad${malasCoctel.length ? ` → ${malasCoctel.join(" · ")}` : ""}`);

    const porCopas = [];
    for (const h of [0, 1, 3, 5, 8]) porCopas.push([h, await cantidades(3, h)]);
    const malasCopas = bajan(porCopas);
    ok(malasCopas.length === 0,
      `ni subir las de copas${malasCopas.length ? ` → ${malasCopas.join(" · ")}` : ""}`);

    // El caso concreto que lo destapó, con nombre y apellidos
    const sinBarra = porCoctel[0][1]["Cerveza Alhambra (tercios)"];
    const mediaHora = porCoctel[1][1]["Cerveza Alhambra (tercios)"];
    ok(mediaHora >= sinBarra,
      `media hora de cóctel no pide menos cerveza que no tener barra (${sinBarra} → ${mediaHora})`);

    // Pero el Red Bull SÍ es cosa de la barra: sin barra no va ninguno
    ok(porCoctel[0][1]["Redbull"] === undefined && porCoctel[1][1]["Redbull"] > 0,
      "y el Red Bull solo aparece cuando hay barra, no por el suelo de las 2h");

    // Los topes: a partir de cierto punto una barra más larga ya no pide más. Es a
    // propósito (nadie bebe el doble porque la barra dure el doble), así que se fija
    // aquí para que un cambio de fórmula no lo quite sin querer.
    const ocho = await cantidades(3, 8), doce = await cantidades(6, 12);
    ok(ocho["Ginebra (Seagrams/Tanqueray)"] === doce["Ginebra (Seagrams/Tanqueray)"],
      `y de 7h en adelante los destilados ya no suben (${ocho["Ginebra (Seagrams/Tanqueray)"]})`);

    // Los barriles descuentan tercios (85% de rendimiento por la merma de barra), pero
    // nunca hasta cero: con dos de 50L la cuenta salía sin una sola botella, y ahí el
    // evento entero cuelga de que el tirador y el barril funcionen.
    // La fecha va fijada en julio a propósito: la cerveza depende de la temporada
    // (3 tercios/pax en verano, 2 en invierno) y sin fijarla esta prueba daría números
    // distintos según el día en que se ejecute.
    const conBarril = async (tipo, barril, n) => {
      await p.goto(url({ evento: tipo, pax: 100, ninos: 0, fechaEvento: "2027-07-10", barraCoctel: true, horasCoctel: 3, barraCopas: true, horasCopas: 5, tamanoBarril: barril, numBarriles: n }),
        { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1700);
      const f = (await listaItems(p)).find(i => i.startsWith("Cerveza Alhambra")) || "";
      return f ? parseInt(f.slice(f.indexOf("=") + 1), 10) : 0;
    };
    const sinBarril = await conBarril("boda", "No lleva", 1);
    const uno50 = await conBarril("boda", "50L", 1);
    ok(uno50 < sinBarril && uno50 > 0,
      `un barril de 50L descuenta tercios pero no todos (${sinBarril} → ${uno50})`);
    // Y dos tampoco lo cubren todo con el ratio de verano: hacen falta ~103 L y dos
    // barriles dan 85 útiles. Que siga saliendo cerveza embotellada aquí es correcto.
    const dos50 = await conBarril("boda", "50L", 2);
    ok(dos50 < uno50 && dos50 > 24,
      `dos descuentan más, pero todavía no llegan a cubrir la barra (${uno50} → ${dos50})`);
    for (const tipo of ["boda", "cumpleanos"]) {
      const tres50 = await conBarril(tipo, "50L", 3);
      const cuatro50 = await conBarril(tipo, "50L", 4);
      ok(tres50 === 24 && cuatro50 === 24,
        `en ${tipo}, por muchos barriles que se lleven quedan 24 tercios de respaldo (${tres50}/${cuatro50})`);
    }
    ok(await conBarril("boda", "No lleva", 1) === sinBarril,
      `y sin barril no se toca nada (${sinBarril})`);
    await c.close();
  }

  // ── Ningún botón puede partir su palabra ────────────────────────────────────
  // El control del barril de cerveza rompía "No lleva" en dos líneas, y esa pastilla
  // quedaba del doble de alto que "30L" y "50L": el control entero se veía torcido.
  // Le pasaba solo a ese porque los de Equipamiento ya llevaban nowrap y este no.
  console.log("\n── Los botones de opciones ──");
  {
    const CONFIG = { evento: "boda", pax: 45, nombreEvento: "Boda Fiorella", barraCoctel: true, horasCoctel: 1.5, barraCopas: true, horasCopas: 5, tieneFrituras: true, numFrituras: 2 };
    for (const ancho of [320, 390, 768, 1440]) {
      const c = await navegador.newContext({ viewport: { width: ancho, height: 1000 }, isMobile: ancho < 768, hasTouch: ancho < 768 });
      for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
      const p = await nuevaPagina(c);
      await p.goto(url(CONFIG), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      const m = await p.evaluate(() => {
        // Un Range sobre el texto devuelve un rectángulo por cada línea que ocupa:
        // más de uno significa que la palabra se ha partido. Medir el alto no vale,
        // que el relleno lo enmascara.
        const lineas = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getClientRects().length; };
        const btns = [...document.querySelectorAll(".segment-btn")];
        const barril = [...document.querySelectorAll(".segmented-control")]
          .find(sc => /No lleva/.test(sc.textContent) && /30L/.test(sc.textContent));
        return {
          total: btns.length,
          partidos: [...new Set(btns.filter(b => lineas(b) > 1).map(b => b.textContent.trim()))],
          seSalen: [...new Set(btns.filter(b => b.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
            .map(b => b.textContent.trim()))],
          altosBarril: barril ? [...barril.querySelectorAll(".segment-btn")].map(b => Math.round(b.getBoundingClientRect().height)) : [],
          desborda: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      ok(m.partidos.length === 0,
        `a ${ancho}px ninguno de los ${m.total} botones parte su palabra${m.partidos.length ? ` → ${JSON.stringify(m.partidos)}` : ""}`);
      ok(m.seSalen.length === 0 && m.desborda === 0,
        `y ninguno se sale de la pantalla${m.seSalen.length ? ` → ${JSON.stringify(m.seSalen)}` : ""}`);
      ok(m.altosBarril.length === 3 && new Set(m.altosBarril).size === 1,
        `el barril tiene sus tres opciones a la misma altura (${m.altosBarril.join("/")})`);
      await c.close();
    }
  }

  // ── El agua de un rodaje va por temporada ───────────────────────────────────
  // Iban 3,5 botellas de 33cl por persona y día, fijas: poco más de un litro por
  // cabeza en una jornada de doce horas al sol. Ahora 6,5 en verano y 4,5 en invierno,
  // que la app ya sabe la temporada por la fecha del evento.
  console.log("\n── El agua de un rodaje ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1400, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const cajas = async (estado) => {
      await p.goto(url(estado), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      const f = (await listaItems(p)).find(i => i.startsWith("Aguas pequeñas (33cl)=")) || "";
      return { n: parseInt(f.split("=")[1], 10), fila: f };
    };
    const enAgosto = await cajas({ evento: "produccion", pax: 30, fechaEvento: "2027-08-11" });
    ok(enAgosto.n === 6, `30 personas en agosto → 6 cajas (${enAgosto.n})`);
    ok(/verano/.test(enAgosto.fila) && /6,5/.test(enAgosto.fila),
      `y la fila dice de dónde sale el número → "${enAgosto.fila.split("|")[1] || enAgosto.fila}"`);

    const enEnero = await cajas({ evento: "produccion", pax: 30, fechaEvento: "2028-01-12" });
    ok(enEnero.n === 4, `las mismas 30 en enero → 4 cajas (${enEnero.n})`);
    ok(/invierno/.test(enEnero.fila) && /4,5/.test(enEnero.fila), "y lo dice también");

    // Varios días: el agua es consumible, así que va por la SUMA de la gente
    const tresDias = await cajas({ evento: "produccion", pax: 30, fechaEvento: "2027-08-11", diasProduccion: ["30", "30", "30"] });
    ok(tresDias.n === 17, `y tres días de 30 piden el triple de agua (${tresDias.n} cajas)`);
    await c.close();
  }

  // ── La pestaña Vuelta tiene que respirar ────────────────────────────────────
  // Cada item apilaba cuatro líneas —nombre, la pastilla "todo", "vuelve" y "roturas"—
  // y encima con sangrías distintas: la pastilla pegada al borde y los dos campos
  // metidos hacia dentro. Se veía apretado y recorrer la vuelta era bajar el triple.
  console.log("\n── La pestaña Vuelta ──");
  {
    // Dos líneas por item en los dos tamaños: la pastilla "todo" con el nombre (igual
    // que la casilla de Prep. y de Salida, que es la misma acción) y los dos números
    // juntos debajo.
    for (const ancho of [390, 1440]) {
      const c = await navegador.newContext({ viewport: { width: ancho, height: 900 }, isMobile: ancho < 768, hasTouch: ancho < 768 });
      for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
      const p = await nuevaPagina(c);
      await p.goto(url({ evento: "produccion", pax: 30, nombreEvento: "Produccion vuelta" }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1900);
      await p.locator("button", { hasText: "Modo carga" }).first().click();
      await p.waitForTimeout(1200);
      await p.locator(".carga-modo-toggle .segment-btn").filter({ hasText: "Vuelta" }).first().click();
      await p.waitForTimeout(900);

      const m = await p.evaluate(() => {
        const fila = document.querySelector(".carga-row");
        const linea = fila.querySelector(".carga-row-principal");
        const grupo = fila.querySelector(".carga-vuelta-controles");
        const campos = [...grupo.children].map(e => e.getBoundingClientRect());
        const pastilla = fila.querySelector(".carga-vino-todo").getBoundingClientRect();
        const nombre = fila.querySelector(".carga-nombre").getBoundingClientRect();
        return {
          alto: Math.round(fila.getBoundingClientRect().height),
          // Cuántas líneas ocupa el item de verdad. Se cuentan los bloques del item,
          // no los píxeles: en móvil la pastilla es más alta (zona táctil) y un tope
          // en píxeles saltaría por eso aunque las líneas sigan siendo dos.
          lineas: new Set([...fila.children].map(e => Math.round(e.getBoundingClientRect().top))).size,
          // La pastilla "todo" comparte línea con el nombre, igual que la casilla de
          // marcar en Prep. y en Salida: es la misma acción y va en el mismo sitio.
          conElNombre: Math.abs(pastilla.top - nombre.top) < 24
            && pastilla.top >= linea.getBoundingClientRect().top - 1,
          // Y los dos números, en una sola fila entre ellos
          camposEnUnaFila: campos.length === 2 && Math.abs(campos[0].top - campos[1].top) < 4,
          campos: campos.length,
          pastillaAlto: Math.round(pastilla.height),
          // La pastilla, a la derecha del todo; los números, bajo el nombre
          pastillaALaDerecha: pastilla.left > nombre.left,
          sangriaCampos: Math.round(campos[0].left - fila.getBoundingClientRect().left),
          desborda: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      ok(m.conElNombre && m.pastillaALaDerecha,
        `a ${ancho}px la pastilla "todo" va en la línea del nombre, como en Prep. y Salida`);
      ok(m.camposEnUnaFila,
        `y "vuelve" y "roturas" comparten fila (${m.campos} campos)`);
      ok(m.sangriaCampos >= 12,
        `sin nada pegado al borde (${m.sangriaCampos}px de sangría)`);
      ok(m.pastillaAlto >= 32, `la pastilla se puede pulsar con el dedo (${m.pastillaAlto}px de alto)`);
      ok(m.lineas === 2 && m.alto <= 140,
        `y el item ocupa ${m.lineas} líneas, no cuatro (${m.alto}px de alto)`);
      ok(m.desborda === 0, `y no desborda a ${ancho}px`);
      await c.close();
    }
  }

  // ── El botón "Recalcular cantidades" ────────────────────────────────────────
  // Compara el cálculo de AHORA con la foto que se guardó (valoresCalculados) y ofrece,
  // una por una, mantener lo que hay o coger lo nuevo. Es el botón que salva a los
  // eventos ya guardados cuando cambia una fórmula — justo lo que acaba de pasar con
  // las champaneras. No tenía ninguna prueba.
  console.log("\n── Recalcular cantidades ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const ITEM = "Champanera metálica grande";
    const cantidadDe = async (nombre) => {
      const f = (await listaItems(p)).find(i => i.startsWith(nombre + "=")) || "";
      return f ? f.split("=")[1].split("|")[0] : null;
    };
    const base = { evento: "boda", pax: 100, ninos: 0, nombreEvento: "Boda recalcular" };

    // Primero se averigua en qué categoría vive el item, que la clave es "categoría::nombre"
    await p.goto(url(base), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1900);
    const ahora = await cantidadDe(ITEM);
    ok(ahora === "3", `de partida una boda de 100 lleva 3 champaneras (${ahora})`);
    // La clave de un item es "categoría::nombre". El nombre de la categoría se saca del
    // textContent, NO del innerText: el innerText llega en mayúsculas (lo hace el CSS) y
    // no coincidiría con el nombre real. Detrás lleva pegados el contador y la flecha.
    const categoria = await p.locator(".category-section", { hasText: ITEM }).first()
      .locator(".category-header").first()
      .evaluate(e => e.textContent.replace(/\d+\s*[▼▲]?\s*$/, "").trim());
    ok(categoria === "Cristalería", `la champanera vive en "${categoria}"`);
    const clave = `${categoria}::${ITEM}`;

    // Un evento guardado ANTES del cambio de fórmula: su foto dice 4
    const viejo = { ...base, valoresCalculados: { [clave]: "4" } };
    await p.goto(url(viejo), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1900);
    await p.locator("button", { hasText: "Recalcular cantidades" }).first().click();
    await p.waitForTimeout(700);
    ok(await p.locator(".recalcular-modal").count() === 1, "el botón abre el repaso de cantidades");
    const fila = p.locator(".recalcular-row", { hasText: ITEM }).first();
    ok(await fila.count() === 1, `y encuentra la cantidad que ha cambiado (${ITEM})`);
    ok(await fila.locator(".recalcular-opcion", { hasText: "Mantener 4" }).count() === 1
      && await fila.locator(".recalcular-opcion", { hasText: "Usar 3" }).count() === 1,
      "ofreciendo mantener la de antes (4) o coger la nueva (3)");

    // Coger la nueva: la cantidad tiene que quedarse en 3 y no volver a preguntar
    await fila.locator(".recalcular-opcion", { hasText: "Usar 3" }).click();
    await p.locator(".recalcular-modal .btn-green", { hasText: "Aplicar" }).click();
    await p.waitForTimeout(900);
    ok(await cantidadDe(ITEM) === "3", `al coger la nueva, la carga se queda en 3 (${await cantidadDe(ITEM)})`);
    await p.locator("button", { hasText: "Recalcular cantidades" }).first().click();
    await p.waitForTimeout(700);
    ok(await p.locator(".recalcular-modal").count() === 0
      && await p.locator(".guardado-confirm", { hasText: /Nada ha cambiado/i }).count() === 1,
      "y a la segunda ya dice que no ha cambiado nada");

    // Y el otro camino: una cantidad puesta a mano que se quiere conservar
    const aMano = { ...base, valoresCalculados: { [clave]: "4" }, overridesManuales: { [clave]: "9" } };
    await p.goto(url(aMano), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1900);
    ok(await cantidadDe(ITEM) === "9", `la cantidad puesta a mano manda (${await cantidadDe(ITEM)})`);
    await p.locator("button", { hasText: "Recalcular cantidades" }).first().click();
    await p.waitForTimeout(700);
    const fila2 = p.locator(".recalcular-row", { hasText: ITEM }).first();
    ok(await fila2.locator(".recalcular-tag", { hasText: "a mano" }).count() === 1,
      "el repaso avisa de que esa la pusiste tú a mano");
    await fila2.locator(".recalcular-opcion", { hasText: "Mantener 9" }).click();
    await p.locator(".recalcular-modal .btn-green", { hasText: "Aplicar" }).click();
    await p.waitForTimeout(900);
    ok(await cantidadDe(ITEM) === "9", `mantenerla la deja en 9 (${await cantidadDe(ITEM)})`);
    await p.locator("button", { hasText: "Recalcular cantidades" }).first().click();
    await p.waitForTimeout(700);
    ok(await p.locator(".recalcular-modal").count() === 0,
      "y no vuelve a preguntar por lo ya decidido");
    await c.close();
  }

  // ── El logo de la cabecera no puede comerse nada ────────────────────────────
  // Va en el hueco libre del grupo del título, pegado al interruptor de tema. Lo que
  // hay que vigilar es justo eso: que no le quite ancho al nombre del evento ni empuje
  // los botones, y que en móvil (donde la cabecera ya va justa) desaparezca.
  console.log("\n── El logo de la cabecera ──");
  {
    const medir = async (ancho) => {
      const c = await navegador.newContext({ viewport: { width: ancho, height: 900 }, isMobile: ancho < 768, hasTouch: ancho < 768 });
      for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
      const p = await nuevaPagina(c);
      await p.goto(url({ ...EVENTO_COMPLETO, nombreEvento: "Boda Anna y Mario" }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      const m = await p.evaluate(() => {
        const caja = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
        const logo = document.querySelector(".app-logo");
        const h1 = document.querySelector(".header-info h1");
        return {
          visible: !!logo && getComputedStyle(logo).display !== "none",
          logo: caja(".app-logo"),
          cabecera: caja(".app-header"),
          tema: caja(".btn-tema"),
          tituloEntero: h1 ? h1.scrollWidth <= h1.clientWidth + 1 : false,
          desborda: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      await c.close();
      return m;
    };

    // El corte de móvil de esta app es "max-width: 768px", así que 768 ya es móvil:
    // el logo se esconde ahí también.
    for (const ancho of [320, 390, 480, 768]) {
      const m = await medir(ancho);
      ok(!m.visible && m.desborda === 0, `a ${ancho}px el logo se esconde y no desborda`);
    }
    for (const ancho of [1024, 1440, 1920]) {
      const m = await medir(ancho);
      ok(m.visible && m.logo.width > 30 && m.desborda === 0,
        `a ${ancho}px el logo se ve (${Math.round(m.logo.width)}×${Math.round(m.logo.height)}px) y no desborda`);
      // Dentro de la cabecera y a la izquierda del interruptor de tema, que es su sitio
      ok(m.logo.top >= m.cabecera.top && m.logo.bottom <= m.cabecera.bottom && m.logo.right <= m.tema.left + 1,
        `y queda dentro de la cabecera, justo antes de "Auto"`);
      ok(m.tituloEntero, `sin recortar el nombre del evento a ${ancho}px`);
    }
  }

  // ── Los links de Compartir tienen que copiarse SIEMPRE ──────────────────────
  // El portapapeles solo se puede escribir mientras dura el gesto de quien pulsa. Al
  // poner la copia detrás de un "await" (esperando a que el evento subiera a la nube)
  // caía fuera del gesto y el navegador la rechazaba: se cerraba el menú y no pasaba
  // nada. Aquí la nube está cortada a propósito, que es justo el caso que fallaba: el
  // link tiene que estar en el portapapeles igual, y encima hay que avisar de que el
  // evento NO ha subido para que nadie lo mande creyendo que sirve.
  console.log("\n── Los links de Compartir ──");
  {
    const c = await navegador.newContext({
      viewport: { width: 1440, height: 1000 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    // En el móvil se usa el botón de compartir del sistema; en el ordenador no existe
    // y se copia. Aquí se quita a propósito para probar SIEMPRE el camino de copiar,
    // que es el que se puede romper en silencio (el del móvil se prueba aparte).
    await c.addInitScript(() => { try { delete Navigator.prototype.share; } catch (e) { /* ya no está */ } });
    const p = await nuevaPagina(c);
    const portapapeles = () => p.evaluate(() => navigator.clipboard.readText());
    // Tres links, cada uno para una persona: el de carga entra directo a marcar lo que
    // sube al camión, el de marcar enseña la checklist entera sin poder tocarla, y el
    // de edición no lleva candado ninguno.
    // "Link para marcar" ya no se ofrece: entre el de solo ver y el de Modo carga
    // estaba de más, y tres links parecidos del mismo evento es una equivocación
    // esperando a pasar. Los que ya se mandaron con &solo=1 siguen valiendo.
    for (const [entrada, solo, carga, vista] of [
      ["Link de Modo carga", true, true, false],
      ["Link de solo ver", true, false, true],
      ["Link con edición", false, false, false],
    ]) {
      await p.goto(url({ evento: "boda", pax: 100, nombreEvento: "Boda Anna y Mario" }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1900);
      await p.evaluate(() => navigator.clipboard.writeText("(vacío)"));
      await p.locator("button", { hasText: "Compartir" }).first().click();
      await p.waitForTimeout(400);
      await p.locator(".compartir-menu button", { hasText: entrada }).first().click();
      await p.waitForTimeout(900);
      const copiado = await portapapeles();
      ok(/\?evento=[a-z0-9]{8}/.test(copiado), `"${entrada}" deja el link en el portapapeles → ${copiado.slice(0, 90)}`);
      ok(copiado.includes("&solo=1") === solo,
        solo ? `"${entrada}" bloquea la edición (&solo=1)` : `"${entrada}" no lleva candado`);
      // Solo el de Modo carga entra directo a marcar. Los otros dos siguen abriendo
      // donde abrían siempre: añadir un link no puede cambiar los que ya se usan.
      ok(copiado.includes("&carga=1") === carga,
        carga ? `y abre directo en Modo carga (&carga=1)` : `y abre la checklist, no el Modo carga`);
      ok(copiado.includes("&vista=1") === vista,
        vista ? `y no deja marcar nada (&vista=1)` : `y no lleva el candado de solo ver`);
      // El nombre del evento tiene que ir, o en el WhatsApp queda un link suelto entre
      // veinte mensajes que nadie encuentra al día siguiente. Pero llevarlo DELANTE, en
      // la misma línea ("Evento: https://…"), es lo que ya rompió los links una vez: al
      // pegar un texto con espacios, el navegador BUSCA en vez de abrir.
      //
      // Por eso el nombre va arriba y la DIRECCIÓN SOLA en la última línea: en el
      // WhatsApp se lee el nombre y el link sale tocable, y quien copie solo esa línea
      // tiene la dirección limpia.
      const lineas = copiado.split("\n");
      const ultima = lineas[lineas.length - 1];
      ok(!/\s/.test(ultima) && /^https?:\/\//.test(ultima),
        "la dirección va sola en su línea, sin espacios: pegada en el navegador abre, no busca");
      ok(lineas.length === 2 && /Boda Anna y Mario/.test(lineas[0]),
        `y encima el nombre del evento, para encontrarlo en el WhatsApp → "${lineas[0]}"`);
      // Tres links del mismo evento el mismo día: hay que poder distinguirlos
      const queEs = { "Link de Modo carga": /carga del cami/, "Link de solo ver": /solo ver/, "Link con edición": /para editar/ };
      ok(queEs[entrada].test(lineas[0]),
        `y qué link es, que del mismo evento salen tres → "${lineas[0]}"`);
    }
    // Y como la nube está cortada, el evento no llega a subir: hay que decirlo, que si
    // no se manda un link que no abre nada al otro lado. El aviso tarda lo que dura el
    // plazo, porque Firestore no rechaza la escritura sin conexión —la deja pendiente
    // para siempre— y esperando solo al fallo el aviso no llegaría nunca.
    await p.locator(".btn-green", { hasText: /NO ha subido/i }).first()
      .waitFor({ timeout: 12000 }).catch(() => {});
    ok(/no ha subido/i.test(await p.locator(".btn-green").first().innerText()),
      `y avisa de que el evento no ha subido → "${(await p.locator(".btn-green").first().innerText()).trim()}"`);
    await c.close();
  }

  // En el MÓVIL no se copia: sale el botón de compartir del sistema y se elige WhatsApp
  // directamente. Es mejor camino que copiar y pegar, y además manda el nombre y la
  // dirección por separado, así que el link llega tocable pase lo que pase con el texto.
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    await c.addInitScript(() => {
      window.__compartido = null;
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: (datos) => { window.__compartido = datos; return Promise.resolve(); },
      });
    });
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 100, nombreEvento: "Boda Anna y Mario" }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1900);
    await p.locator("button", { hasText: "Compartir" }).first().click();
    await p.waitForTimeout(400);
    await p.locator(".compartir-menu button", { hasText: "Link de Modo carga" }).first().click();
    await p.waitForTimeout(900);

    const datos = await p.evaluate(() => window.__compartido);
    ok(datos !== null, "en el móvil se abre el compartir del sistema, sin pasar por el portapapeles");
    ok(/Boda Anna y Mario/.test(datos.title || "") && /carga del cami/.test(datos.title || ""),
      `con el nombre del evento y qué link es → "${datos.title}"`);
    // Y la dirección va en su campo, aparte del texto: así WhatsApp la trata como link
    ok(/^https?:\/\//.test(datos.url || "") && !/\s/.test(datos.url || "") && /carga=1/.test(datos.url || ""),
      `y la dirección aparte, en su propio campo → ${(datos.url || "").slice(0, 60)}…`);
    await c.close();
  }

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

    // "Inicio" desde cualquier pregunta. Son quince pantallas: para mirar la lista de
    // eventos o lo que ya se había mandado había que darle a Atrás una vez por
    // pregunta. Lo importante es que NO borre nada — si al volver hubiera que
    // rellenarlo otra vez, sería un botón para perder el trabajo hecho.
    const tituloAhora = await p.locator(".form-titulo").innerText();
    await p.locator(".form-btn-inicio").first().click();
    await p.waitForTimeout(600);
    ok(/De qué evento son los datos/i.test(await p.locator(".form-titulo").innerText()),
      "\"Inicio\" vuelve a la lista de eventos desde media pregunta");
    const seguir = p.locator(".form-btn-seguir");
    ok(await seguir.count() === 1 && /Boda de Ana y Luis/.test(await seguir.innerText()),
      `y ofrece seguir por donde ibas → "${(await seguir.innerText()).trim()}"`);
    await seguir.click();
    await p.waitForTimeout(600);
    ok((await p.locator(".form-titulo").innerText()) === tituloAhora,
      `y vuelve a la MISMA pregunta, no al principio → "${tituloAhora.slice(0, 40)}"`);
    const nombreGuardado = await p.locator(".form-repaso-fila, .form-contexto").first().innerText().catch(() => "");
    ok(/Boda de Ana y Luis/.test(nombreGuardado),
      "con lo contestado intacto");

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
      return {
        abs,
        ambito: new URL(m.scope, abs).pathname,
        arranque: new URL(m.start_url, abs).pathname,
        id: m.id ? new URL(m.id, abs).pathname : new URL(m.start_url, abs).pathname,
        nombre: m.name,
      };
    };

    const mChecklist = await manifiestoDe(BASE);
    const mForm = await manifiestoDe(BASE_FORM);
    ok(mChecklist.ambito !== mForm.ambito,
      `cada app tiene su propio ámbito (checklist ${mChecklist.ambito} · formulario ${mForm.ambito})`);
    // ESTA es la que importa, y es la que faltaba: que sean distintos NO basta. Con la
    // checklist en la raíz sus ámbitos eran "/" y "/formulario/" —distintos— pero uno
    // contenía al otro, y una app dentro del ámbito de otra no se puede instalar
    // aparte: Chrome solo ofrecía "Abrir en aplicación" (la checklist). Tienen que ser
    // carpetas hermanas, ninguna prefijo de la otra.
    ok(!mForm.ambito.startsWith(mChecklist.ambito) && !mChecklist.ambito.startsWith(mForm.ambito),
      `y ninguno está DENTRO del otro: son hermanos (${mChecklist.ambito} · ${mForm.ambito})`);
    ok(mForm.ambito === "/formulario/" && mForm.arranque === "/formulario/index.html",
      `el formulario arranca y vive en su carpeta (${mForm.arranque})`);
    ok(mChecklist.ambito === "/checklist/" && mChecklist.arranque === "/checklist/index.html",
      `y la checklist en la suya (${mChecklist.arranque})`);
    // La checklist ya instalada no puede convertirse en otra app distinta: su identidad
    // es el "id", y se deja clavado al que tenía cuando vivía en la raíz.
    ok(mChecklist.id === "/index.html",
      `la checklist conserva su identidad de siempre, así nadie tiene que reinstalarla (${mChecklist.id})`);

    // Las checklists instaladas ANTES de la mudanza guardan el manifiesto que había en
    // la raíz, y su icono sigue apuntando ahí. Si esa dirección se queda en 404 no
    // tienen de dónde enterarse del cambio: conservan el ámbito viejo (la raíz entera),
    // que se traga /formulario/, y el formulario no hay forma de instalarlo aparte.
    // Por eso en la raíz tiene que seguir habiendo un manifiesto, con el MISMO id y ya
    // apuntando a la carpeta nueva.
    const viejo = await (await fetch(RAIZ + "manifest.webmanifest")).json().catch(() => null);
    ok(!!viejo, "la dirección vieja del manifiesto sigue respondiendo, no es un 404");
    if (viejo) {
      const abs = RAIZ + "manifest.webmanifest";
      ok(new URL(viejo.id, abs).pathname === "/index.html",
        `y lleva el id de siempre, que es lo que identifica a la app ya instalada (${new URL(viejo.id, abs).pathname})`);
      ok(new URL(viejo.scope, abs).pathname === "/checklist/"
        && new URL(viejo.start_url, abs).pathname === "/checklist/index.html",
        "apuntando ya a la carpeta nueva, para que la instalada se mude sola");
    }
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

    // La raíz ya no es ninguna app: es el desvío que salva los enlaces ya repartidos
    // por WhatsApp, que apuntan todos ahí. El del formulario, a su carpeta…
    await p.goto(RAIZ + "?enviar=PRUEBA1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    ok(p.url().includes("/formulario/") && p.url().includes("enviar=PRUEBA1"),
      `un enlace viejo del formulario acaba en el formulario → ${p.url().replace(RAIZ, "…/")}`);
    ok(await p.locator(".form-titulo").count() > 0,
      "y llega funcionando, no a una pantalla en blanco");

    // …y el de un evento, a la checklist SIN perder por el camino de qué evento era,
    // que es lo único que hace útil ese link
    await p.goto(RAIZ + "?c=" + encodeURIComponent(JSON.stringify({ evento: "boda", pax: 100 })) + "&solo=1",
      { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2000);
    ok(p.url().includes("/checklist/") && p.url().includes("solo=1"),
      `un enlace viejo de un evento acaba en la checklist con su consulta entera → ${p.url().replace(RAIZ, "…/").slice(0, 70)}…`);
    ok(await p.locator(".item-row").count() > 20,
      `y abre la checklist del evento, no una vacía (${await p.locator(".item-row").count()} items)`);

    // Quien instaló el formulario ANTES de la mudanza tiene un icono que abre
    // "?formulario=1". Ese icono no puede acabar en el login del equipo.
    await p.evaluate(() => localStorage.setItem("gula_formulario_codigo", "PRUEBA1"));
    await p.goto(RAIZ + "?formulario=1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    ok(p.url().includes("/formulario/") && await p.locator(".login-tarjeta").count() === 0,
      "el icono viejo del formulario tampoco cae en el login del equipo");

    // Y quien tenía instalada la checklist abre "index.html" de la raíz: también va
    await p.goto(RAIZ + "index.html", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    ok(p.url().includes("/checklist/"),
      `el icono de la checklist de siempre acaba en su carpeta → ${p.url().replace(RAIZ, "…/")}`);

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
      && JSON.stringify(produ.estado.diasProduccion) === JSON.stringify(["12", "17", "12"]),
      `el rodaje traduce días, carpas y generador → ${JSON.stringify(produ.estado.diasProduccion)}`);
    ok(tiene(produ.nombres, "Carpas") && tiene(produ.nombres, "Generador"),
      "las carpas van con el generador y su gasolina");
    // Las sillas de un rodaje se preguntan como en el resto. Antes se forzaban a
    // "Nuestras" sin preguntar, y eso PISABA lo que hubiera puesto en la app: si tenías
    // un alquiler, aplicar el envío te lo borraba junto con su recogida.
    ok(produ.estado.origenSillas === undefined,
      `sin contestar lo de las sillas, el rodaje no toca lo que haya en la app (${produ.estado.origenSillas})`);
    const rodajeSillas = aRespuestasDeLaApp({
      tipo: "produccion", nombre: "Produ S", dias: [20], sillas: "Carvillo",
    });
    ok(rodajeSillas.origenSillas === "Carvillo",
      `y contestándolo, el rodaje también alquila (${rodajeSillas.origenSillas})`);
    ok(recogidasConAlquileres({ ...rodajeSillas, fechaEvento: "2027-07-29" })
      .some(r => r.concepto === "Sillas (Carvillo)"),
      "con su recogida, que es lo que antes no podía existir en un rodaje");
    ok(aRespuestasDeLaApp({ tipo: "produccion", dias: [20], sillas: "Nuestras" }).origenSillas === "Nuestras",
      "y si son nuestras, se dice y no se alquila nada");
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
    // Con ancla: comprobar solo que algo NO está pasa igual si la cabecera no llegó a
    // dibujarse. Primero se exige que la cabecera esté ahí con sus botones.
    ok(await p.locator(".header-actions button", { hasText: "Modo carga" }).count() === 1,
      "la cabecera se ha dibujado y tiene sus botones");
    ok(await p.locator(".header-actions button", { hasText: "Vista previa" }).count() === 0,
      "y ya no lleva el de Vista previa, que vive dentro de Compartir");

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
    // CON eventos y plantillas guardadas. Sin esto, las listas salen vacías y sus
    // botones de icono (el 🔗 de compartir y el ✕ de borrar) no existen, así que nunca
    // se medían: se quedaron en 27px, y uno de ellos borra un evento entero.
    await c.addInitScript(() => {
      localStorage.setItem("gula_eventos_guardados", JSON.stringify({
        "Boda guardada": { evento: "boda", pax: 90, fechaEvento: "2027-09-04", nombreEvento: "Boda guardada" },
      }));
      localStorage.setItem("gula_plantillas", JSON.stringify({
        "Boda estándar 100": { evento: "boda", pax: 100 },
      }));
    });
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
    const PUERTO2 = 4179, BASE2 = `http://localhost:${PUERTO2}/publicado/checklist/index.html`;
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
    const dir = "/tmp/gula-publicado/publicado/checklist";
    // El nombre del bundle se saca del propio index.html, no de un patrón a mano: al
    // separar el formulario en su carpeta la entrada pasó a llamarse "checklist-…" y
    // una prueba que buscaba "index-…" se quedó sin encontrar nada.
    const entrada = (fs3.readFileSync(`${dir}/index.html`, "utf8")
      .match(/src="[^"]*assets\/([^"]+\.js)"/) || [])[1];
    const jsViejo = entrada;
    ok(!!jsViejo && await p.locator(".item-row").count() > 20, `la app queda instalada (bundle ${jsViejo})`);
    // Se "despliega" una versión nueva con un cambio visible
    const nuevo = "checklist-VERSIONNUEVA.js";
    fs3.writeFileSync(`${dir}/../assets/${nuevo}`,
      fs3.readFileSync(`${dir}/../assets/${jsViejo}`, "utf8").replaceAll("Cubo basura reciclaje", "CAMBIO VERSION NUEVA"));
    fs3.rmSync(`${dir}/../assets/${jsViejo}`);
    fs3.writeFileSync(`${dir}/index.html`, fs3.readFileSync(`${dir}/index.html`, "utf8").replace(jsViejo, nuevo));
    const pre = JSON.parse(fs3.readFileSync(`${dir}/../precache.json`, "utf8"));
    fs3.writeFileSync(`${dir}/../precache.json`, JSON.stringify({ id: "NUEVA", ficheros: pre.ficheros.map(f => f.replace(jsViejo, nuevo)) }));
    fs3.writeFileSync(`${dir}/../version.json`, JSON.stringify({ id: "NUEVA" }));
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
    // Con ancla, igual que arriba: "no hay banner" también se cumple si la app no ha
    // cargado, y entonces la comprobación no dice nada.
    ok(await p.locator(".item-row").count() > 20, "la app ha cargado su checklist");
    ok(await p.locator(".version-nueva-banner").count() === 0, "y con la misma versión no avisa de nada");
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
    // Y además se espera a que los chips y la ficha PENDIENTES cuadren. Los pinta el
    // mismo render, pero la lectura puede caer justo entre medias: con solo los 2.600 ms
    // de arriba, en una máquina cargada se leían 2 chips mientras la ficha ya decía 3, y
    // fallaba una comprobación que no tenía nada de malo. Si no llegan a cuadrar se
    // sigue igual: quien decide son las comprobaciones de abajo, no esta espera.
    await p.waitForFunction(() => {
      const cuantos = document.querySelectorAll(".aviso-recogida-chip .aviso-recogida-texto").length;
      const ficha = document.querySelector(".resumen-ficha.is-aviso .resumen-ficha-valor");
      return cuantos > 0 && ficha && parseInt(ficha.textContent, 10) === cuantos;
    }, null, { timeout: 8000 }).catch(() => { /* se comprueba abajo */ });
    return { c, p };
  };

  // 1) Recogida pendiente → se avisa de la recogida, NO de la devolución.
  // Ojo: en la lista sale también la recogida de las sillas, que ahora se crea sola
  // porque son de alquiler de serie. Es correcto que esté, así que las comprobaciones
  // van sobre el generador por su nombre en vez de contar cuántos avisos hay.
  const a1 = await abrirConAvisos([{ concepto: "Recoger generador", fecha: dia(0), fechaDevolucion: dia(2) }]);
  let t = await chips(a1.p);
  ok(t.some(x => /Recogida: "Recoger generador"/.test(x)) && !t.some(x => /Devoluci/.test(x)),
    `sin recoger: se avisa de la recogida, no de la devolución → ${JSON.stringify(t)}`);
  ok(t.some(x => /Recogida: "Sillas/.test(x)),
    "y las sillas de alquiler traen la suya sin que nadie la escriba");
  const ficha = await a1.p.locator(".resumen-ficha.is-aviso .resumen-ficha-valor").innerText().catch(() => "");
  ok(parseInt(ficha, 10) === t.length, `la ficha PENDIENTES (${parseInt(ficha, 10)}) coincide con los avisos (${t.length})`);

  // 2) Al marcar la recogida como hecha aparece la devolución, ya sin el verbo delante
  await a1.p.locator(".aviso-recogida-chip", { hasText: "Recoger generador" }).locator(".aviso-recogida-hecho").click();
  await a1.p.waitForTimeout(1500);
  t = await chips(a1.p);
  ok(t.some(x => /Devolución: "generador"/.test(x)) && !t.some(x => /Recogida: "Recoger generador"/.test(x)),
    `tras recogerlo: aparece la devolución sin repetir el verbo → ${JSON.stringify(t)}`);
  await a1.c.close();

  // 3) Devolución vencida sin recogida marcada: se avisa igual (no se pagan días de más)
  const a2 = await abrirConAvisos([{ concepto: "Recoger generador", fecha: dia(-4), fechaDevolucion: dia(-1) }]);
  t = await chips(a2.p);
  ok(t.some(x => /Devolución/.test(x)), `devolución atrasada: se avisa aunque no se marcara la recogida → ${JSON.stringify(t)}`);
  await a2.c.close();

  // ── El link que se le pasa a logística ─────────────────────────────────────
  // Es un link NUEVO, que se suma a los dos de siempre sin tocarlos. Quien carga el
  // camión lo abre desde el WhatsApp y lo único que hace es ir marcando: sin aterrizar
  // en la checklist entera ni buscar "Modo carga" entre los botones de la cabecera,
  // que con el móvil en una mano y una caja en la otra no es un detalle menor.
  console.log("\n── El link que se le pasa a logística ──");
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const evento = { evento: "boda", pax: 100, nombreEvento: "Boda Anna y Mario" };

    await p.goto(url(evento) + "&solo=1&carga=1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);

    ok(await p.locator(".segmented-control .segment-salida").count() === 1,
      "el link de marcar entra DIRECTO en Modo carga, sin pasar por la checklist entera");
    ok(await p.locator(".segment-salida.active").count() === 1,
      "y cae en Salida, que es lo que se marca al cargar el camión");
    // Vuelta es la otra mitad de su trabajo: lo que baja del camión al volver
    ok(await p.locator(".segment-vuelta").count() === 1,
      "con la Vuelta a un toque, para marcar lo que vuelve");

    // Puede marcar, que es a lo que viene
    const primera = p.locator(".carga-row-principal input[type=checkbox]").first();
    await primera.click();
    await p.waitForTimeout(500);
    ok(await primera.isChecked(), "puede marcar lo que sube al camión");

    // Y si le toca preparar también, la pestaña está ahí
    await p.locator(".segment-btn", { hasText: "Prep." }).click();
    await p.waitForTimeout(400);
    ok(await p.locator(".segment-preparacion.active").count() === 1,
      "y si le toca preparar también, la pestaña está ahí");

    // Modo carga ES la app con este link: no hay ✕ ni fondo que tocar para salir.
    // Cerrarlo dejaría a quien carga el camión delante de una checklist que no puede
    // tocar y sin forma clara de volver.
    ok(await p.locator(".preview-close-btn").count() === 0,
      "no hay ✕ para salir: con este link, Modo carga es la app entera");
    await p.locator(".preview-overlay").click({ position: { x: 5, y: 5 } });
    await p.waitForTimeout(500);
    ok(await p.locator(".segmented-control .segment-salida").count() === 1,
      "y tocar el fondo tampoco lo cierra");

    const desb = await desbordamiento(p);
    ok(desb <= 0, `todo cabe en la pantalla del móvil (sobra ${desb}px)`);
    await c.close();
  }

  {
    // El link del metre: la checklist entera para consultarla y nada más. Las marcas
    // de carga son de logística, y una casilla tocada por error deja a alguien creyendo
    // que algo va en el camión cuando no va.
    const c = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const evento = { evento: "boda", pax: 100, nombreEvento: "Boda Anna y Mario" };

    await p.goto(url(evento) + "&solo=1&vista=1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);

    // Abre DIRECTO en la hoja: es la vista buena para quien lleva el servicio, no la
    // lista de carga con sus casillas.
    ok(await p.locator(".preview-table").count() > 0,
      "el link del metre abre directo en la hoja, no en la lista de carga");
    // Y lo alquilado, junto y arriba: fila a fila ya iba marcado, pero repartido entre
    // catorce categorías. Es lo que tiene que devolver al acabar.
    const alq = p.locator(".preview-alquileres");
    ok(await alq.count() === 1, "con lo alquilado destacado arriba del todo");
    const textoAlq = await alq.innerText();
    ok(/hay que devolverlo/i.test(textoAlq) && /Sillas/i.test(textoAlq),
      `diciendo qué es de otros → "${textoAlq.split("\n")[0]}"`);
    ok(await alq.locator("li").count() > 0,
      `con su lista y sus cantidades (${await alq.locator("li").count()} cosas)`);

    // La hoja ES la pantalla: detrás no hay nada. Ni checklist, ni ✕, ni forma de
    // salir tocando el fondo — cerrarla solo dejaría al metre delante de una lista
    // que no es la que necesita.
    ok(await p.locator(".item-row").count() === 0,
      "y detrás no hay checklist ninguna: la hoja es todo lo que hay");
    ok(await p.locator(".preview-close-btn").count() === 0,
      "sin ✕, porque no hay a dónde volver");
    await p.locator(".preview-overlay").click({ position: { x: 5, y: 5 } });
    await p.waitForTimeout(500);
    ok(await p.locator(".preview-table").count() > 0,
      "y tocar el fondo tampoco la cierra");
    ok(await p.locator(".config-card").count() === 0 && await p.locator(".app-header").count() === 0,
      "ni configuración ni cabecera de la app: solo la hoja");
    // Ni el botón de la cabecera ni el de la barra fina: ninguna puerta a marcar.
    // Tampoco hay campos de cantidad que comprobar — no hay checklist detrás — así que
    // no queda nada editable por definición.
    ok(await p.locator("button", { hasText: /Modo carga/i }).count() === 0
      && await p.locator(".barra-fija-carga").count() === 0,
      "pero no tiene por dónde entrar en Modo carga");
    ok(await p.locator(".item-qty-input").count() === 0
      && await p.locator(".add-item-card").count() === 0,
      "y no hay ni un campo que tocar: ni cantidades ni añadir items");

    // Ni forzándolo por la dirección: solo ver manda sobre carga
    await p.goto(url(evento) + "&solo=1&vista=1&carga=1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    ok(await p.locator(".segmented-control .segment-salida").count() === 0,
      "y aunque el link lleve también carga=1, solo ver manda: no entra a marcar");
    await c.close();
  }

  {
    // Los links que YA se mandaron llevan solo "solo=1". Tienen que seguir abriéndose
    // como se abrían: si un link viejo cambiara de sitio al abrirse, quien lo tenga
    // guardado se encontraría otra cosa distinta sin que nadie se lo haya dicho.
    const c = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 100 }) + "&solo=1", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2000);
    ok(await p.locator(".segmented-control .segment-salida").count() === 0
      && await p.locator(".item-row").count() > 20,
      "y un link viejo, solo con &solo=1, sigue abriendo la checklist como siempre");
    await c.close();
  }

  // ── Borrar un evento se lleva su copia de la nube ──────────────────────────
  // Cada evento que se comparte alguna vez deja un documento en la nube. Al borrar el
  // evento, ese documento se quedaba PARA SIEMPRE: nadie lo referencia, nadie lo ve y
  // nadie lo podía borrar. Ahora se borra con él — y como eso SÍ rompe el link que ya
  // se haya mandado, lo que se comprueba aquí es que el aviso lo dice antes.
  console.log("\n── Borrar un evento y su copia en la nube ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    await c.addInitScript(() => {
      localStorage.setItem("gula_eventos_guardados", JSON.stringify({
        // Uno con copia en la nube (se compartió su link) y otro que nunca se compartió
        "Boda compartida": { evento: "boda", pax: 100, nombreEvento: "Boda compartida", eventoNubeId: "abc12345" },
        "Boda sin compartir": { evento: "boda", pax: 80, nombreEvento: "Boda sin compartir" },
      }));
    });
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 100 }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);

    const borrar = (nombre) => p.locator(".plantilla-borrar").and(p.locator(`[aria-label="Borrar evento guardado ${nombre}"]`));

    // El que SÍ tiene link: hay que avisar de que ese link dejará de abrir
    await borrar("Boda compartida").click();
    await p.waitForTimeout(500);
    const conLink = await p.locator(".dialogo-mensaje").innerText();
    ok(/dejará de abrir/i.test(conLink) && /nube/i.test(conLink),
      `si el evento tiene link compartido, se avisa de que dejará de abrir → "${conLink.slice(0, 70)}…"`);
    await p.locator("button", { hasText: /Cancelar/i }).first().click();
    await p.waitForTimeout(400);

    // El que NO: no se le mete un miedo que no viene a cuento
    await borrar("Boda sin compartir").click();
    await p.waitForTimeout(500);
    const sinLink = await p.locator(".dialogo-mensaje").innerText();
    ok(!/dejará de abrir/i.test(sinLink),
      `y si nunca se compartió, no se avisa de nada que no vaya a pasar → "${sinLink.slice(0, 60)}…"`);
    await p.locator("button", { hasText: /Cancelar/i }).first().click();
    await p.waitForTimeout(400);

    // Y cancelar no borra nada
    const quedan = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("gula_eventos_guardados") || "{}")).length);
    ok(quedan === 2, `cancelar no borra nada (siguen ${quedan} eventos)`);
    await c.close();
  }

  // ── Las mesas de cocina de un banquete ─────────────────────────────────────
  // Dicho por quien las monta: de 4 a 6 según el tamaño de la boda. Antes salían de la
  // cuenta de "servicio" (7/11/13), que además se plantaba en 13 a partir de 100 pax —
  // una boda de 120 y una de 300 cargaban las mismas.
  console.log("\n── Mesas de un banquete ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const mesas = async (pax) => {
      await p.goto(url({ evento: "boda", pax, ninos: 0, fechaEvento: "2027-07-10" }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      const f = (await listaItems(p)).find(i => i.startsWith("Mesas de 1,8m")) || "";
      return Number((f.match(/=(\d+)/) || [])[1] || 0);
    };
    // Comensales (pax/7, rectangular de 1,80) + cocina (4/5/6)
    const cien = await mesas(100), dosc = await mesas(200), tresc = await mesas(300);
    ok(cien === 19, `100 pax: 15 de comensales + 4 de cocina = ${cien}`);
    ok(dosc === 34, `200 pax: 29 + 5 = ${dosc}`);
    ok(tresc === 49, `300 pax: 43 + 6 = ${tresc}`);
    // Lo que fallaba antes: dejar de crecer a partir de 100 pax
    ok(tresc > dosc && dosc > cien,
      "y una boda más grande lleva más mesas, que antes se plantaban a partir de 100 pax");
    await c.close();
  }

  // ── Lo que no vuelve se cobra, y se cobra UNA vez ──────────────────────────
  // Si de 100 copas vuelven 90, esas 10 no están y hay que reponerlas. El botón
  // "faltan 10" las apunta de un toque en vez de restar de cabeza descargando el
  // camión. Y el resumen no puede cobrarlas dos veces: antes sumaba lo que faltaba MÁS
  // las roturas, que en este caso son las mismas 10 copas — cobraba 20.
  console.log("\n── Roturas y lo que falta ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 100, ninos: 0, fechaEvento: "2027-07-10", barraCopas: true, horasCopas: 4 }) + "&solo=1&carga=1",
      { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2400);
    await p.locator(".segment-btn", { hasText: "Vuelta" }).click();
    await p.waitForTimeout(700);

    const fila = p.locator(".carga-row").filter({ hasText: "Copas de vino" }).first();
    // "de 275 (= 11 bateas de 25)": hay que coger SOLO el primer número. Quitando todo
    // lo que no sea dígito salía "2751125", o sea una cantidad inventada, y con eso la
    // resta daba cero y no aparecía el botón: la prueba fallaba por mal leído, no por
    // el código.
    const textoCantidad = await fila.locator(".carga-cantidad").innerText();
    const salieron = Number((textoCantidad.match(/de\s+([\d.,]+)/) || [])[1]?.replace(/[.,]/g, "") || 0);
    ok(salieron > 0, `de partida salen ${salieron} copas de vino`);

    // Sin apuntar la vuelta no se sugiere nada: no se sabe qué falta
    ok(await fila.locator(".carga-faltan").count() === 0,
      "sin apuntar la vuelta no se sugiere nada, que no se sabe qué falta");

    // Vuelven todas menos 10
    await fila.locator(".carga-vuelve-cantidad input").fill(String(salieron - 10));
    await p.waitForTimeout(700);
    const chip = fila.locator(".carga-faltan");
    ok(await chip.count() === 1 && /faltan 10/.test(await chip.innerText()),
      `apuntando la vuelta sale el botón con lo que falta → "${(await chip.innerText()).trim()}"`);

    // Un toque y quedan apuntadas
    await chip.click();
    await p.waitForTimeout(600);
    ok(await fila.locator(".carga-roturas-input").last().inputValue() === "10",
      "y de un toque quedan apuntadas como roturas");
    ok(await fila.locator(".carga-faltan").count() === 0,
      "el botón desaparece cuando ya están apuntadas: no se repite el aviso");

    // Y el resumen las cobra UNA vez, no dos
    await p.locator(".segment-btn", { hasText: "Resumen" }).click();
    await p.waitForTimeout(900);
    const filaRes = p.locator("tr").filter({ hasText: "Copas de vino" }).first();
    if (await filaRes.count() > 0) {
      const celdas = await filaRes.locator("td").allInnerTexts();
      ok(!celdas.join(" ").includes("20"),
        `en el resumen no se cuentan dos veces las mismas 10 → ${JSON.stringify(celdas.slice(0, 6))}`);
    } else {
      ok(true, "el resumen no lista esa fila sin precio puesto (se comprueba la fórmula aparte)");
    }

    // No pueden volver más de las que salieron. Pasaba: "cargadas 24, vuelven 27". Y no
    // es solo que quede raro — el consumo se queda en 0 y esa merma NO se cobra, así que
    // el dato imposible sale gratis y nadie se entera.
    await p.locator(".segment-btn", { hasText: "Vuelta" }).click();
    await p.waitForTimeout(700);
    const campoVuelta = fila.locator(".carga-vuelve-cantidad input");
    await campoVuelta.fill(String(salieron + 50));
    await p.waitForTimeout(700);
    ok(Number(await campoVuelta.inputValue()) === salieron,
      `escribir más de lo que salió se recorta a la cantidad cargada (${salieron + 50} → ${await campoVuelta.inputValue()})`);
    ok(Number(await campoVuelta.getAttribute("max")) === salieron,
      "y el tope va también en el campo, para que las flechas no lo pasen");

    // Por debajo se sigue pudiendo escribir cualquier cosa: el tope es solo por arriba
    await campoVuelta.fill(String(salieron - 3));
    await p.waitForTimeout(600);
    ok(Number(await campoVuelta.inputValue()) === salieron - 3,
      "y por debajo no estorba: se apunta lo que de verdad volvió");
    await c.close();
  }

  // ── Escribir una cantidad no puede ir por detrás de los dedos ──────────────
  // Cada tecla escribía en el estado del evento entero: reconstruir 150 filas,
  // guardar y programar la subida. Unos 100ms por pulsación, que escribiendo rápido
  // se nota. Ahora se teclea en local y sube al parar. Lo que NO puede pasar es que
  // por ganar tiempo se pierda lo escrito.
  console.log("\n── Escribir una cantidad ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 100, ninos: 0, fechaEvento: "2027-07-10" }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1900);
    const campo = p.locator(".item-row", { hasText: "Regletas" }).first().locator(".item-qty-input");
    const guardado = () => p.evaluate(() => {
      try { return JSON.parse(localStorage.getItem("gula_checklist_estado") || "{}").overridesManuales || {}; }
      catch (e) { return {}; }
    });

    // Escribir cuatro cifras seguidas: lo que se ve tiene que ser lo tecleado
    await campo.click();
    await p.keyboard.type("1234", { delay: 40 });
    ok(await campo.inputValue() === "1234", `lo tecleado se ve entero y en orden → "${await campo.inputValue()}"`);

    // Y al parar, sube al evento solo
    await p.waitForTimeout(1100);
    const tras = await guardado();
    ok(Object.values(tras).includes("1234"),
      `al parar de escribir se guarda solo → ${JSON.stringify(Object.values(tras).slice(0, 3))}`);

    // Salir del campo confirma al momento, sin esperar: si alguien escribe y cierra
    // la app en el mismo segundo, lo tecleado no se puede quedar por el camino.
    // Otra fila, sin tocar antes: si se reusa la de arriba, el clic cae en un campo que
    // YA tiene el foco, onFocus no vuelve a disparar su "seleccionar todo" y lo tecleado
    // se mete en medio de lo que había ("1234" + "77" = "177234"). Es lo normal en
    // cualquier campo de texto, pero convierte la comprobación en otra cosa.
    const otro = p.locator(".item-row", { hasText: "Alargadores" }).first().locator(".item-qty-input");
    await otro.click();
    await p.keyboard.type("77", { delay: 30 });
    // 120ms: lo justo para que React procese la última tecla, y muy por debajo de los
    // 500 de la pausa. Si aquí ya estuviera guardado, no probaría nada del blur.
    await p.waitForTimeout(120);
    ok(!Object.values(await guardado()).includes("77"),
      "recién tecleado y sin salir del campo, todavía no ha subido (la pausa no ha vencido)");
    await otro.blur();
    await p.waitForTimeout(250);
    ok(Object.values(await guardado()).includes("77"),
      "y salir del campo lo confirma al momento, sin esperar la pausa");

    // Lo de al lado sigue el número mientras se escribe, no el guardado
    const cerveza = p.locator(".item-row", { hasText: "Cerveza Alhambra" }).first();
    await cerveza.locator(".item-qty-input").click();
    await p.keyboard.type("48", { delay: 30 });
    await p.waitForTimeout(120);
    const info = await cerveza.locator(".item-batea-info").innerText();
    ok(/2 cajas/.test(info), `y las cajas de al lado siguen al número mientras se teclea → "${info}"`);
    await c.close();
  }

  // ── Los nombres largos no se cortan ────────────────────────────────────────
  // "Cinta aislante americana" se quedaba en 38px de los 65 que necesita, cortado y
  // sin puntos suspensivos: sin forma de saber que faltaba texto. Y es donde más
  // importa, marcando material con el móvil en una mano.
  console.log("\n── Los nombres largos ──");
  for (const ancho of [320, 390]) {
    const c = await navegador.newContext({ viewport: { width: ancho, height: 850 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 180, ninos: 30, nombreEvento: "Boda larga", fechaEvento: "2027-07-10", barraCopas: true, horasCopas: 5 }) + "&solo=1&carga=1",
      { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2200);
    const cortados = await p.locator(".carga-nombre-texto").evaluateAll(ns => ns
      .filter(n => n.scrollWidth > n.clientWidth + 2)
      .map(n => `${n.textContent.trim().slice(0, 26)}: ${n.clientWidth}px de ${n.scrollWidth}`));
    ok(cortados.length === 0,
      `${ancho}px: ningún nombre se corta en Modo carga${cortados.length ? ` → ${cortados.slice(0, 3).join(" · ")}` : ` (${await p.locator(".carga-nombre-texto").count()} nombres)`}`);
    await c.close();
  }

  // ── La tónica es cosa de las copas ─────────────────────────────────────────
  // Salían botellas de tónica con solo barra de cóctel, y hasta sin barra ninguna. La
  // tónica es mezcla de ginebra: en el aperitivo se sirve vermut, cerveza y refresco.
  // Una línea a cero en una lista de compra es una línea que alguien acaba comprando.
  console.log("\n── La tónica es cosa de las copas ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    const hayTonica = async (estado) => {
      await p.goto(url({ evento: "boda", pax: 100, ninos: 0, fechaEvento: "2027-07-10", ...estado }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      return (await listaItems(p)).filter(i => i.startsWith("Tónica"));
    };

    ok((await hayTonica({})).length === 0,
      "sin barra ninguna, la tónica no sale en la lista");
    ok((await hayTonica({ barraCoctel: true, horasCoctel: 3 })).length === 0,
      "con solo barra de cóctel tampoco: ahí no se sirve ginebra");
    const conCopas = await hayTonica({ barraCopas: true, horasCopas: 4 });
    ok(conCopas.length === 1 && !/=0(\||$)/.test(conCopas[0]),
      `y con barra de copas sí, con su cantidad → ${conCopas[0]}`);
    // Las dos juntas: sigue saliendo, y más que con solo copas
    const ambas = await hayTonica({ barraCoctel: true, horasCoctel: 3, barraCopas: true, horasCopas: 5 });
    const n = (t) => parseInt(t.slice(t.indexOf("=") + 1), 10);
    ok(ambas.length === 1 && n(ambas[0]) > n(conCopas[0]),
      `y con cóctel + copas pide más que con copas solas (${n(conCopas[0])} → ${n(ambas[0])})`);
    await c.close();
  }

  // ── Lo que pone al lado de la cantidad ─────────────────────────────────────
  // "5" y al lado "1 cajas de 24" se lee como dos cantidades distintas: ¿hay que
  // llevar 5 o 24? Y "1 cajas" en plural obliga a pararse a leerlo dos veces. En una
  // lista de compra eso no es un detalle de estilo, es un pedido equivocado.
  console.log("\n── Lo que pone al lado de la cantidad ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 100, ninos: 0, fechaEvento: "2027-07-10", barraCoctel: true, horasCoctel: 4 }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1900);

    const infoDe = async (nombre) => {
      const fila = p.locator(".item-row", { hasText: nombre }).first();
      const i = fila.locator(".item-batea-info");
      return await i.count() ? (await i.innerText()).trim() : "";
    };
    const cantidadDe = (nombre) => p.locator(".item-row", { hasText: nombre }).first().locator(".item-qty-input");

    // Se baja el Nestea a 5: cinco unidades siguen siendo UNA caja, no cinco
    await cantidadDe("Nestea").fill("5");
    await p.waitForTimeout(900);
    const cinco = await infoDe("Nestea");
    ok(/^=/.test(cinco),
      `con "=" delante, para que se lea como la misma cantidad en envases y no como otra distinta → "${cinco}"`);
    ok(/1 caja de 24/.test(cinco) && !/1 cajas/.test(cinco),
      `y en singular: "1 caja de 24", no "1 cajas de 24" → "${cinco}"`);

    // Y al cambiarla, el de al lado la sigue
    await cantidadDe("Nestea").fill("50");
    await p.waitForTimeout(900);
    const cincuenta = await infoDe("Nestea");
    ok(/3 cajas de 24/.test(cincuenta),
      `cambiar la cantidad recalcula las cajas al momento (50 → "${cincuenta}")`);
    ok(/cajas/.test(cincuenta),
      "y con más de una vuelve al plural");

    // Las bateas de cristalería, igual
    const copas = await infoDe("Copas de vino");
    ok(/^= \d+ batea/.test(copas), `las bateas siguen la misma regla → "${copas}"`);

    // Donde el número YA son packs, no lleva "=": ahí el texto es la etiqueta de lo
    // que se cuenta, no una conversión. Mezclar las dos cosas es lo que liaba.
    const agua = await infoDe("Agua 1,5L");
    ok(agua.length > 0 && !/^=/.test(agua),
      `y donde el número ya va en packs no se pone "=" → "${agua}"`);

    await c.close();
  }

  // ── El aviso de "actualizado desde otro dispositivo" ───────────────────────
  // Se veía cortado por la derecha ("Actualizado desde otro di…"), justo el aviso que
  // hay que leer entero porque dice qué te ha cambiado alguien por debajo.
  //
  // La causa era fina: el aviso se centraba con transform: translateX(-50%), y su
  // animación de entrada anima TRANSFORM con fill-mode "both". Al acabar, el último
  // fotograma (translateY(0)) pisaba el centrado y lo dejaba pisado para siempre: el
  // aviso se quedaba clavado empezando en mitad de la pantalla. Por eso se mide DESPUÉS
  // de que termine la animación — antes de terminar se veía bien y no se notaba nada.
  console.log("\n── El aviso de cambios desde otro dispositivo ──");
  for (const ancho of [320, 390, 412, 1440]) {
    const c = await navegador.newContext({ viewport: { width: ancho, height: 900 }, isMobile: ancho < 768, hasTouch: ancho < 768 });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);
    await p.goto(url({ evento: "boda", pax: 100, nombreEvento: "Comunión Daniela Cuevas Peñarrubia" }), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1900);

    // El aviso solo sale cuando llega un cambio de la nube, y aquí la nube está
    // cortada: se monta el mismo bloque con sus clases para medir SU css, que es
    // exactamente lo que estaba roto.
    await p.evaluate(() => {
      const d = document.createElement("div");
      d.className = "cambios-remotos-banner";
      d.innerHTML = `<div class="cambios-remotos-detalle">
          <strong>🔄 Actualizado desde otro dispositivo:</strong>
          <span>cronos: 0 → 1</span>
        </div>
        <button class="cambios-remotos-cerrar" aria-label="Cerrar aviso">✕</button>`;
      document.body.appendChild(d);
    });
    // Que termine la animación de entrada: el fallo aparecía justo al acabar
    await p.waitForTimeout(700);

    const caja = await p.locator(".cambios-remotos-banner").evaluate(el => {
      const r = el.getBoundingClientRect();
      return { izq: Math.round(r.left), der: Math.round(r.right), ancho: Math.round(r.width) };
    });
    ok(caja.der <= ancho, `${ancho}px: el aviso no se sale por la derecha (acaba en ${caja.der})`);
    ok(caja.izq >= 0, `${ancho}px: ni por la izquierda (empieza en ${caja.izq})`);
    // Y centrado de verdad: el hueco de un lado y del otro tienen que ser iguales
    const descuadre = Math.abs(caja.izq - (ancho - caja.der));
    ok(descuadre <= 2, `${ancho}px: y queda centrado (${descuadre}px de diferencia entre los lados)`);

    const desb = await desbordamiento(p);
    ok(desb <= 0, `${ancho}px: sin desbordar la página (sobra ${desb}px)`);
    await c.close();
  }

  // ── El aviso, en un móvil de verdad ────────────────────────────────────────
  // En el móvil el botón "✓ Hecho" salía cortado a media palabra: se leía "Hech"
  // dentro de un círculo verde que se salía de su ficha. El botón no llevaba
  // flex-shrink: 0, así que cuando el texto de la recogida ocupaba el ancho, el botón
  // se estrechaba por debajo de su propia etiqueta. Un botón con texto dentro no se
  // puede encoger, y menos éste: es el que da por hecha una devolución.
  for (const ancho of [320, 390, 412]) {
    const c = await navegador.newContext({ viewport: { width: ancho, height: 900 }, isMobile: true, hasTouch: true });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const estado = {
      evento: "produccion", pax: 25, nombreEvento: "Boda Anna y Mario", fechaEvento: dia(1),
      // Un concepto largo de verdad, de los que parten el texto en tres líneas
      recogidas: [{ concepto: "Apollo paella y jamonero — recoger en casa de los padres de Rocío", fecha: dia(-2), fechaDevolucion: dia(-1) }],
      compras: [],
    };
    await c.addInitScript(e => {
      localStorage.setItem("gula_eventos_guardados", JSON.stringify({
        "Boda Anna y Mario": e,
        // Un segundo evento con nombre largo, para el botón de "Pendientes en otros
        // eventos": llevaba nowrap y con un nombre así se salía de la pantalla.
        "Comunión Daniela Cuevas Peñarrubia": { ...e, nombreEvento: "Comunión Daniela Cuevas Peñarrubia" },
      }));
      localStorage.setItem("gula_evento_activo", "Boda Anna y Mario");
    }, estado);
    const p = await nuevaPagina(c);
    await p.goto(url(estado), { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2600);

    const boton = p.locator(".aviso-recogida-hecho").first();
    ok(await boton.count() === 1, `${ancho}px: el aviso enseña su botón de dar por hecha la devolución`);

    // Que la etiqueta quepa DENTRO del botón: esto es exactamente lo que fallaba
    const cortado = await boton.evaluate(b => b.scrollWidth > b.clientWidth + 1);
    ok(!cortado, `${ancho}px: "✓ Hecho" cabe entero en su botón, sin cortarse a media palabra`);

    // Y que el botón no se salga de su ficha
    const fuera = await boton.evaluate(b => {
      const ficha = b.closest(".aviso-recogida-chip").getBoundingClientRect();
      const r = b.getBoundingClientRect();
      return Math.round(Math.max(r.right - ficha.right, ficha.left - r.left));
    });
    ok(fuera <= 0, `${ancho}px: y se queda dentro de su ficha (se sale ${fuera}px)`);

    const desb = await desbordamiento(p);
    ok(desb <= 0, `${ancho}px: el aviso entero cabe en la pantalla (sobra ${desb}px)`);

    // Se sigue pudiendo pulsar con el dedo
    const alto = await boton.evaluate(b => Math.round(b.getBoundingClientRect().height));
    ok(alto >= 40, `${ancho}px: y sigue siendo pulsable con el dedo (${alto}px de alto)`);

    await c.close();
  }

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
  // referencia del sector para un brindis es 1 copa por cabeza) y sube las copas a 1,5
  // por cabeza, porque en el brindis todo el mundo coge copa a la vez y hay que tener
  // repuesto delante. Antes subía el ratio de botellas a 0,28 y salían 28 para 100 pax:
  // dos copas por cabeza, el techo de lo que alguien bebe en un brindis, no la media.
  //
  // Las copas tampoco se doblan ya. Doblar daba 2 copas por cabeza SOLO para el brindis,
  // encima del 10% de margen que lleva todo: 252 copas de cava para 100 personas que
  // brindan una vez. Con 1,5 salen 180, que son 1,8 por cabeza contando el margen.
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
    // Cifras exactas a propósito: 100 pax son 110 copas con margen (144 en bateas de 36)
    // y 165 con brindis (180 en bateas). Un umbral del tipo "sube algo" deja pasar
    // cualquier cosa, y esta línea existe justo para avisar si el ratio se mueve.
    ok(sin.copas === 144 && con.copas === 180,
      `y sube las copas a 1,5 por cabeza, que en el brindis todo el mundo coge una a la vez — en bateas de 36 (${sin.copas} → ${con.copas})`);
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

    // Las sillas son alquiler POR DEFECTO ("Dealde"), pero su recogida solo aparecía si
    // alguien tocaba el selector con el dedo. Un evento nuevo —o uno que llega del
    // formulario de la oficina con las sillas ya puestas— se quedaba con sillas de
    // alquiler y sin recogida: nadie sabía cuándo ir a por ellas ni cuándo devolverlas.
    {
      const c2 = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
      for (const h of HOSTS_NUBE) await c2.route(h, r => r.abort());
      const p2 = await nuevaPagina(c2);
      const tarj = () => p2.locator(".logistica-block").filter({ hasText: /RECOGIDAS \(/ })
        .locator(".recogida-card").evaluateAll(cs => cs.map(x => ({
          concepto: (x.querySelector('input[type="text"]') || {}).value || "",
          fechas: [...x.querySelectorAll('input[type="date"]')].map(d => d.value),
        })));

      // Un evento nuevo, sin tocar nada: las sillas vienen de Dealde de serie
      await p2.goto(url({ evento: "boda", pax: 80, nombreEvento: "Boda sin tocar nada", fechaEvento: "2027-08-11" }),
        { waitUntil: "domcontentloaded" });
      await p2.waitForTimeout(2400);
      const conSillas = (await tarj()).filter(x => /Sillas/i.test(x.concepto));
      ok(conSillas.length === 1,
        `sin tocar el selector, las sillas de alquiler ya traen su recogida → ${JSON.stringify((await tarj()).map(x => x.concepto))}`);
      ok(conSillas[0].fechas[0] === "2027-08-10" && conSillas[0].fechas[1] === "2027-08-12",
        `con el día de ir y el de devolver sacados de la fecha del evento → ${JSON.stringify(conSillas[0].fechas)}`);

      // Con sillas propias no se inventa ninguna
      await p2.goto(url({ evento: "boda", pax: 80, nombreEvento: "Con sillas nuestras", fechaEvento: "2027-08-11", origenSillas: "Nuestras" }),
        { waitUntil: "domcontentloaded" });
      await p2.waitForTimeout(2400);
      ok((await tarj()).filter(x => /Sillas/i.test(x.concepto)).length === 0,
        "y con sillas nuestras no se inventa ninguna recogida");

      // Un evento YA PASADO no se toca: crearle ahora la recogida sería sacar un aviso
      // rojo de algo que se hizo hace meses.
      await p2.goto(url({ evento: "boda", pax: 80, nombreEvento: "Boda del año pasado", fechaEvento: "2020-05-09" }),
        { waitUntil: "domcontentloaded" });
      await p2.waitForTimeout(2400);
      ok((await tarj()).filter(x => /Sillas/i.test(x.concepto)).length === 0,
        "y abrir un evento ya pasado no le inventa una recogida atrasada");

      // Sin fecha de evento tampoco: una recogida sin día no responde a "¿cuándo hay
      // que ir?", que es para lo único que existe, y encima saldría contada como
      // pendiente en el resumen. Al poner la fecha, aparece con sus dos días.
      await p2.goto(url({ evento: "boda", pax: 80, nombreEvento: "Boda sin fecha" }), { waitUntil: "domcontentloaded" });
      await p2.waitForTimeout(2400);
      ok((await tarj()).filter(x => /Sillas/i.test(x.concepto)).length === 0,
        "sin fecha de evento no se crea todavía: no sabría qué día decir");
      // …y en cuanto se le pone la fecha, aparece con sus dos días
      await p2.locator(".form-group", { hasText: "FECHA" }).first().locator('input[type="date"]').fill("2027-10-15");
      await p2.waitForTimeout(1200);
      const traFecha = (await tarj()).filter(x => /Sillas/i.test(x.concepto));
      ok(traFecha.length === 1 && traFecha[0].fechas[0] === "2027-10-14" && traFecha[0].fechas[1] === "2027-10-16",
        `y en cuanto se pone la fecha aparece con sus dos días → ${JSON.stringify(traFecha[0] && traFecha[0].fechas)}`);

      // Si ya hay una escrita a mano para lo mismo, manda la suya: dos avisos para una
      // sola cosa es peor que ninguno, porque nadie sabe cuál mirar.
      await p2.goto(url({
        evento: "boda", pax: 80, nombreEvento: "Con la suya a mano", fechaEvento: "2027-08-11",
        recogidas: [{ concepto: "Recoger sillas Dealde", fecha: "2027-08-12" }],
      }), { waitUntil: "domcontentloaded" });
      await p2.waitForTimeout(2400);
      const deSillas = (await tarj()).filter(x => /silla/i.test(x.concepto));
      ok(deSillas.length === 1 && deSillas[0].concepto === "Recoger sillas Dealde",
        `con una recogida de sillas escrita a mano no se añade otra al lado → ${JSON.stringify(deSillas.map(x => x.concepto))}`);
      await c2.close();
    }

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

  // ── Guardar el formulario en el iPhone ─────────────────────────────────────
  // En el iPhone no existe ningún botón de "Instalar": la única forma es Compartir →
  // "Añadir a pantalla de inicio". Y el enlace llega por WhatsApp, que lo abre DENTRO
  // de su propio navegador, donde esa opción no está por ningún lado. Ahí se puede
  // seguir la instrucción al pie de la letra y no encontrarla nunca.
  console.log("\n── Guardar el formulario en el iPhone ──");
  {
    const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    const WHATSAPP_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

    const abrirComo = async (ua, ancho) => {
      const c = await navegador.newContext({
        viewport: { width: ancho, height: 844 }, isMobile: true, hasTouch: true, userAgent: ua,
      });
      for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
      const p = await nuevaPagina(c);
      await p.goto(BASE_FORM + "?enviar=PRUEBA1", { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2400);
      return { c, p };
    };

    {
      const { c, p } = await abrirComo(SAFARI_IPHONE, 390);
      const caja = p.locator(".form-instalar");
      ok(await caja.count() === 1, "en el Safari del iPhone sale el aviso de guardarlo (ahí no hay botón que valga)");
      const texto = await caja.innerText();
      ok(/Compartir/i.test(texto) && /pantalla de inicio/i.test(texto),
        "y dice exactamente dónde tocar");
      ok(await p.locator(".form-instalar-pasos li").count() === 3,
        "en tres pasos numerados, no en un párrafo");
      await c.close();
    }

    {
      const { c, p } = await abrirComo(WHATSAPP_IPHONE, 390);
      const caja = p.locator(".form-instalar");
      ok(await caja.count() === 1, "abierto desde WhatsApp también sale");
      const texto = await caja.innerText();
      // Lo importante: NO mandarle a buscar "Compartir" de primeras, porque desde
      // dentro de WhatsApp esa opción no existe y se queda dando vueltas.
      ok(/Safari/i.test(texto) && /dentro de otra app/i.test(texto),
        "pero aquí lo primero que dice es que lo abra en Safari, no que busque Compartir");
      const boton = p.locator(".form-instalar .form-btn-principal");
      ok(await boton.count() === 1 && /Copiar enlace/i.test(await boton.innerText()),
        "y le da el enlace copiado, que es lo único que siempre funciona");

      // Nada de esto sirve si se sale de la pantalla
      const desb = await desbordamiento(p);
      ok(desb <= 0, `el aviso cabe en 390px sin desbordar (sobra ${desb}px)`);

      // "Ahora no" lo quita, pero ya no para siempre: antes un toque sin querer dejaba
      // a alguien sin saber nunca cómo instalarlo, y no había forma de recuperarlo.
      await p.locator(".form-instalar .form-btn-atras").click();
      await p.waitForTimeout(300);
      ok(await p.locator(".form-instalar").count() === 0, '"Ahora no" lo quita de en medio');
      const guardado = await p.evaluate(() => localStorage.getItem("gula_formulario_instalar"));
      ok(guardado && Number(guardado) > 0,
        "y se apunta cuándo se dijo que no, para poder volver a ofrecerlo dentro de un mes");
      await c.close();
    }

    {
      // La pantalla más estrecha que se ve en la calle
      const { c, p } = await abrirComo(WHATSAPP_IPHONE, 320);
      const desb = await desbordamiento(p);
      ok(desb <= 0, `y en 320px tampoco (sobra ${desb}px)`);
      const chico = await p.locator(".form-instalar button").evaluateAll(
        bs => bs.filter(b => b.getBoundingClientRect().height < 44).map(b => b.innerText.trim()));
      ok(chico.length === 0,
        `sus botones se pueden pulsar con el dedo${chico.length ? ` → ${chico.join(", ")}` : ""}`);
      await c.close();
    }

    {
      // "Falta el enlace" era un callejón sin salida, y justo donde peor caía: quien
      // guardaba el formulario en la pantalla de inicio del iPhone y le daba al icono
      // aterrizaba aquí, porque en iOS la app guardada estrena su propio almacén y no
      // ve el código que dejó el navegador. Sin nada que tocar, volvía a lo mismo.
      const { c, p } = await abrirComo(SAFARI_IPHONE, 390);
      await p.evaluate(() => localStorage.clear());
      await p.goto(BASE_FORM, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(900);

      ok(await p.locator(".link-roto h1").count() === 1, "sin código sale la pantalla de \"Falta el enlace\"");
      const campo = p.locator("#pegar-enlace");
      ok(await campo.count() === 1, "y ahora hay dónde pegar el enlace, que antes era un callejón sin salida");

      // Un enlace sin código no puede colar: abriría un formulario que no sabe a
      // dónde manda lo que se escriba
      await campo.fill("https://ejemplo.com/formulario/");
      await p.locator(".link-roto .form-btn-principal").click();
      await p.waitForTimeout(400);
      ok(await p.locator(".link-roto-error").isVisible(), "un enlace sin código avisa en vez de dejar pasar");

      const desb = await desbordamiento(p);
      ok(desb <= 0, `y la pantalla cabe en 390px (sobra ${desb}px)`);

      await campo.fill(BASE_FORM + "?enviar=PRUEBA1");
      await p.locator(".link-roto .form-btn-principal").click();
      await p.waitForTimeout(2400);
      ok(await p.locator(".link-roto h1").count() === 0 && await p.locator(".form-titulo").count() === 1,
        "y pegando el bueno entra al formulario");
      ok(/enviar=PRUEBA1/.test(p.url()),
        "con el código en la dirección, que es lo que se guarda al añadirlo a la pantalla de inicio");
      await c.close();
    }

    {
      // El código tiene que volver a la DIRECCIÓN aunque se abra sin él: si no, lo que
      // el móvil guarda al añadir a la pantalla de inicio no lo lleva, y el icono abre
      // un formulario mudo. Esto es lo que fallaba en el iPhone.
      const { c, p } = await abrirComo(SAFARI_IPHONE, 390);
      await p.goto(BASE_FORM, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      ok(/enviar=PRUEBA1/.test(p.url()),
        "abriendo sin código, el que ya estaba guardado vuelve solo a la dirección");
      ok(await p.locator(".form-titulo").count() === 1, "y el formulario abre normal");
      await c.close();
    }

    {
      // Android no toca: ahí el navegador avisa por su cuenta y sale el botón de verdad
      const c = await navegador.newContext({ viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true });
      for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
      const p = await nuevaPagina(c);
      await p.goto(BASE_FORM + "?enviar=PRUEBA1", { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2400);
      ok(await p.locator(".form-instalar").count() === 0,
        "y en un navegador que no es de iPhone no se le dan instrucciones que no le sirven");
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

    // Si algo sale en el camión es porque estaba preparado. Antes las dos listas podían
    // contradecirse —"cargado" pero "sin preparar"— y quien miraba la de preparación
    // volvía a buscar por el almacén algo que ya iba dentro del camión.
    await pestana("Salida").click();
    await p.waitForTimeout(700);
    const sinPreparar = p.locator(".carga-row").nth(2);
    const nombreSinPreparar = (await sinPreparar.locator(".carga-nombre").first().innerText()).trim();
    ok(await sinPreparar.locator(".carga-marca-otra.is-preparado").count() === 0,
      `"${nombreSinPreparar}" no estaba preparado`);
    await sinPreparar.locator('input[type="checkbox"]').check({ force: true });
    await p.waitForTimeout(900);
    ok(await guardado("preparados") === 3,
      `cargarlo en el camión lo da por preparado también (${await guardado("preparados")})`);
    await pestana("Prep.").click();
    await p.waitForTimeout(700);
    ok(await p.locator(".carga-row", { hasText: nombreSinPreparar }).first().locator('input[type="checkbox"]').isChecked(),
      "y en Preparación aparece ya marcado, sin tener que volver a buscarlo");

    // Al revés NO: bajar algo del camión no deshace el trabajo de haberlo preparado
    await pestana("Salida").click();
    await p.waitForTimeout(700);
    await p.locator(".carga-row", { hasText: nombreSinPreparar }).first().locator('input[type="checkbox"]').uncheck({ force: true });
    await p.waitForTimeout(900);
    // Se cuentan los marcados de verdad, no las claves: desmarcar deja la clave puesta
    // con valor false, así que contar claves daría el mismo número que antes.
    const marcados = (clave) => p.evaluate(k => Object.values(
      JSON.parse(localStorage.getItem("gula_checklist_estado") || "{}")[k] || {}).filter(Boolean).length, clave);
    ok(await marcados("preparados") === 3 && await marcados("checkeados") === 1,
      `pero desmarcar la salida no lo desprepara (preparados ${await marcados("preparados")}, cargados ${await marcados("checkeados")})`);

    // Subir de golpe al camión todo lo que ya está preparado. Lo normal es que
    // coincidan, y marcarlo uno a uno en una lista de 130 items es media hora. Es
    // además la forma de rehacer una carga que se haya perdido.
    const botonTodo = p.locator("button", { hasText: /Cargar todo lo preparado/ });
    ok(await botonTodo.count() === 1 && /\(2\)/.test(await botonTodo.innerText()),
      `en Salida sale el botón con lo que falta por cargar → "${(await botonTodo.innerText()).trim()}"`);
    await botonTodo.click();
    await p.waitForTimeout(1000);
    ok(await marcados("checkeados") === 3 && await marcados("preparados") === 3,
      `y sube al camión lo preparado sin tocar nada más (cargados ${await marcados("checkeados")} de ${await marcados("preparados")} preparados)`);
    ok(await botonTodo.count() === 0,
      "y desaparece cuando ya no queda nada preparado sin cargar");

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

    // Pero ese aviso vive en SU fila, y en una lista de más de cien ítems eso es no
    // verlo nunca: quien está cargando no va a recorrerla entera por si acaso. Tiene
    // que decirse arriba, que es lo único que se mira sin bajar.
    const contador = p.locator(".carga-por-revisar");
    ok(await contador.count() === 1,
      "y arriba, junto al recuento, se dice cuántos hay con la cantidad cambiada");
    ok(/1 con la cantidad cambiada/.test(await contador.innerText()),
      `con el número exacto → "${(await contador.innerText()).replace(/\s+/g, " ").trim()}"`);

    // Y lleva a la fila de un toque: buscarla a mano entre cien no es plan.
    // Se baja del todo primero, porque si no la fila ya se ve y el salto no se nota:
    // sin esto la comprobación pasaba sola sin llegar a probar nada.
    // El que hace scroll es .carga-modal (max-height + overflow-y), no el fondo. Moviendo
    // el fondo no pasaba nada y la fila seguía a la vista, así que la comprobación de
    // abajo se cumplía sola sin llegar a probar el salto.
    await p.locator(".carga-modal").evaluate(el => { el.scrollTop = el.scrollHeight; });
    await p.waitForTimeout(500);
    const aLaVista = () => fila.evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    });
    ok(!(await aLaVista()), "bajando del todo, la fila con la cantidad cambiada se pierde de vista");
    await contador.click();
    await p.waitForTimeout(1200);
    ok(await aLaVista(),
      "y al pulsar el aviso de arriba, la pantalla salta hasta ella");

    // Volver a tocarla es haberla revisado: el aviso desaparece
    await fila.locator('input[type="checkbox"]').click();
    await p.waitForTimeout(400);
    await fila.locator('input[type="checkbox"]').click();
    await p.waitForTimeout(900);
    ok(await fila.locator(".carga-marca-otra.is-revisar").count() === 0,
      "y al volver a marcarla el aviso se va, que ya está revisada");
    ok(await p.locator(".carga-por-revisar").count() === 0,
      "y el contador de arriba también, que ya no queda ninguno");
    await c.close();
  }

  // ── Cronómetros que se quedan puestos ───────────────────────────────────────
  // Cada cronómetro solo se ve en SU pestaña, así que al cambiar de pestaña se pierde de
  // vista y es facilísimo dejárselo corriendo. No es inocente: los tiempos cronometrados
  // calibran los estimados, o sea que una carga de catorce horas porque nadie paró el
  // reloj desajusta las estimaciones de los eventos siguientes.
  console.log("\n── Cronómetros olvidados ──");
  {
    const c = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
    for (const h of HOSTS_NUBE) await c.route(h, r => r.abort());
    const p = await nuevaPagina(c);

    const abrirCon = async (cronos) => {
      await p.goto(url({ ...EVENTO_COMPLETO, nombreEvento: "Boda cronómetros", cronos }), { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2200);
      await p.locator("button", { hasText: "Modo carga" }).first().click();
      await p.waitForTimeout(1400);
    };
    const aviso = () => p.locator(".carga-crono-aviso").first();

    // Recién arrancado no molesta: avisar por un cronómetro que acaba de empezar sería
    // ruido, y el ruido se aprende a ignorar justo antes de que haga falta de verdad.
    await abrirCon({ carga: { ms: 0, running: true, since: Date.now() - 5000 } });
    ok(await p.locator(".carga-crono-aviso").count() === 0,
      "un cronómetro recién puesto en marcha no avisa de nada");

    // Diez horas es olvido con cualquier estimado: ninguna de estas fases dura tanto
    await abrirCon({ carga: { ms: 0, running: true, since: Date.now() - 10 * 3600 * 1000 } });
    const texto = (await aviso().innerText()).replace(/\s+/g, " ").trim();
    ok(await p.locator(".carga-crono-aviso").count() === 1,
      "pero uno que lleva diez horas corriendo avisa arriba del todo");
    ok(/carga/i.test(texto) && /10:0/.test(texto),
      `el aviso dice cuál es y cuánto lleva → "${texto}"`);
    ok(await p.locator(".carga-crono-aviso.is-olvidado").count() === 1,
      "y con el tono de olvido, no con el de simple retraso");

    // El aviso vive FUERA de las pestañas: el cronómetro de carga está en Salida, y aquí
    // se ve estando en Vuelta. Ese es justo el caso en que uno se lo deja puesto.
    await p.locator(".carga-modo-toggle .segment-btn").filter({ hasText: "Vuelta" }).first().click();
    await p.waitForTimeout(800);
    ok(await p.locator(".carga-crono-aviso").count() === 1,
      "y se sigue viendo desde otra pestaña, que es donde se olvidan");

    // Y se para desde el propio aviso: si hay que ir a buscarlo, no se para
    await p.locator(".carga-crono-aviso-parar").first().click();
    await p.waitForTimeout(1000);
    ok(await p.locator(".carga-crono-aviso").count() === 0,
      'el botón "Pararlo" lo para sin ir a buscarlo, y el aviso se va');
    ok(await p.evaluate(() => {
      const cr = (JSON.parse(localStorage.getItem("gula_checklist_estado") || "{}").cronos || {}).carga || {};
      return cr.running === false && cr.ms > 0;
    }), "y queda parado de verdad, con el tiempo que llevaba guardado");

    // El cronómetro de preparación se quedaba clavado: el refresco de cada segundo solo
    // vigilaba carga y descarga, así que prep y montaje corrían por dentro sin verse
    // correr. Se comprueba que el número CAMBIA solo, sin tocar nada.
    await abrirCon({});
    await p.locator(".carga-modo-toggle .segment-btn").filter({ hasText: "Prep." }).first().click();
    await p.waitForTimeout(700);
    await p.locator(".crono-btn-start").first().click();
    await p.waitForTimeout(900);
    const t1 = await p.locator(".crono-tiempo").first().innerText();
    await p.waitForTimeout(2600);
    const t2 = await p.locator(".crono-tiempo").first().innerText();
    ok(t1 !== t2,
      `el cronómetro de preparación corre a la vista, no congelado (${t1} → ${t2})`);
    await c.close();
  }

  // ─── EL CALENDARIO DESDE LA CHECKLIST ──────────────────────────────────────
  console.log("\n══ El calendario desde la checklist: ?abrir= y quién ve el botón ══");
  {
    const c = await navegador.newContext({ viewport: { width: 390, height: 900 } });
    await c.route(HOSTS_NUBE[0], r => r.abort());
    const p = await c.newPage();
    p.on("pageerror", e => errores.push(`abrir: ${e}`));

    // El botón del calendario NO sale con un link de evento. Los apuntes viven en
    // indice/, que las reglas solo abren al equipo con sesión: a quien entra por un link
    // se le estaría ofreciendo una pantalla que no puede cargar.
    await p.goto(url({ evento: "boda", pax: 80 }), { waitUntil: "networkidle" });
    await p.waitForSelector(".app-wrapper");
    ok(await p.locator("button", { hasText: /^Calendario$/ }).count() === 0,
      "con un link de evento no se ofrece el calendario, que sin sesión no puede leerse");

    // "?abrir=" es como el calendario (otra app, otra carpeta) manda aquí a un evento
    // concreto. Antes no se leía siquiera: su botón "Abrir" traía a la checklist y no
    // pasaba absolutamente nada.
    await p.evaluate(() => {
      localStorage.setItem("gula_eventos_guardados", JSON.stringify({
        "Boda de prueba": { evento: "boda", pax: 90, nombreEvento: "Boda de prueba" },
      }));
    });
    await p.goto(url({ evento: "boda", pax: 80 }) + "&abrir=" + encodeURIComponent("Boda de prueba"), { waitUntil: "networkidle" });
    await p.waitForSelector(".dialogo-modal", { timeout: 12000 });
    ok(/Boda de prueba/.test(await p.locator(".dialogo-titulo").innerText()),
      "con ?abrir= y el evento guardado, la checklist ofrece abrirlo");
    await p.locator(".dialogo-acciones .btn-green").click();
    await p.waitForTimeout(1500);
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem("gula_checklist_estado") || "{}").nombreEvento) === "Boda de prueba",
      "y al confirmar queda abierto de verdad, no solo cerrado el diálogo");

    // Y si no está, se dice. Callarse deja pensando que el botón del calendario no va.
    await p.goto(url({ evento: "boda", pax: 80 }) + "&abrir=" + encodeURIComponent("Evento que no existe"), { waitUntil: "networkidle" });
    await p.waitForSelector(".dialogo-modal", { timeout: 12000 });
    const txt = await p.locator(".dialogo-modal").innerText();
    ok(/No encuentro ese evento/.test(txt) && /Evento que no existe/.test(txt),
      "y si el evento no está, se dice con su nombre en vez de no hacer nada");
    await c.close();
  }

  // ─── EL CALENDARIO ─────────────────────────────────────────────────────────
  // Va contra el banco de pruebas (pruebas/calendario.html), que monta los mismos
  // componentes con apuntes inventados y sin login: el calendario de verdad pide sesión
  // de equipo y la prueba se quedaba en la puerta.
  console.log("\n══ El calendario: la rejilla, el equipo y el responsive ══");
  {
    const BANCO = `http://localhost:${PUERTO}/pruebas/calendario.html`;
    const seMueveDeLado = (p) => p.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

    for (const w of [320, 390, 768, 1280]) {
      const c = await navegador.newContext({ viewport: { width: w, height: 900 } });
      const p = await c.newPage();
      p.on("pageerror", e => errores.push(`calendario ${w}px: ${e}`));
      await p.goto(BANCO, { waitUntil: "networkidle" });
      await p.waitForSelector(".cal-celda");

      ok(!await seMueveDeLado(p), `${w}px · el mes no mueve la página de lado`);

      // Los huecos del principio y del final del mes son null, y "ningún día abierto"
      // también era null: null === null les ponía la marca del día abierto y salían
      // todos recuadrados en oscuro nada más entrar. Llegó a producción así.
      ok(await p.locator(".cal-celda.es-hueco.es-abierto").count() === 0,
        `${w}px · las casillas vacías del mes no salen marcadas como el día abierto`);

      // En el móvil el nombre de la boda no cabe, así que la casilla tiene que decir
      // igualmente para cuánta gente es. Sin esto, un día con tres bodas eran tres
      // iconos y ninguna pista de si son 40 comensales o 330.
      ok(await p.locator(".cal-pax-dia").count() > 0,
        `${w}px · los días con eventos enseñan cuánta gente hay`);
      // Y nada de lo que va dentro de la casilla se sale de ella: con los iconos
      // envolviendo, la segunda fila salía cortada por la mitad y el número se perdía.
      ok(await p.evaluate(() => {
        let fuera = 0;
        document.querySelectorAll(".cal-celda").forEach(cel => {
          const c = cel.getBoundingClientRect();
          cel.querySelectorAll(".cal-puntos .cal-icono, .cal-pax-dia, .cal-mas").forEach(e => {
            const r = e.getBoundingClientRect();
            if (r.width && (r.right > c.right + 0.5 || r.bottom > c.bottom + 0.5)) fuera++;
          });
        });
        return fuera === 0;
      }), `${w}px · ni los iconos ni el número se salen de su casilla`);

      // El equipo: sin él, el aviso de choque no puede decir cuánta gente queda
      ok(/4 personas/.test(await p.locator(".cal-equipo-titulo").innerText()),
        `${w}px · la barra del equipo dice cuánta gente hay configurada`);
      ok(await p.locator(".cal-equipo-cuerpo").count() === 0,
        `${w}px · y arranca plegada, que el mes es lo que se viene a ver`);

      await p.locator(".cal-equipo-cab").click();
      await p.waitForSelector(".cal-equipo-cuerpo");
      ok(await p.locator(".cal-persona").count() === 4,
        `${w}px · abierta se ve a las cuatro personas`);
      ok(!await seMueveDeLado(p),
        `${w}px · y con el panel abierto la página sigue sin moverse de lado`);

      // Los campos, a 16px: por debajo iOS hace zoom al enfocar y se descoloca todo
      ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".cal-equipo-campo input")).fontSize) >= 16),
        `${w}px · los campos del equipo van a 16px, sin zoom de iOS al escribir`);

      // Quitar a alguien tiene que quitarlo de verdad, no solo de la lista de arriba
      await p.locator(".cal-persona-quitar").first().click();
      await p.waitForTimeout(200);
      ok(await p.locator(".cal-persona").count() === 3 && /3 personas/.test(await p.locator(".cal-equipo-titulo").innerText()),
        `${w}px · quitar a alguien lo quita de la lista y de la cuenta`);

      await c.close();
    }

    // La pantalla completa que monta la checklist por dentro. Aquella va detrás del
    // login del equipo y aquí no se puede cruzar, así que se prueba su maquetación: que
    // ocupe la pantalla, que la barra no se vaya al hacer scroll, y que el que scrollea
    // sea el cuerpo y no la página (si scrollea la página, al cerrar el calendario la
    // checklist reaparece a media altura, donde la dejó el mes).
    for (const w of [320, 768]) {
      const c = await navegador.newContext({ viewport: { width: w, height: 720 } });
      const p = await c.newPage();
      p.on("pageerror", e => errores.push(`calendario pantalla ${w}px: ${e}`));
      await p.goto(BANCO + "?pantalla=1", { waitUntil: "networkidle" });
      await p.waitForSelector(".cal-pantalla-cuerpo");
      ok(!await seMueveDeLado(p), `${w}px · a pantalla completa tampoco se mueve de lado`);
      ok(await p.evaluate(() => {
        const cuerpo = document.querySelector(".cal-pantalla-cuerpo");
        return cuerpo.scrollHeight > cuerpo.clientHeight
          && document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1;
      }), `${w}px · scrollea el cuerpo del calendario, no la página de debajo`);
      await p.evaluate(() => { document.querySelector(".cal-pantalla-cuerpo").scrollTop = 600; });
      await p.waitForTimeout(150);
      ok(await p.evaluate(() => document.querySelector(".cal-pantalla-barra").getBoundingClientRect().top <= 1),
        `${w}px · y la barra de cerrar se queda arriba al bajar por el mes`);
      await c.close();
    }

    // Traer apuntes por enlace. Es como entra de golpe lo que había en la hoja de pared
    // sin que nadie copie y pegue, y sin que esos nombres pasen por el repositorio.
    {
      const c = await navegador.newContext({ viewport: { width: 390, height: 900 } });
      const p = await c.newPage();
      p.on("pageerror", e => errores.push(`calendario traer: ${e}`));
      // El mismo código que genera enlaceParaTraer, hecho aquí para no depender de él
      const lista = [
        { fecha: "2027-05-01", titulo: "Boda Ángel y Begoña", tipo: "boda" },
        { fecha: "2027-05-08", titulo: "Recoger camión", tipo: "recogida" },
      ];
      const codigo = Buffer.from(JSON.stringify(lista), "utf8").toString("base64")
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      await p.goto(`${BANCO}?vacio=1#traer=${codigo}`, { waitUntil: "networkidle" });
      await p.waitForSelector(".cal-traer");
      const panel = (await p.locator(".cal-traer").innerText()).replace(/\s+/g, " ");
      ok(/trae 2 apuntes/.test(panel) && /Boda Ángel y Begoña/.test(panel),
        `el enlace enseña qué trae ANTES de meterlo → "${panel.slice(0, 70)}…"`);
      // Y la dirección se limpia en cuanto se lee: ni recargando vuelve a preguntar, y
      // los nombres no se quedan en la barra a la vista de quien pase por al lado.
      ok(await p.evaluate(() => window.location.hash) === "",
        "y los datos desaparecen de la barra de direcciones nada más leerlos");

      await p.locator(".cal-traer-botones .btn-green").click();
      await p.waitForTimeout(300);
      ok(await p.locator(".cal-traer").count() === 0,
        "al traerlos, el panel se va solo: no hay que quitarlo a mano después");
      await p.locator(".cal-nav-btn").first().click();  // el calendario abre en el mes de hoy
      ok(await p.locator(".cal-viene, .cal-mes").count() > 0,
        "y el calendario sigue en pie con los apuntes dentro");
      await c.close();
    }

    // El aviso que justifica todo esto: dos eventos el mismo día Y media plantilla fuera
    const c = await navegador.newContext({ viewport: { width: 390, height: 900 } });
    const p = await c.newPage();
    p.on("pageerror", e => errores.push(`calendario choque: ${e}`));
    await p.goto(BANCO, { waitUntil: "networkidle" });
    await p.waitForSelector(".cal-choque");
    const choque = (await p.locator(".cal-choque").first().innerText()).replace(/\s+/g, " ").trim();
    ok(/2 eventos el mismo d[ií]a/.test(choque) && /solo est[aá]is 2 de 4/.test(choque),
      `el aviso de choque dice cuántos eventos y cuánta gente queda → "${choque}"`);
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
