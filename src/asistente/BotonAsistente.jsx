// ─── EL ASISTENTE, EN CUALQUIERA DE LAS TRES APPS ─────────────────────────────
// El botón y el panel juntos, con la carga perezosa dentro. Existe por una razón muy
// concreta: el asistente vivía escrito a mano dentro de App.jsx —el botón, el estado y
// quince líneas armando el contexto— así que montarlo en el calendario y en el
// formulario habría sido copiar eso tres veces. Y lo copiado se separa: se arregla algo
// en uno y los otros dos se quedan atrás. Ya nos pasó con el espejo de la nube.
//
// Cada app pone una línea:
//
//   <BotonAsistente contexto={{ eventosGuardados, apuntes, ... }} />
//
// y lo que no le pase, el asistente no lo verá. Esa es la parte importante: el contexto
// es lo único que existe para él, así que decirlo app por app es decir qué puede mirar
// en cada sitio.
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import { alSobrarTiempo } from "../precarga.js";
import { leerTexto, guardarTexto, leerJSON, guardarJSON } from "../almacen.js";
import Companero from "./Companero.jsx";
import { COMPANERO_POR_DEFECTO, companeroValido } from "./companeros.js";

// El import se saca a una función para poder llamarlo DOS veces con el mismo resultado:
// una para la carga perezosa de verdad y otra para adelantarla en el rato muerto. El
// navegador solo se lo baja una vez; la segunda llamada sale del módulo ya cargado.
const traerElPanel = () => import("./Asistente.jsx");
const Panel = React.lazy(traerElPanel);

// Misma clave que usa Asistente.jsx para guardar el compañero elegido: se lee aquí
// también porque la burbuja tiene que enseñar la cara elegida ANTES de que el panel
// —que es quien de verdad la guarda— llegue a cargarse.
const CLAVE_COMPANERO = "gula_asistente_companero";
// Escondida a mano, por si el bulto en la esquina estorba en una pantalla concreta. Va
// en este navegador, igual que el compañero: es gusto de cada uno, no algo del equipo.
const CLAVE_ESCONDIDO = "gula_asistente_flotante_escondido";
// Dónde la dejó quien la arrastró. Sin guardar: cae en su sitio de siempre (abajo a la
// derecha, por CSS) cada vez que se abre la app, que es justo lo contrario de "donde
// tú quieras" — el dueño la quiere DONDE LA DEJÓ, no donde nace por defecto.
const CLAVE_POS = "gula_asistente_flotante_pos";

