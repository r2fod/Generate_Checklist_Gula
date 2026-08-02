// ─── FORMULARIO DE OFICINA ─────────────────────────────────────────────────────
// Lo que ve quien manda los datos de un evento desde su móvil. Una pregunta por
// pantalla, botones grandes y "No lo sé" en casi todas: una respuesta en blanco es
// información buena (dice a quién hay que llamar), y una inventada es veneno.
//
// Esta pantalla NO entra en la app: se abre con ?enviar=<código> y desde aquí no hay
// forma de llegar a la checklist, ni a la configuración, ni a los eventos.
import { useState, useEffect, useMemo } from "react";
import { preguntasDe, opcionesDe, TIPOS_EVENTO, resumirRespuesta, fmtFechaCorta as fmtFecha } from "./preguntas.js";
import { leerProximos, enviarFormulario, corregirEnvio } from "./envios.js";
import logoGula from "../assets/gula-logo.png";
import FondoIconos from "./FondoIconos.jsx";
import CampoArchivo from "./CampoArchivo.jsx";
import { leerMios, apuntarEnvio } from "./mios.js";

const HORAS = [1, 2, 3, 4, 5, 6, 7, 8];

// El logo, para que quien rellena esto sepa de quién es el formulario. Entra con un
// gesto corto la primera vez y luego se queda quieto: es una marca, no un anuncio.
function LogoGula({ grande = false, pequeno = false }) {
  return (
    <div className={`form-logo ${grande ? "es-grande" : ""} ${pequeno ? "es-pequeno" : ""}`}>
      <img src={logoGula} alt="Gula" />
    </div>
  );
}

