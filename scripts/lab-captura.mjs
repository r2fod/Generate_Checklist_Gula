// Captura las variantes del laboratorio (diseno/lab/) a 320 y 1280 px, claro y oscuro,
// con animaciones desactivadas. Levanta vite en un puerto propio y lo apaga al acabar.
//
//   node scripts/lab-captura.mjs [variante ...]     (sin argumentos: todas)
//
// Salida: diseno/lab/capturas/<variante>-<ancho>-<tema>.png (ignorado por git).
// Necesita chromium: CHROMIUM_PATH o Chrome/Chromium instalado (mismo criterio que app.test.mjs).
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = 5199;
const rutas = [
  process.env.CHROMIUM_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];
const chromiumPath = rutas.find((r) => r && existsSync(r));
if (!chromiumPath) { console.error("No hay chromium: pon CHROMIUM_PATH."); process.exit(1); }

const todas = JSON.parse(readFileSync(join(RAIZ, "diseno/lab/variantes/indice.json"), "utf8"));
const variantes = process.argv.slice(2).length ? process.argv.slice(2) : todas;
const salida = join(RAIZ, "diseno/lab/capturas");
mkdirSync(salida, { recursive: true });

const servidor = spawn("npx", ["vite", "--port", String(PUERTO), "--strictPort"], { cwd: RAIZ, stdio: "ignore" });
const apaga = () => servidor.kill();
process.on("exit", apaga);
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://localhost:${PUERTO}/diseno/lab/index.html`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const { chromium } = await import("playwright-core");
const navegador = await chromium.launch({ executablePath: chromiumPath, args: ["--no-sandbox"] });
try {
  for (const v of variantes) for (const ancho of [320, 1280]) for (const tema of ["claro", "oscuro"]) {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: 800 }, deviceScaleFactor: 1 });
    await pagina.goto(`http://localhost:${PUERTO}/diseno/lab/index.html?v=${v}&tema=${tema}`);
    await pagina.waitForSelector("body[data-listo]");
    const desborda = await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const archivo = join(salida, `${v}-${ancho}-${tema}.png`);
    await pagina.screenshot({ path: archivo, fullPage: true, animations: "disabled" });
    console.log(`${desborda ? "⚠ scroll horizontal" : "ok"}  ${archivo}`);
    await pagina.close();
  }
} finally {
  await navegador.close();
  apaga();
}
