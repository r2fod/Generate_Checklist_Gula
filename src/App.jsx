import React, { useState, useMemo } from "react";

const BATEA = { vino: 25, cava: 36, agua: 25, cubata: 25, chupito: 49 };

function bateas(units, size) {
  return Math.ceil(units / size);
}

function calcBebidas(pax, h, mesVerano, tieneCongelador) {
  const barFactor = h / 4;
  const cervezaFactor = mesVerano ? 2.0 : 1.5;
  const cerveza = Math.round((pax * cervezaFactor * barFactor) / 24) * 24;
  const vinoTotal = Math.round(pax * 0.55);
  const ratioBlanco = mesVerano ? 0.70 : 0.45;
  const vinoBlanco = Math.round(vinoTotal * ratioBlanco);
  const vinoTinto = vinoTotal - vinoBlanco;
  const refrescoTotal = Math.round(pax * 2.5 * barFactor);
  const tonica = Math.max(6, Math.round(pax * 0.15 * barFactor));
  const agua15 = Math.round(pax * 0.4);
  const redbull = h > 0 ? Math.max(12, Math.round(pax * 0.12 * barFactor)) : 0;
  const taxisHielo = tieneCongelador ? Math.max(1, Math.ceil(pax / 80)) : Math.max(2, Math.ceil(pax / 30));

  return {
    cerveza, vinoBlanco, vinoTinto, tonica, agua15, redbull,
    cocaNormal: Math.round(refrescoTotal * 0.25),
    cocaZero: Math.round(refrescoTotal * 0.25),
    fanta: Math.round(refrescoTotal * 0.2),
    sprite: Math.round(refrescoTotal * 0.1),
    nestea: Math.round(refrescoTotal * 0.1),
    aguaConGas: Math.round(pax * 0.15),
    cerveza00: Math.round(pax * 0.15),
    sinGluten: Math.round(pax * 0.2),
    taxisHielo
  };
}

function calcDestilados(pax, h) {
  const f = h / 4;
  const r = (base) => Math.max(1, Math.round(base * f));
  return {
    ginebraPremium: r(pax / 25),
    ginebraSabor: r(pax / 35),
    ron: r(pax / 30),
    ronBlanco: r(pax / 50),
    whisky: r(pax / 25),
    vodka: r(pax / 40),
    tequila: r(pax / 45),
    tequilaSabor: r(pax / 40),
    vermutRojo: r(pax / 40),
    mistela: 2,
    baileys: 1, limoncello: 1, jagger: 1, peach: 1, cremaOrujo: 1, cazalla: 1, orujoHierbas: 1
  };
}

function calcCristaleria(pax, h, dobleCopa, tieneBrindisCava, llevaEntrante) {
  const copasBarraPorPax = h > 0 ? Math.min(5, 2 + Math.max(0, h - 1)) : 0;
  const mult = dobleCopa ? 2 : 1;
  const vino = Math.round(pax * 2.2 * mult);
  const agua = Math.round(pax * 1.5 * mult);
  const cubata = Math.round(pax * copasBarraPorPax);
  const factorCava = tieneBrindisCava ? 2.0 : 1.0;
  const cavaCopas = Math.round(pax * factorCava);

  return {
    vino: { u: Math.ceil(vino / BATEA.vino) * BATEA.vino, b: bateas(vino, BATEA.vino), size: BATEA.vino },
    agua: { u: Math.ceil(agua / BATEA.agua) * BATEA.agua, b: bateas(agua, BATEA.agua), size: BATEA.agua },
    cubata: { u: Math.ceil(cubata / BATEA.cubata) * BATEA.cubata, b: bateas(cubata, BATEA.cubata), size: BATEA.cubata },
    cava: { u: Math.ceil(cavaCopas / BATEA.cava) * BATEA.cava, b: bateas(cavaCopas, BATEA.cava), size: BATEA.cava },
    chupito: llevaEntrante ? { u: Math.ceil(pax / BATEA.chupito) * BATEA.chupito, b: bateas(pax, BATEA.chupito), size: BATEA.chupito } : { u: BATEA.chupito, b: 1, size: BATEA.chupito },
    martini: { u: Math.max(20, Math.round(pax * 0.2)), b: null, size: null },
    whisky: { u: Math.max(20, Math.round(pax * 0.2)), b: null, size: null },
  };
}

