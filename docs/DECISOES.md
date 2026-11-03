# Registro de decisões

Cada decisão tomada sem consulta fica registrada aqui: o que foi decidido, as alternativas e o
motivo. Os IDs são estáveis; uma decisão revista ganha uma nova entrada que cita a anterior.

## Fase 0 · Fundação

### D-01 · TypeScript 6.0 e ESLint 9

- **Decisão:** fixar `typescript@6.0.3` e `eslint@9`.
- **Alternativas:** TypeScript 7 (compilador nativo) e ESLint 10, as versões mais novas.
- **Motivo:** o `typescript-eslint` usado pelo `eslint-config-next@16` aceita TypeScript abaixo de
  6.1, e os plugins `react`, `import` e `jsx-a11y` aceitam ESLint até a versão 9.

### D-02 · Configuração manual do Next.js

- **Decisão:** montar `package.json`, `tsconfig.json` e configurações à mão, sem `create-next-app`.
- **Alternativas:** `create-next-app` em pasta temporária e cópia dos arquivos.
- **Motivo:** o repositório já existia com `README.md` e histórico; a montagem manual deixa cada
  arquivo de configuração intencional e revisável.

### D-03 · Quando a área /qa/defeitos fica disponível

- **Decisão:** a página `/qa/defeitos` e a API `/api/qa/bugs` funcionam quando
  `NODE_ENV !== 'production'` ou quando `RETALHO_QA_PAINEL=1`. Caso contrário, devolvem 404.
- **Alternativas:** depender só do `NODE_ENV`, o que impediria os testes E2E contra
  `next start`; criar uma variável de ambiente liberada por padrão, insegura por padrão.
- **Motivo:** fica bloqueada por padrão em produção e continua testável no CI com uma liberação
  explícita.

### D-04 · Estado dos defeitos ligados em tempo de execução

- **Decisão:** guardar as mudanças feitas em `/qa/defeitos` na memória do processo
  (`globalThis`). Reiniciar o servidor volta ao valor de `RETALHO_BUGS`.
- **Alternativas:** persistir em tabela SQLite ou em cookie por visitante.
- **Motivo:** é a opção mais simples. `RETALHO_BUGS` é a fonte durável e os testes controlam o
  estado pela API. O `globalThis` garante um estado único mesmo quando o Next carrega o módulo em
  mais de um bundle.

### D-05 · Idioma de rotas, chaves e mensagens

- **Decisão:** as URLs de tela ficam em português (`/qa/defeitos`, `/pedidos`). Rotas de API e
  chaves JSON ficam em inglês (`/api/qa/bugs`, `active`). As mensagens de erro ficam em português,
  no formato `{ "error": { "code", "message" } }`.
- **Alternativas:** tudo em português ou tudo em inglês.
- **Motivo:** segue a regra do projeto (interface em português, nomes técnicos em inglês). A
  mensagem de erro chega ao usuário, então fica em português.

### D-06 · Estilo de código

- **Decisão:** Prettier sem ponto e vírgula, com aspas simples, largura 100 e LF. O
  `.gitattributes` força LF no checkout. `npm run lint` roda ESLint (zero avisos) e Prettier.
- **Alternativas:** os padrões do Prettier ou o lint sem verificação de formatação.
- **Motivo:** um único comando valida estilo e regras. O LF evita falsos alertas do Prettier em
  clones feitos no Windows.

### D-07 · Registro de fim de fase em PROGRESSO.md

- **Decisão:** a linha de cada fase registra o hash do commit `chore(faseN): conclui ...` e o
  resultado do push dele. A linha entra logo depois, num commit `docs(progresso)`, publicado na
  sequência.
- **Alternativas:** registrar o hash do commit anterior, ou deixar o registro para a fase seguinte.
- **Motivo:** um commit não consegue conter o próprio hash. Assim o registro é exato e nada fica
  sem publicar.

### D-08 · Projetos de teste

- **Decisão:** `npm test` roda o projeto Vitest `unit` e `npm run test:api` roda o projeto `api`.
  O Playwright roda contra o build de produção (`next build && next start`) na porta 3100, com um
  worker.
- **Alternativas:** um único comando Vitest, ou E2E contra `next dev`.
- **Motivo:** permite que o CI separe as etapas. O estado dos defeitos é global ao servidor, por
  isso os testes E2E não podem rodar em paralelo. O build de produção é mais estável que o modo de
  desenvolvimento.

### D-09 · Alertas do npm audit

- **Decisão:** aceitar os 16 alertas moderados de `minimatch`, que só existe como dependência de
  desenvolvimento do ESLint.
- **Alternativas:** `npm audit fix --force`.
- **Motivo:** a correção forçada troca versões principais e quebra o ESLint. O código não roda em
  produção e não recebe entrada externa.
