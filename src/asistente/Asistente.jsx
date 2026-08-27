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
import { Send, X, Settings, Loader2, Wrench, Brain, Trash2, MessageCircle, Coins, Check, Ban, User, ListTodo, History, Plus, MoonStar } from "lucide-react";
import { preguntarAuto, preguntar } from "./cliente.js";
import { tokenDeSesion } from "../auth.js";
import { nubeActiva, cargarProxyNube, guardarProxyNube, suscribirProxyNube, cargarAvisosNube, suscribirAvisosNube } from "../nube.js";
import Cerebro from "./Cerebro.jsx";
import { leerCharlas, guardarCharla, borrarCharla, cuandoFue } from "./conversaciones.js";
import { porEvento as tareasPorEvento, sinHacer, paraHoy as recordatoriosDeHoy } from "./tareas.js";
import Companero from "./Companero.jsx";
import { COMPANERO_POR_DEFECTO, companeroValido } from "./companeros.js";
import Humano from "./Humano.jsx";
import { leerGasto, apuntar, resumen, eurosTotales, leerTope, ponerTope, borrarGasto, puedePreguntar, esGratis, totales, costeDeUna } from "./gasto.js";
import { NIVELES, CLAVES_NIVEL, NIVEL_POR_DEFECTO, nivelValido } from "./permisos.js";
import { sinMarcas } from "./texto.js";
import { queHacerConLaUrl } from "./proxy.js";
import { PERSONALIDADES, CLAVES_PERSONALIDAD, PERSONALIDAD_POR_DEFECTO, personalidadValida } from "./personalidad.js";
import { VOCES_GEMINI, vozGeminiValida } from "./vozGemini.js";
import { avisosConfig, saludoPendientes } from "./avisosConfig.js";
import Dialogo from "../components/Dialogo.jsx";

const CLAVE_URL = "gula_asistente_url";
const CLAVE_PROVEEDOR = "gula_asistente_proveedor";
const CLAVE_COMPANERO = "gula_asistente_companero";
import { leerTexto, guardarTexto } from "../almacen.js";
import { apunta } from "../diario.js";

const CLAVE_NIVEL = "gula_asistente_nivel";
const CLAVE_PERSONALIDAD = "gula_asistente_personalidad";
const CLAVE_VOZ = "gula_asistente_voz";
// "" = la que tenga puesta el Worker por defecto (GEMINI_TTS_VOZ). Aparte de CLAVE_VOZ
// (que es solo el interruptor on/off): se puede tener la voz encendida sin haber
// elegido ninguna en concreto todavía.
const CLAVE_VOZ_GEMINI = "gula_asistente_voz_gemini";
// Qué pestaña se ve. Guardada para que minimizar el reactor (Jarvis, en Humano) y
// volver a abrir la burbuja deje "como antes" y no siempre en Charla: el panel entero
// se desmonta al cerrarse (ver BotonAsistente.jsx), así que sin esto se perdía sola.
const CLAVE_PESTANA = "gula_asistente_pestana";
const PESTANAS_VALIDAS = ["charla", "humano", "cerebro", "tareas", "gasto"];

