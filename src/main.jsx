import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { cargarEventoNube } from './nube.js'
import Acceso from './Acceso.jsx'

// Si el link es de la nube (?evento=id) se descarga la checklist ANTES de montar
// la app y se deja en localStorage: así el arranque síncrono de App la restaura
// igual que cualquier estado guardado. Se mantiene el parámetro en la URL para
// que recargar la página vuelva a traer la última versión.
// El tema se pone en el <html> ANTES de montar React: así no hay un fogonazo de
// blanco al arrancar y la pantalla de acceso también sale en oscuro.
function aplicarTemaInicial() {
  // Mismo criterio que dentro de la app (ver temaSegunPreferencia en App.jsx): lo que
  // esté fijado a mano manda, y en automático va por hora. Se hace ANTES de montar React
  // para que no haya un fogonazo de blanco al arrancar de noche.
  let pref = "auto";
  try { const g = localStorage.getItem("gula_tema"); if (g === "claro" || g === "oscuro" || g === "auto") pref = g; }
  catch (e) { /* localStorage no disponible */ }
  const h = new Date().getHours();
  const tema = pref === "claro" || pref === "oscuro" ? pref : (h >= 20 || h < 7 ? "oscuro" : "claro");
  document.documentElement.dataset.tema = tema;
}
aplicarTemaInicial()

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

async function arrancar() {
  const id = new URLSearchParams(window.location.search).get("evento")
  if (id) {
    try {
      const estado = await cargarEventoNube(id)
      if (estado) {
        estado.eventoNubeId = id
        localStorage.setItem("gula_checklist_estado", JSON.stringify(estado))
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
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Acceso />
    </StrictMode>,
  )
}

arrancar()

// El service worker hace que la app abra sin cobertura (ver public/sw.js). Se registra
// DESPUÉS de pintar para no retrasar el arranque, y si el navegador no lo soporta o
// falla, la app funciona igual que siempre — solo pierde el modo sin conexión.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("sw.js", window.location.href), { scope: "./" })
      .catch(() => {})
  })
}
