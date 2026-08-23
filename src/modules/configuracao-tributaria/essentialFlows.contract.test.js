import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const page = read("./ConfiguracaoTributariaPage.jsx");
const panel = read("./FiscalNotesPanel.jsx");
const service = read("./fiscalNotes.service.js");
const migration = read("../../../supabase/migrations/20260823205506_corrigir_fluxos_essenciais_configuracao_tributaria.sql");

test("troca de empresa limpa estado e bloqueia ações até o novo contexto estar pronto", () => {
  assert.match(page, /setRecords\(\[\]\)/);
  assert.match(page, /setSituation\(\{ alerts: \[\], checkedAt: null \}\)/);
  assert.match(page, /setLoadedEmpresaId\(null\)/);
  assert.match(panel, /setNotes\(\[\]\); setSelected\(null\); contextRef\.current = null/);
  assert.match(panel, /isContextCurrent: \(expected\) => contextRef\.current === expected/);
  assert.match(service, /A empresa ativa mudou durante a leitura/);
});

test("importação usa uma RPC transacional e não faz exclusão compensatória", () => {
  assert.match(service, /rpc\("importar_nota_fiscal_tributaria"/);
  assert.doesNotMatch(service, /from\("empresa_notas_fiscais_tributarias"\)\.delete/);
  assert.match(migration, /create or replace function public\.importar_nota_fiscal_tributaria/);
  assert.match(migration, /insert into public\.empresa_notas_fiscais_tributarias[\s\S]*insert into public\.empresa_nota_fiscal_itens[\s\S]*insert into public\.empresa_nota_fiscal_analises/);
});

test("políticas e RPCs exigem empresa do usuário e perfil responsável", () => {
  assert.match(migration, /u\.id = \(select auth\.uid\(\)\)[\s\S]*u\.empresa_id = p_empresa_id/);
  assert.match(migration, /u\.role in \('cliente', 'master'\)/);
  assert.match(migration, /public\.cf_pode_alterar_tributario\(empresa_id\)/);
});

test("autoria da revisão é definida pelo servidor e não pelo frontend", () => {
  assert.doesNotMatch(service, /revisada_por/);
  assert.match(migration, /new\.revisada_por := \(select auth\.uid\(\)\)/);
  assert.match(migration, /autoria_revisao_nao_pode_ser_informada/);
});

test("última verificação vem do registro persistido e possui estado não verificado", () => {
  const taxService = read("./configuracaoTributaria.service.js");
  assert.match(taxService, /empresa_verificacoes_tributarias/);
  assert.match(taxService, /rpc\("registrar_verificacao_tributaria"/);
  assert.doesNotMatch(taxService, /checkedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(page, /Não verificado/);
  assert.match(page, /Sem alertas locais/);
});
