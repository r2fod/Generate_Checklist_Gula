// ─── EL CALENDARIO ────────────────────────────────────────────────────────────
// El calendario de pared del equipo, en la app. Dos vistas:
//
//   · AÑO — los doce meses de un vistazo, con un punto de color por apunte. Es la
//           vista de "¿cómo viene el año?", la que hoy se mira en la hoja de Google.
//   · MES — las casillas grandes, con el nombre de cada apunte. La de trabajar.
//
// No sabe nada de Firestore ni de la checklist: recibe los apuntes y avisa de los
// cambios con onGuardar. Así la usan las dos puertas de entrada (la app propia del
// calendario y la pantalla dentro de la checklist) sin duplicar nada, y se puede probar
// dándole una lista a mano.
import React, { useMemo, useState } from "react";
import { Heart, Church, Briefcase, Cake, Clapperboard, Palmtree, Truck, Ban, ClipboardList, ChevronDown, X } from "lucide-react";
import {
  TIPOS, esTipoEvento, porDia, semanasDelMes, NOMBRE_MES, INICIAL_DIA,
  aFecha, diasHasta, saneaApunte, idDeApunte, aVistaProxima, choques, ausentesEn, disponiblesEn,
  turnosDe, DIAS_ANTICIPACION, apuntesPorPromover,
} from "./apuntes.js";
import { hoyISO } from "../fecha.js";
import { personalNecesario, resumenAsignados, personalQueFalta, horasEntre, ROLES } from "../personal.js";

const ICONOS = { Heart, Church, Briefcase, Cake, Clapperboard, Palmtree, Truck, Ban, ClipboardList };

// El icono del tipo. Va con su clase de color, así que hereda el mismo tono que el
// punto y el chip: un solo color por tipo en todas partes.
function IconoTipo({ tipo, size = 13, className = "" }) {
  const Icono = ICONOS[(TIPOS[tipo] || {}).icono] || Heart;
  return <Icono size={size} className={`cal-icono tipo-${tipo} ${className}`} aria-hidden="true" />;
}

