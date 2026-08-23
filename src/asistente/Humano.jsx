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
import { COMPANEROS, CLAVES_COMPANERO, COMPANERO_POR_DEFECTO } from "./companeros.js";
import Jarvis from "./Jarvis.jsx";
import { PERSONALIDADES, CLAVES_PERSONALIDAD, PERSONALIDAD_POR_DEFECTO } from "./personalidad.js";

// Los cuatro son la misma cara dentro de un cuerpo distinto, igual que en el pequeño.
// ─── LOS SIETE OFICIOS ────────────────────────────────────────────────────────
// Personas, no objetos con cara. Un objeto solo puede inclinarse; una persona tiene
// hombros y brazos, y eso es lo que hace que los gestos (buscar, calcular, borrar) se
// noten de verdad en vez de quedarse en un balanceo.
//
// Y comparten TODO el cuerpo. Lo que cambia de un oficio a otro son tres cosas —lo que
// lleva en la cabeza, lo que lleva en las manos y el detalle del pecho—, así que dibujar
// siete personas enteras habría sido copiar el mismo torso siete veces y descuadrarlos
// en cuanto se tocara uno.
//
// Todo mira a la misma rejilla: cabeza centrada en (100, 76) con radio 34, hombros a la
// altura 116, manos a 150. Un accesorio nuevo se coloca con esos tres números.
const CUERPO = (
  <>
    {/* Las piernas primero, que van detrás del torso */}
    <path className="pj-oscuro" d="M78 158 h14 v22 h-14 z M108 158 h14 v22 h-14 z" />
    {/* El torso va con la ROPA, no con la piel: comparten la misma clase la cabeza y el
        cuerpo, y pintar los dos de piel dejaba al cocinero en camiseta debajo del gorro. */}
    <path className="hum-relleno" d="M66 122 a34 34 0 0 1 68 0 v34 a16 16 0 0 1 -16 16 h-36 a16 16 0 0 1 -16 -16 z" />
    {/* El cuello sí es piel, para que la cabeza no flote sobre la chaquetilla */}
    <rect className="hum-cuerpo" x="92" y="100" width="16" height="16" rx="6" />
    <circle className="hum-cuerpo" cx="100" cy="76" r="34" />
  </>
);

// Los brazos van DESPUÉS del accesorio de la mano en unos oficios y antes en otros, así
// que se pintan aparte y cada oficio decide. Por defecto, caídos y relajados.
const BRAZOS = (
  <>
    <path className="hum-relleno" d="M68 126 q-12 14 -8 30 a7 7 0 0 0 13 3 q-2 -14 6 -26 z" />
    <path className="hum-relleno" d="M132 126 q12 14 8 30 a7 7 0 0 1 -13 3 q2 -14 -6 -26 z" />
  </>
);

// Las piezas que se repiten entre oficios. Escribirlas una vez es lo que permite que
// haya ocho personajes sin ocho torsos distintos que descuadrar.
const GORRO_COCINA = (
  <>
    <path className="hum-relleno" d="M68 44 a17 17 0 0 1 16 -17 a19 19 0 0 1 32 0 a17 17 0 0 1 16 17 v8 h-64 z" />
    <rect className="hum-borde" x="66" y="48" width="68" height="12" rx="6" />
  </>
);
// El pelo asoma por debajo del gorro o del recogido. Es lo único que separa a la
// cocinera del cocinero, y con eso basta: más detalle a este tamaño es ruido.
const MELENA = (
  <path className="pj-pelo" d="M66 76 q-7 20 2 30 h9 q-9 -14 -4 -30 z M134 76 q7 20 -2 30 h-9 q9 -14 4 -30 z" />
);
const PAJARITA = (
  <>
    <path className="pj-oscuro" d="M92 116 l-9 -6 v12 z M108 116 l9 -6 v12 z" />
    <circle className="pj-oscuro" cx="100" cy="116" r="3.4" />
  </>
);
// La bandeja en alto: la postura que hace que se reconozca a un camarero de lejos.
const BANDEJA = (
  <>
    <ellipse className="pj-metal" cx="52" cy="110" rx="22" ry="6" />
    <path className="hum-relleno" d="M56 128 q-10 -8 -4 -18" strokeWidth="7" strokeLinecap="round" fill="none" />
  </>
);

