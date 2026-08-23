# Checkpoints STOP/GO

| Etapa | GO | STOP | Recuperação |
|---|---|---|---|
| 0 | backup/restore comprovados | backup incompleto | não iniciar |
| 1 | preflight 100% idêntico | qualquer divergência | nova auditoria |
| 2 | audit log protegido | acesso anon/authenticated | roll-forward restritivo; rollback só sem uso |
| 3 | RPC idempotente e grants mínimos | PUBLIC/anon executa ou tenant controlável | revogar EXECUTE/corrigir |
| 4 | Edge saudável, flags OFF | segredo cliente/JWT falho | desabilitar; rotacionar segredo se exposto |
| 5 | 401/403 corretos e auditoria | ação sem target/cross-tenant/log ausente | desabilitar Edge |
| 6 | exatamente IDs 3 e 5 em Mauro | row count/outro campo divergente | abortar; rollback explícito após diagnóstico |
| 7 | empréstimos funcionais | erro/schema inesperado | corrigir local; não aplicar RLS |
| 8 | transação e validação integrais | falha/policy/grant divergente | antes do commit reverte; depois, roll-forward |
| 9 | fluxos legítimos com flags OFF | zero rows/403 indevido ou vazamento | flags OFF; correção aprovada |
| 10 | signup/RPC idempotentes | duplicidade/privilégio/tenant arbitrário | flag OFF |
| 11 | target e auditoria corretos | cross-tenant indevido/log ausente | flag OFF/desabilitar Edge |
| 12 | matriz integral aprovada | qualquer vazamento/quebra | NO-GO |
| 13 | métricas estáveis | erros/anomalia de auditoria | flags OFF e roll-forward |
| 14 | quatro IDs exatos em Mauro | 8b15/outro registro tocado | abortar transação |
| 15 | ownership e proposal aprovados | regra indefinida | manter fora |

Após commit com tráfego, preferir roll-forward mínimo. É proibido restaurar policy aberta/grant amplo. Toda decisão registra operador, aprovador, timestamp, evidência e hash.

