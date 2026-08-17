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
import RedDeSeguridad from '../RedDeSeguridad.jsx'
import '../index.css'
import Formulario from './Formulario.jsx'
import { leerGuardado, guardar, codigoDeTexto, direccionConCodigo } from './codigo.js'
import { esIOS } from './instalar.js'
import { leerPreferenciaTema, temaSegunPreferencia } from '../tema.js'

// El código del enlace (?enviar=<código>) se recuerda en ESTE navegador porque si no,
// instalar la app no serviría de nada: el icono abre la dirección de siempre y quien
// lo instaló se encontraría una pantalla vacía en vez de su formulario.
//
// Y además se devuelve a la DIRECCIÓN. Esto no es manía de limpieza: al añadir a la
// pantalla de inicio, el móvil se guarda la dirección que hay en ese momento, y en iOS
// la app que sale de ahí estrena un almacén vacío que NO ve nada de lo guardado en el
// navegador. Sin el código en la dirección, el icono abría un formulario que no sabía
// a qué buzón mandar: "Falta el enlace" después de haber hecho todos los pasos bien.
// En Android no se notaba porque allí la app instalada sí comparte el almacén.
function codigo() {
  const dela = new URLSearchParams(window.location.search).get("enviar") || "";
  if (dela) {
    guardar(window.localStorage, dela);
    return dela;
  }
  const guardado = leerGuardado(window.localStorage);
  const conCodigo = direccionConCodigo(window.location.href, guardado);
  if (conCodigo) {
    // Sin recargar: solo para que lo que se guarde en la pantalla de inicio lo lleve.
    try { window.history.replaceState(null, "", conCodigo); } catch (e) { /* da igual */ }
  }
  return guardado;
}

// Sin código no hay nada que enseñar: ni formulario en blanco (no sabría a qué buzón
// mandar) ni la app del equipo. Se dice lo que pasa, qué hacer, y se da una salida:
// pegar el enlace a mano. Antes esto era un callejón sin salida, y el peor sitio para
// tenerlo — quien llegaba aquí desde el icono de la pantalla de inicio volvía a lo
// mismo una y otra vez, sin nada que tocar.
function pedirElEnlace() {
  const raiz = document.getElementById('root')
  raiz.innerHTML = ''
  // El campo para pegar el enlace es una SALIDA de emergencia, no una instrucción: a
  // quien llega aquí hay que decirle que busque el enlace en el WhatsApp, no ponerle
  // deberes. Así que sale abierto solo donde de verdad hace falta —el iPhone, donde la
  // app instalada estrena un almacén vacío y no ve el código que guardó el navegador— y
  // en el resto queda detrás de un enlace que hay que tocar.
  //
  // Escondido, NO quitado: quien abra la dirección pelada en Android se quedaría sin
  // salida, y eso ya pasó una vez. Un callejón sin salida en el peor sitio posible.
  const enApple = esIOS(navigator.userAgent, navigator.maxTouchPoints || 0)
  const caja = document.createElement('div')
  caja.className = 'link-roto'
  caja.innerHTML = `
    <h1>Falta el enlace</h1>
    <p>Este formulario se abre con el enlace que da logística. Búscalo en el WhatsApp y ábrelo desde ahí.</p>
    <button type="button" class="link-roto-abrir-pegar"${enApple ? ' hidden' : ''}>Pegar el enlace a mano</button>
    <label class="link-roto-etiqueta" for="pegar-enlace"${enApple ? '' : ' hidden'}>O pega aquí el enlace y lo abro yo:</label>
    <div class="link-roto-pegar"${enApple ? '' : ' hidden'}>
      <input id="pegar-enlace" class="form-input" type="text" inputmode="url" autocomplete="off"
             placeholder="https://..." aria-label="Enlace del formulario" />
      <button type="button" class="form-btn-principal">Abrir</button>
    </div>
    <p class="link-roto-error" hidden>Ese enlace no lleva código. Copia entero el que da logística, desde https hasta el final.</p>
    <p class="link-roto-nota">Al abrirlo una vez, este móvil lo recuerda y ya puedes guardarlo en la pantalla de inicio.</p>`
  raiz.appendChild(caja)

  const campo = caja.querySelector('#pegar-enlace')
  const error = caja.querySelector('.link-roto-error')
  const etiqueta = caja.querySelector('.link-roto-etiqueta')
  const grupo = caja.querySelector('.link-roto-pegar')
  const abrirPegar = caja.querySelector('.link-roto-abrir-pegar')
  abrirPegar.addEventListener('click', () => {
    abrirPegar.hidden = true
    etiqueta.hidden = false
    grupo.hidden = false
    campo.focus()
  })
  const abrir = () => {
    const suCodigo = codigoDeTexto(campo.value)
    if (!suCodigo) { error.hidden = false; campo.focus(); return }
    guardar(window.localStorage, suCodigo)
    // Se recarga CON el código en la dirección, que es como tiene que quedarse para
    // que guardarlo en la pantalla de inicio sirva de algo.
    window.location.search = "?enviar=" + encodeURIComponent(suCodigo)
  }
  caja.querySelector('.form-btn-principal').addEventListener('click', abrir)
  campo.addEventListener('input', () => { error.hidden = true })
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrir() })
}

// El tema se pone en el <html> ANTES de montar React, igual que en la checklist: si no,
// hay un fogonazo de blanco al arrancar de noche.
function aplicarTemaInicial() {
  document.documentElement.dataset.tema = temaSegunPreferencia(leerPreferenciaTema());
}
aplicarTemaInicial()

const elCodigo = codigo()
if (!elCodigo) {
  pedirElEnlace()
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <RedDeSeguridad><Formulario codigo={elCodigo} /></RedDeSeguridad>
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
