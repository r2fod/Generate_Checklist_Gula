// ─── COMPARTIR EL CALENDARIO ──────────────────────────────────────────────────
// Dos enlaces, y lo que hace cada uno dicho sin adornos. Solo lo ve el equipo con
// sesión iniciada: quien entra por un enlace no puede llegar a este panel ni a los
// códigos del otro (viven en indice/, que las reglas cierran sin cuenta).
import { useState } from "react";
import { Share2, ChevronDown, Eye, Pencil, Check, Copy, ExternalLink } from "lucide-react";
import { enlacesDeCalendario } from "./enlace.js";

function Fila({ icono: Icono, titulo, nota, url, clase }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(url).then(
      () => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); },
      () => { /* sin permiso de portapapeles: el enlace está a la vista para copiarlo a mano */ },
    );
  };

  return (
    <div className={`cal-compartir-fila ${clase}`}>
      <div className="cal-compartir-que">
        <Icono size={15} aria-hidden="true" />
        <strong>{titulo}</strong>
        <small>{nota}</small>
      </div>
      {/* De solo lectura y con todo el texto seleccionado al tocarlo: si el portapapeles
          no está disponible (iOS fuera de HTTPS, navegadores viejos) sigue habiendo una
          forma de llevárselo. */}
      <input
        className="cal-compartir-url"
        readOnly
        value={url}
        aria-label={`Enlace para ${titulo.toLowerCase()}`}
        onFocus={e => e.target.select()}
        onClick={e => e.target.select()}
      />
      <div className="cal-compartir-acciones">
        <button type="button" className="btn btn-outline cal-compartir-copiar" onClick={copiar}>
          {copiado
            ? <><Check size={14} aria-hidden="true" /> Copiado</>
            : <><Copy size={14} aria-hidden="true" /> Copiar</>}
        </button>
        {/* Un enlace de verdad y no un botón con JavaScript: así funcionan el clic
            central, el "abrir en pestaña nueva" de la pulsación larga en el móvil y el
            copiar-dirección del menú del navegador. Un onClick con location.href se
            come todo eso a cambio de nada.

            En pestaña aparte para no perder el calendario que se está mirando — y
            porque comprobar el enlace de mirar desde el propio calendario del equipo es
            justo para lo que sirve este botón. */}
        <a className="btn btn-outline cal-compartir-abrir"
           href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> Abrir
        </a>
      </div>
    </div>
  );
}

export default function Compartir({ codigos, href }) {
  const [abierto, setAbierto] = useState(false);
  const enlaces = enlacesDeCalendario(href, codigos);
  // Sin códigos todavía (o sin nube configurada) no hay nada que ofrecer
  if (!enlaces) return null;

  return (
    <div className="cal-compartir">
      <button type="button" className="cal-compartir-cab" aria-expanded={abierto} onClick={() => setAbierto(v => !v)}>
        <Share2 size={16} aria-hidden="true" />
        <span className="cal-compartir-titulo">Compartir el calendario</span>
        <ChevronDown size={16} aria-hidden="true" className={`cal-compartir-flecha${abierto ? " es-abierta" : ""}`} />
      </button>

      {abierto && (
        <div className="cal-compartir-cuerpo">
          <Fila
            icono={Eye}
            clase="es-ver"
            titulo="Solo ver"
            nota="Para el equipo y para quien solo mira. No puede cambiar nada."
            url={enlaces.ver}
          />
          <Fila
            icono={Pencil}
            clase="es-editar"
            titulo="Editar"
            nota="Para quien apunta eventos sin tener cuenta. Puede añadir, cambiar y borrar."
            url={enlaces.editar}
          />
          {/* Esto no es letra pequeña de compromiso: es cómo funciona de verdad, y quien
              reparte los enlaces tiene que saberlo antes de repartirlos. */}
          <p className="cal-compartir-aviso">
            El enlace <b>es</b> la llave: quien lo tenga entra, y si lo reenvía entra
            también el siguiente. No hay forma de quitárselo a una persona sola — habría
            que cambiar el enlace, y entonces deja de valerle a todos.
          </p>
        </div>
      )}
    </div>
  );
}
