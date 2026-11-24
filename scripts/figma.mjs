// ─── FIGMA → TOKENS DE GULA, EN POCO TEXTO ───────────────────────────────────
// Lee un frame de Figma por la API REST (solo lectura), lo comprime a lo esencial y
// traduce colores, tamaños de letra y radios a los tokens de src/index.css. Lo que no
// tiene equivalente sale marcado "sin token": se pregunta, no se inventa un hex.
//
//   FIGMA_TOKEN=... node scripts/figma.mjs "<enlace del frame>" [--imagen] [--prof=6]
//
// El token vive SOLO en la variable de entorno: no se imprime ni se guarda.
// Con --imagen baja además un PNG del frame a diseno/lab/capturas/ (ignorado por git)
// para compararlo con la captura de Playwright (scripts/lab-captura.mjs).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Enlace de Figma → { clave, nodo }. El id del nodo va con "-" en la URL y con ":" en la API. */
export function leeEnlace(enlace) {
  const u = new URL(enlace);
  const m = u.pathname.match(/\/(?:design|file|proto)\/([A-Za-z0-9]+)/);
  if (!m) throw new Error("No parece un enlace de Figma con archivo (/design/<clave>/...)");
  const nodo = u.searchParams.get("node-id");
  if (!nodo) throw new Error("Falta node-id: en Figma, clic derecho en el frame → Copy link");
  return { clave: m[1], nodo: nodo.replace(/-/g, ":") };
}

const aHex = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
/** Color de Figma (0–1) → #rrggbb. */
export function colorAHex({ r, g, b }) { return `#${aHex(r)}${aHex(g)}${aHex(b)}`; }

/** Tokens del primer bloque :root (el claro) de index.css. */
export function leeTokens(css) {
  const bloque = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const colores = {}, tamanos = {}, radios = {};
  for (const [, nombre, valor] of bloque.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const v = valor.trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) colores[nombre] = v.toLowerCase();
    else if (/^--fs-/.test(nombre) && /^[\d.]+(rem|px)$/.test(v)) tamanos[nombre] = parseFloat(v) * (v.endsWith("rem") ? 16 : 1);
    else if (/^--radius-/.test(nombre) && /^[\d.]+px$/.test(v)) radios[nombre] = parseFloat(v);
  }
  return { colores, tamanos, radios };
}

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const distancia = (a, b) => Math.hypot(...rgb(a).map((x, i) => x - rgb(b)[i]));

/** Token más cercano: "=--x" si es exacto, "≈--x" si está a ≤12 de distancia RGB, si no "sin token". */
export function mapeaColor(hex, colores) {
  const h = hex.toLowerCase();
  let mejor = null, d = Infinity;
  for (const [n, v] of Object.entries(colores)) {
    const x = distancia(h, v);
    if (x < d) { d = x; mejor = n; }
  }
  if (mejor && d === 0) return `=${mejor}`;
  if (mejor && d <= 12) return `≈${mejor}`;
  return "sin token";
}

/** Número más cercano de un grupo de tokens (tamaños o radios). */
export function mapeaNumero(px, grupo, margen = 0.5) {
  let mejor = null, d = Infinity;
  for (const [n, v] of Object.entries(grupo)) {
    const x = Math.abs(px - v);
    if (x < d) { d = x; mejor = n; }
  }
  if (mejor && d === 0) return `=${mejor}`;
  if (mejor && d <= margen) return `≈${mejor}`;
  return "sin token";
}

const px = (n) => Math.round(n * 10) / 10;

