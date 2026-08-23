import { useCallback, useEffect, useRef, useState } from "react";
import { deleteFiscalNote, importFiscalNote, listFiscalNotes, markFiscalNoteReviewed } from "./fiscalNotes.service";

const labels = { regular: "Regular", atencao: "Atenção", critico: "Crítico", pendente_revisao: "Pendente de revisão" };
const dateLabel = (value) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "Não identificada";
const money = (value) => value == null ? "Não identificado" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FiscalNotesPanel({ empresaId, configurations, rules, companyReady, canManageTaxes }) {
  const [notes, setNotes] = useState([]); const [selected, setSelected] = useState(null); const [busy, setBusy] = useState(false); const [feedback, setFeedback] = useState("");
  const inputRef = useRef(null); const version = useRef(0); const contextRef = useRef(null);
  const load = useCallback(async () => {
    const current = ++version.current;
    setNotes([]); setSelected(null); contextRef.current = null;
    if (!empresaId || !companyReady) return;
    try { const data = await listFiscalNotes(empresaId); if (current === version.current) { setNotes(data); contextRef.current = String(empresaId); } }
    catch (error) { if (current === version.current) setFeedback(error.message); }
  }, [empresaId, companyReady]);
  useEffect(() => { setFeedback(""); load(); return () => { version.current += 1; contextRef.current = null; }; }, [load]);

  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!companyReady || !canManageTaxes || contextRef.current !== String(empresaId)) return setFeedback("Aguarde o carregamento da empresa ativa ou solicite permissão ao responsável.");
    const actionEmpresaId = String(empresaId);
    setBusy(true); setFeedback("Lendo e conferindo a nota fiscal…");
    try { await importFiscalNote({ file, empresaId: actionEmpresaId, configurations, rules, isContextCurrent: (expected) => contextRef.current === expected }); if (contextRef.current !== actionEmpresaId) return; await load(); setFeedback("Nota fiscal importada e analisada."); }
    catch (error) { setFeedback(error.message); } finally { setBusy(false); }
  }
  async function review(note) { if (!companyReady || !canManageTaxes || contextRef.current !== String(empresaId)) return; setBusy(true); try { await markFiscalNoteReviewed(empresaId, note.id); await load(); setFeedback("Nota marcada como revisada."); } catch (error) { setFeedback(error.message); } finally { setBusy(false); } }
  async function remove(note) {
    if (!companyReady || !canManageTaxes || contextRef.current !== String(empresaId) || !window.confirm(`Excluir somente a nota ${note.numero || "sem número"}?`)) return;
    setBusy(true); try { await deleteFiscalNote(empresaId, note.id); if (selected?.id === note.id) setSelected(null); await load(); setFeedback("Nota fiscal excluída."); } catch (error) { setFeedback(error.message); } finally { setBusy(false); }
  }
  const analysis = selected?.empresa_nota_fiscal_analises?.[0]; const items = selected?.empresa_nota_fiscal_itens ?? [];
  const icmsTreatment = analysis?.alertas?.find((item) => item.kind === "icms_deferral" && item.severity === "INFO");
  const analysisAlerts = analysis?.alertas?.filter((item) => item.severity !== "INFO") ?? [];
  return <section className="ops-panel fiscal-notes" aria-labelledby="fiscal-notes-title">
    <div className="ops-panel__header"><div><h2 id="fiscal-notes-title">Notas fiscais para conferência</h2><small>Leitura auxiliar por PDF, sem integração automática com módulos operacionais.</small></div><button type="button" disabled={busy || !empresaId || !companyReady || !canManageTaxes || contextRef.current !== String(empresaId)} onClick={() => inputRef.current?.click()}>{busy ? "Processando…" : "Importar PDF da nota fiscal"}</button></div>
    <input ref={inputRef} className="fiscal-notes__file" type="file" accept="application/pdf,.pdf" onChange={upload} />
    {feedback && <p className="tax-config-feedback" role="status">{feedback}</p>}
    {!notes.length ? <p>Nenhuma nota fiscal importada para esta empresa.</p> : <div className="fiscal-notes__table-wrap"><table><thead><tr><th>Número / série</th><th>Emissão</th><th>Tipo</th><th>Fornecedor ou cliente</th><th>CNPJ</th><th>Total</th><th>Situação</th><th>Análise</th><th>Ações</th></tr></thead><tbody>{notes.map((note) => <tr key={note.id}><td>{note.numero || "—"} / {note.serie || "—"}</td><td>{dateLabel(note.data_emissao)}</td><td>{note.tipo_operacao === "entrada" ? "Entrada" : note.tipo_operacao === "saida" ? "Saída" : "Pendente"}</td><td>{note.parte_nome || "Não identificado"}</td><td>{note.parte_cnpj || "—"}</td><td>{money(note.valor_total)}</td><td><span className={`fiscal-status fiscal-status--${note.status_tributario}`}>{labels[note.status_tributario]}</span></td><td>{note.analisada_em ? new Date(note.analisada_em).toLocaleString("pt-BR") : "Pendente"}</td><td><div className="fiscal-notes__actions"><button type="button" disabled={!companyReady} onClick={() => setSelected(note)}>Ver análise</button><button type="button" disabled={busy || !companyReady || !canManageTaxes || !!note.revisada_em} onClick={() => review(note)}>{note.revisada_em ? "Revisada" : "Marcar revisada"}</button><button type="button" disabled={busy || !companyReady || !canManageTaxes || !!note.integracao_operacional || !!note.integrado_em} onClick={() => remove(note)}>Excluir</button></div></td></tr>)}</tbody></table></div>}
    {selected && <div className="fiscal-analysis"><div className="fiscal-analysis__heading"><h3>Análise da nota {selected.numero || "sem número"}</h3><button type="button" onClick={() => setSelected(null)}>Fechar</button></div><dl><div><dt>Situação da nota</dt><dd>{labels[selected.status_tributario]}</dd></div><div><dt>Regime aplicado</dt><dd>{selected.regime_aplicado || "Não identificado"}</dd></div><div><dt>Vigência usada</dt><dd>{dateLabel(selected.vigencia_inicio_usada)}</dd></div><div><dt>Quantidade de alertas</dt><dd>{analysis?.quantidade_alertas ?? 0}</dd></div></dl>
      <div className="fiscal-analysis__extracted"><h4>Dados extraídos</h4><p>Chave: {selected.chave_acesso || "Não identificada"} · Frete: {money(selected.frete)} · Confiança: {selected.confianca_extracao == null ? "Não calculada" : `${Math.round(selected.confianca_extracao * 100)}%`} · Origem: {selected.uf_emitente || "—"} | Destino: {selected.uf_destinatario || "—"} | CST/CSOSN: {items.find((item) => item.cst_icms || item.csosn_icms)?.cst_icms || items.find((item) => item.cst_icms || item.csosn_icms)?.csosn_icms || "—"}</p></div>
      <div className="fiscal-analysis__columns">
        <section><h4>Itens</h4>{!items.length ? <p>Nenhum item identificado; requer revisão humana.</p> : <div className="fiscal-analysis__items">{items.sort((a, b) => a.item_ordem - b.item_ordem).map((item) => <p key={item.id}><strong>{item.item_ordem}. {item.descricao || "Item sem descrição"}</strong> · NCM {item.ncm || "ausente"} · CFOP {item.cfop || "ausente"} · {money(item.valor_total)}</p>)}</div>}</section>
        <section><h4>Tributos identificados</h4>{icmsTreatment ? <p><strong>ICMS: Diferido — Art. 400-D RICMS/SP</strong><br />Crédito: {icmsTreatment.credit}</p> : <p>ICMS {money(selected.icms)} · IPI {money(selected.ipi)} · IBS {money(selected.ibs)} · CBS {money(selected.cbs)}</p>}</section>
        <section><h4>Alertas encontrados</h4>{!analysisAlerts.length ? <p>Nenhum alerta encontrado.</p> : <div className="fiscal-analysis__alerts">{analysisAlerts.map((item, index) => <article key={`${item.field}-${index}`}><strong>{item.field}: {item.problem}</strong><p>Valor: {item.value ?? "não identificado"} · Regra: {item.rule}</p><small>{item.source} · {item.guidance}</small></article>)}</div>}</section>
      </div>
    </div>}
  </section>;
}
