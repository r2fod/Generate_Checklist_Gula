// ─── PUERTA DE ACCESO DE LA CHECKLIST ──────────────────────────────────────────
// La puerta de sesión (compartida por las tres apps) montando la checklist. Existe
// como archivo propio para que PuertaSesion.jsx no tenga que importar App: el
// calendario y el formulario usan la misma puerta sin cargar la checklist entera.
//
// App con React.lazy y no con un import normal: aunque PuertaSesion solo la RENDERIZA
// después del login, un import estático la mete igual en el mismo trozo que el propio
// formulario de acceso — quien todavía no ha entrado se descarga y analiza los 6.600
// líneas de App.jsx (con el asistente, objetivos, paella, los iconos...) solo para ver
// dos campos y un botón. Con lazy, ese trozo se pide aparte y solo cuando hace falta:
// al entrar, o de entrada si el enlace no pide login (evento suelto). PuertaSesion.jsx
// ya envuelve <Contenido> en Suspense, así que esto no cambia nada visualmente.
import React from "react";
import PuertaSesion from "./PuertaSesion.jsx";

const App = React.lazy(() => import("./App.jsx"));

export default function Acceso() {
  return <PuertaSesion Contenido={App} />;
}
