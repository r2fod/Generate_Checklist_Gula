// ─── EL RESPALDO MIENTRAS SE DESCARGA UNA PANTALLA ────────────────────────────
// Las pantallas gordas (Modo carga, el calendario, la bandeja de la oficina) llegan por
// `import()` perezoso: quien no las abre no se las descarga. El precio es que la primera
// vez hay un instante de espera, y ese instante no puede ser una pantalla en blanco —
// en un móvil con la cobertura de una finca, en blanco parece que la app se ha caído.
//
// Va con estilos EN LÍNEA a propósito, y no con clases: las clases de esas pantallas
// viajan DENTRO del trozo que se está descargando, así que mientras carga todavía no
// existen y el respaldo saldría sin colocar, pegado a la esquina de arriba.
export default function CargandoPanel({ texto = "Abriendo…" }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg-main, #fff)", color: "var(--text-muted, #666)",
      }}
      role="status"
      aria-live="polite"
    >{texto}</div>
  );
}
