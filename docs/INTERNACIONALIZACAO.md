# Diretriz de internacionalização do Cunha Finance

O Cunha Finance deve evoluir como plataforma internacional sem acoplar idioma, moeda ou endereço ao Brasil. A implementação será incremental e não muda os fluxos financeiros atuais.

## Contratos centrais

- `src/app/localization/localizationConfig.js` centraliza idiomas, moedas iniciais, campos geográficos e formatadores.
- Idiomas seguem BCP 47; moedas seguem ISO 4217; fusos devem usar identificadores IANA; países devem evoluir para ISO 3166-1.
- Valores monetários devem ser armazenados como valor e código da moeda. Conversão cambial nunca deve ocorrer implicitamente.
- Endereços usam país, região administrativa, cidade e código postal, sem validações exclusivamente brasileiras.
- `internationalCommercialContracts.js` reserva contratos para canais, fontes legítimas, catálogo internacional e o fluxo comercial assistido futuro.

## Traduções e dados

Novos módulos devem centralizar vocabulários e evitar textos de domínio repetidos. Português do Brasil permanece padrão até existir seletor global persistente. Prospecção reserva país, região, código postal, idioma, moeda, fuso e representante. Persistência remota futura deverá usar `empresa_id`, RLS e auditoria.

## Expansões previstas

- dashboards por país, região, moeda, idioma, representante, segmento e conversão;
- conteúdo localizado e mercados por produto do Catálogo Inteligente;
- propostas e orçamentos com moeda explícita, sem conversão automática;
- atendimento autorizado com detecção de idioma e conferência humana;
- busca comercial somente em fontes legítimas, conforme legislação e termos de uso.

Nenhuma integração externa, coleta automática, migration ou alteração remota faz parte desta etapa.
