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
import { Eye, Check, X } from "lucide-react";
import "../index.css";
import "./calendario.css";
import Calendario from "./Calendario.jsx";
import Equipo from "./Equipo.jsx";
import Compartir from "./Compartir.jsx";
import Ratios from "./Ratios.jsx";
import Traer from "./Traer.jsx";
import { saneaLista, saneaEquipo, aISO, checklistsPorCrear } from "./apuntes.js";
import { leerRatios, ponRatios } from "../personal.js";

const HOY = new Date();
// aISO y no una copia a mano: eran la misma cuenta escrita dos veces, y la de aquí no
// se habría enterado si la de verdad cambiara.
const dia = (n) => aISO(new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + n));

const DEMO = [
  { fecha: dia(2), titulo: "Boda de prueba uno", tipo: "boda", pax: 120, sitio: "Finca de ejemplo", hora: "14:00" },
  { fecha: dia(9), titulo: "Comunión de prueba", tipo: "comunion", pax: 40, hora: "13:30" },
  // Tercer evento el mismo día: el caso que de verdad importa, como el 19 de septiembre
  { fecha: dia(9), titulo: "Boda de prueba tres", tipo: "boda", pax: 180, sitio: "Otro sitio", hora: "21:00" },
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
  // Una tarea: ni genera checklist ni cuenta para el aviso de dos eventos el mismo día,
  // pero tiene fecha y se olvida igual que lo demás.
  { fecha: dia(5), titulo: "Prueba de menú de prueba", tipo: "tarea" },
];

// Nombres inventados, como los apuntes: esto se compila y se publica.
const EQUIPO_DEMO = [
  { nombre: "Fulanita", apodos: ["fula"] },
  { nombre: "Menganito", apodos: ["mengano"] },
  { nombre: "Zutana", apodos: [] },
  { nombre: "Perengano", apodos: ["peren"] },
];

// Códigos inventados con la pinta de los de verdad (12 caracteres del mismo alfabeto),
// para poder comprobar cómo se ve el panel de compartir y que los enlaces salen bien
// formados. No abren nada: aquí no hay nube.
const CODIGOS_DEMO = { codigo: "kq7mfp2xd4rj", ver: "wz3nbh8tsy6c" };

function Banco() {
  // Con "?vacio=1" se arranca sin nada, que es como se ve el cuadro de pegar y como se
  // prueba un enlace de importación que llega a un calendario recién estrenado.
  const arrancaVacio = new URLSearchParams(window.location.search).get("vacio");
  // Con "?solover=1" se monta como lo ve quien entra por el enlace de mirar: sin traer,
  // sin equipo y sin poder tocar un apunte. Es la mitad de la función de compartir, y
  // sin esto la batería no podía llegar a ella (va detrás de un código de Firestore).
  const soloVer = Boolean(new URLSearchParams(window.location.search).get("solover"));
  const [apuntes, setApuntes] = useState(() => (arrancaVacio ? [] : saneaLista(DEMO)));
  const [equipo, setEquipo] = useState(() => saneaEquipo(EQUIPO_DEMO));
  const [ratios, setRatios] = useState(() => leerRatios());
  // Con "?promover=1" se monta lo que hace la checklist al abrir el calendario: crea las
  // de los eventos que ya están cerca y avisa de cuáles. Aquella va detrás del login del
  // equipo, así que la batería no puede llegar; esto deja probado el aviso y su
  // responsive con los MISMOS datos y la MISMA función que usa App.
  const promover = Boolean(new URLSearchParams(window.location.search).get("promover"));
  const [creadas, setCreadas] = useState(() => {
    if (!promover) return [];
    // Una ya existe en el archivo: comprueba que NO se cuenta como creada, que es la
    // regla que impide pisar una checklist con trabajo hecho.
    const archivo = { "Boda de prueba uno": { fechaEvento: "x" } };
    return checklistsPorCrear(saneaLista(DEMO), archivo).enlaces.filter(e => e.nueva).map(e => e.nombre);
  });
  const guardar = (a) => setApuntes(p => saneaLista([...p.filter(x => x.id !== a.id), a]));
  const borrar = (id) => setApuntes(p => p.filter(x => x.id !== id));

  const dentro = soloVer
    ? (
      <>
        <div className="cal-aviso-lectura">
          <Eye size={15} aria-hidden="true" />
          <span>Estás viendo el calendario en <b>solo lectura</b>. Los cambios los hace el equipo.</span>
        </div>
        <Calendario apuntes={apuntes} equipo={equipo} soloVer />
      </>
    )
    : (
      <>
        {creadas.length > 0 && (
          <div className="cal-creadas">
            <Check size={15} aria-hidden="true" />
            <span>
              {creadas.length === 1
                ? <>He creado la checklist de <b>{creadas[0]}</b>, que ya está cerca.</>
                : <>He creado <b>{creadas.length} checklists</b> de eventos que ya están cerca: {creadas.join(", ")}.</>}
              {" "}Están en tu archivo, listas para que la oficina les cuelgue los datos del formulario.
            </span>
            <button type="button" className="cal-creadas-cerrar" onClick={() => setCreadas([])} aria-label="Cerrar el aviso">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        <Traer apuntes={apuntes} onTraer={(lista) => setApuntes(saneaLista(lista))} />
        <Compartir codigos={CODIGOS_DEMO} href={window.location.href} />
        <Equipo equipo={equipo} onCambiar={(e) => setEquipo(saneaEquipo(e))} />
        <Ratios ratios={ratios} onCambiar={(r) => setRatios(ponRatios(r))} />
        <Calendario apuntes={apuntes} equipo={equipo} onGuardar={guardar} onBorrar={borrar} />
      </>
    );

  // Con "?pantalla=1" se monta la MISMA maquetación que usa la checklist por dentro
  // (EnChecklist.jsx): pantalla completa, barra fija arriba y el scroll dentro del
  // cuerpo. Aquella va detrás del login del equipo, así que la batería no puede llegar;
  // esto deja al menos su colocación probada a todos los anchos.
  if (new URLSearchParams(window.location.search).get("pantalla")) {
    return (
      <div className="cal-pantalla">
        <div className="cal-pantalla-barra">
          <strong>Calendario</strong>
          <button type="button" className="cal-pantalla-cerrar" aria-label="Cerrar el calendario">✕</button>
        </div>
        <div className="cal-pantalla-cuerpo">{dentro}</div>
      </div>
    );
  }

  return <div className="app-wrapper">{dentro}</div>;
}

createRoot(document.getElementById("root")).render(<StrictMode><Banco /></StrictMode>);
