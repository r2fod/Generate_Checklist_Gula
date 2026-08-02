// ─── ALQUILERES: EL CATÁLOGO Y SUS RECOGIDAS ──────────────────────────────────
// Vive fuera de App.jsx porque es la parte que decide si alguien va a buscar el
// material o no. Aquí se puede probar sola, sin navegador ni pantalla.

export const ALQUILERES = {
  sillas:          { etiqueta: "Sillas" }, // el proveedor lo elige el selector: Dealde o Carvillo
  armarioCaliente: { etiqueta: "Armario caliente", proveedor: "Dealde" },
  mobiliario:      { etiqueta: "Mobiliario", proveedor: "Event Style" },
  // Solo en producciones
  generador:       { etiqueta: "Generador", proveedor: "Support On Set" },
  carpas:          { etiqueta: "Carpas", proveedor: "Support On Set" },
};
// Cuántos días antes se recoge y cuántos después se devuelve
export const DIAS_ANTES_RECOGIDA = 1, DIAS_DESPUES_DEVOLUCION = 1;

// Suma (o resta) días a una fecha "AAAA-MM-DD" sin pasar por UTC: con toISOString()
// una fecha de verano se iba un día atrás según la hora del navegador.
export function sumaDias(iso, dias) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + dias);
  const dosCifras = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
}

// Nombre con el que el alquiler aparece en la lista de recogidas. Sin el verbo delante
// ("Recoger sillas"): el aviso ya pone "Recogida:" o "Devolución:" según toque.
// Qué alquileres pide un estado de evento. Es la MISMA decisión que toman los
// interruptores de la pantalla, pero mirando el estado en vez de reaccionar al clic.
export function alquileresDe(estado = {}) {
  const esProduccion = estado.evento === "produccion";
  const sillas = estado.origenSillas;
  return {
    sillas: (sillas === "Dealde" || sillas === "Carvillo") ? conceptoAlquiler("sillas", sillas) : null,
    armarioCaliente: estado.llevaArmarioCaliente ? conceptoAlquiler("armarioCaliente") : null,
    // Mobiliario de Event Style no se lleva a rodajes; generador y carpas son solo de rodaje
    mobiliario: (!esProduccion && estado.llevaMobiliarioAlquiler) ? conceptoAlquiler("mobiliario") : null,
    generador: (esProduccion && estado.llevaGenerador) ? conceptoAlquiler("generador") : null,
    carpas: (esProduccion && estado.llevaCarpas && estado.alquilaCarpas) ? conceptoAlquiler("carpas") : null,
  };
}

// Deja las recogidas de un evento a juego con sus alquileres, sin tocar la pantalla.
// sincronizaAlquiler() hace esto mismo interruptor a interruptor; esta versión lo hace
// de una vez sobre un estado suelto, que es lo que hace falta al aplicar un envío del
// formulario: configura varios alquileres a la vez sobre un evento que ni siquiera está
// abierto, y sin esto la app cargaría el material pero nadie iría a buscarlo.
// Las escritas a mano no se tocan nunca, y las automáticas ya recogidas o devueltas
// tampoco se quitan: eso ya ha pasado.
export function recogidasConAlquileres(estado = {}) {
  const previas = Array.isArray(estado.recogidas) ? estado.recogidas : [];
  const quiere = alquileresDe(estado);
  const fecha = estado.fechaEvento || "";
  const resultado = previas.filter(r => !r.auto || quiere[r.auto] || r.recogido || r.devuelto)
    .map(r => {
      if (!r.auto || !quiere[r.auto]) return r;
      const actualizada = { ...r, concepto: quiere[r.auto] };
      // Si el envío trae otra fecha del evento, las recogidas automáticas se mueven con
      // ella, igual que al cambiar la fecha a mano en la pantalla. Las que tengan la
      // fecha puesta a mano (fechasAuto: false) no se tocan: alguien ya lo decidió.
      if (fecha && r.fechasAuto) {
        actualizada.fecha = sumaDias(fecha, -DIAS_ANTES_RECOGIDA);
        actualizada.fechaDevolucion = sumaDias(fecha, DIAS_DESPUES_DEVOLUCION);
      }
      return actualizada;
    });
  Object.entries(quiere).forEach(([clave, concepto]) => {
    if (!concepto || resultado.some(r => r.auto === clave)) return;
    resultado.push({
      concepto, hora: "",
      fecha: sumaDias(fecha, -DIAS_ANTES_RECOGIDA),
      fechaDevolucion: sumaDias(fecha, DIAS_DESPUES_DEVOLUCION),
      auto: clave, fechasAuto: true,
    });
  });
  return resultado;
}

export function conceptoAlquiler(clave, proveedor) {
  const a = ALQUILERES[clave];
  const quien = proveedor || (a && a.proveedor);
  return `${a ? a.etiqueta : clave}${quien ? ` (${quien})` : ""}`;
}
