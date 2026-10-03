import { memo, useState, useRef, useEffect } from "react";
import { Tag, Asterisk, Pencil, X, Hourglass } from "lucide-react";
import { IconoItem } from "./Iconos.jsx";
import { conCortes } from "./cortes.jsx";
import { esItemDeAlquiler, bateaSizeDe, cajaSizeDe, plural, envaseSegunCantidad } from "../checklist-format.js";

// ─── UNA FILA DE LA LISTA ──────────────────────────────────────────────────────
// Está fuera del componente grande y envuelta en React.memo por una razón medida: con
// 162 items, cada tecla que se pulsaba en CUALQUIER campo (el nombre del evento, la
// ubicación, las notas) repintaba las 162 filas aunque ninguna cambiara. En un móvil
// de gama media eran 92 ms por letra. Así solo se repinta la fila cuyo dato ha cambiado.
//
// Los manejadores llegan en una referencia que nunca cambia de identidad (accionesRef):
// si se pasaran como funciones sueltas se crearían nuevas en cada render y la
// memoización no serviría de nada.
const FilaItem = memo(function FilaItem({
  categoria, label, labelOriginal, displayQty, manualIdx, esAlquilerManual, sufijo, unidadManual = false, pendiente,
  editado, renombrado, editando, nombreTemporal, alquilerTemporal, acciones, soloMarcar = false,
}) {
  const alq = esItemDeAlquiler(label, esAlquilerManual);
  const keyId = `${categoria}::${labelOriginal ?? label}`;
  const esItemManual = manualIdx !== undefined;

  // ─── La cantidad se escribe en local y se confirma con una pausa ───────────
  // Cada tecla escribía en el estado del evento entero: eso reconstruye la checklist
  // (150 y pico filas), la vuelve a guardar y programa la subida a la nube. Medido:
  // unos 100 ms por pulsación, que escribiendo rápido se nota y se comen letras.
  //
  // Ahora lo que se teclea vive AQUÍ mientras dura, y sube al evento cuando se para de
  // escribir (o al salir del campo). Lo de fuera no cambia: la cantidad acaba en el
  // mismo sitio, marca el item para revisar igual y se sincroniza igual.
  const [tecleando, setTecleando] = useState(null);
  const temporizadorRef = useRef(null);
  // Mientras no se esté tecleando manda lo que venga de fuera: así un cambio de otro
  // dispositivo (o un recálculo) se ve al momento, como hasta ahora.
  const qty = tecleando ?? displayQty;
  const confirmar = (valor) => {
    clearTimeout(temporizadorRef.current);
    acciones.current.editarCantidad(categoria, labelOriginal ?? label, valor);
  };
  // Al desmontar la fila (cambiar de evento, ocultar el item) no se puede perder lo
  // último tecleado: se confirma antes de irse.
  useEffect(() => () => {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
  }, []);

  // Nº de bateas recalculado siempre en vivo a partir de lo que se esté mostrando
  // (aunque la cantidad se edite a mano), no de un texto fijado. Sin número ("—", a
  // decidir allí) no hay envases que contar: antes salía "0 cajas de 24".
  const num = parseFloat(qty.replace(",", "."));
  const bateaSize = bateaSizeDe(label);
  const bateaCount = bateaSize && !isNaN(num) ? Math.ceil(num / bateaSize) : null;
  // Igual que las bateas, pero para bebidas que se piden en cajas (cerveza, vino, refrescos)
  const cajaSize = bateaSize ? null : cajaSizeDe(label);
  const cajaCount = cajaSize && !isNaN(num) ? Math.ceil(num / cajaSize) : null;
  // Lo que pone debajo del número. Escrita a mano, manda la de la persona (también sobre
  // las cajas y bateas que se cuentan solas); si no, las cajas/bateas en vivo o la del
  // generador, concordando con lo que haya escrito: "1 botella", "3 cajas".
  const unidad = unidadManual ? envaseSegunCantidad(sufijo, qty)
    : bateaCount !== null ? `${plural(bateaCount, "batea", "bateas")} de ${bateaSize}`
    : cajaCount !== null ? `${plural(cajaCount, "caja", "cajas")} de ${cajaSize}`
    : sufijo ? envaseSegunCantidad(sufijo, qty) : "";
  const tituloUnidad = unidadManual ? "Unidad puesta a mano. Bórrala para volver a la de la app."
    : bateaCount !== null ? `${displayQty} copas caben en estas bateas. Se recalcula solo al cambiar la cantidad.`
    : cajaCount !== null ? `${displayQty} unidades son estas cajas. Se recalcula solo al cambiar la cantidad.`
    : "Toca para cambiar la unidad";
  // Al tocar la unidad pasa a ser un campo; lo escrito vive aquí y se guarda al salir,
  // como el nombre. null = no se está editando.
  const [unidadTecleando, setUnidadTecleando] = useState(null);
  const cancelarUnidadRef = useRef(false);
  return (
    <div className={`item-row ${alq ? "is-alquiler" : ""}`}>
      {editando && !soloMarcar ? (
        <div className="item-edit-row">
          <input
            type="text"
            className="item-name-input"
            value={nombreTemporal}
            autoFocus
            onChange={e => acciones.current.setNombreTemporal(e.target.value)}
            onBlur={() => acciones.current.confirmarEdicion(categoria, labelOriginal ?? label, manualIdx, label, alquilerTemporal)}
            onKeyDown={e => {
              if (e.key === "Enter") e.target.blur();
              if (e.key === "Escape") { acciones.current.setNombreTemporal(label); acciones.current.setAlquilerTemporal(esAlquilerManual); e.target.blur(); }
            }}
          />
          <label className="item-edit-alquiler-check" title="Marcar como alquiler proveedor (si no está incluido)">
            <input
              type="checkbox"
              checked={alquilerTemporal}
              onMouseDown={e => e.preventDefault()}
              onChange={e => acciones.current.setAlquilerTemporal(e.target.checked)}
            />
            <Tag size={12} /> Alquiler
          </label>
        </div>
      ) : (
        <div className="item-name">
          <span className="item-name-lead">
            <IconoItem label={label} />
            <span className="item-label-text">
              {conCortes(label)}
              {(editado || renombrado) && <span title={renombrado ? "Nombre corregido a mano" : "Cantidad editada a mano"} className="item-edit-flag"><Asterisk size={11} /></span>}
              {alq && <span className="tag-alquiler"><Tag size={10} /> ALQUILER</span>}
              {/* A medias: falta parte por llegar (se apunta en Modo carga · Prep.). Aquí
                  también, para que quien mira la lista no lo dé por preparado. */}
              {pendiente && (
                <span className="tag-pendiente" title={`Faltan ${pendiente.faltan}${pendiente.nota ? ` · ${pendiente.nota}` : ""}. Se apunta en Modo carga.`}>
                  <Hourglass size={10} /> FALTAN {pendiente.faltan}
                </span>
              )}
            </span>
          </span>
        </div>
      )}
      {/* Cantidad, envase y ✎/✕ van juntos: si el nombre no cabe entero a su lado,
          bajan los tres a su propia línea en vez de partirse entre dos. */}
      <div className="item-controles">
      <input
        type="text"
        className="item-qty-input"
        value={qty}
        // Con el link de solo marcar la cantidad se lee pero no se toca: quien carga
        // el camión no tiene por qué cambiar QUÉ se carga, y un cambio suyo se
        // sincronizaría a todo el mundo.
        readOnly={soloMarcar}
        title={soloMarcar ? "Con este link las cantidades no se cambian" : "Click para editar la cantidad"}
        onChange={e => {
          const valor = e.target.value;
          setTecleando(valor);
          // Medio segundo sin teclear = ya está. Lo justo para no ir por detrás de los
          // dedos y lo bastante corto para que nadie note que hay un retardo.
          clearTimeout(temporizadorRef.current);
          temporizadorRef.current = setTimeout(() => confirmar(valor), 500);
          // Parpadeo verde de confirmación: se reinicia la animación en cada tecla
          e.target.classList.remove("qty-flash");
          void e.target.offsetWidth;
          e.target.classList.add("qty-flash");
        }}
        // Al salir del campo se confirma ya, sin esperar: si alguien escribe y cierra
        // la app en el mismo segundo, lo tecleado no se puede quedar por el camino.
        onBlur={e => { if (tecleando !== null) { confirmar(e.target.value); setTecleando(null); } }}
        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
        onAnimationEnd={e => e.target.classList.remove("qty-flash")}
        onFocus={e => e.target.select()}
        size={Math.max(2, qty.length)}
      />
      {/* Va DEBAJO del número, en pequeño y sin "=" (lo pidió el dueño). El "=" estaba
          para que "5" y al lado "1 caja de 24" no se leyeran como dos cantidades
          distintas; debajo del número ya se lee como lo que es: la misma cantidad
          dicha en envases. Donde el número ya son packs o botellas, el texto es la
          etiqueta de lo que se cuenta, y concuerda con él mientras se teclea. */}
      {/* Y se puede cambiar a mano en cualquier fila (lo pidió el dueño): se lee como
          texto, y al tocarlo pasa a ser un campo. Vacío = vuelve a la de la app, así las
          cajas y los packs que se cuentan solos siguen funcionando mientras nadie los
          toque. Con el link de solo marcar se lee pero no se cambia, como la cantidad.
          Sin número ("—") no hay unidad que enseñar: aparece al poner la cantidad. */}
      {unidadTecleando !== null ? (
        <input
          type="text"
          className="item-batea-info item-unidad-input"
          value={unidadTecleando}
          placeholder="unidad (vacío = la de la app)"
          aria-label={`Unidad de ${label}`}
          size={Math.max(8, unidadTecleando.length + 1)}
          autoFocus
          onFocus={e => e.target.select()}
          onChange={e => setUnidadTecleando(e.target.value)}
          onBlur={() => {
            const valor = unidadTecleando.trim();
            setUnidadTecleando(null);
            if (cancelarUnidadRef.current) { cancelarUnidadRef.current = false; return; }
            // Sin cambios no se guarda nada: tocar y salir no convierte la automática
            // en una fija que ya no seguiría a la cantidad
            if (valor === unidad.trim()) return;
            acciones.current.editarUnidad(categoria, labelOriginal ?? label, valor);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") e.target.blur();
            if (e.key === "Escape") { cancelarUnidadRef.current = true; e.target.blur(); }
          }}
        />
      ) : !unidad ? null : soloMarcar ? (
        <span className="item-batea-info" title={tituloUnidad}>{unidad}</span>
      ) : (
        <button
          type="button"
          className={`item-batea-info item-unidad-btn${unidadManual ? " es-manual" : ""}`}
          title={tituloUnidad}
          aria-label={`Unidad de ${label}: ${unidad}. Tocar para cambiarla`}
          onClick={() => setUnidadTecleando(unidad)}
        >{unidad}</button>
      )}
      {/* Renombrar y quitar items cambian la checklist para todo el mundo: con el
          link de solo marcar no se ofrecen. */}
      {!soloMarcar && (
        <div className="item-actions">
          <button
            className="item-action-btn"
            onClick={() => acciones.current.empezarEdicion(keyId, label, esAlquilerManual)}
            title="Editar el nombre / marcar alquiler proveedor"
            aria-label={`Editar ${label}`}
          ><Pencil size={13} /></button>
          <button
            className="item-action-btn item-action-borrar"
            onClick={() => esItemManual ? acciones.current.quitarManual(manualIdx) : acciones.current.ocultar(categoria, labelOriginal ?? label)}
            title="Quitar de la lista"
            aria-label={`Quitar ${label}`}
          ><X size={14} /></button>
        </div>
      )}
      </div>
    </div>
  );
});

export default FilaItem;
