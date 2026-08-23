# Saneamento isolado — conta fixa ID 5 de Mauro

Status: **proposta local, não executada**.

O usuário confirmou que `public.contas_fixas.id = 5` (`ODONTOCOMPANY`, R$ 49,90, dia 10) pertence a Mauro. Esta proposta reassocia exclusivamente esse registro do tenant legado `becf3dd8-33d2-4412-bab6-559b264bed07` para a empresa atual de Mauro `8a85591b-2410-405f-8279-910dbcf61011`.

O ID 3 é duplicidade lógica do ID 7 e fica expressamente fora do `UPDATE`: permanece preservado no tenant legado, sem reassociação e sem exclusão.

Esta proposta substitui, para qualquer execução futura, as propostas antigas que moviam conjuntamente os IDs 3 e 5. Os arquivos antigos permanecem apenas como histórico local e não devem ser executados.

Ordem futura obrigatória:

1. executar `01_preflight_readonly.sql`;
2. obter autorização explícita de escrita;
3. executar somente `02_reassociacao_controlada_proposta.sql`;
4. executar `03_validacao_pos_aplicacao.sql`;
5. somente depois reavaliar o hardening de RLS.

Nenhum SQL desta pasta foi executado.
