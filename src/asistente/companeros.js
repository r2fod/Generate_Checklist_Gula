// ─── QUIÉNES PUEDEN ACOMPAÑARTE ───────────────────────────────────────────────
// Solo la lista, sin dibujar nada. Está aparte del componente por dos razones:
//
//   · El muñeco se dibuja DOS veces —pequeño en la cabecera y grande en la pestaña
//     Humano— y las dos tienen que ofrecer los mismos. Con la lista en uno de los dos
//     ficheros, el otro dependía de él solo para leer cuatro nombres.
//   · Las pruebas corren en node, y node no entiende JSX. Sin este fichero no había
//     forma de comprobar que las dos pantallas ofrecen lo mismo, que es justo el fallo
//     que se cuela solo: añades uno en un sitio, lo eliges, y en la otra pantalla
//     desaparece.
//
// Todos son de la casa. Quien pidió un muñeco quería algo de catering, no una bola con
// ojos: un gorro, una cazuela, una copa, el camión, la bandeja, la paella y la tarta.
// "ninguno" no es un muñeco: es apagarlo.
export const COMPANEROS = {
  chef:    { nombre: "Gorro", emoji: "👨‍🍳" },
  cazuela: { nombre: "Cazuela", emoji: "🍲" },
  copa:    { nombre: "Copa", emoji: "🥂" },
  camion:  { nombre: "Camión", emoji: "🚚" },
  bandeja: { nombre: "Bandeja", emoji: "🍽️" },
  paella:  { nombre: "Paella", emoji: "🥘" },
  tarta:   { nombre: "Tarta", emoji: "🎂" },
  ninguno: { nombre: "Ninguno", emoji: "—" },
};

export const CLAVES_COMPANERO = Object.keys(COMPANEROS);
export const COMPANERO_POR_DEFECTO = "chef";
