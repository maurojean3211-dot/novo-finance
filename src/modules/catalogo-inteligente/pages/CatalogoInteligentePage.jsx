import { useState } from "react";
import useCompanyScope from "../../../app/providers/useCompanyScope";
import { FeedbackBanner, MetricGrid } from "../../../components/operations/OperationsUI";
import CatalogImportHistory from "../components/CatalogImportHistory";
import CatalogImportModal from "../components/CatalogImportModal";
import CatalogImportReview from "../components/CatalogImportReview";
import CatalogPagination from "../components/CatalogPagination";
import FutureIntelligence from "../components/FutureIntelligence";
import MaterialDetails from "../components/MaterialDetails";
import MaterialFilters from "../components/MaterialFilters";
import MaterialForm from "../components/MaterialForm";
import MaterialsView from "../components/MaterialsView";
import useCatalogImports from "../hooks/useCatalogImports";
import useCatalogo from "../hooks/useCatalogo";
import { publishImportedProducts } from "../services/catalogo.service";
import "../catalogo-inteligente.css";
import "../styles/catalogo-imports.css";

export default function CatalogoInteligentePage() {
  const { empresaId, userId, ready } = useCompanyScope(); const imports = useCatalogImports({ companyId: empresaId, userId }); const catalog = useCatalogo({ empresaId, userId });
  const [workspace, setWorkspace] = useState("imports"); const [screen, setScreen] = useState("list"); const [selectedMaterial, setSelectedMaterial] = useState(null); const [viewMode, setViewMode] = useState("table"); const [importModal, setImportModal] = useState(false); const [feedback, setFeedback] = useState(null);
  function showDetails(material) { setSelectedMaterial(material); setScreen("details"); }
  async function saveMaterial(material) { showDetails(await catalog.addMaterial(material)); }
  async function deleteDraft(draft) { if (window.confirm(`Excluir a importação “${draft.catalogName || draft.supplierName}”?`)) { await imports.remove(draft.id); setFeedback({ type: "success", message: "Importação excluída." }); } }
  async function saveDraft(draft) { await imports.persist(draft); setImportModal(false); setWorkspace("history"); setFeedback({ type: "success", message: "Rascunho salvo no Supabase." }); }
  async function publishDraft(draft){const total=await publishImportedProducts({empresaId,userId,products:draft.products});await catalog.reload();setFeedback({type:"success",message:`${total} produto(s) publicado(s) no catálogo.`})}
  if (screen === "create") return <MaterialForm onCancel={() => setScreen("list")} onSave={saveMaterial} />;
  if (screen === "details" && selectedMaterial) return <MaterialDetails material={selectedMaterial} onBack={() => setScreen("list")} />;
  const notice = (name) => setFeedback({ type: "info", message: `${name} está preparado para uma próxima etapa; nenhum dado externo foi criado.` });
  return <main className="catalog-page">
    <header className="catalog-header catalog-main-header"><div><p className="catalog-eyebrow">Materiais e Operações</p><h1>Catálogo Inteligente</h1><p>Importe, organize e confira catálogos de produtos.</p></div><div className="catalog-main-actions"><button onClick={() => setImportModal(true)}>＋ Importar catálogo</button><button onClick={() => { setWorkspace("products"); setScreen("create"); }}>Cadastrar produto</button></div></header>
    <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />{imports.error && <FeedbackBanner feedback={{ type: "error", message: imports.error }} />}{catalog.error && <FeedbackBanner feedback={{type:"error",message:catalog.error}}/>}{!ready && <FeedbackBanner feedback={{ type: "error", message: "Sessão incompleta: empresa e usuário precisam estar identificados." }} />}
    <nav className="catalog-workspace-tabs"><button onClick={() => notice("Fornecedores")}>Fornecedores</button><button onClick={() => notice("Categorias")}>Categorias</button><button className={workspace === "products" ? "active" : ""} onClick={() => setWorkspace("products")}>Produtos</button><button className={workspace === "history" || workspace === "imports" ? "active" : ""} onClick={() => { imports.setSelectedId(null); setWorkspace("history"); }}>Histórico de importações</button></nav>
    <MetricGrid items={[{ label: "Total de importações", value: imports.metrics.total, detail: "rascunhos persistentes", icon: "▤" }, { label: "Em conferência", value: imports.metrics.review, detail: "status review", icon: "◎", tone: "amber" }, { label: "Produtos extraídos", value: imports.metrics.products, detail: "itens nos rascunhos", icon: "▦" }, { label: "Produtos com alertas", value: imports.metrics.alerts, detail: "exigem conferência", icon: "!", tone: "rose" }, { label: "Duplicidades", value: imports.metrics.duplicates, detail: "possíveis repetições", icon: "◇" }, { label: "Itens aprovados", value: imports.metrics.approved, detail: "selecionados sem alertas", icon: "✓", tone: "green" }]} />
    {imports.selected ? <CatalogImportReview draft={imports.selected} summary={imports.getSummary(imports.selected)} onBack={() => imports.setSelectedId(null)} onEditProduct={(id, changes) => imports.editProduct(imports.selected, id, changes)} onDetectDuplicates={() => { imports.detectDuplicates(imports.selected); setFeedback({ type: "success", message: "Detecção interna de duplicidades concluída." }); }} onPublish={() => { void publishDraft(imports.selected); }} onMarkReview={() => imports.markReview(imports.selected)} /> : workspace === "products" ? <><div className="catalog-demo-note"><span /> Produtos persistidos no Supabase por empresa</div><MaterialFilters filters={catalog.filters} viewMode={viewMode} onFiltersChange={catalog.updateFilters} onViewModeChange={setViewMode} /><section className="catalog-results"><div className="catalog-results__heading"><div><p className="catalog-eyebrow">Base técnica</p><h2>Materiais cadastrados</h2></div><span>{catalog.filteredMaterials.length} encontrados</span></div><MaterialsView materials={catalog.visibleMaterials} mode={viewMode} onSelect={showDetails} /><CatalogPagination page={catalog.page} pageCount={catalog.pageCount} total={catalog.filteredMaterials.length} onPageChange={catalog.setPage} /></section><FutureIntelligence /></> : <CatalogImportHistory drafts={imports.drafts} loading={imports.loading} onOpen={(id) => { imports.setSelectedId(id); setWorkspace("imports"); }} onDelete={deleteDraft} onDuplicate={(draft) => { imports.duplicate(draft); setFeedback({ type: "success", message: "Rascunho duplicado." }); }} onReview={(draft) => imports.markReview(draft)} onImport={() => setImportModal(true)} />}
    {importModal && <CatalogImportModal companyId={empresaId} userId={userId} onClose={() => setImportModal(false)} onSave={saveDraft} />}
  </main>;
}
