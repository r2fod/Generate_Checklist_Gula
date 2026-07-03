import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { cargarEventoNube } from './nube.js'
import App from './App.jsx'

// Si el link es de la nube (?evento=id) se descarga la checklist ANTES de montar
// la app y se deja en localStorage: así el arranque síncrono de App la restaura
// igual que cualquier estado guardado. Se mantiene el parámetro en la URL para
// que recargar la página vuelva a traer la última versión.
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
      <App />
    </StrictMode>,
  )
}

arrancar()