function calcPaella(pax) {
  const n = Math.max(1, Math.ceil(pax / 30));
  const talla = pax <= 40 ? "pequeña" : pax <= 80 ? "mediana" : "grande";
  return { n, talla };
}

function calcMesasComensales(pax) {
  return Math.ceil(pax / 7.14);
}

function calcMesasServicio(pax) {
  if (pax <= 50) return { barraAperitivo: 2, contrabarra: 1, cornerQueso: 1, cocina: 3, barraComida: 1, apoyo: 0 };
  if (pax <= 100) return { barraAperitivo: 3, contrabarra: 2, cornerQueso: 2, cocina: 4, barraComida: 1, apoyo: 1 };
  return { barraAperitivo: 3, contrabarra: 2, cornerQueso: 2, cocina: 4, barraComida: 2, apoyo: 1 };
}

function calcMesas18mTotal(evtKey, pax) {
  const servicio = calcMesasServicio(pax);
  const totalServicio = servicio.barraAperitivo + servicio.contrabarra + servicio.cornerQueso + servicio.cocina + servicio.barraComida + servicio.apoyo;
  const comensales = evtKey === "boda" || evtKey === "comunion" ? calcMesasComensales(pax) : 0;
  return comensales + totalServicio;
}

const EVENTOS = {
  boda: { label: "Boda", icon: "♥", cafe: true, textilDefault: "tela" },
  comunion: { label: "Comunión / Bautizo", icon: "✚", cafe: true, textilDefault: "papel" },
  cumpleanos: { label: "Cumpleaños", icon: "✦", cafe: true, textilDefault: "papel" },
  corporativo: { label: "Evento corporativo", icon: "▣", cafe: true, textilDefault: "papel" },
};

