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
import { Send, X, Sparkles, Settings, Loader2, Wrench, Brain, Trash2, MessageCircle } from "lucide-react";
import { preguntarAuto, preguntar } from "./cliente.js";
import { tokenDeSesion } from "../auth.js";
import { porTemas, TEMAS } from "./memoria.js";

const CLAVE_URL = "gula_asistente_url";
const CLAVE_PROVEEDOR = "gula_asistente_proveedor";

const leer = (k, x = "") => { try { return localStorage.getItem(k) || x; } catch (e) { return x; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } };

// El Worker admite además un proveedor "compatible" (OpenRouter, Groq, DeepSeek…). No
// sale aquí a propósito: con uno configurado no hay nada que elegir, y cuatro botones
// para tres opciones reales es una pantalla más llena sin ser más útil. El día que se
// use, se añade una línea.
const PROVEEDORES = [
  { id: "auto", nombre: "Automático", nota: "elige según la pregunta" },
  { id: "gemini", nombre: "Gemini", nota: "gratis" },
  { id: "claude", nombre: "Claude", nota: "de pago" },
  { id: "openai", nombre: "OpenAI", nota: "sin datos de clientes" },
];

export default function Asistente({ contexto, onCerrar, onOlvidar }) {
  const [pestana, setPestana] = useState("charla");
  const [url, setUrl] = useState(() => leer(CLAVE_URL));
  const [proveedor, setProveedor] = useState(() => leer(CLAVE_PROVEEDOR, "auto") || "auto");
  // Lo que el Worker dice que tiene configurado. Hasta la primera respuesta no se sabe,
  // y se supone Gemini —que es el que se monta por defecto— en vez de no dejar preguntar.
  const [disponibles, setDisponibles] = useState([]);
  const [ajustes, setAjustes] = useState(() => !leer(CLAVE_URL));
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [enCurso, setEnCurso] = useState("");
  const [hilo, setHilo] = useState([]);          // lo que se ve
  const [mensajes, setMensajes] = useState([]);  // lo que se manda (con las llamadas)
  const finRef = useRef(null);

  useEffect(() => { if (finRef.current) finRef.current.scrollIntoView({ block: "end" }); }, [hilo, pensando]);

  const enviar = async (e) => {
    e.preventDefault();
    const pregunta = texto.trim();
    if (!pregunta || pensando) return;
    setTexto("");
    setHilo(h => [...h, { de: "yo", texto: pregunta }]);
    setPensando(true);
    setEnCurso("");
    try {
      const token = await tokenDeSesion().catch(() => "");
      const comun = {
        mensajes, contexto, url, token,
        onPaso: (p) => setEnCurso(p.nombre),
        onUsoMemoria: contexto.onUsoMemoria,
      };
      const r = proveedor === "auto"
        ? await preguntarAuto({ ...comun, texto: pregunta, disponibles, onProveedor: (p) => setEnCurso(`preguntando a ${p}`) })
        : await preguntar({ ...comun, texto: pregunta, proveedor });
      setMensajes(r.mensajes);
      // La lista de configurados llega con cada respuesta: así el enrutado de la
      // siguiente pregunta ya sabe con qué cuenta, sin una petición aparte.
      if (r.disponibles) setDisponibles(r.disponibles);
      setHilo(h => [...h, { de: "el", texto: r.respuesta, pasos: r.pasos, quien: r.proveedor, motivo: r.motivo }]);
    } catch (err) {
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
          <span className="asis-titulo"><Sparkles size={16} aria-hidden="true" /> Asistente</span>
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
            <div className="asis-proveedores">
              {PROVEEDORES.map(p => (
                <button
                  key={p.id} type="button"
                  className={`bebida-chip${proveedor === p.id ? " es-activa" : ""}`}
                  onClick={() => { setProveedor(p.id); guardar(CLAVE_PROVEEDOR, p.id); }}
                >
                  {p.nombre} <em className="asis-nota">{p.nota}</em>
                </button>
              ))}
            </div>
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

        {pestana === "cerebro" ? (
          <div className="asis-hilo asis-cerebro">
            <p className="asis-explica">
              Lo que ha aprendido de vosotros y que no sale de ningún cálculo. Está en
              texto a propósito: se lee y se corrige. Un cerebro que no puedes abrir es un
              cerebro en el que no puedes confiar — y si aprende mal que en las bodas van
              dos de cocina, se carga mal el camión y nadie sabe por qué.
            </p>
            {!(contexto.memoria || []).length && (
              <p className="asis-vacio">
                Todavía no sabe nada. Cuéntale cosas en la charla —"en la finca X no hay
                enchufe en la carpa", "en comuniones ponemos 3 de cocina"— y las guarda.
              </p>
            )}
            {porTemas(contexto.memoria || []).map(g => (
              <div className="asis-tema" key={g.tema}>
                <div className="asis-tema-titulo">{g.titulo}</div>
                {g.recuerdos.map(r => (
                  <div className="asis-recuerdo" key={r.id}>
                    <span className="asis-recuerdo-texto">{r.texto}</span>
                    {/* Las veces que le ha hecho falta de verdad: lo que sube se queda,
                        lo que nunca sube se cae cuando hay que hacer sitio. */}
                    <span className="asis-recuerdo-puntos" title={`Le ha hecho falta ${r.puntos} ${r.puntos === 1 ? "vez" : "veces"}`}>{r.puntos}</span>
                    <button type="button" className="asis-recuerdo-borrar"
                      onClick={() => onOlvidar && onOlvidar(r.id)}
                      title="Que lo olvide" aria-label={`Que olvide: ${r.texto}`}>
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
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
              {(m.pasos && m.pasos.length > 0) || (m.quien && disponibles.length > 1) ? (
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
