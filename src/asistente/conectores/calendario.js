// ─── CONECTOR: EL CALENDARIO ──────────────────────────────────────────────────
// Las primeras herramientas que CAMBIAN algo de la app de verdad. Escriben en los
// apuntes del calendario: crear uno, corregirlo, borrarlo. Nada más — ni checklists, ni
// cantidades, ni marcas de carga.
//
// Va como conector y no dentro de herramientas.js a propósito: así se enciende solo
// donde tiene sentido (el calendario, y la checklist que lo lleva dentro) y el
// formulario no lo ve. Y se apaga solo si la app no le pasa por dónde escribir.
//
// Todas llevan escribe: true. Ese es el interruptor que lee permisos.js:
//   · En "Solo consultar" ni aparecen en el catálogo.
//   · En "Con permiso" se proponen y la persona las aprueba una a una.
//   · En "Confianza" se aplican y se cuenta lo que se ha hecho.
//
// Lo que NO hacen, en ningún nivel: tocar una checklist ya creada. Un apunte es una
// línea de calendario; una checklist lleva dentro el trabajo de quien carga el camión.
import { registrarConector } from "../conectores.js";
import { TIPOS, esTipoEvento } from "../../calendario/apuntes.js";

const TIPOS_VALIDOS = Object.keys(TIPOS);
const esFecha = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || ""));

const sinTildes = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// El apunte que se está pidiendo, buscado por título. Se exige que sea uno solo: con
// dos "Boda García" en el calendario, adivinar cuál sería jugársela con los datos de
// alguien.
function buscaApunte(ctx, texto) {
  const t = sinTildes(texto);
  if (!t) return { error: "Dime cuál, por su título." };
  const hallados = (ctx.apuntes || []).filter(a => sinTildes(a.titulo).includes(t));
  if (!hallados.length) return { error: `No hay ningún apunte que se llame "${texto}".` };
  if (hallados.length > 1) {
    return { error: `Hay ${hallados.length} que se parecen: ${hallados.map(a => `${a.titulo} (${a.fecha})`).join(", ")}. Dime cuál con más detalle.` };
  }
  return { apunte: hallados[0] };
}

