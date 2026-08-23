-- SOMENTE LEITURA, para uma futura aplicação aprovada.
select p.id conta_id, p.empresa_id, p.proprietario_id,
       count(d.id) despesas_vinculadas
from public.contas_pagar_pessoais p
left join public.despesas d on d.conta_pagar_pessoal_id = p.id
group by p.id, p.empresa_id, p.proprietario_id
having count(d.id) > 1;

select d.id despesa_id, d.conta_pagar_pessoal_id, d.empresa_id, d.proprietario_id
from public.despesas d
join public.contas_pagar_pessoais p on p.id = d.conta_pagar_pessoal_id
where d.empresa_id is distinct from p.empresa_id
   or d.proprietario_id is distinct from p.proprietario_id;

select conta_id, count(*) filter (where acao = 'Pago') pagamentos,
       count(*) filter (where acao = 'Estornado') estornos
from public.contas_pagar_pessoais_pagamento_eventos
group by conta_id order by conta_id;
