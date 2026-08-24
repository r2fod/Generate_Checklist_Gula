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
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import { alSobrarTiempo } from "../precarga.js";
import { leerTexto, guardarTexto } from "../almacen.js";
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

export default function BotonAsistente({
  contexto = {},
  onOlvidar,
  titulo = "Preguntar al asistente",
}) {
  const [abierto, setAbierto] = useState(false);
  const [escondido, setEscondido] = useState(() => leerTexto(CLAVE_ESCONDIDO, "0") === "1");
  const companero = companeroValido(leerTexto(CLAVE_COMPANERO, COMPANERO_POR_DEFECTO));

  // Se adelanta la descarga del panel al primer rato muerto: quien lo abre ya no espera
  // a la red con el dedo en el botón, que en un montaje es 3G de finca. Va en el sitio
  // COMPARTIDO por las dos apps a propósito —igual que los conectores— para que no se
  // haga en una y en la otra no. La clave impide que StrictMode lo lance dos veces.
  useEffect(() => alSobrarTiempo(traerElPanel, { clave: "asistente" }), []);

  const esconder = () => { setEscondido(true); guardarTexto(CLAVE_ESCONDIDO, "1"); };
  const mostrar = () => { setEscondido(false); guardarTexto(CLAVE_ESCONDIDO, "0"); };

  return (
    <>
      {/* Fija en la esquina, como el botón de WhatsApp: es lo que pidió el dueño para no
          tener que ir a buscarla arriba del todo cada vez. Se esconde mientras el panel
          está abierto —ahí ya se ve el propio muñeco grande en la pestaña Humano, dos a
          la vez sobra— y del todo si alguien la aparta con la aspa, que es justo lo que
          hace falta en Modo carga: la checklist entera para leer, sin nada flotando
          encima de las últimas filas. */}
      {!abierto && (escondido ? (
        <button type="button" className="asis-flotante-mini" onClick={mostrar}
          title="Mostrar el asistente" aria-label="Mostrar el asistente">
          <Sparkles size={13} aria-hidden="true" />
        </button>
      ) : (
        <div className="asis-flotante">
          <button type="button" className="asis-flotante-boton" onClick={() => setAbierto(true)} title={titulo}>
            {companero === "ninguno"
              ? <Sparkles size={22} aria-hidden="true" />
              : <Companero cual={companero} size={38} estado="quieto" />}
          </button>
          <button type="button" className="asis-flotante-cerrar" onClick={esconder}
            title="Esconder el asistente" aria-label="Esconder el asistente">
            <X size={11} aria-hidden="true" />
          </button>
        </div>
      ))}
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
