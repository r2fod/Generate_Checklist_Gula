// ─── EL ASISTENTE, EN PANTALLA ────────────────────────────────────────────────
// Un panel de conversación. Todo lo que decide qué se puede hacer está en
// herramientas.js y el bucle en cliente.js: esto solo pinta y recoge lo que se escribe.
//
// Dos cosas que no son adorno:
//   · Debajo de cada respuesta se dice QUÉ herramientas se han usado. Un asistente que
//     suelta un número sin decir de dónde sale no es un asistente en el que se pueda
//     confiar cuando el número decide lo que se carga en el camión.
//   · Si el proxy no está configurado, se explica cómo, en vez de fallar por la red.
import { useState, useRef, useEffect } from "react";
import { Send, X, Settings, Loader2, Wrench, Brain, Trash2, MessageCircle, Coins, Check, Ban, User, ListTodo, History, Plus } from "lucide-react";
import { preguntarAuto, preguntar } from "./cliente.js";
import { tokenDeSesion } from "../auth.js";
import Cerebro from "./Cerebro.jsx";
import { leerCharlas, guardarCharla, borrarCharla, cuandoFue } from "./conversaciones.js";
import { porEvento as tareasPorEvento, sinHacer } from "./tareas.js";
import Companero, { COMPANEROS, CLAVES_COMPANERO } from "./Companero.jsx";
import Humano from "./Humano.jsx";
import { leerGasto, apuntar, resumen, eurosTotales, leerTope, ponerTope, borrarGasto, puedePreguntar, esGratis, totales, costeDeUna } from "./gasto.js";
import { NIVELES, CLAVES_NIVEL, NIVEL_POR_DEFECTO, nivelValido } from "./permisos.js";

const CLAVE_URL = "gula_asistente_url";
const CLAVE_PROVEEDOR = "gula_asistente_proveedor";
const CLAVE_COMPANERO = "gula_asistente_companero";
const CLAVE_NIVEL = "gula_asistente_nivel";
const CLAVE_VOZ = "gula_asistente_voz";

const leer = (k, x = "") => { try { return localStorage.getItem(k) || x; } catch (e) { return x; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } };

// El Worker admite además un proveedor "compatible" (OpenRouter, Groq, DeepSeek…). No
// sale aquí a propósito: con uno configurado no hay nada que elegir, y cuatro botones
// para tres opciones reales es una pantalla más llena sin ser más útil. El día que se
// use, se añade una línea.
// Automático NO es un proveedor: es un modo. Estaba en la misma rejilla que los tres y
// se veía: su nota es larga, ensanchaba su columna y la rejilla salía descuadrada. Va
// arriba y a lo ancho, que además es lo que es —o elige él, o eliges tú uno de estos.
const PROVEEDORES = [
  { id: "gemini", nombre: "Gemini", nota: "gratis" },
  { id: "claude", nombre: "Claude", nota: "de pago" },
  { id: "openai", nombre: "OpenAI", nota: "sin clientes" },
];

