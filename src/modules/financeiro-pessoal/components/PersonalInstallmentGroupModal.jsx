import { dateLabel, money } from "../utils/personalFinance";

function statusClass(status) {
  return status === "Pago" ? "paid" : status === "Cancelada" ? "late" : "pending";
}

export default function PersonalInstallmentGroupModal({ group, events = [], values, metadataExists, loading, editing, saving, feedback, onChange, onEdit, onCancelEdit, onClose, onSave }) {
  if (!group) return null;
  const field = (key, value) => onChange({ ...values, [key]: value });
  const downPaymentValue = Number(group.downPayment?.valor_entrada || 0);
  const percent = group.total > 0 ? ((downPaymentValue + group.paidValue) / group.total) * 100 : 0;
  const reversed = new Set(events.filter((event) => event.tipo === "Estorno").map((event) => event.estorno_de_evento_id));
  const activePayments = events.filter((event) => ["Pagamento", "Antecipacao"].includes(event.tipo) && !reversed.has(event.id));
  const effectivePaid = events.filter((event) => event.tipo === "Entrada" || (["Pagamento", "Antecipacao"].includes(event.tipo) && !reversed.has(event.id))).reduce((sum, event) => sum + Number(event.valor_pago || 0), 0);
  const savings = activePayments.reduce((sum, event) => sum + Number(event.desconto_obtido || 0), 0);
  return <div className="ops-overlay" role="presentation">
    <section className="ops-modal pf-group-modal" role="dialog" aria-modal="true" aria-labelledby="pf-group-title">
      <header><div><p>Compra parcelada</p><h2 id="pf-group-title">{values.nome_amigavel || values.descricao || "Gerenciar parcelamento"}</h2></div><button type="button" onClick={onClose} disabled={saving} aria-label="Fechar">×</button></header>
      <div className="pf-group-modal__body">
        {loading ? <div className="pf-loading">Carregando dados do grupo…</div> : <>
          {feedback && <div className={`pf-feedback pf-feedback--${feedback.type}`}>{feedback.message}</div>}
          <section className="pf-group-summary">
            <article><span>Valor nominal</span><strong>{money(group.total)}</strong></article>
            <article><span>Parcelas</span><strong>{group.items.length}</strong><small>{group.paid} pagas · {group.pending} pendentes · {group.cancelled} canceladas</small></article>
            <article><span>Saldo nominal</span><strong>{money(group.remaining)}</strong></article>
            <article><span>Período</span><strong>{dateLabel(group.firstDue)} — {dateLabel(group.lastDue)}</strong></article>
            <article><span>Percentual quitado</span><strong>{percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong><small>Sobre o valor nominal</small></article>
          </section>
          {group.downPayment && <section className="pf-group-down-payment"><header><div><span>Entrada estruturada</span><strong>{money(group.downPayment.valor_entrada)}</strong></div><small>Pagamento em {dateLabel(group.downPayment.data_entrada)}</small></header><div><span>Valor total da compra <b>{money(group.downPayment.valor_total_compra)}</b></span><span>Saldo originalmente financiado <b>{money(group.downPayment.saldo_financiado)}</b></span><span>Total nominal das parcelas <b>{money(group.installmentsTotal)}</b></span><span>Parcelas previstas <b>{group.downPayment.parcelas_total}</b></span></div></section>}
          <section className="pf-group-metadata">
            <header><div><span>Metadados da compra</span><small>{metadataExists ? `Cabeçalho salvo · versão ${values.versao}` : "Fallback somente leitura das parcelas"}</small></div>{!editing && <button type="button" onClick={onEdit}>Editar compra</button>}</header>
            <div className="pf-group-fields">
              <label className="ops-field"><span>Nome amigável</span><input value={values.nome_amigavel} disabled={!editing || saving} onChange={(event) => field("nome_amigavel", event.target.value)} placeholder="Ex.: Minha moto" /></label>
              <label className="ops-field"><span>Descrição</span><input value={values.descricao} disabled={!editing || saving} onChange={(event) => field("descricao", event.target.value)} /></label>
              <label className="ops-field"><span>Fornecedor / credor</span><input value={values.fornecedor} disabled={!editing || saving} onChange={(event) => field("fornecedor", event.target.value)} /></label>
              <label className="ops-field"><span>Categoria</span><input value={values.categoria} disabled={!editing || saving} onChange={(event) => field("categoria", event.target.value)} /></label>
              <label className="ops-field pf-group-observations"><span>Observações</span><textarea value={values.observacoes} disabled={!editing || saving} onChange={(event) => field("observacoes", event.target.value)} /></label>
            </div>
            {editing && <footer><button type="button" className="secondary" onClick={onCancelEdit} disabled={saving}>Cancelar</button><button type="button" onClick={onSave} disabled={saving}>{saving ? "Salvando…" : "Salvar metadados"}</button></footer>}
          </section>
          <section className="pf-group-financial-lock"><strong>Dados financeiros protegidos</strong><p>Valores, vencimentos, quantidade, numeração, grupo, chaves e status não são editados nesta tela.</p><div><span>Entrada estruturada: {group.downPayment ? money(group.downPayment.valor_entrada) : "não registrada"}</span><span>Desembolso em eventos: {money(effectivePaid)}</span><span>Economia real: {money(savings)}</span></div><small>Somente dados estruturados e eventos reais são considerados; nenhum valor é inferido das observações.</small></section>
          <section className="pf-group-installments"><h3>Parcelas do grupo</h3><div className="ops-table-wrap"><table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor nominal</th><th>Status</th></tr></thead><tbody>{group.items.map((item) => <tr key={item.id}><td>{item.parcela_numero}/{item.parcelas_total}</td><td>{dateLabel(item.vencimento)}</td><td>{money(item.valor)}</td><td><span className={`pf-status ${statusClass(item.status)}`}>{item.status}</span></td></tr>)}</tbody></table></div></section>
          <section className="pf-group-installments"><h3>Histórico de eventos</h3>{events.length ? <div className="ops-table-wrap"><table><thead><tr><th>Tipo</th><th>Parcela</th><th>Nominal</th><th>Efetivo</th><th>Desconto</th><th>Data</th><th>Observação</th></tr></thead><tbody>{events.map((event) => { const item = group.items.find((row) => row.id === event.conta_pagar_pessoal_id); return <tr key={event.id}><td>{event.tipo}{event.tipo !== "Estorno" && reversed.has(event.id) ? " · estornado" : ""}</td><td>{event.tipo === "Entrada" ? "Entrada" : item ? `${item.parcela_numero}/${item.parcelas_total}` : "—"}</td><td>{money(event.valor_nominal)}</td><td>{money(event.valor_pago)}</td><td>{money(event.desconto_obtido)}</td><td>{dateLabel(event.pago_em)}</td><td>{event.observacoes || "—"}</td></tr>; })}</tbody></table></div> : <div className="pf-report-empty">Nenhum evento novo registrado para este grupo.</div>}</section>
        </>}
      </div>
    </section>
  </div>;
}
