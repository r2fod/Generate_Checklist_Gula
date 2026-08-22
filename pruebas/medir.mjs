// ─── MEDIR ANTES DE TOCAR ─────────────────────────────────────────────────────
// La regla de la casa es que no se optimiza nada sin un número delante: en este
// repositorio ya hay dos apartados de "decidido NO hacer" por eso mismo (useMemo,
// partir el CSS). Esto es lo que produce ese número.
//
//   node pruebas/medir.mjs
//
// Mide dos cosas, que son las dos que se notan con la app llena:
//
//   1. La cuenta pura del calendario (sin React, sin navegador): cuánto cuesta saneaLista,
//      porDia, aVistaProxima, choques y la rejilla del mes con 12, 200, 250 y 500
//      apuntes. Esto corre SIEMPRE, no hace falta nada instalado.
//   2. Lo que de verdad ve la persona —pintar la rejilla y abrir el asistente— en un
//      navegador de verdad, contra el banco de pruebas con 250 apuntes inventados.
//      Necesita chromium (el mismo que usa app.test.mjs) y el `dist/` construido. Si no
//      hay chromium, se salta esa parte y lo dice, en vez de fallar.
//
// Los apuntes son inventados: esto imprime títulos por pantalla y el repositorio es
// público.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import {
  saneaLista, porDia, aVistaProxima, choques, semanasDelMes, disponiblesEn, saneaEquipo, aISO,
} from "../src/calendario/apuntes.js";

const HOY = new Date();
const dia = (n) => aISO(new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + n));
const TIPOS = ["boda", "comunion", "corporativo", "cumpleanos", "produccion", "vacaciones", "tarea", "recogida"];

// Un año largo de trabajo repartido alrededor de hoy: la mitad pasados y la mitad por
// venir, que es como está un calendario de verdad y no todo en el mes que se mira.
export function apuntesInventados(cuantos) {
  const lista = [];
  for (let i = 0; i < cuantos; i++) {
    lista.push({
      fecha: dia((i % 400) - 100),
      titulo: `Evento inventado ${i}`,
      tipo: TIPOS[i % TIPOS.length],
      pax: 50 + (i % 200),
      hora: "13:00",
      sitio: "Sitio de prueba",
    });
  }
  return lista;
}

const ms = (n) => `${n.toFixed(2)} ms`;

console.log("\n══ La cuenta pura del calendario (sin React) ══");
{
  const equipo = saneaEquipo([{ nombre: "Fulanita" }, { nombre: "Menganito" }, { nombre: "Zutana" }, { nombre: "Perengano" }]);
  const VUELTAS = 50;
  for (const cuantos of [12, 200, 250, 500]) {
    const bruto = apuntesInventados(cuantos);
    const t0 = performance.now();
    const lista = saneaLista(bruto);
    const tSanea = performance.now() - t0;

    const cronometra = (fn) => {
      const a = performance.now();
      for (let i = 0; i < VUELTAS; i++) fn();
      return (performance.now() - a) / VUELTAS;
    };
    const tPorDia = cronometra(() => porDia(lista));
    const tProximos = cronometra(() => aVistaProxima(lista));
    const tChoques = cronometra(() => choques(lista));
    // La rejilla del mes con lo que se pinta en cada casilla: quién está disponible ese
    // día. Es lo más caro de todo porque son ~35 casillas × la lista entera.
    const tRejilla = cronometra(() => {
      semanasDelMes(HOY.getFullYear(), HOY.getMonth() + 1)
        .flat().filter(Boolean).forEach(d => disponiblesEn(lista, d, equipo));
    });

    console.log(`  ${String(cuantos).padStart(4)} apuntes · saneaLista ${ms(tSanea)} · porDia ${ms(tPorDia)}`
      + ` · próximos ${ms(tProximos)} · choques ${ms(tChoques)} · rejilla+disponibles ${ms(tRejilla)}`);
  }
  console.log("  (una pintada normal del mes = porDia + próximos + choques + rejilla, UNA vez)");
}

// ─── EL NAVEGADOR ─────────────────────────────────────────────────────────────
function rutaChromium() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  return [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].find(r => existsSync(r));
}

const CHROMIUM = rutaChromium();
if (!CHROMIUM) {
  console.log("\n══ El navegador ══");
  console.log("  Saltado: no hay chromium. Pon CHROMIUM_PATH o instálalo como para app.test.mjs.");
  process.exit(0);
}

// El banco de pruebas se sirve con Vite en modo desarrollo, no desde dist/: es la única
// forma de llegar a la rejilla y al asistente sin sesión de equipo. Los números salen
// un pelín peores que en producción (sin minificar), pero lo que se busca es comparar
// antes y después, no publicar una cifra bonita.
const PUERTO = 4179;
const vite = spawn("npx", ["vite", "--port", String(PUERTO), "--strictPort"], { stdio: "ignore" });
const esperar = (msg) => new Promise(r => setTimeout(r, msg));
await esperar(4000);

const { chromium } = await import("playwright-core");
const navegador = await chromium.launch({ executablePath: CHROMIUM });
try {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const base = `http://localhost:${PUERTO}/pruebas/calendario.html`;

  console.log("\n══ Pintar el calendario con 250 apuntes ══");
  await pagina.goto(`${base}?muchos=250`, { waitUntil: "load" });
  await pagina.locator(".cal-mes").first().waitFor({ timeout: 20000 });
  const pintado = await pagina.evaluate(() => window.__medida || null);
  if (pintado) console.log(`  Del montaje a la rejilla en pantalla: ${pintado.toFixed(2)} ms`);

  // Cambiar de mes vuelve a pintar la rejilla entera. Es el gesto que más se repite.
  const cambioDeMes = await pagina.evaluate(async () => {
    const boton = document.querySelector('[aria-label="Mes siguiente"]');
    if (!boton) return null;
    const t0 = performance.now();
    boton.click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  if (cambioDeMes) console.log(`  Cambiar de mes (repintar la rejilla): ${cambioDeMes.toFixed(2)} ms`);

  console.log("\n══ Abrir el asistente ══");
  await pagina.goto(`${base}?boton=1`, { waitUntil: "load" });
  const abrir = await pagina.evaluate(async () => {
    const boton = [...document.querySelectorAll("button")].find(b => /asistente/i.test(b.textContent || ""));
    if (!boton) return null;
    const t0 = performance.now();
    boton.click();
    // Hasta que el panel existe de verdad en el DOM: es cuando la persona lo ve.
    while (!document.querySelector(".asis-panel") && performance.now() - t0 < 15000) {
      await new Promise(r => setTimeout(r, 8));
    }
    return performance.now() - t0;
  });
  if (abrir === null) console.log("  No se ha encontrado el botón del asistente en el banco.");
  else console.log(`  Del clic al panel en pantalla: ${abrir.toFixed(2)} ms`);
} finally {
  await navegador.close();
  vite.kill();
}
