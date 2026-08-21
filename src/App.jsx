import React, { useState, useMemo, useEffect, useDeferredValue } from "react";

import {
  Heart, Church, Cake, Briefcase, Clapperboard,
  Truck, Package, Users, Boxes,
  Save, RefreshCw, Link2, FileText, Printer, MessageCircle, ClipboardCopy, ClipboardCheck,
  ListPlus, FolderOpen, CalendarDays, CalendarClock, Clock, X, Check,
  ChevronUp, ChevronDown, Tag, Pencil, Undo2, RotateCcw,
  AlertTriangle, ArrowRight, Bell, Copy, Search,
  Moon, Sun, Download, Upload, Eye,
  MapPin,
} from "lucide-react";
import { cambioDelEventoAbierto } from "./sincronizacion-eventos.js";
import { carpasRecomendadas, carpasPorAlquilar, CARPAS_EN_ALMACEN } from "./carpas.js";
import { colorPorDefecto } from "./manteles.js";
import { calcPaella } from "./paella.js";
import {
  DIAS_ANTES_RECOGIDA, DIAS_DESPUES_DEVOLUCION,
  sumaDias, conceptoAlquiler, recogidasConAlquileres,
} from "./alquileres.js";
import {
  nubeActiva, nuevoIdEvento, guardarEventoNube, borrarEventoNube, suscribirEventoNube,
  cargarIndiceEventosNube,
  sincronizarArchivoNube, cargarArchivoNube, suscribirArchivoNube,
  leerConfigFormulario, guardarConfigFormulario,
  resolverCalendario, cargarCalendarioNube, guardarCalendarioNube,
  cargarPreciosNube, guardarPreciosNube, suscribirPreciosNube,
  cargarBebidaNube, guardarBebidaNube, suscribirBebidaNube,
  cargarMemoriaNube, guardarMemoriaNube, suscribirMemoriaNube,
  cargarObjetivosNube, guardarObjetivosNube, suscribirObjetivosNube,
  cargarTareasNube, guardarTareasNube, suscribirTareasNube,
} from "./nube.js";
import { aRespuestasDeLaApp, recogidasDelEnvio, comprasDelEnvio, cambiosEntreRespuestas } from "./formulario/preguntas.js";
import { nuevoCodigo, publicarProximos, borrarProximos, leerEnvios, borrarEnvio, marcarRevisado, repartirEnvios, suscribirEnvios, limpiarAvisos } from "./formulario/envios.js";
import ModalFormularioOficina from "./components/ModalFormularioOficina.jsx";
import ModalRecalcular from "./components/ModalRecalcular.jsx";
import Dialogo from "./components/Dialogo.jsx";
import SelectConOtro from "./components/SelectConOtro.jsx";
import SegmentedControl from "./components/SegmentedControl.jsx";
import ListaColapsable from "./components/ListaColapsable.jsx";
import ModalVistaPrevia from "./components/ModalVistaPrevia.jsx";
import ModalAgregarItems from "./components/ModalAgregarItems.jsx";
import ModalModoCarga from "./components/ModalModoCarga.jsx";
import FilaItem from "./components/FilaItem.jsx";
import logoGula from "./assets/gula-logo.webp";
import { sanearEstado, cambiosDeCantidad } from "./estado.js";
import {
  EVENTOS, fmtCantidadCompleta,
  CATEGORIA_MANUAL, quitarItemsSinCantidad,
  horasLogistica, importeLogistica, fmtLogistica, totalLogistica,
  fmtRecogidas, fmtCompras, sugerirCategoria, generarHTMLWord,
} from "./checklist-format.js";
import { infoCategoria } from "./components/Iconos.jsx";
import { estimarTiemposCarga, sumarMinutosHora } from "./tiempos-carga.js";
import { leerPrecios, guardarPrecios, soloLosCambiados, fusionarPreciosNube } from "./precios.js";
import { TIPOS_MESA, TIPO_MESA_POR_DEFECTO } from "./mesas.js";
import { buildChecklist, enlaceMapa } from "./checklist-generadores.js";
import { HORA_OSCURO, HORA_CLARO, leerPreferenciaTema, temaSegunPreferencia } from "./tema.js";
import { calcularCalibracion, calibracionBebida } from "./calibracion.js";
import { ponFactores, leerFactores, factoresCambiados } from "./bebida.js";
import { saneaMemoria, recordar, olvidar, refuerza } from "./asistente/memoria.js";
import { saneaObjetivos, ponerObjetivo, cambiarEstado, quitarObjetivo } from "./asistente/objetivos.js";
import { saneaTareas, marcarTarea, quitarTarea, limpiarViejas } from "./asistente/tareas.js";
import { aplicarEnTareas, encadenar } from "./asistente/escrituraTareas.js";

// El calendario del equipo, dentro de la checklist: del mes a la boda sin cambiar de
// app. Va con import() perezoso a propósito — quien no lo abra no se descarga nada de
// él, y la checklist no engorda para todos por una pantalla que se usa a ratos. El CSS
// del calendario se importa dentro de ese archivo, así que viaja con él.
const CalendarioEnChecklist = React.lazy(() => import("./calendario/EnChecklist.jsx"));
// El asistente vive en su propia carpeta y se monta con una línea. El botón, la carga
// perezosa y el panel van juntos ahí dentro: aquí estaban escritos a mano —botón,
// estado y quince líneas armando el contexto— y montarlo también en el calendario
// habría sido copiar todo eso. Lo copiado se separa; ya nos pasó con el espejo de la nube.
import BotonAsistente from "./asistente/BotonAsistente.jsx";
import { contextoDelAsistente, eventoAbierto } from "./asistente/contexto.js";
// Qué checklists tocan crear de los eventos que ya se acercan. Va en apuntes.js (y no
// aquí) porque es lo que sabe el CALENDARIO: qué apuntes se acercan, cuáles ya tienen
// checklist y qué campos suyos valen para arrancarla. Se importa suelto —no desde
// EnChecklist— para que no arrastre el calendario entero al bundle de la checklist.
import { checklistsPorCrear, saneaLista, saneaEquipo } from "./calendario/apuntes.js";

// Qué evento pide abrir la dirección, si es que pide alguno. Es como el calendario (que
// es otra app, en otra carpeta) manda a la checklist a un evento concreto: sin esto, su
// botón "Abrir" traía aquí y no pasaba nada de nada.
function eventoQuePideElEnlace() {
  try {
    return new URLSearchParams(window.location.search).get("abrir") || "";
  } catch (e) { return ""; }
}


// ─── CONSTANTES ──────────────────────────────────────────────────────────────
// Cuánto se espera a que el evento suba antes de avisar de que el link puede estar
// muerto. Con cobertura normal la subida tarda menos de un segundo; si pasa de aquí,
// más vale decirlo que dejar que manden un link que no abre nada.
const ESPERA_SUBIDA_LINK = 4000;

// Cuánto se espera al archivo de eventos antes de abrir el que pide "?abrir=". Con
// cobertura normal llega en menos de un segundo; sin ella, la lectura de Firestore puede
// quedarse colgada mucho rato, y sin tope el botón "Abrir" del calendario parecería roto
// para siempre. Pasado esto se tira con lo que haya guardado en el propio móvil.
const ESPERA_ARCHIVO_ABRIR = 6000;

// Botellas de 33cl por persona y DÍA en un rodaje. Va por temporada porque la
// diferencia es enorme: una jornada de doce horas al sol en agosto no se parece en
// nada a una de enero. Son ~2,1 litros por cabeza en verano y ~1,5 en invierno,
// además de los refrescos y del agua de 1,5L que va aparte.

// Tercios de respaldo que van SIEMPRE que se lleve barril. La cuenta de litros puede
// dar cero (dos barriles de 50L cubren de sobra a 100 personas), y salir sin una sola
// botella deja el evento entero colgando de que el tirador y el barril funcionen.
// bateaSizeDe, cajaSizeDe, conSufijo, fmtCantidadCompleta, PALABRAS_ALQUILER y
// CATEGORIA_MANUAL están en ./checklist-format.js (compartidos con los modales).

// ─── TEMPORADA ────────────────────────────────────────────────────────────────
// El consumo cambia mucho entre verano e invierno: la cerveza baja de 2 a 1,5 por pax,
// el reparto de vino se da la vuelta (65% blanco en verano, 45% en invierno) y el tinto
// de verano se reduce a la mitad. Ese dato existía en el código pero no había forma de
// cambiarlo desde ninguna parte: estaba fijo en "verano" todo el año, así que una boda
// de diciembre cargaba cerveza de agosto y el doble de blanco que de tinto.
// Ahora sale de la fecha del evento, con la opción de forzarlo a mano.
const MES_VERANO_DESDE = 5, MES_VERANO_HASTA = 9; // de mayo a septiembre

function esFechaDeVerano(fechaISO) {
  // Sin fecha puesta todavía se usa el mes de hoy, que es la mejor pista que hay
  const d = fechaISO ? new Date(fechaISO + "T00:00:00") : new Date();
  const mes = (isNaN(d.getTime()) ? new Date() : d).getMonth() + 1;
  return mes >= MES_VERANO_DESDE && mes <= MES_VERANO_HASTA;
}

// "auto" (por la fecha), "verano" o "invierno" forzados a mano
function esVerano(estacion, fechaISO) {
  if (estacion === "verano") return true;
  if (estacion === "invierno") return false;
  return esFechaDeVerano(fechaISO);
}

export function hoyISO() {
  const d = new Date();
  const dosCifras = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
}

// Qué temporada le toca a un evento guardado ANTES de que existiera este dato. Los que
// ya han pasado se quedan clavados en lo que tuvieran: su lista es historia y no tiene
// sentido que las cifras cambien al abrirla. Los que están por venir pasan a automático,
// para que se corrijan solos según su fecha.
function temporadaInicial(estado = {}, hoy = hoyISO()) {
  if (estado.estacion) return estado.estacion;
  const yaPasado = estado.fechaEvento && estado.fechaEvento < hoy;
  if (!yaPasado) return "auto";
  return estado.mesVerano === false ? "invierno" : "verano";
}

// ─── ALQUILERES ───────────────────────────────────────────────────────────────
// Material que no es nuestro: hay que ir a buscarlo antes del evento y devolverlo
// después. Antes eran dos interruptores sueltos (sillas y armario caliente) que solo
// añadían su línea a la carga; la recogida y la devolución había que escribirlas a
// mano en cada evento, y por eso se olvidaban. Ahora cada alquiler que se activa crea
// solo su recogida (el día antes) y su devolución (el día después), con las fechas
// sacadas de la del evento.
//
// Para añadir otro alquiler basta con una entrada más aquí y engancharla a su control.
// Margen de seguridad del 10% SOLO sobre cristalería, vajilla y servilletas:
// es el buffer estándar del sector por roturas/pérdidas (los alquileres recomiendan
// pedir un 10-20% extra de copas y platos). Las bebidas, licores y cápsulas NO llevan
// margen extra: sus ratios ya están calibrados con eventos reales por encima de los
// rangos del sector (ej: vino 0,72 bot/pax frente al estándar de 0,33-0,5).


// EVENTOS, IconoCategoria e IconoItem están en ./checklist-format.js y
// ./components/Iconos.jsx (compartidos con los modales extraídos).
const EVENTO_ICON = { boda: Heart, comunion: Church, cumpleanos: Cake, corporativo: Briefcase, produccion: Clapperboard };


// detectarDelimitador, normalizar y sugerirCategoria están en ./checklist-format.js
// (usados aquí por ModalAgregarItems y por la comparación de nombres).

// calcMesasCocina, enlaceMapa, personalSala, calcPersonal, calcMesasComensales,
// calcMesasTotal, calcCafe, opt y los buildChecklist* están en ./checklist-generadores.js.

// ─── WORD EXPORT ──────────────────────────────────────────────────────────────
// quitarItemsSinCantidad está en ./checklist-format.js.

// ─── RESUMEN DE CAMBIOS REMOTOS (para el aviso de sincronización) ──────────────
const ETIQUETAS_CAMPO = {
  evento: "Tipo de evento", nombreEvento: "Nombre del evento", fechaEvento: "Fecha",
  horaInicio: "Hora de inicio", ubicacion: "Ubicación", notasEvento: "Notas", pax: "Pax adultos", ninos: "Niños",
  barraCoctel: "Barra cóctel", horasCoctel: "Horas de cóctel", barraCopas: "Barra copas", horasCopas: "Horas de copas",
  diasProduccion: "Días de producción",
  dobleServicio: "Doble servicio", tamanoBarril: "Barril de cerveza", numBarriles: "Nº de barriles", llevaEntrante: "Entrante de chupito", llevaCanapes: "Lleva canapés", soloBandeja: "Servicio solo en bandeja",
  llevaPaella: "Lleva paella", tipoPaella: "Tamaño de paella", numPaellas: "Nº de paellas",
  estiloPlatoPrincipal: "Estilo plato principal", estiloPlatoPostre: "Estilo plato postre",
  llevaArmarioCaliente: "Armario caliente", llevaPlanchaGas: "Plancha de gas", numPlanchasGas: "Nº planchas de gas", llevaPlatos: "Platos", llevaPlatosPostre: "Platos de postre", llevaCubiertos: "Cubiertos", numCamareros: "Nº camareros", paxPorCamarero: "Pax por camarero", numStaff: "Nº staff", tipoBandejas: "Bandejas",
  tipoHorno: "Horno", tipoBBQ: "Barbacoa", estacion: "Temporada", tieneBrindisCava: "Brindis con cava",
  tieneFrituras: "Frituras", numFrituras: "Nº frituras", fuerzaTextilTela: "Servilletas de tela",
  llevaChillOut: "Chill out", numChillOut: "Nº chill out",
  llevaPalomitera: "Palomitera", llevaJarrasCristal: "Jarras de cristal", tipoCafetera: "Cafetera",
  llevaCarpas: "Carpas", llevaGenerador: "Generador",
  llevaMobiliarioAlquiler: "Mobiliario de alquiler", alquilaCarpas: "Carpas de alquiler", numCarpas: "Nº de carpas",
  extraBandejasMadera: "Bandejas madera extra", extraBandejasPlata: "Bandejas plata extra",
  llevaJamonero: "Jamonero", llevaTarta: "Lleva tarta", personasPorPlatoEntrante: "Personas por plato de entrante",
  entranteCompartido: "Entrante compartido", numEntrantesCompartir: "Nº de entrantes a compartir",
  llevaAguasPequenas: "Aguas pequeñas", tipoAguaPequena: "Envase de las aguas pequeñas", hayDesayuno: "Desayuno",
  tipoNevera: "Nevera", tipoCongelador: "Congelador", origenSillas: "Sillas", tipoMesa: "Tipo de mesa",
  logisticaEquipo: "Equipo de logística", tarifaLogistica: "Tarifa de logística", plusFurgoneta: "Plus de furgoneta",
  recogidas: "Recogidas", compras: "Compras",
  itemsManuales: "Items añadidos a mano", overridesManuales: "Cantidades editadas a mano",
  itemsOcultos: "Items quitados", nombresManuales: "Nombres corregidos", categoriasRenombradas: "Categorías renombradas", ordenCategorias: "Orden de las categorías",
  itemsAlquilerManual: "Items marcados como alquiler proveedor",
  preparados: "Items marcados como preparados", checkeados: "Items marcados como cargados",
  marcasRevisar: "Items con la cantidad cambiada tras marcarlos",
  vueltos: "Items marcados como vueltos", roturas: "Roturas contadas",
  notasCheck: "Recordatorios de notas hechos",
  valoresCalculados: "Foto de cantidades automáticas",
};

// Compara el estado anterior y el recibido y devuelve frases cortas ("Pax adultos: 65 → 88")
function resumirCambios(prev, nuevo) {
  const cambios = [];
  const claves = new Set([...Object.keys(prev || {}), ...Object.keys(nuevo || {})]);
  claves.forEach(k => {
    if (k === "eventoNubeId") return;
    const a = prev?.[k], b = nuevo?.[k];
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const etiqueta = ETIQUETAS_CAMPO[k] || k;
    // Las cantidades se dicen UNA A UNA, con nombre y con el antes y el después. Es lo
    // que de verdad tiene que ver quien está cargando el camión: "Regletas: 3 → 5" le
    // dice qué volver a contar; "Cantidades editadas a mano (modificado)", nada.
    if (k === "overridesManuales") {
      cambiosDeCantidad(a, b).forEach(t => cambios.push(t));
      return;
    }
    // Y esta es la consecuencia de la anterior, no un cambio aparte: decirla también
    // sería contar dos veces lo mismo en un aviso que solo enseña las cuatro primeras.
    if (k === "marcasRevisar") return;
    if (typeof b === "boolean" || typeof a === "boolean") {
      cambios.push(`${etiqueta}: ${b ? "sí" : "no"}`);
    } else if (Array.isArray(a) || Array.isArray(b) || typeof a === "object" || typeof b === "object") {
      const na = Array.isArray(a) ? a.length : Object.keys(a || {}).length;
      const nb = Array.isArray(b) ? b.length : Object.keys(b || {}).length;
      cambios.push(na !== nb ? `${etiqueta}: ${na} → ${nb}` : `${etiqueta} (modificado)`);
    } else {
      const fmt = (v) => (v === "" || v === null || v === undefined) ? "—" : v;
      cambios.push(`${etiqueta}: ${fmt(a)} → ${fmt(b)}`);
    }
  });
  return cambios;
}

// horasLogistica, importeLogistica, fmtLogistica y totalLogistica están en
// ./checklist-format.js.

// FASES_TIEMPO y estimarTiemposCarga están en ./tiempos-carga.js (compartidas con
// ModalModoCarga).
// calcularCalibracion y checklistDeEventoGuardado están en ./calibracion.js.
// sumarMinutosHora está en ./tiempos-carga.js.

// fmtRecogidas y fmtCompras están en ./checklist-format.js.

// generarHTMLWord está en ./checklist-format.js.

// El catálogo de precios (PRECIOS_BASE, leerPrecios, guardarPrecios, parsePreciosPegados)
// está en ./precios.js (compartido con ModalModoCarga).

// HORA_OSCURO, HORA_CLARO, esHoraDeOscuro, leerPreferenciaTema y temaSegunPreferencia
// están en ./tema.js (compartido con main.jsx y formulario/main.jsx).