// El almacén del navegador, con su try/catch, vive en src/almacen.js. Aquí "" y null se
// tratan igual: un ajuste guardado en blanco es un ajuste sin poner.
const leer = (k, x = "") => leerTexto(k, x) || x;
const guardar = guardarTexto;

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
  const [pestana, setPestanaCruda] = useState(() => {
    const p = leer(CLAVE_PESTANA, "charla");
    return PESTANAS_VALIDAS.includes(p) ? p : "charla";
  });
  const setPestana = (p) => { setPestanaCruda(p); guardar(CLAVE_PESTANA, p); };
  const [url, setUrl] = useState(() => leer(CLAVE_URL));
  const [proveedor, setProveedor] = useState(() => leer(CLAVE_PROVEEDOR, "auto") || "auto");
  // Lo que el Worker dice que tiene configurado. Hasta la primera respuesta no se sabe,
  // y se supone Gemini —que es el que se monta por defecto— en vez de no dejar preguntar.
  const [disponibles, setDisponibles] = useState([]);
  // Quien tuviera guardado uno de los viejos —eran objetos con cara, ya no existen—
  // cae en el de por defecto en vez de quedarse sin muñeco.
  const [companero, setCompanero] = useState(() => companeroValido(leer(CLAVE_COMPANERO, COMPANERO_POR_DEFECTO)));
  const [gasto, setGasto] = useState(() => leerGasto());
  const [tope, setTope] = useState(() => leerTope());
  const [huboError, setHuboError] = useState(false);
  const [nivel, setNivel] = useState(() => nivelValido(leer(CLAVE_NIVEL, NIVEL_POR_DEFECTO)));
  // El tono con el que habla. Va en este navegador y no en la nube, igual que el muñeco:
  // es gusto de cada uno, y no tiene sentido que quien prefiere respuestas secas se las
  // encuentre con guasa porque otro cambió el ajuste.
  const [personalidad, setPersonalidad] = useState(() => personalidadValida(leer(CLAVE_PERSONALIDAD, PERSONALIDAD_POR_DEFECTO)));
  // Los cambios que el asistente ha propuesto y esperan un sí. En "Con permiso" nada se
  // aplica hasta que alguien lo aprueba aquí — si se aplicara y luego se enseñara, el
  // permiso sería un cartel, no un permiso.
  const [pendientes, setPendientes] = useState([]);
  const [vozActiva, setVozActiva] = useState(() => leer(CLAVE_VOZ, "1") === "1");
  const [vozGemini, setVozGemini] = useState(() => vozGeminiValida(leer(CLAVE_VOZ_GEMINI, "")));
  // El historial vive en este navegador: una conversación es de quien la tuvo. Lo que
  // sirve al equipo ya se guarda en el cerebro y en las tareas.
  const [charlas, setCharlas] = useState(() => leerCharlas());
  // La última, para retomarla sola al abrir — no al cerrar el panel, sino al MONTARLO,
  // que es cuando de verdad se pierde: BotonAsistente desmonta este componente entero
  // al cerrar (por eso vive fuera, en localStorage, y no solo en este estado). Sin
  // esto, cada apertura empezaba en blanco aunque la de hace un minuto siguiera
  // guardada un clic más allá, en Historial — que es justo lo que este fichero de
  // conversaciones dice arreglar en su propio comentario de cabecera, y el botón
  // "Conversación nueva" de ahí abajo no tendría sentido si esto ya empezara en blanco
  // siempre.
  const [charlaId, setCharlaId] = useState(() => (charlas[0] ? charlas[0].id : ""));
  const [verHistorial, setVerHistorial] = useState(false);
  const [ajustes, setAjustes] = useState(() => !leer(CLAVE_URL));
  // El confirm() nativo del navegador desentona con el resto de la app —letra de
  // sistema, sin tema oscuro, sin ni un borde redondeado— y aquí era el único sitio que
  // todavía lo usaba: el resto de acciones que borran algo (App.jsx) pasan por este
  // mismo Dialogo. Se queda local a este componente y no compartido con App.jsx porque
  // el panel vive en su propio portal, aparte del árbol de la checklist.
  const [dialogo, setDialogo] = useState(null);

  // Si nadie ha puesto todavía una dirección EN ESTE MÓVIL, se busca la que ya haya
  // configurado el equipo: es la misma idea que los precios o los ratios —quien la
  // configura primero la deja puesta para todos, y va en Firestore y no en el código
  // porque el repositorio es público y una URL publicada ahí es un blanco fácil para
  // golpearla hasta agotar la cuota diaria del equipo. Si este móvil YA tiene una
  // puesta a mano (por ejemplo, para probar otro Worker), esa manda: no se pisa con la
  // del equipo.
  useEffect(() => {
    if (!nubeActiva()) return;
    let vivo = true;
    const aplicar = (remoto) => {
      if (!vivo || !remoto || !remoto.url || leer(CLAVE_URL)) return;
      setUrl(remoto.url);
      guardar(CLAVE_URL, remoto.url);
      setAjustes(false);
    };
    // Qué hacer con lo que hay en cada sitio lo decide proxy.js, que está probado.
    cargarProxyNube()
      .then(remoto => {
        if (!vivo) return;
        const { accion, url: buena } = queHacerConLaUrl({ mia: leer(CLAVE_URL), equipo: remoto && remoto.url });
        if (accion === "bajar") aplicar({ url: buena });
        // Subirla es lo que hace que el siguiente móvil no tenga que configurar nada.
        if (accion === "subir") guardarProxyNube({ url: buena }).catch(() => { /* sin conexión: sube en el siguiente arranque */ });
      })
      .catch(() => { /* sin conexión: se pide a mano */ });
    const corta = suscribirProxyNube(aplicar);
    return () => { vivo = false; corta(); };
  }, []);

  // El repaso que dejó escrito el cron del Worker mientras no había nadie. Se lee, no se
  // calcula: el subconsciente ya mira lo de este navegador al abrir, y esto es lo otro
  // —lo que se miró aunque nadie abriera la app en toda la semana—.
  const [repaso, setRepaso] = useState(null);
  const [avisoUrl, setAvisoUrl] = useState(null);
  const [repasando, setRepasando] = useState(false);
  const [avisoRepaso, setAvisoRepaso] = useState(null);
  useEffect(() => {
    if (!nubeActiva()) return;
    let vivo = true;
    const aplicar = (r) => { if (vivo && r && Array.isArray(r.eventos)) setRepaso(r); };
    cargarAvisosNube().then(aplicar).catch(() => { /* sin conexión: no se enseña */ });
    const corta = suscribirAvisosNube(aplicar);
    return () => { vivo = false; corta(); };
  }, []);
  // Pedirle al Worker que repase ahora. Lo mismo que hace el cron por la noche, pero
  // con la sesión de quien lo pide: sirve para comprobar que está bien montado sin
  // esperar a mañana, y para forzarlo cuando se acaba de cambiar medio calendario.
  const lanzarRepaso = async () => {
    setRepasando(true);
    setAvisoRepaso(null);
    try {
      const token = await tokenDeSesion().catch(() => "");
      const r = await fetch(`${url.replace(/\/+$/, "")}/__repaso`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const d = await r.json().catch(() => ({}));
      // El motivo del Worker tal cual: dice qué variable falta, y eso se arregla solo.
      if (!r.ok || d.error) { setAvisoRepaso({ mal: true, texto: d.error || `Ha fallado (${r.status}).` }); return; }
      setRepaso(d);
      setAvisoRepaso({
        mal: false,
        // El plural importa: con un solo evento salía "1 tienen algo sin poner", que
        // suena a fallo del sistema y no a lo que es —un evento flojo de datos—.
        texto: d.eventos && d.eventos.length
          ? `Ha mirado ${d.mirados} evento${d.mirados === 1 ? "" : "s"} y ${d.eventos.length} ${d.eventos.length === 1 ? "tiene" : "tienen"} algo sin poner. Lo tienes en Cerebro.`
          : `Ha mirado ${d.mirados} evento${d.mirados === 1 ? "" : "s"} y no falta nada por poner.`,
      });
    } catch (e) {
      setAvisoRepaso({ mal: true, texto: `No se ha podido llegar al proxy: ${e.message}` });
    } finally {
      setRepasando(false);
    }
  };

  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [enCurso, setEnCurso] = useState("");
  const [hilo, setHilo] = useState(() => (charlas[0] ? charlas[0].hilo : []));          // lo que se ve
  // Qué respuesta tiene el diario abierto. Uno solo, y por índice: dos abiertos a la vez
  // en un móvil dejan la conversación ilegible, y guardarlo por mensaje obligaría a
  // meter estado dentro del hilo, que es justo lo que se guarda en el historial.
  const [diarioAbierto, setDiarioAbierto] = useState(-1);
  const [mensajes, setMensajes] = useState(() => (charlas[0] ? charlas[0].mensajes : []));  // lo que se manda (con las llamadas)
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
      // Sin esto, pedir dos veces lo mismo por el chat —por ejemplo, aprobar una
      // propuesta escribiendo "sí, créalos" en vez de pulsar el botón de la tarjeta que
      // ya está en pantalla— apilaba una SEGUNDA tarjeta idéntica, y el modelo contestaba
      // "te lo he dejado en pantalla" justo encima de un "Hecho" que ya venía de la
      // primera. Dos mensajes que parecen llevarse la contraria sobre lo mismo. Si ya
      // hay una propuesta igual esperando, no se apila otra: se dice que ya está.
      const repetida = pendientes.find(p => p.que === propuesta.que && p.resumen === propuesta.resumen);
      if (repetida) {
        return {
          pendiente: true,
          resumen: repetida.resumen,
          mensaje: "Esto YA estaba propuesto y sigue esperando en pantalla, sin aplicar. No lo repitas: dile que lo confirme ahí.",
        };
      }
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
      const r = contexto.onEscribir(p);
      // "Hecho" tiene que decir lo que de verdad pasó, no darlo por sentado: un
      // aplicador puede devolver un error o un "no hay nada que hacer" sin lanzar
      // ninguna excepción —por ejemplo, crear_checklists cuando los apuntes elegidos
      // ya no están en el calendario—, y decir "Hecho" igualmente sería mentir sobre
      // algo que decide qué se carga en el camión.
      if (r && r.error) {
        setHilo(h => [...h, { de: "error", texto: r.error }]);
      } else if (r && r.nada) {
        setHilo(h => [...h, { de: "el", texto: r.nada }]);
      } else {
        const aviso = r && r.aviso ? ` ${r.aviso}` : "";
        setHilo(h => [...h, { de: "el", texto: `Hecho: ${p.resumen}${aviso}` }]);
      }
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
        mensajes,
        // El repaso entra en el contexto para que "ver_repaso" lo lea: lo carga este
        // panel de Firestore, no la app, así que no viene en el contexto de fuera.
        contexto: { ...contexto, nivel, personalidad, repaso, onEscribir: escribir },
        url, token,
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
          diario: r.diario,
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
      const motivo = String(err && err.message ? err.message : err);
      // Al diario del navegador además de a la burbuja: el error se lee, se cierra el
      // panel y se olvida, y luego "ayer el asistente no iba" no se puede mirar. El
      // motivo pasa por sinDatosPersonales (ver src/diario.js) porque lo escribe el
      // proveedor y puede traer dentro el trozo de pregunta que le mandamos.
      apunta("proveedor-fallo", { motivo, proveedor: String(proveedor || "").slice(0, 20) });
      setHilo(h => [...h, { de: "error", texto: motivo }]);
    } finally {
      setPensando(false);
      setEnCurso("");
    }
  };

  // Lo primero que dice, si hay algo pendiente — pedido tal cual: que hable primero en
  // vez de obligar a ir a mirar Cerebro. Barato y local (dos lecturas de este
  // navegador, ver avisosConfig.js): se recalcula en cada render sin que se note, igual
  // que ya hace Cerebro.jsx con lo mismo. Los recordatorios ("recuérdame tal cosa tal
  // día") entran por la misma puerta: si su fecha ya llegó, se dicen aquí en cuanto se
  // abre el asistente — no hay forma de avisar con la app cerrada, así que esto es lo
  // más cerca que se puede estar de eso.
  const saludo = saludoPendientes(avisosConfig(), repaso, recordatoriosDeHoy(contexto.tareas || []), personalidad, contexto.avisoActualizacion);

  return (
    <div className="asis-fondo" role="dialog" aria-label="Asistente" aria-modal="true">
      {dialogo && <Dialogo config={dialogo} onCerrar={() => setDialogo(null)} />}
      {/* La pestaña va en la clase para que el CSS pueda tratarlas distinto: en el móvil
          Charla necesita toda la altura (lista de mensajes + campo de escribir), y las
          demás no —se quedaban con 400px en blanco debajo—. */}
      <div className={`asis-panel es-${ajustes ? "ajustes" : pestana}`}>
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

        {/* Las cinco vistas del mismo panel. Van en su PROPIA fila y no en la cabecera:
            con el título y los tres iconos al lado no cabían en un móvil de 320px y se
            salían por la derecha. Y en una fila que hace scroll de lado, porque cinco
            pestañas con texto no entran a lo ancho en un móvil estrecho — repartirlas en
            dos filas comería la mitad del alto útil del panel.

            Charla y Cerebro juntas es a propósito: si lo que sabe viviera en otro sitio,
            nadie abriría nunca esa pantalla y lo que aprende mal no lo corregiría nadie. */}
        <div className="asis-pestanas" role="tablist" aria-label="Vistas del asistente">
          <button type="button" role="tab" className={`asis-pestana${pestana === "charla" ? " es-activa" : ""}`}
            onClick={() => setPestana("charla")} aria-selected={pestana === "charla"}>
            <MessageCircle size={14} aria-hidden="true" /> Charla
          </button>
          <button type="button" role="tab" className={`asis-pestana${pestana === "humano" ? " es-activa" : ""}`}
            onClick={() => setPestana("humano")} aria-selected={pestana === "humano"}>
            <User size={14} aria-hidden="true" /> Humano
          </button>
          <button type="button" role="tab" className={`asis-pestana${pestana === "cerebro" ? " es-activa" : ""}`}
            onClick={() => setPestana("cerebro")} aria-selected={pestana === "cerebro"}>
            <Brain size={14} aria-hidden="true" /> Cerebro
            {(contexto.memoria || []).length > 0 && <em>{(contexto.memoria || []).length}</em>}
          </button>
          <button type="button" role="tab" className={`asis-pestana${pestana === "tareas" ? " es-activa" : ""}`}
            onClick={() => setPestana("tareas")} aria-selected={pestana === "tareas"}>
            <ListTodo size={14} aria-hidden="true" /> Tareas
            {sinHacer(contexto.tareas || []).length > 0 && <em>{sinHacer(contexto.tareas || []).length}</em>}
          </button>
          <button type="button" role="tab" className={`asis-pestana${pestana === "gasto" ? " es-activa" : ""}`}
            onClick={() => setPestana("gasto")} aria-selected={pestana === "gasto"}>
            <Coins size={14} aria-hidden="true" /> Gasto
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
                onChange={e => {
                  const limpia = e.target.value.trim();
                  setUrl(e.target.value);
                  guardar(CLAVE_URL, limpia);
                  // Se sube a la nube al escribirla, igual que un precio o un ratio: es
                  // lo que hace que la próxima persona del equipo no tenga que buscarla.
                  // Si no se puede subir se DICE. Tragárselo dejaba a quien la escribe
                  // creyendo que ya la tiene el equipo, y al resto con el campo vacío.
                  if (limpia && nubeActiva()) {
                    setAvisoUrl(null);
                    guardarProxyNube({ url: limpia })
                      .catch(() => setAvisoUrl("Guardada en este navegador, pero no ha subido al equipo. Con conexión y sesión iniciada, vuelve a escribirla."));
                  }
                }}
              />
              {avisoUrl && <span className="asis-nota es-mal">{avisoUrl}</span>}
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

            {/* La voz de la nube: antes era una elegida a mano en Cloudflare
                (GEMINI_TTS_VOZ), igual para todo el equipo. Aquí cada uno la suya, sin
                tocar nada del servidor — "Automática" deja mandar al Worker, como
                siempre. Solo cambia la voz de Gemini; la del navegador (de respaldo si
                la nube falla o no hay proxy) sigue siendo la mejor que tenga cada
                aparato, eso no se elige a mano. */}
            <label className="asis-campo">
              <span>Voz de la nube (Gemini)</span>
              <div className="asis-niveles">
                <button
                  type="button"
                  className={`bebida-chip${!vozGemini ? " es-activa" : ""}`}
                  onClick={() => { setVozGemini(""); guardar(CLAVE_VOZ_GEMINI, ""); }}
                  aria-pressed={!vozGemini}
                >
                  Automática
                </button>
                {VOCES_GEMINI.map(v => (
                  <button
                    key={v.id} type="button"
                    className={`bebida-chip${vozGemini === v.id ? " es-activa" : ""}`}
                    onClick={() => { setVozGemini(v.id); guardar(CLAVE_VOZ_GEMINI, v.id); }}
                    aria-pressed={vozGemini === v.id}
                  >
                    {v.nombre}
                  </button>
                ))}
              </div>
              <span className="asis-nota">
                {vozGemini ? VOCES_GEMINI.find(v => v.id === vozGemini)?.tono : "La que tenga puesta el Worker."}
              </span>
            </label>

            {/* El compañero se elige en la pestaña Humano, mirándolo a tamaño grande, y
                no aquí: a 30px las siete siluetas se parecen tanto que había que elegir
                a ciegas. Y tenerlo en dos sitios era mantener dos elegidores del mismo
                ajuste. */}

            {/* ── LANZAR EL REPASO A MANO ──
                Tiene que estar aquí y no ser una dirección que se abre en el navegador:
                el Worker pide la sesión del equipo en una cabecera, y una pestaña normal
                no la manda. La app sí tiene el token, así que es el único sitio desde el
                que se puede pedir. */}
            {url && (
              <div className="asis-repaso-lanzar">
                <button type="button" className="btn btn-outline" disabled={repasando}
                  onClick={lanzarRepaso}>
                  {repasando ? <Loader2 size={14} className="asis-gira" aria-hidden="true" /> : <MoonStar size={14} aria-hidden="true" />}
                  {repasando ? "Repasando…" : "Repasar los eventos ahora"}
                </button>
                {avisoRepaso && <p className={`asis-explica${avisoRepaso.mal ? " es-mal" : ""}`}>{avisoRepaso.texto}</p>}
                <p className="asis-explica">
                  Lo mismo que hace solo cada noche. Mira los eventos de los próximos 30 días
                  y deja escrito lo que falta por poner; se ve en Cerebro. No usa el modelo,
                  así que no gasta tokens.
                </p>
              </div>
            )}

            {/* Cómo se monta la dirección del proxy (por qué la clave no vive en la app,
                los pasos en worker/README.md) es cosa de quien instala el asistente, no
                de quien lo usa cada día — no se enseña aquí, solo lo que cambia según el
                proveedor elegido, que sí es relevante en el día a día (privacidad). */}
            {proveedor === "auto" && (
              <p className="asis-explica">
                <strong>En automático</strong> se elige según lo que preguntes: lo gratis
                para el día a día, el de pago solo cuando haya que comparar o recomendar, y
                nunca OpenAI para nada que lleve nombres de clientes.
              </p>
            )}
            {proveedor === "openai" && (
              <p className="asis-explica">
                <strong>Con OpenAI solo funcionan las cuentas y los cálculos:</strong> no
                se le manda ningún nombre de cliente ni ninguna fecha.
              </p>
            )}
          </div>
        )}

        {/* Los ajustes y el historial SUSTITUYEN a la pestaña, no se apilan encima. Apilados
            se comían media pantalla de móvil en las cinco pestañas a la vez: entrabas en
            Humano y veías la dirección del proxy y los proveedores antes que el muñeco. Al
            historial le faltaba este mismo guardado: se veía la lista de charlas guardadas
            con el hilo de la conversación (o el saludo vacío) asomando por debajo, como un
            texto rayado encima de otro. */}
        {!ajustes && !verHistorial && (pestana === "tareas" ? (
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
                    {/* Mismo pill que ya usa el número de veces en Cerebro y Gasto: es
                        "una etiqueta pequeña dentro de asis-recuerdo", que es justo lo
                        que hace falta aquí, sin CSS nuevo. */}
                    {t.fecha && (
                      <span className="asis-recuerdo-puntos" title={`Recordatorio para el ${t.fecha}`}>
                        {new Date(`${t.fecha}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </span>
                    )}
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
              cual={companero === "ninguno" ? COMPANERO_POR_DEFECTO : companero}
              estado={pensando ? "pensando" : huboError ? "error" : "quieto"}
              haciendo={enCurso}
              // Con hilo vacío no hay ninguna respuesta de verdad que leer todavía —pero
              // sí puede haber un saludo con recordatorios de hoy esperando, y pedido tal
              // cual: que lo diga en voz, no solo escrito. Humano.jsx no sabe de dónde
              // sale "ultimaRespuesta"; lee lo que le llegue, así que no hace falta
              // tocar nada allí.
              ultimaRespuesta={hilo.length ? ([...hilo].reverse().find(m => m.de === "el")?.texto || "") : (saludo || "")}
              vozActiva={vozActiva}
              onCambiarVoz={(v) => { setVozActiva(v); guardar(CLAVE_VOZ, v ? "1" : "0"); }}
              vozGemini={vozGemini}
              urlProxy={url}
              personalidad={personalidad}
              onCambiarCompanero={(k) => { setCompanero(k); guardar(CLAVE_COMPANERO, k); }}
              onCambiarPersonalidad={(k) => { setPersonalidad(k); guardar(CLAVE_PERSONALIDAD, k); }}
              // Tocar a Jarvis lo minimiza: mismo "cerrar" de siempre (vuelve a la burbuja
              // flotante), no un estado nuevo — la pestaña queda guardada (CLAVE_PESTANA,
              // arriba) para que al volver a abrir esté "como antes" y no en Charla.
              onMinimizar={onCerrar}
              // Lo dictado entra por la MISMA puerta que lo escrito: mismas herramientas,
              // mismos permisos, mismo enrutado. Hablarle no es un camino aparte.
              onPregunta={(t) => enviar(null, t)}
            />
          </div>
        ) : pestana === "gasto" ? (
          <div className="asis-hilo asis-cerebro">
            <p className="asis-explica">
              Lo que llevas consumido este mes EN ESTE APARATO: el móvil y el ordenador
              cuentan cada uno el suyo, no se suman ni se ven entre sí, así que es normal
              que aquí veas un número distinto que en el otro. Los precios son
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
                onClick={() => setDialogo({
                  tipo: "confirm",
                  titulo: "¿Poner el contador a cero?",
                  mensaje: "Se borra lo que llevas consumido este mes en este aparato. No se puede deshacer.",
                  textoConfirmar: "Poner a cero",
                  peligro: true,
                  onConfirm: () => setGasto(borrarGasto()),
                })}>
                Poner el contador a cero
              </button>
            )}
          </div>
        ) : pestana === "cerebro" ? (
          <Cerebro
            memoria={contexto.memoria || []}
            objetivos={contexto.objetivos || []}
            eventosGuardados={contexto.eventosGuardados || {}}
            repaso={repaso}
            oportunidades={contexto.oportunidades}
            onOlvidar={onOlvidar}
            onPonerObjetivo={contexto.onPonerObjetivo}
            onCambiarEstadoObjetivo={contexto.onCambiarEstadoObjetivo}
            onQuitarObjetivo={contexto.onQuitarObjetivo}
          />
        ) : (
        <div className="asis-hilo">
          {!hilo.length && (
            <>
              {/* Habla primero SOLO si hay algo que decir, y solo en una charla nueva: en
                  cuanto hay hilo, esto ya no se ve —repetirlo en cada respuesta sería
                  spam, no un aviso—. Es un mensaje de mentira, no una vuelta real: no
                  entra en `mensajes` (lo que se manda al modelo) ni se guarda en el
                  historial, así que no cuesta un token ni ensucia las conversaciones
                  guardadas con una que nadie empezó de verdad. */}
              {saludo && (
                <div className="asis-msg es-el">
                  <div className="asis-burbuja">{saludo}</div>
                </div>
              )}
              <div className="asis-vacio">
                <p>Pregúntame por tus eventos. Los números salen de las fórmulas de la app, no de mi cabeza.</p>
                <ul>
                  <li>¿Cuánto hielo llevo a la boda de septiembre?</li>
                  <li>¿A qué hora salimos del obrador?</li>
                  <li>¿Qué eventos tengo sin configurar?</li>
                  <li>¿Cuánta gente hace falta para una comunión de 90?</li>
                </ul>
              </div>
            </>
          )}
          {hilo.map((m, i) => (
            <div className={`asis-msg es-${m.de}`} key={i}>
              {/* Sin markdown: se le pide al modelo que no lo use, pero pedirlo no basta
                  —se olvida cada tantas respuestas y el que se olvida no avisa—, así que
                  se limpia aquí, que es el único sitio donde se puede garantizar. */}
              <div className="asis-burbuja">{m.de === "el" ? sinMarcas(m.texto) : m.texto}</div>
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
                    // Con más de una ida y vuelta, el chip abre el desglose. Con una
                    // sola no hay nada que desglosar y un botón que no hace nada
                    // enseña a no pulsarlo.
                    m.diario && m.diario.length > 1 ? (
                      <button
                        type="button"
                        className={`asis-paso es-coste es-abre${m.coste.gratis ? " es-gratis" : ""}${diarioAbierto === i ? " es-abierto" : ""}`}
                        onClick={() => setDiarioAbierto(d => (d === i ? -1 : i))}
                        aria-expanded={diarioAbierto === i}
                        title={`${m.diario.length} idas y vueltas al modelo`}
                      >
                        {m.coste.tokens.toLocaleString("es-ES")} tk
                        {!m.coste.gratis && ` · ${m.coste.euros.toFixed(3)}€`}
                        {" "}<span className="asis-vueltas">×{m.diario.length}</span>
                      </button>
                    ) : (
                      <span className={`asis-paso es-coste${m.coste.gratis ? " es-gratis" : ""}`}>
                        {m.coste.tokens.toLocaleString("es-ES")} tk
                        {!m.coste.gratis && ` · ${m.coste.euros.toFixed(3)}€`}
                      </span>
                    )
                  )}
                </div>
              ) : null}
              {/* El diario de la pregunta: una línea por vuelta, con lo que costó y qué
                  pidió el modelo en ella. Es lo que hace falta para saber dónde apretar
                  cuando una pregunta sale cara. */}
              {diarioAbierto === i && m.diario && (
                <ol className="asis-diario">
                  {m.diario.map((v, j) => {
                    const c = costeDeUna(v.proveedor, v.uso);
                    return (
                      <li key={j}>
                        <span className="asis-diario-n">{v.vuelta}ª</span>
                        <span className="asis-diario-tk">
                          {c ? c.tokens.toLocaleString("es-ES") : 0} tk
                          {c && !c.gratis ? ` · ${c.euros.toFixed(3)}€` : ""}
                        </span>
                        <span className="asis-diario-h">
                          {v.herramientas && v.herramientas.length
                            ? v.herramientas.map(h => h.replace(/_/g, " ")).join(", ")
                            : "respuesta"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
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
        ))}

        {/* Encima del campo de escribir a propósito: es lo último que se mira antes de
            seguir preguntando, y así no se queda un cambio esperando sin que nadie lo vea. */}
        {!ajustes && !verHistorial && pestana === "charla" && pendientes.length > 0 && (
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

        {!ajustes && !verHistorial && pestana === "charla" && (
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
