// ─── QUÉ SE APLICA A LA PANTALLA CUANDO CAMBIA EL ARCHIVO EN LA NUBE ───────────
// Cuando otro dispositivo guarda un evento, la suscripción del archivo trae la lista
// de lo que ha cambiado. La mayoría de las veces eso solo actualiza la lista de
// eventos guardados. Pero si lo que ha cambiado es el evento que tienes ABIERTO, hay
// que aplicarlo también a lo que estás viendo — si no, dos personas con el mismo
// evento abierto no se enteran de nada y gana la última en guardar, en silencio.
//
// Esta decisión vive aquí, fuera del componente, porque es la parte que puede hacer
// daño (pisar lo que tienes delante) y así se puede probar sola.

export function cambioDelEventoAbierto(cambios, abierto, previo) {
  if (!abierto || !Array.isArray(cambios)) return null;
  // Solo el evento que tienes abierto: los cambios de OTROS eventos no pueden tocar
  // tu pantalla, solo la lista.
  const suyo = cambios.find(c => c && c.nombre === abierto && c.tipo !== "borrado");
  if (!suyo || !suyo.estado) return null;
  // Si el evento tiene link compartido, de esto ya se encarga su propia suscripción,
  // que llega antes y más fina. Aplicarlo dos veces sería pelearse consigo mismo.
  if (previo && previo.eventoNubeId) return null;
  return suyo.estado;
}
