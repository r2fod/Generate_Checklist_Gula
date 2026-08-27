// ─── CONECTOR: MARKETING ──────────────────────────────────────────────────────
// El hueco por donde el asistente crece en la otra dirección: no solo los eventos
// que ya hay, sino los que todavía no hay. v1 (A4 del plan) es analizar webs —
// la propia o la de la competencia— y convertirlo en estrategia; v2 trae las
// redes sociales por captura del móvil con visión (Instagram no enseña su
// contenido a un scraper anónimo: el muro de login, ver worker/index.js).
//
// datos: false, y no por despiste: la extracción es de una web PÚBLICA, no de
// datos de clientes. Por aquí pasa "la web tiene botón de reserva", no "la boda
// de García". Lo que se prepara con esto (posts, guiones, planes) se escribe en
// la conversación, listo para copiar, y en tareas con fecha con apuntar_tarea.
import { registrarConector } from "../conectores.js";

export default registrarConector({
  id: "marketing",
  nombre: "Marketing",
  descripcion: "Analizar webs (propia o de la competencia) para la estrategia de captación.",
  escribeFuera: false,
  necesita: [],
  herramientas: {
    analizar_web: {
      datos: false,
      esquema: {
        description: "Analiza una web pública (la propia o la de la competencia) y devuelve lo que cuenta para captar clientes: título, descripción, secciones, botones de reserva o contacto, WhatsApp, teléfonos y precios visibles. Úsala para 'mira nuestra web', '¿qué hace bien la competencia?', '¿pueden pedirme presupuesto desde la web?' o para montar una estrategia de captación. Pide la dirección completa, con https://.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "La dirección completa de la web, con https://." },
          },
          required: ["url"],
        },
      },
      // La url y el token vienen del contexto (los mete Asistente.jsx): la
      // herramienta no los pide al modelo, que los inventaría.
      corre: async (ctx, { url = "" } = {}) => {
        const base = String(ctx.urlProxy || "").replace(/\/+$/, "");
        if (!base) {
          return { error: "El asistente no está configurado: falta la dirección del Worker, y sin ella no puede mirar webs." };
        }
        if (!/^[ht]/.test(String(url))) {
          return { error: "Falta la dirección completa: pídela con https:// delante." };
        }
        try {
          const r = await fetch(`${base}/__analizar`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(ctx.token ? { authorization: `Bearer ${ctx.token}` } : {}),
            },
            body: JSON.stringify({ url }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok || d.error) return { error: d.error || `La web no ha dejado analizarse (${r.status}).` };
          return d;
        } catch (e) {
          return { error: `No se ha podido llegar al proxy: ${e && e.message ? e.message : e}` };
        }
      },
    },
  },
});
