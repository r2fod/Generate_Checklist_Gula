import { X, Tag, Truck, Package, ShoppingCart } from "lucide-react";
import {
  EVENTOS, PALABRAS_ALQUILER, fmtCantidadCompleta, quitarItemsSinCantidad,
  fmtLogistica, totalLogistica, fmtRecogidas, fmtCompras,
} from "../checklist-format.js";
import { IconoCategoria, infoCategoria } from "./Iconos.jsx";

export default function ModalVistaPrevia({ checklist: checklistCompleta, evtKey, pax, ninos, meta = {}, onClose, sinCerrar = false }) {
  const checklist = quitarItemsSinCantidad(checklistCompleta);
  // Las columnas Sale/Vuelve/Roturas solo aparecen si hay algo marcado. Antes salían
  // siempre y en el móvil se comían 78px de ancho y 68 de alto (con las cabeceras
  // giradas en vertical para caber), para quedarse vacías: lo normal es mirar la hoja
  // ANTES del evento, cuando aún no se ha marcado nada. El Word y el PDF sí las llevan
  // siempre, que ahí sirven para ir marcando a mano sobre el papel.
  const algo = (o) => Object.values(o || {}).some(v => v !== "" && v !== false && v !== undefined);
  const hayMarcas = algo(meta.preparados) || algo(meta.checkeados) || algo(meta.vueltos) || algo(meta.roturas);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const fechaEventoFmt = meta.fechaEvento ? new Date(meta.fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
  // Todo lo que NO es nuestro, junto y arriba. Estaba marcado fila a fila, pero repartido
  // entre catorce categorías: para saber qué hay que devolver había que recorrer la hoja
  // entera. Es lo primero que necesita quien lleva el servicio, porque de eso responde
  // cuando acaba el evento.
  const alquileres = checklist.flatMap(cat => cat.items
    .filter(([label, , , , esAlquilerManual]) =>
      esAlquilerManual || PALABRAS_ALQUILER.some(pl => String(label).toLowerCase().includes(pl)))
    .map(([label, qty, , , , sufijo]) => ({
      label,
      cantidad: fmtCantidadCompleta(label, qty && qty.u ? qty.u : qty, sufijo),
    })));
  return (
    <div className={`preview-overlay ${sinCerrar ? "is-pantalla" : ""}`} onClick={sinCerrar ? undefined : onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <div>
            <div className="preview-header-title">{meta.nombreEvento || "Checklist de evento"}</div>
            <div className="preview-header-subtitle">
              {EVENTOS[evtKey]?.label} · {pax} pax{ninos > 0 ? ` · ${ninos} niños` : ""} · {fechaEventoFmt || fecha}
              {meta.horaInicio ? ` · ${meta.horaInicio}h` : ""}
              {meta.ubicacion ? ` · ${meta.ubicacion}` : ""}
            </div>
            {fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) && (
              <div className="preview-header-subtitle">
                <Truck size={14} /> Logística: {fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)}
                {totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) > 0 && ` — Total ${String(totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)).replace(".", ",")}€`}
              </div>
            )}
            {fmtRecogidas(meta.recogidas) && (
              <div className="preview-header-subtitle"><Package size={14} /> Recogidas: {fmtRecogidas(meta.recogidas)}</div>
            )}
            {fmtCompras(meta.compras) && (
              <div className="preview-header-subtitle"><ShoppingCart size={14} /> Compras: {fmtCompras(meta.compras)}</div>
            )}
          </div>
          {!sinCerrar && (
            <button className="preview-close-btn" onClick={onClose} aria-label="Cerrar vista previa" title="Cerrar"><X size={14} /></button>
          )}
        </div>
        <div className="preview-body">
          {alquileres.length > 0 && (
            <div className="preview-alquileres">
              <div className="preview-alquileres-titulo">
                <Tag size={14} /> No es nuestro — hay que devolverlo ({alquileres.length})
              </div>
              <ul className="preview-alquileres-lista">
                {alquileres.map((a, i) => (
                  <li key={i}><span>{a.label}</span><strong>{a.cantidad}</strong></li>
                ))}
              </ul>
              {fmtRecogidas(meta.recogidas) && (
                <div className="preview-alquileres-fechas">
                  <Package size={13} /> {fmtRecogidas(meta.recogidas)}
                </div>
              )}
            </div>
          )}
          {checklist.map(cat => (
            <div className="preview-category" key={cat.nombre}>
              <div className="preview-category-header" style={{ borderLeftColor: infoCategoria(cat.nombre).color }}>
                <span className="cat-icon-mini" style={{ background: infoCategoria(cat.nombre).color, color: infoCategoria(cat.nombre).texto }}><IconoCategoria nombre={cat.nombre} /></span>
                <span>{cat.nombre}</span>
              </div>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Cant.</th>
                      {hayMarcas && <th className="preview-check-cell">Prep.</th>}
                      {hayMarcas && <th className="preview-check-cell">Sale</th>}
                      {hayMarcas && <th className="preview-check-cell">Vuelve</th>}
                      {hayMarcas && <th className="preview-check-cell">Roturas</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map(([label, qty, , labelOriginal, esAlquilerManual, sufijo], i) => {
                      const alq = esAlquilerManual || PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                      const key = `${cat.nombre}::${labelOriginal ?? label}`;
                      return (
                        <tr key={i} className={alq ? "is-rental" : ""}>
                          <td>
                            {label}
                            {alq && <span className="preview-rental-badge">ALQUILER</span>}
                          </td>
                          <td className="preview-qty-cell">{fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</td>
                          {hayMarcas && <td className="preview-check-cell">{(meta.preparados || {})[key] ? "✓" : ""}</td>}
                          {hayMarcas && <td className="preview-check-cell">{(meta.checkeados || {})[key] ? "✓" : ""}</td>}
                          {hayMarcas && <td className="preview-check-cell">{(meta.vueltos || {})[key] ? "✓" : ""}</td>}
                          {hayMarcas && <td className="preview-check-cell">{(meta.roturas || {})[key] || ""}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div className="preview-notes">
            <strong>Notas</strong>
            {meta.notasEvento && <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontSize: "0.88rem" }}>{meta.notasEvento}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
