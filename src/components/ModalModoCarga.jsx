import { useState, useEffect } from "react";
import {
  Package, ClipboardCheck, Truck, Undo2, BarChart3, Clock, AlertTriangle, Check,
  Bell, BellOff, Euro, FileText, Pause, Play, RotateCcw, X,
} from "lucide-react";
import { IconoCategoria, IconoItem, infoCategoria } from "./Iconos.jsx";
import { fmtCantidadCompleta, quitarItemsSinCantidad } from "../checklist-format.js";
import { FASES_TIEMPO, estimarTiemposCarga } from "../tiempos-carga.js";
import { leerPrecios, guardarPrecios, parsePreciosPegados } from "../precios.js";
import PanelBebida from "./PanelBebida.jsx";
import Escaleta from "./Escaleta.jsx";

// ─── MODO CARGA (check interactivo, sincronizado por el link del evento) ──────
// Pantalla simple pensada para el móvil mientras se carga/descarga el camión. Dos
// modos: "Salida" (marcar lo que sale, antes del evento) y "Vuelta" (marcar lo que
// vuelve + contar roturas/pérdidas, al recoger). Todo se guarda en el mismo estado
// del evento que ya se sincroniza en tiempo real (eventoNubeId): si varias personas
// abren el link a la vez ven los checks de las demás al momento, y queda guardado en
// la nube para poder consultarlo o exportarlo cuando haga falta.
export default function ModalModoCarga({ checklist: checklistCompleta, preparados = {}, checkeados, vueltos, roturas, marcasRevisar = {}, onTogglePreparado, onToggleSale, onVuelve, onRoturas, notasCheck = {}, onToggleNota, cronos = {}, onCronoStart, onCronoPause, onCronoReset, onClose, sinCerrar = false, meta = {}, onGuardarPrecios, preciosAlDia = 0, factoresBebida = {}, calibracionBebida = {}, onCambiarBebida }) {
  // Los items sin cantidad real ("—" o vacíos, a decidir in situ) no aportan nada
  // durante la carga — solo lían. Se quedan fuera aquí igual que en Word/Vista previa.
  // La categoría "Personal" (camareros/logística/cocina) es solo informativa: no se
  // carga ni se devuelve, así que también se deja fuera de Modo carga.
  const checklist = quitarItemsSinCantidad(checklistCompleta).filter(c => !/personal/i.test(c.nombre));
  const [modo, setModo] = useState("salida"); // preparacion | salida | vuelta
  const [verResumen, setVerResumen] = useState(false);
  const [precios, setPrecios] = useState(() => leerPrecios());
  const [editandoPrecios, setEditandoPrecios] = useState(false);
  const totalItems = checklist.reduce((acc, c) => acc + c.items.length, 0);
  // Items con cantidad numérica (los que se pueden "marcar todo vuelto"). Sirve para
  // alternar el botón entre marcar y desmarcar todo en la pestaña Vuelta.
  // Todas las filas de la Vuelta se pueden marcar, tengan número o no. Las que llevan
  // una cantidad en texto (ej. "Copas metálicas · Todas") se marcan con true, que la
  // app ya entiende como "volvió entero". Antes se quedaban fuera del "marcar todo"
  // y encima no tenían casilla propia: no había forma de darlas por vueltas.
  const itemsMarcables = checklist.flatMap(c => c.items
    .map(([, q, , lo]) => {
      const n = parseFloat(String(q && q.u ? q.u : q).replace(",", "."));
      return { key: `${c.nombre}::${lo}`, valor: isNaN(n) ? true : String(n) };
    }));
  const todoVuelto = itemsMarcables.length > 0 && itemsMarcables.every(it => { const v = vueltos[it.key]; return v !== undefined && v !== ""; });
  const contarSi = (cumple) => checklist.reduce((acc, c) => acc + c.items.filter(([, , , lo]) => cumple(`${c.nombre}::${lo}`)).length, 0);
  const totalPreparados = contarSi(k => preparados[k]);
  // Lo que está preparado pero todavía sin cargar. Es el camino normal —se prepara y
  // luego se sube al camión— así que subirlo de golpe ahorra repasar la lista entera
  // item a item. También es la vía para recuperar una carga que se haya perdido,
  // porque lo preparado y lo cargado suelen ser lo mismo.
  const preparadosSinCargar = checklist.flatMap(c => c.items
    .map(([, , , lo]) => `${c.nombre}::${lo}`)
    .filter(k => preparados[k] && !checkeados[k]));
  const totalMarcados = modo === "preparacion" ? totalPreparados
    : modo === "salida" ? contarSi(k => checkeados[k])
    : contarSi(k => { const v = vueltos[k]; return v !== undefined && v !== ""; });
  const palabraModo = modo === "preparacion" ? "preparados" : modo === "salida" ? "cargados" : "vueltos";
  // Items marcados a los que alguien les ha cambiado la cantidad DESPUÉS: siguen
  // marcados (es trabajo hecho, no se borra) pero hay que volver a contarlos. El aviso
  // de "revisar" vive en su fila, y en una lista de 130 ítems eso es no verlo nunca:
  // quien carga no va a recorrer la lista entera por si acaso. Aquí se cuentan para
  // poder decirlo arriba, donde sí se mira, y llevar de un toque al primero.
  const porRevisar = checklist.flatMap(c => c.items
    .map(([, , , lo]) => `${c.nombre}::${lo}`)
    .filter(k => marcasRevisar[k] && (modo === "preparacion" ? preparados[k] : modo === "salida" ? checkeados[k] : vueltos[k] !== undefined && vueltos[k] !== "")));
  const irAlPrimeroPorRevisar = () => {
    const fila = document.querySelector(`[data-revisar="${CSS.escape(porRevisar[0] || "")}"]`);
    if (fila) fila.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const totalRoturas = Object.values(roturas).reduce((acc, n) => acc + (parseInt(n, 10) || 0), 0);
  const pct = totalItems > 0 ? Math.round((totalMarcados / totalItems) * 100) : 0;
  // Tiempos estimados (Preparación / Carga / Descarga). El criterio vive en
  // estimarTiemposCarga() para compartirlo con el formulario. El nº de logística marca
  // el reparto; la descarga lleva recargo por fatiga según las horas de jornada.
  const numLogistica = Math.max(1, meta.numLogistica || 1);
  const horasJornada = meta.horasJornada || 0;
  const paxTotal = meta.totalPax || 0;
  const { prepMin, cargaMin, descargaMin, montajeMin, fatiga, totalMin } = estimarTiemposCarga({ totalItems, pax: paxTotal, numLogistica, horasJornada }, meta.calibracion);
  const fmtMin = (m) => {
    if (m <= 0) return "—";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? (min > 0 ? `${h} h ${min} min` : `${h} h`) : `${min} min`;
  };
  // Cronómetro en vivo: refresco cada segundo mientras algún cronómetro esté corriendo.
  //
  // Vigila las CUATRO fases. Antes solo miraba carga y descarga, así que el cronómetro
  // de preparación y el de montaje corrían por dentro pero el número se quedaba clavado
  // en pantalla: solo saltaba cuando algo repintaba por otro motivo. Un cronómetro que
  // no se ve correr es un cronómetro que no funciona.
  const [ahoraTick, setAhoraTick] = useState(Date.now());
  const algunoCorriendo = FASES_TIEMPO.some(f => cronos[f] && cronos[f].running);
  useEffect(() => {
    if (!algunoCorriendo) return;
    setAhoraTick(Date.now()); // sincroniza YA al arrancar, si no el primer frame daría un valor raro
    const id = setInterval(() => setAhoraTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [algunoCorriendo]);
  const cronoMs = (fase) => {
    const c = cronos[fase];
    if (!c) return 0;
    // Math.max evita el negativo del primer render antes de que ahoraTick se sincronice
    const enMarcha = c.running && c.since ? Math.max(0, ahoraTick - c.since) : 0;
    return (c.ms || 0) + enMarcha;
  };
  const fmtCrono = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };
  // ─── CRONÓMETROS QUE SE QUEDAN PUESTOS ──────────────────────────────────────
  // Cada cronómetro solo se ve en SU pestaña (el de preparación en Preparación, el de
  // montaje en Salida, el de descarga en Vuelta), así que en cuanto cambias de pestaña
  // deja de estar delante y es facilísimo olvidárselo corriendo.
  //
  // Y no es un dato inocente que se quede mal: los tiempos cronometrados alimentan la
  // calibración de los estimados (ver estimarTiemposCarga). Una carga que marque catorce
  // horas porque nadie paró el reloj no da solo un dato malo — desajusta las
  // estimaciones de todos los eventos siguientes.
  //
  // Por eso el aviso va arriba del todo, FUERA de las pestañas, y trae el botón de parar
  // dentro: si hay que ir a buscar el cronómetro para pararlo, no se para.
  const ESTIMADO_MIN_FASE = { prep: prepMin, carga: cargaMin, descarga: descargaMin, montaje: montajeMin };
  const NOMBRE_FASE = { prep: "preparación", carga: "carga", descarga: "descarga", montaje: "montaje" };
  // Sin estimado con el que comparar, cuatro horas seguidas ya es olvido: ninguna de
  // estas fases dura tanto.
  const OLVIDO_MS = 4 * 60 * 60 * 1000;
  const cronosPasados = FASES_TIEMPO
    .filter(f => cronos[f] && cronos[f].running)
    .map(f => {
      const ms = cronoMs(f);
      const estMs = (ESTIMADO_MIN_FASE[f] || 0) * 60000;
      return {
        fase: f, ms, estMs,
        pasado: estMs > 0 && ms > estMs,
        // Pasarse un poco es ir con retraso; pasar del triple es que se quedó puesto, y
        // el aviso cambia de tono porque la acción que toca es distinta.
        olvidado: estMs > 0 ? ms > estMs * 3 : ms > OLVIDO_MS,
      };
    })
    .filter(x => x.pasado || x.olvidado);
  // Recordatorios del evento: cada línea de las notas se convierte en una tarea con
  // su propio check (coger comida del congelador, hielo, taxis, un material extra…).
  // Se marcan a mano según se van haciendo y todo queda guardado/sincronizado con el
  // evento. Cuando están todas hechas el bloque se colapsa a "completado". Se puede
  // silenciar del todo con el botón de campana.
  const notasTexto = (meta.notasEvento || "").trim();
  const notasItems = notasTexto
    .split(/[\n;]+/)
    .map(s => s.replace(/^[\s•·*✓\-–]+/, "").trim())
    .filter(Boolean);
  const notasHechas = notasItems.filter(t => notasCheck[t]).length;
  const notasCompletas = notasItems.length > 0 && notasHechas === notasItems.length;
  const [notaSilenciada, setNotaSilenciada] = useState(false);
  const mostrarRecordatorio = notasItems.length > 0 && !notaSilenciada;
  // Cronómetro de una fase (carga/descarga): empezar/seguir, pausar y reiniciar, con
  // el tiempo real corriendo y el estimado al lado para poder controlarlo en vivo.
  const renderCrono = (fase, estimadoMin, label) => {
    const c = cronos[fase] || {};
    const ms = cronoMs(fase);
    const corriendo = !!c.running;
    const estMs = estimadoMin * 60000;
    const sobre = estMs > 0 && ms > estMs;
    return (
      <div className={`crono-box ${corriendo ? "is-corriendo" : ""}`}>
        <div className="crono-info">
          <span className="crono-label"><Clock size={14} /> {label}</span>
          {estimadoMin > 0 && <span className="crono-estimado">estimado ~{fmtMin(estimadoMin)}{sobre ? " · pasado" : ""}</span>}
        </div>
        <div className="crono-acciones">
          <span className={`crono-tiempo ${sobre ? "is-sobre" : ""}`}>{fmtCrono(ms)}</span>
          {corriendo ? (
            <button className="btn crono-btn crono-btn-pause" onClick={() => onCronoPause && onCronoPause(fase)} title="Pausar" aria-label="Pausar cronómetro"><Pause size={14} /> <span className="crono-btn-texto">Pausar</span></button>
          ) : (
            <button className="btn crono-btn crono-btn-start" onClick={() => onCronoStart && onCronoStart(fase)} title={ms > 0 ? "Seguir" : "Empezar"} aria-label={ms > 0 ? "Seguir cronómetro" : "Empezar cronómetro"}><Play size={14} /> <span className="crono-btn-texto">{ms > 0 ? "Seguir" : "Empezar"}</span></button>
          )}
          <button className="btn btn-outline crono-btn crono-btn-reset" onClick={() => onCronoReset && onCronoReset(fase)} disabled={ms === 0 && !corriendo} title="Reiniciar a cero" aria-label="Reiniciar cronómetro"><RotateCcw size={14} /></button>
        </div>
      </div>
    );
  };
  // Resumen tipo hoja de cálculo: Carga Inicial / Vuelta / Consumo Real, agrupado por
  // categoría, igual que la plantilla en la que ya llevaban el control. "Vuelta" solo
  // se conoce si se ha registrado un valor en la pestaña Vuelta (número o, por datos
  // antiguos, el booleano de la versión previa: true = volvió todo).
  const fmtEur = (n) => `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
  const filasPorCategoria = checklist.map(cat => {
    const filas = cat.items.map(([label, qty, , labelOriginal, , sufijo]) => {
      const key = `${cat.nombre}::${labelOriginal}`;
      const valor = parseFloat(String(qty && qty.u ? qty.u : qty).replace(",", "."));
      const cargaInicial = isNaN(valor) ? null : valor;
      const raw = vueltos[key];
      let vuelta = null;
      if (raw === true) vuelta = cargaInicial;
      else if (raw !== undefined && raw !== "") vuelta = parseFloat(String(raw).replace(",", ".")) || 0;
      const consumoReal = (cargaInicial !== null && vuelta !== null) ? Math.max(0, cargaInicial - vuelta) : null;
      const rot = parseInt(roturas[key], 10) || 0;
      // Si el item se renombró a mano, se busca el precio por su nombre original
      // para que el coste no se pierda al cambiarle la etiqueta.
      const precio = precios[label] ?? precios[labelOriginal];
      // Se cobra lo que FALTA, y las roturas son parte de eso, no algo aparte. Antes se
      // sumaban las dos cosas: apuntar "vuelven 90 de 100" y "10 roturas" —que son las
      // mismas 10 copas— cobraba 20. Con el máximo sale bien en los cuatro casos:
      //   vuelven 100 y 5 rotas (vuelven rotas en la caja) → faltan 0, roturas 5 → 5
      //   vuelven 90 y 10 rotas (las que faltan)           → faltan 10, roturas 10 → 10
      //   vuelven 90 sin apuntar roturas                   → faltan 10             → 10
      //   sin apuntar la vuelta pero con 3 rotas           → roturas 3             → 3
      const costeTotal = (precio !== undefined && (consumoReal !== null || rot > 0))
        ? Math.max(consumoReal || 0, rot) * precio
        : null;
      // Volver más de lo que salió es imposible, y sin embargo pasaba: "cargadas 24,
      // vuelven 27". Normalmente es que la cantidad se recalculó DESPUÉS de apuntar la
      // vuelta (salieron 30, volvieron 27, y luego el pax bajó y la carga quedó en 24),
      // aunque también puede ser un número mal tecleado. En los dos casos la línea es
      // mentira y hay que verla: el consumo sale 0 y el coste 0, así que si no se marca
      // pasa por buena y esa merma no se cobra a nadie.
      const vueltaImposible = cargaInicial !== null && vuelta !== null && vuelta > cargaInicial;
      return { key, label, sufijo, cargaInicial, vuelta, consumoReal, roturas: rot, precio, costeTotal, vueltaImposible };
    });
    const subtotal = filas.reduce((acc, f) => acc + (f.costeTotal || 0), 0);
    return { nombre: cat.nombre, filas, subtotal };
  }).filter(c => c.filas.length > 0);
  const granTotal = filasPorCategoria.reduce((acc, c) => acc + c.subtotal, 0);
  const porPax = meta.totalPax > 0 ? granTotal / meta.totalPax : null;
  // Cuántas líneas se están quedando fuera del coste por no tener precio. Es el dato que
  // convierte "el total pone 340€" en "el total pone 340€ y le faltan 60 líneas": sin
  // esto, un total corto parece un evento barato en vez de un catálogo incompleto.
  const sinPrecio = filasPorCategoria.flatMap(c => c.filas)
    .filter(f => f.cargaInicial !== null && f.precio === undefined);
  const conPrecio = filasPorCategoria.flatMap(c => c.filas).filter(f => f.precio !== undefined).length;
  // Lo que cuestan solo las roturas, aparte de lo consumido: es el dato que dice si
  // conviene comprar cristalería más resistente o cambiar de cajas de transporte.
  const costeRoturas = filasPorCategoria.flatMap(c => c.filas)
    .reduce((acc, f) => acc + (f.precio !== undefined ? f.roturas * f.precio : 0), 0);
  const totalRoturasUds = filasPorCategoria.flatMap(c => c.filas).reduce((acc, f) => acc + f.roturas, 0);
  // Las categorías que más pesan, para verlo de un vistazo en vez de sumar columnas
  const ranking = filasPorCategoria
    .filter(c => c.subtotal > 0)
    .sort((a, b) => b.subtotal - a.subtotal);
  const handleGuardarPrecios = (texto) => {
    const nuevos = { ...precios, ...parsePreciosPegados(texto) };
    setPrecios(nuevos);
    // onGuardarPrecios lo pone App: guarda aquí Y sube, para que el equipo entero vea
    // los mismos costes. Sin él (banco de pruebas, o sin nube) se guarda solo aquí.
    (onGuardarPrecios || guardarPrecios)(nuevos);
    setEditandoPrecios(false);
  };

  // Si otra persona corrige un precio desde otro dispositivo, se refleja aquí sin tener
  // que cerrar el panel. preciosAlDia es solo una marca de tiempo que cambia cuando han
  // llegado precios nuevos: los de verdad se leen de donde están siempre.
  useEffect(() => { if (preciosAlDia) setPrecios(leerPrecios()); }, [preciosAlDia]);
  // Exporta el resumen a CSV (se abre en Excel/Sheets/Numbers). Separador ";" y BOM
  // UTF-8 para que Excel en español lo lea bien con tildes.
  const exportarResumenCSV = () => {
    const sep = ";";
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Categoría", "Producto", "Carga inicial", "Vuelta", "Consumo real", "Roturas", "Coste ud.", "Coste total"]];
    filasPorCategoria.forEach(cat => {
      cat.filas.forEach(f => rows.push([cat.nombre, f.label, f.cargaInicial ?? "", f.vuelta ?? "", f.consumoReal ?? "", f.roturas || "", f.precio !== undefined ? f.precio : "", f.costeTotal !== null ? f.costeTotal : ""]));
      rows.push([`Subtotal ${cat.nombre}`, "", "", "", "", "", "", cat.subtotal]);
    });
    rows.push(["TOTAL", "", "", "", "", "", "", granTotal]);
    const csv = "﻿" + rows.map(r => r.map(esc).join(sep)).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resumen_${(meta.nombreEvento || "evento").replace(/[^\w\-]+/g, "_")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div className={`preview-overlay ${sinCerrar ? "is-pantalla" : ""}`} onClick={sinCerrar ? undefined : onClose}>
      <div className="preview-modal carga-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div>
            <div className="preview-header-title"><Package size={16} /> Modo carga{meta.nombreEvento ? ` · ${meta.nombreEvento}` : ""}</div>
            <div className="preview-header-subtitle">
              {totalMarcados} de {totalItems} {palabraModo}
              {modo === "salida" && totalPreparados > 0 ? ` · ${totalPreparados} preparados` : ""}
              {totalRoturas > 0 ? ` · ${totalRoturas} roturas` : ""}
            </div>
            {/* Alguien ha cambiado una cantidad de algo que ya estaba marcado. Va aquí
                arriba, junto al recuento, porque es lo único que se mira sin scroll —
                y lleva de un toque a la fila, que buscarla entre 130 no es plan. */}
            {porRevisar.length > 0 && (
              <button type="button" className="carga-por-revisar" onClick={irAlPrimeroPorRevisar}
                      title="Se les cambió la cantidad después de marcarlos: hay que volver a contarlos">
                <AlertTriangle size={13} />
                <span>
                  {porRevisar.length === 1
                    ? "1 con la cantidad cambiada"
                    : `${porRevisar.length} con la cantidad cambiada`}
                </span>
                <span className="carga-por-revisar-ir">Ver →</span>
              </button>
            )}
            {/* Cronómetros pasados de tiempo o directamente olvidados. Aquí arriba
                porque es lo único que se ve sin scroll y sin cambiar de pestaña. */}
            {cronosPasados.map(({ fase, ms, estMs, olvidado }) => (
              <div key={fase} className={`carga-crono-aviso${olvidado ? " is-olvidado" : ""}`}>
                <AlertTriangle size={13} />
                <span className="carga-crono-aviso-texto">
                  {olvidado
                    ? `El cronómetro de ${NOMBRE_FASE[fase]} lleva ${fmtCrono(ms)} en marcha. ¿Se ha quedado puesto?`
                    : `Cronómetro de ${NOMBRE_FASE[fase]}: ${fmtCrono(ms)}, pasado de los ~${fmtMin(Math.round(estMs / 60000))} estimados.`}
                </span>
                <button type="button" className="carga-crono-aviso-parar"
                        onClick={() => onCronoPause && onCronoPause(fase)}>
                  Pararlo
                </button>
              </div>
            ))}
            <div className="carga-progreso"><div className="carga-progreso-fill" style={{ width: `${pct}%` }} /></div>
            {totalItems > 0 && (
              <div className="carga-tiempos" title={`Estimado a partir de ${totalItems} ítems y ${numLogistica} de logística${meta.logisticaReal ? " (del Equipo de logística)" : " (1 cada 60 pax)"}.\nPreparación = (30 + pax × 1 + ítems × 0,5) ÷ logística.\nCarga = (20 + ítems × 1,5) ÷ logística.\nDescarga ≈ 60% de la carga${fatiga > 0 ? ` +${Math.round(fatiga * 100)}% por fatiga (jornada de ${String(horasJornada).replace(".", ",")}h)` : ""}.\nMontaje in situ (todo el equipo) = 45 + pax × 1,1 + ítems × 0,4.`}>
                <Clock size={13} />
                <span><strong>Prep</strong> ~{fmtMin(prepMin)}</span>
                <span className="carga-tiempos-sep">·</span>
                <span><strong>Carga</strong> ~{fmtMin(cargaMin)}</span>
                <span className="carga-tiempos-sep">·</span>
                <span><strong>Descarga</strong> ~{fmtMin(descargaMin)}{fatiga > 0 ? " ⚠️" : ""}</span>
                <span className="carga-tiempos-sep">·</span>
                <span><strong>Montaje</strong> ~{fmtMin(montajeMin)}</span>
                <span className="carga-tiempos-sep">·</span>
                <span className="carga-tiempos-total"><strong>Total</strong> ~{fmtMin(totalMin)}</span>
                <span className="carga-tiempos-nota">
                  ({numLogistica} logística{meta.logisticaReal ? "" : ", estimado"})
                  {/* Si ya hay eventos cronometrados, el ajuste que se está aplicando se
                      dice en voz alta: nada de corregir los tiempos por detrás. */}
                  {meta.calibracion && (
                    <span className="carga-calibrado" title="Los tiempos estimados están ajustados con los cronómetros de tus eventos anteriores">
                      · ajustado con {meta.calibracion.nMedidos} eventos medidos
                      {FASES_TIEMPO.filter(f => meta.calibracion.factores[f]).map(f =>
                        ` · ${f} ×${meta.calibracion.factores[f].toFixed(2).replace(".", ",")}`).join("")}
                    </span>
                  )}
                </span>
              </div>
            )}
            {/* Debajo de los tiempos estimados porque sale de ellos: primero cuánto se
                tarda en cada cosa, y de ahí a qué hora toca cada una. */}
            <Escaleta datos={{
              horaInicio: meta.horaInicio,
              horasCoctel: meta.horasCoctel,
              horasCopas: meta.horasCopas,
              logisticaEquipo: meta.logisticaEquipo,
              totalItems, pax: meta.totalPax, numLogistica, horasJornada,
              calibracion: meta.calibracion,
            }} />
          </div>
          {!sinCerrar && (
            <button className="preview-close-btn" onClick={onClose} aria-label="Cerrar modo carga" title="Cerrar"><X size={14} /></button>
          )}
        </div>
        {/* Esta tira se queda fija al hacer scroll: marcando 150 items, el recuento y el
            cambio Salida/Vuelta son lo único que se usa todo el rato, y antes había que
            subir hasta arriba del todo para llegar a ellos. */}
        <div className="carga-modo-toggle">
          <div className="segmented-control">
            <button className={`segment-btn segment-preparacion ${modo === "preparacion" && !verResumen ? "active" : ""}`} onClick={() => { setModo("preparacion"); setVerResumen(false); }} title="Lo que ya está preparado (sacado del almacén y listo), antes de subirlo al camión"><ClipboardCheck size={14} /> Prep.</button>
            <button className={`segment-btn segment-salida ${modo === "salida" && !verResumen ? "active" : ""}`} onClick={() => { setModo("salida"); setVerResumen(false); }} title="Lo que ya está cargado en el camión"><Truck size={14} /> Salida</button>
            <button className={`segment-btn segment-vuelta ${modo === "vuelta" && !verResumen ? "active" : ""}`} onClick={() => { setModo("vuelta"); setVerResumen(false); }}><Undo2 size={14} /> Vuelta</button>
            <button className={`segment-btn segment-resumen ${verResumen ? "active" : ""}`} onClick={() => setVerResumen(true)}><BarChart3 size={14} /> Resumen</button>
          </div>
          {!verResumen && (
            <span className="carga-toggle-cuenta" title={`${totalMarcados} de ${totalItems} ${palabraModo}`}>
              {totalMarcados}/{totalItems}
            </span>
          )}
        </div>
        {mostrarRecordatorio && (
          <div className={`carga-nota-recordatorio ${notasCompletas ? "is-completo" : ""}`} role="note">
            <div className="carga-nota-cabecera">
              {notasCompletas ? <Check size={16} className="carga-nota-icono" /> : <Bell size={16} className="carga-nota-icono" />}
              <span className="carga-nota-titulo">Recordatorios del evento</span>
              <span className="carga-nota-progreso">{notasHechas}/{notasItems.length}</span>
              <button className="carga-nota-silenciar" onClick={() => setNotaSilenciada(true)} title="Silenciar los recordatorios" aria-label="Silenciar los recordatorios"><BellOff size={15} /></button>
            </div>
            <div className="carga-nota-lista">
              {notasItems.map((t, i) => {
                const hecho = !!notasCheck[t];
                return (
                  <label className={`carga-nota-item ${hecho ? "is-hecho" : ""}`} key={i}>
                    <input type="checkbox" checked={hecho} onChange={() => onToggleNota && onToggleNota(t)} />
                    <span className="carga-nota-item-texto">{t}</span>
                  </label>
                );
              })}
            </div>
            {notasCompletas && <div className="carga-nota-completo-msg"><Check size={14} /> Todos los recordatorios hechos</div>}
          </div>
        )}
        {verResumen ? (
          <div className="preview-body">
            <div className="resumen-precios-bar">
              <button className="btn btn-outline" onClick={() => setEditandoPrecios(v => !v)}><Euro size={14} /> {editandoPrecios ? "Cerrar precios" : "Precios"}</button>
              {filasPorCategoria.length > 0 && (
                <button className="btn btn-outline" onClick={exportarResumenCSV} title="Descarga el resumen en CSV (se abre en Excel, Sheets o Numbers)"><FileText size={14} /> Exportar (Excel)</button>
              )}
              {granTotal > 0 && (
                <span className="resumen-coste-total">
                  Coste estimado: <strong>{fmtEur(granTotal)}</strong>
                  {porPax !== null && <> · {fmtEur(porPax)}/pax</>}
                </span>
              )}
            </div>
            {editandoPrecios && (
              <div className="resumen-bloque">
                <div className="resumen-titulo">Precios por unidad</div>
                <p className="resumen-vacio">
                  Pega una línea por item, "Nombre: precio" (ej. "Copas de vino: 0,60"). Se guarda en
                  este navegador y se usa en cualquier evento — pega solo lo que quieras actualizar,
                  el resto del catálogo no se toca.
                </p>
                <textarea
                  className="form-input notas-textarea"
                  rows={5}
                  placeholder={"Copas de vino: 0,60\nVino blanco: 6,50\nRegletas y alargadores: 2"}
                  onBlur={e => { if (e.target.value.trim()) { handleGuardarPrecios(e.target.value); e.target.value = ""; } }}
                />
              </div>
            )}
            {/* Debajo de los precios y no arriba: primero se mira cómo ha ido el evento,
                y solo después se decide si hay que cargar distinto la próxima vez. */}
            {onCambiarBebida && (
              <PanelBebida
                factores={factoresBebida}
                calibracion={calibracionBebida}
                onCambiar={onCambiarBebida}
              />
            )}
            {filasPorCategoria.length === 0 ? (
              <p className="resumen-vacio">No hay items con cantidad para resumir.</p>
            ) : (
              <>
              {/* Las cifras grandes primero. La tabla de siete columnas tiene todo el
                  detalle, pero para saber "cómo ha ido" no hay que leer 150 filas. */}
              <div className="resumen-fichas">
                <div className="resumen-fichita is-total">
                  <span className="resumen-fichita-label">Coste del evento</span>
                  <strong className="resumen-fichita-valor">{fmtEur(granTotal)}</strong>
                  {porPax !== null && <span className="resumen-fichita-pie">{fmtEur(porPax)} por persona</span>}
                </div>
                <div className={`resumen-fichita ${totalRoturasUds > 0 ? "is-roturas" : ""}`}>
                  <span className="resumen-fichita-label">Roturas y pérdidas</span>
                  <strong className="resumen-fichita-valor">{totalRoturasUds}</strong>
                  <span className="resumen-fichita-pie">{costeRoturas > 0 ? `${fmtEur(costeRoturas)} de reposición` : "sin coste apuntado"}</span>
                </div>
                {sinPrecio.length > 0 && (
                  <button
                    type="button"
                    className="resumen-fichita is-falta"
                    onClick={() => setEditandoPrecios(true)}
                    title={`Sin precio: ${sinPrecio.slice(0, 12).map(f => f.label).join(", ")}${sinPrecio.length > 12 ? "…" : ""}`}
                  >
                    <span className="resumen-fichita-label">Sin precio todavía</span>
                    <strong className="resumen-fichita-valor">{sinPrecio.length}</strong>
                    <span className="resumen-fichita-pie">de {sinPrecio.length + conPrecio} · pon los precios →</span>
                  </button>
                )}
              </div>

              {/* En qué se va el dinero, sin sumar columnas a mano */}
              {ranking.length > 0 && (
                <div className="resumen-bloque">
                  <div className="resumen-titulo">En qué se va</div>
                  <div className="resumen-ranking">
                    {ranking.map(c => (
                      <div className="resumen-ranking-fila" key={c.nombre}>
                        <span className="resumen-ranking-nombre">
                          <span className="cat-icon-mini" style={{ background: infoCategoria(c.nombre).color, color: infoCategoria(c.nombre).texto }}>
                            <IconoCategoria nombre={c.nombre} size={11} />
                          </span>
                          {c.nombre}
                        </span>
                        <span className="resumen-ranking-barra">
                          <span
                            className="resumen-ranking-relleno"
                            style={{ width: `${granTotal > 0 ? Math.max(2, (c.subtotal / granTotal) * 100) : 0}%`, background: infoCategoria(c.nombre).color }}
                          />
                        </span>
                        <span className="resumen-ranking-cifra">{fmtEur(c.subtotal)}</span>
                        <span className="resumen-ranking-pct">{granTotal > 0 ? Math.round((c.subtotal / granTotal) * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="resumen-tabla-wrap">
                <table className="resumen-tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Carga inicial</th>
                      <th>Vuelta</th>
                      <th>Consumo real</th>
                      <th>Roturas</th>
                      <th>Coste ud.</th>
                      <th>Coste total</th>
                    </tr>
                  </thead>
                  {filasPorCategoria.map(cat => (
                    <tbody key={cat.nombre}>
                      <tr className="resumen-cat-header" style={{ background: infoCategoria(cat.nombre).color }}>
                        <td colSpan={7} style={{ color: infoCategoria(cat.nombre).texto }}><IconoCategoria nombre={cat.nombre} size={14} /> {cat.nombre}</td>
                      </tr>
                      {cat.filas.map(f => (
                        <tr key={f.key}>
                          <td className="resumen-tabla-producto" title={f.label}><IconoItem label={f.label} size={13} /> {f.label}</td>
                          <td>{f.cargaInicial ?? "—"}{f.sufijo ? ` ${f.sufijo}` : ""}</td>
                          <td className={f.vueltaImposible ? "resumen-celda-imposible" : ""}
                              title={f.vueltaImposible ? `Vuelven ${f.vuelta} de ${f.cargaInicial} cargadas: imposible. Suele pasar cuando la cantidad se recalcula después de apuntar la vuelta. Revísalo, porque así esta línea no cobra la merma.` : undefined}>
                            {f.vuelta ?? "—"}{f.vueltaImposible ? " ⚠️" : ""}
                          </td>
                          <td>{f.consumoReal ?? "—"}</td>
                          <td className={f.roturas > 0 ? "resumen-celda-rotura" : ""}>{f.roturas > 0 ? f.roturas : "—"}</td>
                          <td className={f.precio === undefined && f.cargaInicial !== null ? "resumen-celda-sinprecio" : ""}
                              title={f.precio === undefined && f.cargaInicial !== null ? "Sin precio: esta línea no suma al total" : undefined}>
                            {f.precio !== undefined ? fmtEur(f.precio) : "—"}
                          </td>
                          <td>{f.costeTotal !== null ? fmtEur(f.costeTotal) : "—"}</td>
                        </tr>
                      ))}
                      <tr className="resumen-subtotal-row">
                        <td colSpan={6}>Subtotal {cat.nombre}</td>
                        <td>{fmtEur(cat.subtotal)}</td>
                      </tr>
                    </tbody>
                  ))}
                  <tfoot>
                    <tr className="resumen-total-row">
                      <td colSpan={6}>TOTAL</td>
                      <td>{fmtEur(granTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </>
            )}
          </div>
        ) : (
        <div className="preview-body">
          {modo === "preparacion" && renderCrono("prep", prepMin, "Cronómetro de preparación")}
          {modo === "salida" && (
            <>
              {renderCrono("carga", cargaMin, "Cronómetro de carga")}
              {/* El montaje es la fase peor estimada, así que también se cronometra:
                  con varios eventos medidos se puede afinar la hora de fin sugerida. */}
              {renderCrono("montaje", montajeMin, "Cronómetro de montaje")}
            </>
          )}
          {/* Subir al camión de golpe todo lo que ya está preparado. Lo normal es que
              coincidan: lo que se ha preparado es justo lo que se carga. Marcarlo uno a
              uno en una lista de 130 items es media hora, y además es la forma de
              rehacer una carga que se haya perdido. NO desmarca nada: solo añade. */}
          {modo === "salida" && preparadosSinCargar.length > 0 && (
            <button
              className="btn btn-outline carga-todo-vuelto"
              onClick={() => preparadosSinCargar.forEach(k => onToggleSale(k))}
              title="Da por cargado todo lo que ya está marcado como preparado. No quita ninguna marca."
            ><Check size={15} /> Cargar todo lo preparado ({preparadosSinCargar.length})</button>
          )}
          {modo === "vuelta" && renderCrono("descarga", descargaMin, "Cronómetro de descarga")}
          {modo === "vuelta" && (
            <button
              className={`btn btn-outline carga-todo-vuelto ${todoVuelto ? "is-desmarcar" : ""}`}
              onClick={() => itemsMarcables.forEach(it => onVuelve(it.key, todoVuelto ? "" : it.valor))}
              title={todoVuelto ? "Quita la marca de vuelto de todos los items" : "Marca todos los items como que volvieron completos (luego ajustas los que falten y las roturas)"}
            >{todoVuelto ? <><X size={15} /> Desmarcar todo</> : <><Check size={15} /> Marcar todo como vuelto</>}</button>
          )}
          {checklist.map(cat => (
            <div className="preview-category" key={cat.nombre}>
              <div className="preview-category-header" style={{ borderLeftColor: infoCategoria(cat.nombre).color }}>
                <span className="cat-icon-mini" style={{ background: infoCategoria(cat.nombre).color, color: infoCategoria(cat.nombre).texto }}><IconoCategoria nombre={cat.nombre} /></span>
                <span>{cat.nombre}</span>
              </div>
              <div className="carga-lista">
                {cat.items.map(([label, qty, , labelOriginal, , sufijo], i) => {
                  const key = `${cat.nombre}::${labelOriginal}`;
                  // Preparación y Salida son la misma fila con distinta marca. Cada una
                  // enseña en pequeño cómo va la otra: preparando ves lo que ya está en
                  // el camión, y cargando ves lo que venía preparado.
                  if (modo !== "vuelta") {
                    const enPreparacion = modo === "preparacion";
                    const marcado = enPreparacion ? !!preparados[key] : !!checkeados[key];
                    const otroMarcado = enPreparacion ? !!checkeados[key] : !!preparados[key];
                    return (
                      <div className={`carga-row ${marcado ? "is-marcado" : ""}`} key={i}
                           data-revisar={marcado && marcasRevisar[key] ? key : undefined}>
                        <label className="carga-row-principal">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => (enPreparacion ? onTogglePreparado && onTogglePreparado(key) : onToggleSale(key))}
                          />
                          <span className="carga-nombre"><IconoItem label={label} /> <span className="carga-nombre-texto">{label}</span></span>
                          {otroMarcado && (
                            <span className={`carga-marca-otra ${enPreparacion ? "is-cargado" : "is-preparado"}`}
                                  title={enPreparacion ? "Ya está cargado en el camión" : "Estaba marcado como preparado"}>
                              {enPreparacion ? <Truck size={11} /> : <ClipboardCheck size={11} />}
                              <span className="carga-marca-otra-texto">{enPreparacion ? "cargado" : "prep."}</span>
                            </span>
                          )}
                          {/* La cantidad cambió DESPUÉS de marcarlo: la marca se respeta
                              (es trabajo hecho) pero hay que volver a contarlo. */}
                          {marcado && marcasRevisar[key] && (
                            <span className="carga-marca-otra is-revisar"
                                  title="La cantidad ha cambiado desde que lo marcaste: conviene volver a contarlo">
                              <AlertTriangle size={11} />
                              <span className="carga-marca-otra-texto">revisar</span>
                            </span>
                          )}
                          <span className="carga-cantidad">{fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</span>
                        </label>
                      </div>
                    );
                  }
                  const valorVuelta = vueltos[key];
                  const marcado = valorVuelta !== undefined && valorVuelta !== "";
                  const cantidadCompletaNum = parseFloat(String(qty && qty.u ? qty.u : qty).replace(",", "."));
                  const cantidadCompleta = isNaN(cantidadCompletaNum) ? null : cantidadCompletaNum;
                  const vueltaTexto = valorVuelta === true
                    ? String(cantidadCompleta || "")
                    : (valorVuelta ?? "");
                  const vinoTodo = cantidadCompleta !== null
                    ? parseFloat(String(vueltaTexto).replace(",", ".")) === cantidadCompleta
                    : valorVuelta === true;
                  // Lo que salió menos lo que ha vuelto. Si de 100 copas vuelven 90, esas
                  // 10 no están: da igual si se rompieron o se quedaron por ahí, hay que
                  // reponerlas. Se ofrece con un toque en vez de rellenarlo solo, porque
                  // no siempre es una rotura: de 100 tercios vuelven 20 y los otros 80
                  // están bebidos, no rotos. Ahí no se toca el botón y ya está.
                  const vueltaNum = parseFloat(String(vueltaTexto).replace(",", "."));
                  const faltan = (cantidadCompleta !== null && !isNaN(vueltaNum))
                    ? Math.max(0, cantidadCompleta - vueltaNum) : 0;
                  const sugerirRoturas = faltan > 0 && !roturas[key];
                  return (
                    <div className={`carga-row ${marcado ? "is-marcado" : ""} ${vinoTodo ? "is-vino-todo" : ""}`} key={i}>
                      {/* La pastilla "todo" va en la línea del nombre, que es donde está
                          la casilla de marcar en Prep. y en Salida: es la misma acción y
                          tiene que estar en el mismo sitio. Debajo se apilaba, y entre eso
                          y los dos campos cada item ocupaba cuatro líneas — recorrer la
                          vuelta de un rodaje era bajar el triple de lo necesario. */}
                      <div className="carga-row-principal carga-row-vuelta">
                        <span className="carga-nombre"><IconoItem label={label} /> <span className="carga-nombre-texto">{label}</span></span>
                        <span className="carga-cantidad">de {fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</span>
                        <label className={`carga-vino-todo ${vinoTodo ? "is-on" : ""}`} title={cantidadCompleta !== null ? "Vino todo: rellena la cantidad completa" : "Marcar como que volvió entero"} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={vinoTodo}
                            onChange={e => onVuelve(key, e.target.checked ? (cantidadCompleta !== null ? String(cantidadCompleta) : true) : "")}
                          />
                          <Check size={12} /> todo
                        </label>
                      </div>
                      {/* Y debajo, los dos números, alineados entre ellos */}
                      <div className="carga-vuelta-controles">
                        {/* Si la cantidad es un texto ("Todas") no hay número que contar:
                            esa fila se marca solo con la casilla, sin campo numérico. */}
                        {cantidadCompleta !== null && (
                          <div className="carga-roturas carga-vuelve-cantidad">
                            <span><Undo2 size={12} /> vuelve</span>
                            {/* No se puede devolver más de lo que salió. Sin tope se
                                apuntaban cosas como "cargadas 24, vuelven 27", que
                                además salen gratis: el consumo se queda en 0 y la merma
                                no se cobra. Se recorta al vuelo a la cantidad cargada,
                                que es el único número que puede ser verdad. */}
                            <input
                              type="number"
                              min="0"
                              max={cantidadCompleta}
                              title={`Como mucho pueden volver las ${cantidadCompleta} que salieron`}
                              className="carga-roturas-input"
                              value={vueltaTexto}
                              placeholder="0"
                              onChange={e => {
                                const texto = e.target.value;
                                if (texto === "") return onVuelve(key, "");
                                const n = Number(texto);
                                if (isNaN(n)) return;
                                onVuelve(key, String(Math.min(Math.max(0, n), cantidadCompleta)));
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="carga-roturas">
                          <span><AlertTriangle size={12} /> roturas</span>
                          <input
                            type="number"
                            min="0"
                            className="carga-roturas-input"
                            value={roturas[key] || ""}
                            placeholder="0"
                            onChange={e => onRoturas(key, e.target.value)}
                            onClick={e => e.stopPropagation()}
                          />
                          {sugerirRoturas && (
                            <button
                              type="button"
                              className="carga-faltan"
                              title={`Han vuelto ${vueltaNum} de ${cantidadCompleta}: apuntar las ${faltan} que faltan como roturas`}
                              onClick={e => { e.stopPropagation(); onRoturas(key, String(faltan)); }}
                            >faltan {faltan}</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
