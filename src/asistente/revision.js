// ─── ¿ESTO TIENE SENTIDO? ─────────────────────────────────────────────────────
// Repasa la configuración de un evento buscando lo que no cuadra. No es el asistente
// opinando: son reglas concretas sobre lo que la app ya sabe, y por eso se puede probar
// y por eso no se inventa nada.
//
// Existe porque el fallo caro de este oficio no es calcular mal: es que alguien deje un
// campo sin poner y nadie lo mire hasta que el camión está cargado. La barra de copas
// marcada con cero horas, la boda de agosto sin congelador, las sillas de alquiler que
// nadie ha pedido. Todo eso está en los datos desde el primer día y no lo mira nadie.
//
// Tres tonos, y la diferencia importa:
//   · falta   — sin esto NO SE PUEDE calcular bien. Sale primero.
//   · raro    — se puede, pero huele mal. Que lo mire una persona.
//   · acuérdate — está bien puesto, pero implica hacer algo fuera de la app (pedir,
//                 recoger, avisar). Es lo que más se olvida.
//
// Sin React ni nube: entra un evento, sale una lista.
import { menusEspeciales, alergiasDeLasNotas } from "../menus-especiales.js";
import { PAX_POR_CAMARERO, leerRatios } from "../personal.js";
import { TIPOS_MESA } from "../mesas.js";
import { hoyISO, enDiasISO } from "../fecha.js";
import { BEBIDAS, factorDe } from "../bebida.js";
import { COMIDAS } from "../comida.js";

// En el navegador es el día de quien mira; en el Worker, que va en UTC, es el mismo día
// que daba antes. Una sola cuenta para los dos (ver src/fecha.js).
const hoy = hoyISO;
const dias = (fecha) => Math.round((new Date(`${fecha}T00:00:00`) - new Date(`${hoy()}T00:00:00`)) / 86400000);

// Los meses en los que el hielo se derrite de verdad. Es la misma idea que mesVerano en
// los cálculos, pero aquí sirve para avisar de otra cosa: sin congelador en el sitio.
const MES_CALIDO = [5, 6, 7, 8, 9];   // junio a septiembre (base 0)

