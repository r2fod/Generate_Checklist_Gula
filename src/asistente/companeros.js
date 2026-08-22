// ─── QUIÉNES PUEDEN ACOMPAÑARTE ───────────────────────────────────────────────
// Solo la lista, sin dibujar nada. Está aparte del componente por dos razones:
//
//   · El compañero se dibuja DOS veces —pequeño en la cabecera y grande en la pestaña
//     Humano— y las dos tienen que ofrecer los mismos.
//   · Las pruebas corren en node, y node no entiende JSX. Sin este fichero no había
//     forma de comprobar que las dos pantallas ofrecen lo mismo, que es justo el fallo
//     que se cuela solo: añades uno en un sitio, lo eliges, y en la otra desaparece.
//
// Son OFICIOS de la casa, no objetos con cara. Empezaron siendo un gorro, una cazuela y
// una paella —cosas con ojos— y no acababan de funcionar: un objeto no puede gesticular,
// solo inclinarse, así que los siete gestos (buscar, calcular, borrar…) se quedaban en
// nada. Con personas hay hombros, brazos y postura, que es lo que hace que parezca que
// tiene vida.
//
// "ninguno" no es un compañero: es apagarlo.
export const COMPANEROS = {
  cocinera:   { nombre: "Cocinera", emoji: "👩‍🍳", oficio: "Gorro y cucharón" },
  cocinero:   { nombre: "Cocinero", emoji: "👨‍🍳", oficio: "Gorro y cucharón" },
  camarero:   { nombre: "Camarero", emoji: "🤵", oficio: "Pajarita y bandeja" },
  camarera:   { nombre: "Camarera", emoji: "🍽️", oficio: "Pajarita y bandeja" },
  logistica:  { nombre: "Logística", emoji: "📦", oficio: "Caja y carretilla" },
  parrillero: { nombre: "Parrillero", emoji: "🥘", oficio: "Paella y brasa" },
  sumiller:   { nombre: "Sumiller", emoji: "🍷", oficio: "Copa y paño" },
  repostera:  { nombre: "Repostera", emoji: "🎂", oficio: "Tarta y pañuelo" },
  ninguno:    { nombre: "Ninguno", emoji: "—", oficio: "Sin compañero" },
};

export const CLAVES_COMPANERO = Object.keys(COMPANEROS);
export const COMPANERO_POR_DEFECTO = "cocinera";

// Los que de verdad se dibujan. Sale a menudo (el elegidor, las pruebas) y filtrar
// "ninguno" a mano en cada sitio es cómo se olvida en uno.
export const CLAVES_DIBUJADAS = CLAVES_COMPANERO.filter(k => k !== "ninguno");

// Los compañeros cambiaron de objetos con cara a oficios, así que un navegador puede
// tener guardado un "chef" o una "cazuela" que ya no existen. Sin esto se quedaba sin
// muñeco y sin saber por qué.
export const companeroValido = (c) => (COMPANEROS[c] ? c : COMPANERO_POR_DEFECTO);
