# Edição segura de metadados por grupo

Proposta local não executada. O grupo real da moto possui 24 parcelas, 5 pagas e 19 pendentes. Descrição, fornecedor, categoria e observações são idênticos nas 24 linhas.

Não é seguro atualizar as parcelas diretamente pelo navegador: RLS pode ocultar linhas sem produzir rollback, não há guard de quantidade e cinco parcelas pagas seriam reescritas. A proposta cria um cabeçalho de metadados separado por grupo. Nenhum valor, vencimento, status, parcela ou linha paga é alterado.

A tela futura deve sobrepor os metadados do cabeçalho aos dados repetidos das parcelas e continuar calculando valores/status exclusivamente pelas parcelas.

Objetos propostos:

- tabela contas_pagar_pessoais_grupo_metadados;
- policies SELECT, INSERT e UPDATE por auth.uid + empresa;
- RPC SECURITY INVOKER atualizar_metadados_grupo_conta_pessoal;
- versão otimista para impedir sobrescrita concorrente.

O front-end pode liberar imediatamente apenas o resumo/gerenciamento em modo leitura. A edição depende da aplicação controlada desta proposta e posterior integração da RPC.
