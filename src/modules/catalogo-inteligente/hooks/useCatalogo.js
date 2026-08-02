import { useMemo, useState } from "react";
import { filterAndSortMaterials, getCatalogoDemonstrativo } from "../services/catalogo.service";

const PAGE_SIZE = 6;

export default function useCatalogo() {
  const [materials, setMaterials] = useState(getCatalogoDemonstrativo);
  const [filters, setFilters] = useState({ search: "", category: "Todas", status: "Todos", sortBy: "codigo" });
  const [page, setPage] = useState(1);

  const filteredMaterials = useMemo(() => filterAndSortMaterials(materials, filters), [materials, filters]);
  const pageCount = Math.max(1, Math.ceil(filteredMaterials.length / PAGE_SIZE));
  const visibleMaterials = filteredMaterials.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateFilters(nextFilters) {
    setFilters((current) => ({ ...current, ...nextFilters }));
    setPage(1);
  }

  function addMaterial(material) {
    const created = { ...material, id: `local-${Date.now()}`, atualizadoEm: new Date().toLocaleDateString("pt-BR"), origem: "memoria" };
    setMaterials((current) => [created, ...current]);
    return created;
  }

  return { materials, filters, updateFilters, page, setPage, pageCount, filteredMaterials, visibleMaterials, addMaterial };
}
