// Prueba de scripts/figma.mjs. OJO: el nodo de abajo sigue la FORMA documentada de
// /v1/files/:clave/nodes (absoluteBoundingBox, fills, layoutMode, style...) con datos
// inventados. CLAUDE.md pide forma real: cuando haya un frame real, sustituirlo aquí.
import { leeEnlace, colorAHex, leeTokens, mapeaColor, mapeaNumero, comprime } from "../../scripts/figma.mjs";
import { readFileSync } from "node:fs";

let fallos = 0;
const eq = (nombre, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) { fallos++; console.error(`✗ ${nombre}\n  real:     ${JSON.stringify(real)}\n  esperado: ${JSON.stringify(esperado)}`); }
};

eq("enlace", leeEnlace("https://www.figma.com/design/AbC123/Gula?node-id=12-34&t=x"), { clave: "AbC123", nodo: "12:34" });
for (const malo of ["https://www.figma.com/design/AbC123/Gula", "https://example.com/x?node-id=1-2"]) {
  let lanzo = false; try { leeEnlace(malo); } catch { lanzo = true; }
  eq(`enlace inválido ${malo}`, lanzo, true);
}
eq("color", colorAHex({ r: 1, g: 1, b: 1 }), "#ffffff");

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const tokens = leeTokens(css);
eq("lee radios", tokens.radios["--radius-md"], 12);
eq("lee tamaños", Math.round(tokens.tamanos["--fs-base"] * 100) / 100, 14.72);
eq("color exacto", mapeaColor("#ffffff", tokens.colores).startsWith("="), true);
eq("color lejano", mapeaColor("#ff00ff", { "--x": "#000000" }), "sin token");
eq("color cercano", mapeaColor("#0f766f", { "--a": "#0f766e" }), "≈--a");
eq("número exacto", mapeaNumero(12, { "--radius-md": 12 }), "=--radius-md");
eq("número sin token", mapeaNumero(30, { "--radius-md": 12 }), "sin token");

const nodo = {
  id: "1:2", name: "Tarjeta evento", type: "FRAME", layoutMode: "VERTICAL", itemSpacing: 8,
  paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12, cornerRadius: 12,
  absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 96 },
  fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
  children: [
    { id: "1:3", name: "Título", type: "TEXT", characters: "Evento de prueba", style: { fontFamily: "Inter", fontSize: 16, fontWeight: 600 },
      fills: [{ type: "SOLID", color: { r: 0.12, g: 0.145, b: 0.196, a: 1 } }] },
    { id: "1:4", name: "Oculto", type: "FRAME", visible: false },
  ],
};
const salida = comprime(nodo, tokens);
eq("líneas (el oculto no sale)", salida.length, 2);
eq("frame con gap y radio", /fila|columna/.test(salida[0]) && salida[0].includes("gap=8") && salida[0].includes("radio=12(=--radius-md)"), true);
eq("texto con tamaño", salida[1].includes('16px/600') && salida[1].includes('"Evento de prueba"'), true);
eq("recorta profundidad", comprime(nodo, tokens, { prof: 1 }).at(-1).includes("1 hijos más"), true);

if (fallos) { console.error(`\n${fallos} fallo(s)`); process.exit(1); }
console.log("figma.test: OK");
