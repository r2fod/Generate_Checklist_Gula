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
    // Las horas se leen mal: "13:00" sale como "trece dos puntos cero cero".
    .replace(/\b(\d{1,2}):(\d{2})\b/g, "$1 y $2")
    .replace(/\s+/g, " ")
    .trim();
}

export function hablar(texto, { idioma = "es-ES", onEmpieza, onAcaba } = {}) {
  if (!hayVoz()) return { callar: () => {} };
  const limpio = paraLeerEnVozAlta(texto);
  if (!limpio) return { callar: () => {} };

  // Lo que estuviera diciendo se corta: dos respuestas hablando a la vez no se entiende
  // ninguna, y pasa en cuanto se pregunta dos veces seguidas.
  window.speechSynthesis.cancel();

  const d = new SpeechSynthesisUtterance(limpio.slice(0, 1200));
  d.lang = idioma;
  d.rate = 1.05;
  if (onEmpieza) d.onstart = onEmpieza;
  if (onAcaba) { d.onend = onAcaba; d.onerror = onAcaba; }
  window.speechSynthesis.speak(d);
  return { callar: () => window.speechSynthesis.cancel() };
}

export const callar = () => { if (hayVoz()) window.speechSynthesis.cancel(); };
