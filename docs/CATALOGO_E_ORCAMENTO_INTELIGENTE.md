# Catálogo e Orçamento Inteligente

## Princípio central

O Catálogo Inteligente será a fonte técnica comum para pesquisa, estoque, compras, orçamento, vendas e IA. Cada empresa terá catálogo próprio, isolado por `empresa_id`.

## Central de Importações

A empresa poderá importar PDF, Excel, CSV, imagens, catálogos de fornecedores, listas de produtos e listas de estoque. Antes do processamento, o usuário escolherá uma finalidade: atualizar catálogo, atualizar estoque, criar orçamento, criar pedido de compra, comparar preços ou apenas analisar.

O fluxo obrigatório será:

```text
Arquivo → extração → normalização → correspondência → revisão humana → aprovação → catálogo ou estoque
```

Nenhum dado identificado por IA ou OCR será gravado definitivamente sem conferência humana. Para finalidades que não resultem em catálogo ou estoque, a mesma revisão deverá preceder a criação de qualquer registro operacional.

## Fluxo

1. A empresa importa o catálogo por PDF, Excel, CSV, imagem ou cadastro manual.
2. O sistema extrai os itens sem cadastrá-los definitivamente.
3. O sistema normaliza códigos, descrições, ligas, têmperas, medidas, unidades e pesos.
4. O usuário revisa e aprova.
5. Os produtos aprovados entram no catálogo da empresa.
6. O cliente envia pedido em PDF, planilha, imagem, lista de itens, cotação ou digitação.
7. O sistema identifica os itens.
8. O sistema busca no catálogo da própria empresa e classifica a correspondência como exata, semelhante ou não encontrada.
9. O sistema consulta estoque quando a modalidade exigir.
10. O sistema calcula quantidade, peso, preço, frete, impostos, margem, comissão e desconto.
11. O sistema separa itens encontrados, semelhantes, indisponíveis e não identificados.
12. O usuário revisa itens, correspondências, disponibilidade e cálculos.
13. O sistema gera o orçamento em PDF.
14. Após aprovação do cliente, o orçamento pode virar pedido ou venda, conforme o fluxo aprovado da empresa.
15. Produtos de estoque são reservados.
16. Produtos sob encomenda geram necessidade de produção ou fornecimento.

## Informações técnicas e cálculos

O modelo suportará pesos por metro, barra, peça e quilo; comprimento comercial e solicitado; perda de corte; liga; têmpera; acabamento; pintura; embalagem; frete; impostos; preço mínimo; margem mínima; limite de desconto; validade da proposta; unidades distintas de venda e estoque; precisão e arredondamento.

Os fatores de cálculo serão preservados. Um orçamento emitido não mudará após atualização de peso, custo ou preço no catálogo.

## Indicadores de mercado no orçamento

O orçamento poderá usar regras configuradas pela empresa a partir de LME, dólar, prêmio, transformação, impostos, frete e margem. A empresa definirá se utiliza cotação do dia, média mensal ou fechamento e se o câmbio será comercial ou contratado.

Toda simulação deverá exibir separadamente a cotação, a regra aplicada e o impacto sobre custo, preço e margem. A cotação adotada será registrada no orçamento com fonte, valor, data e hora, permanecendo vinculada à respectiva versão.

Atualizar uma cotação não alterará automaticamente o catálogo ou a tabela comercial. Produtos afetados serão identificados e simulados, mas a aplicação dos novos preços dependerá da aprovação de usuário autorizado e de histórico comparativo entre os valores anteriores e novos.

## Modalidades

- **Estoque:** exige disponibilidade e reserva após aprovação.
- **Sob encomenda:** gera necessidade futura de produção ou fornecimento.
- **Estoque e encomenda:** reserva o disponível e encaminha o saldo restante.

Tarugos terão padrão **Sob encomenda**. Perfis, silício e insumos terão padrão **Estoque**, com alteração permitida por produto e empresa.

## Correspondência e IA

Cada item extraído registrará arquivo e posição de origem, texto original, campos normalizados, método de extração, produto sugerido, alternativas, nível de confiança, usuário revisor e decisão.

A IA não substituirá, cadastrará ou confirmará produtos automaticamente. Resultados semelhantes serão sugestões até confirmação humana.

## Versionamento e rastreabilidade

Orçamentos terão versões rastreáveis com itens, quantidades, pesos, preços, custos, margens, descontos, impostos, frete, validade e condições. O histórico registrará revisões, aprovações, rejeições, conversão em pedido e responsáveis.

Dados revisados manterão o valor extraído e a origem de cada informação.

## Segurança

- Arquivos isolados por empresa e protegidos por autorização.
- Uploads com limites, validação de tipo e proteção contra conteúdo malicioso.
- Extração e OCR em processamento seguro fora do frontend.
- Conversão em pedido e reserva de estoque atômicas e idempotentes.
- Preço mínimo, margem mínima e desconto protegidos no servidor e banco.
