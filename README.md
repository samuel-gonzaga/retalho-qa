# Projeto Retalho

Loja de tecidos fictícia (tecido por metro, rolos e aviamentos) construída como peça de portfólio
de QA: uma aplicação web funcional com **7 defeitos intencionais**, ligados um a um, e uma suíte
de QA que os detecta.

> Em construção. Documentação completa ao fim do projeto. Acompanhe em
> [`docs/PROGRESSO.md`](docs/PROGRESSO.md).

## Documentação

- [`docs/SPEC.md`](docs/SPEC.md): especificação com 51 requisitos numerados (RF e RNF), máquina de
  estados, contrato da API, mensagens de erro e os 7 defeitos intencionais.
- [`docs/DECISOES.md`](docs/DECISOES.md): decisões tomadas, com alternativas e motivos.
- [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md): o que ainda está em aberto.

`npm run docs:check` confere se os IDs são únicos, se cada requisito tem critério de aceite e se
nenhum documento cita um ID inexistente.

## Como rodar

Requer Node.js 22 ou mais novo.

```bash
npm install
npm run dev
```

| Comando            | O que faz                                      |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Sobe a aplicação em modo de desenvolvimento    |
| `npm run lint`     | ESLint (zero avisos) e verificação do Prettier |
| `npm test`         | Testes unitários (Vitest)                      |
| `npm run test:api` | Testes de API (Vitest)                         |
| `npm run test:e2e` | Testes E2E (Playwright)                        |
| `npm run seed`     | Gera a massa de dados fictícia                 |

## Defeitos intencionais

Todos ficam desligados por padrão. Para ligar ao iniciar:

```bash
RETALHO_BUGS=1,3,5 npm run dev
```

Fora de produção, a página `/qa/defeitos` liga e desliga cada defeito em tempo de execução.

Todos os dados são fictícios e gerados por script.
