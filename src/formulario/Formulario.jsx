// ─── FORMULARIO DE OFICINA ─────────────────────────────────────────────────────
// Lo que ve quien manda los datos de un evento desde su móvil. Una pregunta por
// pantalla, botones grandes y "No lo sé" en casi todas: una respuesta en blanco es
// información buena (dice a quién hay que llamar), y una inventada es veneno.
//
// Esta pantalla NO entra en la app: se abre con ?enviar=<código> y desde aquí no hay
// forma de llegar a la checklist, ni a la configuración, ni a los eventos.
import { useState, useEffect, useMemo } from "react";
import { preguntasDe, opcionesDe, TIPOS_EVENTO, resumirRespuesta, fmtFechaCorta as fmtFecha } from "./preguntas.js";
import { leerProximos, enviarFormulario } from "./envios.js";

const HORAS = [1, 2, 3, 4, 5, 6, 7, 8];

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
    try { localStorage.setItem(clave, JSON.stringify({ respuestas, paso, eventoDestino })); }
    catch (e) { /* sin sitio o en privado: se sigue igual, solo se pierde el borrador */ }
  }, [clave, respuestas, paso, eventoDestino]);

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
  const atras = () => setPaso(p => p - 1);

  if (codigoMalo) {
    return (
      <div className="form-pantalla form-fin">
        <h1>Este enlace ya no vale</h1>
        <p>Pídele a logística el enlace nuevo.</p>
      </div>
    );
  }

  // ── Pantalla final ─────────────────────────────────────────────────────────
  if (enviado) {
    return (
      <div className="form-pantalla form-fin">
        <div className="form-fin-tic">✓</div>
        <h1>Enviado</h1>
        <p>Ya le ha llegado a logística. Si algo no cuadra, te llamarán.</p>
        <button className="form-btn-principal" onClick={() => {
          try { localStorage.removeItem(clave); } catch (e) { /* da igual */ }
          setRespuestas({}); setPaso(-1); setEventoDestino(null); setEnviado(false);
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
      </div>
    );
  }

  // ── Repaso antes de enviar ─────────────────────────────────────────────────
  if (paso >= preguntas.length) {
    const enviar = async () => {
      setEnviando(true); setError("");
      try {
        await enviarFormulario(codigo, respuestas, eventoDestino || "");
        try { localStorage.removeItem(clave); } catch (e) { /* da igual */ }
        setEnviado(true);
      } catch (e) {
        setError("No se ha podido enviar. Mira la conexión y vuelve a darle.");
      } finally { setEnviando(false); }
    };
    return (
      <div className="form-pantalla">
        <h1 className="form-titulo">¿Está todo bien?</h1>
        {eventoDestino
          ? <p className="form-nota">Son datos para <strong>{eventoDestino}</strong>.</p>
          : <p className="form-nota">Se creará un evento nuevo.</p>}
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
            {enviando ? "Enviando..." : "Enviar"}
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
      <div className="form-progreso"><div style={{ width: `${(paso / preguntas.length) * 100}%` }} /></div>
      <h1 className="form-titulo">{p.texto}</h1>
      {p.nota && <p className="form-nota">{p.nota}</p>}

      <div className="form-campos">
        {p.tipo === "opciones" && (p.id === "tipo" ? TIPOS_EVENTO : opcionesDe(p, tipo)).map(o => (
          <div key={o.valor}>
            <button
              className={`form-opcion ${respuestas[p.id] === o.valor ? "es-elegida" : ""}`}
              // Las opciones que arrastran un número (¿cuántos entrantes?) no pasan
              // solas de pantalla: hay que dejar contestarlo antes
              onClick={() => { pon(p.id, o.valor); if (!o.conNumero) setTimeout(siguiente, 120); }}
            >{o.texto}</button>
            {respuestas[p.id] === o.valor && o.conNumero && (
              <div className="form-subcampo">
                <span>{o.conNumero}</span>
                <input
                  type="number" min="1" className="form-input form-input-corto"
                  value={respuestas[`${o.valor}Numero`] ?? 1}
                  onChange={e => pon(`${o.valor}Numero`, Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            )}
          </div>
        ))}

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
        <button className="form-btn-principal" onClick={siguiente}>
          {paso === preguntas.length - 1 ? "Repasar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}

// Cómo se resume cada respuesta en la pantalla de repaso
