# Saneamento Mauro — contas a pagar

Proposal independente da **Fase 2**, obrigatoriamente antes do endurecimento RLS de `contas_pagar`. Não é migration oficial e não foi executada.

Escopo exclusivo: os quatro UUIDs declarados de `public.contas_pagar`. O único campo alterado é `empresa_id`, de `becf3dd8-33d2-4412-bab6-559b264bed07` para Mauro `8a85591b-2410-405f-8279-910dbcf61011`.

Guards exigem empresa Mauro única, quatro IDs exatos, tenant antigo exato e `ROW_COUNT=4`. Nenhum outro campo ou tabela entra no `UPDATE`.

Jamais executar automaticamente junto do saneamento de contas fixas. Karla, `contas_fixas` e o grupo `8b15d30f-6dcb-487f-9fb8-9d387c7f8b1d` permanecem intocados. O rollback é fail-closed e pode abortar se uma FK exigir a empresa antiga inexistente; backup/roll-forward continua obrigatório.

