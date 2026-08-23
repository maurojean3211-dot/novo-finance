-- SOMENTE LEITURA. Esperado antes da reassociação: todos os guards iguais a 1,
-- exceto duplicidade_odonto_mauro, que deve ser 0.
select id, name, user_id
from public.empresas
where id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid;

select id, empresa_id, descricao, valor, dia_vencimento, frequencia, ativo, created_at
from public.contas_fixas
where id in (3, 4, 5, 7)
order by id;

select
  (select count(*) from public.empresas
   where id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) empresa_mauro,
  (select count(*) from public.usuarios
   where id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
     and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid) usuario_mauro,
  (select count(*) from public.contas_fixas
   where id = 5
     and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
     and descricao = 'ODONTOCOMPANY'
     and valor = 49.90
     and dia_vencimento = 10
     and frequencia = 'Mensal'
     and ativo is true) id5_exato_no_legado,
  (select count(*) from public.contas_fixas
   where id = 3
     and empresa_id = 'becf3dd8-33d2-4412-bab6-559b264bed07'::uuid
     and descricao = 'ALUGUEL APARTAMENTO'
     and valor = 1947.64
     and dia_vencimento = 11
     and frequencia = 'Mensal'
     and ativo is true) id3_preservado,
  (select count(*) from public.contas_fixas
   where id = 7
     and empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
     and descricao = 'aluguel apartamento'
     and valor = 1947.64
     and dia_vencimento = 11
     and frequencia = 'Mensal'
     and ativo is true) id7_canonico,
  (select count(*) from public.contas_fixas
   where id = 4
     and empresa_id = '3c5ce0fd-20a9-4558-8918-cc7eb8f9d2ef'::uuid
     and descricao = 'ODONTO COMPANY'
     and valor = 59.90
     and dia_vencimento = 10
     and frequencia = 'Mensal'
     and ativo is true) id4_karla_preservado,
  (select count(*) from public.contas_fixas
   where empresa_id = '8a85591b-2410-405f-8279-910dbcf61011'::uuid
     and regexp_replace(lower(btrim(descricao)), '[^a-z0-9]', '', 'g') = 'odontocompany'
     and valor = 49.90
     and dia_vencimento = 10) duplicidade_odonto_mauro;