export function revisarEvento(nombre, e = {}) {
  const avisos = [];
  const pon = (tono, texto, comoSeArregla = "") => avisos.push({ tono, texto, comoSeArregla });

  if (!e || !e.evento) return { evento: nombre, avisos: [{ tono: "falta", texto: "Ese evento no tiene ni tipo. Está vacío." }] };

  const adultos = Number(e.pax) || 0;
  const ninos = Number(e.ninos) || 0;
  const total = adultos + ninos;

  // ── Lo que impide calcular ──
  if (!adultos) pon("falta", "No tiene comensales adultos, así que no se puede calcular ni bebida ni personal ni cristalería.", "Pon el pax en la ficha del evento.");
  if (!e.fechaEvento) pon("falta", "No tiene fecha.", "Ponla en la ficha del evento.");
  if (!e.horaInicio) pon("falta", "No tiene hora de inicio, así que no hay escaleta: no se sabe a qué hora hay que salir del obrador.", "Pon la hora en la ficha.");
  if (!e.ubicacion) pon("falta", "No tiene sitio.", "Ponlo en la ficha, aunque sea aproximado.");
  if (e.sinConfigurar) pon("falta", "Lo creó el calendario y todavía no lo ha configurado nadie: lo que salga en la checklist son valores por defecto, no los de este evento.", "Pásale los datos del formulario.");

  // ── Lo que huele mal ──
  if (e.fechaEvento) {
    const d = dias(e.fechaEvento);
    if (d < 0) pon("raro", `La fecha ya pasó (hace ${Math.abs(d)} días) y sigue en la lista de próximos.`, "Si ya se hizo, no hay nada que preparar.");
    else if (d <= 14 && e.sinConfigurar) pon("raro", `Faltan ${d} días y todavía está sin configurar.`, "Es el momento de cerrar proveedores y alquileres.");
  }

  if (ninos > adultos && adultos > 0) {
    pon("raro", `Hay más niños (${ninos}) que adultos (${adultos}).`, "Comprueba que no se hayan cambiado las dos casillas.");
  }

  // La barra marcada sin horas es el fallo silencioso por excelencia: no da error, no se
  // ve en pantalla, y la checklist sale sin una gota de nada.
  if (e.barraCoctel && !(Number(e.horasCoctel) > 0)) pon("raro", "La barra de cóctel está marcada pero con cero horas: no va a salir nada de bebida por ella.", "Pon las horas, o desmárcala.");
  if (e.barraCopas && !(Number(e.horasCopas) > 0)) pon("raro", "La barra de copas está marcada pero con cero horas: no van a salir ni destilados ni tónica.", "Pon las horas, o desmárcala.");
  if (!e.barraCoctel && Number(e.horasCoctel) > 0) pon("raro", `Hay ${e.horasCoctel}h de cóctel puestas pero la barra está desmarcada: esas horas no cuentan.`, "Marca la barra si va a haberla.");
  if (!e.barraCopas && Number(e.horasCopas) > 0) pon("raro", `Hay ${e.horasCopas}h de copas puestas pero la barra está desmarcada: esas horas no cuentan.`, "Marca la barra si va a haberla.");
  if (Number(e.horasCopas) > 8) pon("raro", `${e.horasCopas} horas de barra de copas es mucho.`, "Comprueba que no sean minutos o un cero de más.");

  // El ratio de camareros puesto a mano, muy lejos de lo medido
  const camareros = Number(e.numCamareros) || 0;
  if (camareros > 0 && total > 0) {
    const ratio = total / camareros;
    const medido = (leerRatios()[e.evento] || PAX_POR_CAMARERO[e.evento] || 10);
    if (ratio > medido * 1.6) {
      pon("raro", `Van ${camareros} camareros para ${total} comensales (1 cada ${Math.round(ratio)}), y lo medido aquí es 1 cada ${medido}.`, "Si es un almuerzo ligero puede estar bien; si no, van a ir cortos.");
    }
  }

  // Alergias escritas que el contador no ha sabido leer: el peor caso posible, porque
  // están puestas y aun así cocina no sabe cuántos menús sacar.
  const textoAlergias = alergiasDeLasNotas(e.notasEvento || "").trim();
  const menus = menusEspeciales(textoAlergias);
  if (textoAlergias && !menus.length) {
    pon("raro", `Hay algo escrito en alergias que no he sabido contar: "${textoAlergias.slice(0, 90)}".`, "Escríbelo como '2 celíacos, 1 vegano' y saldrá solo en la checklist.");
  }
  const paraRevisar = menus.find(m => m.clave === "revisar");
  if (paraRevisar) {
    pon("raro", `Hay ${paraRevisar.n} menú(s) especial(es) que no he sabido clasificar: ${(paraRevisar.textos || []).join("; ")}.`, "Cocina tiene que mirarlo a mano.");
  }

  // ── Lo que hay que acordarse de hacer fuera de la app ──
  if (menus.length) {
    pon("acuerdate", `Lleva ${menus.reduce((a, m) => a + m.n, 0)} menús especiales: ${menus.map(m => `${m.n} ${m.label.replace(/^Menú /, "")}`).join(", ")}.`, "Confírmalo con cocina antes del día.");
  }

  if (e.fechaEvento && MES_CALIDO.includes(new Date(`${e.fechaEvento}T00:00:00`).getMonth())) {
    if (e.tipoCongelador === "No lleva") {
      pon("acuerdate", "Es un evento de mes cálido y el sitio no tiene congelador: el hielo va con merma y hay que llevar bastante más.", "Comprueba que las neveras portátiles dan de sí.");
    }
  }

  const tipoMesa = e.tipoMesa || "";
  if (tipoMesa && TIPOS_MESA[tipoMesa] && TIPOS_MESA[tipoMesa].alquiler) {
    pon("acuerdate", `Lleva ${TIPOS_MESA[tipoMesa].etiqueta}, que son de alquiler.`, "Hay que pedirlas y cuadrar la recogida.");
  }
  if (e.origenSillas && e.origenSillas !== "Nuestras") {
    pon("acuerdate", `Las sillas son de alquiler (${e.origenSillas}).`, "Pídelas y apunta la devolución.");
  }
  if (e.llevaGenerador) pon("acuerdate", "Lleva generador.", "Va con garrafa de gasolina llena; comprueba que está.");
  if (e.llevaPaella && !(Number(e.numPaellas) > 0)) {
    pon("raro", "Está marcado que lleva paella pero sin número de paelleras.", "Pon cuántas.");
  }

  const logistica = (e.logisticaEquipo || []).filter(p => p && p.nombre && String(p.nombre).trim());
  if (!logistica.length) {
    pon("falta", "No hay nadie asignado a logística, así que la escaleta se calcula con una persona y va a salir todo larguísimo.", "Asigna el equipo en la ficha.");
  } else if (total > 150 && logistica.length < 2) {
    pon("raro", `${total} comensales con ${logistica.length} de logística.`, "Con un evento así, una persona sola no carga el camión a tiempo.");
  }

  const orden = { falta: 0, raro: 1, acuerdate: 2 };
  avisos.sort((a, b) => orden[a.tono] - orden[b.tono]);
  return { evento: nombre, avisos, todoEnOrden: avisos.length === 0 };
}

