import { sinMarcas } from "./texto.js";

// ─── HABLARLE Y QUE CONTESTE ──────────────────────────────────────────────────
// Dictar la pregunta y oír la respuesta, usando lo que ya trae el navegador. No pasa
// por ningún modelo ni por el proxy: no gasta un solo token y funciona sin conexión al
// asistente. Es la diferencia entre "una función bonita" y "una función que se usa
// mientras cargas el camión con las manos ocupadas".
//
// No está en todos los navegadores. Cuando no está, se dice y se sigue escribiendo —
// no se esconde el botón sin explicar por qué, que es lo que hace pensar que se ha roto.
//
// Sin React: entra texto, sale voz; entra voz, sale texto.

export const hayEscucha = () => typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export const hayVoz = () => typeof window !== "undefined" && !!window.speechSynthesis;

// ─── OÍR ──────────────────────────────────────────────────────────────────────
// Devuelve un mando para parar. Se avisa de lo que va oyendo (parcial) además de lo
// final: sin eso el botón se queda mudo unos segundos y nadie sabe si le está oyendo.
export function escuchar({ onParcial, onTexto, onFin, onError, idioma = "es-ES" } = {}) {
  const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Reconocimiento) {
    if (onError) onError("Este navegador no sabe escuchar. En Chrome o Safari sí funciona.");
    return { parar: () => {} };
  }

  const r = new Reconocimiento();
  r.lang = idioma;
  r.continuous = false;
  r.interimResults = true;
  let dicho = "";

  r.onresult = (e) => {
    let parcial = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) dicho += t;
      else parcial += t;
    }
    if (parcial && onParcial) onParcial(parcial);
  };

  r.onerror = (e) => {
    // "no-speech" es que no se ha dicho nada, no un fallo: decir "ha habido un error"
    // cuando alguien simplemente no ha hablado es confundir por confundir.
    const motivo = {
      "not-allowed": "No has dado permiso al micrófono.",
      "service-not-allowed": "El navegador no deja usar el micrófono aquí.",
      "no-speech": "",
      "audio-capture": "No encuentro ningún micrófono.",
    }[e.error];
    if (motivo === undefined) { if (onError) onError(`El micrófono ha fallado (${e.error}).`); }
    else if (motivo && onError) onError(motivo);
  };

  r.onend = () => {
    const limpio = dicho.trim();
    if (limpio && onTexto) onTexto(limpio);
    if (onFin) onFin();
  };

  try { r.start(); } catch (e) { if (onError) onError("Ya estaba escuchando."); }
  return { parar: () => { try { r.stop(); } catch (e) { /* ya estaba parado */ } } };
}

// ─── HABLAR ───────────────────────────────────────────────────────────────────
// El texto de una respuesta lleva markdown, listas y símbolos que leídos en voz alta
// suenan absurdos ("asterisco asterisco boda"). Se limpia antes.
export function paraLeerEnVozAlta(texto) {
  // Las marcas las quita sinMarcas, que es el mismo trabajo que hace falta en pantalla.
  // Aquí se le añade lo que solo estorba al oído: los emojis, los "·" que quedan de las
  // listas y los saltos de línea, que leídos en alto no suenan a nada.
  return sinMarcas(texto)
    .replace(/⚠️|✅|❌|📅|📍|👥|🚚|🔧/g, "")
    .replace(/^·\s+/gm, "")
    // Las horas se leen mal: "13:00" sale como "trece dos puntos cero cero". En punto
    // se dice sin minutos —"a las 13", que es como se dice de verdad, no "13 y 00"—;
    // el resto sí lleva el "y" ("13 y 15").
    .replace(/\b(\d{1,2}):00\b/g, "$1")
    .replace(/\b(\d{1,2}):(\d{2})\b/g, "$1 y $2")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── LA VOZ DEL NAVEGADOR: ELEGIR LA MENOS ROBÓTICA ────────────────────────────
// Sin elegir ninguna, `speechSynthesis.speak` coge la voz que el navegador tenga
// puesta por defecto — que casi siempre es la voz LOCAL del sistema operativo, la más
// "de robot" de todas las que suele haber instaladas. Las voces DE RED (las de Google
// en Android/Chrome, servidas desde internet igual que el resto del reconocimiento de
// voz de Google) están generadas con mucho más cuidado y se nota de inmediato; en
// iOS/Safari y Edge, las voces "Enhanced"/"Premium"/"Neural" son el mismo caso con
// otro nombre. Se buscan por lo que TIENEN (localService, o esas palabras en el
// nombre), no por un nombre exacto: el nombre cambia de un aparato a otro y de una
// versión de sistema a otra, así que buscarlo tal cual habría dejado esto sin
// funcionar en la mitad de los móviles del equipo.
//
// `getVoices()` a veces devuelve la lista vacía la primera vez que se llama —el
// navegador aún no ha terminado de cargarlas— y solo avisa con el evento
// "voiceschanged" cuando ya están. Por eso se cachea la última lista no vacía que se
// haya visto: si la primera vez que alguien habla llega antes de que carguen, esa vez
// suena con la voz por defecto del navegador (nunca se rompe, solo no mejora), y las
// siguientes ya cogen la buena.
let vocesCache = [];
if (hayVoz()) {
  const refrescar = () => { const v = window.speechSynthesis.getVoices(); if (v && v.length) vocesCache = v; };
  refrescar();
  window.speechSynthesis.onvoiceschanged = refrescar;
}

export function mejorVoz(idioma = "es-ES") {
  const prefijo = idioma.slice(0, 2).toLowerCase();
  const delIdioma = vocesCache.filter(v => v.lang && v.lang.toLowerCase().startsWith(prefijo));
  if (!delIdioma.length) return null;
  return delIdioma.find(v => v.localService === false)
    || delIdioma.find(v => /enhanced|premium|neural/i.test(v.name))
    || delIdioma[0];
}

function hablarLocal(texto, { idioma, onEmpieza, onAcaba }) {
  if (!hayVoz()) return { callar: () => {} };
  const d = new SpeechSynthesisUtterance(texto.slice(0, 1200));
  d.lang = idioma;
  d.rate = 1.05;
  const voz = mejorVoz(idioma);
  if (voz) d.voice = voz;
  if (onEmpieza) d.onstart = onEmpieza;
  if (onAcaba) { d.onend = onAcaba; d.onerror = onAcaba; }
  window.speechSynthesis.speak(d);
  return { callar };
}

// ─── LA VOZ DE VERDAD: GEMINI, SI HAY A DÓNDE LLAMAR Y DA TIEMPO ───────────────
// Un EXTRA, no una base: si no hay proxy configurado, si no hay conexión, si el Worker
// tarda más de lo razonable o si Gemini no tiene voz configurada, se seguirá con la voz
// del navegador de toda la vida sin decir nada — nadie se queda muda por esto. Por eso
// cualquier fallo de aquí se traga en silencio (ver el catch en `hablar`, más abajo):
// esto no es de lo que depende poder hablar, es lo que suena mejor cuando se puede.
//
// `nube.url` es la MISMA dirección del Worker que ya usa el chat; `nube.token`, la
// MISMA sesión de Firebase. No hay clave nueva que configurar: el Worker reutiliza las
// claves de Gemini que ya tenga puestas para el chat (ver worker/index.js, ruta
// "/__voz").
async function pedirVozDeNube(texto, { idioma, url, token, tope = 4000, voz = "" }) {
  const cortar = new AbortController();
  const fuera = setTimeout(() => cortar.abort(), tope);
  try {
    const r = await fetch(`${String(url).replace(/\/+$/, "")}/__voz`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ texto, idioma, voz }),
      signal: cortar.signal,
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => null);
    if (!d || !d.audio) return null;
    return pcmAUrlDeAudio(d.audio, d.frecuencia || 24000);
  } catch (e) {
    return null; // sin conexión, tope de tiempo agotado, o el Worker sin Gemini configurado
  } finally {
    clearTimeout(fuera);
  }
}

