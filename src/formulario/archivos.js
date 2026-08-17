// ─── ARCHIVOS DEL FORMULARIO (el menú a imprimir, la imagen de las etiquetas) ──
// Los archivos viajan DENTRO del envío, no en un sitio aparte: así no hay que
// activar nada en Firebase ni mantener otro trozo de infraestructura. A cambio hay
// un techo real, porque un documento de Firestore no pasa de 1 MiB.
//
// Por eso las fotos se encogen aquí, en el móvil, antes de subir nada: una foto de
// un menú hecha con el móvil pesa 3-5 MB y no cabría, pero encogida a 1400px de
// lado y JPEG de calidad 0,72 se queda en 200-400 KB y se lee perfectamente. Lo que
// no es imagen (un PDF) no se puede encoger: si no cabe, se dice en el momento en
// vez de fallar al enviar.

// Techo por archivo ya convertido a texto (base64 abulta ~4/3 del binario). Se deja
// margen para las respuestas y para el segundo archivo del mismo envío.
const MAX_BYTES = 420 * 1024;
const LADO_MAX = 1400;
const CALIDAD = 0.72;

const esImagen = (f) => !!f && /^image\//.test(f.type);

// Tamaño en bytes de un data URL, sin montar el binario entero en memoria
function pesoDeDataUrl(dataUrl = "") {
  const coma = dataUrl.indexOf(",");
  if (coma === -1) return 0;
  const b64 = dataUrl.slice(coma + 1);
  const relleno = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - relleno;
}

function leerComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error("no-se-puede-leer"));
    fr.readAsDataURL(file);
  });
}

// Encoge una imagen hasta que quepa. Si con la primera pasada sigue sin caber (una
// foto muy grande de un menú con mucho texto), se baja la calidad por pasos en vez
// de rendirse: es mejor una foto algo más basta que ninguna.
async function encogerImagen(file) {
  const dataUrl = await leerComoDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("no-es-una-imagen"));
    i.src = dataUrl;
  });
  const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.max(1, Math.round(img.width * escala));
  lienzo.height = Math.max(1, Math.round(img.height * escala));
  const ctx = lienzo.getContext("2d");
  ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  for (const calidad of [CALIDAD, 0.6, 0.5, 0.42]) {
    const salida = lienzo.toDataURL("image/jpeg", calidad);
    if (pesoDeDataUrl(salida) <= MAX_BYTES) return salida;
  }
  return null; // ni así cabe
}

// Deja un archivo listo para viajar en el envío, o dice por qué no puede.
// Devuelve { ok: true, archivo: { nombre, tipo, datos, peso } } o { ok: false, motivo }.
export async function prepararArchivo(file) {
  if (!file) return { ok: false, motivo: "sin-archivo" };
  try {
    if (esImagen(file)) {
      const datos = await encogerImagen(file);
      if (!datos) return { ok: false, motivo: "imagen-enorme" };
      return { ok: true, archivo: { nombre: file.name || "foto.jpg", tipo: "image/jpeg", datos, peso: pesoDeDataUrl(datos) } };
    }
    // No es imagen (un PDF): no hay forma de encogerlo, o cabe o no cabe
    const datos = await leerComoDataUrl(file);
    const peso = pesoDeDataUrl(datos);
    if (peso > MAX_BYTES) return { ok: false, motivo: "pesa-mucho", peso };
    return { ok: true, archivo: { nombre: file.name || "archivo", tipo: file.type || "application/octet-stream", datos, peso } };
  } catch (e) {
    return { ok: false, motivo: "no-se-puede-leer" };
  }
}

// El motivo, en palabras de quien lo está mandando desde el móvil
export function motivoEnPalabras(motivo) {
  switch (motivo) {
    case "imagen-enorme":
    case "pesa-mucho":
      return "Ese archivo pesa demasiado. Si es un PDF, mándalo por WhatsApp; si es una foto, hazla otra vez.";
    case "no-es-una-imagen":
    case "no-se-puede-leer":
      return "No se ha podido leer ese archivo. Prueba con otro o hazle una foto.";
    default:
      return "No se ha podido adjuntar.";
  }
}

export function pesoEnPalabras(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
