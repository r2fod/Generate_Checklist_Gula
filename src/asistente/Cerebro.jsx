// ─── EL CEREBRO, EN PANTALLA ──────────────────────────────────────────────────
// Lo que sabe y lo que le importa, para poder leerlo y corregirlo. Está en texto y no
// en vectores por la misma razón que en OpenHuman: un cerebro que no puedes abrir es un
// cerebro en el que no puedes confiar — y aquí importa el doble, porque si aprende mal
// que en las bodas van dos de cocina, se carga mal el camión y nadie sabe por qué.
//
// Cuatro vistas de lo mismo, y las tres primeras son los tres ejes del árbol:
//   · Temas   — como se pregunta
//   · Fuentes — de dónde salió, que es como se decide de qué fiarse
//   · Días    — qué está al día
//   · Grafo   — qué se conecta con qué
//
// Los tres ejes devuelven la misma forma, así que los pinta UN componente. Añadir un
// cuarto eje mañana es una función en arbol.js, no una pantalla nueva aquí.
import { useState } from "react";
import { Trash2, Target, Plus, Check, Archive, Network, MoonStar, Settings } from "lucide-react";
import { porTema, porFuente, porDia, grafo } from "./arbol.js";
import { ESTADOS, MAX_OBJETIVOS, cuantosActivos } from "./objetivos.js";
import { avisosConfig } from "./avisosConfig.js";
import Grafo from "./Grafo.jsx";

const VISTAS = [
  { id: "temas", nombre: "Temas", eje: porTema },
  { id: "fuentes", nombre: "Fuentes", eje: porFuente },
  { id: "dias", nombre: "Días", eje: porDia },
  { id: "grafo", nombre: "Grafo", eje: null },
];

