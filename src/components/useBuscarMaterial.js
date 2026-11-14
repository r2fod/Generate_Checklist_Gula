import { useDeferredValue, useMemo, useState } from "react";
import { consultaDeMaterial, filtrarMaterial } from "../busqueda-material.js";

export function useBuscarMaterial(checklist) {
  const [filtro, setFiltro] = useState("");
  const diferido = useDeferredValue(filtro);
  const buscando = !!consultaDeMaterial(diferido);
  const visibles = useMemo(() => filtrarMaterial(checklist, diferido), [checklist, diferido]);
  return { filtro, setFiltro, buscando, visibles, sinResultados: buscando && !visibles.length && filtro === diferido };
}