function buildChecklist(evtKey, pax, horasCoctel, horasCopas, ninos, opts) {
  const evt = EVENTOS[evtKey];
  const { dobleServicio, llevaPaella, tipoBandejas, tipoBBQ, tipoHorno, mesVerano, tieneCongelador, tieneBrindisCava, fuerzaTextilTela, tieneFrituras, llevaEntrante } = opts;
  
  const horasBarraTotal = horasCoctel + horasCopas;
  const hayBarraLibre = horasBarraTotal > 0;
  
  const bebidas = calcBebidas(pax, hayBarraLibre ? horasBarraTotal : 2, mesVerano, tieneCongelador);
  const destilados = horasCopas > 0 ? calcDestilados(pax, horasCopas) : null;
  const cristal = calcCristaleria(pax, hayBarraLibre ? horasBarraTotal : 2, dobleServicio, tieneBrindisCava, llevaEntrante);
  const totalPax = pax + ninos;
  const cats = [];

  cats.push({
    nombre: "Electricidad y camión",
    items: [
      ["Regletas y alargadores", "Sí"],
      ["Caja cables", "1"],
      ["Cinta aislante", "1"],
      ["Bridas", "1 bolsa"],
      ["Rulos cable", "2"],
      ["Imperdibles", "1 paquete"],
      ["Carros de servicio/transporte", "2"],
    ],
  });

  cats.push({
    nombre: "Mobiliario, sala y decoración",
    items: [
      ["Mesas de 1,8m (total estructura + banquete)", String(calcMesas18mTotal(evtKey, pax))],
      ["Sillas (alquiler)", String(totalPax), true],
      ...(evtKey === "boda" ? [["Mesa redonda especial para Tarta", "1"]] : []),
      ["Cubo basura cocina", "2"],
      ["Champanera metálica grande", "4"],
      ["Cubiteras esmaltadas + pie", "2"],
      [`Bandeja de servicio (${tipoBandejas})`, String(Math.max(2, Math.ceil(pax / 20)))],
      ["Palangana enfriadora (cerveza/agua barra)", String(Math.max(2, Math.ceil(pax / 25)))],
    ],
  });

  const numEquiposPaella = llevaPaella ? calcPaella(pax).n : 0;
  const numEquiposFritura = tieneFrituras ? 1 : 0;
  const bombonasTotales = numEquiposPaella + numEquiposFritura + 2;

  const cocinaItems = [
    ["Bombonas de gas propano llenas", String(bombonasTotales)],
    ...(tipoHorno === "pequeño" || tipoHorno === "ambos" ? [["Horno pequeño de apoyo (con bandejas)", "1"]] : []),
    ...(tipoHorno === "grande" || tipoHorno === "ambos" ? [["Horno grande (Alquiler Dealde)", "1", true]] : []),
    ["Microondas y Vitro eléctrica", "1 de c/u"],
  ];

  if (llevaPaella) {
    const p = calcPaella(pax);
    cocinaItems.push(
      [`Paella talla ${p.talla}`, `${p.n}`],
      ["Difusores para paella", `${p.n}`],
      ["Trípodes para paella", `${p.n}`],
      ["Paravientos chapa", `${p.n}`]
    );
  }

  if (tieneFrituras) {
    cocinaItems.push(
      ["Sartén París / Parisiene (Frituras)", "1"],
      ["Difusor extra (Frituras)", "1"],
      ["Trípode cocina extra (Frituras)", "1"],
      ["Espumadera grande profesional", "2"]
    );
  }

  if (tipoBBQ !== "no lleva") {
    cocinaItems.push([`Barbacoa ${tipoBBQ}`, String(Math.max(1, Math.ceil(pax / 60)))], ["Carbón sacos", String(Math.max(2, Math.ceil(pax / 30)))]);
  }
  cats.push({ nombre: "Cocina y fuego", items: cocinaItems });

  cats.push({
    nombre: "Cristalería",
    items: [
      [ "Vasos de agua" + (dobleServicio ? " (doble)" : ""), cristal.agua ],
      [ "Vasos de cubata tubo", cristal.cubata ],
      [ "Copas de vino" + (dobleServicio ? " (doble)" : ""), cristal.vino ],
      [ "Copas de cava (1 p/pax base)", cristal.cava ],
      ...(llevaEntrante ? [["Vasos chupito cristal (entrante)", cristal.chupito]] : []),
    ]
  });

  const usaTela = evtKey === "boda" || fuerzaTextilTela;
  cats.push({
    nombre: "Mantelería y textiles",
    items: [
      ["Manteles de hilo/tela", String(calcMesas18mTotal(evtKey, pax) + 2)],
      ["Delantales negros", "6"],
      [usaTela ? "Servilletas de TELA" : "Servilletas grandes de PAPEL", usaTela ? String(totalPax * 1.2) : `${Math.ceil(totalPax / 40)} paq.`],
      ["Servilletas de PAPEL adicionales", `${Math.ceil(totalPax / 50)} paq.`],
      ["Servilletas mini de cocktail", `${Math.ceil(totalPax / 100)} paq.`],
    ],
  });

  cats.push({
    nombre: "Vajilla",
    items: [
      ["Platos trinchero (Principal)", String(totalPax)],
      ["Platos de postre estándar", String(totalPax)],
      ["Cubertería completa", String(totalPax * (dobleServicio ? 2 : 1))],
      ...(evtKey === "boda" ? [
        ["Platos extra para Jamón", String(Math.ceil(pax * 0.3))],
        ["Platos extra para Tarta nupcial", String(totalPax)]
      ] : [])
    ]
  });

  cats.push({
    nombre: "Bebidas frías",
    items: [
      ["Cerveza Alhambra (Tercios)", String(bebidas.cerveza)],
      ["Vino blanco", `${bebidas.vinoBlanco} botellas`],
      ["Vino tinto", `${bebidas.vinoTinto} botellas`],
      ["Agua mineral 1,5L", `${bebidas.agua15} packs`],
      ["Coca-Cola normal", String(bebidas.cocaNormal)],
      ["Coca-Cola Zero", String(bebidas.cocaZero)],
      ["Tónica Premium", `${bebidas.tonica} botellas`],
      ...(hayBarraLibre ? [["Redbull Energy", String(bebidas.redbull)]] : []),
      ["Hielo en cubitos", `${bebidas.taxisHielo} ${tieneCongelador ? "Cajas almacén" : "Taxis directos"}`],
    ],
  });

  if (destilados) {
    cats.push({
      nombre: "Alcoholes y licores (Barra)",
      items: [
        ["Ginebra Seagrams", String(destilados.ginebraPremium)],
        ["Ginebra Rosa", String(destilados.ginebraSabor)],
        ["Ron Oscuro Barceló", String(destilados.ron)],
        ["Whisky Ballantines", String(destilados.whisky)],
        ["Vodka Absolut", String(destilados.vodka)],
        ["Tequila", String(destilados.tequila)],
        ["Mistela", String(destilados.mistela)],
        ["Licores variados (Baileys, Orujo, Hierbas)", "1 de c/u"],
      ],
    });
  }

  return cats;
}

