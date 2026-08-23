-- SOMENTE LEITURA.
select grupo_parcelamento_id, count(*) parcelas,
 count(distinct descricao) descricoes, count(distinct coalesce(fornecedor,'')) fornecedores,
 count(distinct coalesce(categoria,'')) categorias, count(distinct coalesce(observacoes,'')) observacoes,
 min(valor_total_compra) valor_total_compra, min(parcelas_total) parcelas_total,
 min(vencimento) primeiro_vencimento, max(vencimento) ultimo_vencimento,
 count(*) filter(where status='Pago') pagas,
 count(*) filter(where status='Pendente') pendentes,
 count(*) filter(where status='Cancelada') canceladas,
 sum(valor) total_nominal,
 sum(valor) filter(where status='Pendente') saldo_nominal
from public.contas_pagar_pessoais
where grupo_parcelamento_id is not null
group by grupo_parcelamento_id;

select to_regclass('public.contas_pagar_pessoais_grupo_metadados') tabela,
 to_regprocedure('public.atualizar_metadados_grupo_conta_pessoal(uuid,uuid,uuid,bigint,text,text,text,text,text)') rpc;