export default function Asistente({ contexto, onCerrar, onOlvidar }) {
  const [pestana, setPestana] = useState("charla");
  const [url, setUrl] = useState(() => leer(CLAVE_URL));
  const [proveedor, setProveedor] = useState(() => leer(CLAVE_PROVEEDOR, "auto") || "auto");
  // Lo que el Worker dice que tiene configurado. Hasta la primera respuesta no se sabe,
  // y se supone Gemini —que es el que se monta por defecto— en vez de no dejar preguntar.
  const [disponibles, setDisponibles] = useState([]);
  const [companero, setCompanero] = useState(() => leer(CLAVE_COMPANERO, "chef") || "chef");
  const [gasto, setGasto] = useState(() => leerGasto());
  const [tope, setTope] = useState(() => leerTope());
  const [huboError, setHuboError] = useState(false);
  const [nivel, setNivel] = useState(() => nivelValido(leer(CLAVE_NIVEL, NIVEL_POR_DEFECTO)));
  // Los cambios que el asistente ha propuesto y esperan un sí. En "Con permiso" nada se
  // aplica hasta que alguien lo aprueba aquí — si se aplicara y luego se enseñara, el
  // permiso sería un cartel, no un permiso.
  const [pendientes, setPendientes] = useState([]);
  const [vozActiva, setVozActiva] = useState(() => leer(CLAVE_VOZ, "1") === "1");
  // El historial vive en este navegador: una conversación es de quien la tuvo. Lo que
  // sirve al equipo ya se guarda en el cerebro y en las tareas.
  const [charlas, setCharlas] = useState(() => leerCharlas());
  const [charlaId, setCharlaId] = useState("");
  const [verHistorial, setVerHistorial] = useState(false);
  const [ajustes, setAjustes] = useState(() => !leer(CLAVE_URL));
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [enCurso, setEnCurso] = useState("");
  const [hilo, setHilo] = useState([]);          // lo que se ve
  const [mensajes, setMensajes] = useState([]);  // lo que se manda (con las llamadas)
  const finRef = useRef(null);

  useEffect(() => { if (finRef.current) finRef.current.scrollIntoView({ block: "end" }); }, [hilo, pensando]);

  // Por dónde escribe el asistente. En "Confianza" se aplica y se cuenta; en "Con
  // permiso" se guarda para que lo apruebe una persona. La herramienta no sabe en cuál
  // de los dos está: le contesta lo que ha pasado y ya.
  const escribir = (propuesta) => {
    if (!contexto.onEscribir) {
      return { error: "Esta pantalla no deja cambiar nada. Explica dónde se hace a mano." };
    }
    if (NIVELES[nivel].confirma) {
      const id = `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      setPendientes(p => [...p, { ...propuesta, id }]);
      return {
        pendiente: true,
        resumen: propuesta.resumen,
        mensaje: "Propuesto, pero NO aplicado: le sale a la persona en pantalla para que lo apruebe. Díselo y no des el cambio por hecho.",
      };
    }
    try {
      const r = contexto.onEscribir(propuesta);
      return { hecho: true, resumen: propuesta.resumen, ...(r || {}) };
    } catch (err) {
      return { error: `No se ha podido aplicar: ${err && err.message ? err.message : err}` };
    }
  };

  const resolver = (id, aplicar) => {
    const p = pendientes.find(x => x.id === id);
    setPendientes(xs => xs.filter(x => x.id !== id));
    if (!p) return;
    if (!aplicar) {
      setHilo(h => [...h, { de: "el", texto: `Descartado: ${p.resumen}` }]);
      return;
    }
    try {
      contexto.onEscribir(p);
      setHilo(h => [...h, { de: "el", texto: `Hecho: ${p.resumen}` }]);
    } catch (err) {
      setHilo(h => [...h, { de: "error", texto: `No se ha podido aplicar: ${err && err.message ? err.message : err}` }]);
    }
  };

  const enviar = async (e, dictado = "") => {
    if (e) e.preventDefault();
    const pregunta = (dictado || texto).trim();
    if (!pregunta || pensando) return;
    // El tope se comprueba ANTES de mandar nada: preguntar y luego decir que no había
    // presupuesto sería haberlo gastado igual.
    if (proveedor !== "auto" && !esGratis(proveedor)) {
      const permiso = puedePreguntar(proveedor, gasto, tope);
      if (!permiso.puede) {
        setHilo(h => [...h, { de: "yo", texto: pregunta }, { de: "error", texto: permiso.motivo }]);
        setTexto("");
        setHuboError(true);
        return;
      }
    }
    setTexto("");
    setHilo(h => [...h, { de: "yo", texto: pregunta }]);
    setPensando(true);
    setEnCurso("");
    try {
      const token = await tokenDeSesion().catch(() => "");
      const comun = {
        mensajes, contexto: { ...contexto, nivel, onEscribir: escribir }, url, token,
        onPaso: (p) => setEnCurso(p.nombre),
        onUsoMemoria: contexto.onUsoMemoria,
      };
      const r = proveedor === "auto"
        ? await preguntarAuto({ ...comun, texto: pregunta, disponibles, onProveedor: (p) => setEnCurso(`preguntando a ${p}`) })
        : await preguntar({ ...comun, texto: pregunta, proveedor });
      setMensajes(r.mensajes);
      setHuboError(false);
      // Lo que ha costado esta pregunta. Se apunta aquí y no en el proxy porque el
      // contador es para mirarlo, no para facturar: subirlo a la nube en cada pregunta
      // serían escrituras constantes por un número que solo sirve de aviso.
      if (r.uso) setGasto(apuntar(r.proveedor, r.uso));
      // La lista de configurados llega con cada respuesta: así el enrutado de la
      // siguiente pregunta ya sabe con qué cuenta, sin una petición aparte.
      if (r.disponibles) setDisponibles(r.disponibles);
      setHilo(h => {
        const siguiente = [...h, {
          de: "el", texto: r.respuesta, pasos: r.pasos, quien: r.proveedor, motivo: r.motivo,
          coste: costeDeUna(r.proveedor, r.uso),
        }];
        // Se guarda al cerrar cada vuelta, no al cerrar el panel: cerrar el panel es
        // justo lo que antes lo perdía todo.
        const id = charlaId || `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
        if (!charlaId) setCharlaId(id);
        setCharlas(guardarCharla(charlas, { id, hilo: siguiente, mensajes: r.mensajes }));
        return siguiente;
      });

    } catch (err) {
      setHuboError(true);
      setHilo(h => [...h, { de: "error", texto: String(err && err.message ? err.message : err) }]);
    } finally {
      setPensando(false);
      setEnCurso("");
    }
  };

  return (
    <div className="asis-fondo" role="dialog" aria-label="Asistente" aria-modal="true">
      <div className="asis-panel">
        <div className="asis-cab">
          <Companero cual={companero} size={30}
            estado={pensando ? "pensando" : huboError ? "error" : "quieto"} />
          <span className="asis-titulo">Asistente</span>
          <button type="button" className="asis-icono" onClick={() => setVerHistorial(v => !v)}
            aria-expanded={verHistorial} aria-label="Conversaciones guardadas" title="Conversaciones guardadas">
            <History size={16} aria-hidden="true" />
          </button>
          <button type="button" className="asis-icono" onClick={() => setAjustes(v => !v)}
            aria-expanded={ajustes} aria-label="Ajustes del asistente" title="Ajustes">
            <Settings size={16} aria-hidden="true" />
          </button>
          <button type="button" className="asis-icono" onClick={onCerrar} aria-label="Cerrar asistente" title="Cerrar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* La charla y el cerebro son dos vistas del mismo panel: lo que sabe y lo que le
            preguntas. Separarlas en dos sitios distintos haría que nadie abriera nunca el
            cerebro, y entonces lo que aprende mal no lo corrige nadie.
            Van en su PROPIA fila y no en la cabecera: con el título y los dos iconos al
            lado no cabían en un móvil de 320px y se salían por la derecha. */}
        <div className="asis-pestanas" role="tablist" aria-label="Vistas del asistente">
          <button type="button" role="tab" className={`asis-pestana${pestana === "charla" ? " es-activa" : ""}`}
            onClick={() => setPestana("charla")} aria-selected={pestana === "charla"}>
            <MessageCircle size={14} aria-hidden="true" /> Charla
          </button>
          <button type="button" role="tab" className={`asis-pestana${pestana === "cerebro" ? " es-activa" : ""}`}
            onClick={() => setPestana("cerebro")} aria-selected={pestana === "cerebro"}>
            <Brain size={14} aria-hidden="true" /> Cerebro
            {(contexto.memoria || []).length > 0 && <em>{(contexto.memoria || []).length}</em>}
          </button>
        </div>

        {verHistorial && (
          <div className="asis-ajustes asis-historial">
            <button type="button" className="btn btn-outline cer-anadir"
              onClick={() => { setHilo([]); setMensajes([]); setCharlaId(""); setVerHistorial(false); }}>
              <Plus size={14} aria-hidden="true" /> Conversación nueva
            </button>
            {!charlas.length && <p className="asis-explica">Todavía no hay ninguna guardada.</p>}
            {charlas.map(c => (
              <div className={`asis-charla${c.id === charlaId ? " es-abierta" : ""}`} key={c.id}>
                <button type="button" className="asis-charla-abrir"
                  onClick={() => { setHilo(c.hilo); setMensajes(c.mensajes); setCharlaId(c.id); setVerHistorial(false); setPestana("charla"); }}>
                  <span>{c.titulo}</span>
                  <em>{cuandoFue(c.cuando)}</em>
                </button>
                <button type="button" className="asis-recuerdo-borrar"
                  onClick={() => { setCharlas(borrarCharla(charlas, c.id)); if (c.id === charlaId) { setHilo([]); setMensajes([]); setCharlaId(""); } }}
                  title="Borrarla" aria-label={`Borrar: ${c.titulo}`}>
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {ajustes && (
          <div className="asis-ajustes">
            <label className="asis-campo">
              <span>Dirección del proxy</span>
              <input
                className="form-input" type="url" inputMode="url" placeholder="https://asistente-gula.tucuenta.workers.dev"
                value={url}
                onChange={e => { setUrl(e.target.value); guardar(CLAVE_URL, e.target.value.trim()); }}
              />
            </label>
            <button
              type="button"
              className={`asis-auto${proveedor === "auto" ? " es-activa" : ""}`}
              onClick={() => { setProveedor("auto"); guardar(CLAVE_PROVEEDOR, "auto"); }}
              aria-pressed={proveedor === "auto"}
            >
              <strong>Automático</strong>
              <em>elige según la pregunta</em>
            </button>
            <div className="asis-proveedores">
              {PROVEEDORES.map(p => (
                <button
                  key={p.id} type="button"
                  className={`bebida-chip${proveedor === p.id ? " es-activa" : ""}`}
                  onClick={() => { setProveedor(p.id); guardar(CLAVE_PROVEEDOR, p.id); }}
                  aria-pressed={proveedor === p.id}
                >
                  {p.nombre} <em className="asis-nota">{p.nota}</em>
                </button>
              ))}
            </div>
            <label className="asis-campo">
              <span>Qué se le deja hacer</span>
              <div className="asis-niveles">
                {CLAVES_NIVEL.map(k => (
                  <button
                    key={k} type="button"
                    className={`bebida-chip${nivel === k ? " es-activa" : ""}`}
                    onClick={() => { setNivel(k); guardar(CLAVE_NIVEL, k); }}
                    aria-pressed={nivel === k}
                  >
                    {NIVELES[k].nombre}
                  </button>
                ))}
              </div>
              <span className="asis-nota">{NIVELES[nivel].resumen}</span>
            </label>

            <label className="asis-campo">
              <span>Compañero</span>
              <div className="asis-munecos">
                {CLAVES_COMPANERO.map(k => (
                  <button
                    key={k} type="button"
                    className={`asis-muneco${companero === k ? " es-activo" : ""}`}
                    onClick={() => { setCompanero(k); guardar(CLAVE_COMPANERO, k); }}
                    title={COMPANEROS[k].nombre} aria-label={COMPANEROS[k].nombre}
                    aria-pressed={companero === k}
                  >
                    {k === "ninguno"
                      ? <span className="asis-muneco-no">sin</span>
                      : <Companero cual={k} size={30} estado="quieto" />}
                  </button>
                ))}
              </div>
            </label>

            <p className="asis-explica">
              Las claves no viven aquí: viven en el proxy. Sin él no hay asistente, y con
              una clave metida en la app la leería cualquiera — el repositorio es público.
              Los pasos para montarlo están en <code>worker/README.md</code>.
              {proveedor === "auto" && (
                <> <strong>En automático</strong> se elige según lo que preguntes: lo gratis
                para el día a día, el de pago solo cuando haya que comparar o recomendar, y
                nunca OpenAI para nada que lleve nombres de clientes.</>
              )}
              {proveedor === "openai" && (
                <> <strong>Con OpenAI solo funcionan las cuentas y los cálculos:</strong> no
                se le manda ningún nombre de cliente ni ninguna fecha.</>
              )}
            </p>
          </div>
        )}

        {pestana === "tareas" ? (
          <div className="asis-hilo asis-cerebro">
            <p className="asis-explica">
              Lo que hay que hacer y no sale de ninguna checklist: pedir material, llamar a
              alguien, confirmar algo. El asistente puede apuntarlas cuando las detecte, si
              le has dado permiso.
            </p>
            {!(contexto.tareas || []).length && <p className="asis-vacio">No hay nada apuntado.</p>}
            {tareasPorEvento(contexto.tareas || []).map(g => (
              <div className="asis-tema" key={g.evento || "sueltas"}>
                <div className="asis-tema-titulo">{g.titulo}</div>
                {g.tareas.map(t => (
                  <div className={`asis-recuerdo${t.hecho ? " es-hecha" : ""}`} key={t.id}>
                    <button type="button" className="asis-tarea-check"
                      onClick={() => contexto.onMarcarTarea && contexto.onMarcarTarea(t.id, !t.hecho)}
                      aria-pressed={t.hecho} aria-label={`${t.hecho ? "Desmarcar" : "Dar por hecha"}: ${t.texto}`}>
                      {t.hecho ? <Check size={13} aria-hidden="true" /> : <span className="asis-tarea-vacia" />}
                    </button>
                    <span className="asis-recuerdo-texto">{t.texto}</span>
                    <button type="button" className="asis-recuerdo-borrar"
                      onClick={() => contexto.onQuitarTarea && contexto.onQuitarTarea(t.id)}
                      title="Quitarla" aria-label={`Quitar: ${t.texto}`}>
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : pestana === "humano" ? (
          <div className="asis-hilo">
            <Humano
              cual={companero === "ninguno" ? "chef" : companero}
              estado={pensando ? "pensando" : huboError ? "error" : "quieto"}
              haciendo={enCurso}
              ultimaRespuesta={[...hilo].reverse().find(m => m.de === "el")?.texto || ""}
              vozActiva={vozActiva}
              onCambiarVoz={(v) => { setVozActiva(v); guardar(CLAVE_VOZ, v ? "1" : "0"); }}
              // Lo dictado entra por la MISMA puerta que lo escrito: mismas herramientas,
              // mismos permisos, mismo enrutado. Hablarle no es un camino aparte.
              onPregunta={(t) => enviar(null, t)}
            />
          </div>
        ) : pestana === "gasto" ? (
          <div className="asis-hilo asis-cerebro">
            <p className="asis-explica">
              Lo que llevas consumido este mes, contado en este navegador. Los precios son
              aproximados y de la web de cada uno: el número exacto importa menos que el
              orden de magnitud, que es lo que hace falta para saber si una pregunta merece
              el modelo caro.
            </p>

            {!resumen(gasto).length && <p className="asis-vacio">Todavía no has preguntado nada este mes.</p>}

            {resumen(gasto).map(r => (
              <div className="asis-recuerdo" key={r.proveedor}>
                <span className="asis-recuerdo-texto">
                  <strong>{r.nombre}</strong>
                  <em className="asis-gasto-detalle">
                    {r.preguntas} pregunta{r.preguntas === 1 ? "" : "s"} · {r.tokens.toLocaleString("es-ES")} tokens
                  </em>
                </span>
                <span className={`asis-recuerdo-puntos${r.gratis ? " es-gratis" : ""}`}>
                  {r.gratis ? "gratis" : `${r.euros.toFixed(2)}€`}
                </span>
              </div>
            ))}

            {resumen(gasto).length > 0 && (
              <>
                <div className="asis-gasto-total">
                  <span>Total del mes</span>
                  <strong>{eurosTotales(gasto).toFixed(2)}€</strong>
                </div>
                {/* Hoy va aparte del mes porque las capas gratuitas limitan POR DÍA: el
                    número mensual no avisa de que vas a tocar techo esta tarde. Y la
                    media es lo que dice si se está mandando de más. */}
                <div className="asis-gasto-cifras">
                  <div>
                    <span>Hoy</span>
                    <strong>{totales(gasto).hoyPreguntas}</strong>
                    <em>{totales(gasto).hoyTokens.toLocaleString("es-ES")} tk</em>
                  </div>
                  <div>
                    <span>Este mes</span>
                    <strong>{totales(gasto).preguntas}</strong>
                    <em>{totales(gasto).tokens.toLocaleString("es-ES")} tk</em>
                  </div>
                  <div>
                    <span>Media</span>
                    <strong>{totales(gasto).media.toLocaleString("es-ES")}</strong>
                    <em>tk por pregunta</em>
                  </div>
                </div>
              </>
            )}

            <label className="asis-campo">
              <span>Tope al mes (0 = sin tope)</span>
              <input
                className="form-input" type="number" min="0" step="1" inputMode="decimal"
                value={tope}
                onChange={e => setTope(ponerTope(e.target.value))}
              />
            </label>
            <p className="asis-explica">
              {/* Parar Gemini por un tope de dinero cuando no cuesta nada sería absurdo,
                  y dejaría a la app sin asistente por un número que no aplica. */}
              El tope solo frena a los de pago. Gemini es gratis y sigue contestando aunque
              se pase.
            </p>

            {resumen(gasto).length > 0 && (
              <button type="button" className="btn btn-outline"
                onClick={() => { if (confirm("¿Poner el contador a cero?")) setGasto(borrarGasto()); }}>
                Poner el contador a cero
              </button>
            )}
          </div>
        ) : pestana === "cerebro" ? (
          <Cerebro
            memoria={contexto.memoria || []}
            objetivos={contexto.objetivos || []}
            eventosGuardados={contexto.eventosGuardados || {}}
            onOlvidar={onOlvidar}
            onPonerObjetivo={contexto.onPonerObjetivo}
            onCambiarEstadoObjetivo={contexto.onCambiarEstadoObjetivo}
            onQuitarObjetivo={contexto.onQuitarObjetivo}
          />
        ) : (
        <div className="asis-hilo">
          {!hilo.length && (
            <div className="asis-vacio">
              <p>Pregúntame por tus eventos. Los números salen de las fórmulas de la app, no de mi cabeza.</p>
              <ul>
                <li>¿Cuánto hielo llevo a la boda de septiembre?</li>
                <li>¿A qué hora hay que salir del obrador?</li>
                <li>¿Qué eventos tengo sin configurar?</li>
                <li>¿Cuánta gente hace falta para una comunión de 90?</li>
              </ul>
            </div>
          )}
          {hilo.map((m, i) => (
            <div className={`asis-msg es-${m.de}`} key={i}>
              <div className="asis-burbuja">{m.texto}</div>
              {/* De dónde sale lo que acaba de decir */}
              {(m.pasos && m.pasos.length > 0) || m.coste || (m.quien && disponibles.length > 1) ? (
                <div className="asis-pasos">
                  {m.pasos && m.pasos.length > 0 && <Wrench size={11} aria-hidden="true" />}
                  {(m.pasos || []).map((p, j) => <span className="asis-paso" key={j}>{p.nombre}</span>)}
                  {/* Quién ha contestado, y por qué le tocó a él. Un asistente que cambia
                      de modelo sin decirlo hace que nadie entienda por qué a veces tarda
                      más o contesta distinto. Solo se enseña si hay más de uno. */}
                  {m.quien && disponibles.length > 1 && (
                    <span className="asis-paso es-quien">
                      {m.quien}{m.motivo ? ` · ${m.motivo}` : ""}
                    </span>
                  )}
                  {m.coste && (
                    <span className={`asis-paso es-coste${m.coste.gratis ? " es-gratis" : ""}`}>
                      {m.coste.tokens.toLocaleString("es-ES")} tk
                      {!m.coste.gratis && ` · ${m.coste.euros.toFixed(3)}€`}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          ))}
          {pensando && (
            <div className="asis-msg es-el">
              <div className="asis-burbuja asis-pensando">
                <Loader2 size={14} className="asis-gira" aria-hidden="true" />
                {enCurso ? `mirando ${enCurso.replace(/_/g, " ")}…` : "pensando…"}
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>
        )}

        {/* Encima del campo de escribir a propósito: es lo último que se mira antes de
            seguir preguntando, y así no se queda un cambio esperando sin que nadie lo vea. */}
        {pestana === "charla" && pendientes.length > 0 && (
          <div className="asis-pendientes">
            {pendientes.map(p => (
              <div className="asis-pendiente" key={p.id}>
                <span className="asis-pendiente-texto">
                  {p.ojo && <strong>⚠️ </strong>}{p.resumen}
                </span>
                <div className="asis-pendiente-botones">
                  <button type="button" className="btn asis-si" onClick={() => resolver(p.id, true)}>
                    <Check size={14} aria-hidden="true" /> Hacerlo
                  </button>
                  <button type="button" className="btn btn-outline asis-no" onClick={() => resolver(p.id, false)}>
                    <Ban size={14} aria-hidden="true" /> No
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pestana === "charla" && (
        <form className="asis-escribir" onSubmit={enviar}>
          <input
            className="form-input" type="text" value={texto} placeholder="Escribe tu pregunta"
            aria-label="Pregunta para el asistente"
            onChange={e => setTexto(e.target.value)}
            disabled={pensando}
          />
          <button type="submit" className="btn" disabled={pensando || !texto.trim()} aria-label="Enviar">
            <Send size={15} aria-hidden="true" />
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
