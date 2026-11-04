# Bug reports

Um relatório por defeito intencional. Todos foram reproduzidos pela interface, sem ler o código,
com o script `scripts/evidence.ts`, que grava a captura e os valores observados. As capturas
estão em [`evidencias/`](evidencias/).

| Defeito             | Título                                                         | Severidade | Prioridade |
| ------------------- | -------------------------------------------------------------- | ---------- | ---------- |
| [BUG-01](BUG-01.md) | Desconto global some do total depois de editar a quantidade    | Alta       | Alta       |
| [BUG-02](BUG-02.md) | Preço unitário errado em rolo com quantidade maior que 1       | Alta       | Alta       |
| [BUG-03](BUG-03.md) | Pedido faturado aceita alteração das condições e muda de total | Crítica    | Alta       |
| [BUG-04](BUG-04.md) | Parcelas não somam o total quando a divisão não é exata        | Média      | Alta       |
| [BUG-05](BUG-05.md) | Cancelar nota não devolve o saldo e o pedido continua Faturado | Alta       | Alta       |
| [BUG-06](BUG-06.md) | Painel mostra faturado menor que o total da lista de notas     | Média      | Média      |
| [BUG-07](BUG-07.md) | Botão "Salvar" anuncia Ctrl+S, que abre o "Salvar página"      | Média      | Média      |

## Escalas

| Severidade | Critério                                                                           |
| ---------- | ---------------------------------------------------------------------------------- |
| Crítica    | Altera dado já fechado (pedido faturado, nota) ou quebra a integridade do registro |
| Alta       | Valor financeiro errado ou operação bloqueada, sem contorno simples                |
| Média      | Informação inconsistente ou enganosa, com contorno conhecido                       |
| Baixa      | Problema visual que não muda dado nem decisão                                      |

| Prioridade | Critério                          |
| ---------- | --------------------------------- |
| Alta       | Corrigir antes da próxima entrega |
| Média      | Corrigir na próxima iteração      |
| Baixa      | Corrigir quando a área for mexida |

## Ambiente comum

| Item      | Valor                                                                     |
| --------- | ------------------------------------------------------------------------- |
| Aplicação | Build de produção (`next build` + `next start`), branch `main`            |
| Dados     | Massa do `npm run seed` (semente 20261103) num banco separado             |
| Navegador | Chromium do Playwright 1.64, 1280 × 900, idioma pt-BR, movimento reduzido |
| Sistema   | Windows 10, Node.js 24                                                    |
| Data      | 04/11/2026                                                                |
| Defeitos  | Um por vez, ligado por `PUT /api/qa/bugs` (equivale a `/qa/defeitos`)     |
