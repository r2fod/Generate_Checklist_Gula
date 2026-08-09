// ─── PUERTA DE ACCESO DE LA CHECKLIST ──────────────────────────────────────────
// La puerta de sesión (compartida por las tres apps) montando la checklist. Existe
// como archivo propio para que PuertaSesion.jsx no tenga que importar App: el
// calendario y el formulario usan la misma puerta sin cargar la checklist entera.
import PuertaSesion from "./PuertaSesion.jsx";
import App from "./App.jsx";

export default function Acceso() {
  return <PuertaSesion Contenido={App} />;
}