const TAMANO_BURBUJA = 56;
const MARGEN = 8;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export default function BotonAsistente({
  contexto = {},
  onOlvidar,
  titulo = "Preguntar al asistente",
}) {
  const [abierto, setAbierto] = useState(false);
  const [escondido, setEscondido] = useState(() => leerTexto(CLAVE_ESCONDIDO, "0") === "1");
  const [pos, setPos] = useState(() => leerJSON(CLAVE_POS, null));
  const companero = companeroValido(leerTexto(CLAVE_COMPANERO, COMPANERO_POR_DEFECTO));
  const flotanteRef = useRef(null);
  // Lo que dura UN arrastre, de dedo abajo a dedo arriba. En un ref y no en estado: cada
  // milímetro de movimiento dispara un pointermove, y meter eso en estado sería un
  // render de React por milímetro.
  const arrastreRef = useRef(null);

  // Se adelanta la descarga del panel al primer rato muerto: quien lo abre ya no espera
  // a la red con el dedo en el botón, que en un montaje es 3G de finca. Va en el sitio
  // COMPARTIDO por las dos apps a propósito —igual que los conectores— para que no se
  // haga en una y en la otra no. La clave impide que StrictMode lo lance dos veces.
  useEffect(() => alSobrarTiempo(traerElPanel, { clave: "asistente" }), []);

  // Si giras el móvil o cambias el tamaño de la ventana con una posición guardada que ya
  // no cabe, se reencaja dentro de la pantalla — pero SIN guardarlo: es un reencaje de
  // pantalla, no una posición nueva elegida a mano, y guardarlo pisaría "donde la dejó"
  // la próxima vez que la pantalla vuelva a su tamaño de siempre (el teclado del móvil
  // también cambia el alto de la ventana al abrirse).
  useEffect(() => {
    if (!pos) return;
    const reencajar = () => setPos(p => p && {
      x: clamp(p.x, MARGEN, window.innerWidth - TAMANO_BURBUJA - MARGEN),
      y: clamp(p.y, MARGEN, window.innerHeight - TAMANO_BURBUJA - MARGEN),
    });
    window.addEventListener("resize", reencajar);
    return () => window.removeEventListener("resize", reencajar);
  }, [pos]);

  const esconder = () => { setEscondido(true); guardarTexto(CLAVE_ESCONDIDO, "1"); };
  const mostrar = () => { setEscondido(false); guardarTexto(CLAVE_ESCONDIDO, "0"); };

  // Un solo gesto sirve para las dos cosas —abrir con un toque, mover con un arrastre—
  // y hay que distinguirlos por lo que pasa DESPUÉS de apoyar el dedo, no por dónde se
  // apoya: por eso todo vive en pointerdown/move/up y no en onClick, que ya no sabría
  // decir si lo de en medio fue un arrastre o un temblor de la mano.
  const alApoyar = (e) => {
    if (e.button !== undefined && e.button !== 0) return; // solo el botón principal
    const r = flotanteRef.current.getBoundingClientRect();
    arrastreRef.current = { x0: e.clientX, y0: e.clientY, izq: r.left, arr: r.top, x: r.left, y: r.top, movido: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const alMover = (e) => {
    const a = arrastreRef.current;
    if (!a) return;
    const dx = e.clientX - a.x0, dy = e.clientY - a.y0;
    // Menos de 6px es pulso de la mano al pulsar, no una intención de moverla: sin este
    // margen, cada toque para ABRIRLA se leía como un arrastre de un píxel y no abría.
    if (!a.movido && Math.hypot(dx, dy) > 6) a.movido = true;
    if (a.movido) {
      a.x = clamp(a.izq + dx, MARGEN, window.innerWidth - TAMANO_BURBUJA - MARGEN);
      a.y = clamp(a.arr + dy, MARGEN, window.innerHeight - TAMANO_BURBUJA - MARGEN);
      setPos({ x: a.x, y: a.y });
    }
  };
  const alSoltar = () => {
    const a = arrastreRef.current;
    arrastreRef.current = null;
    if (!a) return;
    if (a.movido) guardarJSON(CLAVE_POS, { x: a.x, y: a.y });
    else setAbierto(true);
  };

  return (
    <>
      {/* Con portal a document.body, por la MISMA razón que el panel de abajo: la
          cabecera tiene "animation: ... both", que deja un transform puesto para
          siempre aunque la animación ya haya terminado, y eso rompe "position: fixed"
          en cualquier descendiente —deja de ser fijo respecto a la PANTALLA y pasa a
          serlo respecto a la cabecera—. Sin el portal la burbuja se quedaba pegada a
          la esquina de la cabecera en vez de a la esquina de la pantalla: por eso
          salía tapando el botón "Compartir" en vez de flotar donde tocaba.

          Fija en la esquina por defecto, como el botón de WhatsApp, pero arrastrable a
          donde se quiera —también pedido tal cual—: se agarra y se suelta donde toque,
          y se queda ahí las próximas veces (CLAVE_POS). Se esconde mientras el panel
          está abierto —ahí ya se ve el propio muñeco grande en la pestaña Humano, dos a
          la vez sobra— y del todo si alguien la aparta con la aspa, que es justo lo que
          hace falta en Modo carga: la checklist entera para leer, sin nada flotando
          encima de las últimas filas. */}
      {!abierto && createPortal(escondido ? (
        <button type="button" className="asis-flotante-mini" onClick={mostrar}
          title="Mostrar el asistente" aria-label="Mostrar el asistente">
          <Sparkles size={13} aria-hidden="true" />
        </button>
      ) : (
        <div className="asis-flotante" ref={flotanteRef}
          style={pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : undefined}>
          <button type="button" className="asis-flotante-boton" title={titulo}
            onPointerDown={alApoyar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAbierto(true); } }}>
            {companero === "ninguno"
              ? <Sparkles size={22} aria-hidden="true" />
              : <Companero cual={companero} size={38} estado="quieto" />}
          </button>
          <button type="button" className="asis-flotante-cerrar" onClick={esconder}
            title="Esconder el asistente" aria-label="Esconder el asistente">
            <X size={11} aria-hidden="true" />
          </button>
        </div>
      ), document.body)}
      {abierto && createPortal(
        // Con un portal a propósito, y no montado donde vive el botón: el panel es
        // "position: fixed" para cubrir toda la pantalla, pero fixed deja de ser fixed
        // de verdad en cuanto un antepasado tiene un transform puesto — y el <header>
        // de la app lo tiene, de su animación de entrada, que se queda ahí para siempre
        // aunque termine (animation ... both). Sin el portal, el panel se quedaba
        // "fijo" respecto al header en vez de respecto a la pantalla: una tira
        // recortada arriba en vez del modal entero. Iba a pasar en cualquiera de las
        // tres apps el día que el botón viviera dentro de un header con esa animación,
        // así que se soluciona aquí, en el sitio compartido, y no parcheando cada header.
        <React.Suspense fallback={null}>
          <Panel contexto={contexto} onOlvidar={onOlvidar} onCerrar={() => setAbierto(false)} />
        </React.Suspense>,
        document.body,
      )}
    </>
  );
}
