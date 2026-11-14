export default function BuscarMaterial({ filtro, setFiltro, className = "search-input-main", placeholder = "Buscar un material...", etiqueta = "Buscar un material" }) {
  return <input type="search" className={className} placeholder={placeholder} aria-label={etiqueta}
    value={filtro} onChange={e => setFiltro(e.target.value)} />;
}

export function SinMateriales({ filtro, setFiltro }) {
  return (
    <div className="config-card plantillas-vacio busqueda-material-vacia">
      <p role="status">No se encontraron materiales para «<strong>{filtro}</strong>»</p>
      <button type="button" className="btn btn-outline" onClick={() => setFiltro("")}>Limpiar búsqueda</button>
    </div>
  );
}