// Repasa TODOS los que se acercan, para el "¿está todo listo para este mes?".
export function revisarProximos(eventosGuardados = {}, diasVista = 30) {
  const desde = hoy();
  const hasta = enDiasISO(Math.max(1, diasVista));
  return Object.entries(eventosGuardados)
    .filter(([, e]) => (e.fechaEvento || "") >= desde && (e.fechaEvento || "") <= hasta)
    .sort((a, b) => (a[1].fechaEvento || "").localeCompare(b[1].fechaEvento || ""))
    .map(([nombre, e]) => ({ fecha: e.fechaEvento || "", ...revisarEvento(nombre, e) }))
    .filter(r => r.avisos.length);
}

// ─── AUDITORÍA DE NEGOCIO: OPORTUNIDADES ──────────────────────────────────────
// revisarEvento/revisarProximos contestan "¿este evento está listo?". Estas
// contestan "¿el negocio está perdiendo dinero o dejando de aprender?": reglas
// sobre el negocio entero, con la misma disciplina que las de siempre —sobre lo
// que la app ya sabe, nada inventado, y cada una dice dónde se actúa.
//
// El tono es "oportunidad" y no "falta" ni "raro": nada está roto, pero se está
// dejando dinero o aprendizaje en la mesa. La diferencia importa para leerlo:
// falta bloquea, raro huele, oportunidad paga.
//
// Cada aviso lleva opcionalmente una "propuesta" con la MISMA forma que la app
// usa para escribir ({ que, resumen, datos }): con eso la tarjeta de "Hacerlo"
// que ya existe en Charla la aplica sin una línea de UI nueva, y el nivel de
// permiso decide si se propone o se aplica.
//
// Sin React ni nube: entra un manojo de datos, sale una lista. La app la
// calcula al tenerlo todo en memoria; aquí no se reconstruye checklist (eso
// vive en calibracion.js, que es quien importa el generador).

const TIPO_PLURAL = { boda: "bodas", comunion: "comuniones", corporativo: "corporativos", cumpleanos: "cumpleaños", produccion: "rodajes" };
const TIPO_SINGULAR = { boda: "boda", comunion: "comunión", corporativo: "corporativo", cumpleanos: "cumpleaños", produccion: "producción" };

