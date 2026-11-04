# Relatório de execução

Gerado por `npm run qa:relatorio` em 04/11/2026, 12:45 (horário de Brasília), sobre o commit
`1129fee`, com Node.js v24.21.0 em win32 10.0.19045. Todos os
números abaixo vêm desta execução. Não edite à mão.

## 1. Resumo

| Suíte            | Arquivos | Testes | Passaram | Falharam | Duração |
| ---------------- | -------- | ------ | -------- | -------- | ------- |
| Unitária         | 10       | 266    | 266      | 0        | 0,1 s   |
| API              | 8        | 80     | 80       | 0        | 1,1 s   |
| E2E (Playwright) | —        | 21     | 21       | 0        | —       |

Com todos os defeitos desligados, todos os testes passaram.

## 2. Matriz de defeitos

Sem defeitos ligados: 346 de 346 testes passaram.
Com cada defeito ligado (`RETALHO_BUGS=n`), as falhas abaixo são as **esperadas**: só testes
etiquetados com o defeito podem falhar.

| Defeito | Testes etiquetados | Falharam (detecção) | Passaram (mascarados) | Falhas sem etiqueta | Resultado |
| ------- | ------------------ | ------------------- | --------------------- | ------------------- | --------- |
| BUG-01  | 1                  | 1                   | 0                     | 0                   | detectado |
| BUG-02  | 5                  | 4                   | 1                     | 0                   | detectado |
| BUG-03  | 3                  | 3                   | 0                     | 0                   | detectado |
| BUG-04  | 4                  | 4                   | 0                     | 0                   | detectado |
| BUG-05  | 3                  | 3                   | 0                     | 0                   | detectado |
| BUG-06  | 1                  | 1                   | 0                     | 0                   | detectado |
| BUG-07  | 1                  | 1                   | 0                     | 0                   | detectado |

### 2.1 Falhas esperadas por defeito

**BUG-01**

- falhou: RF-17 · editar quantidade e remover item [BUG-01] reaplica o desconto global depois de editar a quantidade

**BUG-02**

- falhou: RF-16 · preço unitário e total do item [BUG-02] 2 rolo(s) de 5 m a R$ 4,00/m: unitário R$ 20,00 e total de 4000 centavos
- falhou: RF-16 · preço unitário e total do item [BUG-02] 3 rolo(s) de 5 m a R$ 4,00/m: unitário R$ 20,00 e total de 6000 centavos
- falhou: RF-16 · preço unitário e total do item [BUG-02] 4 rolo(s) de 5 m a R$ 4,00/m: unitário R$ 20,00 e total de 8000 centavos
- falhou: RF-14 a RF-16 · itens do pedido [BUG-02] rolo de 5 m a R$ 4,00/m com quantidade 4: unitário R$ 20,00 e total R$ 80,00
- passou com o defeito ligado (mascarado): RF-16 · preço unitário e total do item [BUG-02] 1 rolo(s) de 5 m a R$ 4,00/m: unitário R$ 20,00 e total de 2000 centavos

**BUG-03**

- falhou: RF-25 a RF-29 · máquina de estados do pedido [BUG-03] invoiced + save → ORDER_NOT_EDITABLE
- falhou: RF-26, RF-27 · alterações só em rascunho [BUG-03] PUT em pedido faturado devolve 409 e o total não muda
- falhou: RF-31 · ordem de verificação dos erros [BUG-03] desconto de 101 % em pedido faturado devolve 409, não 422

**BUG-04**

- falhou: RF-23 · valor das parcelas [BUG-04] R$ 100,00 em 3 parcela(s): a última absorve os centavos e a soma é o total
- falhou: RF-23 · valor das parcelas [BUG-04] R$ 10,00 em 3 parcela(s): a última absorve os centavos e a soma é o total
- falhou: RF-23 · valor das parcelas [BUG-04] R$ 0,10 em 3 parcela(s): a última absorve os centavos e a soma é o total
- falhou: RF-18 a RF-23 · cabeçalho, frete e parcelas [BUG-04] R$ 100,00 em 3 parcelas: R$ 33,33 + R$ 33,33 + R$ 33,34

**BUG-05**

- falhou: RF-38 · vendido = faturado + a faturar [BUG-05] a igualdade vale depois de emitir e cancelar notas
- falhou: RF-34 · cancelar nota [BUG-05] devolve o saldo e recalcula o estado do pedido
- falhou: RF-30 · histórico do pedido [BUG-05] finalizar, faturar em duas notas e cancelar uma gera quatro registros

