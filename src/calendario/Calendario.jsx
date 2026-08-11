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
import { Heart, Church, Briefcase, Cake, Clapperboard, Palmtree, Truck, Ban } from "lucide-react";
import {
  TIPOS, esTipoEvento, porDia, semanasDelMes, NOMBRE_MES, INICIAL_DIA,
  aISO, aFecha, diasHasta, saneaApunte, idDeApunte, aVistaProxima, choques, ausentesEn, disponiblesEn,
} from "./apuntes.js";

const ICONOS = { Heart, Church, Briefcase, Cake, Clapperboard, Palmtree, Truck, Ban };

// El icono del tipo. Va con su clase de color, así que hereda el mismo tono que el
// punto y el chip: un solo color por tipo en todas partes.
function IconoTipo({ tipo, size = 13, className = "" }) {
  const Icono = ICONOS[(TIPOS[tipo] || {}).icono] || Heart;
  return <Icono size={size} className={`cal-icono tipo-${tipo} ${className}`} aria-hidden="true" />;
}

const hoyISO = () => aISO(new Date());

// Un apunte nuevo hereda el día en el que se ha pulsado: casi siempre se apunta
// mirando el calendario, no escribiendo la fecha.
const enBlanco = (fecha) => ({ id: "", fecha, titulo: "", tipo: "boda", hasta: "", pax: "", sitio: "", notas: "" });

export default function Calendario({
  apuntes = [],
  equipo = [],
  onGuardar,
  onBorrar,
  onAbrirEvento,
  soloVer = false,
  soloAnadir = false,
}) {
  const hoy = hoyISO();
  const [vista, setVista] = useState("mes");
  const [cursor, setCursor] = useState(() => {
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
    setEditando({ ...a, hasta: a.hasta || "", pax: a.pax || "", sitio: a.sitio || "", notas: a.notas || "" });
    setDiaAbierto(null);
  };

  return (
    <div className="cal-wrap">
      <div className="cal-barra">
        <div className="cal-nav">
          <button className="btn btn-outline cal-nav-btn" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
          <strong className="cal-titulo">
            {vista === "mes" ? `${NOMBRE_MES[cursor.mes - 1]} ${cursor.anio}` : cursor.anio}
          </strong>
          <button className="btn btn-outline cal-nav-btn" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
          <button className="btn btn-outline cal-hoy" onClick={() => {
            const f = new Date();
            setCursor({ anio: f.getFullYear(), mes: f.getMonth() + 1 });
          }}>Hoy</button>
        </div>
        <div className="cal-vistas segmented-control">
          <button className={`segment-btn ${vista === "mes" ? "active" : ""}`} onClick={() => setVista("mes")}>Mes</button>
          <button className={`segment-btn ${vista === "anio" ? "active" : ""}`} onClick={() => setVista("anio")}>Año</button>
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

      {vista === "mes" ? (
        <Mes anio={cursor.anio} mes={cursor.mes} mapa={mapa} hoy={hoy} enChoque={diasEnChoque}
             onDia={abrirDia} abierto={diaAbierto} />
      ) : (
        <Anio anio={cursor.anio} mapa={mapa} hoy={hoy}
              onMes={(m) => { setCursor({ anio: cursor.anio, mes: m }); setVista("mes"); }} />
      )}

      <LoQueViene proximos={proximos} apuntes={apuntes} equipo={equipo} onAbrirEvento={onAbrirEvento} />

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
            return (
              <button
                type="button"
                key={j}
                disabled={!dia}
                aria-label={dia ? `${Number(dia.slice(8))}: ${del.length ? del.map(a => a.titulo).join(", ") : "sin nada"}` : undefined}
                className={`cal-celda${!dia ? " es-hueco" : ""}${dia === hoy ? " es-hoy" : ""}`
                  + `${dia && enChoque.has(dia) ? " es-choque" : ""}${esAbierto ? " es-abierto" : ""}`}
                onClick={() => onDia(dia)}
              >
                {dia && <span className="cal-numero">{Number(dia.slice(8))}</span>}
                {del.length > 0 && (
                  <span className="cal-puntos">
                    {del.slice(0, 4).map(a => <IconoTipo key={a.id} tipo={a.tipo} size={12} />)}
                  </span>
                )}
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
  if (proximos.length === 0) {
    return <div className="cal-viene cal-viene-vacio">No hay eventos en los próximos 14 días.</div>;
  }
  const cuandoTexto = (d) => d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`;
  return (
    <div className="cal-viene">
      <div className="cal-viene-titulo">Lo que viene</div>
      {proximos.map(a => {
        const fuera = ausentesEn(apuntes, a.fecha);
        // Cuánta gente queda ese día. Sin equipo configurado no se puede decir, así que
        // no se enseña nada en vez de inventarse un número.
        const quedan = equipo.length ? disponiblesEn(apuntes, a.fecha, equipo) : null;
        return (
          <div className={`cal-viene-fila${a.faltan <= 3 ? " es-urgente" : ""}`} key={a.id}>
            <span className={`cal-punto tipo-${a.tipo}`} />
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
