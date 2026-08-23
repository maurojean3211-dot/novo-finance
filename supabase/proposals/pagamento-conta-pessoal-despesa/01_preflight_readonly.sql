-- SOMENTE LEITURA. Não altera schema, policies ou dados.
select c.relname tabela, c.relrowsecurity rls_habilitada
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('contas_pagar_pessoais', 'despesas');

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('contas_pagar_pessoais', 'despesas')
order by tablename, cmd, policyname;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'despesas'
order by ordinal_position;

select count(*) quantidade, count(distinct source_legacy_id) fontes_distintas,
       count(*) filter (where status = 'Pago') pagas,
       count(*) filter (where status = 'Pendente') pendentes,
       sum(valor) valor_total
from public.contas_pagar_pessoais;

-- Deve retornar zero antes da primeira aplicação.
select count(*) colunas_propostas_existentes
from information_schema.columns
where table_schema = 'public' and table_name = 'despesas'
  and column_name in ('proprietario_id', 'conta_pagar_pessoal_id',
                      'pagamento_pessoal_status', 'pagamento_pessoal_estornado_em');
