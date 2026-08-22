// ─── CONECTOR: CREAR CHECKLISTS DESDE EL CALENDARIO ───────────────────────────
// El hueco que faltaba. El asistente veía los apuntes del calendario y veía el archivo
// de eventos, pero no tenía forma de convertir lo uno en lo otro: pedirle "créame los
// tres próximos" contestaba, con razón, que no podía. La app SÍ sabe hacerlo —lo hace
// sola al arrancar— pero esa puerta no estaba abierta para él.
//
// Solo crea. No edita una checklist que ya existe y no la borra: dentro de una checklist
// viva está el trabajo de quien carga el camión, y eso no se toca desde aquí. Crear, en
// cambio, no quita nada — y si el evento ya está, checklistsPorCrear lo respeta y no lo
// pisa.
import { registrarConector } from "../conectores.js";
import { aVistaProxima, esTipoEvento } from "../../calendario/apuntes.js";

const sinTildes = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default registrarConector({
  id: "checklists",
  nombre: "Crear checklists",
  descripcion: "Convertir apuntes del calendario en checklists del archivo.",
  escribeFuera: false,
  necesita: [],
  // Apagado si la app no sabe crearlas: el calendario suelto, por ejemplo, no tiene
  // archivo de eventos donde meterlas.
  listo: (config) => !!(config && config.puedeCrear),
  herramientas: {
    crear_checklists: {
      datos: true,
      escribe: true,
      esquema: {
        description: "Crea las checklists de eventos que están en el calendario pero todavía no tienen una. Con 'cuales' se crean esas; sin nada, las de los eventos que ya se acercan. No pisa ninguna que ya exista.",
        parameters: {
          type: "object",
          properties: {
            cuales: {
              type: "array",
              items: { type: "string" },
              description: "Los títulos de los apuntes a convertir. Vacío para los que ya se acercan.",
            },
            dias: { type: "number", description: "Si no se dan títulos, cuántos días mirar hacia delante." },
          },
        },
      },
      corre: (ctx, { cuales = [], dias = 0 } = {}) => {
        if (!ctx.onEscribir) return { error: "Esta pantalla no deja crear checklists." };
        const apuntes = (ctx.apuntes || []).filter(a => a && esTipoEvento(a.tipo));
        if (!apuntes.length) return { error: "No hay ningún apunte de evento en el calendario." };

        let elegidos;
        if (Array.isArray(cuales) && cuales.length) {
          elegidos = cuales
            .map(t => apuntes.find(a => sinTildes(a.titulo).includes(sinTildes(t))))
            .filter(Boolean);
          const perdidos = cuales.filter(t => !apuntes.some(a => sinTildes(a.titulo).includes(sinTildes(t))));
          if (perdidos.length) {
            return { error: `No encuentro en el calendario: ${perdidos.join(", ")}. Mira los títulos con ver_calendario.` };
          }
        } else {
          // Sin títulos, los que ya se acercan — la misma cuenta que usa la app al
          // arrancar, para que el asistente no tenga su propia idea de "próximo".
          elegidos = aVistaProxima(apuntes, dias > 0 ? { dias: Math.round(dias) } : undefined);
        }

        // Los que ya tienen checklist no cuentan: decir "he creado 5" cuando 3 ya
        // existían sería mentir sobre lo que ha pasado.
        const archivo = ctx.eventosGuardados || {};
        const nuevos = elegidos.filter(a => !a.evento || !Object.prototype.hasOwnProperty.call(archivo, a.evento));
        if (!nuevos.length) {
          return { nada: "Todos esos eventos ya tienen su checklist creada. No hay nada que hacer." };
        }

        return ctx.onEscribir({
          que: "crear_checklists",
          resumen: nuevos.length === 1
            ? `Crear la checklist de "${nuevos[0].titulo}" (${nuevos[0].fecha})`
            : `Crear ${nuevos.length} checklists: ${nuevos.map(a => `${a.titulo} (${a.fecha})`).join(", ")}`,
          datos: { ids: nuevos.map(a => a.id) },
        });
      },
    },
  },
});
