import { useState } from "react";
import { createEmptyMaterial, MATERIAL_CATEGORIES, MATERIAL_STATUS, MATERIAL_UNITS } from "../types/material";

const dimensionalFields = [
  ["diametro", "Diâmetro", "number"], ["largura", "Largura", "number"], ["altura", "Altura", "number"],
  ["espessura", "Espessura", "number"], ["comprimento", "Comprimento", "number"],
  ["pesoPorMetro", "Peso por metro", "number"], ["pesoPorBarra", "Peso por barra", "number"], ["pesoUnitario", "Peso unitário", "number"],
];

const commercialFields = [
  ["precoCompra", "Preço de compra", "number"], ["precoSugerido", "Preço sugerido", "number"],
  ["margemPadrao", "Margem padrão (%)", "number"], ["estoqueMinimo", "Estoque mínimo", "number"], ["estoqueAtual", "Estoque atual", "number"],
];

function Field({ label, name, value, onChange, type = "text", children, wide = false }) {
  return <label className={wide ? "catalog-field catalog-field--wide" : "catalog-field"}><span>{label}</span>{children || <input name={name} type={type} step={type === "number" ? "any" : undefined} value={value} onChange={onChange} />}</label>;
}

export default function MaterialForm({ onCancel, onSave }) {
  const [form, setForm] = useState(createEmptyMaterial);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!form.codigo.trim() || !form.descricao.trim()) return;
    onSave(form);
  }

  return (
    <main className="catalog-page">
      <header className="catalog-subheader"><button onClick={onCancel}>← Voltar</button><div><p className="catalog-eyebrow">Catálogo Inteligente</p><h1>Cadastrar material</h1><span>Estrutura local sem persistência em banco nesta fase.</span></div></header>
      <form className="material-form" onSubmit={submit}>
        <section><h2>Identificação</h2><p>Informações principais para pesquisa e classificação.</p><div className="material-form__grid">
          <Field label="Código *" name="codigo" value={form.codigo} onChange={change} />
          <Field label="Descrição *" name="descricao" value={form.descricao} onChange={change} wide />
          <Field label="Categoria" name="categoria" value={form.categoria} onChange={change}><select name="categoria" value={form.categoria} onChange={change}>{MATERIAL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Liga" name="liga" value={form.liga} onChange={change} />
          <Field label="Têmpera" name="tempera" value={form.tempera} onChange={change} />
          <Field label="Formato" name="formato" value={form.formato} onChange={change} />
          <Field label="Status" name="status" value={form.status} onChange={change}><select name="status" value={form.status} onChange={change}>{MATERIAL_STATUS.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div></section>

        <section><h2>Dimensões e peso</h2><p>Valores técnicos preparados para futuras regras de conversão.</p><div className="material-form__grid">{dimensionalFields.map(([name, label, type]) => <Field key={name} label={label} name={name} type={type} value={form[name]} onChange={change} />)}
          <Field label="Unidade" name="unidade" value={form.unidade} onChange={change}><select name="unidade" value={form.unidade} onChange={change}>{MATERIAL_UNITS.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div></section>

        <section><h2>Fornecimento e posição comercial</h2><p>Referências sem integração automática ou atualização de preço.</p><div className="material-form__grid">
          <Field label="Fornecedor principal" name="fornecedorPrincipal" value={form.fornecedorPrincipal} onChange={change} />
          <Field label="Fornecedores alternativos" name="fornecedoresAlternativos" value={form.fornecedoresAlternativos} onChange={change} wide />
          {commercialFields.map(([name, label, type]) => <Field key={name} label={label} name={name} type={type} value={form[name]} onChange={change} />)}
          <Field label="Localização" name="localizacao" value={form.localizacao} onChange={change} />
          <Field label="Observações" name="observacoes" value={form.observacoes} onChange={change} wide><textarea name="observacoes" value={form.observacoes} onChange={change} rows="4" /></Field>
        </div></section>
        <footer className="material-form__actions"><button type="button" onClick={onCancel}>Cancelar</button><button type="submit">Adicionar à sessão demonstrativa</button></footer>
      </form>
    </main>
  );
}
