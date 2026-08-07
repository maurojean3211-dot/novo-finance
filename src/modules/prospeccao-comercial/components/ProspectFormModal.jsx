import { useState } from "react";
import { OperationModal } from "../../../components/operations/OperationsUI";
import { COMPANY_SIZES, CONTACT_PREFERENCES, EMPTY_PROSPECT, INTEREST_PRODUCTS, ORIGINS, PRIORITIES, PROSPECT_STATUSES } from "../types/prospeccao";
import { SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from "../../../app/localization/localizationConfig";

const Field = ({ label, children, wide = false }) => <label className={`ops-field${wide ? " ops-field--wide" : ""}`}><span>{label}</span>{children}</label>;
export default function ProspectFormModal({ prospect, onClose, onSave }) {
  const [form, setForm] = useState(() => prospect ? { ...EMPTY_PROSPECT, ...prospect } : { ...EMPTY_PROSPECT });
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function toggleProduct(product) { update("produtosInteresse", form.produtosInteresse.includes(product) ? form.produtosInteresse.filter((item) => item !== product) : [...form.produtosInteresse, product]); }
  function submit() {
    if (!form.razaoSocial.trim() && !form.nomeFantasia.trim()) return setError("Informe a razão social ou o nome fantasia.");
    onSave(form);
  }
  return <OperationModal title={prospect ? "Editar empresa prospectada" : "Nova empresa prospectada"} editing={Boolean(prospect)} onClose={onClose} onSubmit={submit} submitLabel={prospect ? "Salvar alterações" : "Cadastrar empresa"}>
    {error && <div className="ops-preview prospect-error">{error}</div>}
    <h3 className="prospect-form-section">Identificação</h3>
    <Field label="Razão social"><input value={form.razaoSocial} onChange={(e) => update("razaoSocial", e.target.value)} /></Field><Field label="Nome fantasia"><input value={form.nomeFantasia} onChange={(e) => update("nomeFantasia", e.target.value)} /></Field>
    <Field label="CNPJ"><input value={form.cnpj} onChange={(e) => update("cnpj", e.target.value)} /></Field><Field label="Segmento"><input value={form.segmento} onChange={(e) => update("segmento", e.target.value)} /></Field>
    <Field label="Porte"><select value={form.porte} onChange={(e) => update("porte", e.target.value)}><option value="">Selecione</option>{COMPANY_SIZES.map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Site"><input type="url" value={form.site} onChange={(e) => update("site", e.target.value)} /></Field>
    <Field label="País"><input value={form.pais} onChange={(e) => setForm((current) => ({ ...current, pais: e.target.value, countryCode: e.target.value }))} placeholder="País ou código ISO" /></Field><Field label="Cidade"><input value={form.cidade} onChange={(e) => update("cidade", e.target.value)} /></Field>
    <Field label="Estado / Província / Região"><input value={form.estado} onChange={(e) => setForm((current) => ({ ...current, estado: e.target.value, region: e.target.value }))} /></Field><Field label="CEP / Código postal"><input value={form.codigoPostal} onChange={(e) => setForm((current) => ({ ...current, codigoPostal: e.target.value, postalCode: e.target.value }))} /></Field>
    <Field label="Endereço" wide><input value={form.endereco} onChange={(e) => update("endereco", e.target.value)} /></Field><Field label="Idioma preferencial"><select value={form.idiomaPreferencial} onChange={(e) => setForm((current) => ({ ...current, idiomaPreferencial: e.target.value, preferredLocale: e.target.value }))}>{SUPPORTED_LOCALES.map((v) => <option key={v.code} value={v.code}>{v.label}</option>)}</select></Field>
    <Field label="Moeda preferencial"><input list="prospect-currencies" maxLength="3" value={form.moedaPreferencial} onChange={(e) => setForm((current) => ({ ...current, moedaPreferencial: e.target.value.toUpperCase(), preferredCurrency: e.target.value.toUpperCase() }))} /><datalist id="prospect-currencies">{SUPPORTED_CURRENCIES.map((v) => <option key={v} value={v} />)}</datalist></Field><Field label="Fuso horário"><input value={form.fusoHorario} onChange={(e) => setForm((current) => ({ ...current, fusoHorario: e.target.value, timeZone: e.target.value }))} placeholder="Ex.: America/Sao_Paulo" /></Field>
    <Field label="Representante responsável"><input value={form.representante} onChange={(e) => update("representante", e.target.value)} /></Field><Field label="Origem"><select value={form.origem} onChange={(e) => update("origem", e.target.value)}><option value="">Selecione</option>{ORIGINS.map((v) => <option key={v}>{v}</option>)}</select></Field>
    <Field label="Responsável interno"><input value={form.responsavel} onChange={(e) => update("responsavel", e.target.value)} /></Field><Field label="Status"><select value={form.status} onChange={(e) => update("status", e.target.value)}>{PROSPECT_STATUSES.map((v) => <option key={v}>{v}</option>)}</select></Field>
    <h3 className="prospect-form-section">Contato</h3>
    <Field label="Contato principal"><input value={form.contatoNome} onChange={(e) => update("contatoNome", e.target.value)} /></Field><Field label="Cargo"><input value={form.contatoCargo} onChange={(e) => update("contatoCargo", e.target.value)} /></Field>
    <Field label="Telefone"><input type="tel" value={form.telefone} onChange={(e) => update("telefone", e.target.value)} /></Field><Field label="WhatsApp"><input type="tel" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} /></Field>
    <Field label="E-mail"><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field><Field label="Contato preferido"><select value={form.contatoPreferido} onChange={(e) => update("contatoPreferido", e.target.value)}><option value="">Selecione</option>{CONTACT_PREFERENCES.map((v) => <option key={v}>{v}</option>)}</select></Field>
    <h3 className="prospect-form-section">Interesse comercial</h3>
    <div className="ops-field ops-field--wide"><span>Produtos de interesse</span><div className="prospect-product-grid">{INTEREST_PRODUCTS.map((product) => <label key={product}><input type="checkbox" checked={form.produtosInteresse.includes(product)} onChange={() => toggleProduct(product)} /> {product}</label>)}</div></div>
    <Field label="Necessidade descrita" wide><textarea value={form.necessidade} onChange={(e) => update("necessidade", e.target.value)} /></Field><Field label="Volume estimado"><input type="number" min="0" value={form.volumeEstimado} onChange={(e) => update("volumeEstimado", e.target.value)} /></Field><Field label="Unidade"><input value={form.unidade} onChange={(e) => update("unidade", e.target.value)} /></Field>
    <Field label="Frequência de compra"><input value={form.frequenciaCompra} onChange={(e) => update("frequenciaCompra", e.target.value)} /></Field><Field label="Fornecedor atual"><input value={form.fornecedorAtual} onChange={(e) => update("fornecedorAtual", e.target.value)} /></Field>
    <Field label="Prazo esperado"><input value={form.prazoEsperado} onChange={(e) => update("prazoEsperado", e.target.value)} /></Field><Field label="Região de atendimento"><input value={form.regiaoAtendimento} onChange={(e) => update("regiaoAtendimento", e.target.value)} /></Field>
    <Field label="Potencial"><input value={form.potencial} onChange={(e) => update("potencial", e.target.value)} /></Field><Field label="Próximo retorno"><input type="datetime-local" value={form.proximoRetornoEm} onChange={(e) => update("proximoRetornoEm", e.target.value)} /></Field>
    <Field label="Prioridade do retorno"><select value={form.retornoPrioridade} onChange={(e) => update("retornoPrioridade", e.target.value)}>{PRIORITIES.map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Observação do retorno"><input value={form.retornoObservacao} onChange={(e) => update("retornoObservacao", e.target.value)} /></Field>
    <Field label="Observações comerciais" wide><textarea value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} /></Field>
  </OperationModal>;
}
