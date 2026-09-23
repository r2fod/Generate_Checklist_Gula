import { useState } from "react";
import { saneaLista } from "./apuntes.js";

// Intenta sacar una fecha ISO (YYYY-MM-DD) de distintos formatos de Excel/Sheets
function extraerFecha(str) {
  if (!str) return null;
  // Ya viene en ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Formato español DD/MM/YYYY o DD-MM-YYYY
  const partesES = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (partesES) {
    return `${partesES[3]}-${partesES[2].padStart(2, '0')}-${partesES[1].padStart(2, '0')}`;
  }
  return null;
}

function deducirTipo(titulo, tipoExplicito = "") {
  const txt = (titulo + " " + tipoExplicito).toLowerCase();
  if (txt.includes("boda")) return "boda";
  if (txt.includes("comunion") || txt.includes("comunión")) return "comunion";
  if (txt.includes("cumpleanos") || txt.includes("cumpleaños")) return "cumpleanos";
  if (txt.includes("rodaje") || txt.includes("produccion") || txt.includes("producción") || txt.includes("shooting")) return "produccion";
  if (txt.includes("vacaciones") || txt.includes("descanso")) return "vacaciones";
  if (txt.includes("recogida") || txt.includes("devolucion") || txt.includes("devolución")) return "recogida";
  if (txt.includes("cerrado") || txt.includes("festivo")) return "cerrado";
  if (txt.includes("reunion") || txt.includes("reunión") || txt.includes("visita") || txt.includes("tarea") || txt.includes("cata") || txt.includes("prueba") || txt.includes("visu")) return "tarea";
  if (txt.includes("evento") || txt.includes("corporativo") || txt.includes("empresa") || txt.includes("presentacion") || txt.includes("presentación")) return "corporativo";
  
  return "boda"; // Por defecto
}

function parsearTSV(texto) {
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (lineas.length < 1) return [];

  const cabeceras = lineas[0].toLowerCase().split("\t");
  
  let idxFecha = cabeceras.findIndex(c => c.includes("fecha") || c.includes("dia") || c.includes("día") || c.includes("date"));
  let idxTitulo = cabeceras.findIndex(c => c.includes("titulo") || c.includes("título") || c.includes("nombre") || c.includes("evento"));
  let idxPax = cabeceras.findIndex(c => c.includes("pax") || c.includes("comensales") || c.includes("personas"));
  let idxSitio = cabeceras.findIndex(c => c.includes("sitio") || c.includes("lugar") || c.includes("finca") || c.includes("espacio"));
  let idxTipo = cabeceras.findIndex(c => c === "tipo" || c.includes("categoria"));

  let datos = lineas;
  if (idxFecha === -1 || idxTitulo === -1) {
    idxFecha = 0;
    idxTitulo = 1;
    if (!extraerFecha(lineas[0].split("\t")[0])) {
      datos = lineas.slice(1);
    }
  } else {
    datos = lineas.slice(1);
  }

  const nuevos = [];
  for (const linea of datos) {
    const celdas = linea.split("\t");
    const fecha = extraerFecha(celdas[idxFecha]);
    const titulo = celdas[idxTitulo] ? celdas[idxTitulo].trim() : "";
    
    if (!fecha || !titulo) continue;
    
    const tipoExpl = idxTipo !== -1 && celdas[idxTipo] ? celdas[idxTipo].trim() : "";
    const paxStr = idxPax !== -1 && celdas[idxPax] ? celdas[idxPax].trim() : "";
    const sitio = idxSitio !== -1 && celdas[idxSitio] ? celdas[idxSitio].trim() : "";
    
    const apunte = {
      fecha,
      titulo,
      tipo: deducirTipo(titulo, tipoExpl)
    };
    
    const pax = parseInt(paxStr, 10);
    if (!isNaN(pax) && pax > 0) apunte.pax = pax;
    if (sitio) apunte.sitio = sitio;
    
    nuevos.push(apunte);
  }
  return nuevos;
}

export default function Traer({ apuntes, onTraer }) {
  const [abierto, setAbierto] = useState(apuntes.length === 0);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  const traer = () => {
    setError("");
    setResultado(null);
    let lista = [];
    
    try {
      if (texto.trim().startsWith("[")) {
        lista = saneaLista(JSON.parse(texto));
      } else {
        lista = saneaLista(parsearTSV(texto));
      }
    } catch (e) {
      return setError("No se ha podido leer el texto. Asegúrate de copiar las columnas del Excel o pegar un JSON válido.");
    }
    
    if (!lista.length) {
      return setError("No he encontrado ningún apunte válido. Cada fila necesita al menos fecha y título.");
    }
    
    const nuevos = lista.filter(n => 
      !apuntes.some(a => a.fecha === n.fecha && a.titulo.toLowerCase().trim() === n.titulo.toLowerCase().trim())
    );
    
    if (nuevos.length === 0) {
      return setResultado("No se ha añadido nada. Todos los eventos ya estaban en el calendario.");
    }
    
    onTraer([...apuntes, ...nuevos]);
    setResultado(`Se han añadido ${nuevos.length} eventos nuevos inteligentemente.`);
    setTexto("");
  };

  if (!abierto) {
    return (
      <div className="cal-traer cal-traer-cerrado" style={{ textAlign: "center", padding: "10px" }}>
        <button className="btn btn-outline" onClick={() => setAbierto(true)}>
          Importar desde Excel / Google Sheets
        </button>
      </div>
    );
  }

  return (
    <div className="cal-traer">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <strong>Importar desde Google Sheets o Excel</strong>
        {apuntes.length > 0 && (
          <button className="btn" style={{ padding: "2px 8px", fontSize: "0.85em" }} onClick={() => { setAbierto(false); setResultado(null); setError(""); }}>
            Cerrar
          </button>
        )}
      </div>
      <span style={{ display: "block", marginBottom: "10px" }}>
        Copia las filas de tu hoja (incluyendo cabeceras si las hay) y pégalas aquí. El sistema descartará los que ya existen y deducirá inteligentemente qué tipo de evento es (bodas, reuniones, vacaciones...). También acepta formato JSON.
      </span>
      <textarea
        className="cal-traer-texto"
        rows={6}
        value={texto}
        onChange={e => { setTexto(e.target.value); setError(""); setResultado(null); }}
        placeholder="Pega aquí las filas copiadas..."
      />
      {error && <span className="cal-traer-error" style={{ display: "block", marginTop: "5px" }}>{error}</span>}
      {resultado && <span className="cal-traer-exito" style={{ color: 'green', fontSize: '0.9em', display: 'block', marginTop: "5px" }}>{resultado}</span>}
      <button className="btn btn-green" style={{ marginTop: "10px" }} disabled={!texto.trim()} onClick={traer}>
        Integrar apuntes
      </button>
    </div>
  );
}