export default registrarConector({
  id: "calendario",
  nombre: "Calendario",
  descripcion: "Crear, corregir y borrar apuntes del calendario del equipo.",
  escribeFuera: false,
  // Sin una forma de escribir, apagado: mejor no ofrecer la herramienta que ofrecerla y
  // que falle en cada intento.
  necesita: [],
  listo: (config) => !!(config && config.puedeEscribir),
  herramientas: {
    crear_apunte: {
      datos: true,
      escribe: true,
      esquema: {
        description: "Apunta algo nuevo en el calendario del equipo: un evento, unas vacaciones, una recogida de material o una tarea.",
        parameters: {
          type: "object",
          properties: {
            titulo: { type: "string", description: "Cómo se llama. Para un evento, el nombre con el que se conoce." },
            fecha: { type: "string", description: "AAAA-MM-DD." },
            tipo: { type: "string", description: `Uno de: ${TIPOS_VALIDOS.join(", ")}.` },
            hasta: { type: "string", description: "AAAA-MM-DD, solo si dura varios días (vacaciones, un rodaje)." },
            sitio: { type: "string" },
            hora: { type: "string", description: "HH:MM." },
            pax: { type: "number", description: "Comensales, si es un evento y se sabe." },
          },
          required: ["titulo", "fecha", "tipo"],
        },
      },
      corre: (ctx, { titulo = "", fecha = "", tipo = "", hasta = "", sitio = "", hora = "", pax = 0 } = {}) => {
        if (!String(titulo).trim()) return { error: "Le falta el título." };
        if (!esFecha(fecha)) return { error: "La fecha tiene que ir como AAAA-MM-DD." };
        if (!TIPOS_VALIDOS.includes(tipo)) return { error: `Ese tipo no existe. Los que hay: ${TIPOS_VALIDOS.join(", ")}.` };
        if (hasta && !esFecha(hasta)) return { error: "El 'hasta' tiene que ir como AAAA-MM-DD." };
        if (hasta && hasta < fecha) return { error: "El 'hasta' es anterior a la fecha de inicio." };
        // Un apunte que ya está no se duplica: pasa cuando alguien lo pide dos veces sin
        // acordarse, y dos bodas iguales el mismo día es un lío difícil de deshacer.
        const repe = (ctx.apuntes || []).find(a => a.fecha === fecha && sinTildes(a.titulo) === sinTildes(titulo));
        if (repe) return { error: `Ya existe "${repe.titulo}" ese día. Si quieres cambiarlo, usa editar_apunte.` };

        return ctx.onEscribir({
          que: "crear_apunte",
          resumen: `Apuntar "${titulo}" el ${fecha}${hasta ? ` hasta el ${hasta}` : ""}${sitio ? ` en ${sitio}` : ""}${pax ? `, ${pax} pax` : ""} (${(TIPOS[tipo] || {}).nombre || tipo})`,
          datos: { titulo: String(titulo).trim(), fecha, tipo, hasta, sitio, hora, pax: Math.max(0, Math.round(pax) || 0) },
        });
      },
    },

    editar_apunte: {
      datos: true,
      escribe: true,
      esquema: {
        description: "Corrige un apunte que ya existe: la fecha, el sitio, los comensales, la hora. Solo lo que se le diga; el resto se queda como está.",
        parameters: {
          type: "object",
          properties: {
            cual: { type: "string", description: "El título del apunte a corregir." },
            fecha: { type: "string" }, hasta: { type: "string" },
            titulo: { type: "string", description: "Un título nuevo, si es que cambia." },
            sitio: { type: "string" }, hora: { type: "string" }, pax: { type: "number" },
          },
          required: ["cual"],
        },
      },
      corre: (ctx, { cual = "", ...cambios } = {}) => {
        const hallado = buscaApunte(ctx, cual);
        if (hallado.error) return hallado;
        const limpio = {};
        Object.entries(cambios).forEach(([k, v]) => {
          if (v === undefined || v === null || v === "") return;
          if ((k === "fecha" || k === "hasta") && !esFecha(v)) return;
          limpio[k] = k === "pax" ? Math.max(0, Math.round(v) || 0) : v;
        });
        if (!Object.keys(limpio).length) return { error: "No me has dicho qué cambiar." };

        const a = hallado.apunte;
        const antesYdespues = Object.entries(limpio)
          .map(([k, v]) => `${k}: ${a[k] || "(vacío)"} → ${v}`).join(", ");
        return ctx.onEscribir({
          que: "editar_apunte",
          resumen: `Cambiar "${a.titulo}" (${a.fecha}) — ${antesYdespues}`,
          datos: { id: a.id, cambios: limpio },
        });
      },
    },

    borrar_apunte: {
      datos: true,
      escribe: true,
      esquema: {
        description: "Quita un apunte del calendario. Solo el apunte: si ya tiene una checklist creada, la checklist NO se toca.",
        parameters: { type: "object", properties: { cual: { type: "string", description: "El título del apunte." } }, required: ["cual"] },
      },
      corre: (ctx, { cual = "" } = {}) => {
        const hallado = buscaApunte(ctx, cual);
        if (hallado.error) return hallado;
        const a = hallado.apunte;
        // Si ya tiene checklist, se avisa. Borrar el apunte deja la checklist huérfana
        // —sigue en el archivo pero sin nada en el calendario que la explique—, y eso
        // hay que saberlo ANTES, no descubrirlo dos semanas después.
        const aviso = a.evento
          ? ` OJO: ese apunte ya tiene la checklist "${a.evento}" creada. La checklist se queda en el archivo; esto solo quita la línea del calendario.`
          : "";
        return ctx.onEscribir({
          que: "borrar_apunte",
          resumen: `Borrar del calendario "${a.titulo}" (${a.fecha}).${aviso}`,
          datos: { id: a.id },
          ojo: !!a.evento,
        });
      },
    },
  },
});
