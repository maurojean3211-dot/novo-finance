import { useCallback, useEffect, useMemo, useState } from "react";
import { CATALOGO_IMPORT_STATUS } from "../constants/catalogo.constants";
import { deleteImportDraft, detectInternalDuplicates, getImportSummary, listImportDrafts, saveImportDraft, updateProductInDraft } from "../services/catalogoImportDraft.service";

export default function useCatalogImports({ companyId, userId }) {
  const [drafts, setDrafts] = useState([]); const [selectedId, setSelectedId] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const reload = useCallback(async () => { if (!companyId || !userId) { setDrafts([]); setLoading(false); return []; } try { const next = await listImportDrafts(companyId, userId); setDrafts(next); setError(""); return next; } catch (requestError) { setError(requestError.message || "Erro ao carregar importações."); return []; } finally { setLoading(false); } }, [companyId, userId]);
  useEffect(() => { const timer = window.setTimeout(reload, 0); return () => window.clearTimeout(timer); }, [reload]);
  const selected = useMemo(() => selectedId ? drafts.find((draft) => draft.id === selectedId) || null : null, [drafts, selectedId]);
  async function persist(draft) { const saved = await saveImportDraft(draft); await reload(); setSelectedId(saved.id); return saved; }
  async function remove(id) { const removed = await deleteImportDraft(companyId, userId, id); if (selectedId === id) setSelectedId(null); await reload(); return removed; }
  function editProduct(draft, productId, changes) { return persist(updateProductInDraft(draft, productId, changes)); }
  function detectDuplicates(draft) { return persist(detectInternalDuplicates(draft)); }
  function markReview(draft) { return persist({ ...draft, status: CATALOGO_IMPORT_STATUS.REVIEW }); }
  function duplicate(draft) { const copy = { ...draft, id: `${draft.id}-copy-${Date.now()}`, status: CATALOGO_IMPORT_STATUS.DRAFT, catalogName: `${draft.catalogName || "Catálogo"} (cópia)`, products: draft.products.map((product) => ({ ...product, id: `${product.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })) }; return persist(copy); }
  const metrics = useMemo(() => ({ total: drafts.length, review: drafts.filter((draft) => draft.status === CATALOGO_IMPORT_STATUS.REVIEW).length, products: drafts.reduce((sum, draft) => sum + draft.products.length, 0), alerts: drafts.reduce((sum, draft) => sum + draft.products.filter((product) => product.warnings?.length).length, 0), duplicates: drafts.reduce((sum, draft) => sum + draft.products.filter((product) => product.duplicateOf).length, 0), approved: drafts.reduce((sum, draft) => sum + draft.products.filter((product) => product.selected && !product.warnings?.length).length, 0) }), [drafts]);
  return { drafts, selected, selectedId, setSelectedId, loading, error, reload, persist, remove, editProduct, detectDuplicates, markReview, duplicate, metrics, getSummary: getImportSummary };
}
