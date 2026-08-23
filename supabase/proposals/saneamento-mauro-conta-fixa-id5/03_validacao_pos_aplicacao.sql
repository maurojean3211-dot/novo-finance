-- SOMENTE LEITURA. Executar apenas depois de eventual aplicação autorizada.
select id, empresa_id, descricao, valor, dia_vencimento, frequencia, ativo, created_at
from public.contas_fixas
where id in (3, 5, 7)
order by id;

select
  (select count(*) from public.contas_fixas
   where id = 5
     and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
     and descricao = 'ODONTOCOMPANY' and valor = 49.90
     and dia_vencimento = 10 and frequencia = 'Mensal' and ativo is true) id5_em_mauro,
  (select count(*) from public.contas_fixas
   where id = 5
     and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid) id5_no_legado,
  (select count(*) from public.contas_fixas
   where id = 3
     and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
     and descricao = 'ALUGUEL APARTAMENTO' and valor = 1947.64
     and dia_vencimento = 11) id3_preservado,
  (select count(*) from public.contas_fixas
   where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
     and regexp_replace(lower(btrim(descricao)), '[^a-z0-9]', '', 'g') = 'odontocompany'
     and valor = 49.90 and dia_vencimento = 10) obrigacoes_odonto_equivalentes_mauro;