// Cuánto falta, en cristiano. A nivel de módulo porque lo usan los dos sitios que
// enseñan cuentas atrás: "Lo que viene" y la vista de equipo.
const cuandoTexto = (d) => d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`;

// Un apunte nuevo hereda el día en el que se ha pulsado: casi siempre se apunta
// mirando el calendario, no escribiendo la fecha.
const enBlanco = (fecha) => ({ id: "", fecha, titulo: "", tipo: "boda", hasta: "", hora: "", pax: "", sitio: "", notas: "" });

export default function Calendario({
  apuntes = [],
  equipo = [],
  onGuardar,
  onBorrar,
  onAbrirEvento,
  soloVer = false,
  soloAnadir = false,
  // Con qué mes se abre la vista Mes. Por defecto el de hoy, que es lo que quiere
  // cualquier persona de verdad abriendo el calendario. Existe SOLO para el banco de
  // pruebas (ver prueba.jsx): sus apuntes de mentira son "dentro de N días" a partir de
  // hoy, así que en los últimos días de cada mes caían casi todos en el mes siguiente y
  // la vista por defecto (el de hoy) se veía vacía — no un fallo de cálculo, un banco de
  // pruebas enseñando el mes que no tocaba.
  mesInicial = null,
}) {
  const hoy = hoyISO();
  const [vista, setVista] = useState("mes");
  const [cursor, setCursor] = useState(() => {
    if (mesInicial && Number.isFinite(mesInicial.anio) && Number.isFinite(mesInicial.mes)) return mesInicial;
    const f = new Date();
    return { anio: f.getFullYear(), mes: f.getMonth() + 1 };
  });
  const [editando, setEditando] = useState(null);
  // El día abierto. En el móvil la casilla es de 45px y no cabe el nombre de una boda,
  // así que la rejilla enseña número y puntos, y el detalle vive aquí. En escritorio se
  // usa igual: tocar un día para ver lo que hay y añadir es lo natural en los dos.
  const [diaAbierto, setDiaAbierto] = useState(null);

  const mapa = useMemo(() => porDia(apuntes), [apuntes]);
  const proximos = useMemo(() => aVistaProxima(apuntes), [apuntes]);
  const losChoques = useMemo(() => choques(apuntes), [apuntes]);
  const diasEnChoque = useMemo(() => new Set(losChoques.map(c => c.dia)), [losChoques]);

  const mover = (n) => setCursor(({ anio, mes }) => {
    const m = mes + n;
    return { anio: anio + Math.floor((m - 1) / 12), mes: ((m - 1 + 12) % 12) + 1 };
  });

  const puedeEditar = !soloVer;

  // Tocar un día abre su panel. Vale también en solo-ver: mirar lo que hay un día no es
  // editar, y en el móvil es la única forma de leer el nombre entero.
  const abrirDia = (dia) => { if (dia) setDiaAbierto(dia); };

  const editarApunte = (a) => {
    // Quien solo puede añadir no toca lo que ya hay: podría borrar una boda entera
    if (!puedeEditar || soloAnadir) return;
    setEditando({ ...a, hasta: a.hasta || "", hora: a.hora || "", pax: a.pax || "", sitio: a.sitio || "", notas: a.notas || "" });
    setDiaAbierto(null);
  };

  return (
    <div className="cal-wrap">
      <div className="cal-barra">
        <div className="cal-nav">
          {/* Las flechas y el "Hoy" mueven el mes, y en la vista de equipo no hay mes
              que mover: son siempre los próximos catorce días. Dejarlas ahí sin efecto
              es peor que quitarlas. */}
          {vista !== "equipo" && (
            <button className="btn btn-outline cal-nav-btn" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
          )}
          <strong className="cal-titulo">
            {vista === "mes" ? `${NOMBRE_MES[cursor.mes - 1]} ${cursor.anio}`
              : vista === "anio" ? cursor.anio
              : `Próximos ${DIAS_ANTICIPACION} días`}
          </strong>
          {vista !== "equipo" && (
            <>
              <button className="btn btn-outline cal-nav-btn" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
              <button className="btn btn-outline cal-hoy" onClick={() => {
                const f = new Date();
                setCursor({ anio: f.getFullYear(), mes: f.getMonth() + 1 });
              }}>Hoy</button>
            </>
          )}
        </div>
        <div className="cal-vistas segmented-control">
          <button className={`segment-btn ${vista === "mes" ? "active" : ""}`} onClick={() => setVista("mes")}>Mes</button>
          <button className={`segment-btn ${vista === "anio" ? "active" : ""}`} onClick={() => setVista("anio")}>Año</button>
          <button className={`segment-btn ${vista === "equipo" ? "active" : ""}`} onClick={() => setVista("equipo")}>Equipo</button>
        </div>
        {puedeEditar && (
          <button className="btn btn-green cal-nuevo" onClick={() => setEditando(enBlanco(hoy))}>+ Apunte</button>
        )}
      </div>

      {losChoques.length > 0 && vista === "mes" && (
        <ChoquesAviso choques={losChoques} apuntes={apuntes} equipo={equipo} onIr={(dia) => {
          const f = aFecha(dia);
          if (f) { setCursor({ anio: f.getFullYear(), mes: f.getMonth() + 1 }); setVista("mes"); }
        }} />
      )}

      {vista === "mes" && (
        <Mes anio={cursor.anio} mes={cursor.mes} mapa={mapa} hoy={hoy} enChoque={diasEnChoque}
             onDia={abrirDia} abierto={diaAbierto} />
      )}
      {vista === "anio" && (
        <Anio anio={cursor.anio} mapa={mapa} hoy={hoy}
              onMes={(m) => { setCursor({ anio: cursor.anio, mes: m }); setVista("mes"); }} />
      )}
      {vista === "equipo" && (
        <VistaEquipo apuntes={apuntes} equipo={equipo} onAbrirEvento={onAbrirEvento} onEditar={editarApunte}
                     onGuardar={puedeEditar ? onGuardar : null} />
      )}

      {vista !== "equipo" && (
        <LoQueViene proximos={proximos} apuntes={apuntes} equipo={equipo} onAbrirEvento={onAbrirEvento} />
      )}

      {diaAbierto && (
        <PanelDia
          dia={diaAbierto}
          apuntes={mapa[diaAbierto] || []}
          puedeEditar={puedeEditar}
          soloAnadir={soloAnadir}
          onCerrar={() => setDiaAbierto(null)}
          onEditar={editarApunte}
          onAnadir={() => { setEditando(enBlanco(diaAbierto)); setDiaAbierto(null); }}
          onAbrirEvento={onAbrirEvento}
        />
      )}

      {editando && (
        <EditorApunte
          apunte={editando}
          onCerrar={() => setEditando(null)}
          onGuardar={(a) => { onGuardar && onGuardar(a); setEditando(null); }}
          onBorrar={onBorrar && editando.id ? () => { onBorrar(editando.id); setEditando(null); } : null}
        />
      )}
    </div>
  );
}

// ─── VISTA DE MES ─────────────────────────────────────────────────────────────
// La casilla enseña el nombre cuando hay sitio y solo puntos cuando no. No se decide
// con JavaScript mirando el ancho: los chips se pintan siempre y el CSS los esconde por
// debajo de 560px, dejando los puntos. Así no hay que escuchar el "resize" ni hay un
// primer dibujado con la vista equivocada.
function Mes({ anio, mes, mapa, hoy, enChoque, onDia, abierto }) {
  const semanas = semanasDelMes(anio, mes);
  return (
    <div className="cal-mes">
      <div className="cal-cabecera">
        {INICIAL_DIA.map((d, i) => <div key={i} className="cal-dia-nombre">{d}</div>)}
      </div>
      {semanas.map((semana, i) => (
        <div className="cal-semana" key={i}>
          {semana.map((dia, j) => {
            const del = (dia && mapa[dia]) || [];
            // El "dia &&" del día abierto no sobra: los huecos del principio y del final
            // del mes son null, y "ningún día abierto" también es null, así que sin él
            // null === null marcaba TODOS los huecos como el día abierto y salían
            // recuadrados en oscuro nada más entrar en el calendario.
            const esAbierto = Boolean(dia) && dia === abierto;
            // Cuánta gente hay ese día en total. En un móvil el nombre de la boda no cabe
            // y solo se veían unos iconos: en un día con tres bodas eso son tres corazones
            // y ninguna pista de si son 40 comensales o 330. El número es lo que de verdad
            // dice si el día es un problema.
            const paxDia = del.reduce((s, a) => s + (a.pax || 0), 0);
            // El color de la casilla lo manda el primer EVENTO del día, no el primer
            // apunte: si no, un día con una boda y unas vacaciones se pintaría del gris
            // de las vacaciones y la boda desaparecería del mes.
            const dominante = (del.find(a => esTipoEvento(a.tipo)) || del[0] || {}).tipo || "";
            return (
              <button
                type="button"
                key={j}
                disabled={!dia}
                aria-label={dia ? `${Number(dia.slice(8))}: ${del.length ? del.map(a => a.titulo).join(", ") : "sin nada"}${paxDia ? `, ${paxDia} personas` : ""}` : undefined}
                className={`cal-celda${!dia ? " es-hueco" : ""}${dia === hoy ? " es-hoy" : ""}`
                  + `${dominante ? ` tipo-${dominante} tiene-cosas` : ""}`
                  + `${dia && enChoque.has(dia) ? " es-choque" : ""}${esAbierto ? " es-abierto" : ""}`}
                onClick={() => onDia(dia)}
              >
                {dia && <span className="cal-numero">{Number(dia.slice(8))}</span>}
                {del.length > 0 && (
                  <span className="cal-puntos">
                    {del.slice(0, 4).map(a => <IconoTipo key={a.id} tipo={a.tipo} size={12} />)}
                    {/* El total. En pantallas muy estrechas (320px son 35px de casilla)
                        no caben cuatro iconos, así que el CSS deja solo el primero y
                        enseña esto: "×4" dice más que cuatro glifos cortados. */}
                    {del.length > 1 && <span className="cal-mas">×{del.length}</span>}
                  </span>
                )}
                {paxDia > 0 && <span className="cal-pax-dia">{paxDia}</span>}
                {del.map(a => (
                  <span key={a.id} className={`cal-chip tipo-${a.tipo}`}>
                    <IconoTipo tipo={a.tipo} size={11} />
                    <span className="cal-chip-texto">{a.titulo}</span>
                    {a.pax ? <span className="cal-chip-pax">{a.pax}</span> : null}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── EL DÍA, POR DENTRO ───────────────────────────────────────────────────────
// En el móvil es lo único que puede enseñar el nombre entero de una boda. En escritorio
// es donde se añade y se edita sin tener que apuntar con el dedo a un chip de 10px.
function PanelDia({ dia, apuntes, puedeEditar, soloAnadir, onCerrar, onEditar, onAnadir, onAbrirEvento }) {
  const f = aFecha(dia);
  const cuando = diasHasta(dia);
  const titulo = f
    ? f.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })
    : dia;
  return (
    <div className="cal-editor-fondo" onClick={onCerrar}>
      <div className="cal-dia-panel" onClick={e => e.stopPropagation()}>
        <div className="cal-dia-titulo">
          <span>{titulo}</span>
          {cuando === 0 ? <em>hoy</em> : cuando > 0 ? <em>en {cuando} días</em> : <em>pasado</em>}
          <button className="cal-dia-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        {apuntes.length === 0
          ? <div className="cal-dia-vacio">No hay nada apuntado este día.</div>
          : apuntes.map(a => (
            <div className={`cal-dia-item tipo-${a.tipo}`} key={a.id}>
              <IconoTipo tipo={a.tipo} size={17} />
              <span className="cal-dia-item-texto">
                <strong>{a.titulo}</strong>
                <small>
                  {TIPOS[a.tipo].nombre}
                  {a.sitio ? ` · ${a.sitio}` : ""}
                  {a.pax ? ` · ${a.pax} pax` : ""}
                  {a.hasta && a.hasta !== a.fecha ? ` · hasta el ${Number(a.hasta.slice(8))}` : ""}
                </small>
              </span>
              {a.evento && onAbrirEvento && (
                <button className="btn btn-outline cal-dia-btn" onClick={() => onAbrirEvento(a.evento)}>Abrir</button>
              )}
              {puedeEditar && !soloAnadir && (
                <button className="btn btn-outline cal-dia-btn" onClick={() => onEditar(a)}>Editar</button>
              )}
            </div>
          ))}

        {puedeEditar && (
          <button className="btn btn-green cal-dia-anadir" onClick={onAnadir}>+ Añadir a este día</button>
        )}
      </div>
    </div>
  );
}

// ─── VISTA DE AÑO ─────────────────────────────────────────────────────────────
// Doce mini-meses. Sin nombres: solo el número del día y un punto por apunte, que es
// lo que se busca aquí — ver de un golpe dónde se apelotona el trabajo.
function Anio({ anio, mapa, hoy, onMes }) {
  return (
    <div className="cal-anio">
      {NOMBRE_MES.map((nombre, i) => {
        const mes = i + 1;
        return (
          <button type="button" className="cal-mini" key={mes} onClick={() => onMes(mes)}>
            <div className="cal-mini-titulo">{nombre}</div>
            <div className="cal-mini-cabecera">
              {INICIAL_DIA.map((d, k) => <span key={k}>{d}</span>)}
            </div>
            {semanasDelMes(anio, mes).map((semana, s) => (
              <div className="cal-mini-semana" key={s}>
                {semana.map((dia, j) => {
                  const del = (dia && mapa[dia]) || [];
                  return (
                    <span key={j} className={`cal-mini-dia${dia === hoy ? " es-hoy" : ""}${del.length ? " tiene" : ""}`}>
                      {dia ? Number(dia.slice(8)) : ""}
                      {del.length > 0 && (
                        <span className="cal-mini-puntos">
                          {del.slice(0, 3).map(a => <i key={a.id} className={`cal-punto tipo-${a.tipo}`} />)}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </button>
        );
      })}
    </div>
  );
}

// ─── LO QUE VIENE ─────────────────────────────────────────────────────────────
// Los eventos de las próximas dos semanas, con lo que queda y quién falta. Es el panel
// que convierte el calendario en control: no es "qué hay en octubre", es "de qué me
// tengo que ocupar esta semana".
function LoQueViene({ proximos, apuntes, equipo, onAbrirEvento }) {
  const sinChecklist = apuntesPorPromover(apuntes).length;
  if (proximos.length === 0) {
    return <div className="cal-viene cal-viene-vacio">No hay eventos en los próximos 14 días.</div>;
  }
  return (
    <div className="cal-viene">
      <div className="cal-viene-titulo">
        Lo que viene
        {/* Cuántos de los que vienen no tienen checklist todavía. El dato ya estaba por
            filas, pero repartido no se lee: lo que hace falta saber de un vistazo es
            cuánto queda por preparar, no si esta boda concreta está montada. */}
        {sinChecklist > 0 && (
          <span className="cal-viene-pendientes">
            {sinChecklist} sin checklist
          </span>
        )}
      </div>
      {proximos.map((a, i) => {
        const fuera = ausentesEn(apuntes, a.fecha);
        // Cuánta gente queda ese día. Sin equipo configurado no se puede decir, así que
        // no se enseña nada en vez de inventarse un número.
        const quedan = equipo.length ? disponiblesEn(apuntes, a.fecha, equipo) : null;
        return (
          // El tipo va en la FILA, no solo en el punto: así --cal-color cae en cascada y
          // el carril de la izquierda se pinta del color de la boda sin repetirlo.
          // --fila es el turno en la entrada escalonada.
          <div
            className={`cal-viene-fila tipo-${a.tipo}${a.faltan <= 3 ? " es-urgente" : ""}`}
            style={{ "--fila": i }}
            key={a.id}
          >
            {/* El icono del tipo, no un punto de color: se reconoce "esto es una boda"
                sin leer, y es el mismo icono que en el mes. */}
            <IconoTipo tipo={a.tipo} size={15} />
            <span className="cal-viene-nombre">{a.titulo}</span>
            <span className="cal-viene-cuando">{cuandoTexto(a.faltan)}</span>
            {quedan
              ? <span className={`cal-viene-falta${quedan.length <= 1 ? " es-critico" : ""}`}
                      title={`Ese día están: ${quedan.join(", ") || "nadie"}${fuera.length ? `. Fuera: ${fuera.join(", ")}` : ""}`}>
                  {quedan.length} de {equipo.length}
                </span>
              : fuera.length > 0 && (
                <span className="cal-viene-falta" title={`De vacaciones ese día: ${fuera.join(", ")}`}>
                  sin {fuera.join(", ")}
                </span>
              )}
            {a.evento
              ? <button className="btn btn-outline cal-viene-ir" onClick={() => onAbrirEvento && onAbrirEvento(a.evento)}>Abrir</button>
              : <span className="cal-viene-sin">sin checklist</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── AVISO DE CHOQUES ─────────────────────────────────────────────────────────
function ChoquesAviso({ choques: lista, apuntes, equipo, onIr }) {
  return (
    <div className="cal-choques">
      {lista.map(c => {
        const fuera = ausentesEn(apuntes, c.dia);
        const quedan = equipo.length ? disponiblesEn(apuntes, c.dia, equipo) : null;
        const f = aFecha(c.dia);
        const cuando = diasHasta(c.dia);
        // Los choques que ya pasaron no son un aviso, son historia
        if (cuando !== null && cuando < 0) return null;
        return (
          <button type="button" className="cal-choque" key={c.dia} onClick={() => onIr(c.dia)}>
            <strong>{f.getDate()} {NOMBRE_MES[f.getMonth()].toLowerCase()}</strong>
            {` · ${c.apuntes.length} eventos el mismo día: ${c.apuntes.map(a => a.titulo).join(" + ")}`}
            {quedan ? ` · y solo estáis ${quedan.length} de ${equipo.length}` : (fuera.length > 0 ? ` · y falta ${fuera.join(", ")}` : "")}
          </button>
        );
      })}
    </div>
  );
}

// ─── EDITOR DE UN APUNTE ──────────────────────────────────────────────────────
// Lo mínimo: qué día, qué es y cómo se llama. El resto es opcional a propósito — la
// gracia del calendario es poder apuntar "boda Marina" en cuanto te dan la fecha, sin
// saber todavía ni el pax ni el sitio.
function EditorApunte({ apunte, onCerrar, onGuardar, onBorrar }) {
  const [f, setF] = useState(apunte);
  const pon = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }));
  const listo = saneaApunte({ ...f, pax: Number(f.pax) || undefined });

  return (
    <div className="cal-editor-fondo" onClick={onCerrar}>
      <div className="cal-editor" onClick={e => e.stopPropagation()}>
        <div className="cal-editor-titulo">{apunte.id ? "Editar apunte" : "Nuevo apunte"}</div>

        <label className="cal-campo">
          <span>Qué es</span>
          <select value={f.tipo} onChange={pon("tipo")}>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
          </select>
        </label>

        <label className="cal-campo">
          <span>Nombre</span>
          <input value={f.titulo} onChange={pon("titulo")} placeholder="Ej: Boda Marina" autoFocus />
        </label>

        <div className="cal-campos-fila">
          <label className="cal-campo">
            <span>Día</span>
            <input type="date" value={f.fecha} onChange={pon("fecha")} />
          </label>
          <label className="cal-campo">
            {/* Solo para lo que dura varios días: unas vacaciones, un rodaje de tres
                jornadas. En blanco es un día suelto, que es lo normal. */}
            <span>Hasta <em>(si dura varios días)</em></span>
            <input type="date" value={f.hasta} min={f.fecha} onChange={pon("hasta")} />
          </label>
        </div>

        {esTipoEvento(f.tipo) && (
          <>
            <div className="cal-campos-fila">
              <label className="cal-campo">
                <span>Pax <em>(si se sabe)</em></span>
                <input type="number" min="0" value={f.pax} onChange={pon("pax")} placeholder="—" />
              </label>
              <label className="cal-campo">
                <span>Sitio <em>(si se sabe)</em></span>
                <input value={f.sitio} onChange={pon("sitio")} placeholder="—" />
              </label>
            </div>
            <div className="cal-campos-fila">
              {/* De esta hora salen los turnos: en los eventos medidos, sala entra 6h
                  antes de sentar a la gente. Con este dato la app propone el horario. */}
              <label className="cal-campo">
                <span>Hora del banquete <em>(para los turnos)</em></span>
                <input type="time" value={f.hora} onChange={pon("hora")} />
              </label>
              {turnosDe({ hora: f.hora })
                ? <span className="cal-turnos-pista">
                    Sala entra a las <strong>{turnosDe({ hora: f.hora }).sala}</strong>
                    {turnosDe({ hora: f.hora }).salaVispera ? " (víspera)" : ""}
                    {" · logística a las "}<strong>{turnosDe({ hora: f.hora }).logistica}</strong>
                  </span>
                : <span className="cal-turnos-pista es-vacia">Sin hora no se pueden proponer turnos.</span>}
            </div>
          </>
        )}

        <div className="cal-editor-acciones">
          {onBorrar && <button className="btn btn-outline cal-borrar" onClick={onBorrar}>Borrar</button>}
          <span className="cal-editor-hueco" />
          <button className="btn btn-outline" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-green" disabled={!listo}
                  title={listo ? "" : "Hace falta al menos el día y el nombre"}
                  onClick={() => onGuardar({ ...listo, id: apunte.id || idDeApunte(listo.fecha, listo.titulo) })}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VISTA DE EQUIPO: LOS PRÓXIMOS 14 DÍAS ────────────────────────────────────
// La vista de logística. El mes dice QUÉ hay; esta dice CUÁNTA GENTE hace falta, A QUÉ
// HORA entra y CUÁNTA queda disponible. Es la que convierte el calendario en control.
//
// Se agrupa por DÍA y no por evento a propósito: la gente no se reparte por evento, se
// reparte por jornada. El 19 de septiembre no son "tres bodas de 180, 100 y 50": son
// 400 comensales y 44 personas que hay que tener ese sábado.
function VistaEquipo({ apuntes, equipo, onAbrirEvento, onEditar, onGuardar }) {
  const porDia = useMemo(() => {
    const dias = new Map();
    for (const a of apuntes) {
      if (!esTipoEvento(a.tipo)) continue;
      const faltan = diasHasta(a.fecha);
      if (faltan === null || faltan < 0 || faltan > DIAS_ANTICIPACION) continue;
      if (!dias.has(a.fecha)) dias.set(a.fecha, []);
      dias.get(a.fecha).push(a);
    }
    return [...dias.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, [apuntes]);

  if (porDia.length === 0) {
    return (
      <div className="cal-viene cal-viene-vacio">
        No hay eventos en los próximos {DIAS_ANTICIPACION} días.
      </div>
    );
  }

  return (
    <div className="cal-equipo-vista">
      {porDia.map(([dia, delDia]) => {
        const f = aFecha(dia);
        const faltan = diasHasta(dia);
        // Lo que hace falta ese día es la SUMA de sus eventos. Sumar sala/cocina/
        // logística de cada uno, y no calcular sobre el pax total, es lo correcto:
        // dos bodas de 100 en sitios distintos necesitan dos equipos, no uno de 200.
        const suma = delDia.reduce((acc, a) => {
          const n = personalNecesario(a.tipo, a.pax || 0);
          return {
            sala: acc.sala + n.sala, cocina: acc.cocina + n.cocina,
            logistica: acc.logistica + n.logistica, pax: acc.pax + (a.pax || 0),
            sinMedir: acc.sinMedir || n.sinMedir,
          };
        }, { sala: 0, cocina: 0, logistica: 0, pax: 0, sinMedir: false });
        const total = suma.sala + suma.cocina + suma.logistica;
        const quedan = equipo.length ? disponiblesEn(apuntes, dia, equipo) : null;
        const faltaGente = quedan !== null && total > quedan.length;
        return (
          <div className={`cal-jornada${faltan <= 3 ? " es-urgente" : ""}`} key={dia}>
            <div className="cal-jornada-cab">
              <strong className="cal-jornada-dia">
                {f.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </strong>
              <span className="cal-jornada-cuando">{cuandoTexto(faltan)}</span>
            </div>

            {delDia.map(a => {
              const n = personalNecesario(a.tipo, a.pax || 0);
              const t = turnosDe(a);
              return (
                <div className={`cal-evento tipo-${a.tipo}`} key={a.id}>
                  <div className="cal-evento-cab">
                    <IconoTipo tipo={a.tipo} size={15} />
                    <button type="button" className="cal-evento-nombre" onClick={() => onEditar && onEditar(a)}>
                      {a.titulo}
                    </button>
                    {a.pax ? <span className="cal-evento-pax">{a.pax} pax</span> : <span className="cal-evento-sinpax">sin pax</span>}
                  </div>
                  {a.sitio && <div className="cal-evento-sitio">{a.sitio}</div>}

                  {a.pax > 0 && (
                    <div className="cal-necesita">
                      <span><b>{n.sala}</b> sala</span>
                      <span><b>{n.cocina}</b> cocina</span>
                      <span><b>{n.logistica}</b> logística</span>
                      <span className="cal-necesita-total">= {n.total}</span>
                      {n.sinMedir && (
                        <span className="cal-sin-medir" title="Este tipo de evento no tiene ratio comprobado: no había ninguno en la hoja de costes">
                          ratio sin comprobar
                        </span>
                      )}
                    </div>
                  )}

                  {t
                    ? <div className="cal-turnos">
                        Logística <b>{t.logistica}</b>{t.logisticaVispera ? " (víspera)" : ""}
                        {" · sala "}<b>{t.sala}</b>{t.salaVispera ? " (víspera)" : ""}
                        {" · banquete "}<b>{t.banquete}</b>
                      </div>
                    : <button type="button" className="cal-turnos es-vacia" onClick={() => onEditar && onEditar(a)}>
                        Sin hora: ponla y te digo a qué hora entra cada uno
                      </button>}

                  {onGuardar && a.pax > 0 && (
                    <Asignados
                      apunte={a}
                      equipo={equipo}
                      necesario={n}
                      turnos={t}
                      onCambiar={(personal) => onGuardar({ ...a, personal })}
                    />
                  )}

                  {a.evento
                    ? <button className="btn btn-outline cal-evento-ir" onClick={() => onAbrirEvento && onAbrirEvento(a.evento)}>Abrir checklist</button>
                    : <span className="cal-evento-sin">sin checklist</span>}
                </div>
              );
            })}

            {/* El total del día. Solo cuando hay más de un evento: con uno solo repetiría
                lo de arriba, y una cifra repetida deja de leerse. */}
            {delDia.length > 1 && suma.pax > 0 && (
              <div className="cal-jornada-suma">
                {delDia.length} eventos · <b>{suma.pax} pax</b> · hacen falta <b>{total} personas</b>
                {" "}({suma.sala} sala, {suma.cocina} cocina, {suma.logistica} logística)
              </div>
            )}

            {quedan !== null && (
              <div className={`cal-jornada-gente${faltaGente ? " es-critico" : ""}`}>
                {faltaGente
                  ? <>Del equipo estáis <b>{quedan.length}</b> ese día: te faltan <b>{total - quedan.length}</b> personas por buscar fuera.</>
                  : <>Del equipo estáis <b>{quedan.length}</b> ese día.</>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── QUIÉN VA A ESTE EVENTO ───────────────────────────────────────────────────
// El mismo bloque que la hoja de costes llama "HORARIO PERSONAL EN EVENTO": nombre,
// rol, entrada, salida e importe. De ahí salen solas las horas y lo que cuesta.
//
// El nombre se elige del equipo, pero se puede escribir a mano: en la hoja hay tanto
// gente de casa como externos que se contratan para el día, y obligar a darlos de alta
// dejaría fuera justo a los que hacen falta cuando no llegas.
function Asignados({ apunte, equipo, necesario, turnos, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  // La lista en curso vive AQUÍ, no en el apunte guardado. El saneado tira a quien no
  // tenga nombre —y hace bien, un asignado sin nombre no es nadie—, así que la fila
  // recién añadida desaparecía antes de poder escribir en ella: era imposible añadir a
  // nadie. Se guarda hacia arriba en cada cambio; lo que aún está a medias se queda
  // aquí hasta que tenga nombre.
  const [borrador, setBorrador] = useState(() => apunte.personal || []);
  const idRef = React.useRef(apunte.id);
  if (idRef.current !== apunte.id) {   // otro evento: se recarga su gente
    idRef.current = apunte.id;
    setBorrador(apunte.personal || []);
  }
  const lista = borrador;
  const aplicar = (siguiente) => { setBorrador(siguiente); onCambiar(siguiente); };
  const r = resumenAsignados(lista);
  const falta = personalQueFalta(necesario, lista);
  const faltanTotal = falta.sala + falta.cocina + falta.logistica;

  const cambiar = (i, campo, valor) => aplicar(lista.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  // Quien se añade hereda el turno propuesto de su rol: en una boda casi todos entran a
  // la misma hora, y rellenarlo quince veces a mano es lo que hace que no se rellene.
  const anadir = (rol) => aplicar([...lista, {
    nombre: "", rol,
    inicio: turnos ? (rol === "logistica" ? turnos.logistica : turnos.sala) : "",
    fin: "",
  }]);

  return (
    <div className="cal-asignados">
      <button type="button" className="cal-asignados-cab" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
        <span>
          {r.total > 0
            ? <>Asignados <b>{r.total}</b> de <b>{necesario.total}</b></>
            : <>Sin nadie asignado <b>({necesario.total} por cubrir)</b></>}
        </span>
        {faltanTotal > 0 && <span className="cal-asignados-falta">faltan {faltanTotal}</span>}
        <ChevronDown size={15} aria-hidden="true" className={`cal-asignados-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-asignados-cuerpo">
          {lista.map((p, i) => {
            const h = horasEntre(p.inicio, p.fin);
            return (
              <div className="cal-asignado" key={i}>
                {/* Lista del equipo + "otro" para los externos, sin dejar de poder
                    escribir: el desplegable ahorra teclear, no encierra. */}
                <input
                  className="cal-asignado-nombre"
                  list="cal-lista-equipo"
                  value={p.nombre}
                  placeholder="Nombre"
                  onChange={e => cambiar(i, "nombre", e.target.value)}
                />
                <select className="cal-asignado-rol" value={p.rol} onChange={e => cambiar(i, "rol", e.target.value)}>
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {/* Horario e importe agrupados: en un móvil caen a su propia línea
                    enteros, en vez de repartirse a trozos entre dos filas. */}
                <div className="cal-asignado-horario">
                  <input type="time" className="cal-asignado-hora" aria-label="Hora de entrada"
                         value={p.inicio || ""} onChange={e => cambiar(i, "inicio", e.target.value)} />
                  <input type="time" className="cal-asignado-hora" aria-label="Hora de salida"
                         value={p.fin || ""} onChange={e => cambiar(i, "fin", e.target.value)} />
                  <input
                    type="number" min="0" step="5" className="cal-asignado-importe" aria-label="Importe en euros"
                    value={p.importe || ""} placeholder="€"
                    onChange={e => cambiar(i, "importe", Number(e.target.value) || undefined)}
                  />
                  <span className="cal-asignado-horas">{h === null ? "—" : `${h} h`}</span>
                </div>
                <button type="button" className="cal-asignado-quitar" aria-label={`Quitar a ${p.nombre || "esta persona"}`}
                        onClick={() => aplicar(lista.filter((_, j) => j !== i))}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            );
          })}

          <datalist id="cal-lista-equipo">
            {equipo.map(p => <option key={p.nombre} value={p.nombre} />)}
          </datalist>

          <div className="cal-asignados-anadir">
            {Object.entries(ROLES).map(([k, v]) => (
              <button type="button" key={k} className="btn btn-outline" onClick={() => anadir(k)}>
                + {v}{falta[k] > 0 ? ` (${falta[k]})` : ""}
              </button>
            ))}
          </div>

          {r.total > 0 && (
            <div className="cal-asignados-suma">
              <span><b>{r.porRol.sala}</b> sala · <b>{r.porRol.cocina}</b> cocina · <b>{r.porRol.logistica}</b> logística</span>
              <span><b>{r.horas}</b> h en total</span>
              <span><b>{r.importe.toLocaleString("es-ES", { minimumFractionDigits: 0 })} €</b></span>
              {/* Un total a medias se dice, no se disfraza de total */}
              {(r.sinHoras > 0 || r.sinImporte > 0) && (
                <span className="cal-asignados-parcial">
                  {r.sinHoras > 0 && `${r.sinHoras} sin horario`}
                  {r.sinHoras > 0 && r.sinImporte > 0 && " · "}
                  {r.sinImporte > 0 && `${r.sinImporte} sin importe`}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