**BUG-06**

- falhou: RF-37, RF-39 · faturado igual à lista e painel sempre atualizado [BUG-06] depois de emitir e cancelar notas, painel e lista mostram o mesmo faturado

**BUG-07**

- falhou: RF-40 · botões sem atalhos que conflitam com o navegador [BUG-07] o botão de salvar o pedido se chama "Salvar" e não anuncia atalho

### 2.2 Matriz de defeitos dos E2E

A suíte E2E inteira roda uma vez com cada defeito ligado (`npm run test:e2e:defeitos`).

| Defeito | Testes etiquetados | Falharam (detecção) | Falhas sem etiqueta | Resultado |
| ------- | ------------------ | ------------------- | ------------------- | --------- |
| BUG-01  | 1                  | 1                   | 0                   | detectado |
| BUG-02  | 1                  | 1                   | 0                   | detectado |
| BUG-03  | 1                  | 1                   | 0                   | detectado |
| BUG-04  | 1                  | 1                   | 0                   | detectado |
| BUG-05  | 1                  | 1                   | 0                   | detectado |
| BUG-06  | 1                  | 1                   | 0                   | detectado |
| BUG-07  | 1                  | 1                   | 0                   | detectado |

## 3. Cobertura de código

Medida pelo provedor V8 do Vitest nas suítes unitária e de API. As telas (`src/app`, exceto
as rotas de API) e os componentes são cobertos pelos testes E2E, que não entram nesta conta.

| Pasta         | Arquivos | Linhas  | Comandos | Ramos  | Funções |
| ------------- | -------- | ------- | -------- | ------ | ------- |
| `src/domain`  | 13       | 97,1 %  | 96,6 %   | 93,7 % | 97,8 %  |
| `src/server`  | 9        | 97,7 %  | 95,9 %   | 86,3 % | 97,5 %  |
| `src/db`      | 4        | 100,0 % | 99,1 %   | 96,2 % | 95,7 %  |
| `src/app/api` | 15       | 100,0 % | 100,0 %  | 90,0 % | 100,0 % |
| **Total**     | 41       | 98,0 %  | 97,0 %   | 91,6 % | 97,7 %  |

## 4. Cobertura de requisitos

Da matriz de rastreabilidade (`qa/04-matriz-de-rastreabilidade.md`):

| Medida                                          | Valor      |
| ----------------------------------------------- | ---------- |
| Requisitos com caso de teste                    | 51 (100 %) |
| Requisitos com teste automatizado que cita o ID | 49 (96 %)  |

## 5. Testes por arquivo

| Arquivo                           | Testes | Falharam |
| --------------------------------- | ------ | -------- |
| `tests/api/contract.test.ts`      | 16     | 0        |
| `tests/api/customers.test.ts`     | 9      | 0        |
| `tests/api/dashboard.test.ts`     | 4      | 0        |
| `tests/api/invoices.test.ts`      | 8      | 0        |
| `tests/api/orders.test.ts`        | 29     | 0        |
| `tests/api/products.test.ts`      | 8      | 0        |
| `tests/api/qa-bugs.test.ts`       | 4      | 0        |
| `tests/api/seed.test.ts`          | 2      | 0        |
| `tests/unit/bugs.test.ts`         | 18     | 0        |
| `tests/unit/documents.test.ts`    | 34     | 0        |
| `tests/unit/format.test.ts`       | 28     | 0        |
| `tests/unit/installments.test.ts` | 6      | 0        |
| `tests/unit/labels.test.ts`       | 11     | 0        |
| `tests/unit/money.test.ts`        | 24     | 0        |
| `tests/unit/order-state.test.ts`  | 28     | 0        |
| `tests/unit/pricing.test.ts`      | 26     | 0        |
| `tests/unit/units.test.ts`        | 23     | 0        |
| `tests/unit/validation.test.ts`   | 68     | 0        |

## 6. Critérios de saída do plano de teste

| Critério                                                    | Situação |
| ----------------------------------------------------------- | -------- |
| Testes unitários e de API passam com os defeitos desligados | atendido |
| Testes E2E passam com os defeitos desligados                | atendido |
| Os 7 defeitos detectados, sem falha fora das etiquetas      | atendido |
| 100 % dos requisitos com caso de teste                      | atendido |
