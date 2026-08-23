# Proposta de saneamento dos registros legados do Mauro

## Objetivo

Reassociar exclusivamente seis registros confirmados, alterando somente `empresa_id` de `becf3dd8-33d2-4412-bab6-559b264bed07` para Mauro `8a85591b-2410-405f-8279-910dbcf61011`. É **proposal**, não migration oficial, e exige autorização expressa.

## Escopo e garantias

- `contas_fixas`: IDs `3` e `5`.
- `contas_pagar`: quatro UUIDs explicitamente listados.
- O `WHERE` combina ID explícito e tenant antigo; não há UPDATE genérico.
- `GET DIAGNOSTICS` exige exatamente 2 e 4 alterações, numa única transação.
- Karla, grupo `8b15`, vendas, recebimentos, valores, datas, descrições, status e outros campos ficam fora.
- Empresa Mauro deve existir; qualquer ID, quantidade ou tenant divergente aborta tudo.

## Pré-requisitos e riscos

Revisar o preflight imediatamente antes de futura execução autorizada, manter backup/janela controlada e validar visibilidade sob RLS. Concorrência entre preflight e aplicação continua sendo risco operacional.

O rollback usa os mesmos seis IDs e somente a troca inversa. Ele aborta se os registros não estiverem exatamente em Mauro ou se uma FK exigir a empresa antiga inexistente; recriar `becf` está fora do escopo.
