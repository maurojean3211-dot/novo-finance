# Regras de Negócio

## Operações atendidas

- Compra e venda de perfis de alumínio.
- Venda de tarugos de alumínio sob encomenda.
- Compra e venda de silício.
- Compra e venda de insumos para fundição e processamento de alumínio.
- Compras de materiais, vendas, estoque, orçamentos, CRM, financeiro e prospecção comercial.

Todos os registros operacionais deverão ser isolados por `empresa_id`.

## Modalidades de fornecimento

- **Estoque:** atendimento condicionado à disponibilidade física.
- **Sob encomenda:** atendimento por produção ou fornecimento futuro.
- **Estoque e encomenda:** usa a disponibilidade atual e permite completar a quantidade futuramente.

Tarugos de alumínio terão como padrão **Sob encomenda**. Perfis de alumínio, silício e insumos industriais terão como padrão **Estoque**. A modalidade será configurável por produto e empresa, sem regras rígidas no código. Alterar o padrão de uma categoria não deverá sobrescrever produtos já configurados.

## Estados de estoque

- **Físico:** quantidade recebida e armazenada.
- **Reservado:** parcela física comprometida com pedidos.
- **Disponível:** físico menos reservas válidas e bloqueios.
- **Futuro:** quantidade prevista, ainda não recebida.

Estoque futuro não é disponibilidade física. Reservas, liberações, entradas, saídas e ajustes deverão gerar movimentações rastreáveis, e não apenas alterar saldo.

## Produtos e cálculos

O produto preservará código, descrição técnica, categoria, liga, têmpera, acabamento, dimensões, unidades, pesos, modalidade e origem. Conversões entre metro, barra, peça e quilo usarão fatores versionados e precisão definida.

Preço, peso, frete, impostos, perdas, margem e desconto registrarão os parâmetros usados na proposta ou pedido. Atualizações posteriores do catálogo não modificarão documentos já emitidos.

## IA e aprovação humana

- Toda extração, correspondência, cálculo ou sugestão de IA informará origem e confiança.
- A IA não poderá cadastrar, substituir ou vincular automaticamente um produto sem confirmação humana.
- Itens semelhantes serão alternativas, nunca equivalências confirmadas.
- Alterações que afetem catálogo, estoque, preço, orçamento, pedido ou financeiro exigirão aprovação explícita.
- O histórico manterá o valor original, a sugestão e a decisão humana.

## CRM, prospecção e comunicação

O CRM deverá registrar leads, oportunidades, funil, atividades, responsáveis e histórico de contatos. A prospecção poderá pesquisar potenciais clientes por região e segmento, com deduplicação e qualificação.

O sistema poderá preparar listas e mensagens para envio manual. Futuramente, poderá realizar envio controlado após aprovação humana. Toda comunicação deverá manter histórico, oferecer opt-out e observar a LGPD. A IA não enviará e-mail sem aprovação.

## IA Comercial

A IA poderá destacar pedidos recebidos, orçamentos aguardando resposta, clientes sem contato, itens não encontrados, estoque insuficiente, pedidos atendíveis, produtos sob encomenda, alertas de estoque, resumos de oportunidades e sugestões de próximos passos.

A IA não poderá alterar estoque, substituir produto, confirmar orçamento, enviar e-mail ou criar venda definitiva sem revisão e confirmação humanas.

## Cotações e formação de preço

Cada empresa poderá configurar o uso da cotação do dia, média mensal ou cotação de fechamento; dólar comercial ou contratado; prêmio por liga ou produto; margem mínima e tolerância de variação.

Uma regra configurável poderá usar como referência:

```text
Preço-base = LME convertido pelo dólar
           + prêmio
           + transformação
           + impostos
           + frete
           + margem comercial
```

O sistema nunca atualizará preços comerciais automaticamente. O fluxo obrigatório será:

```text
Cotação atualizada
→ produtos afetados
→ simulação de novos preços
→ análise do impacto na margem
→ aprovação do responsável
→ atualização da tabela comercial
```

A aprovação registrará fonte, data, hora, usuário, cotação anterior, nova cotação, produtos afetados e motivo. Alertas de variação serão informativos e não autorizarão mudanças automáticas.