// Gemini devuelve PCM en crudo (sin cabecera), y ni <audio> ni el navegador lo
// reproducen tal cual: hace falta envolverlo en un WAV mínimo, que es solo 44 bytes de
// cabecera delante de los mismos bytes.
function pcmAUrlDeAudio(base64, frecuencia) {
  const bin = atob(base64);
  const pcm = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);

  const BLOQUE = 2; // 16 bits, mono
  const buffer = new ArrayBuffer(44 + pcm.length);
  const v = new DataView(buffer);
  const texto = (offset, s) => { for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i)); };
  texto(0, "RIFF");
  v.setUint32(4, 36 + pcm.length, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);              // PCM sin comprimir
  v.setUint16(22, 1, true);              // mono
  v.setUint32(24, frecuencia, true);
  v.setUint32(28, frecuencia * BLOQUE, true);
  v.setUint16(32, BLOQUE, true);
  v.setUint16(34, 16, true);             // bits por muestra
  texto(36, "data");
  v.setUint32(40, pcm.length, true);
  new Uint8Array(buffer, 44).set(pcm);

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

// El audio que suena AHORA, si es de la nube: para poder pararlo desde `callar()`
// igual que se para la voz del navegador, y no dejarlo sonando de fondo si se cambia
// de pestaña o llega una respuesta nueva encima.
let audioActual = null;

function reproducirDeNube(urlBlob, { onEmpieza, onAcaba }) {
  const audio = new Audio(urlBlob);
  audioActual = audio;
  const soltar = () => { if (audioActual === audio) audioActual = null; URL.revokeObjectURL(urlBlob); };
  if (onEmpieza) audio.onplay = onEmpieza;
  audio.onended = () => { soltar(); if (onAcaba) onAcaba(); };
  audio.onerror = () => { soltar(); if (onAcaba) onAcaba(); };
  audio.play().catch(() => { soltar(); if (onAcaba) onAcaba(); });
}

export async function hablar(texto, { idioma = "es-ES", onEmpieza, onAcaba, nube } = {}) {
  const limpio = paraLeerEnVozAlta(texto);
  if (!limpio) return { callar: () => {} };

  // Lo que estuviera sonando se corta —de la nube o del navegador—: dos respuestas
  // hablando a la vez no se entiende ninguna, y pasa en cuanto se pregunta dos veces
  // seguidas.
  callar();

  if (nube && nube.url) {
    const urlBlob = await pedirVozDeNube(limpio.slice(0, 800), { idioma, ...nube });
    if (urlBlob) {
      reproducirDeNube(urlBlob, { onEmpieza, onAcaba });
      return { callar };
    }
  }
  return hablarLocal(limpio, { idioma, onEmpieza, onAcaba });
}

export const callar = () => {
  if (hayVoz()) window.speechSynthesis.cancel();
  if (audioActual) { audioActual.pause(); audioActual = null; }
};