/** Nodo de Figma → líneas de texto con sangría. Salta lo invisible y recorta hijos y profundidad. */
export function comprime(nodo, tokens, { prof = 6, maxHijos = 40 } = {}, nivel = 0) {
  if (!nodo || nodo.visible === false) return [];
  const o = [];
  const p = [];
  const caja = nodo.absoluteBoundingBox;
  if (caja) p.push(`${px(caja.width)}x${px(caja.height)}`);
  if (nodo.layoutMode === "HORIZONTAL") p.push("fila");
  if (nodo.layoutMode === "VERTICAL") p.push("columna");
  if (nodo.itemSpacing) p.push(`gap=${px(nodo.itemSpacing)}`);
  const pad = [nodo.paddingTop, nodo.paddingRight, nodo.paddingBottom, nodo.paddingLeft];
  if (pad.some(Boolean)) p.push(`pad=${pad.map((x) => px(x || 0)).join("/")}`);
  if (typeof nodo.cornerRadius === "number" && nodo.cornerRadius > 0) {
    p.push(`radio=${px(nodo.cornerRadius)}(${mapeaNumero(nodo.cornerRadius, tokens.radios, 1)})`);
  }
  for (const f of nodo.fills ?? []) {
    if (f.type !== "SOLID" || f.visible === false) continue;
    const h = colorAHex(f.color);
    const alfa = (f.opacity ?? 1) * (f.color.a ?? 1);
    p.push(`${nodo.type === "TEXT" ? "color" : "fondo"}=${h}${alfa < 1 ? `@${px(alfa)}` : ""}(${mapeaColor(h, tokens.colores)})`);
  }
  for (const s of nodo.strokes ?? []) {
    if (s.type === "SOLID" && s.visible !== false) {
      const h = colorAHex(s.color);
      p.push(`borde=${h}(${mapeaColor(h, tokens.colores)})`);
    }
  }
  if (nodo.type === "TEXT" && nodo.style) {
    const t = nodo.style;
    p.push(`${px(t.fontSize)}px/${t.fontWeight}(${mapeaNumero(t.fontSize, tokens.tamanos)})`, t.fontFamily);
    if (nodo.characters) p.push(`"${nodo.characters.slice(0, 60).replace(/\s+/g, " ")}"`);
  }
  o.push(`${"  ".repeat(nivel)}${nodo.type} "${nodo.name}" ${p.join(" ")}`.trimEnd());
  const hijos = (nodo.children ?? []).filter((h) => h.visible !== false);
  if (nivel + 1 >= prof) {
    if (hijos.length) o.push(`${"  ".repeat(nivel + 1)}… ${hijos.length} hijos más (sube --prof)`);
    return o;
  }
  for (const h of hijos.slice(0, maxHijos)) o.push(...comprime(h, tokens, { prof, maxHijos }, nivel + 1));
  if (hijos.length > maxHijos) o.push(`${"  ".repeat(nivel + 1)}… +${hijos.length - maxHijos} más`);
  return o;
}

async function api(ruta, token) {
  const r = await fetch(`https://api.figma.com${ruta}`, { headers: { "X-Figma-Token": token } });
  if (!r.ok) throw new Error(`Figma respondió ${r.status} en ${ruta.split("?")[0]} (¿token sin permiso de lectura de archivos?)`);
  return r.json();
}

async function principal() {
  const args = process.argv.slice(2);
  const enlace = args.find((a) => !a.startsWith("--"));
  const prof = Number(args.find((a) => a.startsWith("--prof="))?.slice(7)) || 6;
  const token = process.env.FIGMA_TOKEN;
  if (!enlace) throw new Error('Uso: FIGMA_TOKEN=... node scripts/figma.mjs "<enlace del frame>" [--imagen] [--prof=6]');
  if (!token) throw new Error("Falta la variable de entorno FIGMA_TOKEN (token personal de Figma, solo lectura)");
  const { clave, nodo } = leeEnlace(enlace);
  const tokens = leeTokens(readFileSync(join(AQUI, "../src/index.css"), "utf8"));
  const datos = await api(`/v1/files/${clave}/nodes?ids=${encodeURIComponent(nodo)}`, token);
  const raiz = datos.nodes?.[nodo]?.document;
  if (!raiz) throw new Error("El frame no existe en ese archivo (¿node-id correcto?)");
  console.log(comprime(raiz, tokens, { prof }).join("\n"));
  if (args.includes("--imagen")) {
    const im = await api(`/v1/images/${clave}?ids=${encodeURIComponent(nodo)}&format=png&scale=2`, token);
    const url = im.images?.[nodo];
    if (!url) throw new Error("Figma no devolvió imagen del frame");
    const carpeta = join(AQUI, "../diseno/lab/capturas");
    mkdirSync(carpeta, { recursive: true });
    const destino = join(carpeta, `figma-${nodo.replace(":", "-")}.png`);
    writeFileSync(destino, Buffer.from(await (await fetch(url)).arrayBuffer()));
    console.log(`\nImagen: ${destino}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => { console.error(e.message); process.exit(1); });
}
