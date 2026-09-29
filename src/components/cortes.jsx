// ─── PARTIR NOMBRES TRAS LA "/" ────────────────────────────────────────────────
// El navegador no parte la línea en una "/": "(estándar/descafeinado)" o
// "(Seagrams/Tanqueray)" son para él UNA palabra de 170px, y en una columna más
// estrecha que eso acababa partida por cualquier letra. <wbr> ofrece el corte justo
// detrás de la barra sin añadir texto: innerText sigue siendo el nombre, tal cual.
export const conCortes = (texto) => String(texto).split("/").flatMap((t, i) => i ? ["/", <wbr key={i} />, t] : [t]);
