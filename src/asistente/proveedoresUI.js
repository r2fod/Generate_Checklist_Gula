// ─── LOS PROVEEDORES, EN PANTALLA ──────────────────────────────────────────────
// Qué botones mostrar en Ajustes para elegir proveedor a mano, y con qué nombre y nota.
// Función pura y sin React: se prueba aparte de Asistente.jsx, que solo la pinta.
import { ORDEN, SIN_DATOS_DE_CLIENTES } from "./enrutado.js";

// Nombres para pantalla de los proveedores que el Worker puede llegar a hablar (ver
// PROVEEDORES en worker/index.js, mismos ids). "compatible" es el hueco abierto
// (OpenRouter, DeepSeek, Ollama... lo que se le ponga en su panel): no tiene nota fija
// porque puede ser cualquier cosa.
export const NOMBRE_PROVEEDOR = {
  gemini: "Gemini", groq: "Groq", cerebras: "Cerebras", zai: "Z.AI", cloudflare: "Cloudflare",
  claude: "Claude", openai: "OpenAI", mistral: "Mistral", openrouter: "OpenRouter",
  nvidia: "NVIDIA", compatible: "Compatible",
};

export const notaDe = (id) => (id === "compatible" ? "tu proveedor"
  : SIN_DATOS_DE_CLIENTES.includes(id) ? "sin clientes"
  : id === "claude" ? "de pago" : "gratis");

// Solo se ofrecen a mano los que el Worker dice que tienen clave puesta ("disponibles"):
// antes la lista era fija (Gemini/Claude/OpenAI) y los otros siete de la cascada gratis
// no se podían elegir uno a uno, aunque estuvieran configurados — solo entraban en el
// modo Automático. Con la lista vacía (antes de la primera respuesta, cuando aún no se
// sabe qué hay configurado) se asume Gemini, que es el que se monta por defecto, para no
// dejar la pantalla sin nada que elegir. El orden es el mismo que usa el enrutado
// automático (ORDEN, en enrutado.js): primero lo gratis, luego lo bueno, luego lo
// limitado — así lo que se ve arriba en Ajustes es lo mismo que se usaría solo.
export function proveedoresElegibles(disponibles) {
  const lista = disponibles && disponibles.length ? disponibles : ["gemini"];
  return ORDEN.filter(id => lista.includes(id))
    .map(id => ({ id, nombre: NOMBRE_PROVEEDOR[id] || id, nota: notaDe(id) }));
}
