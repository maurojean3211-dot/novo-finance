# Saneamento Mauro — contas fixas

Proposal independente da **Fase 1**, obrigatoriamente antes do RLS de `contas_fixas`. Não é migration oficial e não foi executada.

Escopo exclusivo: `public.contas_fixas`, IDs `3` (`ALUGUEL APARTAMENTO`) e `5` (`ODONTOCOMPANY`). O único campo alterado é `empresa_id`, de `becf3dd8-33d2-4412-bab6-559b264bed07` para Mauro `8a85591b-2410-405f-8279-910dbcf61011`.

Guards exigem empresa Mauro única, dois IDs exatos, tenant antigo exato, descrições esperadas e `ROW_COUNT=2`. Valor, descrição, vencimento, frequência, ativo e demais campos não entram no `SET`.

Jamais executar automaticamente junto do saneamento de contas a pagar. Karla e o grupo `8b15d30f-6dcb-487f-9fb8-9d387c7f8b1d` permanecem intocados. O rollback é fail-closed e pode abortar se uma FK exigir a empresa antiga inexistente; backup/roll-forward continua obrigatório.

