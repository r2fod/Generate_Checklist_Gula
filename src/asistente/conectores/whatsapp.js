// ─── CONECTOR: WHATSAPP ───────────────────────────────────────────────────────
// El primer conector, y el que enseña la forma que tienen todos. Se eligió este porque
// no necesita ni servidor ni permiso de nadie: WhatsApp abre por un enlace, así que
// funciona hoy, en el móvil, sin montar nada.
//
// Lo que hace es lo que ya se hace a mano: escribir el mensaje del grupo. "Mañana boda
// en tal sitio, salimos a las 6:47, somos tres de logística". Eso hoy lo redacta alguien
// mirando cuatro pantallas; aquí sale de las mismas cuentas que la escaleta.
//
// NO manda nada solo. Devuelve el texto y el enlace, y quien pregunta decide. Ese es el
// trato de todo lo que sale hacia fuera: la app prepara, la persona envía.
import { registrarConector } from "../conectores.js";
import { escaletaDelEvento, resumenEscaleta } from "../../escaleta.js";
import { menusEspeciales, alergiasDeLasNotas } from "../../menus-especiales.js";
import { sinTildes } from "../../texto.js";


const buscaEvento = (ctx, nombre) => {
  const archivo = ctx.eventosGuardados || {};
  const n = sinTildes(nombre);
  if (!n) return ctx.eventoActual ? [ctx.eventoActual.nombreEvento || "", ctx.eventoActual] : null;
  return Object.entries(archivo).find(([k]) => sinTildes(k).includes(n)) || null;
};

export default registrarConector({
  id: "whatsapp",
  nombre: "WhatsApp",
  descripcion: "Prepara el mensaje del grupo con la información del evento. No lo manda: lo deja escrito y tú le das a enviar.",
  escribeFuera: false,        // deja el texto preparado, no envía
  necesita: [],               // no hace falta configurar nada: es un enlace
  herramientas: {
    mensaje_para_el_equipo: {
      datos: true,
      esquema: {
        description: "Escribe el mensaje de WhatsApp para el grupo del equipo con lo que hay que saber de un evento: cuándo, dónde, a qué hora se sale y las alergias. Devuelve el texto y un enlace para abrirlo en WhatsApp. No lo envía.",
        parameters: {
          type: "object",
          properties: {
            nombre: { type: "string", description: "Nombre del evento. Vacío para el que está abierto." },
            telefono: { type: "string", description: "Teléfono con prefijo, sin espacios ni +. Vacío para elegir el grupo al abrir." },
          },
        },
      },
      corre: (ctx, { nombre = "", telefono = "" } = {}) => {
        const hit = buscaEvento(ctx, nombre);
        if (!hit) return { error: `No encuentro ningún evento que se llame "${nombre}".` };
        const [nom, e] = hit;
        const lineas = [`*${nom}*`];
        if (e.fechaEvento) lineas.push(`📅 ${e.fechaEvento}${e.horaInicio ? ` · empieza a las ${e.horaInicio}` : ""}`);
        if (e.ubicacion) lineas.push(`📍 ${e.ubicacion}`);
        const total = (e.pax || 0) + (e.ninos || 0);
        if (total) lineas.push(`👥 ${total} comensales${e.ninos ? ` (${e.ninos} niños)` : ""}`);

        const logistica = (e.logisticaEquipo || []).filter(p => p && (p.nombre || p.inicio));
        const tramos = escaletaDelEvento({
          horaInicio: e.horaInicio,
          horasCoctel: e.barraCoctel ? e.horasCoctel || 0 : 0,
          horasCopas: e.barraCopas ? e.horasCopas || 0 : 0,
          totalItems: 140, pax: total || 100,
          numLogistica: logistica.length || 1, logisticaEquipo: logistica,
        });
        if (tramos.length) lineas.push(`🚚 ${resumenEscaleta(tramos)}`);

        // Las alergias van al final y separadas: es lo que hay que leer sí o sí, y en un
        // mensaje largo lo del medio se lee en diagonal.
        const alergias = menusEspeciales(alergiasDeLasNotas(e.notasEvento || ""));
        if (alergias.length) {
          lineas.push("");
          lineas.push(`⚠️ *ALERGIAS* — ${alergias.map(a => `${a.n} × ${a.label.replace(/^Menú /, "")}`).join(", ")}`);
        }

        const texto = lineas.join("\n");
        const limpio = String(telefono).replace(/\D/g, "");
        return {
          texto,
          enlace: `https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`,
          aviso: "Esto NO se ha enviado. Abre el enlace y dale tú a enviar.",
        };
      },
    },
  },
});
