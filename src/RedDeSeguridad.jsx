// ─── RED DE SEGURIDAD ─────────────────────────────────────────────────────────
// Si algo revienta al dibujar, React desmonta TODO y deja la pantalla en blanco. Y
// como el estado del evento vive en este navegador, recargar vuelve a reventar: se
// queda uno fuera sin salida, con el camión a medio cargar y sin forma de mirar la
// lista. Un estado corrupto basta para llegar ahí (un ?c= mal formado, un formato
// viejo, un campo que llegó de la nube con otro tipo).
//
// Esto no arregla el fallo: lo convierte en algo de lo que se puede salir. Enseña qué
// pasó, deja DESCARGAR lo que hubiera guardado (que es el trabajo hecho) y ofrece
// empezar de cero solo después de haber podido guardarlo.
import { Component } from "react";
import { leerTexto, borrar } from "./almacen.js";
import { apunta, leerDiario, comoTexto } from "./diario.js";

const CLAVES = ["gula_checklist_estado", "gula_eventos_guardados", "gula_plantillas"];

function descargarTodo() {
  const datos = {};
  for (const k of CLAVES) {
    datos[k] = leerTexto(k, null);
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `gula-copia-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default class RedDeSeguridad extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // A la consola también: si alguien está mirando con el móvil enchufado, ahí está
    // la pila entera, que en pantalla no cabe ni sirve de nada.
    console.error("La app ha fallado al dibujar:", error, info);
    // Y al diario del navegador, ya limpio de nombres: es lo único que sigue existiendo
    // mañana, cuando quien lo sufrió lo cuente de memoria.
    apunta("pantalla-rota", { motivo: String((error && error.message) || error) });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="link-roto">
        <h1>La app ha fallado</h1>
        <p>Algo ha salido mal al dibujar la pantalla. Lo que tenías guardado <strong>sigue en este
          dispositivo</strong>: descárgalo antes de tocar nada.</p>
        <p className="link-roto-id">{String(this.state.error && this.state.error.message || this.state.error).slice(0, 160)}</p>
        <button type="button" onClick={descargarTodo}>Descargar lo que hay guardado</button>
        <button type="button" onClick={() => window.location.reload()}>Volver a intentarlo</button>
        <button
          type="button"
          onClick={() => {
            // Solo el evento abierto: los eventos guardados y las plantillas NO se
            // tocan, que es donde está el trabajo de verdad. Casi siempre lo que está
            // corrupto es el estado suelto, y con esto se arranca limpio sin perder nada.
            borrar("gula_checklist_estado");
            window.location.href = window.location.origin + window.location.pathname;
          }}
        >Empezar de cero (sin borrar los eventos guardados)</button>
        {/* El diario de este navegador: las últimas cosas que fueron mal, con su hora y
            SIN un solo nombre (ver src/diario.js). Se copia de un toque para pegarlo en
            el chat del equipo, que es como llega de verdad un fallo a quien lo arregla. */}
        <button
          type="button"
          onClick={() => {
            const texto = comoTexto(leerDiario());
            if (navigator.clipboard) navigator.clipboard.writeText(texto).catch(() => {});
            window.alert(texto);
          }}
        >Ver y copiar los últimos fallos (sin datos de nadie)</button>
        <p className="link-roto-nota">Si vuelve a fallar después de empezar de cero, manda el fichero
          descargado y el texto de arriba: con eso se sabe qué lo rompió.</p>
      </div>
    );
  }
}
