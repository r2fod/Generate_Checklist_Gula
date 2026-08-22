import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RedDeSeguridad from './RedDeSeguridad.jsx'
import './index.css'
import { cargarEventoNube } from './nube.js'
import Acceso from './Acceso.jsx'
import { aplicarTemaInicial } from './tema.js'
import { leerTexto, leerJSON, guardarJSON } from './almacen.js'

// Si el link es de la nube (?evento=id) se descarga la checklist ANTES de montar
// la app y se deja en localStorage: así el arranque síncrono de App la restaura
// igual que cualquier estado guardado. Se mantiene el parámetro en la URL para
// que recargar la página vuelva a traer la última versión.
// El tema se pone en el <html> ANTES de montar React (vive en tema.js, que lo comparte
// con el arranque del formulario): así no hay un fogonazo de blanco al arrancar y la
// pantalla de acceso también sale en oscuro.
aplicarTemaInicial()

// Este arranque es SOLO el de la checklist, que vive en su propia carpeta. El
// formulario tiene la suya (y su propio arranque), porque el ámbito de un manifiesto
// es la carpeta donde vive: mientras la checklist estuvo en la raíz, su ámbito se
// tragaba el del formulario y el navegador los trataba como la MISMA app — no había
// forma de instalar el formulario aparte.
//
// El desvío de los enlaces ya repartidos lo hace la raíz (ver public/index.html). Esto
// de aquí es solo la red de seguridad para un ?enviar= que llegue a la carpeta de la
// checklist: sin ella se quedaría mirando la checklist, que no es lo que pedía.
function codigoGuardado() {
  return leerTexto("gula_formulario_codigo")
}

function desviarAlFormulario() {
  const p = new URLSearchParams(window.location.search)
  const conEnlace = p.get("enviar") || ""
  const iconoViejo = !!p.get("formulario")
  if (!conEnlace && !iconoViejo) return false
  const codigo = conEnlace || codigoGuardado()
  const destino = new URL("../formulario/", window.location.href)
  if (codigo) destino.searchParams.set("enviar", codigo)
  window.location.replace(destino.href)
  return true
}

const desviado = desviarAlFormulario()

// Cuando el link trae un evento y ese evento NO se puede traer, antes se seguía en
// silencio con lo que hubiera guardado en ese móvil: se abría OTRA checklist (o una
// vacía) como si el link hubiera funcionado. Quien lo recibía se ponía a cargar el
// camión con la lista equivocada sin enterarse. Ahora se dice y se deja elegir.
function avisarEventoNoEncontrado(id, sinConexion) {
  const raiz = document.getElementById('root')
  raiz.innerHTML = ''
  const caja = document.createElement('div')
  caja.className = 'link-roto'
  caja.innerHTML = `
    <h1>No se ha podido abrir el evento</h1>
    <p>${sinConexion
      ? 'No hay conexión para traerlo. Con cobertura, vuelve a abrir el link.'
      : 'Este link apunta a un evento que ya no está en la nube: puede que se borrara o que no llegara a subirse.'}</p>
    <p class="link-roto-id">${id}</p>
    <button type="button">Abrir la app igualmente</button>
    <p class="link-roto-nota">Se abrirá lo último que hubiera en este móvil, que NO es el evento del link.</p>`
  caja.querySelector('button').addEventListener('click', () => {
    window.location.href = window.location.origin + window.location.pathname
  })
  raiz.appendChild(caja)
}

// Cuántas marcas de trabajo hecho lleva un estado: lo preparado, lo cargado, lo que ha
// vuelto y las roturas contadas. Es la medida de "cuánto se perdería".
function marcasDe(estado) {
  if (!estado) return 0
  const cuenta = (obj) => Object.values(obj || {}).filter(v => v !== undefined && v !== "" && v !== false && v !== 0).length
  return cuenta(estado.preparados) + cuenta(estado.checkeados) + cuenta(estado.vueltos) + cuenta(estado.roturas)
}

// Abrir el link de un evento DESCARGA la nube y machaca lo que hubiera en este
// dispositivo. Normalmente es lo que se quiere. Pero si aquí hay marcas que el link no
// trae —alguien estuvo cargando el camión y eso aún no había subido— machacar es tirar
// trabajo hecho, y encima en silencio: pasó de verdad, 93 items cargados a cero.
// Así que cuando el local tiene MÁS marcas que lo que llega, se pregunta.
function preguntarAntesDePisar(id, estadoNube, estadoLocal, seguir) {
  const raiz = document.getElementById('root')
  raiz.innerHTML = ''
  const caja = document.createElement('div')
  caja.className = 'link-roto'
  const suyas = marcasDe(estadoLocal), llegan = marcasDe(estadoNube)
  caja.innerHTML = `
    <h1>Aquí hay trabajo sin subir</h1>
    <p>En este dispositivo hay <strong>${suyas} marcas</strong> (preparado, cargado, vuelto o roturas)
       y el link solo trae <strong>${llegan}</strong>. Abrirlo tal cual borraría la diferencia.</p>
    <p class="link-roto-id">${(estadoLocal && estadoLocal.nombreEvento) || id}</p>
    <button type="button" data-quedarse>Seguir con lo de este dispositivo</button>
    <button type="button" data-pisar>Abrir el link igualmente</button>
    <p class="link-roto-nota">Si sigues con lo de aquí, lo tuyo se subirá a la nube en cuanto haya conexión.</p>`
  caja.querySelector('[data-quedarse]').addEventListener('click', () => {
    // Se quita el ?evento= para que recargar no vuelva a preguntar
    window.location.href = window.location.origin + window.location.pathname
  })
  caja.querySelector('[data-pisar]').addEventListener('click', () => {
    guardarJSON("gula_checklist_estado", estadoNube)
    seguir()
  })
  raiz.appendChild(caja)
}

function estadoGuardado() {
  return leerJSON("gula_checklist_estado", null)
}

async function arrancar() {
  const id = new URLSearchParams(window.location.search).get("evento")
  if (id) {
    try {
      const estado = await cargarEventoNube(id)
      if (estado) {
        estado.eventoNubeId = id
        const local = estadoGuardado()
        // Solo se pregunta si es EL MISMO evento: abrir el link de otro evento distinto
        // no pisa nada de este, y preguntar ahí sería ruido.
        const mismoEvento = local && (local.eventoNubeId === id
          || (local.nombreEvento && local.nombreEvento === estado.nombreEvento))
        if (mismoEvento && marcasDe(local) > marcasDe(estado)) {
          preguntarAntesDePisar(id, estado, local, montar)
          return
        }
        guardarJSON("gula_checklist_estado", estado)
      } else {
        // El link es válido pero ahí no hay nada: no se puede seguir como si nada
        avisarEventoNoEncontrado(id, false)
        return
      }
    } catch (e) {
      avisarEventoNoEncontrado(id, true)
      return
    }
  }
  montar()
}

function montar() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <RedDeSeguridad><Acceso /></RedDeSeguridad>
    </StrictMode>,
  )
}

if (!desviado) arrancar()

// El service worker hace que la app abra sin cobertura (ver public/sw.js). Se registra
// DESPUÉS de pintar para no retrasar el arranque, y si el navegador no lo soporta o
// falla, la app funciona igual que siempre — solo pierde el modo sin conexión.
// El service worker vive en la RAÍZ, no en esta carpeta: desde ahí cubre las dos apps
// con una sola caché, y es él quien decide a qué documento se vuelve sin cobertura
// según la dirección (ver public/sw.js).
if (!desviado && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("../sw.js", window.location.href), { scope: "../" })
      .catch(() => {})
  })
}
