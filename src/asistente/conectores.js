// ─── CONECTORES ───────────────────────────────────────────────────────────────
// El hueco por donde el asistente crece sin abrir en canal lo que ya funciona.
//
// OpenHuman tiene 118 integraciones (Gmail, Notion, Slack…) y ese es su mejor argumento:
// no que las tenga, sino que TODAS entran por el mismo sitio. Aquí se copia esa idea, no
// la lista: un conector declara qué herramientas añade y se registra. Nada más. El
// catálogo del asistente pasa a ser "las de siempre + las de los conectores activos", y
// añadir el correo el mes que viene es escribir un fichero, no tocar los trece que ya hay.
//
// Tres reglas que un conector no puede saltarse:
//
//   1. Declara si sus datos tienen dueño, igual que las herramientas de casa. Un correo
//      lleva nombres; que un proveedor lo entrene no lo decide el conector.
//   2. Está APAGADO mientras no esté configurado. Un conector a medias no puede aparecer
//      en el catálogo: el modelo lo llamaría y fallaría en cada pregunta.
//   3. Si escribe algo fuera de la app —manda un correo, crea un evento— lo marca. Lo
//      que sale hacia fuera se confirma en pantalla antes, siempre.
//
// Lo que hoy NO se puede hacer, y conviene saberlo antes de ilusionarse: cualquier
// conector con OAuth (Gmail, Drive, Notion) necesita un servidor que guarde el permiso,
// y ese servidor sería el mismo Worker. Es trabajo, pero es trabajo que ya tiene sitio.

const registrados = new Map();

// Un conector: { id, nombre, descripcion, escribeFuera, necesita, herramientas, listo }
//   · necesita: los ajustes que hacen falta ("token", "direccion"...). Sin ellos no se
//     enciende.
//   · listo(config): la última palabra sobre si está utilizable. Por defecto, que estén
//     todos los "necesita".
//   · herramientas: el mismo formato exacto que las de casa (esquema + corre + datos),
//     para que ejecutar() no tenga que saber de dónde viene cada una.
export function registrarConector(conector) {
  if (!conector || !conector.id) throw new Error("Un conector necesita id");
  if (registrados.has(conector.id)) return registrados.get(conector.id);
  const c = {
    escribeFuera: false,
    necesita: [],
    herramientas: {},
    listo: (config) => (conector.necesita || []).every(k => config && String(config[k] || "").trim()),
    ...conector,
  };
  registrados.set(c.id, c);
  return c;
}

export const conectores = () => [...registrados.values()];

// Los que están de verdad utilizables con la configuración que hay ahora mismo.
// config = { correo: { direccion: "..." }, ... }
export function conectoresActivos(config = {}) {
  return conectores().filter(c => c.listo(config[c.id] || {}));
}

// El catálogo entero: las de casa más las de los conectores encendidos. Si dos
// coincidieran en nombre gana la de casa, porque la de casa es la que tiene pruebas.
export function conHerramientasDeConectores(base, config = {}) {
  const salida = { ...base };
  conectoresActivos(config).forEach(c => {
    Object.entries(c.herramientas).forEach(([nombre, h]) => {
      if (!salida[nombre]) salida[nombre] = { ...h, conector: c.id };
    });
  });
  return salida;
}