export function oportunidadesNegocio({
  eventosGuardados = {},
  precios = {},
  calibracionBebida = {},
  calibracionHielo = {},
  calibracionComida = {},
  factoresBebida = {},
  factoresHielo = {},
  factoresComida = {},
} = {}) {
  const avisos = [];
  const pon = (texto, comoSeArregla = "", propuesta = null) =>
    avisos.push({ tono: "oportunidad", texto, comoSeArregla, propuesta });

  // ── Medido y sin aplicar ──
  // Las calibraciones (calibracion.js) ya dicen "esto es lo que de verdad se
  // usó". Si el factor vigente es otro, la app sigue cargando la cantidad vieja:
  // ahí es donde la medición deja de ser un número y se vuelve una decisión.
  // Tope de 6: el panel los tiene todos y la auditoría no puede ser una pared
  // de botones.
  const medidas = [];
  Object.entries(calibracionBebida).forEach(([tipo, porBebida]) => {
    Object.entries(porBebida).forEach(([clave, m]) => {
      const actual = factorDe(factoresBebida, tipo, clave);
      if (Math.abs(m.factor - actual) > 0.005)
        medidas.push({ area: "bebida", tipo, clave, nombre: BEBIDAS[clave].nombre.toLowerCase(), factor: m.factor, nEventos: m.nEventos, actual });
    });
  });
  Object.entries(calibracionHielo).forEach(([tipo, m]) => {
    const actual = Number(factoresHielo[tipo]) || 1;
    if (Math.abs(m.factor - actual) > 0.005)
      medidas.push({ area: "hielo", tipo, clave: "", nombre: "hielo", factor: m.factor, nEventos: m.nEventos, actual });
  });
  Object.entries(calibracionComida).forEach(([tipo, porClave]) => {
    Object.entries(porClave).forEach(([clave, m]) => {
      const actual = Number(factoresComida[tipo]?.[clave]) || 1;
      if (Math.abs(m.factor - actual) > 0.005)
        medidas.push({ area: "comida", tipo, clave, nombre: COMIDAS[clave].nombre.toLowerCase(), factor: m.factor, nEventos: m.nEventos, actual });
    });
  });
  medidas.sort((a, b) => b.nEventos - a.nEventos || Math.abs(b.factor - b.actual) - Math.abs(a.factor - a.actual));
  medidas.slice(0, 6).forEach(m => {
    const pct = Math.round(m.factor * 100);
    const dir = m.factor < 1
      ? `solo se usó un ${pct} %: se carga de más`
      : `se usó un ${pct} %: se carga de menos`;
    const nombre = m.area === "hielo" ? "el hielo" : m.nombre;
    pon(
      `En ${m.nEventos} ${TIPO_PLURAL[m.tipo]} con la vuelta marcada, ${nombre} ${dir}. Aplicar ${m.factor} cargaría lo que de verdad se usa.`,
      "En el panel del Modo carga hay un botón con el número medido, o me lo dices y lo aplico.",
      {
        que: "aplicar_calibracion",
        resumen: `Aplicar el factor medido ${m.factor} a ${nombre} en ${TIPO_SINGULAR[m.tipo]} (${m.nEventos} eventos)`,
        datos: { area: m.area, tipo: m.tipo, clave: m.clave, factor: m.factor },
      },
    );
  });

  // ── Roturas sin precio ──
  // Las roturas se cobran cuando el item roto tiene precio (el Resumen cobra
  // max(consumo, roturas) × precio). Una rotura sin precio es un daño que el
  // cliente nunca paga: la fuga más cara, porque se ve como "gratis".
  Object.entries(eventosGuardados).forEach(([nombre, e]) => {
    const roturas = e && e.roturas;
    if (!roturas || typeof roturas !== "object") return;
    const sinPrecio = [];
    let unidades = 0;
    Object.entries(roturas).forEach(([key, n]) => {
      const rotas = parseInt(n, 10) || 0;
      if (!rotas) return;
      // La clave es "categoría::etiquetaOriginal" (ver el estado de roturas): la
      // etiqueta es la que busca el precio, así que la parte de después del "::".
      const label = String(key).split("::").pop();
      if (precios[label] === undefined) {
        sinPrecio.push(label);
        unidades += rotas;
      }
    });
    if (sinPrecio.length) {
      pon(
        `En "${nombre}" hay ${unidades} roturas apuntadas sin precio (${sinPrecio.slice(0, 3).join(", ")}${sinPrecio.length > 3 ? "…" : ""}): ese daño no se le cobra a nadie.`,
        "Ponle precio en Modo carga → Resumen → precios, y las roturas se cobran solas.",
      );
    }
  });

  // ── Eventos de los que no se puede aprender ──
  // La calibración aprende de "lo que volvió". Un evento pasado sin la vuelta
  // marcada es dato que nunca se usará: no es un aviso (nada se rompe), es
  // aprendizaje perdido. Solo los últimos 30 días y a lo sumo 3 nombres: de
  // más es ruido, y los eventos viejos ni se cargaban pensando en la vuelta.
  const hoyStr = hoy();
  const desde = enDiasISO(-30);
  const sinVuelta = Object.entries(eventosGuardados)
    .filter(([, e]) => e && e.evento && (Number(e.pax) > 0)
      && (e.fechaEvento || "") < hoyStr && (e.fechaEvento || "") >= desde
      && !(e.vueltos && Object.keys(e.vueltos).length))
    .sort((a, b) => (b[1].fechaEvento || "").localeCompare(a[1].fechaEvento || ""));
  if (sinVuelta.length) {
    const nombres = sinVuelta.slice(0, 3).map(([n]) => n);
    const resto = sinVuelta.length - nombres.length;
    pon(
      `Estos eventos ya pasaron y nadie les marcó la vuelta, así que no se puede aprender de ellos: ${nombres.join(", ")}${resto > 0 ? ` (y ${resto} más)` : ""}.`,
      "En el Modo carga de cada uno, marca lo que volvió (puede ser en kilos o unidades) y la calibración se nutre.",
    );
  }

  return avisos;
}
