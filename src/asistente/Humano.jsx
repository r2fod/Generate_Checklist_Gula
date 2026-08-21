// ─── EL COMPAÑERO, A TAMAÑO GRANDE ────────────────────────────────────────────
// La pantalla donde se le habla en vez de escribirle. Un personaje grande que respira,
// parpadea, escucha y contesta en voz alta.
//
// Y no es un capricho de diseño: la app se usa con el móvil en una mano y una caja en
// la otra. Poder decir "¿cuánto hielo llevo a la boda del doce?" y que conteste sin
// tocar nada es la diferencia entre usarla y dejarla en el bolsillo.
//
// La voz la pone el navegador, no un modelo: no gasta un solo token. Solo la pregunta y
// la respuesta pasan por el asistente, igual que si se escribieran.
//
// Dibujado en SVG a mano, como el pequeño de la cabecera, y por lo mismo: pesa nada,
// se ve nítido en cualquier pantalla y cambia de color con el tema.
import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { escuchar, hablar, callar, hayEscucha, hayVoz } from "./voz.js";
import { gestoDeHerramienta } from "./gestos.js";

// Los cuatro son la misma cara dentro de un cuerpo distinto, igual que en el pequeño.
const CUERPOS = {
  chef: (
    <>
      <path d="M52 78 a26 26 0 0 1 24 -26 a30 30 0 0 1 48 0 a26 26 0 0 1 24 26 v10 h-96 z" className="hum-relleno" />
      <rect x="50" y="86" width="100" height="14" rx="6" className="hum-borde" />
      <ellipse cx="100" cy="132" rx="52" ry="46" className="hum-cuerpo" />
    </>
  ),
  cazuela: (
    <>
      <path d="M44 96 h112 v34 a56 40 0 0 1 -112 0 z" className="hum-cuerpo" />
      <rect x="38" y="86" width="124" height="12" rx="6" className="hum-borde" />
      <path d="M74 66 q10 -16 0 -30 M100 62 q10 -18 0 -34 M126 66 q10 -16 0 -30"
        fill="none" strokeWidth="5" strokeLinecap="round" className="hum-vapor" />
    </>
  ),
  copa: (
    <>
      <path d="M56 62 h88 l-12 56 a32 32 0 0 1 -64 0 z" className="hum-cuerpo" />
      <path d="M100 150 v26 M76 176 h48" strokeWidth="7" strokeLinecap="round" fill="none" className="hum-borde" />
      <circle cx="74" cy="48" r="5" className="hum-vapor" />
      <circle cx="126" cy="40" r="3.5" className="hum-vapor" />
    </>
  ),
  camion: (
    <>
      <rect x="34" y="66" width="82" height="76" rx="10" className="hum-cuerpo" />
      <path d="M116 92 h26 l20 22 v28 h-46 z" className="hum-relleno" />
      <circle cx="62" cy="152" r="14" className="hum-borde" />
      <circle cx="140" cy="152" r="14" className="hum-borde" />
    </>
  ),
};

// ─── LOS GESTOS QUE HACE SOLO ─────────────────────────────────────────────────
// Un personaje que solo se mueve cuando le hablas no parece vivo: parece un botón con
// cara. Lo que da la sensación de vida es lo que hace SIN que le pidas nada — mirar a un
// lado, ladearse, estirarse — y sobre todo que no se sepa cuándo va a hacerlo.
//
// Por eso los tiempos son al azar dentro de un rango. Con un temporizador fijo el ojo
// aprende el ritmo en veinte segundos y vuelve a parecer un botón.
const GESTOS = ["mira-izq", "mira-der", "ladea", "estira", "asiente"];
const ESPERA_MIN = 3200, ESPERA_MAX = 8000;

function useGestos(activo) {
  const [gesto, setGesto] = useState("");
  useEffect(() => {
    if (!activo) { setGesto(""); return; }
    let vivo = true;
    let id;
    const siguiente = () => {
      const espera = ESPERA_MIN + Math.random() * (ESPERA_MAX - ESPERA_MIN);
      id = setTimeout(() => {
        if (!vivo) return;
        // Nunca dos veces el mismo seguido: repetirlo canta muchísimo.
        setGesto(g => {
          const otros = GESTOS.filter(x => x !== g);
          return otros[Math.floor(Math.random() * otros.length)];
        });
        // El gesto dura poco y vuelve a la posición de siempre. Quedarse ladeado da la
        // impresión de que se ha colgado.
        setTimeout(() => { if (vivo) { setGesto(""); siguiente(); } }, 1500);
      }, espera);
    };
    siguiente();
    return () => { vivo = false; clearTimeout(id); };
  }, [activo]);
  return gesto;
}

