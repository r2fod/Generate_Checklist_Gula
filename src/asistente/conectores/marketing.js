// ─── CONECTOR: MARKETING ──────────────────────────────────────────────────────
// El hueco por donde el asistente crece en la otra dirección: no solo los eventos
// que ya hay, sino los que todavía no hay.
//
// v1: analizar webs (la propia o la de la competencia) y convertirlo en estrategia.
// v2: las redes sociales por captura del móvil: Instagram y compañía no enseñan su
//     contenido a un scraper anónimo (muro de login), así que lo que ve el asistente
//     es lo que el usuario le fotografía. El ojo es Gemini (worker: visionGemini),
//     nunca otro proveedor: la captura puede mostrar clientes en las fotos, y la
//     barrera de datos no se salta por la puerta de atrás.
//
// datos: false, y no por despiste: lo que se analiza es contenido PÚBLICO (una web,
// la propia o la de la competencia, o la captura que el usuario elige enseñar), no
// datos de clientes de la app. Lo que se prepara con esto (posts, guiones, planes)
// se escribe en la conversación, listo para copiar, y en tareas con fecha.
import { registrarConector } from "../conectores.js";

export default registrarConector({
  id: "marketing",
  nombre: "Marketing",
  descripcion: "Analizar webs y capturas de redes para la estrategia de captación.",
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
    analizar_captura: {
      datos: false,
      esquema: {
        description: "Analiza la captura de pantalla que el usuario acaba de adjuntar: un perfil de Instagram o TikTok, su rejilla, un post, una página de Google, lo que sea. Describe quién es, qué contenido hay, qué se repite y qué falta para captar clientes. Tú no ves la imagen: la ve esta herramienta, y solo se puede llamar cuando hay captura adjunta en el mensaje.",
        parameters: {
          type: "object",
          properties: {
            pregunta: { type: "string", description: "Lo que el usuario quiere saber de la captura, si ha dicho algo." },
          },
        },
      },
      corre: async (ctx, { pregunta = "" } = {}) => {
        const base = String(ctx.urlProxy || "").replace(/\/+$/, "");
        if (!base) {
          return { error: "El asistente no está configurado: falta la dirección del Worker, y sin ella no puede ver capturas." };
        }
        if (!ctx.captura) {
          return { error: "No hay ninguna captura adjunta en este mensaje: que el usuario la adjunte con el clip, al lado del cuadro de escribir." };
        }
        try {
          const r = await fetch(`${base}/__vision`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(ctx.token ? { authorization: `Bearer ${ctx.token}` } : {}),
            },
            body: JSON.stringify({ imagen: ctx.captura, mime: ctx.capturaMime || "image/jpeg", pregunta }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok || d.error) return { error: d.error || `No se ha podido analizar la captura (${r.status}).` };
          return { analisis: d.analisis };
        } catch (e) {
          return { error: `No se ha podido llegar al proxy: ${e && e.message ? e.message : e}` };
        }
      },
    },
  },
});
