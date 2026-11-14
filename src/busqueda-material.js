import { limpiaTexto, sinTildes } from "./texto.js";

export const consultaDeMaterial = texto => limpiaTexto(sinTildes(texto));

// Las filas siguen siendo las originales: contienen las claves que usan las
// marcas de preparación, salida y vuelta.
export function filtrarMaterial(categorias, consulta) {
  const palabras = consultaDeMaterial(consulta).split(" ").filter(Boolean);
  if (!palabras.length) return categorias;
  return categorias.flatMap(categoria => {
    const items = categoria.items.filter(([nombre]) => {
      const texto = consultaDeMaterial(nombre);
      return palabras.every(palabra => texto.includes(palabra));
    });
    return items.length ? [{ ...categoria, items, itemsCompletos: categoria.items }] : [];
  });
}
