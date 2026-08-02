// ─── ADJUNTAR UN ARCHIVO DESDE EL FORMULARIO ───────────────────────────────────
// Sube el menú a imprimir o la imagen de las etiquetas. En el móvil, "Hacer foto"
// abre la cámara directamente, que es como se va a usar el 90% de las veces.
//
// Todo el trabajo sucio (encoger la foto, ver si cabe, decir por qué no) vive en
// archivos.js. Aquí solo se enseña en qué estado está.
import { useState, useRef } from "react";
import { prepararArchivo, motivoEnPalabras, pesoEnPalabras } from "./archivos.js";

export default function CampoArchivo({ etiqueta, archivo, onCambio }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const refSubir = useRef(null);
  const refFoto = useRef(null);

  const coger = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // para poder elegir el mismo archivo otra vez
    if (!file) return;
    setError(""); setCargando(true);
    const r = await prepararArchivo(file);
    setCargando(false);
    if (!r.ok) { setError(motivoEnPalabras(r.motivo)); return; }
    onCambio(r.archivo);
  };

  return (
    <div className="form-archivo">
      <span className="form-archivo-etiqueta">{etiqueta}</span>

      {archivo && (
        <div className="form-archivo-puesto">
          {/^image\//.test(archivo.tipo)
            ? <img src={archivo.datos} alt="" className="form-archivo-miniatura" />
            : <span className="form-archivo-icono">PDF</span>}
          <span className="form-archivo-nombre">
            {archivo.nombre}
            <em>{pesoEnPalabras(archivo.peso)}</em>
          </span>
          <button className="form-archivo-quitar" onClick={() => { onCambio(null); setError(""); }}>Quitar</button>
        </div>
      )}

      {!archivo && (
        <div className="form-archivo-botones">
          <button className="form-btn-atras" onClick={() => refSubir.current && refSubir.current.click()} disabled={cargando}>
            {cargando ? "Preparando..." : "Subir archivo"}
          </button>
          <button className="form-btn-atras" onClick={() => refFoto.current && refFoto.current.click()} disabled={cargando}>
            Hacer foto
          </button>
        </div>
      )}

      {/* Dos entradas: una acepta cualquier cosa y la otra abre la cámara de atrás */}
      <input ref={refSubir} type="file" accept="image/*,application/pdf" onChange={coger} hidden />
      <input ref={refFoto} type="file" accept="image/*" capture="environment" onChange={coger} hidden />

      {error && <p className="form-error">{error}</p>}
      {!archivo && !error && (
        <p className="form-nota">Las fotos se encogen aquí mismo, así que se manda rápido aunque haya poca cobertura.</p>
      )}
    </div>
  );
}