const OFICIOS = {
  // "jarvis" no dibuja nada aquí: es el único que no comparte el CUERPO de los demás
  // (ver Jarvis.jsx). La clave vive igual en este objeto para que la prueba de paridad
  // con Companero.jsx lo siga contando como "dibujado, no solo listado" en los dos
  // sitios.
  jarvis: null,
  cocinera: (
    <>
      {MELENA}
      {GORRO_COCINA}
      {BRAZOS}
      <path className="pj-metal-linea" d="M140 148 v-24" strokeWidth="5" />
      <ellipse className="pj-metal" cx="140" cy="120" rx="9" ry="7" />
      <circle className="hum-borde" cx="92" cy="134" r="2.6" />
      <circle className="hum-borde" cx="92" cy="146" r="2.6" />
    </>
  ),
  cocinero: (
    <>
      {GORRO_COCINA}
      {BRAZOS}
      <path className="pj-metal-linea" d="M140 148 v-24" strokeWidth="5" />
      <ellipse className="pj-metal" cx="140" cy="120" rx="9" ry="7" />
      <circle className="hum-borde" cx="92" cy="134" r="2.6" />
      <circle className="hum-borde" cx="92" cy="146" r="2.6" />
    </>
  ),
  camarero: (
    <>
      {/* Pelo corto, peinado a un lado */}
      <path className="pj-pelo" d="M66 72 a34 34 0 0 1 68 0 q-16 -12 -38 -6 q-16 4 -30 6 z" />
      {BRAZOS}
      {PAJARITA}
      {BANDEJA}
      {/* Chaleco */}
      <path className="pj-oscuro" d="M88 122 l12 16 l12 -16 v40 h-24 z" />
    </>
  ),
  camarera: (
    <>
      {/* Recogido bajo */}
      <path className="pj-pelo" d="M66 74 a34 34 0 0 1 68 0 v-4 a34 34 0 0 0 -68 0 z" />
      <circle className="pj-pelo" cx="136" cy="84" r="10" />
      {BRAZOS}
      {PAJARITA}
      {BANDEJA}
      <path className="pj-oscuro" d="M88 122 l12 16 l12 -16 v40 h-24 z" />
    </>
  ),
  logistica: (
    <>
      {/* Gorra con visera */}
      <path className="hum-relleno" d="M68 58 a32 32 0 0 1 64 0 v6 h-64 z" />
      <path className="hum-borde" d="M64 62 h-15 a5 5 0 0 0 0 9 h17 z" />
      {BRAZOS}
      {/* Chaleco reflectante: las dos bandas cruzadas son lo que lo identifica */}
      <path className="pj-reflectante" d="M84 124 h32 v6 h-32 z M84 142 h32 v6 h-32 z" />
      {/* La caja que carga, delante */}
      <rect className="pj-madera" x="70" y="128" width="42" height="34" rx="3" />
      <path className="pj-metal-linea" d="M70 142 h42 M91 128 v34" strokeWidth="3" />
      {/* Carretilla detrás */}
      <path className="pj-metal-linea" d="M140 118 v42 M140 160 h-14" strokeWidth="4" />
      <circle className="pj-metal-linea" cx="140" cy="166" r="7" strokeWidth="4" />
    </>
  ),
  parrillero: (
    <>
      {/* Pañuelo a la cabeza */}
      <path className="hum-relleno" d="M66 66 a34 34 0 0 1 68 0 v-2 a34 34 0 0 0 -68 0 z" />
      <path className="pj-oscuro" d="M132 60 l13 -6 l-3 10 z" />
      {BRAZOS}
      {/* Delantal de peto */}
      <path className="pj-delantal" d="M86 124 h28 v38 h-28 z" />
      <path className="pj-metal-linea" d="M86 124 l-8 -8 M114 124 l8 -8" strokeWidth="4" />
      {/* La paella con sus dos asas, que es lo de la casa */}
      <ellipse className="pj-metal" cx="142" cy="136" rx="20" ry="8" />
      <path className="pj-metal-linea" d="M122 136 h-8 M162 136 h8" strokeWidth="4" />
      {/* Una llama */}
      <path className="pj-fuego" d="M142 122 q6 -11 0 -19 q-9 9 0 19 z" />
    </>
  ),
  sumiller: (
    <>
      <path className="pj-pelo" d="M68 62 a32 32 0 0 1 64 0 q-32 -14 -64 0 z" />
      {BRAZOS}
      {/* Copa de cata en alto */}
      <path className="pj-vino" d="M130 108 h22 l-4 14 a7 7 0 0 1 -14 0 z" />
      <path className="pj-metal-linea" d="M141 129 v12 M132 141 h18" strokeWidth="4" />
      {/* El paño al brazo, que es lo que distingue a un sumiller de alguien con una copa */}
      <path className="hum-relleno" d="M57 132 h14 v28 h-14 z" />
      {/* Catavinos al cuello */}
      <path className="hum-borde" d="M100 114 v9" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle className="pj-metal" cx="100" cy="127" r="5" />
    </>
  ),
  repostera: (
    <>
      {MELENA}
      {/* Pañuelo anudado */}
      <path className="hum-relleno" d="M66 70 a34 34 0 0 1 68 0 v-6 a34 34 0 0 0 -68 0 z" />
      <path className="pj-oscuro" d="M130 62 l13 -7 l-3 11 z" />
      {BRAZOS}
      {/* Delantal */}
      <path className="pj-delantal" d="M84 126 h32 v34 a16 16 0 0 1 -32 0 z" />
      <path className="pj-metal-linea" d="M84 126 h32" strokeWidth="4" />
      {/* Tarta de dos pisos con su vela */}
      <path className="pj-tarta" d="M128 156 h32 v-13 h-32 z" />
      <path className="pj-tarta" d="M134 143 h20 v-12 h-20 z" />
      <path className="pj-fuego" d="M144 131 v-9" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" />
    </>
  ),
};