const PALABRAS_ALQUILER = ["dealde", "carvillo", "novelda", "alquiler"];

export default function App() {
  const [evento, setEvento] = useState("boda");
  const [pax, setPax] = useState(80);
  const [ninos, setNinos] = useState(0);
  
  const [barraCoctel, setBarraCoctel] = useState(true);
  const [horasCoctel, setHorasCoctel] = useState(2);
  
  const [barraCopas, setBarraCopas] = useState(false);
  const [horasCopas, setHorasCopas] = useState(4);
  
  const [dobleServicio, setDobleServicio] = useState(false);
  const [llevaEntrante, setLlevaEntrante] = useState(false);
  const [llevaPaella, setLlevaPaella] = useState(false);

  const [tipoBandejas, setTipoBandejas] = useState("Mixto");
  const [tipoHorno, setTipoHorno] = useState("Pequeño");
  const [tipoBBQ, setTipoBBQ] = useState("No lleva");

  const [mesVerano, setMesVerano] = useState(true);
  const [tieneCongelador, setTieneCongelador] = useState(false);
  const [tieneBrindisCava, setTieneBrindisCava] = useState(false);
  const [tieneFrituras, setTieneFrituras] = useState(false);
  const [fuerzaTextilTela, setFuerzaTextilTela] = useState(false);

  const [filtro, setFiltro] = useState("");
  const [openCategories, setOpenCategories] = useState({});

  const opts = { 
    dobleServicio, 
    llevaPaella, 
    mesVerano, 
    tieneCongelador, 
    tieneBrindisCava, 
    fuerzaTextilTela, 
    tieneFrituras, 
    tipoBandejas, 
    tipoBBQ: tipoBBQ.toLowerCase(), 
    tipoHorno: tipoHorno.toLowerCase(),
    llevaEntrante
  };
  
  const checklist = useMemo(() => buildChecklist(evento, pax, barraCoctel ? horasCoctel : 0, barraCopas ? horasCopas : 0, ninos, opts), [evento, pax, barraCoctel, horasCoctel, barraCopas, horasCopas, ninos, opts]);

  const filtered = useMemo(() => {
    if (!filtro.trim()) return checklist;
    const q = filtro.toLowerCase();
    return checklist.map(c => ({ ...c, items: c.items.filter(i => i[0].toLowerCase().includes(q)) })).filter(c => c.items.length > 0);
  }, [checklist, filtro]);

  const totalConceptos = checklist.reduce((acc, cat) => acc + cat.items.length, 0);

  const toggleCategory = (catName) => {
    setOpenCategories(prev => ({
      ...prev,
      [catName]: prev[catName] === undefined ? false : !prev[catName]
    }));
  };

  const SegmentedControl = ({ value, onChange, options, label }) => (
    <div className="segment-group animate-entrance" style={{ animationDelay: '0.1s' }}>
      <span className="segment-label">{label}</span>
      <div className="segmented-control">
        {options.map(opt => (
          <button 
            key={opt}
            className={`segment-btn ${value === opt ? 'active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-wrapper">
      <header className="app-header animate-entrance">
        <div className="header-title-group">
          <div className="header-icon">{EVENTOS[evento]?.icon || "📋"}</div>
          <div className="header-info">
            <h1>{EVENTOS[evento]?.label || "Generador Checklist"}</h1>
            <p>{pax} pax · cóctel {barraCoctel ? horasCoctel : 0}h · {totalConceptos} conceptos</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => alert("Función no implementada en demo")}>Vista previa</button>
          <button className="btn btn-outline" onClick={() => alert("Copiado al portapapeles")}>Compartir</button>
          <button className="btn btn-green" onClick={() => window.print()}>Descargar Word</button>
        </div>
      </header>

      <div className="config-card animate-entrance" style={{ animationDelay: '0.1s' }}>
        <div className="form-row">
          <div className="form-group">
            <span className="form-label">TIPO DE EVENTO</span>
            <select className="form-select" value={evento} onChange={e => setEvento(e.target.value)}>
              {Object.entries(EVENTOS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <span className="form-label">PAX ADULTOS</span>
            <input 
              type="number" 
              className="form-input" 
              value={pax} 
              onChange={e => setPax(parseInt(e.target.value) || 0)} 
              min="0"
            />
          </div>
          <div className="form-group">
            <span className="form-label">NIÑOS</span>
            <input 
              type="number" 
              className="form-input" 
              value={ninos} 
              onChange={e => setNinos(parseInt(e.target.value) || 0)} 
              min="0"
            />
          </div>
        </div>

        <hr />

        <div className="form-row">
          <div className="range-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={barraCoctel} onChange={e => setBarraCoctel(e.target.checked)} />
              BARRA LIBRE CÓCTEL / APERITIVO
            </label>
            <div className="range-slider-container">
              <input 
                type="range" 
                min="0" max="6" step="0.5" 
                className="range-slider"
                value={horasCoctel}
                onChange={e => setHorasCoctel(parseFloat(e.target.value))}
                disabled={!barraCoctel}
              />
              <span className="range-value">{horasCoctel}h</span>
            </div>
          </div>
          <div className="range-group" style={{ gridColumn: 'span 2' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={barraCopas} onChange={e => setBarraCopas(e.target.checked)} />
              BARRA LIBRE COPAS
            </label>
            <div className="range-slider-container" style={{ maxWidth: '50%' }}>
              <input 
                type="range" 
                min="0" max="12" step="1" 
                className="range-slider"
                value={horasCopas}
                onChange={e => setHorasCopas(parseFloat(e.target.value))}
                disabled={!barraCopas}
              />
              <span className="range-value">{horasCopas}h</span>
            </div>
          </div>
        </div>

        <hr />

        <div className="checkbox-grid">
          <label className="checkbox-label-normal">
            <input type="checkbox" checked={dobleServicio} onChange={e => setDobleServicio(e.target.checked)} />
            Doble servicio <span>· dobla cubierto, copa y plato</span>
          </label>
          <label className="checkbox-label-normal">
            <input type="checkbox" checked={llevaEntrante} onChange={e => setLlevaEntrante(e.target.checked)} />
            Lleva entrante <span>· chupito de cristal</span>
          </label>
          <label className="checkbox-label-normal">
            <input type="checkbox" checked={llevaPaella} onChange={e => setLlevaPaella(e.target.checked)} />
            Lleva paella <span>· calcula paelleros completos</span>
          </label>
        </div>

        <hr />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <SegmentedControl 
              label="Bandejas de servicio" 
              value={tipoBandejas} 
              onChange={setTipoBandejas} 
              options={["Madera", "Plata", "Mixto"]} 
            />
            <SegmentedControl 
              label="Horno" 
              value={tipoHorno} 
              onChange={setTipoHorno} 
              options={["Pequeño", "Grande", "Ambos"]} 
            />
          </div>
          <SegmentedControl 
            label="Barbacoa" 
            value={tipoBBQ} 
            onChange={setTipoBBQ} 
            options={["No lleva", "Pequeña", "Grande"]} 
          />
        </div>
      </div>

      <button className="add-material-btn animate-entrance" style={{ animationDelay: '0.2s' }}>
        + Añadir material extra a la checklist
        <span style={{ fontSize: '12px' }}>▼</span>
      </button>

      <div className="animate-entrance" style={{ animationDelay: '0.25s' }}>
        <input 
          type="text" 
          className="search-input-main" 
          placeholder="Buscar un material..." 
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        />
      </div>

      {filtered.map((cat, idx) => {
        const isOpen = openCategories[cat.nombre] !== false; // true by default
        return (
          <div 
            key={cat.nombre} 
            className={`category-section animate-entrance ${isOpen ? 'is-open' : ''}`}
            style={{ animationDelay: `${0.3 + (idx * 0.05)}s` }}
          >
            <div className="category-header" onClick={() => toggleCategory(cat.nombre)}>
              {cat.nombre}
              <span className="cat-count">{cat.items.length} ▼</span>
            </div>
            
            <div className="item-list-wrapper">
              <div className="item-list">
                {cat.items.map(([label, qty], i) => {
                  const alq = PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
                  return (
                    <div key={i} className={`item-row ${alq ? 'is-alquiler' : ''}`}>
                      <div className="item-name">
                        {label}
                        {alq && <span className="tag-alquiler">ALQUILER</span>}
                      </div>
                      <div className="item-qty">
                        {qty.u ? qty.u : qty}
                      </div>
                    </div>
                  );
                })}
                {cat.items.length === 0 && (
                  <div className="item-row" style={{ color: 'var(--text-muted)' }}>
                    No hay resultados
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
