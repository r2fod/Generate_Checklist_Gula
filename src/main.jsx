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
  let tema = null;
  try { const g = localStorage.getItem("gula_tema"); if (g === "claro" || g === "oscuro") tema = g; }
  catch (e) { /* localStorage no disponible */ }
  if (!tema) tema = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  document.documentElement.dataset.tema = tema;
}
aplicarTemaInicial()

async function arrancar() {
  const id = new URLSearchParams(window.location.search).get("evento")
  if (id) {
    try {
      const estado = await cargarEventoNube(id)
      if (estado) {
        estado.eventoNubeId = id
        localStorage.setItem("gula_checklist_estado", JSON.stringify(estado))
      }
    } catch (e) { /* sin conexión o evento borrado: se sigue con lo guardado en local */ }
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Acceso />
    </StrictMode>,
  )
}

arrancar()