// Normaliza un texto para buscar sin importar tildes ni mayúsculas.
function _norm(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Los conceptos de las recogidas se escriben con el verbo delante ("Recoger
// generador"), y al reutilizarlos para el aviso de devolución quedaba un
// "Devolución: Recoger generador" que se lee al revés. Para la devolución se deja
// solo el objeto: "Devolución: generador". Si al quitarlo no queda nada, se
// respeta el texto original tal cual.
function soloObjeto(concepto) {
  const txt = String(concepto ?? "");
  const limpio = txt.replace(/^\s*(recoger|recogida de|recogida|recojer)\s+/i, "").trim();
  return limpio || txt;
}

// ─── DIÁLOGO PROPIO (sustituye a window.prompt/confirm, que rompen la estética) ─
// ─── SELECT CON OPCIÓN "OTRO..." ───────────────────────────────────────────────
// Como un <select> normal, pero con una opción "+ Otro..." al final que revela un
// campo de texto para escribir un valor que no esté en la lista (ej. un estilo de
// plato puntual que no se pide siempre). Los valores nuevos que se escriben se
// guardan en este navegador (localStorage, independiente del evento) para que la
// próxima vez ya aparezcan como una opción más de la lista, en cualquier evento.
// SelectConOtro está en ./components/SelectConOtro.jsx y Dialogo en ./components/Dialogo.jsx.

// ─── MODAL VISTA PREVIA ───────────────────────────────────────────────────────
// ModalVistaPrevia está en ./components/ModalVistaPrevia.jsx.

// ModalModoCarga está en ./components/ModalModoCarga.jsx.

// ─── EL FORMULARIO DE OFICINA: EL ENLACE Y LA BANDEJA ─────────────────────────
// Las dos puntas del canal con la oficina, en una sola pantalla: de dónde sale el
// enlace que se les pasa, y qué han mandado por él.
//
// Aplicar un envío NO escribe nada a escondidas: abre el evento con los datos ya
// puestos para que se revisen. Lo que la oficina no contestó se queda con el valor
// por defecto de la app y sale marcado aquí, para saber qué mirar.
// Un envío en la bandeja: a qué evento va, qué contestaron y qué se puede hacer con
// él. Los ya revisados se ven igual, pero apagados y diciendo dónde acabaron.
// De qué evento habla un envío, para poder nombrarlo en un aviso
// ModalFormularioOficina extraído a src/components/ModalFormularioOficina.jsx

// ModalRecalcular está en ./components/ModalRecalcular.jsx y ModalAgregarItems
// (con su helper parseItemsPegados) en ./components/ModalAgregarItems.jsx.

// Lee el estado guardado (link ?c=... o localStorage) de forma síncrona, ANTES del primer
// render, para que cada useState arranque ya con el valor correcto. Hacerlo en un efecto
// (después del montaje) provoca una carrera con el guardado automático: en StrictMode,
// donde React ejecuta los efectos del montaje dos veces, el efecto de guardado puede
// escribir los valores por defecto en localStorage antes de que el de carga los restaure.
// Nombres de los eventos que este dispositivo ya dio por subidos a la nube. Sirve
// para distinguir "creado aquí y aún sin subir" de "borrado desde otro dispositivo".
const CLAVE_SINCRONIZADOS = "gula_eventos_sincronizados";
function leerSincronizados() {
  try { const v = JSON.parse(localStorage.getItem(CLAVE_SINCRONIZADOS) || "[]"); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function guardarSincronizados(nombres) {
  try { localStorage.setItem(CLAVE_SINCRONIZADOS, JSON.stringify(nombres)); } catch (e) { /* localStorage no disponible */ }
}

// ─── LINK DE SOLO MARCAR ───────────────────────────────────────────────────────
// El link de un evento se le pasa a quien carga el camión. Hasta ahora daba lo mismo
// que a ti: podía cambiar cantidades, quitar items o tocar la configuración sin
// querer, y eso se sincroniza a todo el mundo. Con "?solo=1" la pantalla se queda en
// modo marcar: se ve la checklist, se abre Modo carga y se marca todo lo que haga
// falta, pero no se puede cambiar QUÉ se carga.
//
// Es una barrera contra el despiste, no contra alguien con mala idea: quien tenga el
// link y sepa quitarle el "?solo=1" vuelve a poder editar. Para impedirlo de verdad
// haría falta que la nube distinguiera quién escribe cada campo, y eso son otras
// reglas y otro día.
// Basta con "solo=1". ANTES exigía ADEMÁS que hubiera "evento=", y eso lo dejaba
// muerto justo cuando no hay nube: sin ella el link no lleva "evento=" sino la
// checklist dentro ("?c=..."), así que "Link para marcar" copiaba un link que se abría
// editable como cualquier otro, sin avisar de nada. Pidiendo solo "solo=1" funciona con
// las dos formas de link.
function esSoloMarcar() {
  try {
    return !!new URLSearchParams(window.location.search).get("solo");
  } catch (e) { return false; }
}

// "Link para marcar" abre DIRECTO en Modo carga, en Salida. Antes aterrizaba en la
// checklist entera y había que encontrar y pulsar "Modo carga": para quien recibe el
// link por WhatsApp y solo tiene que ir marcando lo que sube al camión, eso es una
// pantalla de más y una que no le hace falta. Dentro tiene Salida y Vuelta, que es lo
// que marca logística, y sigue pudiendo salir de ahí si necesita mirar otra cosa.
//
// Va en su propia marca ("carga=1") y no colgado de "solo=1" a propósito: los links
// que ya se mandaron llevan solo "solo=1" y tienen que seguir abriéndose como se
// abrían. Los nuevos llevan las dos.
function abreEnModoCarga() {
  try {
    return !!new URLSearchParams(window.location.search).get("carga");
  } catch (e) { return false; }
}

// Solo ver: la checklist entera para consultarla, sin poder marcar NADA. Es el link
// del metre — necesita saber qué hay y cuánto, pero las marcas de carga son de
// logística y una casilla tocada por error deja a alguien pensando que algo está
// cargado cuando no lo está. Lleva "solo=1" además (misma lectura, sin edición) y lo
// único que quita de más es la entrada a Modo carga.
function esSoloVista() {
  try {
    return !!new URLSearchParams(window.location.search).get("vista");
  } catch (e) { return false; }
}

function leerEstadoGuardado() {
  try {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    // Se sanea SIEMPRE al entrar: un campo con el tipo equivocado (de un ?c= viejo o
    // manipulado) tumbaba la app al dibujar, y como el estado se guarda, recargar
    // volvía a tumbarla. Ver src/estado.js.
    if (c) return { estado: sanearEstado(JSON.parse(decodeURIComponent(c))), desdeLink: true };
    const guardado = localStorage.getItem("gula_checklist_estado");
    if (guardado) return { estado: sanearEstado(JSON.parse(guardado)), desdeLink: false };
  } catch (e) { /* link corrupto, localStorage no disponible, o JSON inválido: se ignora */ }
  return { estado: {}, desdeLink: false };
}

// SegmentedControl está en ./components/SegmentedControl.jsx y ListaColapsable en
// ./components/ListaColapsable.jsx.

// FilaItem está en ./components/FilaItem.jsx.

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App({ onCerrarSesion } = {}) {
  // El archivo de eventos (colección "indice") es del EQUIPO y sus reglas piden sesión
  // iniciada. Quien abre un link de un evento no la tiene —a propósito: el link se manda
  // al móvil del personal sin darles la app entera— así que sus intentos de sincronizar
  // el archivo se rechazaban siempre y salía un "No se ha podido guardar en la nube"
  // rojo en cada cambio. El evento SÍ se guardaba (sus reglas no piden sesión); lo que
  // fallaba era el archivo, que no es suyo y no tiene por qué tocar.
  // Acceso.jsx solo pasa onCerrarSesion cuando hay sesión de verdad: por eso vale de señal.
  const haySesionEquipo = !!onCerrarSesion;
  const [{ estado: estadoInicial, desdeLink: linkAbiertoInicial }] = useState(leerEstadoGuardado);
  const [evento, setEvento]         = useState(estadoInicial.evento ?? "boda");
  const [nombreEvento, setNombreEvento] = useState(estadoInicial.nombreEvento ?? "");
  const [fechaEvento, setFechaEvento]   = useState(estadoInicial.fechaEvento ?? "");
  const [horaInicio, setHoraInicio]     = useState(estadoInicial.horaInicio ?? "");
  const [ubicacion, setUbicacion]       = useState(estadoInicial.ubicacion ?? "");
  const [notasEvento, setNotasEvento]   = useState(estadoInicial.notasEvento ?? "");
  const [pax, setPax]               = useState(estadoInicial.pax ?? 80);
  const [ninos, setNinos]           = useState(estadoInicial.ninos ?? 0);
  // Solo producción: pax de cada día de rodaje/producción (ej. [12, 17, 12]). Lo
  // reutilizable se calcula para el día de MÁS pax y lo consumible para la SUMA.
  const [diasProduccion, setDiasProduccion] = useState(estadoInicial.diasProduccion ?? []);
  const diasPaxValidos = evento === "produccion" ? diasProduccion.map(d => parseInt(d, 10)).filter(n => n > 0) : [];
  // El pax que manda para las carpas: se montan una vez y se quedan, así que van por
  // el día de más gente, no por la suma de todos.
  const paxCarpas = diasPaxValidos.length ? Math.max(...diasPaxValidos) : pax;
  const [barraCoctel, setBarraCoctel] = useState(estadoInicial.barraCoctel ?? true);
  const [horasCoctel, setHorasCoctel] = useState(estadoInicial.horasCoctel ?? 2);
  const [barraCopas, setBarraCopas]   = useState(estadoInicial.barraCopas ?? false);
  const [horasCopas, setHorasCopas]   = useState(estadoInicial.horasCopas ?? 4);
  const [dobleServicio, setDobleServicio]             = useState(estadoInicial.dobleServicio ?? false);
  // Barril de cerveza (30L/50L, con tirador): descuenta esos litros de los tercios
  // necesarios en vez de sustituirlos del todo — puede haber tercios y barril a la
  // vez (el barril cubre parte y el resto se completa con botellín), solo barril
  // (si cubre todo lo necesario) o solo tercios (si no se lleva barril)
  const [tamanoBarril, setTamanoBarril] = useState(estadoInicial.tamanoBarril ?? "No lleva");
  const [numBarriles, setNumBarriles]   = useState(estadoInicial.numBarriles ?? 1);
  const [llevaEntrante, setLlevaEntrante]             = useState(estadoInicial.llevaEntrante ?? false);
  // Entrante compartido en plato (independiente del chupito): cuántas personas
  // comparten cada plato y cuántos entrantes distintos se reparten
  const [entranteCompartido, setEntranteCompartido] = useState(estadoInicial.entranteCompartido ?? false);
  const [numEntrantesCompartir, setNumEntrantesCompartir] = useState(estadoInicial.numEntrantesCompartir ?? 1);
  // "Lleva canapés" hacía dos cosas a la vez: sumar bandejas Y dejar los platos fuera
  // de la carga, y en una boda normal hay canapés en el cóctel Y platos en el banquete,
  // así que marcarlo te dejaba sin platos. Ahora las bandejas van siempre (por pax) y
  // lo único que se marca es si el servicio es entero de bandeja. La casilla vieja ya
  // no existe: se conserva su valor guardado solo para heredarlo aquí, y así los
  // eventos de antes siguen generando su misma lista.
  const [llevaCanapes] = useState(estadoInicial.llevaCanapes ?? false);
  const [soloBandeja, setSoloBandeja] = useState(estadoInicial.soloBandeja ?? estadoInicial.llevaCanapes ?? false);
  const [llevaPaella, setLlevaPaella]                 = useState(estadoInicial.llevaPaella ?? false);
  const [tipoPaella, setTipoPaella]                   = useState(estadoInicial.tipoPaella ?? "Auto");
  // 0 = las que salgan de la gente (una cada 30). Se guarda el 0 en vez de la cuenta
  // ya hecha para que al cambiar el pax se recalcule solo, como antes de poder ponerlo
  // a mano; en cuanto se escribe un número, manda ese.
  const [numPaellas, setNumPaellas]                   = useState(estadoInicial.numPaellas ?? 0);
  const [estiloPlatoPrincipal, setEstiloPlatoPrincipal] = useState(estadoInicial.estiloPlatoPrincipal ?? "Blanco liso");
  // En producción el plato de postre siempre fue el negro/gris, así que ese es su
  // valor de partida; en el resto de eventos, blanco. Solo aplica cuando el evento
  // no trae ya un estilo guardado.
  const [estiloPlatoPostre, setEstiloPlatoPostre]       = useState(estadoInicial.estiloPlatoPostre ?? (estadoInicial.evento === "produccion" ? "Negro/gris" : "Blanco"));
  const [llevaArmarioCaliente, setLlevaArmarioCaliente] = useState(estadoInicial.llevaArmarioCaliente ?? false);
  // Plancha de gas: en producción va fija; en el resto es opcional. Suma 1 bombona.
  const [llevaPlanchaGas, setLlevaPlanchaGas] = useState(estadoInicial.llevaPlanchaGas ?? false);
  // Cada plancha lleva SU bombona: antes la plancha era un sí/no y sumaba una sola, así
  // que poner una segunda a mano no subía el gas y se salía con una bombona de menos.
  const [numPlanchasGas, setNumPlanchasGas] = useState(estadoInicial.numPlanchasGas ?? 1);
  // Platos y cubiertos se pueden poner en "No llevan" para servicio de solo bandejas /
  // finger food (cóctel de pie). Van por separado por si solo se quita uno de los dos.
  const [llevaPlatos, setLlevaPlatos]       = useState(estadoInicial.llevaPlatos ?? true);
  // Los eventos guardados antes de separar postre de principal no tienen este campo:
  // se hereda de llevaPlatos para que sigan generando exactamente la misma lista.
  const [llevaPlatosPostre, setLlevaPlatosPostre] = useState(estadoInicial.llevaPlatosPostre ?? estadoInicial.llevaPlatos ?? true);
  const [llevaCubiertos, setLlevaCubiertos] = useState(estadoInicial.llevaCubiertos ?? true);
  const [numCamareros, setNumCamareros]                 = useState(estadoInicial.numCamareros ?? 0);
  // Ratio de camareros configurable: "1 camarero cada X pax". 0 = automático (usa el
  // recomendado por tipo de evento: boda/comunión 12, corporativo 18, cumple/produ 20).
  const [paxPorCamarero, setPaxPorCamarero]             = useState(estadoInicial.paxPorCamarero ?? 0);
  // Staff extra (cocina, producción, refuerzo...) que no sirve mesas pero también
  // consume agua/vasos: se suma a los camareros para calcular esos consumibles
  const [numStaff, setNumStaff]                         = useState(estadoInicial.numStaff ?? 0);
  const [tipoBandejas, setTipoBandejas] = useState(estadoInicial.tipoBandejas ?? "Mixto");
  const [tipoHorno, setTipoHorno]       = useState(estadoInicial.tipoHorno ?? "Pequeño");
  const [tipoBBQ, setTipoBBQ]           = useState(estadoInicial.tipoBBQ ?? "No lleva");
  // Los eventos guardados hasta ahora llevan mesVerano: true (era el único valor
  // posible, no había control) y ningún dato de temporada. Los que YA HAN PASADO se
  // quedan fijados en lo que tuvieran, para que su lista no cambie de cifras; los que
  // están por venir pasan a automático y se corrigen solos por su fecha.
  const [estacion, setEstacion] = useState(() => temporadaInicial(estadoInicial));
  const mesVerano = esVerano(estacion, fechaEvento);
  const [tieneBrindisCava, setTieneBrindisCava] = useState(estadoInicial.tieneBrindisCava ?? false);
  const [tieneFrituras, setTieneFrituras]       = useState(estadoInicial.tieneFrituras ?? false);
  const [numFrituras, setNumFrituras]           = useState(estadoInicial.numFrituras ?? 1);
  const [llevaChillOut, setLlevaChillOut]       = useState(estadoInicial.llevaChillOut ?? false);
  const [numChillOut, setNumChillOut]           = useState(estadoInicial.numChillOut ?? 1);
  const [fuerzaTextilTela, setFuerzaTextilTela] = useState(estadoInicial.fuerzaTextilTela ?? false);
  const [llevaPalomitera, setLlevaPalomitera]       = useState(estadoInicial.llevaPalomitera ?? false);
  // En producciones casi siempre van carpas y generador, así que empiezan activados:
  // el interruptor está para los sitios que ya tienen sombra o luz propia.
  const [llevaCarpas, setLlevaCarpas]               = useState(estadoInicial.llevaCarpas ?? true);
  const [llevaGenerador, setLlevaGenerador]         = useState(estadoInicial.llevaGenerador ?? true);
  // Mobiliario de alquiler (Event Style): mesas altas, sofás, muebles de barra... No es
  // material nuestro, así que además de salir en la carga hay que ir a por él y devolverlo.
  const [llevaMobiliarioAlquiler, setLlevaMobiliarioAlquiler] = useState(estadoInicial.llevaMobiliarioAlquiler ?? false);
  // Carpas de alquiler (SOS): las 8 del almacén cubren casi todo, pero cuando el cálculo
  // pide más hay que alquilar las que falten. Solo en producciones.
  const [alquilaCarpas, setAlquilaCarpas] = useState(estadoInicial.alquilaCarpas ?? false);
  // Cuántas carpas hacen falta. 0 = las que salgan de la cuenta por pax; cualquier
  // otro número manda sobre ella (lo pone quien ha visto el sitio, o el formulario).
  const [numCarpas, setNumCarpas] = useState(estadoInicial.numCarpas ?? 0);
  // Color de los manteles. Vacío = el de siempre según el tipo de evento, para que un
  // evento guardado antes de existir esta opción cargue exactamente lo mismo.
  const [colorManteles, setColorManteles] = useState(estadoInicial.colorManteles ?? "");
  const [porcentajeBeige, setPorcentajeBeige] = useState(estadoInicial.porcentajeBeige ?? 50);
  const [llevaJarrasCristal, setLlevaJarrasCristal] = useState(estadoInicial.llevaJarrasCristal ?? false);
  const [tipoCafetera, setTipoCafetera]             = useState(estadoInicial.tipoCafetera ?? "Nespresso");
  const [extraBandejasMadera, setExtraBandejasMadera] = useState(estadoInicial.extraBandejasMadera ?? 0);
  const [extraBandejasPlata, setExtraBandejasPlata]   = useState(estadoInicial.extraBandejasPlata ?? 0);
  const [llevaJamonero, setLlevaJamonero]             = useState(estadoInicial.llevaJamonero ?? false);
  // Por defecto SÍ hay tarta: hasta ahora la mesa y los platos se cargaban siempre en
  // boda y comunión, y un evento guardado antes de esto tiene que abrirse igual que
  // estaba. Solo desmarcándolo se quitan (y con ellos la pala y el cuchillo).
  const [llevaTarta, setLlevaTarta]                   = useState(estadoInicial.llevaTarta ?? true);
  const [personasPorPlatoEntrante, setPersonasPorPlatoEntrante] = useState(estadoInicial.personasPorPlatoEntrante ?? 4);
  const [llevaAguasPequenas, setLlevaAguasPequenas]   = useState(estadoInicial.llevaAguasPequenas ?? false);
  // En rodaje las aguas pequeñas van siempre: lo que se elige es el envase. Vacío =
  // como estaba, sin decir nada, para no cambiar los rodajes ya guardados.
  const [tipoAguaPequena, setTipoAguaPequena] = useState(estadoInicial.tipoAguaPequena ?? "");
  const [hayDesayuno, setHayDesayuno]                 = useState(estadoInicial.hayDesayuno ?? false);
  const [tipoNevera, setTipoNevera]         = useState(estadoInicial.tipoNevera ?? "Mediana");
  const [tipoCongelador, setTipoCongelador] = useState(estadoInicial.tipoCongelador ?? "Mediana");
  const [origenSillas, setOrigenSillas]     = useState(estadoInicial.origenSillas ?? "Dealde"); // Dealde | Carvillo | Nuestras | No llevan
  // De qué tipo son las mesas donde SE SIENTA la gente. Las de cocina no se eligen: son
  // siempre rectangulares de 1,80, que es sobre lo que se prepara el servicio.
  // Las redondas no son nuestras, van de alquiler.
  const [tipoMesa, setTipoMesa] = useState(estadoInicial.tipoMesa ?? TIPO_MESA_POR_DEFECTO);
  // Equipo de logística (montaje/desmontaje): cada persona con su propio horario.
  // Si hay un estado guardado con el formato antiguo (horario general) se migra a una fila.
  const [logisticaEquipo, setLogisticaEquipo] = useState(estadoInicial.logisticaEquipo ?? (
    estadoInicial.logisticaQuien || estadoInicial.logisticaInicio || estadoInicial.logisticaFin
      ? [{ nombre: estadoInicial.logisticaQuien || "", inicio: estadoInicial.logisticaInicio || "", fin: estadoInicial.logisticaFin || "" }]
      : []
  )); // [{ nombre, inicio, fin, furgoneta }]
  const [tarifaLogistica, setTarifaLogistica] = useState(estadoInicial.tarifaLogistica ?? 10); // €/hora
  // Plus por poner furgoneta propia: 25€ por defecto (rango habitual 20-30€/evento,
  // por encima del kilometraje oficial de 0,26€/km para que compense). Modificable.
  const [plusFurgoneta, setPlusFurgoneta]     = useState(estadoInicial.plusFurgoneta ?? 25);
  // Recogidas: alquileres/equipo de otros proveedores que hay que devolver o recoger en
  // una fecha/hora concreta (camión plataforma, furgonetas, flores, armario caliente...)
  const [recogidas, setRecogidas] = useState(estadoInicial.recogidas ?? []); // [{ concepto, fecha, hora, notas }]
  // Compras: cosas que hay que comprar para el evento, con fecha límite y aviso previo.
  const [compras, setCompras] = useState(estadoInicial.compras ?? []); // [{ concepto, fecha, cantidad, comprado }]
  // Cronómetros de Modo carga: mide lo que se tarda de verdad cargando y descargando.
  // Por fase: { ms: acumulado en pausa, running: bool, since: timestamp del arranque }.
  const [cronos, setCronos] = useState(estadoInicial.cronos ?? {}); // { carga:{...}, descarga:{...} }
  // Categorías renombradas por el usuario: { "nombre original": "nombre nuevo" }
  const [categoriasRenombradas, setCategoriasRenombradas] = useState(estadoInicial.categoriasRenombradas ?? {});
  const [filtro, setFiltro]           = useState("");
  const [openCategories, setOpenCategories] = useState({});
  // El link de solo ver (el del metre) abre DIRECTO en la hoja: es la vista buena para
  // quien tiene que saber qué hay y qué se devuelve, no la lista de carga con sus
  // casillas. Al cerrarla queda la checklist, también de solo lectura.
  const [modalPrevia, setModalPrevia]   = useState(esSoloVista);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [compartirMsg, setCompartirMsg] = useState("");
  const [menuCompartir, setMenuCompartir] = useState(false);
  const [agregadosTag, setAgregadosTag] = useState("");
  // Confirmación temporal de qué se acaba de guardar (plantilla o evento), para que
  // quede claro cuál de los dos botones se pulsó
  const [guardadoPlantillaMsg, setGuardadoPlantillaMsg] = useState("");
  const [guardadoEventoMsg, setGuardadoEventoMsg] = useState("");
  const [itemsManuales, setItemsManuales] = useState(estadoInicial.itemsManuales ?? []); // [{ label, cantidad, categoria }] — añadidos a mano por el usuario
  const [overridesManuales, setOverridesManuales] = useState(estadoInicial.overridesManuales ?? {}); // { "categoria::label": "cantidad editada a mano" }
  const [itemsOcultos, setItemsOcultos] = useState(estadoInicial.itemsOcultos ?? {}); // { "categoria::label": true } — items calculados quitados de la lista
  const [nombresManuales, setNombresManuales] = useState(estadoInicial.nombresManuales ?? {});
  // Orden de categorías elegido a mano (lista de nombres). Vacío = el de la app.
  const [ordenCategorias, setOrdenCategorias] = useState(estadoInicial.ordenCategorias ?? []); // { "categoria::labelOriginal": "nombre corregido" }
  // Preparar (sacar del almacén y dejarlo listo) y cargar en el camión son dos momentos
  // distintos, muchas veces de personas distintas: llevan su propio check para poder
  // controlar la preparación sin mezclarla con lo que ya está subido al camión.
  const [preparados, setPreparados] = useState(estadoInicial.preparados ?? {}); // { "categoria::label": true } — marcados como preparados en "Modo carga"
  // Items marcados en Modo carga a los que se les cambió la cantidad DESPUÉS de
  // marcarlos: la marca se conserva (es trabajo hecho) pero se señalan para volver a
  // contarlos. Se limpia al volver a tocar su casilla, que es cuando se han revisado.
  const [marcasRevisar, setMarcasRevisar] = useState(estadoInicial.marcasRevisar ?? {});
  const [checkeados, setCheckeados] = useState(estadoInicial.checkeados ?? {}); // { "categoria::label": true } — marcados como "Sale" (cargado) en "Modo carga"
  // Foto de las cantidades AUTOMÁTICAS (sin edición manual) tal como estaban la última vez
  // que se guardó el evento. Sirve para que "Recalcular" pueda detectar si alguna cantidad
  // cambió de valor por un ajuste de fórmula (como este mismo) desde entonces, sin que el
  // usuario tenga que fiarse de la memoria — los items editados a mano nunca se tocan solos.
  const [valoresCalculados, setValoresCalculados] = useState(estadoInicial.valoresCalculados ?? {});
  const [modalRecalcular, setModalRecalcular] = useState(null); // [{ key, label, categoria, anterior, nuevo }] o null
  const [recalcularMsg, setRecalcularMsg] = useState("");
  const [vueltos, setVueltos] = useState(estadoInicial.vueltos ?? {}); // { "categoria::label": true } — marcados como "Vuelve" (devuelto tras el evento)
  const [roturas, setRoturas] = useState(estadoInicial.roturas ?? {}); // { "categoria::label": "2" } — nº de roturas/pérdidas contadas a la vuelta
  const [notasCheck, setNotasCheck] = useState(estadoInicial.notasCheck ?? {}); // { "texto de la nota": true } — recordatorios de las notas marcados como hechos en "Modo carga"
  const [soloVista] = useState(esSoloVista);
  // El link de logística: entra en Modo carga y ahí se queda, sin puerta de salida
  const [soloCarga] = useState(() => abreEnModoCarga() && !esSoloVista());
  // Con el link de solo ver no se entra en Modo carga ni por la puerta de atrás
  const [modoCarga, setModoCarga] = useState(() => abreEnModoCarga() && !esSoloVista());
  // "Solo ver" es "solo marcar" y además sin marcar: hereda todo lo que aquel bloquea
  // (cantidades, nombres, configuración, añadir y quitar items).
  const [soloMarcar] = useState(() => esSoloMarcar() || esSoloVista());
  // El calendario del equipo, a pantalla completa por encima de la checklist
  const [modalCalendario, setModalCalendario] = useState(false);
  // Barra fina pegada arriba en móvil: la cabecera con los botones ocupa casi un tercio
  // de la pantalla, así que dejarla fija entera sería peor. En su lugar, al bajar de la
  // cabecera aparece una tira de ~50px con lo único que se usa mientras se recorre la
  // lista: dónde estás, el buscador y Modo carga. React no repinta si el valor no
  // cambia, así que basta con fijar el booleano en cada scroll.
  const [barraFija, setBarraFija] = useState(false);
  useEffect(() => {
    const alBajar = () => setBarraFija(window.scrollY > 260);
    window.addEventListener("scroll", alBajar, { passive: true });
    alBajar();
    return () => window.removeEventListener("scroll", alBajar);
  }, []);
  // Items marcados a mano como "alquiler proveedor", para los que no llevan Dealde/Carvillo/
  // Novelda/alquiler en el nombre y por tanto no se detectan solos (ej. algo puntual que no
  // está incluido y hay que alquilar aparte)
  const [itemsAlquilerManual, setItemsAlquilerManual] = useState(estadoInicial.itemsAlquilerManual ?? {}); // { "categoria::labelOriginal": true }
  const [editandoNombre, setEditandoNombre] = useState(null); // clave "categoria::label" del item cuyo nombre se está editando
  const [nombreTemporal, setNombreTemporal] = useState("");
  const [alquilerTemporal, setAlquilerTemporal] = useState(false); // checkbox "alquiler proveedor" mientras se edita un item
  // Diálogo propio activo (confirmaciones y campos de texto con la estética de la app)
  const [dialogo, setDialogo] = useState(null); // { tipo, titulo, mensaje, placeholder, valorInicial, textoConfirmar, peligro, onConfirm }
  // Id del evento en la nube (edición compartida): si existe, los cambios se
  // sincronizan con Firestore y el link es corto (?evento=id)
  const [eventoNubeId, setEventoNubeId] = useState(estadoInicial.eventoNubeId ?? null);
  // Lista de frases con lo que acaba de cambiar desde otro dispositivo (null = sin aviso)
  const [hayCambiosRemotos, setHayCambiosRemotos] = useState(null);
  const [nuevoItemLabel, setNuevoItemLabel] = useState("");
  const [nuevoItemCantidad, setNuevoItemCantidad] = useState("");
  const [nuevoItemCategoria, setNuevoItemCategoria] = useState("");
  const [nuevoItemAlquiler, setNuevoItemAlquiler] = useState(false);
  const [categoriaTocada, setCategoriaTocada] = useState(false);
  const [linkAbierto] = useState(linkAbiertoInicial ?? false);
  // Plantillas guardadas con nombre: configuración reutilizable entre eventos
  const [plantillas, setPlantillas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gula_plantillas")) || {}; } catch (e) { return {}; }
  });
  // Eventos guardados completos (con nombre, fecha, logística...): archivo de checklists
  // que se pueden recargar o compartir por link en cualquier momento
  const [eventosGuardados, setEventosGuardados] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gula_eventos_guardados")) || {}; } catch (e) { return {}; }
  });
  // Avisos de recogidas/devoluciones pendientes (hoy o ya pasadas), mirando TODOS los
  // eventos guardados, no solo el que está abierto — para no olvidar recoger/devolver
  // alquileres (camión plataforma, armario caliente, flores...) de ningún evento.
  const [avisosOcultos, setAvisosOcultos] = useState(false);
  // El formulario de oficina: el código del enlace (vive en la nube, compartido por
  // todos los dispositivos) y lo que han mandado por él. Sin nube esto no existe y la
  // app va exactamente igual que antes.
  const [codigoFormulario, setCodigoFormulario] = useState("");
  const [envios, setEnvios] = useState([]);
  const [cargandoEnvios, setCargandoEnvios] = useState(false);
  const [modalFormulario, setModalFormulario] = useState(false);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  // Aviso flotante cuando la oficina manda o cambia algo con la app abierta
  const [avisoEnvios, setAvisoEnvios] = useState(null);
  // Las checklists que se han creado solas al abrir. Automático no puede querer decir
  // invisible: en el archivo aparecen eventos y hay que poder enterarse de cuáles.
  const [checklistsCreadas, setChecklistsCreadas] = useState([]);
  // A quién avisa la oficina por WhatsApp al mandar o cambiar algo. Se guarda en la
  // nube con el código, así que se pone una vez y vale para todos los dispositivos.
  // El número NO va escrito en el código: este repositorio es público.
  const [avisosWhatsapp, setAvisosWhatsapp] = useState([{ nombre: "Raúl · Jefe de logística", tel: "" }]);
  const primeraFotoEnviosRef = React.useRef(true);
  useEffect(() => {
    if (!avisoEnvios) return;
    const t = setTimeout(() => setAvisoEnvios(null), 30000);
    return () => clearTimeout(t);
  }, [avisoEnvios]);
  // ¿Hay una versión nueva publicada? Los .js llevan hash en el nombre, así que si el
  // navegador se queda con el index.html en caché sigue cargando la compilación vieja
  // para siempre y no te enteras. Se compara el id de la compilación cargada con el
  // version.json del servidor (pidiéndolo sin caché) al abrir, al volver a la pestaña
  // y cada 10 minutos. Si no hay conexión, no se dice nada.
  const [versionNueva, setVersionNueva] = useState(false);
  // Los eventos ya pasados se ocultan por defecto: la lista principal muestra solo los
  // PENDIENTES (fecha futura, el más cercano arriba; los sin fecha al final). Los pasados
  // quedan detrás de un "Ver pasados" para no perder el acceso a ellos.
  const [verPasados, setVerPasados] = useState(false);
  const [filtroEventos, setFiltroEventos] = useState("");
  const { eventosPendientes, eventosPasados } = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const q = _norm(filtroEventos);
    const pend = [], pas = [];
    Object.keys(eventosGuardados).forEach(n => {
      if (q && !_norm(n).includes(q)) return;
      const f = eventosGuardados[n]?.fechaEvento || "";
      if (f && f < hoy) pas.push(n); else pend.push(n);
    });
    pend.sort((a, b) => {
      const fa = eventosGuardados[a]?.fechaEvento || "", fb = eventosGuardados[b]?.fechaEvento || "";
      if (!fa) return 1;
      if (!fb) return -1;
      return fa.localeCompare(fb);
    });
    pas.sort((a, b) => (eventosGuardados[b]?.fechaEvento || "").localeCompare(eventosGuardados[a]?.fechaEvento || ""));
    return { eventosPendientes: pend, eventosPasados: pas };
  }, [eventosGuardados, filtroEventos]);

  // Avisos de recogidas, devoluciones y compras. Avisan CON ANTELACIÓN: entran en la
  // lista cuando faltan DIAS_AVISO días o menos (o si ya están atrasados), no solo el
  // mismo día. Cada aviso lleva su lista y campo para poder marcarlo como hecho.
  //
  // Cinco días y no tres: una recogida de flores o de minutas no se resuelve el mismo
  // día — hay que llamar, confirmar y pasar a por ello. Con tres días la llamada
  // llegaba justa.
  const DIAS_AVISO = 5;
  // Suelo por abajo: una recogida de hace dos meses que nunca se marcó no es un
  // recordatorio, es ruido que tapa lo de esta semana. Se deja de avisar pasado ese
  // tiempo (el dato sigue en el evento, solo desaparece del panel de avisos).
  const DIAS_AVISO_CADUCA = 60;
  const avisosRecogidas = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const hoyISO = hoy.toISOString().slice(0, 10);
    const limite = new Date(hoy); limite.setDate(limite.getDate() + DIAS_AVISO);
    const limiteISO = limite.toISOString().slice(0, 10);
    const diasHasta = (f) => Math.round((new Date(f + "T00:00:00") - hoy) / 86400000);
    const suelo = new Date(hoy); suelo.setDate(suelo.getDate() - DIAS_AVISO_CADUCA);
    const sueloISO = suelo.toISOString().slice(0, 10);
    const dentroVentana = (f) => f && f <= limiteISO && f >= sueloISO;
    const avisos = [];
    Object.entries(eventosGuardados).forEach(([nombreEvt, datos]) => {
      (datos.recogidas || []).forEach((r, idx) => {
        if (!r.concepto) return;
        if (dentroVentana(r.fecha) && !r.recogido) avisos.push({ evento: nombreEvt, idx, concepto: r.concepto, fecha: r.fecha, tipo: "Recogida", lista: "recogidas", campo: "recogido", dias: diasHasta(r.fecha) });
        // La devolución NO se avisa mientras la recogida siga pendiente: todavía no hay
        // nada que devolver y el mismo concepto salía dos veces seguidas ("Recogida:
        // generador" y justo debajo "Devolución: generador"), que es lo que hacía que
        // el aviso pareciera duplicado. En cuanto se marca la recogida como hecha,
        // aparece la devolución. Excepción: si la devolución vence hoy o está atrasada
        // se avisa igual aunque nadie marcara la recogida, para no pagar días de más.
        const devVencida = r.fechaDevolucion && diasHasta(r.fechaDevolucion) <= 0;
        if (dentroVentana(r.fechaDevolucion) && !r.devuelto && (r.recogido || devVencida)) {
          avisos.push({ evento: nombreEvt, idx, concepto: soloObjeto(r.concepto), fecha: r.fechaDevolucion, tipo: "Devolución", lista: "recogidas", campo: "devuelto", dias: diasHasta(r.fechaDevolucion) });
        }
      });
      (datos.compras || []).forEach((c, idx) => {
        if (!c.concepto) return;
        if (dentroVentana(c.fecha) && !c.comprado) avisos.push({ evento: nombreEvt, idx, concepto: c.concepto + (c.cantidad ? ` (${c.cantidad})` : ""), fecha: c.fecha, tipo: "Compra", lista: "compras", campo: "comprado", dias: diasHasta(c.fecha) });
      });
    });
    avisos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return avisos.map(a => ({ ...a, hoyISO }));
  }, [eventosGuardados]);
  // Marca una recogida/devolución/compra como hecha desde el propio aviso: se guarda en el
  // evento afectado (nube incluida) y, si es el evento abierto, también en su estado vivo
  const marcarAvisoHecho = (aviso) => {
    const { lista, campo } = aviso;
    const datos = eventosGuardados[aviso.evento];
    if (datos) {
      const nuevoEstado = { ...datos, [lista]: (datos[lista] || []).map((r, idx) => idx === aviso.idx ? { ...r, [campo]: true } : r) };
      guardarEventos({ ...eventosGuardados, [aviso.evento]: nuevoEstado });
      // El doc individual del link compartido también se actualiza si el evento tiene uno
      if (nubeActiva() && nuevoEstado.eventoNubeId) guardarEventoNube(nuevoEstado.eventoNubeId, nuevoEstado).catch(avisarFalloNube);
    }
    // Si el evento del aviso es el que está abierto en el formulario (mismo nombre o
    // mismo id de nube), su estado vivo también se marca — así un "Guardar evento"
    // posterior no pisa el hecho con el pendiente antiguo
    const esElAbierto = aviso.evento === nombreEvento || (datos && datos.eventoNubeId && datos.eventoNubeId === eventoNubeId);
    if (esElAbierto) {
      const setter = lista === "compras" ? setCompras : setRecogidas;
      setter(prev => prev.map((r, idx) => idx === aviso.idx ? { ...r, [campo]: true } : r));
    }
  };
  // Historial para deshacer cambios manuales (cantidad editada o item quitado).
  // Se guarda un snapshot al EMPEZAR a editar cada item (no por cada tecla).
  // El nombre que has escrito ya es de otro evento guardado: no se auto-guarda para no
  // pisarlo, y se dice claramente en vez de dejarlo en silencio.
  // ¿Esta checklist la creó el calendario y todavía le falta lo suyo? Viene puesta en
  // las que se crean solas y se apaga cuando llegan los datos del formulario o cuando
  // alguien dice que ya está. Se guarda con el evento, así que se ve desde cualquier
  // dispositivo y no solo en el que la creó.
  const [sinConfigurar, setSinConfigurar] = useState(estadoInicial.sinConfigurar ?? false);
  const [nombreOcupado, setNombreOcupado] = useState(false);
  const [historial, setHistorial] = useState([]);
  const ultimaClaveEditadaRef = React.useRef(null);

  // Snapshot de todo el estado configurable — lo usan tanto el link para el móvil
  // como el guardado automático en localStorage
  const getEstadoActual = () => ({
    sinConfigurar,
    evento, nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, pax, ninos,
    barraCoctel, horasCoctel, barraCopas, horasCopas, diasProduccion,
    dobleServicio, tamanoBarril, numBarriles, llevaEntrante, llevaCanapes, soloBandeja, llevaPaella, tipoPaella, numPaellas, // llevaCanapes: solo se conserva para no perderlo al guardar
    estiloPlatoPrincipal, estiloPlatoPostre,
    llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas, llevaPlatos, llevaPlatosPostre, llevaCubiertos, numCamareros, paxPorCamarero, numStaff, tipoBandejas,
    tipoHorno, tipoBBQ, estacion, mesVerano,
    tieneFrituras, numFrituras, fuerzaTextilTela, llevaChillOut, numChillOut,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera, llevaCarpas, llevaGenerador,
    llevaMobiliarioAlquiler, alquilaCarpas, numCarpas, tieneBrindisCava, colorManteles, porcentajeBeige,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero, llevaTarta,
    personasPorPlatoEntrante, llevaAguasPequenas, tipoAguaPequena, hayDesayuno,
    entranteCompartido, numEntrantesCompartir,
    tipoNevera, tipoCongelador, origenSillas, tipoMesa, itemsManuales, overridesManuales,
    itemsOcultos, nombresManuales, categoriasRenombradas, ordenCategorias, itemsAlquilerManual, preparados, checkeados, vueltos, roturas, marcasRevisar, notasCheck, cronos,
    valoresCalculados, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, compras, eventoNubeId,
  });
  const estadoActualJSON = JSON.stringify(getEstadoActual());

  // Guarda automáticamente en este navegador cada vez que cambia algo, para no perder
  // la configuración si se recarga la página o se cierra sin querer. El estado inicial
  // ya se restauró de forma síncrona (ver leerEstadoGuardado/estadoInicial arriba), así
  // que no hace falta guardia de "carga completada": no hay carrera con StrictMode.
  useEffect(() => {
    try { localStorage.setItem("gula_checklist_estado", estadoActualJSON); } catch (e) { /* localStorage lleno o no disponible */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON]);

  // Indicador "Guardado ✓": parpadea un instante tras cada cambio (el guardado en el
  // navegador es inmediato). Se salta el primer render para no aparecer al abrir.
  const [guardadoFlash, setGuardadoFlash] = useState(false);
  // Hasta ahora TODOS los guardados en la nube se tragaban su error en silencio: si
  // fallaban (sin conexión, permisos, o el archivo pasado del límite de 1 MB de
  // Firestore) la app parecía haber guardado. Ahora el fallo se ve y no desaparece
  // solo, para poder actuar antes de perder el trabajo hecho.
  const [errorNube, setErrorNube] = useState(null);
  // El aviso decía SIEMPRE "revisa la conexión", fuera cual fuera el fallo. Con una
  // sesión caducada eso manda a mirar el wifi durante un rato largo mientras lo que
  // hace falta es volver a entrar. Cada causa tiene su frase y su arreglo.
  const avisarFalloNube = (e) => {
    const codigo = String(e?.code || "");
    const msg = String(e?.message || e || "");
    if (/permission-denied|unauthenticated/i.test(codigo + " " + msg)) {
      setErrorNube("La sesión del equipo ha caducado. Los cambios están guardados en este dispositivo: vuelve a entrar para subirlos.");
      return;
    }
    if (/longer than|exceeds|maximum|too large|invalid-argument|resource-exhausted/i.test(codigo + " " + msg)) {
      setErrorNube("El archivo de eventos ya no cabe en la nube. Borra o archiva eventos antiguos para poder seguir guardando.");
      return;
    }
    setErrorNube("No se ha podido guardar en la nube. Los cambios están en este dispositivo; revisa la conexión.");
  };
  const primerGuardadoRef = React.useRef(true);
  useEffect(() => {
    if (primerGuardadoRef.current) { primerGuardadoRef.current = false; return; }
    setGuardadoFlash(true);
    const t = setTimeout(() => setGuardadoFlash(false), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON]);

  // ─── SINCRONIZACIÓN EN LA NUBE (si hay configuración de Firebase) ──────────
  // Referencias para distinguir nuestros propios guardados de los de otra persona
  const estadoActualJSONRef = React.useRef(estadoActualJSON);
  estadoActualJSONRef.current = estadoActualJSON;
  const ultimoGuardadoNubeRef = React.useRef(null);

  // Las marcas de tiempo de NUESTROS últimos guardados. Sirven para reconocer el eco de
  // lo que hemos escrito nosotros cuando vuelve por la suscripción.
  //
  // No se compara con la hora del móvil de nadie más a propósito: dos teléfonos con el
  // reloj desajustado unos minutos —que es de lo más normal— harían que los cambios de
  // uno se descartaran en el otro sin que nadie entendiera por qué. Solo se reconocen
  // las marcas propias, y para eso el reloj es siempre el mismo.
  const nuestrosGuardadosRef = React.useRef([]);
  const apuntarGuardadoPropio = (ts) => {
    if (!ts) return;
    // Diez llegan de sobra: el eco tarda un segundo, no media hora
    nuestrosGuardadosRef.current = [...nuestrosGuardadosRef.current.slice(-9), ts];
  };

  // Cada cambio local se sube a la nube con un pequeño retardo (evita subir por cada tecla)
  useEffect(() => {
    if (!nubeActiva() || !eventoNubeId) return;
    const t = setTimeout(() => {
      ultimoGuardadoNubeRef.current = estadoActualJSON;
      guardarEventoNube(eventoNubeId, getEstadoActual())
        .then((ts) => { apuntarGuardadoPropio(ts); setErrorNube(null); })
        .catch(avisarFalloNube);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON, eventoNubeId]);

  // Setters de cada campo, para poder aplicar un estado remoto SIN recargar la página
  const SETTERS_SYNC = {
    sinConfigurar: setSinConfigurar,
    evento: setEvento, nombreEvento: setNombreEvento, fechaEvento: setFechaEvento,
    horaInicio: setHoraInicio, ubicacion: setUbicacion, notasEvento: setNotasEvento, pax: setPax, ninos: setNinos,
    barraCoctel: setBarraCoctel, horasCoctel: setHorasCoctel, barraCopas: setBarraCopas, horasCopas: setHorasCopas, diasProduccion: setDiasProduccion,
    dobleServicio: setDobleServicio, tamanoBarril: setTamanoBarril, numBarriles: setNumBarriles, llevaEntrante: setLlevaEntrante, soloBandeja: setSoloBandeja,
    llevaPaella: setLlevaPaella, tipoPaella: setTipoPaella, numPaellas: setNumPaellas,
    estiloPlatoPrincipal: setEstiloPlatoPrincipal, estiloPlatoPostre: setEstiloPlatoPostre,
    llevaArmarioCaliente: setLlevaArmarioCaliente, llevaPlanchaGas: setLlevaPlanchaGas, numPlanchasGas: setNumPlanchasGas, llevaPlatos: setLlevaPlatos, llevaPlatosPostre: setLlevaPlatosPostre, llevaCubiertos: setLlevaCubiertos, numCamareros: setNumCamareros, paxPorCamarero: setPaxPorCamarero, numStaff: setNumStaff, tipoBandejas: setTipoBandejas,
    tipoHorno: setTipoHorno, tipoBBQ: setTipoBBQ, estacion: setEstacion, tieneBrindisCava: setTieneBrindisCava,
    tieneFrituras: setTieneFrituras, numFrituras: setNumFrituras, fuerzaTextilTela: setFuerzaTextilTela,
    llevaChillOut: setLlevaChillOut, numChillOut: setNumChillOut,
    llevaPalomitera: setLlevaPalomitera, llevaJarrasCristal: setLlevaJarrasCristal, tipoCafetera: setTipoCafetera,
    llevaCarpas: setLlevaCarpas, llevaGenerador: setLlevaGenerador,
    llevaMobiliarioAlquiler: setLlevaMobiliarioAlquiler, alquilaCarpas: setAlquilaCarpas, numCarpas: setNumCarpas,
    colorManteles: setColorManteles, porcentajeBeige: setPorcentajeBeige,
    extraBandejasMadera: setExtraBandejasMadera, extraBandejasPlata: setExtraBandejasPlata, llevaJamonero: setLlevaJamonero, llevaTarta: setLlevaTarta,
    personasPorPlatoEntrante: setPersonasPorPlatoEntrante, llevaAguasPequenas: setLlevaAguasPequenas, tipoAguaPequena: setTipoAguaPequena, hayDesayuno: setHayDesayuno,
    entranteCompartido: setEntranteCompartido, numEntrantesCompartir: setNumEntrantesCompartir,
    tipoNevera: setTipoNevera, tipoCongelador: setTipoCongelador, origenSillas: setOrigenSillas, tipoMesa: setTipoMesa,
    logisticaEquipo: setLogisticaEquipo, tarifaLogistica: setTarifaLogistica, plusFurgoneta: setPlusFurgoneta, recogidas: setRecogidas, compras: setCompras,
    itemsManuales: setItemsManuales, overridesManuales: setOverridesManuales,
    itemsOcultos: setItemsOcultos, nombresManuales: setNombresManuales, categoriasRenombradas: setCategoriasRenombradas, ordenCategorias: setOrdenCategorias,
    itemsAlquilerManual: setItemsAlquilerManual, preparados: setPreparados, checkeados: setCheckeados, vueltos: setVueltos, roturas: setRoturas, marcasRevisar: setMarcasRevisar, notasCheck: setNotasCheck, cronos: setCronos,
    valoresCalculados: setValoresCalculados,
    eventoNubeId: setEventoNubeId,
  };
  const settersSyncRef = React.useRef(SETTERS_SYNC);
  settersSyncRef.current = SETTERS_SYNC;

  // Escucha los guardados de otras personas en este evento: cuando llega uno que
  // no es nuestro se aplica AL INSTANTE (sin recargar) y se muestra un aviso con
  // el detalle de lo que ha cambiado
  useEffect(() => {
    if (!nubeActiva() || !eventoNubeId) return;
    const unsub = suscribirEventoNube(eventoNubeId, (remotoJSON, meta = {}) => {
      if (remotoJSON === estadoActualJSONRef.current || remotoJSON === ultimoGuardadoNubeRef.current) return;
      // El primer aviso de cada escritura es la nuestra sin confirmar: no hay nada que
      // aplicar, ya lo tenemos delante.
      if (meta.pendiente) return;
      // Y aquí está lo que hacía que las horas de barra "se cambiaran solas", sin que
      // nadie tocara nada desde ningún otro sitio: al mover un deslizador varias veces
      // seguidas se suben varios estados, y el eco del penúltimo llega cuando ya vas
      // por el último. Solo se comparaba el texto con el ÚLTIMO guardado nuestro, así
      // que el eco del anterior colaba y te devolvía el valor viejo — el deslizador
      // saltaba solo hacia atrás un segundo después de soltarlo.
      // Reconociendo la marca de tiempo como nuestra, ese eco se descarta entero.
      if (meta.actualizado && nuestrosGuardadosRef.current.includes(meta.actualizado)) return;
      let remoto, previo;
      // También lo que llega de la nube: puede venir de una versión distinta
      try { remoto = sanearEstado(JSON.parse(remotoJSON)); previo = JSON.parse(estadoActualJSONRef.current); }
      catch (e) { return; /* estado remoto corrupto: se ignora */ }
      const cambios = resumirCambios(previo, remoto);
      // Marcar ANTES de aplicar: así el guardado automático que provocará este
      // cambio de estado no se re-detecta como "cambio de otra persona"
      ultimoGuardadoNubeRef.current = remotoJSON;
      Object.entries(remoto).forEach(([k, v]) => {
        // Un doc remoto guardado sin nombre (típico: se puso el nombre solo en el
        // diálogo de guardar, no en el campo) no debe borrar el nombre que ya
        // tenemos: sin esto, al abrir ese evento el snapshot inicial de la nube
        // vaciaba el campo nada más inyectarlo, y el diálogo salía vacío otra vez
        if (k === "nombreEvento" && !v && previo.nombreEvento) return;
        if (settersSyncRef.current[k]) settersSyncRef.current[k](v);
      });
      if (cambios.length > 0) {
        setHayCambiosRemotos(cambios);
        // 25 segundos en vez de 10: da tiempo a leerlo aunque estés cargando el camión
        // con las manos ocupadas. Y siempre se puede cerrar con la ✕.
        clearTimeout(window.__avisoSyncTimer);
        window.__avisoSyncTimer = setTimeout(() => setHayCambiosRemotos(null), 25000);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoNubeId]);

  // Si hay nombre de evento, se antepone al link copiado ("Boda Ana y Luis: https://...")
  // para poder distinguir de qué evento es al pegarlo en WhatsApp u otro chat.
  // El aviso que sale en el propio botón de Compartir. Pasa por aquí por dos motivos:
  //   · un aviso nuevo borra el temporizador del anterior, que si no el "✓" de hace dos
  //     segundos apagaba el aviso que acababa de salir;
  //   · y los avisos llevan prioridad, porque el "¡Link copiado!" y el "no ha subido"
  //     compiten: el portapapeles y la subida terminan cada uno cuando quieren, y en
  //     las pruebas se vio que el "✓" llegaba el último y tapaba el fallo. Un aviso de
  //     más prioridad no se deja pisar por uno de menos.
  const avisoCompartirRef = React.useRef(null);
  const avisoPrioridadRef = React.useRef(0);
  const avisarCompartir = (texto, ms = 3000, prioridad = 0) => {
    if (prioridad < avisoPrioridadRef.current) return;
    avisoPrioridadRef.current = prioridad;
    if (avisoCompartirRef.current) clearTimeout(avisoCompartirRef.current);
    setCompartirMsg(texto);
    avisoCompartirRef.current = setTimeout(() => {
      setCompartirMsg("");
      avisoCompartirRef.current = null;
      avisoPrioridadRef.current = 0;
    }, ms);
  };

  // Se copia SOLO la dirección, sin el nombre del evento delante. Llevaba
  // "Evento: https://…" para que en WhatsApp se supiera de cuál era, pero eso rompía
  // pegarlo en la barra del navegador: al ver un texto con espacios, el navegador lo
  // BUSCA en vez de abrirlo, y parecía que el link no funcionaba. En WhatsApp da
  // igual, que ahí la dirección se detecta sola y de qué evento es se escribe al lado.
  // Compartir un link tiene dos caminos, y el orden importa:
  //
  // 1) El botón de compartir del móvil (navigator.share). Manda el NOMBRE y la
  //    DIRECCIÓN por separado, así que en el WhatsApp llega "Boda Fulanita y Mengano ·
  //    carga" con su link debajo, tocable, y sin pasar por el portapapeles. Es lo
  //    que hacía falta: un link suelto entre veinte mensajes no hay quien lo
  //    encuentre después.
  // 2) Si el móvil o el navegador no lo tienen, se copia al portapapeles.
  //
  // Y aquí está la trampa que ya nos costó una vez: se copiaba "Nombre: https://…"
  // y quien pegaba ESO en la barra del navegador no abría nada — al ver un texto con
  // espacios, el navegador BUSCA en vez de abrir. Por eso, cuando toca copiar, la
  // dirección va SOLA y en su propia línea, la última, y el nombre encima. Pegado en
  // el WhatsApp se ve el nombre y el link tocable; y si alguien copia solo la última
  // línea, tiene la dirección limpia.
  const copiarLink = (url, nombre = "", queEs = "") => {
    const titulo = [nombre, queEs].filter(Boolean).join(" · ");
    // El share del móvil tiene que salir DENTRO del toque, igual que la copia: detrás
    // de un await el navegador lo rechaza por no venir de un gesto.
    if (navigator.share) {
      navigator.share({ title: titulo || "Checklist Gula", text: titulo, url })
        .then(() => avisarCompartir("¡Compartido! ✓"))
        // Cancelar el menú de compartir no es un fallo: no se dice nada y no se copia
        // nada a la espalda de nadie.
        .catch(() => {});
      return;
    }
    const texto = titulo ? `${titulo}\n${url}` : url;
    navigator.clipboard.writeText(texto).then(() => {
      avisarCompartir(nombre ? `¡Link de "${nombre}" copiado! ✓` : "¡Link copiado! ✓");
    }).catch(() => {
      // Sin permiso de portapapeles (o sin HTTPS): se muestra el link para copiarlo a
      // mano. Aquí va la dirección sola: es lo que hay que poder seleccionar de un tirón.
      window.prompt("No se pudo copiar automáticamente. Copia el link:", url);
    });
  };

  // ─── ALQUILERES ↔ RECOGIDAS ─────────────────────────────────────────────────
  // Activar un alquiler crea su recogida (el día antes) y su devolución (el día
  // después); desactivarlo la quita. Solo se toca la entrada marcada con `auto`: las
  // recogidas escritas a mano no se rozan nunca. Y si ya se marcó como recogida o
  // devuelta, no se borra aunque se apague el interruptor — el material está de por
  // medio y hay que devolverlo igual.
  // "yaEscritaAMano" es un patrón para reconocer una recogida que ya escribió alguien
  // para lo mismo. Sin esto, la de las sillas salía DUPLICADA en los eventos donde ya
  // había una a mano ("Recoger sillas Dealde"): la automática no la reconocía como
  // suya y creaba otra al lado, con otra fecha. Dos avisos para una sola cosa.
  const sincronizaAlquiler = (clave, activo, concepto, yaEscritaAMano = null) => {
    setRecogidas(prev => {
      const i = prev.findIndex(r => r.auto === clave);
      if (activo && i === -1 && yaEscritaAMano
          && prev.some(r => !r.auto && yaEscritaAMano.test(String(r.concepto || "")))) {
        return prev; // ya hay una escrita a mano para esto: manda la suya
      }
      if (activo) {
        // Ya existe: solo se refresca el nombre (p. ej. al cambiar de proveedor), nunca
        // las fechas, que a estas alturas pueden estar puestas a mano
        if (i !== -1) return prev.map((r, idx) => idx === i ? { ...r, concepto } : r);
        return [...prev, {
          concepto, hora: "",
          fecha: sumaDias(fechaEvento, -DIAS_ANTES_RECOGIDA),
          fechaDevolucion: sumaDias(fechaEvento, DIAS_DESPUES_DEVOLUCION),
          auto: clave, fechasAuto: true,
        }];
      }
      if (i === -1 || prev[i].recogido || prev[i].devuelto) return prev;
      return prev.filter((_, idx) => idx !== i);
    });
  };
  // Las sillas son alquiler POR DEFECTO ("Dealde"), pero su recogida solo se creaba si
  // alguien tocaba el selector con el dedo. Un evento nuevo, o uno que llega del
  // formulario de la oficina con las sillas ya puestas, se quedaba con sillas de
  // alquiler y sin recogida: nadie sabía cuándo había que ir a por ellas ni cuándo
  // devolverlas, que es justo lo que se olvida.
  const sillasVistasRef = React.useRef(null);
  useEffect(() => {
    // La fecha entra en la clave porque un evento sin fecha todavía no puede crear su
    // recogida: al ponerla, esto se vuelve a mirar y ya se crea con sus dos días.
    const clave = `${origenSillas}::${fechaEvento || ""}`;
    if (sillasVistasRef.current === clave) return;
    const primeraVez = sillasVistasRef.current === null;
    sillasVistasRef.current = clave;
    // Sin fecha de evento no hay nada que decir: una recogida sin día no responde a
    // "¿cuándo hay que ir?", que es justo para lo que existe, y sí saldría contada
    // como pendiente en el resumen. Se espera a que haya fecha.
    if (!fechaEvento) return;
    // Al ABRIR un evento ya pasado tampoco se toca nada: crear ahora su recogida sería
    // sacar un aviso rojo de algo que se hizo hace meses, y quitarla sería borrar el
    // registro de lo que ocurrió. Solo se sincroniza al cambiarlo de verdad.
    if (primeraVez && fechaEvento < hoyISO()) return;
    const esAlquiler = origenSillas === "Dealde" || origenSillas === "Carvillo";
    sincronizaAlquiler("sillas", esAlquiler, conceptoAlquiler("sillas", origenSillas), /silla/i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origenSillas, fechaEvento]);

  // El generador de las producciones viene marcado de serie (siempre se lleva uno), así
  // que su recogida se crea al elegir el tipo de evento, que es cuando entra en juego —
  // si no, el único alquiler que nadie llega a pulsar sería justo el que más se olvida.
  // Al salir de producción se retiran el generador y las carpas de alquiler, que solo
  // existen ahí.
  const handleCambiarTipoEvento = (tipo) => {
    setEvento(tipo);
    if (tipo === "produccion") {
      if (llevaGenerador) sincronizaAlquiler("generador", true, conceptoAlquiler("generador"));
      // En un rodaje no se alquila mobiliario: si venía marcado, se apaga con su recogida
      if (llevaMobiliarioAlquiler) {
        setLlevaMobiliarioAlquiler(false);
        sincronizaAlquiler("mobiliario", false);
      }
      return;
    }
    sincronizaAlquiler("generador", false);
    if (alquilaCarpas) { setAlquilaCarpas(false); sincronizaAlquiler("carpas", false); }
  };
  // Al poner o cambiar la fecha del evento se recolocan las fechas de los alquileres
  // que sigan con las propuestas por la app. Las que se hayan tocado a mano se quedan.
  const handleCambiarFechaEvento = (nuevaFecha) => {
    setFechaEvento(nuevaFecha);
    setRecogidas(prev => prev.map(r => r.auto && r.fechasAuto
      ? { ...r, fecha: sumaDias(nuevaFecha, -DIAS_ANTES_RECOGIDA), fechaDevolucion: sumaDias(nuevaFecha, DIAS_DESPUES_DEVOLUCION) }
      : r));
  };
  // Cualquier cambio a mano en las fechas de una recogida automática la desengancha de
  // la fecha del evento: a partir de ahí manda lo que haya puesto el usuario.
  const editarRecogida = (i, cambios, tocaFechas = false) =>
    setRecogidas(prev => prev.map((x, idx) => idx === i
      ? { ...x, ...cambios, ...(tocaFechas && x.fechasAuto ? { fechasAuto: false } : {}) }
      : x));

  // Tres links, cada uno para una persona distinta:
  //   "edicion" — sin marcas. Quien lo abre puede cambiarlo todo.
  //   "marcar"  — "solo=1". La checklist entera, sin poder tocar cantidades.
  //   "carga"   — "solo=1&carga=1". Además entra DIRECTO en Modo carga (Salida), que
  //               es a lo único que va quien carga el camión: marcar lo que sube y,
  //               al volver, lo que baja. Sin buscar el botón de Modo carga en la
  //               cabecera con el móvil en una mano.
  // "carga=1" va aparte de "solo=1" y no colgado de él a propósito: los links que ya
  // se mandaron llevan solo "solo=1" y tienen que seguir abriéndose como se abrían.
  const handleGenerarLink = (tipo = "edicion") => {
    const marca = tipo === "carga" ? "&solo=1&carga=1"
      : tipo === "vista" ? "&solo=1&vista=1"
      : tipo === "marcar" ? "&solo=1" : "";
    // Qué link es, para que en el WhatsApp se distinga de los otros del mismo evento.
    // Sin esto, cuatro links iguales del mismo día y a ver quién acierta.
    const queEs = tipo === "carga" ? "carga del camión"
      : tipo === "vista" ? "solo ver"
      : tipo === "marcar" ? "para marcar" : "para editar";
    // Cada clic empieza limpio: si el anterior acabó en un aviso de fallo, ese aviso no
    // puede quedarse mandando y tapar el resultado de este
    avisoPrioridadRef.current = 0;
    if (nubeActiva()) {
      // Link corto con edición compartida: la checklist vive en la nube y los
      // cambios de cualquiera con el link se sincronizan
      const id = eventoNubeId || nuevoIdEvento();
      if (!eventoNubeId) setEventoNubeId(id);
      const estado = { ...getEstadoActual(), eventoNubeId: id };
      ultimoGuardadoNubeRef.current = JSON.stringify(estado);
      // El portapapeles se escribe AQUÍ, dentro del propio clic. El navegador solo deja
      // copiar mientras dura el gesto de quien pulsa: al esperar antes a que el evento
      // subiera, la copia caía fuera del gesto y el navegador la rechazaba — se cerraba
      // el menú y no pasaba nada más. El respaldo (un prompt con el link) tampoco se ve
      // en una app instalada, así que el fallo era invisible.
      copiarLink(`${window.location.origin}${window.location.pathname}?evento=${id}${marca}`, nombreEvento, queEs);
      // Y la subida se comprueba DESPUÉS: el link está copiado, pero hasta que el evento
      // no esté en la nube ese link no abre nada al otro lado. Eso hay que decirlo antes
      // de que lo manden, que es como nacía un link muerto sin que se enterara nadie.
      //
      // Ojo con el plazo: Firestore NO rechaza la escritura cuando no hay conexión, la
      // deja pendiente hasta que el servidor la confirme. Esperando solo al fallo, sin
      // cobertura no llegaría el aviso nunca — que es el caso en el que más falta hace.
      // Por eso se avisa también si tarda demasiado.
      let resuelto = false;
      const aTiempo = setTimeout(() => {
        if (resuelto) return;
        avisarCompartir("Copiado, pero el evento aún NO ha subido ⚠", 9000, 1);
      }, ESPERA_SUBIDA_LINK);
      guardarEventoNube(id, estado)
        .then((ts) => { apuntarGuardadoPropio(ts); resuelto = true; clearTimeout(aTiempo); setErrorNube(null); })
        .catch((e) => {
          resuelto = true;
          clearTimeout(aTiempo);
          avisarFalloNube(e);
          // En el mismo sitio donde sale "¡Link copiado!", que es donde se está mirando,
          // y con prioridad para que el "✓" del portapapeles no lo tape si llega después
          avisarCompartir("Copiado, pero el evento NO ha subido ✗", 9000, 1);
        });
    } else {
      // Sin nube el link lleva la checklist dentro. Aquí el "solo marcar" también vale:
      // no se sincroniza con nadie, pero evita que quien carga cambie lo que ve.
      copiarLink(`${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(estadoActualJSON)}${marca}`, nombreEvento, queEs);
    }
    setMenuCompartir(false);
  };

  // ─── LAS CHECKLISTS DE LO QUE YA SE ACERCA ────────────────────────────────
  // El calendario sabe que el 19 hay una boda, cómo se llama, de qué tipo es, a qué hora
  // y para cuánta gente. Con eso ya se puede abrir su checklist, y el resto —menú, barra,
  // equipamiento— lo termina de rellenar el formulario de la oficina.
  //
  // Y ahí está la razón de fondo para crearlas solas: la lista de eventos que ve la
  // oficina en el formulario sale del ARCHIVO DE CHECKLISTS, no del calendario (ver
  // resumirParaOficina). Mientras la checklist no existe, esa boda no le aparece en el
  // desplegable, así que la escribe a mano y llega como un evento duplicado.
  //
  // Lo que esto NO hace, y es lo importante:
  //   · No abre nada. Lo que haya en pantalla se queda como está.
  //   · No marca ningún evento como activo ni toca el auto-guardado.
  //   · No sobrescribe una checklist que ya exista con ese nombre (checklistsPorCrear).
  // Solo mete eventos nuevos en el archivo, que es una operación que no quita nada.
  //
  // Devuelve los enlaces (qué apunte va con qué evento) para que el calendario pueda
  // marcarlos y contar lo que ha pasado.
  const crearChecklistsDeApuntes = (apuntes) => {
    const archivo = eventosGuardadosRef.current || {};
    const { nuevas, enlaces } = checklistsPorCrear(apuntes, archivo);
    if (Object.keys(nuevas).length > 0) guardarEventos({ ...archivo, ...nuevas });
    return enlaces;
  };

  const handleNuevoEvento = () => setDialogo({
    tipo: "confirm",
    titulo: "¿Empezar un evento nuevo?",
    mensaje: "Se borrará la configuración guardada de este navegador (pax, extras, items añadidos a mano...).",
    textoConfirmar: "Empezar de cero",
    peligro: true,
    onConfirm: () => {
      try { localStorage.removeItem("gula_checklist_estado"); } catch (e) { /* localStorage no disponible */ }
      marcarEventoActivo(""); // evento nuevo: no auto-guarda hasta que se guarde por primera vez
      window.location.href = window.location.origin + window.location.pathname;
    },
  });

  // ─── PLANTILLAS GUARDADAS ─────────────────────────────────────────────────
  const guardarPlantillas = (obj) => {
    setPlantillas(obj);
    try { localStorage.setItem("gula_plantillas", JSON.stringify(obj)); } catch (e) { /* localStorage lleno o no disponible */ }
  };
  const handleGuardarPlantilla = () => setDialogo({
    tipo: "prompt",
    titulo: "💾 Guardar como PLANTILLA",
    mensaje: "Guarda solo la configuración reutilizable (pax, extras, equipamiento...), SIN nombre/fecha/ubicación del evento. Útil para reutilizar en futuros eventos parecidos.",
    placeholder: 'Ej: Boda estándar 100 pax',
    textoConfirmar: "Guardar plantilla",
    onConfirm: (nombre) => {
      // La plantilla guarda la configuración reutilizable, no los datos del evento
      // concreto (nombre, fecha, hora, ubicación, equipo de logística), que cambian en cada evento
      const { nombreEvento: _n, fechaEvento: _f, horaInicio: _h, ubicacion: _u, notasEvento: _no,
              logisticaEquipo: _le, eventoNubeId: _id, ...config } = getEstadoActual();
      guardarPlantillas({ ...plantillas, [nombre]: config });
      setGuardadoPlantillaMsg(`✓ Guardada como PLANTILLA: "${nombre}"`);
      setTimeout(() => setGuardadoPlantillaMsg(""), 3500);
    },
  });
  const handleAplicarPlantilla = (nombre) => {
    if (!plantillas[nombre]) return;
    setDialogo({
      tipo: "confirm",
      titulo: `¿Cargar la plantilla "${nombre}"?`,
      mensaje: "Se sustituirá la configuración actual (nombre, fecha, hora y ubicación del evento se mantienen).",
      textoConfirmar: "Cargar plantilla",
      onConfirm: () => {
        // Se escribe el estado combinado en localStorage y se recarga: el arranque
        // síncrono (leerEstadoGuardado) lo restaura igual que tras cerrar el navegador
        try { localStorage.setItem("gula_checklist_estado", JSON.stringify({ ...getEstadoActual(), ...plantillas[nombre] })); } catch (e) { /* localStorage no disponible */ }
        window.location.href = window.location.origin + window.location.pathname;
      },
    });
  };
  // ─── EVENTOS GUARDADOS (checklist completa con nombre, fecha, logística...) ──
  // La nube es la fuente de verdad: gana la escritura más reciente por timestamp.
  // NO se "fusiona" el mapa local con el de la nube (una fusión aditiva nunca puede
  // representar un borrado: si faltaba una clave en un lado solo significa "no tocada",
  // así que un evento recién borrado localmente resucitaba en cuanto llegaba cualquier
  // snapshot -aunque fuera uno viejo, en caché, de antes del borrado- de la nube).
  const ultimaEscrituraLocalRef = React.useRef(0);
  // Última versión del archivo que hemos escrito. Se usa para calcular qué eventos
  // han cambiado y subir SOLO esos, en vez del mapa entero.
  const eventosGuardadosRef = React.useRef(eventosGuardados);
  // Mientras la primera sincronización está en marcha llegan fotos incompletas del
  // archivo: hasta que termina, no se deja que sustituyan la lista local.
  const primeraSincroHechaRef = React.useRef(false);
  // Lo mismo, pero como estado y no como ref: quien tiene que ESPERAR a que el archivo
  // esté (abrir el evento que pide "?abrir=") necesita que React vuelva a pintar cuando
  // termine, y un ref no repinta nada.
  const [archivoListo, setArchivoListo] = useState(false);
  // Nombre del evento "activo" (el que has abierto o guardado en esta sesión). Solo ese
  // se auto-guarda, para no sobrescribir un evento bueno con un borrador del mismo nombre.
  const eventoActivoRef = React.useRef((() => { try { return localStorage.getItem("gula_evento_activo") || ""; } catch (e) { return ""; } })());
  const marcarEventoActivo = (nombre) => {
    eventoActivoRef.current = nombre || "";
    try { if (nombre) localStorage.setItem("gula_evento_activo", nombre); else localStorage.removeItem("gula_evento_activo"); } catch (e) { /* localStorage no disponible */ }
  };
  // Tema: automático por horario, o fijado a mano. Tres posiciones en el mismo botón:
  //   auto   → oscuro de las 20:00 a las 7:00, claro el resto del día (y cambia solo
  //            mientras la app está abierta: montando al atardecer se pone oscuro)
  //   claro  → siempre claro
  //   oscuro → siempre oscuro
  // Lo elegido se recuerda. Quien ya tenía "claro" u "oscuro" guardado de antes lo
  // conserva; el automático es lo que viene de fábrica.
  const [preferenciaTema, setPreferenciaTema] = useState(() => leerPreferenciaTema());
  const [tema, setTema] = useState(() => temaSegunPreferencia(leerPreferenciaTema()));
  useEffect(() => {
    try { localStorage.setItem("gula_tema", preferenciaTema); } catch (e) { /* localStorage no disponible */ }
    const aplicar = () => setTema(temaSegunPreferencia(preferenciaTema));
    aplicar();
    if (preferenciaTema !== "auto") return;
    // En automático se vuelve a mirar la hora cada 5 minutos y al volver a la pestaña,
    // para que el cambio ocurra aunque la app lleve horas abierta
    const cadaRato = setInterval(aplicar, 5 * 60 * 1000);
    const alVolver = () => { if (document.visibilityState === "visible") aplicar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { clearInterval(cadaRato); document.removeEventListener("visibilitychange", alVolver); };
  }, [preferenciaTema]);
  useEffect(() => { document.documentElement.dataset.tema = tema; }, [tema]);
  // ─── LO QUE SE QUEDÓ SIN SUBIR ────────────────────────────────────────────────
  // Si falla la subida del archivo —sesión caducada, sin cobertura, el móvil en un
  // sótano— los cambios se quedaban SOLO en este dispositivo y no volvían a intentarse
  // nunca: había que acordarse de tocar algo otra vez para que se reintentara. Aquí se
  // guarda el archivo que no llegó a subir y se reintenta cuando hay ocasión.
  //
  // Solo se guarda la ÚLTIMA versión, no una cola de cambios: el archivo entero se
  // manda de una pieza, así que la última contiene todo lo anterior. Una cola sería
  // pelearse por reproducir el orden de cosas que ya vienen resueltas.
  const pendienteSubirRef = React.useRef(null);
  const subirArchivo = (anterior, obj) => {
    ultimaEscrituraLocalRef.current = Date.now();
    return sincronizarArchivoNube(anterior, obj)
      .then(() => { pendienteSubirRef.current = null; setErrorNube(null); })
      .catch((e) => {
        // El "anterior" que se guarda es el de la primera vez que falló: desde ahí es
        // desde donde hay que calcular qué mandar cuando por fin entre.
        pendienteSubirRef.current = { anterior: pendienteSubirRef.current?.anterior ?? anterior, obj };
        avisarFalloNube(e);
      });
  };

  const guardarEventos = (obj) => {
    const anterior = eventosGuardadosRef.current;
    eventosGuardadosRef.current = obj;
    setEventosGuardados(obj);
    try { localStorage.setItem("gula_eventos_guardados", JSON.stringify(obj)); } catch (e) { /* localStorage lleno o no disponible */ }
    // Con la nube activa el archivo se sincroniza evento a evento: se ve igual desde
    // cualquier dispositivo y, al no ir todo en un solo documento, no hay techo.
    if (nubeActiva() && haySesionEquipo) subirArchivo(anterior, obj);
  };

  // Reintento: al recuperar la conexión y cada minuto mientras quede algo pendiente.
  // Sin esto, quien perdió la sesión a media carga tenía que acordarse de volver a
  // tocar algo para que se subiera, y nadie se acuerda de eso descargando un camión.
  useEffect(() => {
    if (!nubeActiva() || !haySesionEquipo) return;
    const reintentar = () => {
      const p = pendienteSubirRef.current;
      if (!p || !navigator.onLine) return;
      subirArchivo(p.anterior, eventosGuardadosRef.current || p.obj);
    };
    window.addEventListener("online", reintentar);
    const cada = setInterval(reintentar, 60000);
    // Y al volver a la app desde otra pestaña o tras desbloquear el móvil, que es
    // justo cuando se ha recuperado la cobertura sin que salte el evento "online".
    const alVolver = () => { if (document.visibilityState === "visible") reintentar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("online", reintentar);
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(cada);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haySesionEquipo]);

  useEffect(() => {
    // Sin nube el archivo es el localStorage, que ya está desde el primer render: no hay
    // nada que esperar, y dejar "listo" en falso colgaría para siempre a quien espera al
    // archivo (el "?abrir=" del calendario).
    if (!nubeActiva()) { setArchivoListo(true); return; }
    let cancelado = false;
    const guardarLocal = (mapa) => {
      eventosGuardadosRef.current = mapa;
      setEventosGuardados(mapa);
      try { localStorage.setItem("gula_eventos_guardados", JSON.stringify(mapa)); } catch (e) { /* localStorage lleno o no disponible */ }
    };
    // Aplica SOLO lo que ha cambiado. Sustituir la lista entera por la foto de la
    // colección borraba de la pantalla los eventos que Firestore aún no conocía.
    const aplicarCambios = ({ cambios, actualizado }) => {
      if (!cambios || !cambios.length || cancelado) return;
      if (!primeraSincroHechaRef.current) return;
      const base = { ...(eventosGuardadosRef.current || {}) };
      let algo = false;
      cambios.forEach(c => {
        if (c.tipo === "borrado") {
          if (base[c.nombre] !== undefined) { delete base[c.nombre]; algo = true; }
          return;
        }
        if (JSON.stringify(base[c.nombre]) === JSON.stringify(c.estado)) return; // eco nuestro
        base[c.nombre] = c.estado;
        algo = true;
      });
      if (!algo) return;
      if (actualizado > ultimaEscrituraLocalRef.current) ultimaEscrituraLocalRef.current = actualizado;
      guardarLocal(base);
      guardarSincronizados(Object.keys(base));

      // Y si lo que ha cambiado es el evento que tienes ABIERTO, se aplica a la
      // pantalla, no solo a la lista. Antes esto solo pasaba con los eventos que
      // tenían link compartido, así que dos personas con el mismo evento abierto sin
      // link no se enteraban de nada: cada una editaba su copia y ganaba la última en
      // guardar, en silencio. La lista sí se actualizaba; lo que tenías delante, no.
      let previo;
      try { previo = JSON.parse(estadoActualJSONRef.current); } catch (e) { return; }
      const remoto = cambioDelEventoAbierto(cambios, eventoActivoRef.current, previo);
      if (!remoto) return;
      const listaCambios = resumirCambios(previo, remoto).filter(t => !/^Foto de cantidades/.test(t));
      if (!listaCambios.length) return; // es nuestro propio guardado de vuelta
      Object.entries(remoto).forEach(([k, v]) => {
        if (k === "nombreEvento" && !v && previo.nombreEvento) return;
        if (settersSyncRef.current[k]) settersSyncRef.current[k](v);
      });
      setHayCambiosRemotos(listaCambios);
      clearTimeout(window.__avisoSyncTimer);
      window.__avisoSyncTimer = setTimeout(() => setHayCambiosRemotos(null), 25000);
    };
    // Arranque: se FUSIONA lo que hay en la nube con lo que hay en este dispositivo, y
    // lo que solo esté aquí se sube. Antes se sustituía, así que un evento que todavía
    // no estuviera en la nube desaparecía de la lista. Fusionar lo arregla solo: en
    // cuanto se abre la app, lo que falte vuelve a aparecer y se sube.
    const sincronizar = async () => {
      try {
        const archivo = await cargarArchivoNube();
        if (cancelado) return;
        const local = eventosGuardadosRef.current || {};
        // Lo que hay AHORA MISMO como documento por evento. Es la referencia contra la
        // que se calcula qué falta por subir: si se compara contra el índice viejo, los
        // eventos que solo estaban allí se dan por subidos y nunca llegan a tener su
        // documento, así que desaparecen para los demás dispositivos.
        const enArchivo = archivo && !archivo.vacio ? archivo.mapa : {};
        // Para fusionar sí vale el índice viejo (un solo documento), que es de donde
        // venimos. No se borra: queda como copia de seguridad.
        let remoto = enArchivo;
        if (!archivo || archivo.vacio) {
          const viejo = await cargarIndiceEventosNube();
          if (cancelado) return;
          remoto = (viejo && viejo.mapa) || {};
        }
        // Un evento que está aquí pero no en la nube puede ser dos cosas muy distintas:
        //   · creado en este dispositivo y aún sin subir → hay que conservarlo y subirlo
        //   · borrado desde otro dispositivo               → hay que dejarlo ir
        // Se distinguen con la lista de los que este dispositivo ya dio por subidos: si
        // estaba en esa lista y ya no está en la nube, es que lo borraron fuera.
        // Solo se puede dar un evento por borrado fuera si la lectura de la nube ha ido
        // BIEN y ha traído algo. Si falla o viene vacía (sin conexión, sesión caducada,
        // caché fría) no se sabe nada, y ante la duda no se tira nada: se conserva todo.
        const lecturaFiable = !!archivo && !archivo.vacio;
        const yaSincronizados = lecturaFiable ? leerSincronizados() : [];
        const fusionado = { ...remoto };
        Object.keys(local).forEach(n => {
          if (remoto[n] !== undefined) return;
          if (yaSincronizados.includes(n)) return; // borrado en otro dispositivo
          fusionado[n] = local[n];
        });
        guardarLocal(fusionado);
        ultimaEscrituraLocalRef.current = Date.now();
        // Sin sesión del equipo no se sube nada del archivo: sus reglas la exigen y el
        // intento acaba siempre en un rechazo. Quien abre un link de un evento solo
        // trabaja sobre ese evento.
        if (haySesionEquipo) {
          // La lista de "ya subidos" solo se actualiza si la subida ha ido bien: marcar
          // como subido algo que falló haría que se diera por borrado la próxima vez.
          await sincronizarArchivoNube(enArchivo, fusionado);
          guardarSincronizados(Object.keys(fusionado));
        }
      } catch (e) { /* sin conexión: se sigue con lo que haya en local */ }
      finally { primeraSincroHechaRef.current = true; setArchivoListo(true); }
    };
    sincronizar();
    const unsub = suscribirArchivoNube(aplicarCambios);
    return () => { cancelado = true; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleGuardarEvento = () => setDialogo({
    tipo: "prompt",
    titulo: "💾 Guardar como EVENTO",
    mensaje: "Guarda esta checklist COMPLETA (con nombre, fecha, ubicación y logística) para volver a abrirla o compartir su link cuando quieras.",
    placeholder: "Ej: Boda Ana y Luis · 15 agosto",
    valorInicial: nombreEvento || "",
    textoConfirmar: "Guardar evento",
    onConfirm: (nombre) => {
      // Se actualiza la foto de cantidades automáticas al guardar: a partir de ahora
      // "Recalcular" comparará contra los valores de ESTE guardado, no de uno anterior
      setValoresCalculados(valoresBaseActuales);
      // El campo "Nombre del evento" se sincroniza con el nombre elegido al guardar:
      // así el siguiente "Guardar evento" ya viene precargado sin volver a escribirlo
      setNombreEvento(nombre);
      marcarEventoActivo(nombre); // a partir de ahora este evento se auto-guarda solo
      guardarEventos({ ...eventosGuardados, [nombre]: { ...getEstadoActual(), nombreEvento: nombre, valoresCalculados: valoresBaseActuales } });
      setGuardadoEventoMsg(`✓ Guardado como EVENTO: "${nombre}"`);
      setTimeout(() => setGuardadoEventoMsg(""), 3500);
    },
  });
  // Auto-guardado. Antes solo se re-guardaba solo el evento que ya habías guardado o
  // abierto: un evento nuevo vivía únicamente en ESTE navegador hasta que le dabas a
  // "Guardar evento", así que si se rompía el móvil o cambiabas de aparato, se perdía.
  // Ahora se guarda solo desde el primer momento, en cuanto tiene nombre, y con ello
  // sube a la nube como cualquier otro.
  //
  // Lo que NO se puede perder por el camino, y por eso está el guardián:
  //   · Un borrador que por casualidad se llame igual que un evento ya guardado no lo
  //     pisa JAMÁS. Se avisa y no se guarda hasta que le cambies el nombre.
  //   · Escribir el nombre a trozos ("Boda", "Boda Ana", "Boda Ana y Luis") no puede
  //     dejar tres eventos: si el activo se renombra, se MUEVE en vez de duplicarse.
  //   · El primer guardado espera 3 segundos, para no crear nada mientras se escribe.
  useEffect(() => {
    const nombre = (nombreEvento || "").trim();
    if (!nombre) { setNombreOcupado(false); return; }
    const activo = eventoActivoRef.current;
    const esElActivo = nombre === activo;
    const ocupadoPorOtro = !esElActivo && !!eventosGuardados[nombre];
    setNombreOcupado(ocupadoPorOtro);
    if (ocupadoPorOtro) return;
    const t = setTimeout(() => {
      setEventosGuardados(prev => {
        // Se vuelve a comprobar aquí dentro: entre el cambio y el guardado han pasado
        // segundos y el nombre o el evento activo pueden ser ya otros
        if (nombre !== (nombreEvento || "").trim()) return prev;
        const activoAhora = eventoActivoRef.current;
        if (nombre !== activoAhora && prev[nombre]) return prev; // se ocupó mientras tanto
        const actualizado = { ...prev };
        // Renombrar el evento activo lo mueve, no lo duplica
        if (activoAhora && activoAhora !== nombre && actualizado[activoAhora]) delete actualizado[activoAhora];
        actualizado[nombre] = { ...getEstadoActual(), nombreEvento: nombre };
        marcarEventoActivo(nombre);
        // Sin esto la referencia se queda vieja y el siguiente cálculo de "qué ha
        // cambiado" compara contra un mapa desfasado.
        eventosGuardadosRef.current = actualizado;
        try { localStorage.setItem("gula_eventos_guardados", JSON.stringify(actualizado)); } catch (e) { /* localStorage no disponible */ }
        if (nubeActiva() && haySesionEquipo) subirArchivo(prev, actualizado);
        return actualizado;
      });
    }, esElActivo ? 1200 : 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActualJSON]);
  useEffect(() => {
    let cancelado = false;
    const comprobar = async () => {
      try {
        // version.json se publica en la RAÍZ, y esta app vive en su carpeta: sin el
        // "../" se pediría /checklist/version.json, que no existe — y el aviso de
        // versión nueva dejaría de saltar sin que se notara.
        const r = await fetch(`../version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const { id } = await r.json();
        if (!cancelado && id && id !== __BUILD_ID__) setVersionNueva(true);
      } catch (e) { /* sin conexión o servida desde fichero: se ignora */ }
    };
    comprobar();
    const cadaRato = setInterval(comprobar, 10 * 60 * 1000);
    const alVolver = () => { if (document.visibilityState === "visible") comprobar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { cancelado = true; clearInterval(cadaRato); document.removeEventListener("visibilitychange", alVolver); };
  }, []);

  const handleRecalcular = () => {
    const cambios = [];
    Object.keys(valoresBaseActuales).forEach(key => {
      const nuevo = valoresBaseActuales[key];
      const [categoria, ...resto] = key.split("::");
      const label = resto.join("::");
      const aMano = overridesManuales[key];
      // Cantidad puesta a mano: es justo la que NO se actualiza sola, así que si el
      // cálculo automático ya no coincide (por ejemplo porque ha cambiado el pax) es
      // la primera que hay que ofrecer. Antes se saltaba sin decir nada y el botón
      // contestaba "nada ha cambiado" teniendo una cantidad desfasada delante.
      if (aMano !== undefined) {
        if (String(aMano) === String(nuevo)) return;
        // Si ya se revisó contra este mismo cálculo (y se decidió mantener el valor a
        // mano), no se vuelve a preguntar: solo si el automático se mueve otra vez.
        if (valoresCalculados[key] === nuevo) return;
        cambios.push({ key, categoria, label, anterior: String(aMano), nuevo, aMano: true });
        return;
      }
      const anterior = valoresCalculados[key];
      if (anterior === undefined || anterior === nuevo) return; // nunca guardado, o sin cambios
      cambios.push({ key, categoria, label, anterior, nuevo, aMano: false });
    });
    if (cambios.length === 0) {
      setRecalcularMsg("✓ Nada ha cambiado desde el último guardado");
      setTimeout(() => setRecalcularMsg(""), 3500);
      return;
    }
    setModalRecalcular(cambios);
  };
  const handleAplicarRecalculo = (decisiones) => {
    const nuevosOverrides = { ...overridesManuales };
    const nuevoSnapshot = { ...valoresCalculados };
    modalRecalcular.forEach(c => {
      if (decisiones[c.key] === "mantener") {
        nuevosOverrides[c.key] = c.anterior;
        // En la foto se apunta el cálculo automático que se ha revisado, no el valor
        // que se mantiene: así no se vuelve a preguntar por lo ya decidido, pero sí
        // si el automático cambia otra vez más adelante.
        nuevoSnapshot[c.key] = c.nuevo;
      } else {
        // Con "usar el nuevo" hay que QUITAR la edición manual: si se deja puesta, la
        // cantidad se queda clavada en la de antes y el recalculo no se nota.
        if (c.aMano) delete nuevosOverrides[c.key];
        nuevoSnapshot[c.key] = c.nuevo;
      }
    });
    setOverridesManuales(nuevosOverrides);
    setValoresCalculados(nuevoSnapshot);
    setModalRecalcular(null);
  };
  // ── El formulario de oficina ──────────────────────────────────────────────
  // El código se lee una vez al abrir; con él ya se puede mirar el buzón.
  useEffect(() => {
    if (!nubeActiva()) return;
    let vivo = true;
    leerConfigFormulario().then(({ codigo, avisos }) => {
      if (!vivo || !codigo) return;
      setCodigoFormulario(codigo);
      if (avisos && avisos.length) setAvisosWhatsapp(avisos);
      refrescarEnviosRef.current(codigo);
    }).catch(() => { /* sin conexión: ya se verá al abrir la bandeja */ });
    return () => { vivo = false; };
  }, []);
  // Y a partir de ahí se escucha en vivo: un envío nuevo, o uno que la oficina
  // corrige porque han cambiado los pax, aparece solo sin recargar ni abrir nada.
  useEffect(() => {
    if (!codigoFormulario || !nubeActiva()) return;
    return suscribirEnvios((lista) => {
      // Lo que llega DESPUÉS de la primera foto es novedad: un envío nuevo o uno que
      // han cambiado. Eso se dice en voz alta, porque un cambio no sube el contador
      // de pendientes y pasaría desapercibido justo cuando más importa.
      setEnvios(prev => {
        const antes = new Map(prev.map(e => [e.id, e]));
        if (primeraFotoEnviosRef.current) { primeraFotoEnviosRef.current = false; return lista; }
        const nuevos = lista.filter(e => !antes.has(e.id));
        const cambiados = lista.filter(e => {
          const a = antes.get(e.id);
          return a && (a.enviado?.seconds || 0) !== (e.enviado?.seconds || 0);
        });
        const frases = [
          ...nuevos.map(e => `Nuevo: ${nombreDelEnvio(e)}`),
          // De un cambio interesa QUÉ han cambiado, no que haya cambiado algo: la
          // versión de antes está aquí en memoria, así que se puede decir.
          ...cambiados.map(e => {
            const dif = cambiosEntreRespuestas((antes.get(e.id) || {}).respuestas || {}, e.respuestas || {});
            const detalle = dif.slice(0, 2).map(c => `${c.pregunta.replace(/^¿|\?$/g, "")}: ${c.antes} → ${c.ahora}`).join("; ");
            return `Cambiado ${nombreDelEnvio(e)}${detalle ? ` — ${detalle}` : ""}${dif.length > 2 ? ` (+${dif.length - 2})` : ""}`;
          }),
        ];
        if (frases.length) setAvisoEnvios({ frases, envios: [...nuevos, ...cambiados] });
        return lista;
      });
    });
  }, [codigoFormulario]);
  // La lista corta que ve la oficina se republica cuando cambian los eventos. Va con
  // retardo para no escribir en la nube en cada tecleo mientras se edita un nombre.
  useEffect(() => {
    if (!codigoFormulario || !nubeActiva()) return;
    const t = setTimeout(() => {
      publicarProximos(codigoFormulario, eventosGuardadosRef.current, avisosWhatsapp).catch(() => { /* se reintenta al siguiente cambio */ });
    }, 2000);
    return () => clearTimeout(t);
  }, [codigoFormulario, eventosGuardados, avisosWhatsapp]);
  // Pendiente = lo que aún no se ha revisado. El aviso y el contador cuentan eso, no
  // el buzón entero: lo ya revisado se guarda para consultarlo, no para dar la lata.
  const enviosPendientes = repartirEnvios(envios).pendientes;
  // El enlace que se le pasa a la oficina apunta a la carpeta del formulario, que es
  // una app aparte y hermana de esta (por eso se instala sola, sin arrastrar la
  // checklist). Los enlaces viejos —los que apuntan a la raíz con ?enviar=— siguen
  // valiendo: la raíz los desvía aquí (ver public/index.html).
  const enlaceFormulario = codigoFormulario
    ? `${new URL("../formulario/", window.location.href).href}?enviar=${codigoFormulario}`
    : "";
  const refrescarEnvios = async (codigo = codigoFormulario) => {
    if (!codigo || !nubeActiva()) return;
    setCargandoEnvios(true);
    try { setEnvios(await leerEnvios()); }
    catch (e) { /* sin conexión: se queda con lo que ya tenía */ }
    finally { setCargandoEnvios(false); }
  };
  // El efecto de arranque necesita esta función, pero no puede depender de ella sin
  // volver a ejecutarse en cada render: se le pasa por un ref siempre fresco.
  const refrescarEnviosRef = React.useRef(refrescarEnvios);
  refrescarEnviosRef.current = refrescarEnvios;
  const handleCrearCodigoFormulario = async () => {
    const codigo = nuevoCodigo();
    try {
      await guardarConfigFormulario({ codigo, avisos: avisosWhatsapp });
      await publicarProximos(codigo, eventosGuardadosRef.current, avisosWhatsapp);
      setCodigoFormulario(codigo);
      refrescarEnvios(codigo);
    } catch (e) { avisarFalloNube(e); }
  };
  const handleCambiarCodigoFormulario = () => setDialogo({
    tipo: "confirm",
    titulo: "¿Cambiar el enlace del formulario?",
    mensaje: "El que ya tenga la oficina dejará de funcionar al momento y habrá que pasarles el nuevo. Lo que ya han mandado no se pierde.",
    textoConfirmar: "Cambiar el enlace",
    onConfirm: async () => {
      const viejo = codigoFormulario;
      await handleCrearCodigoFormulario();
      if (viejo) borrarProximos(viejo).catch(() => { /* si no se puede borrar, el nuevo manda igual */ });
    },
  });
  // En el móvil, el compartir del sistema: se manda por WhatsApp sin pegar nada a mano
  const handleCompartirEnlaceFormulario = () => {
    if (!navigator.share) return handleCopiarEnlaceFormulario();
    navigator.share({
      title: "Formulario de Gula",
      text: "Con este enlace nos pas\u00e1is los datos del evento. Se puede guardar en la pantalla de inicio.",
      url: enlaceFormulario,
    }).catch(() => { /* si lo cancelan, no pasa nada */ });
  };
  // Guarda a quién se avisa, en los dos sitios: la config del equipo (para verlo al
  // abrir la app en otro móvil) y la lista que lee el formulario, que es quien pinta
  // el botón de avisar al terminar de mandar.
  const handleGuardarAvisos = (lista) => {
    setAvisosWhatsapp(lista);
    if (!codigoFormulario || !nubeActiva()) return;
    guardarConfigFormulario({ codigo: codigoFormulario, avisos: lista }).catch(avisarFalloNube);
    publicarProximos(codigoFormulario, eventosGuardadosRef.current, lista).catch(() => { /* se reintenta al siguiente cambio */ });
  };
  const handleCopiarEnlaceFormulario = () => {
    navigator.clipboard.writeText(enlaceFormulario).then(() => {
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2500);
    }).catch(() => {
      window.prompt("No se pudo copiar automáticamente. Copia el enlace:", enlaceFormulario);
    });
  };
  const handleDescartarEnvio = (envio) => setDialogo({
    tipo: "confirm",
    titulo: "¿Descartar este envío?",
    mensaje: "Sale de la bandeja sin aplicar nada, pero se queda guardado en \"ya revisados\" por si hay que consultarlo luego.",
    textoConfirmar: "Descartar",
    onConfirm: async () => {
      try { await marcarRevisado(envio.id, { aplicado: false }); } catch (e) { avisarFalloNube(e); }
      refrescarEnvios();
    },
  });
  // Este sí borra de verdad, y solo se ofrece sobre los que ya se han revisado
  const handleBorrarEnvio = (envio) => setDialogo({
    tipo: "confirm",
    titulo: "\u00bfBorrar este env\u00edo del todo?",
    mensaje: "Se borra lo que mand\u00f3 la oficina y deja de poder consultarse. El evento no se toca.",
    textoConfirmar: "Borrar",
    peligro: true,
    onConfirm: async () => {
      try { await borrarEnvio(envio.id); } catch (e) { avisarFalloNube(e); }
      setEnvios(prev => prev.filter(x => x.id !== envio.id));
    },
  });
  // Aplicar = abrir el evento con lo contestado ya puesto. No se escribe nada por
  // detrás en un evento que no estás mirando: lo que llega de fuera se revisa.
  const handleAplicarEnvio = (envio) => {
    const cambios = aRespuestasDeLaApp(envio.respuestas || {});
    const destino = envio.eventoDestino || cambios.nombreEvento || "";
    const guardados = eventosGuardadosRef.current || {};
    const existe = !!(destino && guardados[destino]);
    const nombre = destino || "Evento del formulario";
    setDialogo({
      tipo: "confirm",
      titulo: existe ? `¿Aplicar al evento "${nombre}"?` : `¿Crear el evento "${nombre}"?`,
      mensaje: existe
        ? "Se abre el evento con los datos del formulario puestos encima de lo que ya tenía. Lo que la oficina no contestó se queda como está."
        : "Se crea el evento con lo que ha contestado la oficina; el resto se queda con los valores de siempre para que lo revises.",
      textoConfirmar: existe ? "Aplicar y abrir" : "Crear y abrir",
      onConfirm: async () => {
        const base = existe ? guardados[destino] : {};
        // Y aquí deja de estar "sin configurar": esto es exactamente lo que le faltaba.
        // El aviso existe para que nadie cargue un camión con los valores de fábrica;
        // una vez llegan los datos de la oficina, seguir avisando sería ruido.
        const estado = { ...base, ...cambios, nombreEvento: nombre, sinConfigurar: false };
        // Las notas se SUMAN, no se sustituyen: las del evento suelen ser tuyas (a quién
        // llamar, qué recoger) y las del formulario vienen del cliente. Perder unas por
        // las otras es justo lo que no puede pasar.
        const notasAntes = (base.notasEvento || "").trim();
        const notasNuevas = (cambios.notasEvento || "").trim();
        if (notasAntes && notasNuevas && !notasAntes.includes(notasNuevas)) {
          estado.notasEvento = `${notasAntes}\n${notasNuevas}`;
        } else if (notasAntes && !notasNuevas) {
          estado.notasEvento = base.notasEvento;
        }
        // Los alquileres que trae el envío tienen que traer su recogida y su devolución:
        // si no, la app cargaría el material y nadie iría a buscarlo.
        estado.recogidas = recogidasConAlquileres(estado);
        // Y las flores y las minutas, que no son material nuestro sino un sitio y un
        // día al que hay que ir. Se suman sin duplicar: si ya estaba escrita a mano,
        // manda la que ya había (puede tener la fecha ajustada o estar marcada).
        recogidasDelEnvio(envio.respuestas || {}).forEach(r => {
          if (estado.recogidas.some(x => (x.concepto || "").trim().toLowerCase() === r.concepto.toLowerCase())) return;
          estado.recogidas = [...estado.recogidas, r];
        });
        // Y lo que hay que comprar, a Compras: también se suma sin duplicar, que lo
        // que ya estuviera apuntado puede estar marcado como comprado.
        const comprasAntes = Array.isArray(estado.compras) ? estado.compras : [];
        estado.compras = comprasAntes.slice();
        comprasDelEnvio(envio.respuestas || {}).forEach(c => {
          if (estado.compras.some(x => (x.concepto || "").trim().toLowerCase() === c.concepto.toLowerCase())) return;
          estado.compras = [...estado.compras, c];
        });
        const siguiente = { ...guardados, [nombre]: estado };
        guardarEventos(siguiente);
        // No se borra: queda guardado como revisado, con a qué evento fue a parar
        try { await marcarRevisado(envio.id, { aplicado: true, eventoDestino: nombre }); }
        catch (e) { /* si falla, seguirá en la bandeja y se vuelve a intentar */ }
        try { localStorage.setItem("gula_checklist_estado", JSON.stringify(estado)); }
        catch (e) { /* localStorage no disponible */ }
        marcarEventoActivo(nombre);
        window.location.href = window.location.origin + window.location.pathname;
      },
    });
  };
  const handleCargarEvento = (nombre) => {
    if (!eventosGuardados[nombre]) return;
    setDialogo({
      tipo: "confirm",
      titulo: `¿Abrir el evento "${nombre}"?`,
      mensaje: "Se sustituirá todo lo que hay ahora en pantalla por la checklist guardada.",
      textoConfirmar: "Abrir evento",
      onConfirm: () => {
        // Si el evento se guardó con el campo "Nombre del evento" vacío (se puso el
        // nombre solo en el diálogo de guardar), al abrirlo se usa el nombre con el
        // que está archivado — así el próximo guardado ya viene con nombre puesto
        const estado = { ...eventosGuardados[nombre], nombreEvento: eventosGuardados[nombre].nombreEvento || nombre };
        // El doc compartido de la nube también se actualiza con el nombre: si no, su
        // snapshot (con nombre vacío) volvería a dejar el campo en blanco tras abrir
        if (nubeActiva() && estado.eventoNubeId && !eventosGuardados[nombre].nombreEvento) {
          guardarEventoNube(estado.eventoNubeId, estado).catch(avisarFalloNube);
        }
        try { localStorage.setItem("gula_checklist_estado", JSON.stringify(estado)); } catch (e) { /* localStorage no disponible */ }
        marcarEventoActivo(estado.nombreEvento || nombre); // al abrirlo, este pasa a auto-guardarse
        window.location.href = window.location.origin + window.location.pathname;
      },
    });
  };
  // El calendario (que es otra app, en otra carpeta) manda aquí con "?abrir=<nombre>".
  // Se espera a que el archivo esté cargado: los eventos guardados vienen de la nube y
  // al primer render todavía no están, así que mirar antes de tiempo daba siempre "no
  // existe". Se dispara UNA vez —handleCargarEvento recarga la página sin el
  // parámetro— y si el nombre no aparece se dice, en vez de dejar la pantalla como si
  // no se hubiera pulsado nada.
  // Y esto mismo AL ABRIR LA APP, sin tener que entrar en el calendario.
  //
  // Antes solo pasaba al abrir la pantalla del calendario. Si nadie la abría en una
  // semana, la boda no entraba en el archivo, y por tanto no le salía a la oficina en
  // el desplegable del formulario: la escribía a mano y llegaba duplicada. Que la
  // cadena dependa de que alguien entre en una pantalla concreta es justo lo que no
  // puede ser.
  //
  // LA GUARDIA IMPORTANTE es esperar a archivoListo. Mientras el archivo está bajando
  // de la nube, "Boda X" todavía no consta como guardada; sin esperar, se crearía una
  // encima y al sincronizar SUSTITUIRÍA la de verdad, con sus checks y sus items a mano
  // dentro. Es el único fallo de todo esto que no tendría vuelta atrás.
  // ─── LOS PRECIOS, LOS MISMOS PARA TODOS ───────────────────────────────────
  // El coste estimado del Modo carga sale de un catálogo de precios por unidad. Lo que
  // se corrige a mano vivía SOLO en el navegador de quien lo corregía: dos personas
  // mirando el mismo evento veían costes distintos y ninguna sabía cuál era el bueno.
  //
  // leerPrecios() es SÍNCRONA porque se dibuja con ella, así que la nube no puede
  // sustituirla: el navegador hace de copia local y esto la refresca por detrás.
  //
  // "preciosAlDia" es solo una marca de tiempo para que el panel de precios, si está
  // abierto, se entere de que han cambiado y vuelva a leerlos. No lleva los precios
  // dentro a propósito: quien los quiera, que llame a leerPrecios().
  const [preciosAlDia, setPreciosAlDia] = useState(0);
  useEffect(() => {
    if (!nubeActiva() || !haySesionEquipo) return;
    const aplicar = (remotos) => {
      if (!remotos) return;
      fusionarPreciosNube(remotos);
      setPreciosAlDia(Date.now());
    };
    cargarPreciosNube().then(aplicar).catch(() => { /* sin conexión: se usan los de aquí */ });
    return suscribirPreciosNube(aplicar);
  }, [haySesionEquipo]);

  // ─── CUÁNTO SE BEBE EN CADA TIPO DE EVENTO ──────────────────────────────────
  // Mismo trato que los precios y por lo mismo: si cada móvil tuviera el suyo, dos
  // personas mirando la misma comunión cargarían camiones distintos. ponFactores los
  // deja puestos para TODA la app —el generador de la checklist los lee de ahí— y el
  // estado de aquí solo existe para que el panel se vuelva a dibujar.
  // ─── EL CEREBRO DEL ASISTENTE ───────────────────────────────────────────────
  // Lo que ha aprendido del equipo. Va a la nube y no a este navegador por lo mismo que
  // los precios: lo que se aprende en una boda tiene que servir en la siguiente, la mire
  // quien la mire. Si cada móvil recordara sus cosas, el asistente sabría algo distinto
  // según quién preguntara, que es peor que no recordar nada.
  const [memoria, setMemoria] = useState([]);
  const memoriaRef = React.useRef([]);
  React.useEffect(() => { memoriaRef.current = memoria; }, [memoria]);
  // Lo que le importa al equipo. Va a la nube por lo mismo que la memoria: un objetivo
  // que solo ve quien lo escribió no es un objetivo del equipo.
  const [objetivos, setObjetivos] = useState([]);
  const objetivosRef = React.useRef([]);
  React.useEffect(() => { objetivosRef.current = objetivos; }, [objetivos]);
  // Lo que hay que hacer. También del equipo: una tarea que solo ve quien la apuntó no
  // está apuntada.
  const [tareas, setTareas] = useState([]);
  const tareasRef = React.useRef([]);
  React.useEffect(() => { tareasRef.current = tareas; }, [tareas]);
  // Los apuntes del calendario, guardados de la carga que YA se hace al arrancar para
  // crear las checklists que se acercan. No cuesta una petición más: es la misma.
  const [apuntesCalendario, setApuntesCalendario] = useState([]);
  const [factoresBebida, setFactoresBebida] = useState(() => leerFactores());
  useEffect(() => {
    if (!nubeActiva() || !haySesionEquipo) return;
    let vivo = true;
    const aplicar = (remotos) => { if (vivo && remotos) setFactoresBebida(ponFactores(remotos)); };
    cargarBebidaNube().then(aplicar).catch(() => { /* sin conexión: todos a 1 */ });
    const corta = suscribirBebidaNube(aplicar);
    return () => { vivo = false; corta(); };
  }, [haySesionEquipo]);

  useEffect(() => {
    if (!nubeActiva() || !haySesionEquipo) return;
    let vivo = true;
    const aplicar = (remota) => { if (vivo && remota) setMemoria(saneaMemoria(remota)); };
    cargarMemoriaNube().then(aplicar).catch(() => { /* sin conexión: sin memoria, no pasa nada */ });
    const corta = suscribirMemoriaNube(aplicar);
    return () => { vivo = false; corta(); };
  }, [haySesionEquipo]);

  // Una sola puerta para guardar: así el estado y la nube nunca se separan, y el
  // asistente puede llamar a esto sin saber que existe Firestore.
  const guardarMemoria = React.useCallback((siguiente) => {
    const limpia = saneaMemoria(siguiente);
    setMemoria(limpia);
    memoriaRef.current = limpia;
    if (nubeActiva() && haySesionEquipo) {
      guardarMemoriaNube(limpia).catch(() => { /* sin conexión: queda aquí y sube al siguiente cambio */ });
    }
  }, [haySesionEquipo]);

  const handleRecordar = React.useCallback((texto, tema) => {
    // Se parte de la referencia y no del estado: dentro de una misma respuesta el
    // asistente puede aprender dos cosas seguidas, y con el estado la segunda pisaría
    // a la primera.
    const r = recordar(memoriaRef.current, texto, { tema });
    guardarMemoria(r.memoria);
    return r;
  }, [guardarMemoria]);

  const handleOlvidar = React.useCallback((id) => {
    guardarMemoria(olvidar(memoriaRef.current, id).memoria);
  }, [guardarMemoria]);

  // Los recuerdos que de verdad han viajado en una respuesta suben. No se sube a la nube
  // en cada pregunta —serían escrituras constantes por un contador— sino solo aquí, en
  // el estado, y viaja con el siguiente cambio de verdad.
  const handleUsoMemoria = React.useCallback((ids) => {
    const reforzada = refuerza(memoriaRef.current, ids);
    setMemoria(reforzada);
    memoriaRef.current = reforzada;
  }, []);

  useEffect(() => {
    if (!nubeActiva() || !haySesionEquipo) return;
    let vivo = true;
    const aplicar = (r) => { if (vivo && r) setObjetivos(saneaObjetivos(r)); };
    cargarObjetivosNube().then(aplicar).catch(() => { /* sin conexión: sin objetivos */ });
    const corta = suscribirObjetivosNube(aplicar);
    return () => { vivo = false; corta(); };
  }, [haySesionEquipo]);

  const guardarObjetivos = React.useCallback((siguiente) => {
    const limpios = saneaObjetivos(siguiente);
    setObjetivos(limpios);
    objetivosRef.current = limpios;
    if (nubeActiva() && haySesionEquipo) {
      guardarObjetivosNube(limpios).catch(() => { /* sin conexión: sube al siguiente cambio */ });
    }
  }, [haySesionEquipo]);

  useEffect(() => {
    if (!nubeActiva() || !haySesionEquipo) return;
    let vivo = true;
    const aplicar = (r) => { if (vivo && r) setTareas(saneaTareas(r)); };
    cargarTareasNube().then(aplicar).catch(() => { /* sin conexión: sin tareas */ });
    const corta = suscribirTareasNube(aplicar);
    return () => { vivo = false; corta(); };
  }, [haySesionEquipo]);

  const guardarTareas = React.useCallback((siguiente) => {
    // Se limpian las hechas de eventos que ya pasaron al guardar, no en una tarea
    // aparte: una lista que solo crece deja de mirarse, y entonces da igual qué tenga.
    const limpias = limpiarViejas(siguiente, eventosGuardadosRef.current || {});
    setTareas(limpias);
    tareasRef.current = limpias;
    if (nubeActiva() && haySesionEquipo) {
      guardarTareasNube(limpias).catch(() => { /* sin conexión: sube al siguiente cambio */ });
    }
  }, [haySesionEquipo]);

  const handleCambiarBebida = (siguiente) => {
    setFactoresBebida(ponFactores(siguiente));
    if (nubeActiva() && haySesionEquipo) {
      guardarBebidaNube(factoresCambiados(siguiente))
        .catch(() => { /* sin conexión: queda aquí y sube al siguiente cambio */ });
    }
  };

  // Lo que dice el histórico: de cada evento con la vuelta apuntada sale cuánto se bebió
  // de verdad. Se recalcula solo cuando cambia el archivo o los factores, que es caro
  // —reconstruye la checklist de cada evento guardado— y no cambia por escribir un pax.
  const bebidaMedida = useMemo(
    () => calibracionBebida(eventosGuardados, factoresBebida),
    [eventosGuardados, factoresBebida],
  );

  // Guardar un precio lo deja en este navegador Y lo sube. Se suben SOLO los cambiados,
  // no el catálogo entero: si no, el día que se corrija un precio de partida en una
  // versión nueva, la copia subida lo taparía para todo el equipo.
  const handleGuardarPrecios = (precios) => {
    guardarPrecios(precios);
    if (nubeActiva() && haySesionEquipo) {
      guardarPreciosNube(soloLosCambiados(precios))
        .catch(() => { /* sin conexión: queda en este navegador y sube al siguiente cambio */ });
    }
  };

  const promocionHechaRef = React.useRef(false);
  useEffect(() => {
    if (!nubeActiva() || !haySesionEquipo || !archivoListo || promocionHechaRef.current) return;
    promocionHechaRef.current = true;
    let vivo = true;
    (async () => {
      try {
        const cs = await resolverCalendario();
        if (!cs || !vivo) return;
        const cal = await cargarCalendarioNube(cs.codigo);
        if (!cal || !vivo) return;
        const apuntes = saneaLista(cal.apuntes);
        setApuntesCalendario(apuntes);
        const enlaces = crearChecklistsDeApuntes(apuntes);
        if (!enlaces.length || !vivo) return;
        const creadas = enlaces.filter(e => e.nueva).map(e => e.nombre);
        if (creadas.length) setChecklistsCreadas(creadas);
        // Los apuntes se marcan de una vez, no uno a uno: si no, las escrituras parten
        // todas de la misma foto y solo la última sobrevive.
        const porId = new Map(enlaces.map(e => [e.id, e.nombre]));
        await guardarCalendarioNube(
          cs.codigo,
          apuntes.map(a => (porId.has(a.id) ? { ...a, evento: porId.get(a.id) } : a)),
          saneaEquipo(cal.equipo),
          cal.ver || cs.ver,
        );
      } catch (e) { /* sin conexión o sin permisos: se reintenta al siguiente arranque */ }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haySesionEquipo, archivoListo]);

  const pidioAbrir = React.useRef(false);
  // El tope de espera. Se arma solo si la dirección pide abrir algo, para no dejar un
  // temporizador suelto en cada arranque normal de la app.
  const [esperaAbrirVencida, setEsperaAbrirVencida] = useState(false);
  useEffect(() => {
    if (!eventoQuePideElEnlace()) return;
    const t = setTimeout(() => setEsperaAbrirVencida(true), ESPERA_ARCHIVO_ABRIR);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const quiere = eventoQuePideElEnlace();
    if (!quiere || pidioAbrir.current) return;
    if (!archivoListo && !esperaAbrirVencida) return;
    pidioAbrir.current = true;
    if (eventosGuardados[quiere]) { handleCargarEvento(quiere); return; }
    // No existe: se dice. El Dialogo siempre lleva confirmación, así que se usa como
    // aviso con un "Entendido" que no hace nada — antes que dejar la pantalla igual y
    // que parezca que el botón del calendario está roto.
    setDialogo({
      tipo: "confirm",
      titulo: "No encuentro ese evento",
      mensaje: `El calendario pedía abrir "${quiere}", pero no está entre los eventos guardados. Puede que se haya borrado, o que todavía no se haya guardado desde el móvil donde se creó.`,
      textoConfirmar: "Entendido",
      onConfirm: () => {},
    });
  }, [archivoListo, esperaAbrirVencida, eventosGuardados]); // eslint-disable-line react-hooks/exhaustive-deps

  // Copia el link público del evento guardado: quien lo abra ve la checklist
  // en la web (GitHub Pages) sin necesitar nada instalado. Con la nube activa
  // el link es corto y con edición compartida.
  const handleLinkEvento = (nombre) => {
    const guardado = eventosGuardados[nombre];
    if (!guardado) return;
    if (nubeActiva()) {
      const id = guardado.eventoNubeId || nuevoIdEvento();
      const estado = { ...guardado, eventoNubeId: id };
      guardarEventoNube(id, estado).catch(avisarFalloNube);
      if (!guardado.eventoNubeId) guardarEventos({ ...eventosGuardados, [nombre]: estado });
      copiarLink(`${window.location.origin}${window.location.pathname}?evento=${id}`, nombre, "para editar");
    } else {
      copiarLink(`${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(JSON.stringify(guardado))}`, nombre, "para editar");
    }
  };
  const handleBorrarEvento = (nombre) => {
    // Si el evento tiene copia en la nube (la que leen los links "?evento="), se borra
    // con él. Antes se quedaba ahí para siempre: cada evento compartido alguna vez
    // dejaba su documento aunque el evento ya no existiera en ningún sitio. Nadie los
    // referencia, nadie los ve y nadie los podía borrar — solo ocupaban.
    const idNube = eventosGuardados[nombre]?.eventoNubeId;
    return setDialogo({
      tipo: "confirm",
      titulo: `¿Borrar el evento guardado "${nombre}"?`,
      // Se dice la verdad de lo que va a pasar con los links, que no es lo mismo según
      // el tipo: el "?evento=" lee de la nube y dejará de abrir; el viejo "?c=" lleva la
      // checklist dentro y sigue funcionando pase lo que pase.
      mensaje: idNube
        ? "Se borrará también su copia en la nube, así que el link que hayas compartido de ESTE evento dejará de abrir. Los links antiguos que llevan la checklist dentro siguen funcionando."
        : "Los links que ya hayas compartido seguirán funcionando (llevan la checklist dentro).",
      textoConfirmar: "Borrar",
      peligro: true,
      onConfirm: () => {
        const next = { ...eventosGuardados };
        delete next[nombre];
        guardarEventos(next);
        // Si falla no se avisa: el evento ya está borrado de donde importa y volver
        // atrás por esto sería peor. Queda un documento suelto, como hasta ahora.
        if (idNube && nubeActiva()) borrarEventoNube(idNube).catch(() => {});
      },
    });
  };

  // Duplica un evento guardado: copia toda su configuración con otro nombre, pero como
  // evento independiente y "en limpio" (sin los checks de carga/vuelta/roturas ni el link).
  const handleDuplicarEvento = (nombre) => setDialogo({
    tipo: "prompt",
    titulo: "Duplicar evento",
    mensaje: `Crea una copia de "${nombre}" con la misma configuración pero limpia (sin los checks de Modo carga).`,
    placeholder: `${nombre} (copia)`,
    valorInicial: `${nombre} (copia)`,
    textoConfirmar: "Duplicar",
    onConfirm: (nuevo) => {
      const base = eventosGuardados[nombre];
      const nom = (nuevo || "").trim();
      if (!base || !nom) return;
      const copia = { ...base, nombreEvento: nom, eventoNubeId: null, preparados: {}, checkeados: {}, vueltos: {}, roturas: {}, marcasRevisar: {}, cronos: {} };
      guardarEventos({ ...eventosGuardados, [nom]: copia });
      setGuardadoEventoMsg(`✓ Duplicado como "${nom}"`);
      setTimeout(() => setGuardadoEventoMsg(""), 3000);
    },
  });
  // Fila de un evento guardado (se reutiliza en la lista de pendientes y en la de pasados)
  const filaEvento = (n) => (
    <div className="plantilla-row" key={n}>
      <button className="plantilla-nombre" onClick={() => handleCargarEvento(n)} title={`Abrir el evento "${n}"`}>
        <CalendarDays size={15} /> {n}
        {avisosRecogidas.some(a => a.evento === n) && (
          <span className="plantilla-aviso-badge" title="Tiene recogidas/devoluciones pendientes"><Clock size={12} /> {avisosRecogidas.filter(a => a.evento === n).length}</span>
        )}
        {/* Cuáles vienen del calendario y siguen sin datos, sin tener que abrirlos uno a
            uno. En una semana con cuatro bodas es la diferencia entre saber qué falta y
            enterarte la víspera. */}
        {eventosGuardados[n]?.sinConfigurar && (
          <span className="plantilla-sin-configurar" title="Creado desde el calendario: falta configurarlo">sin configurar</span>
        )}
      </button>
      <button className="plantilla-link" onClick={() => handleDuplicarEvento(n)} title="Duplicar evento" aria-label={`Duplicar evento ${n}`}><Copy size={15} /></button>
      <button className="plantilla-link" onClick={() => handleLinkEvento(n)} title="Copiar link para compartir" aria-label={`Copiar link del evento ${n}`}><Link2 size={15} /></button>
      <button className="plantilla-borrar" onClick={() => handleBorrarEvento(n)} aria-label={`Borrar evento guardado ${n}`} title="Borrar evento guardado"><X size={15} /></button>
    </div>
  );

  const handleBorrarPlantilla = (nombre) => setDialogo({
    tipo: "confirm",
    titulo: `¿Borrar la plantilla "${nombre}"?`,
    textoConfirmar: "Borrar",
    peligro: true,
    onConfirm: () => {
      const next = { ...plantillas };
      delete next[nombre];
      guardarPlantillas(next);
    },
  });

  // opts se reconstruía en cada render, así que el useMemo de baseChecklist nunca
  // acertaba y la checklist entera (14 categorías, ~140 items) se recalculaba con
  // CADA tecla que se pulsara en cualquier campo. Memorizado por su contenido, solo
  // se rehace cuando de verdad cambia algo que afecta a las cantidades.
  const opts = useMemo(() => ({
    dobleServicio, tamanoBarril, numBarriles, llevaPaella, mesVerano, tieneBrindisCava,
    fuerzaTextilTela, colorManteles, porcentajeBeige, tieneFrituras, numFrituras, llevaChillOut, numChillOut, tipoBandejas, tipoBBQ: tipoBBQ.toLowerCase(),
    tipoHorno: tipoHorno.toLowerCase(), llevaEntrante, soloBandeja, llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas, llevaPlatos, llevaPlatosPostre, llevaCubiertos, numCamareros, numStaff,
    llevaPalomitera, llevaJarrasCristal, tipoCafetera, llevaCarpas, llevaGenerador,
    llevaMobiliarioAlquiler,
    extraBandejasMadera, extraBandejasPlata, llevaJamonero, llevaTarta,
    personasPorPlatoEntrante, llevaAguasPequenas, tipoAguaPequena, hayDesayuno,
    entranteCompartido, numEntrantesCompartir,
    tipoNevera, tipoCongelador, tipoPaella, numPaellas, origenSillas, tipoMesa,
    estiloPlatoPrincipal, estiloPlatoPostre, diasProduccion,
    paxPorCamarero,
    // Las notas entran en el cálculo por una sola cosa: de ahí salen las alergias, y de
    // las alergias cuántos menús hay que hacer aparte (ver menus-especiales.js).
    notasEvento,
    numLogisticaEquipo: logisticaEquipo.filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length,
  }), [
    notasEvento,
    dobleServicio, tamanoBarril, numBarriles, llevaPaella, mesVerano, tieneBrindisCava,
    fuerzaTextilTela, colorManteles, porcentajeBeige, tieneFrituras, numFrituras, llevaChillOut, numChillOut, tipoBandejas, tipoBBQ,
    tipoHorno, llevaEntrante, soloBandeja, llevaArmarioCaliente, llevaPlanchaGas, numPlanchasGas, llevaPlatos,
    llevaPlatosPostre, llevaCubiertos, numCamareros, numStaff, llevaPalomitera, llevaJarrasCristal,
    llevaCarpas, llevaGenerador, llevaMobiliarioAlquiler,
    tipoCafetera, extraBandejasMadera, extraBandejasPlata, llevaJamonero, llevaTarta, personasPorPlatoEntrante,
    llevaAguasPequenas, tipoAguaPequena, hayDesayuno, entranteCompartido, numEntrantesCompartir, tipoNevera,
    tipoCongelador, tipoPaella, numPaellas, origenSillas, estiloPlatoPrincipal, estiloPlatoPostre, tipoMesa,
    diasProduccion, paxPorCamarero, logisticaEquipo,
  ]);

  // Checklist calculada (sin los items manuales) — sirve también para listar las categorías reales
  // disponibles a la hora de elegir dónde encajar un item añadido a mano.
  const baseChecklist = useMemo(() =>
    buildChecklist(evento, pax, barraCoctel ? horasCoctel : 0, barraCopas ? horasCopas : 0, ninos, opts),
    [evento, pax, barraCoctel, horasCoctel, barraCopas, horasCopas, ninos, opts]
  );
  // Cantidad automática "de verdad" de cada item calculado ahora mismo, ignorando
  // cualquier edición manual — es lo que compara "Recalcular" contra la foto guardada
  // (valoresCalculados) para detectar cambios de fórmula desde el último guardado.
  const valoresBaseActuales = useMemo(() => {
    const mapa = {};
    baseChecklist.forEach(cat => {
      const nombreCat = categoriasRenombradas[cat.nombre] ?? cat.nombre;
      cat.items.forEach(([label, qty]) => {
        if (qty === null) return; // item "opcional" no activo ahora mismo: nada que comparar
        const esObjetoConSufijo = qty && typeof qty === "object";
        mapa[`${nombreCat}::${label}`] = String(esObjetoConSufijo ? qty.u : qty);
      });
    });
    return mapa;
  }, [baseChecklist, categoriasRenombradas]);
  const categoriasDisponibles = useMemo(() => {
    const base = baseChecklist.map(c => categoriasRenombradas[c.nombre] ?? c.nombre);
    // Las categorías creadas por el usuario (vía items añadidos) también están disponibles
    const propias = [...new Set(itemsManuales.map(it => it.categoria))]
      .filter(c => c && c !== CATEGORIA_MANUAL && !base.includes(c));
    return [...base, ...propias];
  }, [baseChecklist, categoriasRenombradas, itemsManuales]);

  const checklist = useMemo(() => {
    // Las categorías renombradas por el usuario se aplican sobre el nombre base:
    // el nuevo nombre pasa a ser la identidad (las claves de ajustes se migran al renombrar)
    const cats = baseChecklist.map(c => ({ ...c, nombre: categoriasRenombradas[c.nombre] ?? c.nombre, items: [...c.items] }));
    // El 3er elemento de la tupla (índice real en itemsManuales) permite borrar el item
    // correcto luego, aunque el buscador esté filtrando la lista visible.
    // Si la categoría del item no existe se crea (así el usuario puede crear categorías nuevas).
    itemsManuales.forEach((it, idx) => {
      let destino = cats.find(c => c.nombre === it.categoria);
      if (!destino) { destino = { nombre: it.categoria || CATEGORIA_MANUAL, items: [] }; cats.push(destino); }
      destino.items.push([it.label, it.cantidad, idx]);
    });
    // Aplica los ajustes manuales (clave: categoría + etiqueta ORIGINAL del item):
    // quita los items ocultos, aplica cantidades editadas y nombres corregidos.
    // La tupla resultante es [nombreMostrado, cantidad, idxManual, labelOriginal, esAlquilerManual] —
    // el label original se conserva como identidad estable del item aunque se renombre.
    cats.forEach(cat => {
      cat.items = cat.items
        .filter(([label]) => !itemsOcultos[`${cat.nombre}::${label}`])
        // Los items "opcionales" (ver opt() en los builders) SIEMPRE ocupan su sitio en
        // el array, con cantidad null si su condición no se cumple ahora mismo — así el
        // orden nunca depende de qué esté activo. Se ocultan aquí salvo que haya una
        // edición manual fijada, en cuyo caso se mantienen EN SU MISMA POSICIÓN natural
        // en vez de "resucitar" al final de la categoría como pasaba antes.
        .filter(([label, qty]) => qty !== null || overridesManuales[`${cat.nombre}::${label}`] !== undefined)
        .map(([label, qty, extra]) => {
          // El tercer dato de la tupla significa dos cosas según de dónde venga el item:
          // el índice dentro de itemsManuales si se añadió a mano (un número), o la marca
          // de alquiler si lo genera la app (true/false). Se leía siempre como índice, así
          // que "Sillas (alquiler Dealde)" y "Armario caliente" pasaban por items manuales:
          // su ✕ no los quitaba (buscaba el índice `true` en la lista de manuales, que no
          // existe) y al renombrarlos se perdía el nombre nuevo.
          const idx = typeof extra === "number" ? extra : undefined;
          const esAlquilerFijo = extra === true;
          const key = `${cat.nombre}::${label}`;
          // qty puede venir como { u, sufijo } (conSufijo): se separa el número editable
          // del texto fijo del envase, que se conserva aparte aunque se edite el número
          const esObjetoConSufijo = qty && typeof qty === "object";
          const valorBase = esObjetoConSufijo ? qty.u : qty;
          const sufijo = esObjetoConSufijo ? qty.sufijo : undefined;
          const cantidad = overridesManuales[key] !== undefined ? overridesManuales[key] : valorBase;
          return [nombresManuales[key] ?? label, cantidad, idx, label, esAlquilerFijo || !!itemsAlquilerManual[key], sufijo];
        });
    });
    // Si se ocultan todos los items de una categoría, la categoría desaparece también
    const visibles = cats.filter(c => c.items.length > 0);
    // Orden propio: las categorías que se hayan movido a mano mandan (en su orden), y
    // detrás van las demás como las genera la app. Así se puede dejar la lista en el
    // mismo orden en que se carga la furgoneta sin tocar los generadores.
    if (!ordenCategorias.length) return visibles;
    const pos = new Map(ordenCategorias.map((n, i) => [n, i]));
    return visibles
      .map((c, i) => ({ c, i }))
      .sort((a, b) => {
        const pa = pos.has(a.c.nombre) ? pos.get(a.c.nombre) : Infinity;
        const pb = pos.has(b.c.nombre) ? pos.get(b.c.nombre) : Infinity;
        return pa !== pb ? pa - pb : a.i - b.i;
      })
      .map(x => x.c);
  }, [baseChecklist, itemsManuales, overridesManuales, itemsOcultos, nombresManuales, categoriasRenombradas, itemsAlquilerManual, ordenCategorias]);

  // Estimación de tiempos para sugerir la hora de fin de logística desde la de inicio.
  // Usa el nº recomendado de logística (1 cada 60 pax) para que la sugerencia sea estable.
  // Gente que va a montar: la del equipo de logística si se ha metido, y si no, la
  // recomendada (1 cada 60 pax). Antes esto usaba SIEMPRE la recomendada, así que
  // añadir gente al equipo no cambiaba el tiempo estimado ni la hora de fin sugerida.
  const logisticaParaTiempos = useMemo(() => {
    const n = logisticaEquipo.filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length;
    return n > 0 ? n : Math.max(1, Math.ceil(pax / 60));
  }, [logisticaEquipo, pax]);
  // Ajuste aprendido de los eventos ya cronometrados. Se recalcula solo cuando cambia
  // el archivo de eventos, no en cada render.
  const calibracion = useMemo(() => calcularCalibracion(eventosGuardados), [eventosGuardados]);
  // Horas de la jornada más larga del equipo: la recogida lleva recargo por fatiga.
  const horasJornadaEquipo = useMemo(
    () => logisticaEquipo.reduce((mx, p) => { const h = horasLogistica(p.inicio, p.fin); return h && h > mx ? h : mx; }, 0),
    [logisticaEquipo]);
  // Mismos datos que Modo carga (pax TOTAL con niños y fatiga de jornada): antes la
  // cabecera ignoraba las dos cosas y daba un total distinto al del modal.
  const tiemposCargaForm = useMemo(() => {
    // Se cuenta exactamente lo que se carga: sin items sin cantidad y sin "Personal",
    // igual que hace Modo carga. Antes la cabecera contaba de más y daba otro total.
    const totalItemsCarga = quitarItemsSinCantidad(checklist)
      .filter(c => !/personal/i.test(c.nombre))
      .reduce((a, c) => a + c.items.length, 0);
    return estimarTiemposCarga({ totalItems: totalItemsCarga, pax: pax + ninos, numLogistica: logisticaParaTiempos, horasJornada: horasJornadaEquipo }, calibracion);
  }, [checklist, pax, ninos, logisticaParaTiempos, horasJornadaEquipo, calibracion]);

  // Foto del estado editable a mano, para poder deshacer cualquier cambio manual
  // Los manejadores de cada fila viajan por esta referencia. Su identidad NUNCA cambia,
  // así que React.memo puede saltarse las filas que no han cambiado; y su contenido se
  // refresca en cada render, así que las funciones siempre son las de ahora.
  const accionesFilaRef = React.useRef({});
  accionesFilaRef.current = {
    editarCantidad: (categoria, labelOriginal, valor) => handleEditarCantidad(categoria, labelOriginal, valor),
    ocultar: (categoria, labelOriginal) => handleOcultarItem(categoria, labelOriginal),
    quitarManual: (idx) => handleRemoveItemManual(idx),
    empezarEdicion: (keyId, label, esAlquiler) => {
      setEditandoNombre(keyId); setNombreTemporal(label); setAlquilerTemporal(esAlquiler);
    },
    confirmarEdicion: (categoria, labelOriginal, manualIdx, label, esAlquilerNuevo) =>
      handleConfirmarEdicionItem(categoria, labelOriginal, manualIdx, label, nombreTemporal, esAlquilerNuevo),
    setNombreTemporal,
    setAlquilerTemporal,
  };

  const snapshotHistorial = () => ({ overridesManuales, itemsManuales, itemsOcultos, nombresManuales, categoriasRenombradas, ordenCategorias, itemsAlquilerManual });
  const pushHistorial = () => setHistorial(prev => [...prev.slice(-19), snapshotHistorial()]);

  const handleEditarCantidad = (categoria, labelOriginal, valor) => {
    const key = `${categoria}::${labelOriginal}`;
    // Snapshot al empezar a editar este item (no por cada tecla): así "Deshacer"
    // recupera la cantidad que había antes de tocar el item, de una vez
    if (ultimaClaveEditadaRef.current !== key) {
      ultimaClaveEditadaRef.current = key;
      pushHistorial();
    }
    setOverridesManuales(prev => {
      const next = { ...prev };
      if (valor.trim() === "") delete next[key];
      else next[key] = valor;
      return next;
    });
    // Si la cantidad cambia, lo ya marcado en "Modo carga" deja de ser fiable: lo que
    // preparaste eran 20 y ahora pone 30. ANTES esto DESMARCABA el item, y eso borraba
    // trabajo hecho — alguien había ido al almacén, lo había contado y lo había
    // marcado, y con cambiar una cifra desde otro sitio se perdía. La marca se queda y
    // el item se señala para revisar: se ve de un vistazo cuál hay que volver a contar
    // sin haber perdido nada por el camino.
    // Las roturas no se tocan: son un hecho ya ocurrido, no dependen de la cantidad.
    setMarcasRevisar(prev => {
      if (!preparados[key] && !checkeados[key] && vueltos[key] === undefined) return prev;
      return { ...prev, [key]: true };
    });
  };
  // Tocar la casilla es haberlo revisado: se le quita el aviso de "la cantidad cambió"
  const revisado = (key) => setMarcasRevisar(prev => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });
  const handleTogglePreparado = (key) => { revisado(key); setPreparados(prev => ({ ...prev, [key]: !prev[key] })); };
  // Si algo sale en el camión es porque estaba preparado: marcarlo en Salida lo da
  // por preparado también. Antes las dos listas podían contradecirse —"cargado" pero
  // "sin preparar"— y quien miraba la de preparación volvía a buscar por el almacén
  // algo que ya iba dentro del camión.
  // Al revés NO: desmarcar la salida (se baja algo del camión) no deshace el trabajo
  // de haberlo preparado, que sigue hecho.
  const handleToggleCheckCarga = (key) => {
    revisado(key);
    const marcando = !checkeados[key];
    if (marcando) setPreparados(prev => (prev[key] ? prev : { ...prev, [key]: true }));
    setCheckeados(prev => ({ ...prev, [key]: marcando }));
  };
  const handleToggleNotaCarga = (texto) => setNotasCheck(prev => ({ ...prev, [texto]: !prev[texto] }));
  // Cronómetro de carga/descarga: arrancar acumula desde ahora, pausar suma el tramo
  // corrido al acumulado, reiniciar lo pone a cero. Se guarda/sincroniza con el evento.
  const handleCronoStart = (fase) => setCronos(prev => {
    const c = prev[fase] || { ms: 0, running: false, since: null };
    if (c.running) return prev;
    return { ...prev, [fase]: { ms: c.ms || 0, running: true, since: Date.now() } };
  });
  const handleCronoPause = (fase) => setCronos(prev => {
    const c = prev[fase];
    if (!c || !c.running) return prev;
    const add = c.since ? Date.now() - c.since : 0;
    return { ...prev, [fase]: { ms: (c.ms || 0) + add, running: false, since: null } };
  });
  const handleCronoReset = (fase) => setCronos(prev => ({ ...prev, [fase]: { ms: 0, running: false, since: null } }));
  // A diferencia de roturas, "0" en vuelve es un dato real (confirmado: no ha vuelto
  // nada), distinto de "todavía no se ha revisado" (sin entrada) — solo se borra la
  // clave si se deja el campo vacío del todo.
  const handleVuelveCarga = (key, valor) => setVueltos(prev => {
    const next = { ...prev };
    if (valor === "") delete next[key];
    else next[key] = valor;
    return next;
  });
  const handleRoturasCarga = (key, valor) => setRoturas(prev => {
    const next = { ...prev };
    if (!valor || valor === "0") delete next[key];
    else next[key] = valor;
    return next;
  });

  // Quita de la lista un item calculado (los manuales se borran de itemsManuales)
  // Items quitados con la ✕, agrupados por categoría. Antes solo se podían recuperar con
  // "Deshacer", que vive en memoria: al recargar, ese item se había ido para siempre en
  // ese evento. Con esto cada categoría enseña cuántos tiene quitados y deja recuperarlos.
  const ocultosPorCategoria = useMemo(() => {
    const m = {};
    Object.keys(itemsOcultos).forEach(k => {
      if (!itemsOcultos[k]) return;
      const cat = k.split("::")[0];
      (m[cat] ||= []).push(k.slice(cat.length + 2));
    });
    return m;
  }, [itemsOcultos]);
  const handleRecuperarOcultos = (categoria) => {
    pushHistorial();
    setItemsOcultos(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(`${categoria}::`)) delete next[k]; });
      return next;
    });
  };

  const handleOcultarItem = (categoria, labelOriginal) => {
    ultimaClaveEditadaRef.current = null;
    pushHistorial();
    setItemsOcultos(prev => ({ ...prev, [`${categoria}::${labelOriginal}`]: true }));
  };

  // Corrige el nombre de un item en el sitio. En los calculados se guarda como
  // "nombre corregido" sobre el label original (que sigue siendo la identidad del
  // item, así la cantidad se sigue recalculando sola); en los manuales se edita
  // el item directamente.
  // Confirma la edición de un item: nombre (si cambió) y el tag de alquiler proveedor,
  // ambos desde el mismo modo de edición (✎) — no hay un botón aparte por fila.
  const handleConfirmarEdicionItem = (categoria, labelOriginal, manualIdx, labelMostrado, nuevo, esAlquilerNuevo) => {
    setEditandoNombre(null);
    const nuevoLabel = nuevo.trim() || labelMostrado;
    const cambiaNombre = nuevoLabel !== labelMostrado;
    const key = `${categoria}::${labelOriginal}`;
    const cambiaAlquiler = esAlquilerNuevo !== !!itemsAlquilerManual[key];
    if (!cambiaNombre && !cambiaAlquiler) return;
    ultimaClaveEditadaRef.current = null;
    pushHistorial();
    let keyFinal = key;
    if (cambiaNombre) {
      if (manualIdx !== undefined) {
        setItemsManuales(prev => prev.map((it, i) => i === manualIdx ? { ...it, label: nuevoLabel } : it));
        // La cantidad editada a mano de un item manual va ligada a su nombre: se migra la clave
        const newKey = `${categoria}::${nuevoLabel}`;
        // Todo lo que va ligado al NOMBRE de un item hay que moverlo al nombre nuevo: la
        // cantidad editada a mano y lo marcado en Modo carga. Al renombrar se quedaba
        // huérfano —el item seguía en la lista pero sin su check—, así que lo preparado,
        // lo cargado, lo vuelto y las roturas desaparecían sin avisar.
        //
        // Una sola función para los seis: estaba escrita dos veces seguidas, la primera
        // a mano para overridesManuales y la segunda ya extraída para los demás. Dos
        // sitios donde acordarse del mismo arreglo.
        const migrar = (setter) => setter(prev => {
          if (prev[key] === undefined) return prev;
          const next = { ...prev };
          next[newKey] = next[key];
          delete next[key];
          return next;
        });
        [setOverridesManuales, setPreparados, setCheckeados, setVueltos, setRoturas, setMarcasRevisar].forEach(migrar);
        keyFinal = newKey;
      } else {
        setNombresManuales(prev => ({ ...prev, [key]: nuevoLabel }));
      }
    }
    if (cambiaAlquiler) {
      setItemsAlquilerManual(prev => {
        const next = { ...prev };
        if (esAlquilerNuevo) next[keyFinal] = true; else delete next[keyFinal];
        return next;
      });
    }
  };

  const handleDeshacer = () => {
    if (historial.length === 0) return;
    const ultimo = historial[historial.length - 1];
    setOverridesManuales(ultimo.overridesManuales);
    setItemsManuales(ultimo.itemsManuales);
    setItemsOcultos(ultimo.itemsOcultos);
    setNombresManuales(ultimo.nombresManuales);
    setOrdenCategorias(ultimo.ordenCategorias ?? []);
    setCategoriasRenombradas(ultimo.categoriasRenombradas);
    setItemsAlquilerManual(ultimo.itemsAlquilerManual);
    setHistorial(prev => prev.slice(0, -1));
    ultimaClaveEditadaRef.current = null;
  };

  // Renombra una categoría (botón ✎ de la cabecera). El nuevo nombre pasa a ser la
  // identidad: se migran las claves de todos los ajustes manuales de esa categoría
  // y los items añadidos a mano se mueven con ella.
  // Mueve una categoría una posición arriba o abajo. El orden se guarda con el
  // evento, así que cada tipo de evento puede tener el suyo (el de la furgoneta).
  const handleMoverCategoria = (nombre, direccion) => {
    const actual = checklist.map(c => c.nombre);
    const i = actual.indexOf(nombre);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= actual.length) return;
    pushHistorial();
    const siguiente = [...actual];
    [siguiente[i], siguiente[j]] = [siguiente[j], siguiente[i]];
    setOrdenCategorias(siguiente);
  };
  const handleRenombrarCategoria = (nombreActual) => setDialogo({
    tipo: "prompt",
    titulo: "Renombrar categoría",
    valorInicial: nombreActual,
    textoConfirmar: "Renombrar",
    onConfirm: (nuevoNombre) => aplicarRenombreCategoria(nombreActual, nuevoNombre),
  });
  const aplicarRenombreCategoria = (nombreActual, nuevoNombre) => {
    if (!nuevoNombre || nuevoNombre === nombreActual) return;
    ultimaClaveEditadaRef.current = null;
    pushHistorial();
    // Si es una categoría base (o una base ya renombrada) el renombre se guarda
    // sobre el nombre ORIGINAL del generador, para sobrevivir a los recálculos
    const original = Object.keys(categoriasRenombradas).find(k => categoriasRenombradas[k] === nombreActual)
      ?? (baseChecklist.some(c => c.nombre === nombreActual) ? nombreActual : null);
    if (original) setCategoriasRenombradas(prev => ({ ...prev, [original]: nuevoNombre }));
    setItemsManuales(prev => prev.map(it => it.categoria === nombreActual ? { ...it, categoria: nuevoNombre } : it));
    const migraClaves = (obj) => {
      const next = {};
      Object.entries(obj).forEach(([k, v]) => {
        next[k.startsWith(`${nombreActual}::`) ? `${nuevoNombre}::${k.slice(nombreActual.length + 2)}` : k] = v;
      });
      return next;
    };
    setOverridesManuales(migraClaves);
    setItemsOcultos(migraClaves);
    setNombresManuales(migraClaves);
    setItemsAlquilerManual(migraClaves);
  };

  const handleLabelItemManual = (value) => {
    setNuevoItemLabel(value);
    if (!categoriaTocada) setNuevoItemCategoria(sugerirCategoria(value, categoriasDisponibles) || CATEGORIA_MANUAL);
  };
  // Normaliza para comparar nombres ignorando mayúsculas, acentos y espacios de sobra
  const normalizarNombreItem = (s) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const insertarItemManual = () => {
    const label = nuevoItemLabel.trim();
    const categoria = nuevoItemCategoria || sugerirCategoria(label, categoriasDisponibles) || CATEGORIA_MANUAL;
    setItemsManuales(prev => [...prev, { label, cantidad: nuevoItemCantidad.trim() || "1", categoria }]);
    if (nuevoItemAlquiler) setItemsAlquilerManual(prev => ({ ...prev, [`${categoria}::${label}`]: true }));
    setNuevoItemLabel(""); setNuevoItemCantidad(""); setNuevoItemCategoria(""); setCategoriaTocada(false); setNuevoItemAlquiler(false);
  };
  const handleAddItemManual = () => {
    const label = nuevoItemLabel.trim();
    if (!label) return;
    const objetivo = normalizarNombreItem(label);
    const yaExiste = checklist.some(cat => cat.items.some(([nombre]) => normalizarNombreItem(nombre) === objetivo));
    if (yaExiste) {
      setDialogo({
        tipo: "confirm",
        titulo: "Ese item ya existe",
        mensaje: `Ya hay un item llamado "${label}" en la checklist. ¿Quieres añadirlo igualmente como uno nuevo (quedará duplicado)?`,
        textoConfirmar: "Añadir igualmente",
        onConfirm: insertarItemManual,
      });
      return;
    }
    insertarItemManual();
  };
  const handleRemoveItemManual = (idx) => {
    ultimaClaveEditadaRef.current = null;
    pushHistorial();
    setItemsManuales(prev => prev.filter((_, i) => i !== idx));
  };

  // El campo de búsqueda responde al instante, pero recorrer y volver a pintar las
  // ~140 filas se hace con prioridad baja: así escribir no se atasca en el móvil.
  const filtroDiferido = useDeferredValue(filtro);
  const filtered = useMemo(() => {
    if (!filtroDiferido.trim()) return checklist;
    const q = filtroDiferido.toLowerCase();
    return checklist.map(c => ({ ...c, items: c.items.filter(i => i[0].toLowerCase().includes(q)) })).filter(c => c.items.length > 0);
  }, [checklist, filtroDiferido]);

  const totalConceptos = checklist.reduce((acc, c) => acc + c.items.length, 0);
  // Datos del resumen de cabecera: lo cargado hasta ahora y lo que queda por recoger
  // o comprar en ESTE evento (los avisos globales incluyen los de otros eventos).
  const itemsCargados = useMemo(() => Object.values(checkeados).filter(Boolean).length, [checkeados]);
  const itemsPreparados = useMemo(() => Object.values(preparados).filter(Boolean).length, [preparados]);
  const pendientesEvento = useMemo(() =>
    (recogidas || []).filter(r => r.concepto && (!r.recogido || (r.fechaDevolucion && !r.devuelto))).length
    + (compras || []).filter(c => c.concepto && !c.comprado).length,
  [recogidas, compras]);
  const fmtMinutos = (m) => {
    if (!m || m <= 0) return "—";
    const h = Math.floor(m / 60), min = Math.round(m % 60);
    return h > 0 ? (min > 0 ? `${h} h ${min} min` : `${h} h`) : `${min} min`;
  };
  const toggleCategory = (catName) => setOpenCategories(prev => ({ ...prev, [catName]: prev[catName] !== false ? false : true }));

  // Añade en bloque los items confirmados en ModalAgregarItems (ya filtrados de duplicados)
  const handleAgregarItems = (nuevos) => {
    if (nuevos.length === 0) return;
    setItemsManuales(prev => [...prev, ...nuevos.map(n => ({ label: n.label, cantidad: n.qty, categoria: n.categoria }))]);
    setAgregadosTag(`✓ ${nuevos.length} item${nuevos.length === 1 ? "" : "s"} añadido${nuevos.length === 1 ? "" : "s"}`);
    setTimeout(() => setAgregadosTag(""), 3000);
  };

  // ─── COPIA DE SEGURIDAD DEL ARCHIVO COMPLETO ────────────────────────────────
  // Un fichero con TODOS los eventos guardados, que no depende de la nube ni de nada.
  // Si algún día falla la sincronización o se pierde el acceso, con esto se recupera
  // todo. Se puede volver a cargar en cualquier dispositivo desde el mismo sitio.
  const handleExportarCopia = () => {
    const copia = {
      formato: "gula-checklist-copia",
      version: 1,
      exportado: new Date().toISOString(),
      eventos: eventosGuardados,
      plantillas,
      precios: leerPrecios(),
    };
    const blob = new Blob([JSON.stringify(copia, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Gula_copia_${new Date().toISOString().slice(0, 10)}_${Object.keys(eventosGuardados).length}eventos.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setGuardadoEventoMsg(`✓ Copia descargada con ${Object.keys(eventosGuardados).length} eventos`);
    setTimeout(() => setGuardadoEventoMsg(""), 4000);
  };
  // Al restaurar NO se borra nada: se suman los que falten y se preguntan los que ya
  // existen, para que cargar una copia vieja no pise trabajo más nuevo.
  const handleImportarCopia = (fichero) => {
    if (!fichero) return;
    const lector = new FileReader();
    lector.onload = () => {
      let datos;
      try { datos = JSON.parse(String(lector.result)); }
      catch (e) { setGuardadoEventoMsg("✕ Ese fichero no es una copia válida"); setTimeout(() => setGuardadoEventoMsg(""), 4000); return; }
      if (!datos || datos.formato !== "gula-checklist-copia" || !datos.eventos) {
        setGuardadoEventoMsg("✕ Ese fichero no es una copia de Gula");
        setTimeout(() => setGuardadoEventoMsg(""), 4000);
        return;
      }
      const nuevos = Object.keys(datos.eventos).filter(n => eventosGuardados[n] === undefined);
      const repetidos = Object.keys(datos.eventos).filter(n => eventosGuardados[n] !== undefined);
      setDialogo({
        tipo: "confirm",
        titulo: "Restaurar copia de seguridad",
        mensaje: `La copia tiene ${Object.keys(datos.eventos).length} eventos: ${nuevos.length} que no están aquí y ${repetidos.length} que ya existen. Se añaden los que faltan y NO se toca ninguno de los que ya tienes.`,
        textoConfirmar: `Añadir ${nuevos.length} eventos`,
        onConfirm: () => {
          const combinado = { ...eventosGuardados };
          nuevos.forEach(n => { combinado[n] = datos.eventos[n]; });
          guardarEventos(combinado);
          if (datos.plantillas) guardarPlantillas({ ...datos.plantillas, ...plantillas });
          setGuardadoEventoMsg(`✓ Restaurados ${nuevos.length} eventos de la copia`);
          setTimeout(() => setGuardadoEventoMsg(""), 5000);
        },
      });
    };
    lector.readAsText(fichero);
  };

  const handleDescargar = () => {
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist, { nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, compras, diasProduccion, preparados, checkeados, vueltos, roturas });
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Checklist_${EVENTOS[evento]?.label?.replace(/ /g, "_")}_${pax}pax.doc`;
    a.click();
  };

  const getTextoChecklist = () => {
    const texto = checklist.map(cat => `\n▶ ${cat.nombre.toUpperCase()}\n` + cat.items.map(([l, q, , , , sufijo]) => `  • ${l}: ${fmtCantidadCompleta(l, q.u ? q.u : q, sufijo)}`).join("\n")).join("\n");
    const cabecera = [
      nombreEvento ? nombreEvento.toUpperCase() : `CHECKLIST ${EVENTOS[evento]?.label?.toUpperCase()}`,
      `${pax} pax`,
      fechaEvento ? new Date(fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null,
      horaInicio ? `${horaInicio}h` : null,
      ubicacion || null,
      fmtLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)
        ? `Logística: ${fmtLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)}${totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta) > 0 ? ` — Total ${String(totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)).replace(".", ",")}€` : ""}`
        : null,
      fmtRecogidas(recogidas) ? `Recogidas: ${fmtRecogidas(recogidas)}` : null,
      fmtCompras(compras) ? `Compras: ${fmtCompras(compras)}` : null,
    ].filter(Boolean).join(" · ");
    const notas = notasEvento ? `\n\n📝 NOTAS: ${notasEvento}` : "";
    // El enlace del sitio va al final y en su línea: quien recibe esto por WhatsApp lo
    // que quiere el día del montaje es tocar y que se abra el mapa, no copiar el nombre
    // de la finca y buscarlo a mano.
    const mapa = ubicacion.trim() ? `\n\n📍 Cómo llegar: ${enlaceMapa(ubicacion)}` : "";
    return `${cabecera}\n${texto}${notas}${mapa}`;
  };

  const handleCompartirWord = () => {
    handleDescargar();
    setMenuCompartir(false);
  };

  const handleCompartirPDF = () => {
    const html = generarHTMLWord(evento, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklist, { nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, compras, diasProduccion, preparados, checkeados, vueltos, roturas });
    const ventana = window.open("", "_blank");
    if (!ventana) {
      window.alert("El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes para esta página y vuelve a intentarlo.");
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
    ventana.onload = () => ventana.print();
    setMenuCompartir(false);
  };

  const handleCompartirWhatsapp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(getTextoChecklist())}`;
    window.open(url, "_blank");
    setMenuCompartir(false);
  };

  const handleCompartirTexto = () => {
    navigator.clipboard.writeText(getTextoChecklist()).then(() => {
      setCompartirMsg("¡Copiado! ✓");
      setTimeout(() => setCompartirMsg(""), 2500);
    }).catch(() => {
      setCompartirMsg("No se pudo copiar ✗");
      setTimeout(() => setCompartirMsg(""), 2500);
    });
    setMenuCompartir(false);
  };

  const metaHoja = { nombreEvento, fechaEvento, horaInicio, ubicacion, notasEvento, logisticaEquipo, tarifaLogistica, plusFurgoneta, recogidas, compras, diasProduccion, preparados, checkeados, vueltos, roturas };

  // Con el link de solo ver, la hoja NO es una ventana encima de la checklist: es todo
  // lo que hay. Detrás no queda nada que mirar ni que tocar, así que tampoco lleva ✕ —
  // cerrarla solo dejaría al metre delante de una lista que no es la que necesita.
  if (soloVista) {
    return (
      <ModalVistaPrevia
        checklist={checklist} evtKey={evento} pax={pax} ninos={ninos}
        meta={metaHoja} sinCerrar
      />
    );
  }

  return (
    <>
      {modalPrevia  && <ModalVistaPrevia checklist={checklist} evtKey={evento} pax={pax} ninos={ninos} meta={metaHoja} onClose={() => setModalPrevia(false)} />}
      {/* El calendario llega por import() perezoso, así que la primera vez hay un
          instante de descarga. El respaldo dice qué está pasando en vez de dejar la
          pantalla en blanco, y va con estilos EN LÍNEA: las clases del calendario viajan
          dentro del trozo que se está descargando, así que mientras carga todavía no
          existen y la pantalla saldría sin colocar. */}
      {modalCalendario && (
        <React.Suspense fallback={
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "var(--bg-main, #fff)", color: "var(--text-muted, #666)",
          }}>Abriendo el calendario…</div>
        }>
          <CalendarioEnChecklist
            onCerrar={() => setModalCalendario(false)}
            onAbrirEvento={(nombre) => { setModalCalendario(false); handleCargarEvento(nombre); }}
            onCrearChecklists={crearChecklistsDeApuntes}
          />
        </React.Suspense>
      )}
      {modoCarga && (
        <ModalModoCarga
          onGuardarPrecios={handleGuardarPrecios}
          preciosAlDia={preciosAlDia}
          factoresBebida={factoresBebida}
          calibracionBebida={bebidaMedida}
          onCambiarBebida={handleCambiarBebida}
          checklist={checklist}
          preparados={preparados}
          marcasRevisar={marcasRevisar}
          checkeados={checkeados}
          vueltos={vueltos}
          roturas={roturas}
          onTogglePreparado={handleTogglePreparado}
          onToggleSale={handleToggleCheckCarga}
          onVuelve={handleVuelveCarga}
          onRoturas={handleRoturasCarga}
          notasCheck={notasCheck}
          onToggleNota={handleToggleNotaCarga}
          cronos={cronos}
          onCronoStart={handleCronoStart}
          onCronoPause={handleCronoPause}
          onCronoReset={handleCronoReset}
          meta={{
            nombreEvento,
            totalPax: pax + ninos,
            notasEvento,
            numLogistica: logisticaParaTiempos,
            calibracion,
            logisticaReal: logisticaEquipo.filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length,
            horasJornada: horasJornadaEquipo,
            // Para la escaleta: la hora de inicio manda y las horas de barra sitúan el
            // resto del día. Las de barra van ya "efectivas" (0 si la barra no está
            // marcada), igual que en el cálculo de la checklist.
            horaInicio,
            horasCoctel: barraCoctel ? horasCoctel : 0,
            horasCopas: barraCopas ? horasCopas : 0,
            logisticaEquipo,
          }}
          onClose={() => setModoCarga(false)}
          // Con el link de logística, Modo carga es la app entera: no hay ✕ ni fondo
          // que tocar para salir. Cerrarlo dejaría a quien está cargando el camión
          // delante de una checklist que no puede tocar y sin forma clara de volver.
          sinCerrar={soloCarga}
        />
      )}
      {modalFormulario && (
        <ModalFormularioOficina
          codigo={codigoFormulario}
          enlace={enlaceFormulario}
          envios={envios}
          cargando={cargandoEnvios}
          copiado={enlaceCopiado}
          onCrear={handleCrearCodigoFormulario}
          onCambiar={handleCambiarCodigoFormulario}
          onCopiar={handleCopiarEnlaceFormulario}
          onCompartir={handleCompartirEnlaceFormulario}
          avisos={avisosWhatsapp}
          onCambiarAvisos={handleGuardarAvisos}
          onAplicar={handleAplicarEnvio}
          onDescartar={handleDescartarEnvio}
          onBorrar={handleBorrarEnvio}
          onClose={() => setModalFormulario(false)}
        />
      )}
      {modalAgregar && <ModalAgregarItems checklist={checklist} categoriasDisponibles={categoriasDisponibles} onClose={() => setModalAgregar(false)} onConfirm={handleAgregarItems} />}
      {dialogo && <Dialogo config={dialogo} onCerrar={() => setDialogo(null)} />}
      {modalRecalcular && <ModalRecalcular cambios={modalRecalcular} onClose={() => setModalRecalcular(null)} onAplicar={handleAplicarRecalculo} />}

      <div className="app-wrapper">
        <div className={`guardado-indicador ${guardadoFlash ? "is-visible" : ""}`} aria-live="polite"><Check size={14} /> Guardado</div>
        {errorNube && (
          <div className="error-nube" role="alert">
            <AlertTriangle size={15} />
            <span>{errorNube}</span>
            <button onClick={() => setErrorNube(null)} aria-label="Ocultar aviso" title="Ocultar"><X size={14} /></button>
          </div>
        )}
        {/* BARRA FINA (solo móvil, al bajar de la cabecera) */}
        <div className={`barra-fija ${barraFija ? "is-visible" : ""}`}>
          <span className="barra-fija-nombre" title={nombreEvento || EVENTOS[evento]?.label}>
            {nombreEvento || EVENTOS[evento]?.label}
          </span>
          <input
            type="text"
            className="barra-fija-buscar"
            placeholder="Buscar..."
            aria-label="Buscar un material"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          {/* Con el link de solo ver no hay entrada a Modo carga: marcar es de logística */}
          {!soloVista && (
            <button className="barra-fija-carga" onClick={() => setModoCarga(true)} title="Modo carga">
              <Package size={15} /><span className="barra-fija-carga-texto">Carga</span>
            </button>
          )}
        </div>

        {/* HEADER */}
        <header className="app-header animate-entrance">
          <div className="header-title-group">
            <div className="header-icon">{React.createElement(EVENTO_ICON[evento] || Heart, { size: 24, strokeWidth: 2.2 })}</div>
            <div className="header-info">
              <h1>{nombreEvento || EVENTOS[evento]?.label || "Generador Checklist"}</h1>
              {/* El subtítulo va en trozos con clase propia porque en móvil se limita a
                  dos líneas: lo que sobraba se perdía por el final, y lo que se perdía
                  era justo el día, la hora y el sitio. El cóctel y el nº de conceptos se
                  esconden ahí (el recuento está abajo en su contador y el cóctel en la
                  configuración) para que quepa lo que hace falta saber de un vistazo. */}
              <p>
                <span className="hdr-quien">
                  {nombreEvento ? `${EVENTOS[evento]?.label} · ` : ""}{diasPaxValidos.length > 0 ? `${diasPaxValidos.join("+")} pax · ${diasPaxValidos.length} días` : `${pax} pax`}
                </span>
                <span className="hdr-detalle">
                  {evento !== "produccion" ? ` · cóctel ${barraCoctel ? horasCoctel : 0}h` : ""} · {totalConceptos} conceptos
                </span>
                <span className="hdr-cuando">
                  {fechaEvento ? ` · ${new Date(fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}` : ""}
                  {horaInicio ? ` · ${horaInicio}h` : ""}
                  {ubicacion ? ` · ${ubicacion}` : ""}
                </span>
              </p>
            </div>
            {/* El logo de Gula. Va aquí, al final del grupo del título y pegado al
                interruptor de tema, porque es el único sitio de la cabecera que no le
                quita espacio a nada: el nombre del evento y su subtítulo se quedan
                donde estaban y los botones de acción no se mueven. Es el dibujo del
                logo haciendo de máscara sobre un degradado, igual que en el formulario:
                el archivo es negro sobre transparente y en tema oscuro no se vería.
                En móvil se esconde — ahí la cabecera va justa y el subtítulo ya se
                recorta a dos líneas, así que sería quitarle sitio a lo que importa. */}
            <span
              className="app-logo"
              role="img"
              aria-label="Gula"
              style={{ WebkitMaskImage: `url(${logoGula})`, maskImage: `url(${logoGula})` }}
            />
            {/* El interruptor de tema va con el título, no en la rejilla de acciones:
                siendo un icono suelto dejaba una celda huérfana y descuadraba la fila
                de botones en el móvil. Lleva texto para que se encuentre. */}
            {(() => {
              const siguiente = { auto: "claro", claro: "oscuro", oscuro: "auto" }[preferenciaTema];
              const etiqueta = {
                auto: `Automático (ahora ${tema})`,
                claro: "Siempre claro",
                oscuro: "Siempre oscuro",
              }[preferenciaTema];
              const rotulo = { auto: "Auto", claro: "Claro", oscuro: "Oscuro" }[preferenciaTema];
              const Icono = preferenciaTema === "auto" ? Clock : (preferenciaTema === "oscuro" ? Moon : Sun);
              return (
                <button
                  className={`btn btn-tema ${preferenciaTema === "auto" ? "es-auto" : ""}`}
                  onClick={() => setPreferenciaTema(siguiente)}
                  title={`${etiqueta} · el automático pone oscuro de ${HORA_OSCURO}:00 a ${HORA_CLARO}:00. Pulsa para pasar a "${{ auto: "automático", claro: "siempre claro", oscuro: "siempre oscuro" }[siguiente]}"`}
                  aria-label={etiqueta}
                ><Icono size={15} /> {rotulo}</button>
              );
            })()}
          </div>
          <div className="header-actions">
            {!soloMarcar && (
              <button className="btn btn-ghost" onClick={handleNuevoEvento} title="Borra la configuración guardada y empieza de cero">Nuevo evento</button>
            )}
            {/* Solo con sesión del equipo: sin ella no hay token que darle al proxy. */}
            {onCerrarSesion && (
              <BotonAsistente
                onOlvidar={handleOlvidar}
                titulo="Preguntar al asistente sobre tus eventos"
                contexto={contextoDelAsistente({
                  eventosGuardados,
                  apuntes: apuntesCalendario,
                  eventoActual: eventoAbierto({
                    nombreEvento, evento, pax, ninos, fechaEvento, horaInicio, ubicacion,
                    notasEvento, barraCoctel, horasCoctel, barraCopas, horasCopas, logisticaEquipo,
                  }),
                  memoria,
                  objetivos,
                  tareas,
                  onMarcarTarea: (id, hecho) => guardarTareas(marcarTarea(tareasRef.current, id, hecho)),
                  onQuitarTarea: (id) => guardarTareas(quitarTarea(tareasRef.current, id)),
                  // Aquí solo se escriben tareas: los apuntes del calendario se tocan
                  // desde el calendario, que es quien sabe guardarlos.
                  onEscribir: encadenar(aplicarEnTareas({ tareas: tareasRef.current, guardar: guardarTareas })),
                  onPonerObjetivo: (texto, porQue) => guardarObjetivos(ponerObjetivo(objetivosRef.current, texto, { porQue }).objetivos),
                  onCambiarEstadoObjetivo: (id, estado) => guardarObjetivos(cambiarEstado(objetivosRef.current, id, estado)),
                  onQuitarObjetivo: (id) => guardarObjetivos(quitarObjetivo(objetivosRef.current, id)),
                  onRecordar: handleRecordar,
                  onOlvidar: handleOlvidar,
                  onUsoMemoria: handleUsoMemoria,
                })}
              />
            )}
            {onCerrarSesion && (
              <button className="btn btn-ghost" onClick={onCerrarSesion} title="Cerrar la sesión del equipo">Cerrar sesión</button>
            )}
            {/* "Vista previa" ya no vive aquí: es la hoja tal como sale en el Word y en
                el PDF, así que su sitio es dentro de Compartir, un segundo antes de
                exportar. Además libera un botón de una cabecera que ocupaba casi un
                tercio de la pantalla del móvil. */}
            {!soloVista && (
              <button className="btn btn-outline" onClick={() => setModoCarga(true)}><Package size={15} /> Modo carga</button>
            )}
            {/* El calendario del equipo. Solo con sesión: los apuntes viven ya en su
                propia colección, pero el CÓDIGO para llegar a ellos sigue en indice/,
                que las reglas abren únicamente al equipo. A quien entra por un link de
                evento se le ofrecería una pantalla que no puede cargar. */}
            {haySesionEquipo && !soloMarcar && (
              <button className="btn btn-outline" onClick={() => setModalCalendario(true)} title="El calendario del equipo: eventos, vacaciones y recogidas">
                <CalendarDays size={15} /> Calendario
              </button>
            )}
            <div className="compartir-menu-wrap">
              <button className="btn btn-green" onClick={() => setMenuCompartir(v => !v)}>{compartirMsg || "Compartir"}</button>
              {menuCompartir && (
                <>
                  <div className="compartir-menu-backdrop" onClick={() => setMenuCompartir(false)} />
                  <div className="compartir-menu">
                    <button onClick={() => { setMenuCompartir(false); setModalPrevia(true); }}><Eye size={15} /> Ver la hoja</button>
                    <div className="compartir-menu-sep" />
                    {/* El de logística: entra directo a marcar lo que sube al camión */}
                    <button onClick={() => handleGenerarLink("carga")} title="Abre directo en Modo carga (Salida): para quien carga el camión"><Package size={15} /> Link de Modo carga</button>
                    {/* El del metre: mira la lista y ya. Las marcas de carga son de
                        logística, y una casilla tocada por error deja a alguien
                        creyendo que algo va en el camión cuando no va. */}
                    <button onClick={() => handleGenerarLink("vista")} title="Solo para consultar la checklist: no deja marcar nada"><Eye size={15} /> Link de solo ver</button>
                    <button onClick={() => handleGenerarLink("edicion")} title="Quien lo abra puede cambiarlo todo"><Link2 size={15} /> Link con edición</button>
                    <button onClick={handleCompartirWord}><FileText size={15} /> Word</button>
                    <button onClick={handleCompartirPDF}><Printer size={15} /> PDF</button>
                    <button onClick={handleCompartirWhatsapp}><MessageCircle size={15} /> WhatsApp (texto)</button>
                    <button onClick={handleCompartirTexto}><ClipboardCopy size={15} /> Copiar texto</button>
                    {/* El canal con la oficina: el enlace que se les pasa y lo que
                        mandan por él. Vive aquí y no en la cabecera, que en el móvil
                        ya iba justa de sitio. */}
                    {nubeActiva() && (
                      <>
                        <div className="compartir-menu-sep" />
                        <button onClick={() => { setMenuCompartir(false); setModalFormulario(true); refrescarEnvios(); }}>
                          <ClipboardCheck size={15} /> Formulario del evento
                          {enviosPendientes.length > 0 && <span className="menu-badge">{enviosPendientes.length}</span>}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {/* RESUMEN DEL EVENTO: los datos que antes había que buscar en Vista previa
            o abriendo Modo carga. Se reparte en fichas que envuelven solas, así que
            en móvil caen en dos columnas y en escritorio van en una fila. */}
        <div className="resumen-evento animate-entrance" style={{ animationDelay: "0.04s" }}>
          <div className="resumen-ficha">
            <span className="resumen-ficha-label"><Users size={13} /> Pax total</span>
            <span className="resumen-ficha-valor">{pax + ninos}{ninos > 0 ? <em> · {pax} + {ninos} niños</em> : null}</span>
          </div>
          <div className="resumen-ficha">
            <span className="resumen-ficha-label"><Boxes size={13} /> Conceptos</span>
            {/* Mientras no haya nada en el camión, lo que interesa ver es cómo va la
                preparación; en cuanto se empieza a cargar, manda lo cargado. Nunca se
                enseñan las dos: en el móvil la fila no da para tres cifras. */}
            <span className="resumen-ficha-valor">{totalConceptos}{itemsCargados > 0
              ? <em> · {itemsCargados} cargados</em>
              : itemsPreparados > 0 ? <em> · {itemsPreparados} preparados</em> : null}</span>
          </div>
          <div className="resumen-ficha">
            <span className="resumen-ficha-label"><Clock size={13} /> Tiempo estimado</span>
            <span className="resumen-ficha-valor">{fmtMinutos(tiemposCargaForm.totalMin)}<em> · {logisticaParaTiempos} logística</em></span>
          </div>
          {totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta) > 0 && (
            <div className="resumen-ficha">
              <span className="resumen-ficha-label"><Truck size={13} /> Coste logística</span>
              <span className="resumen-ficha-valor">{String(totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)).replace(".", ",")}€</span>
            </div>
          )}
          {pendientesEvento > 0 && (
            <div className="resumen-ficha is-aviso">
              <span className="resumen-ficha-label"><Bell size={13} /> Pendientes</span>
              <span className="resumen-ficha-valor">{pendientesEvento}<em> · recogidas y compras</em></span>
            </div>
          )}
        </div>

        {linkAbierto && fechaEvento && fechaEvento < new Date().toISOString().slice(0, 10) && (
          <div className="archivado-banner">📦 Este evento ya pasó — checklist archivada, solo para consulta.</div>
        )}

        {versionNueva && (
          <div className="version-nueva-banner">
            <div className="cambios-remotos-detalle">
              <strong>⬆️ Hay una versión nueva de la app</strong>
              <span>Tus datos no se tocan: se recarga la página y ya está.</span>
            </div>
            <button className="btn btn-green version-nueva-btn" onClick={() => window.location.reload()}>Actualizar</button>
          </div>
        )}

        {hayCambiosRemotos && (
          <div className="cambios-remotos-banner">
            <div className="cambios-remotos-detalle">
              <strong>🔄 Actualizado desde otro dispositivo:</strong>
              <span>
                {hayCambiosRemotos.slice(0, 4).join(" · ")}
                {hayCambiosRemotos.length > 4 ? ` · y ${hayCambiosRemotos.length - 4} cambios más` : ""}
              </span>
            </div>
            <button className="cambios-remotos-cerrar" onClick={() => setHayCambiosRemotos(null)} aria-label="Cerrar aviso"><X size={14} /></button>
          </div>
        )}

        {/* Esta checklist la creó el calendario y todavía le falta lo suyo. Va arriba
            del todo y no como un aviso flotante: no es una notificación que pasa, es el
            estado en el que está lo que tienes delante. Una checklist recién nacida se
            ve igual que una terminada, y el pax que se lee puede ser el de fábrica. */}
        {sinConfigurar && !soloMarcar && (
          <div className="aviso-sin-configurar">
            <AlertTriangle size={16} aria-hidden="true" />
            <div className="aviso-sin-configurar-texto">
              <strong>Falta configurar este evento</strong>
              <span>
                Lo ha creado el calendario con lo que sabía: tipo, día
                {ubicacion ? ", sitio" : ""} y pax. Falta lo demás —barra, menú,
                equipamiento—, que llega con el formulario de la oficina o lo pones tú.
                Repasa el pax antes de cargar nada.
              </span>
            </div>
            <button className="btn btn-outline" onClick={() => setSinConfigurar(false)}>
              Ya está configurado
            </button>
          </div>
        )}

        {/* Lo que se ha adelantado solo al abrir. Se dice, y se ofrece ir a verlo:
            son eventos que han aparecido en tu archivo sin que los pidieras. */}
        {checklistsCreadas.length > 0 && (
          <div className="cambios-remotos-banner es-creadas">
            <div className="cambios-remotos-detalle">
              <strong>📅 Del calendario:</strong>
              <span>
                {checklistsCreadas.length === 1
                  ? `He creado la checklist de "${checklistsCreadas[0]}", que ya está cerca.`
                  : `He creado ${checklistsCreadas.length} checklists de eventos que ya están cerca: ${checklistsCreadas.slice(0, 3).join(", ")}${checklistsCreadas.length > 3 ? ` y ${checklistsCreadas.length - 3} más` : ""}.`}
              </span>
            </div>
            <button className="btn btn-outline" onClick={() => { setChecklistsCreadas([]); setModalCalendario(true); }}>Ver el calendario</button>
            <button className="cambios-remotos-cerrar" onClick={() => setChecklistsCreadas([])} aria-label="Cerrar aviso"><X size={14} /></button>
          </div>
        )}

        {/* Con la app abierta, lo que llega del formulario se dice al momento. Un
            cambio no sube el contador de pendientes, así que sin esto pasaría
            desapercibido justo cuando más importa (han cambiado los pax de mañana). */}
        {avisoEnvios && (
          <div className="cambios-remotos-banner">
            <div className="cambios-remotos-detalle">
              <strong>📋 Del formulario:</strong>
              <span>
                {avisoEnvios.frases.slice(0, 3).join(" · ")}
                {avisoEnvios.frases.length > 3 ? ` · y ${avisoEnvios.frases.length - 3} más` : ""}
              </span>
            </div>
            {/* Avisar aquí mismo, en cuanto llega: si hay que abrir la bandeja para
                hacerlo, se hace más tarde o no se hace. Manda el último que ha
                entrado, que es de lo que habla el aviso. */}
            {limpiarAvisos(avisosWhatsapp).map((a, i) => (
              <a
                className="btn btn-outline"
                key={i}
                href={`https://wa.me/${a.tel}?text=${encodeURIComponent(textoAvisoEnvio(avisoEnvios.envios[avisoEnvios.envios.length - 1]))}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={14} /> Avisar{a.nombre ? ` a ${a.nombre.split(/[ ·]/)[0]}` : ""}
              </a>
            ))}
            {/* Aceptar sin pasar por la bandeja: cuando llega uno solo, que es lo
                normal, se acepta aquí y el evento se abre ya configurado. Sigue
                preguntando antes, que aplicar toca un evento de verdad. */}
            {avisoEnvios.envios.length === 1 && (
              <button className="btn btn-green" onClick={() => {
                const envio = avisoEnvios.envios[0];
                setAvisoEnvios(null);
                handleAplicarEnvio(envio);
              }}>Aceptar y abrir</button>
            )}
            <button className="btn btn-outline" onClick={() => { setAvisoEnvios(null); setModalFormulario(true); }}>Verlo</button>
            <button className="cambios-remotos-cerrar" onClick={() => setAvisoEnvios(null)} aria-label="Cerrar aviso"><X size={14} /></button>
          </div>
        )}

        {/* Si la oficina ha mandado algo, se dice aquí: en el menú de Compartir hay un
            contador, pero eso hay que abrirlo para verlo y estos datos caducan. */}
        {enviosPendientes.length > 0 && !modalFormulario && (
          <div className="envios-aviso" role="status">
            <ClipboardCheck size={16} />
            <span>
              <strong>{enviosPendientes.length === 1 ? "1 envío" : `${enviosPendientes.length} envíos`} del formulario</strong>
              {" "}sin revisar
            </span>
            <button className="btn btn-green" onClick={() => { setModalFormulario(true); refrescarEnvios(); }}>Ver</button>
          </div>
        )}

        {avisosRecogidas.length > 0 && !avisosOcultos && (() => {
          // Cada aviso vive en SU evento: el detalle completo (con botón ✓ Hecho) solo
          // se enseña para el evento que está abierto ahora mismo; del resto de eventos
          // solo una línea compacta por evento para abrirlo — así no se mezclan
          const esAbierto = (evt) => evt === nombreEvento
            || (!!eventoNubeId && eventosGuardados[evt]?.eventoNubeId === eventoNubeId);
          const delAbierto = avisosRecogidas.filter(a => esAbierto(a.evento));
          const otrosEventos = [...new Set(avisosRecogidas.filter(a => !esAbierto(a.evento)).map(a => a.evento))];
          const textoDias = (d) => d < 0 ? "atrasado" : d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`;
          return (
            <div className="avisos-recogidas-banner">
              <div className="cambios-remotos-detalle avisos-recogidas-detalle">
                {delAbierto.length > 0 && (
                  <div className="aviso-evento-grupo">
                    <strong>⏰ Pendiente en este evento ({delAbierto[0].evento}):</strong>
                    <span className="avisos-recogidas-lista">
                      {delAbierto.map(a => (
                        <span className={`aviso-recogida-chip ${a.dias < 0 ? "is-atrasado" : a.dias === 0 ? "is-hoy" : ""}`} key={`${a.lista}::${a.idx}::${a.tipo}`}>
                          {/* Todo el texto en UN solo elemento: siendo trozos sueltos,
                              el flex los trataba como piezas independientes y los
                              separaba a lo ancho al partirse en dos líneas. */}
                          <span className="aviso-recogida-texto">
                            {a.tipo}: "{a.concepto}"
                            {a.fecha ? ` (${new Date(a.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}` : ""}
                            {a.fecha ? <span className="aviso-recogida-dias"> · {textoDias(a.dias)})</span> : ""}
                          </span>
                          <button
                            className="aviso-recogida-hecho"
                            onClick={() => marcarAvisoHecho(a)}
                            title={`Marcar ${a.tipo.toLowerCase()} como hecha`}
                            aria-label={`Marcar ${a.tipo} de ${a.concepto} como hecha`}
                          >✓ Hecho</button>
                        </span>
                      ))}
                    </span>
                  </div>
                )}
                {otrosEventos.length > 0 && (
                  <div className="aviso-evento-grupo">
                    <strong>⏰ Pendientes en otros eventos:</strong>
                    <span className="avisos-recogidas-lista">
                      {otrosEventos.map(evt => (
                        <button
                          className="aviso-otro-evento-btn"
                          key={evt}
                          onClick={() => handleCargarEvento(evt)}
                          title={avisosRecogidas.filter(a => a.evento === evt).map(a => `${a.tipo}: ${a.concepto}`).join(" · ")}
                        >📋 {evt} ({avisosRecogidas.filter(a => a.evento === evt).length}) →</button>
                      ))}
                    </span>
                  </div>
                )}
              </div>
              <button className="cambios-remotos-cerrar" onClick={() => setAvisosOcultos(true)} aria-label="Cerrar aviso"><X size={14} /></button>
            </div>
          );
        })()}

        <div className="main-layout">
        <div className="config-sidebar">

        {/* AÑADIR VARIOS ITEMS (pegando texto) */}
        {/* El estado "ya hay items pegados" se marca con una clase, no con colores en
            línea: un estilo en línea gana a las variables del tema y dejaba el botón
            blanco en modo oscuro. */}
        {!soloMarcar && (
        <button
          className={`add-material-btn animate-entrance ${agregadosTag ? "is-hecho" : ""}`}
          style={{ animationDelay: "0.05s" }}
          onClick={() => setModalAgregar(true)}
        >
          <span><ListPlus size={16} /> {agregadosTag || "Añadir varios items pegando texto"}</span>
          <ArrowRight size={16} />
        </button>
        )}

        {/* PLANTILLAS GUARDADAS */}
        {!soloMarcar && (
        <div className="config-card plantillas-card animate-entrance" style={{ animationDelay: "0.08s" }}>
          <div className="plantillas-header">
            <span className="section-title" style={{ marginBottom: 0 }}>Plantillas</span>
            <button className="btn btn-navy-outline btn-plantilla" onClick={handleGuardarPlantilla} title="Guarda solo la configuración (pax, extras, equipamiento...) como plantilla reutilizable, SIN nombre/fecha/ubicación"><Save size={14} /> Guardar actual</button>
          </div>
          {guardadoPlantillaMsg && <p className="guardado-confirm">{guardadoPlantillaMsg}</p>}
          {Object.keys(plantillas).length === 0 ? (
            <p className="plantillas-vacio">Guarda configuraciones que repites (ej: "Boda estándar 100 pax") y cárgalas con un click en el próximo evento.</p>
          ) : (
            <ListaColapsable nombres={[...Object.keys(plantillas)].reverse()}>
              {n => (
                <div className="plantilla-row" key={n}>
                  <button className="plantilla-nombre" onClick={() => handleAplicarPlantilla(n)} title={`Cargar la plantilla "${n}"`}><FolderOpen size={15} /> {n}</button>
                  <button className="plantilla-borrar" onClick={() => handleBorrarPlantilla(n)} aria-label={`Borrar plantilla ${n}`} title="Borrar plantilla"><X size={15} /></button>
                </div>
              )}
            </ListaColapsable>
          )}
        </div>
        )}

        {/* EVENTOS GUARDADOS */}
        {!soloMarcar && (
        <div className="config-card plantillas-card animate-entrance" style={{ animationDelay: "0.09s" }}>
          <div className="plantillas-header">
            <span className="section-title" style={{ marginBottom: 0 }}>Eventos guardados</span>
            {/* Arriba, con el título, solo la acción de cada día — igual que "Guardar
                actual" en Plantillas. Lo demás baja según se use menos. */}
            <div className="plantillas-header-acciones">
              <button className="btn btn-navy-outline btn-plantilla" onClick={handleGuardarEvento} title="Guarda esta checklist COMPLETA (nombre, fecha, ubicación, logística...) para reabrirla o compartir su link"><Save size={14} /> Guardar evento</button>
            </div>
          </div>
          <button className="btn btn-outline btn-secundario-ancho" onClick={handleRecalcular} title="Comprueba si alguna cantidad automática ha cambiado desde el último guardado (por un ajuste de fórmula) y deja elegir cuál usar"><RefreshCw size={14} /> Recalcular cantidades</button>
          {recalcularMsg && <p className="guardado-confirm">{recalcularMsg}</p>}
          {guardadoEventoMsg && <p className="guardado-confirm">{guardadoEventoMsg}</p>}
          {Object.keys(eventosGuardados).length === 0 ? (
            <p className="plantillas-vacio">Guarda la checklist de cada evento y comparte su link: quien lo abra la verá en la web, lista para hacer check desde el móvil.</p>
          ) : (
            <>
              {Object.keys(eventosGuardados).length > 4 && (
                <div className="buscador-eventos">
                  <Search size={15} className="buscador-eventos-icono" />
                  <input
                    type="text"
                    className="buscador-eventos-input"
                    placeholder="Buscar evento por nombre…"
                    value={filtroEventos}
                    onChange={(e) => setFiltroEventos(e.target.value)}
                    aria-label="Buscar evento por nombre"
                  />
                  {filtroEventos && (
                    <button className="buscador-eventos-limpiar" onClick={() => setFiltroEventos("")} title="Limpiar búsqueda" aria-label="Limpiar búsqueda"><X size={14} /></button>
                  )}
                </div>
              )}
              {eventosPendientes.length > 0 ? (
                <ListaColapsable nombres={eventosPendientes}>{filaEvento}</ListaColapsable>
              ) : (
                <p className="plantillas-vacio">{filtroEventos ? "Ningún evento próximo coincide con la búsqueda." : "No hay eventos próximos."}</p>
              )}
              {eventosPasados.length > 0 && (
                <>
                  <button className="ver-todos-btn" onClick={() => setVerPasados(v => !v)}>
                    {verPasados ? <><ChevronUp size={14} /> Ocultar pasados</> : <><CalendarClock size={14} /> Ver eventos pasados ({eventosPasados.length})</>}
                  </button>
                  {verPasados && <ListaColapsable nombres={eventosPasados}>{filaEvento}</ListaColapsable>}
                </>
              )}
            </>
          )}
          {/* Copia y restauración: mantenimiento, se usa una vez de Pascuas a Ramos.
              Va al pie y en discreto para no competir con lo de cada día. */}
          <div className="mantenimiento-fila">
            <button className="btn-mantenimiento" onClick={handleExportarCopia} title="Descarga un fichero con TODOS tus eventos guardados. Es tu copia de seguridad: no depende de la nube ni de la conexión">
              <Download size={13} /> Descargar copia de seguridad
            </button>
            <label className="btn-mantenimiento" title="Carga una copia de seguridad. Solo AÑADE los eventos que no tengas: nunca pisa los que ya están">
              <Upload size={13} /> Restaurar
              <input type="file" accept="application/json,.json" style={{ display: "none" }}
                onChange={e => { handleImportarCopia(e.target.files && e.target.files[0]); e.target.value = ""; }} />
            </label>
          </div>
        </div>
        )}

        {/* CONFIG */}
        {!soloMarcar && (
        <div className="config-card animate-entrance" style={{ animationDelay: "0.1s" }}>
          <div className="section-title">Evento</div>
          <div className="form-row">
            <div className="form-group">
              <span className="form-label">TIPO DE EVENTO</span>
              <select className="form-select" value={evento} onChange={e => handleCambiarTipoEvento(e.target.value)}>
                {Object.entries(EVENTOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {diasPaxValidos.length === 0 && (<>
            <div className="form-group">
              <span className="form-label">PAX ADULTOS</span>
              <input type="number" className="form-input" value={pax} onChange={e => setPax(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label">NIÑOS</span>
              <input type="number" className="form-input" value={ninos} onChange={e => setNinos(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            </>)}
            <div className="form-group">
              <span className="form-label">Nº CAMAREROS</span>
              <input type="number" className="form-input" placeholder="Auto" value={numCamareros || ""} onChange={e => setNumCamareros(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
            <div className="form-group">
              <span className="form-label" title="Si dejas Nº camareros en Auto, se calcula 1 camarero por cada tantos pax. Vacío = valor recomendado por tipo de evento.">1 CAMARERO CADA · PAX</span>
              <input
                type="number"
                className="form-input"
                placeholder={evento === "corporativo" ? "18 (recom.)" : (evento === "cumpleanos" || evento === "produccion") ? "20 (recom.)" : "12 (recom.)"}
                value={paxPorCamarero || ""}
                onChange={e => setPaxPorCamarero(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
              />
            </div>
            <div className="form-group">
              <span className="form-label">Nº STAFF (cocina, otros)</span>
              <input type="number" className="form-input" placeholder="0" value={numStaff || ""} onChange={e => setNumStaff(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
            </div>
          </div>
          {evento === "produccion" && (
            <div className="logistica-block">
              <div className="dia-produccion-row dia-produccion-numdias">
                <span className="form-label">DÍAS DE PRODUCCIÓN</span>
                <input
                  type="number"
                  min="0"
                  max="7"
                  className="form-input"
                  placeholder="1"
                  value={diasProduccion.length || ""}
                  onChange={e => {
                    // Máximo una semana (más días seguidos no tiene sentido). Al cambiar
                    // el número se conservan los pax ya escritos de los primeros días y
                    // solo se añaden/quitan huecos por el final.
                    const n = Math.min(7, Math.max(0, parseInt(e.target.value, 10) || 0));
                    setDiasProduccion(prev => n <= prev.length ? prev.slice(0, n) : [...prev, ...Array(n - prev.length).fill("")]);
                  }}
                />
                <span className="dia-produccion-hint">máx. 7</span>
              </div>
              {diasProduccion.map((d, i) => (
                <div className="dia-produccion-row" key={i}>
                  <span className="dia-produccion-label">Día {i + 1}</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="pax"
                    value={d}
                    onChange={e => setDiasProduccion(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                  />
                </div>
              ))}
              {diasPaxValidos.length > 0 ? (
                <p className="dias-produccion-resumen">
                  {diasPaxValidos.join(" + ")} pax en {diasPaxValidos.length} días → equipo para el día de {Math.max(...diasPaxValidos)} pax, consumibles para {diasPaxValidos.reduce((a, b) => a + b, 0)} raciones
                </p>
              ) : (
                <p className="dias-produccion-resumen">Pon cuántos días es la producción (máx. 7) y el pax de cada día. Sin días se calcula un solo día con los PAX de arriba.</p>
              )}
            </div>
          )}
          <div className="form-row">
            {/* El nombre y la ubicación son los dos campos de texto libre más largos:
                ocupan la fila entera en vez de media, que dejaba 145px y no se veía
                lo que habías escrito. La fecha y la hora sí caben a media fila. */}
            <div className="form-group form-group-ancho">
              <span className="form-label">NOMBRE DEL EVENTO</span>
              <input type="text" className="form-input" title={nombreEvento || "Nombre del evento"} placeholder="Ej: Boda de Ana y Luis" value={nombreEvento} onChange={e => setNombreEvento(e.target.value)} />
              {nombreOcupado && (
                <span className="aviso-nombre-ocupado">
                  Ya tienes un evento guardado con ese nombre. No se guarda solo para no pisarlo:
                  cámbiale el nombre, o ábrelo desde la lista si es ese.
                </span>
              )}
            </div>
            <div className="form-group">
              <span className="form-label">FECHA</span>
              <input type="date" className="form-input" value={fechaEvento} onChange={e => handleCambiarFechaEvento(e.target.value)} />
            </div>
            <div className="form-group">
              <span className="form-label">HORA DE INICIO</span>
              <input type="time" className="form-input" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </div>
            <div className="form-group form-group-ancho">
              <span className="form-label">UBICACIÓN</span>
              <div className="ubicacion-row">
                <input type="text" className="form-input" title={ubicacion || "Ubicación"} placeholder="Ej: Finca La Alquería" value={ubicacion} onChange={e => setUbicacion(e.target.value)} />
                {/* Lo que escribe oficina es el nombre del sitio ("Finca La Alquería"),
                    no unas coordenadas: Maps lo busca igual de bien y ahorra copiarlo,
                    abrir la aplicación y pegarlo el día del montaje. Se abre en pestaña
                    nueva para no perder la checklist a medio marcar. */}
                {ubicacion.trim() && (
                  <a
                    className="btn btn-navy-outline btn-mapa"
                    href={enlaceMapa(ubicacion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Abrir "${ubicacion.trim()}" en Google Maps`}
                  ><MapPin size={15} /> Cómo llegar</a>
                )}
              </div>
            </div>
          </div>
          <div className="form-group notas-group">
            <span className="form-label">NOTAS DEL EVENTO</span>
            <textarea
              className="form-input notas-textarea"
              placeholder="Ej: alergias, peticiones especiales, incidencias a tener en cuenta..."
              value={notasEvento}
              onChange={e => setNotasEvento(e.target.value)}
              rows={3}
            />
          </div>
          <div className="logistica-block">
            <span className="form-label logistica-label-rec">
              EQUIPO DE LOGÍSTICA (cada uno con su horario)
              <span className="logistica-recomendado" title="Recomendado: 1 persona de logística cada 60 pax. Se usa para repartir el tiempo de carga/descarga.">
                <Truck size={12} /> Recomendado: {Math.max(1, Math.ceil(pax / 60))}
                {logisticaEquipo.length < Math.max(1, Math.ceil(pax / 60)) && (
                  <button
                    className="logistica-add-rec"
                    onClick={() => setLogisticaEquipo(prev => {
                      const rec = Math.max(1, Math.ceil(pax / 60));
                      if (prev.length >= rec) return prev;
                      return [...prev, ...Array.from({ length: rec - prev.length }, () => ({ nombre: "", inicio: "", fin: "", furgoneta: false }))];
                    })}
                  >+ Añadir {Math.max(1, Math.ceil(pax / 60)) - logisticaEquipo.length}</button>
                )}
              </span>
            </span>
            {logisticaEquipo.length > 0 && (
              <div className="logistica-tarifas">
                <div className="form-group">
                  <span className="form-label">€ / hora</span>
                  <input type="number" className="form-input" min="0" step="0.5" value={tarifaLogistica} onChange={e => setTarifaLogistica(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                <div className="form-group">
                  <span className="form-label">Plus furgoneta propia (€)</span>
                  <input type="number" className="form-input" min="0" step="1" value={plusFurgoneta} onChange={e => setPlusFurgoneta(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
              </div>
            )}
            {logisticaEquipo.map((p, i) => {
              const horas = horasLogistica(p.inicio, p.fin);
              const importe = importeLogistica(p, tarifaLogistica, plusFurgoneta);
              return (
                <div className="logistica-row" key={i}>
                  <input
                    type="text"
                    className="form-input logistica-nombre"
                    placeholder="Nombre"
                    value={p.nombre}
                    onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, nombre: e.target.value } : x))}
                  />
                  <input
                    type="time"
                    className="form-input logistica-hora"
                    value={p.inicio}
                    title="Hora de inicio"
                    onChange={e => {
                      const nuevaInicio = e.target.value;
                      setLogisticaEquipo(prev => prev.map((x, idx) => {
                        if (idx !== i) return x;
                        const next = { ...x, inicio: nuevaInicio };
                        // Sugerir la hora de fin desde la de inicio (inicio + tiempo estimado
                        // total: preparación + carga + descarga). Solo si el fin está vacío o
                        // se había puesto de forma automática; siempre editable a mano.
                        if (nuevaInicio && tiemposCargaForm.totalMin > 0 && (!x.fin || x.finAuto)) {
                          next.fin = sumarMinutosHora(nuevaInicio, tiemposCargaForm.totalMin);
                          next.finAuto = true;
                        }
                        return next;
                      }));
                    }}
                  />
                  <span className="logistica-sep">–</span>
                  <input
                    type="time"
                    className="form-input logistica-hora"
                    value={p.fin}
                    title={p.finAuto ? "Hora de fin sugerida automáticamente (editable)" : "Hora de fin"}
                    onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, fin: e.target.value, finAuto: false } : x))}
                  />
                  <button
                    type="button"
                    className={`logistica-tipo-btn ${p.tipo === "nomina" ? "is-nomina" : "is-extra"}`}
                    onClick={() => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, tipo: x.tipo === "nomina" ? "extra" : "nomina" } : x))}
                    title="Extra = se paga por horas · Nómina = ya va en nómina (no suma €/hora al evento)"
                  >{p.tipo === "nomina" ? "Nómina" : "Extra"}</button>
                  <label className="logistica-furgo" title="Plus por llevar furgoneta">
                    <input
                      type="checkbox"
                      checked={p.furgoneta || false}
                      onChange={e => setLogisticaEquipo(prev => prev.map((x, idx) => idx === i ? { ...x, furgoneta: e.target.checked } : x))}
                    />
                    <Truck size={14} />
                  </label>
                  {horas !== null && (
                    <span className="logistica-info">{String(horas).replace(".", ",")}h · <strong>{String(importe).replace(".", ",")}€</strong>{p.tipo === "nomina" ? " nómina" : ""}</span>
                  )}
                  <button
                    className="item-action-btn item-action-borrar"
                    onClick={() => setLogisticaEquipo(prev => prev.filter((_, idx) => idx !== i))}
                    title="Quitar persona"
                    aria-label={`Quitar ${p.nombre || "persona"} de logística`}
                  ><X size={14} /></button>
                </div>
              );
            })}
            <div className="logistica-footer">
              <button
                className="btn-add-logistica"
                onClick={() => setLogisticaEquipo(prev => [...prev, { nombre: "", inicio: "", fin: "", furgoneta: false }])}
              >+ Añadir persona</button>
              {totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta) > 0 && (
                <span className="logistica-total">Total: <strong>{String(totalLogistica(logisticaEquipo, tarifaLogistica, plusFurgoneta)).replace(".", ",")}€</strong></span>
              )}
            </div>
          </div>
          {/* ALQUILERES: material que no es nuestro. Estaban sueltos por el formulario
              (las sillas en Equipamiento, el armario caliente entre los extras) y no
              tenían ninguna relación con las recogidas de aquí abajo: se marcaba el
              alquiler, salía en la carga, y la recogida y la devolución había que
              escribirlas a mano evento tras evento. Ahora van juntos y cada uno crea
              las suyas con las fechas sacadas de la del evento. */}
          <div className="logistica-block">
            <span className="form-label">ALQUILERES (material de otros — crea su recogida y su devolución)</span>
            <div className="equip-grid alquileres-grid">
              <SegmentedControl
                label="Sillas"
                value={origenSillas}
                onChange={v => {
                  setOrigenSillas(v);
                  sincronizaAlquiler("sillas", v === "Dealde" || v === "Carvillo", conceptoAlquiler("sillas", v));
                }}
                options={["Dealde", "Carvillo", "Nuestras", "No llevan"]}
              />
              {/* Las mesas de los comensales. Las rectangulares son nuestras y van a
                  SEIS por mesa —no siete— porque aquí se juntan varias para hacer mesas
                  largas, y al juntarlas se pierden las cabeceras. Las redondas no las
                  tenemos: si se eligen, salen como línea de alquiler aparte, y las de
                  cocina se quedan en su línea de 1,8m. */}
              <SegmentedControl
                label="Mesas de los comensales"
                value={tipoMesa}
                onChange={v => {
                  setTipoMesa(v);
                  sincronizaAlquiler("mesas", Boolean(TIPOS_MESA[v] && TIPOS_MESA[v].alquiler), conceptoAlquiler("mesas"), /mesa/i);
                }}
                options={Object.keys(TIPOS_MESA)}
              />
              {/* El generador de las producciones siempre es alquilado (SOS), así que su
                  interruptor vive aquí y no en Equipamiento: al marcarlo hay que ir a
                  buscarlo y devolverlo, no solo cargarlo. */}
              {evento === "produccion" && (
                <SegmentedControl
                  label="Generador"
                  value={llevaGenerador ? "Lleva" : "No lleva"}
                  onChange={v => {
                    setLlevaGenerador(v === "Lleva");
                    sincronizaAlquiler("generador", v === "Lleva", conceptoAlquiler("generador"));
                  }}
                  options={["Lleva", "No lleva"]}
                />
              )}
              <label className="checkbox-label-normal">
                <input
                  type="checkbox"
                  checked={llevaArmarioCaliente}
                  onChange={e => {
                    setLlevaArmarioCaliente(e.target.checked);
                    sincronizaAlquiler("armarioCaliente", e.target.checked, conceptoAlquiler("armarioCaliente"));
                  }}
                />
                <span className="checkbox-texto">Armario caliente <span className="checkbox-sub">· Dealde</span></span>
              </label>
              {/* Mobiliario EXTRA, el que no tenemos: se alquila a Event Style cuando el
                  cliente pide más de lo nuestro. En un rodaje no se lleva, así que ahí no
                  se ofrece. Los chill out son nuestros y se configuran en Extras: esos no
                  hay que devolverlos. */}
              {evento !== "produccion" && (
                <label className="checkbox-label-normal">
                  <input
                    type="checkbox"
                    checked={llevaMobiliarioAlquiler}
                    onChange={e => {
                      setLlevaMobiliarioAlquiler(e.target.checked);
                      sincronizaAlquiler("mobiliario", e.target.checked, conceptoAlquiler("mobiliario"));
                    }}
                  />
                  <span className="checkbox-texto">Mobiliario extra <span className="checkbox-sub">· Event Style, lo que no es nuestro</span></span>
                </label>
              )}
              {/* Las 8 carpas del almacén cubren casi todo; cuando el cálculo pide más hay
                  que alquilar las que falten, y esas también se van a buscar y se devuelven. */}
              {evento === "produccion" && llevaCarpas && (
                <label className="checkbox-label-normal">
                  <input
                    type="checkbox"
                    checked={alquilaCarpas}
                    onChange={e => {
                      setAlquilaCarpas(e.target.checked);
                      sincronizaAlquiler("carpas", e.target.checked, conceptoAlquiler("carpas"));
                    }}
                  />
                  <span className="checkbox-texto">Carpas de alquiler <span className="checkbox-sub">· Support On Set</span></span>
                </label>
              )}
            </div>
            {!fechaEvento && recogidas.some(r => r.auto) && (
              <p className="alquileres-aviso">Pon la fecha del evento y las de recogida y devolución se rellenan solas.</p>
            )}
          </div>
          <div className="logistica-block">
            <span className="form-label">RECOGIDAS (alquileres/equipo de otros a devolver o recoger)</span>
            {recogidas.map((r, i) => (
              <div className="recogida-card" key={i}>
                <div className="recogida-card-top">
                  {r.auto && (
                    <span className="recogida-auto-badge" title="Creada sola al marcar el alquiler. Las fechas salen de la del evento hasta que las cambies a mano">
                      <Tag size={11} /> Alquiler
                    </span>
                  )}
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Camión plataforma (Albácar)"
                    title={r.concepto || "Qué hay que recoger o devolver"}
                    value={r.concepto}
                    onChange={e => editarRecogida(i, { concepto: e.target.value })}
                  />
                  <button
                    className="item-action-btn item-action-borrar"
                    onClick={() => setRecogidas(prev => prev.filter((_, idx) => idx !== i))}
                    title="Quitar recogida"
                    aria-label={`Quitar recogida ${r.concepto || ""}`}
                  ><X size={14} /></button>
                </div>
                <div className="recogida-card-fechas">
                  <div className="form-group">
                    <span className="form-label">Recogida</span>
                    <div className="recogida-fecha-hora">
                      <input
                        type="date"
                        className="form-input"
                        value={r.fecha}
                        title="Fecha de recogida"
                        onChange={e => editarRecogida(i, { fecha: e.target.value }, true)}
                      />
                      <input
                        type="time"
                        className="form-input"
                        value={r.hora}
                        title="Hora de recogida"
                        onChange={e => editarRecogida(i, { hora: e.target.value })}
                      />
                    </div>
                    <label className={`recogida-estado ${r.recogido ? "is-hecho" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!r.recogido}
                        onChange={e => editarRecogida(i, { recogido: e.target.checked })}
                      />
                      {r.recogido ? "✓ Recogido" : "Pendiente de recoger"}
                    </label>
                  </div>
                  <div className="form-group">
                    <span className="form-label">Devolución</span>
                    <input
                      type="date"
                      className="form-input"
                      value={r.fechaDevolucion || ""}
                      title="Fecha de devolución"
                      onChange={e => editarRecogida(i, { fechaDevolucion: e.target.value }, true)}
                    />
                    {r.fechaDevolucion && (
                      <label className={`recogida-estado ${r.devuelto ? "is-hecho" : ""}`}>
                        <input
                          type="checkbox"
                          checked={!!r.devuelto}
                          onChange={e => editarRecogida(i, { devuelto: e.target.checked })}
                        />
                        {r.devuelto ? "✓ Devuelto" : "Pendiente de devolver"}
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              className="btn-add-logistica"
              onClick={() => setRecogidas(prev => [...prev, { concepto: "", fecha: "", hora: "", fechaDevolucion: "" }])}
            >+ Añadir recogida</button>
          </div>
          <div className="logistica-block">
            <span className="form-label">COMPRAS (qué falta comprar, con fecha límite y aviso)</span>
            {compras.map((c, i) => (
              <div className="recogida-card" key={i}>
                <div className="recogida-card-top">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Hielo, servilletas, pilas walkie..."
                    title={c.concepto || "Qué hay que comprar"}
                    value={c.concepto}
                    onChange={e => setCompras(prev => prev.map((x, idx) => idx === i ? { ...x, concepto: e.target.value } : x))}
                  />
                  <button
                    className="item-action-btn item-action-borrar"
                    onClick={() => setCompras(prev => prev.filter((_, idx) => idx !== i))}
                    title="Quitar compra"
                    aria-label={`Quitar compra ${c.concepto || ""}`}
                  ><X size={14} /></button>
                </div>
                <div className="recogida-card-fechas">
                  <div className="form-group">
                    <span className="form-label">Cantidad / detalle</span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: 4 bolsas"
                      title={c.cantidad || "Cantidad o detalle"}
                      value={c.cantidad || ""}
                      onChange={e => setCompras(prev => prev.map((x, idx) => idx === i ? { ...x, cantidad: e.target.value } : x))}
                    />
                  </div>
                  <div className="form-group">
                    <span className="form-label">Comprar antes de</span>
                    <input
                      type="date"
                      className="form-input"
                      value={c.fecha || ""}
                      title="Fecha límite de compra"
                      onChange={e => setCompras(prev => prev.map((x, idx) => idx === i ? { ...x, fecha: e.target.value } : x))}
                    />
                    <label className={`recogida-estado ${c.comprado ? "is-hecho" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!c.comprado}
                        onChange={e => setCompras(prev => prev.map((x, idx) => idx === i ? { ...x, comprado: e.target.checked } : x))}
                      />
                      {c.comprado ? "✓ Comprado" : "Pendiente de comprar"}
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button
              className="btn-add-logistica"
              onClick={() => setCompras(prev => [...prev, { concepto: "", cantidad: "", fecha: "", comprado: false }])}
            >+ Añadir compra</button>
          </div>
          {evento !== "produccion" && (<>
          <hr />
          <div className="section-title">Barra libre</div>
          <div className="form-row">
            <div className="range-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={barraCoctel} onChange={e => setBarraCoctel(e.target.checked)} />
                Cóctel / aperitivo
              </label>
              <div className="range-slider-container">
                <input type="range" min="0" max="12" step="0.5" className="range-slider" value={horasCoctel} onChange={e => setHorasCoctel(parseFloat(e.target.value))} disabled={!barraCoctel} />
                <span className="range-value">{horasCoctel}h</span>
              </div>
            </div>
            <div className="range-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={barraCopas} onChange={e => setBarraCopas(e.target.checked)} />
                Copas
              </label>
              <div className="range-slider-container">
                <input type="range" min="0" max="24" step="1" className="range-slider" value={horasCopas} onChange={e => setHorasCopas(parseFloat(e.target.value))} disabled={!barraCopas} />
                <span className="range-value">{horasCopas}h</span>
              </div>
            </div>
          </div>
          </>)}
          {/* En producción no sale porque un rodaje no lleva alcohol. En cumpleaños sí:
              estaba oculto del lote en que este evento se trató como "ligero", el mismo
              que le dejó sin vino, cerveza ni cava.
              Va en controls-row y NO en form-row: form-row parte la barra lateral en dos
              columnas iguales, así que al control le tocaban 171px necesitara lo que
              necesitara — y con los 196 que pide se rompía por dentro (primero partiendo
              "No lleva" en dos líneas, luego tirando "50L" a otra fila). controls-row
              reparte por contenido: cada cosa ocupa lo suyo y, si no caben las dos, el
              "Nº barriles" baja entero a la línea siguiente. */}
          {evento !== "produccion" && (
            <div className="controls-row" style={{ marginTop: 12 }}>
              <SegmentedControl label="Barril de cerveza" value={tamanoBarril} onChange={setTamanoBarril} options={["No lleva", "30L", "50L"]} />
              {tamanoBarril !== "No lleva" && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº barriles</span>
                  <input type="number" className="form-input" value={numBarriles} min="1" onChange={e => setNumBarriles(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              )}
            </div>
          )}
          <hr />
          <div className="section-title">Extras</div>
          <div className="checkbox-grid">
            {[
              [dobleServicio,        setDobleServicio,        "Doble servicio",          "dobla cubierto, copa y plato"],
              [llevaEntrante,        setLlevaEntrante,        "Entrante de chupito",      "solo vasos de cristal"],
              [entranteCompartido,   setEntranteCompartido,   "Entrante compartido",      "platos para compartir en mesa"],
              /* "Lleva canapés" ya no existe: las bandejas para pasar comida van siempre,
                 calculadas por pax. Lo que de verdad cambia la carga es si el servicio
                 es entero de bandeja, y eso es esta casilla. */
              [soloBandeja,          setSoloBandeja,          "Solo bandeja",             "quita TODOS los platos y suma bandejas"],
              [llevaPaella,          setLlevaPaella,          "Lleva paella",             "calcula paelleros completos"],
              /* El armario caliente es alquiler: vive en el bloque ALQUILERES, junto a
                 las sillas, porque además de cargarlo hay que ir a por él y devolverlo. */
              [tieneFrituras,        setTieneFrituras,        "Hay frituras",             tieneFrituras ? `${numFrituras} ${numFrituras === 1 ? "sartén" : "sartenes"} parisiene (ajusta abajo)` : "sartén parisiene"],
              ...(evento !== "produccion"
                ? [[llevaPlanchaGas, setLlevaPlanchaGas, "Plancha de gas", "suma 1 bombona"]]
                : []),
              ...(evento !== "produccion"
                ? [[tieneBrindisCava, setTieneBrindisCava, "Brindis con cava", "dobla copas de cava"]]
                : []),
              [llevaPalomitera,      setLlevaPalomitera,      "Lleva palomitera",         "carrito de palomitera propio"],
              [llevaChillOut,        setLlevaChillOut,        "Lleva chill out",          llevaChillOut ? `${numChillOut} (ajusta abajo)` : "sofás/zona chill out"],
              [llevaJamonero,        setLlevaJamonero,        "Hay jamonero",             "añade platos extra para el corte"],
              // La mesa y los platos de tarta se cargaban siempre, sin poder quitarlos, y
              // la pala y el cuchillo no se cargaban nunca. Aquí se decide de una vez.
              ...(evento !== "produccion"
                ? [[llevaTarta,      setLlevaTarta,           "Hay tarta",                "mesa, platos, pala y cuchillo"]]
                : []),
              ...(evento !== "produccion"
                ? [[llevaAguasPequenas, setLlevaAguasPequenas, "Aguas pequeñas", "botellas individuales 33cl"]]
                : []),
              [hayDesayuno,          setHayDesayuno,          "Hay desayuno",             "sandwichera + más tazas de café"],
              ...(evento !== "boda"
                ? [[fuerzaTextilTela, setFuerzaTextilTela, "Servilletas de tela", "añade tela y reduce las de papel grandes"]]
                : []),
              ...(evento !== "cumpleanos" && evento !== "produccion"
                ? [[llevaJarrasCristal, setLlevaJarrasCristal, "Jarras de cristal", "para agua/zumos en mesa"]]
                : []),
            ].map(([val, fn, lab, sub]) => (
              <label key={lab} className="checkbox-label-normal">
                <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} />
                <span className="checkbox-texto">{lab} <span className="checkbox-sub">· {sub}</span></span>
              </label>
            ))}
          </div>
          {/* La plancha de gas entra en la condición: en un rodaje va siempre y sin
              esto, un rodaje sin paella ni frituras no enseñaba la fila entera y no
              había forma de decir cuántas planchas van (ni, con ellas, las bombonas). */}
          {(entranteCompartido || llevaPaella || tieneFrituras || llevaChillOut
            || llevaPlanchaGas || evento === "produccion") && (
            <div className="controls-row" style={{ marginTop: 12 }}>
              {entranteCompartido && (
                <>
                  <SegmentedControl label="Se comparte cada" value={personasPorPlatoEntrante} onChange={setPersonasPorPlatoEntrante} options={[3, 4]} />
                  {/* Cuántos entrantes distintos se reparten. Era un campo numérico y no
                      se veía: hay menús con dos entrantes para compartir (y algún día
                      con tres) y cada uno multiplica sus platos. Como selector se ve de
                      un vistazo lo que hay puesto. Si algún menú lleva más de tres, se
                      edita la cantidad del item a mano en la lista. */}
                  <SegmentedControl
                    label="Entrantes a compartir"
                    value={Math.min(3, Math.max(1, numEntrantesCompartir))}
                    onChange={setNumEntrantesCompartir}
                    options={[1, 2, 3]}
                  />
                </>
              )}
              {llevaPaella && (
                <>
                  <SegmentedControl label="Tamaño de paella" value={tipoPaella} onChange={setTipoPaella} options={["Auto", "Pequeña", "Mediana", "Grande"]} />
                  {/* Cuántas paelleras. En blanco = las que salen de la gente (una cada
                      30), que es como funcionaba antes; escribir un número manda sobre
                      la cuenta y arrastra paletas, difusores, trípodes y bombonas. */}
                  <div className="form-group controls-mini">
                    <span className="form-label">Nº de paellas</span>
                    <input
                      type="number"
                      className="form-input"
                      value={numPaellas || ""}
                      min="1"
                      placeholder={String(calcPaella(pax, tipoPaella, 0).n)}
                      onChange={e => setNumPaellas(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      En blanco salen {calcPaella(pax, tipoPaella, 0).n} por la gente
                    </span>
                  </div>
                </>
              )}
              {tieneFrituras && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº sartenes parisiene (frituras)</span>
                  <input type="number" className="form-input" value={numFrituras} min="1" onChange={e => setNumFrituras(Math.max(1, parseInt(e.target.value) || 1))} />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Ajusta bombonas, difusor, trípode y espumadera</span>
                </div>
              )}
              {/* En producción la plancha va fija, así que el número se ofrece siempre;
                  en el resto, solo si la llevan. Cada plancha lleva su bombona. */}
              {(llevaPlanchaGas || evento === "produccion") && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº planchas de gas</span>
                  <input type="number" className="form-input" value={numPlanchasGas} min="1" onChange={e => setNumPlanchasGas(Math.max(1, parseInt(e.target.value) || 1))} />
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Cada plancha suma su bombona</span>
                </div>
              )}
              {llevaChillOut && (
                <div className="form-group controls-mini">
                  <span className="form-label">Nº chill out</span>
                  <input type="number" className="form-input" value={numChillOut} min="1" onChange={e => setNumChillOut(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
              )}
            </div>
          )}
          <hr />
          <div className="section-title">Equipamiento</div>
          <div className="equip-grid">
            {/* Las sillas se eligen en el bloque ALQUILERES (arriba, con las recogidas):
                según de quién sean hay que ir a buscarlas y devolverlas. */}
            <SegmentedControl label="Bandejas de servicio" value={tipoBandejas} onChange={setTipoBandejas} options={["Madera", "Plata", "Mixto"]} />
            <div className="equip-pareja">
              <div className="form-group">
                <span className="form-label">Madera extra</span>
                <input type="number" className="form-input" value={extraBandejasMadera || ""} placeholder="0" min="0" onChange={e => setExtraBandejasMadera(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
              <div className="form-group">
                <span className="form-label">Plata extra</span>
                <input type="number" className="form-input" value={extraBandejasPlata || ""} placeholder="0" min="0" onChange={e => setExtraBandejasPlata(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
            </div>
            {evento !== "produccion" && (
              <>
                <SegmentedControl label="Nevera" value={tipoNevera} onChange={setTipoNevera} options={["No lleva", "Mediana", "Grande"]} />
                <SegmentedControl label="Congelador" value={tipoCongelador} onChange={setTipoCongelador} options={["No lleva", "Mediana", "Grande"]} />
              </>
            )}
            {/* "No lleva" no necesita nada más: los tres generadores solo añaden horno
                cuando el valor es pequeño/grande/ambos, así que con cualquier otro
                valor no se carga ninguno. */}
            <SegmentedControl label="Horno" value={tipoHorno} onChange={setTipoHorno} options={["Pequeño", "Grande", "Ambos", "No lleva"]} />
            <SegmentedControl label="Cafetera" value={tipoCafetera} onChange={setTipoCafetera} options={["Nespresso", "Bar", "Grande"]} />
            {/* La temporada solo mueve bebida (cerveza, reparto de vino y tinto de
                verano), así que en producción no se ofrece: un rodaje no lleva alcohol. */}
            {evento !== "produccion" && (
              <SegmentedControl
                label={`Temporada${estacion === "auto" ? ` · ahora ${mesVerano ? "verano" : "invierno"}` : ""}`}
                value={estacion === "auto" ? "Auto" : (estacion === "verano" ? "Verano" : "Invierno")}
                onChange={v => setEstacion(v === "Auto" ? "auto" : v.toLowerCase())}
                options={["Auto", "Verano", "Invierno"]}
              />
            )}
            {/* Vajilla. El estilo del plato se elige en TODOS los tipos de evento
                (antes cumpleaños y producción solo tenían un interruptor). Donde se
                elige el estilo está también la opción "No llevan", en vez de un
                interruptor aparte, y principal y postre son independientes: se puede
                llevar postre sin principal y al revés. Los cubiertos siguen con
                interruptor porque casi siempre van. */}
            {evento !== "cumpleanos" && evento !== "produccion" && (
              <SegmentedControl label="Barbacoa" value={tipoBBQ} onChange={setTipoBBQ} options={["No lleva", "Pequeña", "Grande"]} />
            )}
            <div className="equip-pareja">
              {/* Cuántos manteles lo sigue calculando la app por las mesas; aquí solo
                  se elige de cuáles. Vacío = el de siempre según el tipo de evento. */}
              <SegmentedControl
                label="Manteles"
                value={colorManteles || colorPorDefecto(evento)}
                onChange={setColorManteles}
                options={["Beige", "Negros", "Ambos"]}
              />
              {(colorManteles || colorPorDefecto(evento)) === "Ambos" && (
                <div className="form-group">
                  <span className="form-label">% BEIGE (el resto, negros)</span>
                  <input
                    type="number" className="form-input" min="0" max="100"
                    value={porcentajeBeige}
                    onChange={e => setPorcentajeBeige(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  />
                </div>
              )}
            </div>
            <div className="equip-pareja">
              <SelectConOtro
                label="Estilo plato principal"
                value={llevaPlatos ? estiloPlatoPrincipal : "No llevan"}
                onChange={v => { if (v === "No llevan") setLlevaPlatos(false); else { setLlevaPlatos(true); setEstiloPlatoPrincipal(v); } }}
                options={["Blanco liso", "Relieve blanco", "Verde", "Metálico"]}
                opcionNinguna="No llevan"
              />
              <SelectConOtro
                label="Estilo plato postre"
                value={llevaPlatosPostre ? estiloPlatoPostre : "No llevan"}
                onChange={v => { if (v === "No llevan") setLlevaPlatosPostre(false); else { setLlevaPlatosPostre(true); setEstiloPlatoPostre(v); } }}
                options={["Blanco", "Verde", "Negro/gris"]}
                opcionNinguna="No llevan"
              />
            </div>
            {soloBandeja && (llevaPlatos || llevaPlatosPostre) && (
              <div className="equip-aviso">Con "Solo bandeja" la comida va toda en bandeja, así que los platos no se cargan aunque aquí tengan estilo elegido.</div>
            )}
            <SegmentedControl label="Cubiertos" value={llevaCubiertos ? "Llevan" : "No llevan"} onChange={v => setLlevaCubiertos(v === "Llevan")} options={["Llevan", "No llevan"]} />
            {/* Carpas y generador son equipo estándar de rodaje, no un extra que se
                añade: van aquí con el resto del equipamiento y las cantidades se
                calculan solas. El "No llevan" es para el sitio puntual que ya tiene
                sombra o luz propia. */}
            {/* El generador está en ALQUILERES: siempre viene de SOS. Las carpas son
                nuestras (8 en almacén), así que su interruptor se queda aquí; si hacen
                falta más, se marcan como alquiler en ese bloque. */}
            {evento === "produccion" && (
              <SegmentedControl
                label="Aguas pequeñas"
                value={tipoAguaPequena || "Sin decir"}
                onChange={v => setTipoAguaPequena(v === "Sin decir" ? "" : v)}
                options={["Plástico", "Cartón", "Sin decir"]}
              />
            )}
            {evento === "produccion" && (
              <SegmentedControl
                label="Carpas"
                value={llevaCarpas ? "Llevan" : "No llevan"}
                onChange={v => {
                  setLlevaCarpas(v === "Llevan");
                  // Sin carpas no hay carpas que alquilar: se apaga también su recogida
                  if (v !== "Llevan" && alquilaCarpas) {
                    setAlquilaCarpas(false);
                    sincronizaAlquiler("carpas", false);
                  }
                }}
                options={["Llevan", "No llevan"]}
              />
            )}
            {/* Cuántas. Vacío = las que salen de la cuenta por pax; un número manda
                sobre ella, porque el sitio lo ha visto una persona y la cuenta no.
                Si pasa de las 8 del almacén, se dice aquí mismo cuántas alquilar. */}
            {evento === "produccion" && llevaCarpas && (
              <div className="form-group">
                <span className="form-label">Nº DE CARPAS</span>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  placeholder={String(carpasRecomendadas(paxCarpas))}
                  value={numCarpas || ""}
                  onChange={e => {
                    const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setNumCarpas(n);
                    // Lo que pase de lo que hay en almacén se alquila, con su recogida
                    const hayQueAlquilar = carpasPorAlquilar(n > 0 ? n : carpasRecomendadas(paxCarpas)) > 0;
                    if (hayQueAlquilar !== alquilaCarpas) {
                      setAlquilaCarpas(hayQueAlquilar);
                      sincronizaAlquiler("carpas", hayQueAlquilar, conceptoAlquiler("carpas"));
                    }
                  }}
                />
                {carpasPorAlquilar(numCarpas || carpasRecomendadas(paxCarpas)) > 0 && (
                  <span className="checkbox-sub">
                    Tenemos {CARPAS_EN_ALMACEN}: hay que alquilar {carpasPorAlquilar(numCarpas || carpasRecomendadas(paxCarpas))} a Support On Set
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        </div>
        <div className="checklist-main">

        {/* BUSCADOR + DESHACER */}
        <div className="animate-entrance search-row" style={{ animationDelay: "0.2s" }}>
          <input type="text" className="search-input-main" placeholder="Buscar un material..." value={filtro} onChange={e => setFiltro(e.target.value)} />
          {historial.length > 0 && (
            <button className="btn btn-outline btn-deshacer" onClick={handleDeshacer} title="Deshace el último cambio manual (cantidad editada o item quitado)"><Undo2 size={14} /> Deshacer</button>
          )}
        </div>

        {/* AÑADIR ITEM PERSONALIZADO */}
        {!soloMarcar && (
        <div className="config-card animate-entrance add-item-card" style={{ animationDelay: "0.22s" }}>
          <div className="add-item-row">
            <div className="form-group" style={{ flex: 2 }}>
              <span className="form-label">Añadir item personalizado</span>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Vela aromática"
                value={nuevoItemLabel}
                onChange={e => handleLabelItemManual(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddItemManual()}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <span className="form-label">Cantidad</span>
              <input
                type="text"
                className="form-input"
                placeholder="1"
                value={nuevoItemCantidad}
                onChange={e => setNuevoItemCantidad(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddItemManual()}
              />
            </div>
            <div className="form-group add-item-categoria" style={{ flex: 2 }}>
              <span className="form-label">Categoría</span>
              <select
                className="form-select"
                value={nuevoItemCategoria || CATEGORIA_MANUAL}
                onChange={e => {
                  if (e.target.value === "__nueva__") {
                    setDialogo({
                      tipo: "prompt",
                      titulo: "Nueva categoría",
                      placeholder: "Ej: Atrezzo photocall",
                      textoConfirmar: "Crear",
                      onConfirm: (nueva) => { setNuevoItemCategoria(nueva); setCategoriaTocada(true); },
                    });
                    return;
                  }
                  setNuevoItemCategoria(e.target.value); setCategoriaTocada(true);
                }}
              >
                {categoriasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                {nuevoItemCategoria && !categoriasDisponibles.includes(nuevoItemCategoria) && nuevoItemCategoria !== CATEGORIA_MANUAL && (
                  <option value={nuevoItemCategoria}>{nuevoItemCategoria}</option>
                )}
                <option value={CATEGORIA_MANUAL}>{CATEGORIA_MANUAL}</option>
                <option value="__nueva__">+ Nueva categoría…</option>
              </select>
            </div>
            <label className="add-item-alquiler-check" title="Marcar como alquiler proveedor (si no está incluido)">
              <input type="checkbox" checked={nuevoItemAlquiler} onChange={e => setNuevoItemAlquiler(e.target.checked)} />
              <Tag size={12} /> Alquiler proveedor
            </label>
            <button className="btn btn-navy-outline add-item-btn" onClick={handleAddItemManual} disabled={!nuevoItemLabel.trim()}>+ Añadir</button>
          </div>
        </div>
        )}

        {/* CATEGORÍAS */}
        {filtered.map((cat, idx) => {
          const isOpen = openCategories[cat.nombre] !== false;
          const infoCat = infoCategoria(cat.nombre);
          return (
            <div key={cat.nombre} className={`category-section animate-entrance ${isOpen ? "is-open" : ""}`} style={{ animationDelay: `${0.25 + idx * 0.04}s`, borderTopColor: infoCat.color, borderTopWidth: 3 }}>
              <div className="category-header" role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => toggleCategory(cat.nombre)} onKeyDown={e => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && toggleCategory(cat.nombre)}>
                <span className="cat-name"><span className="cat-icon" style={{ background: infoCat.color, color: infoCat.texto }}>{infoCat.Comp && <infoCat.Comp size={16} strokeWidth={2.2} />}</span>{cat.nombre}</span>
                <span className="cat-count">
                  <button className="cat-edit-btn" onClick={e => { e.stopPropagation(); handleMoverCategoria(cat.nombre, -1); }} disabled={idx === 0} title="Subir esta categoría" aria-label={`Subir la categoría ${cat.nombre}`}><ChevronUp size={13} /></button>
                  <button className="cat-edit-btn" onClick={e => { e.stopPropagation(); handleMoverCategoria(cat.nombre, 1); }} disabled={idx === checklist.length - 1} title="Bajar esta categoría" aria-label={`Bajar la categoría ${cat.nombre}`}><ChevronDown size={13} /></button>
                  <button className="cat-edit-btn" onClick={e => { e.stopPropagation(); handleRenombrarCategoria(cat.nombre); }} title="Renombrar categoría" aria-label={`Renombrar categoría ${cat.nombre}`}><Pencil size={13} /></button>
                  {cat.items.length}<span className="arrow">▼</span>
                </span>
              </div>
              <div className="item-list-wrapper">
                <div className="item-list">
                  {cat.items.map(([label, qty, manualIdx, labelOriginal, esAlquilerManual, sufijo], i) => {
                    const keyId = `${cat.nombre}::${labelOriginal ?? label}`;
                    const editando = editandoNombre === keyId;
                    return (
                      <FilaItem
                        key={i}
                        categoria={cat.nombre}
                        label={label}
                        labelOriginal={labelOriginal}
                        displayQty={String(qty && qty.u ? qty.u : qty)}
                        manualIdx={manualIdx}
                        esAlquilerManual={esAlquilerManual}
                        sufijo={sufijo}
                        editado={overridesManuales[keyId] !== undefined}
                        renombrado={manualIdx === undefined && nombresManuales[keyId] !== undefined}
                        editando={editando}
                        // Solo la fila que se está editando recibe estos dos: si los
                        // recibieran todas, escribir un nombre repintaría la lista entera
                        nombreTemporal={editando ? nombreTemporal : null}
                        alquilerTemporal={editando ? alquilerTemporal : null}
                        acciones={accionesFilaRef}
                        soloMarcar={soloMarcar}
                      />
                    );
                  })}
                  {(ocultosPorCategoria[cat.nombre] || []).length > 0 && (
                    <div className="items-quitados">
                      <span className="items-quitados-texto">
                        {ocultosPorCategoria[cat.nombre].length} item{ocultosPorCategoria[cat.nombre].length === 1 ? "" : "s"} quitado{ocultosPorCategoria[cat.nombre].length === 1 ? "" : "s"}
                        <em title={ocultosPorCategoria[cat.nombre].join(" · ")}>{ocultosPorCategoria[cat.nombre].join(" · ")}</em>
                      </span>
                      <button className="items-quitados-btn" onClick={() => handleRecuperarOcultos(cat.nombre)}>
                        <RotateCcw size={13} /> Recuperar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
        </div>
      </div>
    </>
  );
}