// Cuándo corrió, en cristiano. Una marca de tiempo cruda obliga a hacer la resta
// mentalmente, y lo que importa es si el repaso está fresco o lleva días parado.
function cuandoFueElRepaso(cuando) {
  const horas = Math.floor((Date.now() - (Number(cuando) || 0)) / 3600000);
  if (!cuando || horas < 0) return "En algún momento";
  if (horas < 1) return "Hace un rato";
  if (horas < 24) return `Hace ${horas} hora${horas === 1 ? "" : "s"}`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias === 1 ? "" : "s"}`;
}

const COLOR_NODO = {
  sitio: "#0891b2", evento: "#4f46e5", tipo: "#9333ea",
  tema: "#15803d", recuerdo: "#b45309",
};

export default function Cerebro({
  memoria = [], objetivos = [], eventosGuardados = {}, repaso = null,
  onOlvidar, onPonerObjetivo, onCambiarEstadoObjetivo, onQuitarObjetivo,
}) {
  const [vista, setVista] = useState("temas");
  const [nuevo, setNuevo] = useState("");
  const [porQue, setPorQue] = useState("");
  const [abriendo, setAbriendo] = useState(false);

  const anadir = (e) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    onPonerObjetivo(nuevo, porQue);
    setNuevo(""); setPorQue(""); setAbriendo(false);
  };

  const g = vista === "grafo" ? grafo(memoria, eventosGuardados) : null;
  const grupos = vista !== "grafo" ? (VISTAS.find(v => v.id === vista).eje)(memoria) : [];
  // Barato y local (dos lecturas de este navegador): se recalcula en cada render sin
  // que se note, así que no hace falta memoizarlo como el grafo, que sí hace física.
  const avisos = avisosConfig();

  return (
    <div className="asis-hilo asis-cerebro">
      {/* ── LO QUE FALTA POR CONFIGURAR ──
          Antes que "lo que importa ahora": un proxy sin poner o unos precios sin
          cargar no son una prioridad que se elige, son un hueco que impide que el
          resto de la app cuente bien. Sin avisos no se pinta nada —ni un "todo en
          orden"—, que sería ruido en el caso normal, que es que no falte nada. */}
      {avisos.length > 0 && (
        <div className="cer-repaso">
          <div className="cer-titulo">
            <Settings size={14} aria-hidden="true" />
            <span>Por configurar</span>
            <em>{avisos.length}</em>
          </div>
          <div className="cer-repaso-evento">
            <ul>
              {avisos.map((a, i) => (
                <li className={`cer-aviso es-${a.tono}`} key={i}>
                  {a.texto}
                  {a.comoSeArregla && <em> · {a.comoSeArregla}</em>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── LO QUE LE IMPORTA ── */}
      <div className="cer-objetivos">
        <div className="cer-titulo">
          <Target size={14} aria-hidden="true" />
          <span>Lo que importa ahora</span>
          {cuantosActivos(objetivos) > 0 && <em>{cuantosActivos(objetivos)}</em>}
        </div>
        <p className="asis-explica">
          Lo que le digas aquí entra en cada conversación, por delante de todo lo demás:
          es lo que hace que priorice en vez de contestar todo igual.
        </p>

        {objetivos.map(o => (
          <div className={`cer-objetivo es-${o.estado}`} key={o.id}>
            <span className="cer-objetivo-texto">
              {o.texto}
              {o.porQue && <em> · {o.porQue}</em>}
            </span>
            <div className="cer-objetivo-botones">
              {o.estado === "activo" ? (
                <>
                  <button type="button" onClick={() => onCambiarEstadoObjetivo(o.id, "logrado")}
                    title="Conseguido" aria-label={`Dar por conseguido: ${o.texto}`}><Check size={13} /></button>
                  <button type="button" onClick={() => onCambiarEstadoObjetivo(o.id, "aparcado")}
                    title="Aparcar" aria-label={`Aparcar: ${o.texto}`}><Archive size={13} /></button>
                </>
              ) : (
                <button type="button" onClick={() => onCambiarEstadoObjetivo(o.id, "activo")}
                  title="Volver a ponerlo en marcha" aria-label={`Reactivar: ${o.texto}`}><Target size={13} /></button>
              )}
              <button type="button" onClick={() => onQuitarObjetivo(o.id)}
                title="Quitarlo" aria-label={`Quitar: ${o.texto}`}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}

        {abriendo ? (
          <form className="cer-nuevo" onSubmit={anadir}>
            <input className="form-input" value={nuevo} autoFocus
              placeholder="Ej: bajar la merma de cristalería"
              onChange={e => setNuevo(e.target.value)} />
            {/* El porqué cambia mucho la respuesta: "bajar la merma" y "bajar la merma
                porque el año pasado costó 900€" no se contestan igual. */}
            <input className="form-input" value={porQue}
              placeholder="Por qué (opcional)"
              onChange={e => setPorQue(e.target.value)} />
            <div className="cer-nuevo-botones">
              <button type="submit" className="btn" disabled={!nuevo.trim()}>Añadir</button>
              <button type="button" className="btn btn-outline" onClick={() => setAbriendo(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn-outline cer-anadir"
            onClick={() => setAbriendo(true)}
            disabled={cuantosActivos(objetivos) >= MAX_OBJETIVOS}>
            <Plus size={14} aria-hidden="true" />
            {cuantosActivos(objetivos) >= MAX_OBJETIVOS ? `Ya hay ${MAX_OBJETIVOS}` : "Añadir objetivo"}
          </button>
        )}
      </div>

      {/* ── LO QUE MIRÓ MIENTRAS NO HABÍA NADIE ──
          El repaso lo escribe el cron del Worker, no este navegador: por eso está aunque
          nadie haya abierto la app en toda la semana, que es justo cuando hace falta. */}
      {repaso && (
        <div className="cer-repaso">
          <div className="cer-titulo">
            <MoonStar size={14} aria-hidden="true" />
            <span>El repaso de la noche</span>
            {repaso.eventos.length > 0 && <em>{repaso.eventos.length}</em>}
          </div>
          <p className="asis-explica">
            {cuandoFueElRepaso(repaso.cuando)} miró {repaso.mirados} evento{repaso.mirados === 1 ? "" : "s"}
            {" "}de los próximos {repaso.dias} días.
          </p>
          {/* Los documentos que se acercan al MiB de Firestore. Va antes que los eventos
              porque no es "a esta boda le falta un dato": es "el sábado que viene alguien
              va a apuntar una boda y no va a poder guardarla".
              Dentro de un <ul> como los avisos de cada evento: sueltos eran <li> fuera de
              lista —HTML inválido— y encima se quedaban sin la separación que da
              `.cer-repaso-evento ul`, así que aparecían pegados unos a otros. */}
          {(repaso.documentos || []).length > 0 && (
            <div className="cer-repaso-evento">
              <ul>
                {repaso.documentos.map((d, i) => (
                  <li className={`cer-aviso es-${d.tono}`} key={`doc-${i}`}>
                    {d.texto}
                    {d.comoSeArregla && <em> · {d.comoSeArregla}</em>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {repaso.eventos.length === 0 ? (
            // "0 avisos" con 0 mirados es un error mudo; con doce, una buena noticia. Por
            // eso se dice el número de arriba y aquí solo se celebra si de verdad miró.
            <p className="asis-vacio">
              {repaso.mirados
                ? "Todo en orden: no falta nada por poner."
                : "No encontró ningún evento que mirar. Si eso no cuadra, revisa el repaso en los ajustes."}
            </p>
          ) : repaso.eventos.map((e, i) => (
            <div className="cer-repaso-evento" key={i}>
              <div className="cer-repaso-cab">
                <strong>{e.evento}</strong>
                {e.fecha && <em>{e.fecha}</em>}
              </div>
              <ul>
                {e.avisos.map((a, j) => (
                  <li className={`cer-aviso es-${a.tono}`} key={j}>
                    {a.texto}
                    {a.comoSeArregla && <em> · {a.comoSeArregla}</em>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── LO QUE SABE ── */}
      <div className="cer-titulo">
        <Network size={14} aria-hidden="true" />
        <span>Lo que sabe</span>
        {memoria.length > 0 && <em>{memoria.length}</em>}
      </div>

      <div className="bebida-chips" role="tablist" aria-label="Cómo ver lo que sabe">
        {VISTAS.map(v => (
          <button key={v.id} type="button" role="tab" aria-selected={vista === v.id}
            className={`bebida-chip${vista === v.id ? " es-activa" : ""}`}
            onClick={() => setVista(v.id)}>{v.nombre}</button>
        ))}
      </div>

      {!memoria.length && (
        <p className="asis-vacio">
          Todavía no sabe nada. Cuéntale cosas en la charla —"en la finca X no hay enchufe
          en la carpa", "en comuniones ponemos 3 de cocina"— y las guarda.
        </p>
      )}

      {/* El grafo de verdad: nodos y líneas, no una lista de píldoras. Sirve para ver de
          un vistazo que de una finca sabes tres cosas y las tres son avisos, o que de un
          tipo de evento no sabes nada — y ahora también CÓMO se conectan entre sí, no
          solo cuántas conexiones tiene cada una. */}
      {vista === "grafo" && g && <Grafo nodos={g.nodos} enlaces={g.enlaces} colores={COLOR_NODO} />}

      {/* Los tres ejes, pintados por el mismo bloque: devuelven la misma forma. */}
      {vista !== "grafo" && grupos.map(gr => (
        <div className="asis-tema" key={gr.clave}>
          <div className="asis-tema-titulo">{gr.titulo} <em>({gr.recuerdos.length})</em></div>
          {gr.recuerdos.map(r => (
            <div className="asis-recuerdo" key={r.id}>
              <span className="asis-recuerdo-texto">
                {r.texto}
                {/* De dónde salió: es lo que permite tirar del hilo cuando algo suena raro */}
                {r.donde && <em className="cer-donde">aprendido en {r.donde}</em>}
              </span>
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
  );
}
