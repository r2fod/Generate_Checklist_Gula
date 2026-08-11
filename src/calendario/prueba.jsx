// ─── BANCO DE PRUEBAS DEL CALENDARIO ──────────────────────────────────────────
// El calendario de verdad pide sesión de equipo, así que la batería no podía llegar a
// ver la rejilla: se quedaba en el login. Esta página monta el MISMO componente con
// unos apuntes de mentira, sin nube y sin login, para poder comprobar que se pinta, que
// no desborda y que los avisos salen.
//
// Los datos son inventados a propósito: esto se compila y se publica, y en el
// repositorio no entra el nombre de ningún cliente.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "./calendario.css";
import Calendario from "./Calendario.jsx";
import Equipo from "./Equipo.jsx";
import { saneaLista, saneaEquipo } from "./apuntes.js";

const HOY = new Date();
const dia = (n) => {
  const f = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + n);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
};

const DEMO = [
  { fecha: dia(2), titulo: "Boda de prueba uno", tipo: "boda", pax: 120, sitio: "Finca de ejemplo" },
  { fecha: dia(9), titulo: "Comunión de prueba", tipo: "comunion", pax: 40 },
  { fecha: dia(9), titulo: "Rodaje de prueba", tipo: "produccion", pax: 25 },
  { fecha: dia(16), titulo: "Cumpleaños de prueba", tipo: "cumpleanos" },
  { fecha: dia(20), titulo: "Corporativo de prueba", tipo: "corporativo", pax: 80 },
  { fecha: dia(1), hasta: dia(6), titulo: "Fulanita", tipo: "vacaciones" },
  { fecha: dia(4), titulo: "Recoger camión", tipo: "recogida" },
  { fecha: dia(12), titulo: "Cerrado", tipo: "cerrado" },
  // Cae encima del día que ya tiene dos eventos (dia 9): así el banco enseña el caso
  // que de verdad importa —dos eventos y media plantilla fuera— y no solo el bonito.
  { fecha: dia(7), hasta: dia(10), titulo: "Vacas Mengano", tipo: "vacaciones" },
  { fecha: dia(9), titulo: "Libra Zutana", tipo: "vacaciones" },
];

// Nombres inventados, como los apuntes: esto se compila y se publica.
const EQUIPO_DEMO = [
  { nombre: "Fulanita", apodos: ["fula"] },
  { nombre: "Menganito", apodos: ["mengano"] },
  { nombre: "Zutana", apodos: [] },
  { nombre: "Perengano", apodos: ["peren"] },
];

function Banco() {
  const [apuntes, setApuntes] = useState(() => saneaLista(DEMO));
  const [equipo, setEquipo] = useState(() => saneaEquipo(EQUIPO_DEMO));
  const guardar = (a) => setApuntes(p => saneaLista([...p.filter(x => x.id !== a.id), a]));
  const borrar = (id) => setApuntes(p => p.filter(x => x.id !== id));
  return (
    <div className="app-wrapper">
      <Equipo equipo={equipo} onCambiar={(e) => setEquipo(saneaEquipo(e))} />
      <Calendario apuntes={apuntes} equipo={equipo} onGuardar={guardar} onBorrar={borrar} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><Banco /></StrictMode>);
