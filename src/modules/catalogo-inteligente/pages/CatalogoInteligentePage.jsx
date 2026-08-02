import { useState } from "react";
import CatalogHeader from "../components/CatalogHeader";
import CatalogPagination from "../components/CatalogPagination";
import FutureIntelligence from "../components/FutureIntelligence";
import MaterialDetails from "../components/MaterialDetails";
import MaterialFilters from "../components/MaterialFilters";
import MaterialForm from "../components/MaterialForm";
import MaterialsView from "../components/MaterialsView";
import useCatalogo from "../hooks/useCatalogo";
import "../catalogo-inteligente.css";

export default function CatalogoInteligentePage() {
  const [screen, setScreen] = useState("list");
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const catalog = useCatalogo();

  function showDetails(material) {
    setSelectedMaterial(material);
    setScreen("details");
  }

  function saveMaterial(material) {
    showDetails(catalog.addMaterial(material));
  }

  if (screen === "create") return <MaterialForm onCancel={() => setScreen("list")} onSave={saveMaterial} />;
  if (screen === "details" && selectedMaterial) return <MaterialDetails material={selectedMaterial} onBack={() => setScreen("list")} />;

  return (
    <main className="catalog-page">
      <CatalogHeader total={catalog.materials.length} onCreate={() => setScreen("create")} />
      <div className="catalog-demo-note"><span /> Arquitetura demonstrativa · dados mantidos somente em memória</div>
      <MaterialFilters filters={catalog.filters} viewMode={viewMode} onFiltersChange={catalog.updateFilters} onViewModeChange={setViewMode} />
      <section className="catalog-results">
        <div className="catalog-results__heading"><div><p className="catalog-eyebrow">Base técnica</p><h2>Materiais cadastrados</h2></div><span>{catalog.filteredMaterials.length} encontrados</span></div>
        <MaterialsView materials={catalog.visibleMaterials} mode={viewMode} onSelect={showDetails} />
        <CatalogPagination page={catalog.page} pageCount={catalog.pageCount} total={catalog.filteredMaterials.length} onPageChange={catalog.setPage} />
      </section>
      <FutureIntelligence />
    </main>
  );
}
