// ─── ARRANQUE DEL FORMULARIO ───────────────────────────────────────────────────
// El formulario de oficina es una app APARTE de la checklist: vive en /formulario/,
// con su propio index.html y su propio manifiesto. Antes compartían dirección y
// manifiesto, y como el ámbito ("scope") era el mismo el navegador los trataba como
// la misma app: quien tenía instalada la checklist, al abrir el formulario se lo
// encontraba dentro de ella. Separando la carpeta, cada uno se instala por su lado.
//
// Aquí NO se monta <Acceso>: desde el formulario no se llega a la checklist, ni al
// login del equipo, ni a la configuración. Solo el formulario.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import Formulario from './Formulario.jsx'

// El código del enlace (?enviar=<código>) se recuerda en ESTE navegador porque si no,
// instalar la app no serviría de nada: el icono abre la dirección de siempre (sin
// ?enviar=) y quien lo instaló se encontraría una pantalla vacía en vez de su
// formulario. Aquí sí manda siempre el código guardado — a diferencia de antes, esta
// dirección es EXCLUSIVAMENTE el formulario, así que no atrapa a nadie en ningún sitio.
const CLAVE_CODIGO = "gula_formulario_codigo";

function codigo() {
  const dela = new URLSearchParams(window.location.search).get("enviar") || "";
  if (dela) {
    try { localStorage.setItem(CLAVE_CODIGO, dela); } catch (e) { /* en privado no se guarda, da igual */ }
    return dela;
  }
  try { return localStorage.getItem(CLAVE_CODIGO) || ""; } catch (e) { return ""; }
}

// Sin código no hay nada que enseñar: ni formulario en blanco (no sabría a qué buzón
// mandar) ni la app del equipo. Se dice lo que pasa y qué hacer.
function pedirElEnlace() {
  const raiz = document.getElementById('root')
  raiz.innerHTML = ''
  const caja = document.createElement('div')
  caja.className = 'link-roto'
  caja.innerHTML = `
    <h1>Falta el enlace</h1>
    <p>Este formulario se abre con el enlace que da logística. Búscalo en el WhatsApp y ábrelo desde ahí.</p>
    <p class="link-roto-nota">Al abrirlo una vez, este móvil lo recuerda y ya puedes instalarlo en la pantalla de inicio.</p>`
  raiz.appendChild(caja)
}

// El tema se pone en el <html> ANTES de montar React, igual que en la checklist: si no,
// hay un fogonazo de blanco al arrancar de noche.
function aplicarTemaInicial() {
  let pref = "auto";
  try { const g = localStorage.getItem("gula_tema"); if (g === "claro" || g === "oscuro" || g === "auto") pref = g; }
  catch (e) { /* localStorage no disponible */ }
  const h = new Date().getHours();
  const tema = pref === "claro" || pref === "oscuro" ? pref : (h >= 20 || h < 7 ? "oscuro" : "claro");
  document.documentElement.dataset.tema = tema;
}
aplicarTemaInicial()

const elCodigo = codigo()
if (!elCodigo) {
  pedirElEnlace()
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Formulario codigo={elCodigo} />
    </StrictMode>,
  )
}

// El service worker es el MISMO que el de la checklist y vive en la raíz: desde ahí
// cubre las dos carpetas con una sola caché. Lo que cambia es a qué documento se
// vuelve sin cobertura, y de eso se encarga él mirando la dirección (ver public/sw.js).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("../sw.js", window.location.href), { scope: "../" })
      .catch(() => {})
  })
}
