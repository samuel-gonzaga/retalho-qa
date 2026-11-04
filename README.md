# Projeto Retalho

Loja de tecidos fictícia (tecido por metro, rolos e aviamentos) construída como peça de portfólio
de QA: uma aplicação web funcional com **7 defeitos intencionais**, ligados um a um, e uma suíte
de QA que os detecta.

> Em construção. Documentação completa ao fim do projeto. Acompanhe em
> [`docs/PROGRESSO.md`](docs/PROGRESSO.md).

## Documentação

- [`docs/SPEC.md`](docs/SPEC.md): especificação com 51 requisitos numerados (RF e RNF), máquina de
  estados, contrato da API, mensagens de erro e os 7 defeitos intencionais.
- [`docs/DESIGN.md`](docs/DESIGN.md): direção de design, tokens, revisão contra a especificação e
  autocrítica sobre as capturas de tela.
- [`docs/DECISOES.md`](docs/DECISOES.md): decisões tomadas, com alternativas e motivos.
- [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md): o que ainda está em aberto.
- [`qa/`](qa/README.md): plano de teste, 73 casos de teste, bug reports com evidência, matriz de
  rastreabilidade, charters exploratórios e relatório de execução.

`npm run docs:check` confere se os IDs são únicos, se cada requisito tem critério de aceite e se
nenhum documento cita um ID inexistente.

## Como rodar

Requer Node.js 22 ou mais novo.

```bash
npm install
npm run seed
npm run dev
```

Abra `http://localhost:3000`. O `next dev` bloqueia o acesso por `127.0.0.1`; use `localhost`.

| Tela        | Endereço       | O que faz                                              |
| ----------- | -------------- | ------------------------------------------------------ |
| Painel      | `/`            | Vendido, faturado e a faturar                          |
| Pedidos     | `/pedidos`     | Itens, desconto, frete, parcelas, finalizar e cancelar |
| Faturamento | `/faturamento` | Notas totais ou parciais, saldo e cancelamento de nota |
| Produtos    | `/produtos`    | Tecido por metro, rolos e aviamentos: busca e cadastro |
| Clientes    | `/clientes`    | PF e PJ, com CPF, CNPJ (inclusive alfanumérico) e CEP  |

| Comando                      | O que faz                                                        |
| ---------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                | Sobe a aplicação em modo de desenvolvimento                      |
| `npm run seed`               | Recria a massa fictícia (sempre a mesma) em `data/retalho.db`    |
| `npm run lint`               | ESLint (zero avisos) e verificação do Prettier                   |
| `npm test`                   | Testes unitários (Vitest)                                        |
| `npm run test:api`           | Testes de API (Vitest, banco em memória)                         |
| `npm run test:defeitos`      | Matriz de defeitos: roda as suítes com cada defeito ligado       |
| `npm run test:e2e`           | Testes E2E (Playwright)                                          |
| `npm run docs:check`         | Confere os IDs citados na documentação, no código e nos testes   |
| `npm run qa:rastreabilidade` | Gera a matriz de rastreabilidade a partir de uma execução real   |
| `npm run qa:relatorio`       | Gera o relatório de execução, com cobertura e matriz de defeitos |

## Defeitos intencionais

Todos ficam desligados por padrão. Para ligar ao iniciar:

```bash
RETALHO_BUGS=1,3,5 npm run dev
```

Fora de produção, a página `/qa/defeitos` liga e desliga cada defeito em tempo de execução.

Cada defeito vive em um único ponto do código, marcado com `// BUG-n` e ligado por `isBugOn(n)`.
Os testes que o detectam levam `[BUG-0n]` no título. A matriz de defeitos
(`npm run test:defeitos`) prova que cada teste falha com o seu defeito ligado e que nenhum outro
teste falha.

Todos os dados são fictícios e gerados por script.