// Lo que se pinta: el cuerpo común y encima lo del oficio.
const CUERPOS = Object.fromEntries(
  Object.entries(OFICIOS).map(([k, extras]) => [k, <>{CUERPO}{extras}</>]),
);

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

export default function Humano({ cual = COMPANERO_POR_DEFECTO, estado = "quieto", haciendo = "", ultimaRespuesta = "", onPregunta, vozActiva, onCambiarVoz, personalidad = PERSONALIDAD_POR_DEFECTO, onCambiarCompanero, onCambiarPersonalidad }) {
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

  // El aro no entiende gestos por herramienta (buscando, calculando…): esos son de
  // alguien con brazos que puede señalar algo. Se queda con los cinco estados de
  // siempre — el mismo repertorio que ya usa el resto del asistente.
  const esJarvis = cual === "jarvis";
  const estadoJarvis = oyendo ? "oyendo" : hablando ? "hablando" : estado;

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
        {esJarvis ? (
          <Jarvis estado={estadoJarvis} size={170} />
        ) : (
        <svg viewBox="0 0 200 200" className="hum-svg" role="img" aria-label="El compañero del asistente">
          {/* ── EL VOLUMEN ──
              Lo que separa una silueta plana de algo con cuerpo son tres cosas, y las
              tres van aquí una sola vez en vez de repetirse en los siete muñecos:
              un degradado radial con la luz arriba a la izquierda, un brillo especular
              encima, y una sombra en el suelo que lo asienta. Sin la sombra el muñeco
              flota y el volumen no se lee por mucho degradado que tenga. */}
          <defs>
            <radialGradient id="humVolumen" cx="34%" cy="26%" r="82%">
              <stop offset="0%" className="hum-luz" />
              <stop offset="52%" className="hum-medio" />
              <stop offset="100%" className="hum-sombra" />
            </radialGradient>
            <radialGradient id="humBrillo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" className="hum-brillo-centro" />
              <stop offset="100%" className="hum-brillo-borde" />
            </radialGradient>
            <radialGradient id="humOjo" cx="34%" cy="28%" r="76%">
              <stop offset="0%" className="hum-ojo-luz" />
              <stop offset="100%" className="hum-ojo-fondo" />
            </radialGradient>
            <filter id="humDifumina" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* El suelo va DEBAJO de todo, y se encoge cuando el muñeco sube al respirar:
              una sombra que no cambia con el salto delata que es un dibujo pegado. */}
          <ellipse className="hum-suelo" cx="100" cy="184" rx="46" ry="8" filter="url(#humDifumina)" />

          {CUERPOS[cual] || CUERPOS[COMPANERO_POR_DEFECTO]}

          {/* El brillo, encima del cuerpo y debajo de la cara */}
          <ellipse className="hum-brillo" cx="83" cy="63" rx="15" ry="10" fill="url(#humBrillo)" transform="rotate(-20 83 63)" />
          {/* Ojos: cerrados al pensar, en cruz si algo ha fallado, abiertos el resto */}
          {gesto === "error" ? (
            <g className="hum-cara" strokeWidth="6" strokeLinecap="round" fill="none">
              <path d="M82 68 l11 11 M93 68 l-11 11" />
              <path d="M107 68 l11 11 M118 68 l-11 11" />
            </g>
          ) : (
            <g className="hum-cara-relleno">
              <ellipse className="hum-ojo" cx="88" cy="74" rx="6.5" ry="8" />
              <ellipse className="hum-ojo" cx="112" cy="74" rx="6.5" ry="8" />
              {/* La chispa del ojo. Es el detalle que más hace: sin ella la mirada se
                  queda muerta por muy redondo que sea el ojo. */}
              <circle className="hum-chispa" cx="85.5" cy="70.5" r="2.2" />
              <circle className="hum-chispa" cx="109.5" cy="70.5" r="2.2" />
            </g>
          )}
          {/* La boca se abre y cierra al hablar: es lo que hace que parezca que habla él */}
          <path className="hum-boca" d="M89 90 q11 9 22 0" fill="none" strokeWidth="6" strokeLinecap="round" />
        </svg>
        )}
      </div>

      <p className="hum-estado">
        {oyendo ? (dictado || "Te escucho…")
          : trabajo ? trabajo.frase
          : hablando ? "…"
          : "Dale al micro y cuéntame."}
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

      {/* ── QUIÉN ES Y CÓMO HABLA ──
          Aquí y no solo en los ajustes: el muñeco se cambia mirándolo, no acordándote de
          que hay un ajuste en otra pantalla. Escondido detrás de la rueda dentada, la
          mitad de la gente no llegó a saber que se podía cambiar. */}
      {(onCambiarCompanero || onCambiarPersonalidad) && (
        <div className="hum-ajustes">
          {onCambiarCompanero && (
            <>
              <p className="hum-ajuste-titulo">Quién te acompaña</p>
              <div className="hum-elegir" role="radiogroup" aria-label="Elegir compañero">
                {CLAVES_COMPANERO.map(k => (
                  <button key={k} type="button" role="radio" aria-checked={cual === k}
                    className={`hum-elegir-uno${cual === k ? " es-activa" : ""}`}
                    onClick={() => onCambiarCompanero(k)} title={COMPANEROS[k].nombre}>
                    <span aria-hidden="true">{COMPANEROS[k].emoji}</span>
                    <span>{COMPANEROS[k].nombre}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {onCambiarPersonalidad && (
            <>
              <p className="hum-ajuste-titulo">Cómo te habla</p>
              <div className="hum-elegir" role="radiogroup" aria-label="Elegir personalidad">
                {CLAVES_PERSONALIDAD.map(k => (
                  <button key={k} type="button" role="radio" aria-checked={personalidad === k}
                    className={`hum-elegir-uno es-ancho${personalidad === k ? " es-activa" : ""}`}
                    onClick={() => onCambiarPersonalidad(k)}>
                    <span>{PERSONALIDADES[k].nombre}</span>
                    <em>{PERSONALIDADES[k].resumen}</em>
                  </button>
                ))}
              </div>
              {/* Lo que NO cambia nunca, para que nadie piense que "Bromista" se salta algo */}
              <p className="hum-ajuste-nota">
                Los números, las alergias y lo que puede tocar no cambian: solo cambia cómo te lo cuenta.
              </p>
            </>
          )}
        </div>
      )}

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