export default function Humano({ cual = "chef", estado = "quieto", haciendo = "", ultimaRespuesta = "", onPregunta, vozActiva, onCambiarVoz }) {
  const [oyendo, setOyendo] = useState(false);
  const [dictado, setDictado] = useState("");
  const [aviso, setAviso] = useState("");
  const [hablando, setHablando] = useState(false);
  const mando = useRef(null);
  const yaLeido = useRef("");

  // Leer la respuesta en cuanto llega, si la voz está encendida. Se guarda cuál se ha
  // leído para no repetirla al volver a esta pestaña.
  useEffect(() => {
    if (!vozActiva || !ultimaRespuesta || ultimaRespuesta === yaLeido.current) return;
    yaLeido.current = ultimaRespuesta;
    hablar(ultimaRespuesta, { onEmpieza: () => setHablando(true), onAcaba: () => setHablando(false) });
  }, [ultimaRespuesta, vozActiva]);

  // Al salir de la pantalla se calla y se suelta el micro. Un asistente que sigue
  // hablando cuando ya no le miras es lo más molesto que puede hacer.
  useEffect(() => () => { callar(); if (mando.current) mando.current.parar(); }, []);

  const alternarMicro = () => {
    setAviso("");
    if (oyendo) { if (mando.current) mando.current.parar(); return; }
    callar();
    setHablando(false);
    setDictado("");
    setOyendo(true);
    mando.current = escuchar({
      onParcial: setDictado,
      onTexto: (t) => { setDictado(""); if (onPregunta) onPregunta(t); },
      onFin: () => { setOyendo(false); setDictado(""); },
      onError: (e) => { setAviso(e); setOyendo(false); },
    });
  };

  // Lo que está haciendo AHORA mismo manda sobre "pensando": buscar y borrar no son lo
  // mismo, y verlo en la cara mientras pasa es la diferencia entre enterarte a tiempo y
  // enterarte cuando ya está hecho.
  const trabajo = estado === "pensando" ? gestoDeHerramienta(haciendo) : null;
  const gesto = trabajo ? trabajo.gesto : oyendo ? "oyendo" : hablando ? "hablando" : estado;
  // Los gestos propios solo cuando está a lo suyo: mientras piensa, escucha o habla ya
  // tiene su animación, y encimarlas hace que parezca nervioso en vez de vivo.
  const suyo = useGestos(gesto === "quieto");

  return (
    <div className="hum">
      <div className={`hum-escena es-${gesto}${suyo ? ` gesto-${suyo}` : ""}`}>
        {/* Los aros solo cuando escucha: sin ellos no se sabe si el micro está abierto,
            y eso es justo lo que hay que ver de un vistazo. */}
        {oyendo && (
          <>
            <span className="hum-aro" />
            <span className="hum-aro es-tarde" />
          </>
        )}
        <svg viewBox="0 0 200 200" className="hum-svg" role="img" aria-label="El compañero del asistente">
          {CUERPOS[cual] || CUERPOS.chef}
          {/* Ojos: cerrados al pensar, en cruz si algo ha fallado, abiertos el resto */}
          {gesto === "error" ? (
            <g className="hum-cara" strokeWidth="6" strokeLinecap="round" fill="none">
              <path d="M76 118 l14 14 M90 118 l-14 14" />
              <path d="M110 118 l14 14 M124 118 l-14 14" />
            </g>
          ) : (
            <g className="hum-cara-relleno">
              <ellipse className="hum-ojo" cx="83" cy="125" rx="8" ry="10" />
              <ellipse className="hum-ojo" cx="117" cy="125" rx="8" ry="10" />
            </g>
          )}
          {/* La boca se abre y cierra al hablar: es lo que hace que parezca que habla él */}
          <path className="hum-boca" d="M84 146 q16 12 32 0" fill="none" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>

      <p className="hum-estado">
        {oyendo ? (dictado || "Te escucho…")
          : trabajo ? trabajo.frase
          : hablando ? "Hablando…"
          : "Dale al micro y pregúntame."}
      </p>

      {aviso && <p className="hum-aviso">{aviso}</p>}

      <div className="hum-botones">
        <button
          type="button"
          className={`hum-micro${oyendo ? " es-oyendo" : ""}`}
          onClick={alternarMicro}
          disabled={!hayEscucha() || estado === "pensando"}
          title={hayEscucha() ? (oyendo ? "Parar" : "Hablar") : "Este navegador no sabe escuchar"}
          aria-label={oyendo ? "Parar de escuchar" : "Hablar al asistente"}
        >
          {estado === "pensando" ? <Loader2 size={26} className="asis-gira" aria-hidden="true" />
            : oyendo ? <MicOff size={26} aria-hidden="true" />
            : <Mic size={26} aria-hidden="true" />}
        </button>

        <button
          type="button"
          className={`hum-voz${vozActiva ? " es-activa" : ""}`}
          onClick={() => { if (vozActiva) { callar(); setHablando(false); } onCambiarVoz(!vozActiva); }}
          disabled={!hayVoz()}
          title={vozActiva ? "Que no conteste en voz alta" : "Que conteste en voz alta"}
          aria-pressed={vozActiva}
        >
          {vozActiva ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
          <span>{vozActiva ? "Contesta en voz alta" : "Contesta en silencio"}</span>
        </button>
      </div>

      {/* Si el navegador no sabe escuchar se dice, en vez de esconder el botón sin
          explicar por qué — que es lo que hace pensar que se ha roto. */}
      {!hayEscucha() && (
        <p className="hum-aviso">
          Este navegador no sabe escuchar. En Chrome o Safari sí; mientras, escríbele en Charla.
        </p>
      )}
    </div>
  );
}
