import { useCallback, useEffect, useRef, useState } from "react";
import { ModuleHeader } from "../../components/operations/OperationsUI";
import { configurationStatus, listTaxConfigurations, loadTaxSituation, REGIMES_TRIBUTARIOS, regimeDisplayName, saveTaxConfiguration } from "./configuracaoTributaria.service";
import { situationStatus } from "./taxValidationEngine";
import FiscalNotesPanel from "./FiscalNotesPanel";
import "./configuracao-tributaria.css";

const initialForm = { regimeBase: "simples_nacional", ibsCbsModalidade: "simples_nacional", vigenciaInicio: "", vigenciaFim: "", observacoes: "" };
const dateLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "Sem término definido";

export default function ConfiguracaoTributariaPage({ empresaId, canManageTaxes = false }) {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [situation, setSituation] = useState({ alerts: [], checkedAt: null });
  const [loadedEmpresaId, setLoadedEmpresaId] = useState(null);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setRecords([]);
    setSituation({ alerts: [], checkedAt: null });
    setLoadedEmpresaId(null);
    setFeedback("");
    setLoading(true);
    try {
      if (!empresaId) {
        setRecords([]);
        setSituation({ alerts: [], checkedAt: null });
        return;
      }
      const nextRecords = await listTaxConfigurations(empresaId);
      const nextSituation = await loadTaxSituation(empresaId, nextRecords, { canManage: canManageTaxes });
      if (version !== loadVersion.current) return;
      setRecords(nextRecords);
      setSituation(nextSituation);
      setLoadedEmpresaId(String(empresaId));
      setFeedback("");
    }
    catch (error) { if (version === loadVersion.current) setFeedback(error.message); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [empresaId, canManageTaxes]);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    if (!canManageTaxes || loading || loadedEmpresaId !== String(empresaId)) return setFeedback("Aguarde o carregamento da empresa ativa ou solicite permissão ao responsável.");
    if (!form.vigenciaInicio) return setFeedback("Informe o início da vigência.");
    if (form.vigenciaFim && form.vigenciaFim < form.vigenciaInicio) return setFeedback("A vigência final não pode ser anterior à inicial.");
    setSaving(true);
    try {
      await saveTaxConfiguration({ empresaId, configuration: form });
      setForm(initialForm);
      await load();
      setFeedback("Configuração tributária registrada no histórico da empresa.");
    } catch (error) { setFeedback(error.message); }
    finally { setSaving(false); }
  }

  const hybrid = form.regimeBase === "simples_nacional" && form.ibsCbsModalidade === "regime_regular";
  const today = new Date().toISOString().slice(0, 10);
  const current = records.find((record) => configurationStatus(record, today) === "Vigente");
  const openAlerts = situation.alerts.filter((alert) => !alert.resolvido);
  const status = situationStatus(openAlerts);
  const statusDisplay = status === "Regular" ? "Sem alertas locais" : status;

  return (
    <main className="ops-page tax-config-page">
      <ModuleHeader eyebrow="Configurações da empresa" title="Regime tributário" description="Enquadramento e modalidade IBS/CBS por empresa e vigência. Esta configuração não calcula tributos nem substitui validação contábil." />
      <section className="ops-panel tax-situation" aria-labelledby="tax-situation-title">
        <div className="tax-situation__heading"><div><small>Verificação tributária local</small><h2 id="tax-situation-title">Visão atual da empresa</h2></div><span className={`tax-situation__status tax-situation__status--${status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>{statusDisplay}</span></div>
        <dl>
          <div><dt>Regime vigente</dt><dd>{current ? regimeDisplayName(current) : "Não configurado"}</dd></div>
          <div><dt>Modalidade IBS/CBS</dt><dd>{current ? (current.ibs_cbs_modalidade === "regime_regular" ? "Regime regular" : "Apuração no Simples") : "Não informada"}</dd></div>
          <div><dt>Início da vigência</dt><dd>{current ? dateLabel(current.vigencia_inicio) : "—"}</dd></div>
          <div><dt>Última verificação local das regras</dt><dd>{situation.checkedAt ? new Date(situation.checkedAt).toLocaleString("pt-BR") : "Não verificado"}</dd></div>
          <div><dt>Quantidade de alertas</dt><dd>{openAlerts.length}</dd></div>
        </dl>
        {openAlerts.length > 0 && <div className="tax-alerts">{openAlerts.map((alert) => <article key={alert.chave_alerta} className={`tax-alert tax-alert--${alert.classificacao.toLowerCase()}`}><div><strong>{alert.titulo}</strong><span>{alert.classificacao}</span></div><p>{alert.descricao}</p><small>{alert.fundamento_fonte} · Regra de {dateLabel(alert.data_regra)}</small></article>)}</div>}
      </section>
      <div className="tax-config-layout">
        <form className="ops-panel tax-config-form" onSubmit={submit}>
          <div className="ops-panel__header"><div><h2>Nova vigência</h2><small>Um registro separado preserva o histórico da empresa.</small></div><span>{hybrid ? "Simples Híbrido" : "Configuração fiscal"}</span></div>
          <label className="ops-field"><span>Regime-base</span><select value={form.regimeBase} onChange={(event) => setForm({ ...form, regimeBase: event.target.value, ibsCbsModalidade: event.target.value === "simples_nacional" ? form.ibsCbsModalidade : "regime_regular" })}>{REGIMES_TRIBUTARIOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="ops-field"><span>Modalidade IBS/CBS</span><select value={form.ibsCbsModalidade} disabled={form.regimeBase !== "simples_nacional"} onChange={(event) => setForm({ ...form, ibsCbsModalidade: event.target.value })}><option value="simples_nacional">Apuração no Simples Nacional</option><option value="regime_regular">Regime regular de IBS/CBS</option></select></label>
          {hybrid && <p className="tax-config-note"><strong>Simples Híbrido</strong> é o nome amigável para Simples Nacional com IBS/CBS pelo regime regular; o regime-base permanece Simples Nacional.</p>}
          <div className="tax-config-dates"><label className="ops-field"><span>Início da vigência</span><input type="date" required value={form.vigenciaInicio} onChange={(event) => setForm({ ...form, vigenciaInicio: event.target.value })} /></label><label className="ops-field"><span>Fim da vigência (opcional)</span><input type="date" value={form.vigenciaFim} onChange={(event) => setForm({ ...form, vigenciaFim: event.target.value })} /></label></div>
          <label className="ops-field"><span>Observações</span><textarea rows="3" value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} placeholder="Referência interna ou orientação do responsável fiscal; não informe alíquotas sem validação." /></label>
          <button type="submit" disabled={saving || loading || !canManageTaxes || loadedEmpresaId !== String(empresaId)}>{saving ? "Salvando…" : "Registrar configuração"}</button>
          {feedback && <p className="tax-config-feedback" role="status">{feedback}</p>}
        </form>

        <section className="ops-panel tax-config-history">
          <div className="ops-panel__header"><div><h2>Histórico tributário</h2><small>Somente registros vinculados à empresa ativa.</small></div><span>{records.length} registro(s)</span></div>
          {loading ? <p>Carregando configurações…</p> : !records.length ? <p>Nenhuma configuração tributária registrada.</p> : <div className="tax-config-records">{records.map((record) => <article key={record.id}><div><strong>{regimeDisplayName(record)}</strong><span className={`tax-status tax-status--${configurationStatus(record).toLowerCase()}`}>{configurationStatus(record)}</span></div><small>Regime-base: {regimeDisplayName({ ...record, ibs_cbs_modalidade: "simples_nacional" })}</small><small>IBS/CBS: {record.ibs_cbs_modalidade === "regime_regular" ? "Regime regular" : "Apuração no Simples"}</small><small>Vigência: {dateLabel(record.vigencia_inicio)} até {dateLabel(record.vigencia_fim)}</small>{record.observacoes && <p>{record.observacoes}</p>}</article>)}</div>}
        </section>
      </div>
      <FiscalNotesPanel empresaId={empresaId} configurations={records} rules={situation.rules ?? []} companyReady={!loading && loadedEmpresaId === String(empresaId)} canManageTaxes={canManageTaxes} />
      <p className="tax-config-disclaimer">As validações do Cunha Finance são auxiliares e não substituem a análise do responsável fiscal ou contábil.</p>
    </main>
  );
}
