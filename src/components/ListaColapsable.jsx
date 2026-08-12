import { useState } from "react";

// Lista que muestra solo unos pocos elementos y despliega el resto bajo demanda,
// para que "Eventos guardados" y "Plantillas" no crezcan sin fin cuando hay muchos.
export default function ListaColapsable({ nombres, limite = 5, children }) {
  const [verTodos, setVerTodos] = useState(false);
  // El orden lo decide quien usa la lista (nombres ya viene ordenado).
  const visibles = verTodos ? nombres : nombres.slice(0, limite);
  return (
    <div className="plantillas-lista">
      {visibles.map(children)}
      {nombres.length > limite && (
        <button className="ver-todos-btn" onClick={() => setVerTodos(v => !v)}>
          {verTodos ? "▲ Ver menos" : `▼ Ver todos (${nombres.length})`}
        </button>
      )}
    </div>
  );
}
