# Pendências

Itens que ficaram incompletos ou dependem de ação fora do código. Cada item informa a fase, o
impacto, o que falta e a situação atual.

## Abertas

| ID   | Fase | Pendência                                                                                                                                                                                                                      | Impacto                                        | Ação sugerida                                                                                                    |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| P-04 | 2    | Lacuna da especificação: um pedido finalizado com total de R$ 0,00 (desconto de 100 % e frete grátis ou zero) nunca pode ser faturado, porque a nota exige valor maior que zero (RF-32). O pedido fica Finalizado para sempre. | Caso raro; não é um dos defeitos intencionais. | Levar a pergunta ao charter exploratório da Fase 4 e decidir se o pedido de total zero vai direto para Faturado. |

## Resolvidas

| ID   | Fase | Pendência                                                                           | Resolução                                                                                                                                                                   |
| ---- | ---- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | 0    | `git config user.name` não estava definido; os commits saíam com o autor `unknown`. | O autor configurou o nome em 2026-11-03. Os commits já publicados da Fase 0 mantêm o autor `unknown`, porque reescrever histórico publicado é proibido pelas regras de Git. |
| P-02 | 0    | `npm run seed` só exibia uma mensagem.                                              | Resolvida na Fase 2: o seed gera 18 produtos, 15 clientes, 12 pedidos em todos os estados e 8 notas, sempre iguais (RNF-03).                                                |
| P-03 | 1    | `PUT /api/qa/bugs` devolvia 422 para corpo que não é JSON.                          | Resolvida na Fase 2: a rota usa o tratamento de erro comum e devolve 400 `INVALID_JSON` (RNF-11).                                                                           |
