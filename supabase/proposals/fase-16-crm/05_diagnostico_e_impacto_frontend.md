# Revisão da Fase 16 CRM

## Migration original

Arquivo preservado sem alterações: `supabase/migrations/202608070001_create_crm_opportunities.sql`.

## Problemas encontrados

- `empresa_id text` e `cliente_id text`, incompatíveis com os UUIDs definitivos.
- Ausência de FK de `empresa_id` para `public.empresas` e de `cliente_id` para `public.clientes`.
- Policies dependentes de cast `usuarios.empresa_id::text`.
- Histórico não possui FK composta capaz de garantir que oportunidade e histórico pertencem ao mesmo tenant.
- UPDATE permite tentativa de alteração de `user_id`; a policy protege o tenant, mas não a autoria.
- Função de `updated_at` não usa `search_path` restrito a `pg_catalog, public` e conserva EXECUTE padrão.
- `if not exists` poderia mascarar uma tabela parcialmente divergente.
- Rollback não existia.

## Compatibilidade frontend

`crm.service.js` já envia `empresa_id` derivado do contexto atual e `user_id` da sessão. Strings UUID válidas são convertidas pelo PostgREST para colunas UUID. Os nomes de colunas usados pelo payload correspondem à proposta. `pesoEstimado` é persistido em `quantidade`; `status` permanece somente no estado de UI e não é coluna porque a etapa do funil representa o estado persistente.

`OpportunityModal.jsx` não precisa conhecer tipos SQL. `useCrm.js` filtra pelo tenant atual e continuará compatível. A query aninhada de `crm_oportunidade_historico` é suportada pela FK para `crm_oportunidades`.

## Coexistência com a Fase 2

As policies usam diretamente `auth.uid()` e `public.usuarios.empresa_id`, sem e-mail, `user_id` como tenant, bypass de master ou dependência de `cf_is_empresa_member`. Funcionam no estado atual e após as policies self de `usuarios` propostas na Fase 2. A proposta não altera nenhuma tabela da Fase 2.

## Limitação conhecida

Prospecção ainda é local e `crm_oportunidades` não recebe `prospect_id`. O vínculo robusto entre dispositivos exige uma futura tabela persistente de prospects e migration própria; não foi misturado nesta Fase 16.

## Parecer

A migration original não deve ser aplicada. A proposta revisada está estruturalmente alinhada à arquitetura UUID e pronta para preflight/revisão humana, mas continua marcada como NÃO EXECUTAR.