// "hace 10 min", "ayer": para saber de un vistazo si eso que mandaste es de hoy
function fmtCuando(ms) {
  if (!ms) return "hace un rato";
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export default function Formulario({ codigo }) {
  const clave = `gula_formulario_${codigo}`;
  const [guardado] = useState(() => {
    try { return JSON.parse(localStorage.getItem(clave) || "{}"); } catch (e) { return {}; }
  });
  const [proximos, setProximos] = useState(null); // null = cargando
  const [codigoMalo, setCodigoMalo] = useState(false);
  const [eventoDestino, setEventoDestino] = useState(guardado.eventoDestino ?? null); // null = sin elegir
  const [respuestas, setRespuestas] = useState(guardado.respuestas ?? {});
  const [paso, setPaso] = useState(guardado.paso ?? -1);
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  // Si al corregir resulta que logística ya lo había revisado, se dice: se ha
  // mandado como envío nuevo y hay dos, y eso hay que saberlo.
  const [yaRevisado, setYaRevisado] = useState(false);
  // Id del envío que se acaba de mandar. Mientras logística no lo revise se puede
  // corregir (cambian los pax, se cae la barra...) en vez de mandar otro y que les
  // lleguen dos versiones del mismo evento sin saber cuál vale.
  const [envioId, setEnvioId] = useState(guardado.envioId ?? "");
  // Lo que ya se ha mandado desde este móvil, para poder volver y cambiarlo
  const [mios, setMios] = useState(() => leerMios());
  // Instalar el formulario en la pantalla de inicio: así no hay que buscar el enlace
  // en el WhatsApp cada vez. En Android y en el ordenador el navegador nos deja
  // pedirlo; en iPhone no hay forma de pedirlo desde la web y hay que explicarlo.
  const [avisoInstalar, setAvisoInstalar] = useState(null); // null | "puede" | "iphone"
  const [pedirInstalar, setPedirInstalar] = useState(null); // el evento del navegador

  useEffect(() => {
    try { if (localStorage.getItem("gula_formulario_instalar") === "no") return; } catch (e) { /* da igual */ }
    // Ya instalado: no se dice nada
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone) return;
    const alPoder = (e) => { e.preventDefault(); setPedirInstalar(e); setAvisoInstalar("puede"); };
    window.addEventListener("beforeinstallprompt", alPoder);
    const esIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (esIphone) setAvisoInstalar("iphone");
    return () => window.removeEventListener("beforeinstallprompt", alPoder);
  }, []);

  const noInstalar = () => {
    try { localStorage.setItem("gula_formulario_instalar", "no"); } catch (e) { /* da igual */ }
    setAvisoInstalar(null);
  };
  const instalar = async () => {
    if (!pedirInstalar) return;
    pedirInstalar.prompt();
    try { await pedirInstalar.userChoice; } catch (e) { /* da igual lo que elijan */ }
    setPedirInstalar(null);
    setAvisoInstalar(null);
  };
  const bloqueInstalar = !avisoInstalar ? null : (
    <div className="form-instalar">
      <div className="form-instalar-texto">
        <strong>Ténlo a mano</strong>
        {avisoInstalar === "iphone"
          ? <span>Dale a Compartir y luego a "Añadir a pantalla de inicio": se queda como una app y no hay que buscar el enlace.</span>
          : <span>Instálalo y se queda como una app, sin buscar el enlace cada vez.</span>}
      </div>
      <div className="form-instalar-acciones">
        {avisoInstalar === "puede" && <button className="form-btn-principal" onClick={instalar}>Instalar</button>}
        <button className="form-btn-atras" onClick={noInstalar}>Ahora no</button>
      </div>
    </div>
  );

  useEffect(() => {
    leerProximos(codigo).then(r => {
      // Un código que no existe cierra el formulario: si no, cualquiera que probara un
      // ?enviar= inventado podría mandar cosas al buzón. Sin conexión no se cierra —
      // eso no dice nada del código y sería dejar tirada a quien tiene mala cobertura.
      if (!r.ok && r.motivo === "no-existe") { setCodigoMalo(true); setProximos([]); return; }
      setProximos(r.ok ? r.eventos : []);
    });
  }, [codigo]);

  // Se guarda según escriben: si cierran el navegador a media pregunta, vuelven donde
  // lo dejaron. Es un formulario que se rellena de pie y con prisa.
  useEffect(() => {
    try { localStorage.setItem(clave, JSON.stringify({ respuestas, paso, eventoDestino, envioId })); }
    catch (e) { /* sin sitio o en privado: se sigue igual, solo se pierde el borrador */ }
  }, [clave, respuestas, paso, eventoDestino, envioId]);

  const tipo = respuestas.tipo || "boda";
  // Hay preguntas que dependen de otra respuesta (las carpas de alquiler solo si no hay
  // sombra), así que la lista se recalcula con lo contestado hasta ahora. La condicional
  // va justo detrás de la que la dispara, así que el paso siguiente cae en ella sola.
  const preguntas = useMemo(() => preguntasDe(tipo, respuestas)
    // Si han elegido un evento que ya existe, el tipo ya lo sabemos: no se pregunta
    .filter(p => !(p.id === "tipo" && eventoDestino)), [tipo, eventoDestino, respuestas]);

  // Los sitios de los próximos eventos, para ofrecerlos al escribir el sitio
  const sitiosConocidos = useMemo(
    () => [...new Set((proximos || []).map(e => (e.sitio || "").trim()).filter(Boolean))],
    [proximos]);

  const pon = (campo, valor) => setRespuestas(r => ({ ...r, [campo]: valor }));
  const siguiente = () => setPaso(p => Math.min(p + 1, preguntas.length));
  // Desde el repaso, "Atrás" vuelve a la última pregunta. Se acota porque al abrir
  // un envío para cambiarlo se salta directo al repaso con un paso muy alto.
  const atras = () => setPaso(p => Math.min(p, preguntas.length) - 1);

  if (codigoMalo) {
    return (
      <div className="form-pantalla form-fin">
        <LogoGula />
        <h1>Este enlace ya no vale</h1>
        <p>Pídele a logística el enlace nuevo.</p>
      </div>
    );
  }

  // ── Pantalla final ─────────────────────────────────────────────────────────
  if (enviado) {
    return (
      <div className="form-pantalla form-fin">
        <FondoIconos pregunta="fin" />
        <LogoGula />
        <div className="form-fin-tic">✓</div>
        <h1>Enviado</h1>
        {yaRevisado
          ? <p>Logística ya había revisado el anterior, así que esto ha ido como un envío aparte. Avísales del cambio.</p>
          : <p>Ya le ha llegado a logística. Si algo no cuadra, te llamarán.</p>}
        {/* Cambian los pax, se cae la barra libre... se corrige lo mandado y a
            logística le llega la versión buena, no dos envíos del mismo evento. */}
        <button className="form-btn-principal" onClick={() => {
          const ultimo = leerMios()[0];
          if (ultimo) { setRespuestas(ultimo.respuestas || {}); setEventoDestino(ultimo.eventoDestino || ""); setEnvioId(ultimo.id); }
          setEnviado(false);
          setPaso(999); // al repaso: se cambia lo que sea y se manda
        }}>
          Cambiar algo de lo que he mandado
        </button>
        <button className="form-btn-atras" onClick={() => {
          try { localStorage.removeItem(clave); } catch (e) { /* da igual */ }
          setRespuestas({}); setPaso(-1); setEventoDestino(null); setEnviado(false); setEnvioId("");
        }}>Mandar otro evento</button>
      </div>
    );
  }

  // ── Elegir a qué evento van los datos ──────────────────────────────────────
  if (paso === -1) {
    const lista = (proximos || []).filter(e =>
      !busca.trim() || `${e.nombre} ${e.sitio}`.toLowerCase().includes(busca.trim().toLowerCase()));
    return (
      <div className="form-pantalla">
        <FondoIconos pregunta="elegir" />
        <LogoGula grande />
        <h1 className="form-titulo">¿De qué evento son los datos?</h1>
        {proximos === null && <p className="form-nota">Cargando los próximos eventos...</p>}
        {proximos !== null && proximos.length === 0 && (
          <p className="form-nota">No hay eventos próximos guardados. Sigue y lo creamos nuevo.</p>
        )}
        <div className="form-lista-eventos">
          {lista.map(e => (
            <button
              key={e.nombre}
              className="form-evento"
              onClick={() => {
                setEventoDestino(e.nombre);
                setRespuestas(r => ({ ...r, tipo: e.tipo, nombre: e.nombre, sitio: e.sitio, fecha: e.fecha }));
                setPaso(0);
              }}
            >
              <span className="form-evento-nombre">{e.nombre}</span>
              <span className="form-evento-datos">{fmtFecha(e.fecha)}{e.sitio ? ` · ${e.sitio}` : ""}</span>
            </button>
          ))}
        </div>
        {(proximos || []).length > 4 && (
          <input
            className="form-input"
            type="text"
            placeholder="¿No está? Busca por nombre"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        )}
        <button className="form-btn-principal" onClick={() => { setEventoDestino(""); setPaso(0); }}>
          + Es un evento nuevo
        </button>
        {/* Lo ya mandado desde este móvil: se puede volver a cualquiera y cambiarlo
            (cambian los pax, se cae la barra libre) en vez de mandar otro y que a
            logística le lleguen dos versiones del mismo evento. */}
        {mios.length > 0 && (
          <div className="form-mios">
            <span className="form-mios-titulo">Lo que has mandado</span>
            {mios.map(m => (
              <button
                className="form-evento form-mio"
                key={m.id}
                onClick={() => {
                  setRespuestas(m.respuestas || {});
                  setEventoDestino(m.eventoDestino || "");
                  setEnvioId(m.id);
                  // Directo al repaso, no a la primera pregunta: se viene a cambiar
                  // una cosa, no a contestarlo todo otra vez. Desde el repaso se toca
                  // la pregunta que sea y se manda.
                  setPaso(999);
                }}
              >
                <span className="form-evento-nombre">{m.nombre}</span>
                <span className="form-evento-datos">
                  {m.fecha ? `${fmtFecha(m.fecha)} · ` : ""}mandado {fmtCuando(m.enviado)} · toca para cambiarlo
                </span>
              </button>
            ))}
          </div>
        )}
        {bloqueInstalar}
      </div>
    );
  }

  // ── Repaso antes de enviar ─────────────────────────────────────────────────
  if (paso >= preguntas.length) {
    const enviar = async () => {
      setEnviando(true); setError("");
      try {
        let id = envioId;
        let eraCambio = !!envioId;
        if (envioId) {
          // Corregir el que ya mandaron. Si logística ya lo ha revisado, la nube lo
          // rechaza: entonces se manda uno nuevo, que es lo honesto.
          try {
            await corregirEnvio(envioId, respuestas, eventoDestino || "");
          } catch (e) {
            id = await enviarFormulario(codigo, respuestas, eventoDestino || "");
            eraCambio = false;
          }
        } else {
          id = await enviarFormulario(codigo, respuestas, eventoDestino || "");
        }
        apuntarEnvio({ id, respuestas, eventoDestino: eventoDestino || "" });
        setMios(leerMios());
        setYaRevisado(envioId && !eraCambio);
        setEnviado(true);
        // El borrador de trabajo se limpia: si no, la próxima vez que abran el
        // formulario se encuentran el evento anterior a medio poner, que es incómodo
        // y acaba mandándose otra vez sin querer. Lo mandado no se pierde: queda en
        // "Lo que has mandado", y desde ahí se abre para cambiarlo.
        setEnvioId("");
        try { localStorage.removeItem(clave); } catch (e) { /* da igual */ }
      } catch (e) {
        setError("No se ha podido enviar. Mira la conexión y vuelve a darle.");
      } finally { setEnviando(false); }
    };
    return (
      <div className="form-pantalla">
        <FondoIconos pregunta="repaso" />
        <LogoGula />
        <h1 className="form-titulo">¿Está todo bien?</h1>
        {eventoDestino
          ? <p className="form-nota">Son datos para <strong>{eventoDestino}</strong>.</p>
          : <p className="form-nota">Se creará un evento nuevo.</p>}
        {envioId && <p className="form-nota">Esto cambia lo que ya mandaste, no manda otro aparte.</p>}
        <div className="form-repaso">
          {preguntas.map((p, i) => (
            <button className="form-repaso-fila" key={p.id} onClick={() => setPaso(i)}>
              <span className="form-repaso-preg">{p.texto}</span>
              <span className="form-repaso-resp">{resumirRespuesta(p, respuestas, tipo)}</span>
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-acciones">
          <button className="form-btn-atras" onClick={atras} disabled={enviando}>Atrás</button>
          <button className="form-btn-principal" onClick={enviar} disabled={enviando}>
            {enviando ? "Enviando..." : envioId ? "Mandar el cambio" : "Enviar"}
          </button>
        </div>
      </div>
    );
  }

  // ── Una pregunta ───────────────────────────────────────────────────────────
  const p = preguntas[paso];
  const noSe = () => { pon(p.id, null); siguiente(); };

  return (
    <div className="form-pantalla">
      <FondoIconos pregunta={p.id} />
      <LogoGula pequeno />
      <div className="form-progreso"><div style={{ width: `${(paso / preguntas.length) * 100}%` }} /></div>
      {/* La clave por pregunta hace que cada pantalla entre con su animación en vez
          de cambiar el texto de golpe: se nota que has pasado de pregunta. */}
      <div className="form-entra" key={p.id}>
        <h1 className="form-titulo">{p.texto}</h1>
        {p.nota && <p className="form-nota">{typeof p.nota === "function" ? p.nota(respuestas) : p.nota}</p>}
      </div>

      <div className="form-campos form-entra form-entra-tarde" key={`campos-${p.id}`}>
        {p.tipo === "opciones" && (p.id === "tipo" ? TIPOS_EVENTO : opcionesDe(p, tipo)).map(o => {
          const elegida = respuestas[p.id] === o.valor;
          // Las opciones que arrastran algo detrás (cuántos entrantes, a quién se le
          // piden las flores, el archivo del menú) no pasan solas de pantalla: hay que
          // dejar contestarlo antes.
          const arrastraAlgo = !!(o.conNumero || o.conCampos || o.conArchivo);
          return (
            <div key={o.valor}>
              <button
                className={`form-opcion ${elegida ? "es-elegida" : ""}`}
                onClick={() => {
                  pon(p.id, o.valor);
                  // Al elegir la opción se guarda ya el número propuesto: si no, lo que
                  // se ve en pantalla y lo que viaja en el envío serían cosas distintas
                  // en cuanto no lo tocaran.
                  if (o.conNumero && typeof o.sugerido === "function") {
                    const campo = o.campoNumero || `${o.valor}Numero`;
                    if (respuestas[campo] === undefined) pon(campo, o.sugerido(respuestas));
                  }
                  if (!arrastraAlgo) setTimeout(siguiente, 120);
                }}
              >{o.texto}</button>
              {elegida && o.conNumero && (() => {
                // El campo se puede llamar como quiera la pregunta (numCarpas); si no,
                // se apaña con el valor de la opción, como se ha hecho siempre.
                const campo = o.campoNumero || `${o.valor}Numero`;
                const sugerido = typeof o.sugerido === "function" ? o.sugerido(respuestas) : 1;
                const valor = respuestas[campo] ?? sugerido;
                return (
                  <>
                    <div className="form-subcampo">
                      <span>{o.conNumero}</span>
                      <input
                        type="number" min="1" className="form-input form-input-corto"
                        value={valor}
                        onChange={e => pon(campo, Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                    </div>
                    {o.avisoNumero && <p className="form-nota form-nota-aviso">{o.avisoNumero(valor)}</p>}
                  </>
                );
              })()}
              {elegida && o.conCampos && o.conCampos.map(c => (
                <label className="form-campo form-subcampo-largo" key={c.sufijo}>
                  <span>{c.etiqueta}</span>
                  <input
                    type={c.tipo || "text"}
                    className="form-input"
                    placeholder={c.ejemplo}
                    value={respuestas[`${p.id}${c.sufijo}`] ?? ""}
                    onChange={e => pon(`${p.id}${c.sufijo}`, e.target.value)}
                  />
                </label>
              ))}
              {elegida && o.conArchivo && (
                <CampoArchivo
                  etiqueta={o.conArchivo.etiqueta}
                  archivo={respuestas[`${p.id}${o.conArchivo.sufijo}`]}
                  onCambio={(a) => pon(`${p.id}${o.conArchivo.sufijo}`, a)}
                />
              )}
            </div>
          );
        })}

        {p.tipo === "marcar" && opcionesDe(p, tipo).map(o => {
          const marcadas = respuestas[p.id] || [];
          const puesta = marcadas.includes(o.valor);
          return (
            <div key={o.valor}>
              <button
                className={`form-opcion ${puesta ? "es-elegida" : ""}`}
                onClick={() => pon(p.id, puesta ? marcadas.filter(v => v !== o.valor) : [...marcadas, o.valor])}
              >{o.texto}</button>
              {puesta && o.conNumero && (
                <div className="form-subcampo">
                  <span>{o.conNumero}</span>
                  <input
                    type="number" min="1" className="form-input form-input-corto"
                    value={respuestas[`${o.valor}Numero`] ?? ""}
                    onChange={e => pon(`${o.valor}Numero`, Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
              )}
            </div>
          );
        })}

        {p.tipo === "textos" && p.campos.map(c => (
          <label className="form-campo" key={c.id}>
            <span>{c.etiqueta}</span>
            <input
              type="text" className="form-input" placeholder={c.ejemplo}
              // Los sitios donde ya se ha trabajado se ofrecen escritos como están en la
              // app: "Mas de León" y "mas de leon" son el mismo sitio para una persona,
              // pero dos distintos en una lista, y luego no cuadra nada.
              list={c.sugerencias === "sitiosRecientes" ? "form-sitios" : undefined}
              value={respuestas[c.id] ?? ""}
              onChange={e => pon(c.id, e.target.value)}
            />
          </label>
        ))}
        {p.tipo === "textos" && sitiosConocidos.length > 0 && (
          <datalist id="form-sitios">
            {sitiosConocidos.map(s => <option value={s} key={s} />)}
          </datalist>
        )}

        {p.tipo === "numeros" && p.campos.map(c => (
          <label className="form-campo" key={c.id}>
            <span>{c.etiqueta}</span>
            <input
              type="number" min={c.min ?? 0} className="form-input"
              value={respuestas[c.id] ?? ""}
              onChange={e => pon(c.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </label>
        ))}

        {p.tipo === "cuando" && (
          <>
            <label className="form-campo"><span>Día</span>
              <input type="date" className="form-input" value={respuestas.fecha ?? ""} onChange={e => pon("fecha", e.target.value)} />
            </label>
            <label className="form-campo"><span>Empieza</span>
              <input type="time" className="form-input" value={respuestas.horaInicio ?? ""} onChange={e => pon("horaInicio", e.target.value)} />
            </label>
            <label className="form-campo"><span>Termina</span>
              <input type="time" className="form-input" value={respuestas.horaFin ?? ""} onChange={e => pon("horaFin", e.target.value)} />
            </label>
          </>
        )}

        {p.tipo === "horas" && (
          <>
            <button
              className={`form-opcion ${respuestas[p.id] === 0 ? "es-elegida" : ""}`}
              onClick={() => { pon(p.id, 0); setTimeout(siguiente, 120); }}
            >No hay</button>
            <div className="form-horas">
              {HORAS.map(h => (
                <button
                  key={h}
                  className={`form-hora ${respuestas[p.id] === h ? "es-elegida" : ""}`}
                  onClick={() => pon(p.id, h)}
                >{h}h</button>
              ))}
            </div>
          </>
        )}

        {p.tipo === "dias" && (
          <>
            <label className="form-campo"><span>¿Cuántos días?</span>
              <input
                type="number" min="1" max="7" className="form-input form-input-corto"
                value={(respuestas.dias || []).length || ""}
                onChange={e => {
                  const n = Math.min(7, Math.max(0, parseInt(e.target.value, 10) || 0));
                  pon("dias", Array.from({ length: n }, (_, i) => (respuestas.dias || [])[i] ?? ""));
                }}
              />
            </label>
            {(respuestas.dias || []).map((d, i) => (
              <label className="form-campo" key={i}><span>Día {i + 1}: ¿cuánta gente?</span>
                <input
                  type="number" min="0" className="form-input form-input-corto" value={d}
                  onChange={e => pon("dias", (respuestas.dias || []).map((x, j) => j === i ? e.target.value : x))}
                />
              </label>
            ))}
          </>
        )}

        {p.tipo === "texto-largo" && (
          <textarea
            className="form-input form-textarea" rows={4}
            placeholder="Alergias, peticiones, contacto en el sitio..."
            value={respuestas.notas ?? ""}
            onChange={e => pon("notas", e.target.value)}
          />
        )}
      </div>

      <div className="form-acciones">
        {paso > 0 && <button className="form-btn-atras" onClick={atras}>Atrás</button>}
        {p.noSe !== false && <button className="form-btn-nose" onClick={noSe}>No lo sé</button>}
        <button className="form-btn-principal" onClick={() => {
          // En las de marcar, pasar sin marcar nada significa "no lleva nada de esto",
          // que es una respuesta de verdad. "No lo sé" está justo al lado para cuando
          // no lo saben: si los dos botones hicieran lo mismo, no habría forma de
          // distinguir un menú sin paella de un menú que nadie ha mirado.
          if (p.tipo === "marcar" && respuestas[p.id] === undefined) pon(p.id, []);
          siguiente();
        }}>
          {paso === preguntas.length - 1 ? "Repasar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}

// Cómo se resume cada respuesta en la pantalla de repaso
