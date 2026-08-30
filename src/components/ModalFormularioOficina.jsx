import React, { useState } from "react";
import {
  ClipboardCheck, X, Link2, Check, ClipboardCopy, MessageCircle, Eye,
  RefreshCw, Plus, ChevronUp, ChevronDown, ArrowRight, FileText,
} from "lucide-react";
import { repartirEnvios, limpiarAvisos } from "../formulario/envios.js";
import {
  resumirEnvio, archivosDelEnvio, nombreDelEnvio, textoAvisoEnvio,
} from "../formulario/preguntas.js";

function TarjetaEnvio({ e, fmtEnviado, revisado = false, avisos = [], children }) {
  return (
    <div className={`envio-card ${revisado ? "es-revisado" : ""}`}>
      <div className="envio-cabecera">
        <span className="envio-destino">
          {e.eventoDestino
            ? <><ArrowRight size={13} /> Para <strong>{e.eventoDestino}</strong></>
            : <><Plus size={13} /> Evento nuevo</>}
        </span>
        <span className="envio-fecha">
          {e.corregido && <span className="envio-corregido">cambiado</span>}
          {fmtEnviado(e)}
        </span>
      </div>
      {revisado && (
        <div className="envio-estado">
          {e.aplicado
            ? <><Check size={12} /> Aplicado{e.aplicadoA ? ` a "${e.aplicadoA}"` : ""}</>
            : <><X size={12} /> Descartado</>}
        </div>
      )}
      {archivosDelEnvio(e.respuestas || {}).length > 0 && (
        <div className="envio-archivos">
          {archivosDelEnvio(e.respuestas || {}).map(({ id, etiqueta, archivo }) => (
            <a className="envio-archivo" href={archivo.datos} target="_blank" rel="noreferrer"
               download={archivo.nombre} key={id}>
              {/^image\//.test(archivo.tipo)
                ? <img src={archivo.datos} alt="" className="envio-archivo-mini" />
                : <span className="envio-archivo-icono"><FileText size={14} /></span>}
              <span className="envio-archivo-texto">{etiqueta}<em>{archivo.nombre}</em></span>
            </a>
          ))}
        </div>
      )}
      <div className="envio-respuestas">
        {resumirEnvio(e.respuestas || {}).map(f => (
          <div className={`envio-fila ${f.sinContestar ? "es-sin-contestar" : ""}`} key={f.id}>
            <span className="envio-preg">{f.pregunta}</span>
            <span className="envio-resp">{f.respuesta}</span>
          </div>
        ))}
      </div>
      {avisos.length > 0 && !revisado && (
        <div className="envio-avisar">
          {avisos.map((a, i) => (
            <a
              className="btn btn-outline envio-avisar-btn"
              key={i}
              href={`https://wa.me/${a.tel}?text=${encodeURIComponent(textoAvisoEnvio(e))}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={14} /> Avisar{a.nombre ? ` a ${a.nombre.split(/[ ·]/)[0]}` : ""}
            </a>
          ))}
        </div>
      )}
      <div className="envio-acciones">{children}</div>
    </div>
  );
}

export default function ModalFormularioOficina({
  codigo, enlace, envios, cargando, copiado,
  onCrear, onCambiar, onCopiar, onCompartir, onAplicar, onDescartar, onBorrar, onClose,
  avisos = [], onCambiarAvisos,
}) {
  const { pendientes, revisados } = repartirEnvios(envios);
  const [verRevisados, setVerRevisados] = useState(false);
  const fmtEnviado = (e) => {
    const s = e && e.enviado && e.enviado.seconds;
    if (!s) return "recién";
    return new Date(s * 1000).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div>
            <div className="preview-header-title"><ClipboardCheck size={16} /> Formulario del evento</div>
            <div className="preview-header-subtitle">
              {pendientes.length > 0 ? `${pendientes.length} sin revisar` : "Nada sin revisar"}
              {revisados.length > 0 ? ` · ${revisados.length} ya revisados` : ""}
            </div>
          </div>
          <button className="preview-close-btn" onClick={onClose} aria-label="Cerrar" title="Cerrar"><X size={14} /></button>
        </div>
        <div className="preview-body">
          <div className="form-oficina-bloque">
            <div className="form-oficina-titulo">El enlace para compartir</div>
            {!codigo ? (
              <>
                <p className="resumen-vacio">
                  Se les pasa una vez y lo pueden guardar. Abre solo el formulario: desde ahí
                  no se llega a la checklist, ni a la configuración, ni a los eventos. Verán
                  los 8 próximos eventos (nombre, día y sitio) para elegir a cuál van los datos.
                </p>
                <button className="btn btn-green" onClick={onCrear}><Link2 size={15} /> Crear el enlace</button>
              </>
            ) : (
              <>
                <div className="form-oficina-enlace">
                  <input className="form-input" type="text" readOnly value={enlace} onFocus={e => e.target.select()} />
                  <button className="btn btn-green" onClick={onCopiar}>
                    {copiado ? <><Check size={15} /> Copiado</> : <><ClipboardCopy size={15} /> Copiar</>}
                  </button>
                  {typeof navigator !== "undefined" && navigator.share && (
                    <button className="btn btn-outline" onClick={onCompartir}>
                      <MessageCircle size={15} /> Enviar
                    </button>
                  )}
                  <button className="btn btn-outline" onClick={() => window.open(enlace, "_blank", "noopener")}>
                    <Eye size={15} /> Verlo
                  </button>
                </div>
                <p className="resumen-vacio">
                  Código <strong>{codigo}</strong>. Si lo cambias, el que ya tengan deja de
                  funcionar al momento.
                </p>
                <button className="btn btn-outline" onClick={onCambiar}><RefreshCw size={14} /> Cambiar el enlace</button>
              </>
            )}
          </div>

          <div className="form-oficina-bloque">
            <div className="form-oficina-titulo">A quién se avisa por WhatsApp</div>
            <p className="resumen-vacio">
              Al mandar o cambiar un envío, al formulario le sale un botón para avisarte
              por WhatsApp con el mensaje ya escrito. Llega aunque tengas la app cerrada.
            </p>
            {avisos.map((a, i) => (
              <div className="aviso-contacto" key={i}>
                <input
                  className="form-input" type="text" placeholder="Nombre"
                  value={a.nombre}
                  onChange={e => onCambiarAvisos(avisos.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                />
                <input
                  className="form-input" type="tel" placeholder="Móvil con prefijo (34...)"
                  value={a.tel}
                  onChange={e => onCambiarAvisos(avisos.map((x, j) => j === i ? { ...x, tel: e.target.value } : x))}
                />
                <button className="aviso-contacto-quitar" aria-label="Quitar" title="Quitar"
                        onClick={() => onCambiarAvisos(avisos.filter((x, j) => j !== i))}><X size={14} /></button>
              </div>
            ))}
            <button className="btn btn-outline" onClick={() => onCambiarAvisos([...avisos, { nombre: "", tel: "" }])}>
              <Plus size={14} /> Añadir a alguien
            </button>
          </div>

          <div className="form-oficina-bloque">
            <div className="form-oficina-titulo">Lo que ha llegado</div>
            {cargando && <p className="resumen-vacio">Mirando el buzón...</p>}
            {!cargando && pendientes.length === 0 && (
              <p className="resumen-vacio">No hay envíos sin revisar.</p>
            )}
            {pendientes.map(e => (
              <TarjetaEnvio e={e} fmtEnviado={fmtEnviado} avisos={limpiarAvisos(avisos)} key={e.id}>
                <button className="btn btn-outline" onClick={() => onDescartar(e)}>Descartar</button>
                <button className="btn btn-green" onClick={() => onAplicar(e)}>Aplicar y abrir</button>
              </TarjetaEnvio>
            ))}

            {revisados.length > 0 && (
              <>
                <button className="btn btn-outline envio-ver-revisados" onClick={() => setVerRevisados(v => !v)}>
                  {verRevisados ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {" "}Ya revisados ({revisados.length})
                </button>
                {verRevisados && revisados.map(e => (
                  <TarjetaEnvio e={e} fmtEnviado={fmtEnviado} revisado key={e.id}>
                    <button className="btn btn-outline" onClick={() => onBorrar(e)}>Borrar del todo</button>
                  </TarjetaEnvio>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
