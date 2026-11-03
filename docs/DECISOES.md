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

## Fase 1 · Especificação

### D-10 · Dinheiro em centavos e arredondamento meio para cima

- **Decisão:** guardar valores em centavos inteiros e arredondar meio para cima, no centavo, em
  apenas três pontos: preço do rolo, total do item e valor do desconto (SPEC 1.2).
- **Alternativas:** números de ponto flutuante; arredondamento bancário (meio para o par);
  arredondar só o total do pedido.
- **Motivo:** centavos inteiros eliminam erros de ponto flutuante. O arredondamento meio para
  cima é o que o usuário espera de uma calculadora, e poucos pontos de arredondamento deixam cada
  resultado reproduzível à mão.

### D-11 · Quantidade máxima de 1.000 para todas as unidades

- **Decisão:** a quantidade vai de 0,01 a 1.000 em qualquer unidade. Metro aceita 2 casas
  decimais; rolo e unidade só aceitam inteiros (RF-15).
- **Alternativas:** um limite diferente por unidade; nenhum limite máximo.
- **Motivo:** um limite único gera valores limite claros (1.000, 1.000,01 e 1.001). A regra de
  inteiros cria uma partição interessante: 0,01 é válido para metro e inválido para rolo.

### D-12 · Regra de frete grátis com três condições

- **Decisão:** o frete é grátis quando valor líquido ≥ R$ 300,00 **e** pagamento por Pix **e** CEP
  do cliente entre `01000-000` e `09999-999` (RF-20).
- **Alternativas:** condições combinadas com "ou"; faixas de valor com descontos de frete;
  condição pelo tipo de cliente (PF ou PJ).
- **Motivo:** três condições independentes ligadas por "e" formam uma tabela de decisão completa de
  8 regras, fácil de reduzir. As condições de valor e de CEP têm limites testáveis dos dois lados.
  O CEP reaproveita um campo que o cliente já tem.

### D-13 · CNPJ alfanumérico aceito

- **Decisão:** aceitar CNPJ numérico e alfanumérico, com o algoritmo público de dígitos
  verificadores (RF-08).
- **Alternativas:** aceitar só o CNPJ numérico.
- **Motivo:** a Receita Federal passou a atribuir CNPJs alfanuméricos em 2026. Recusar esse
  formato seria um defeito não intencional. O algoritmo foi conferido com o exemplo público
  `12ABC34501DE` → `35`.

### D-14 · Faturamento por valor

- **Decisão:** a nota fatura um valor em reais (até o saldo), e não quantidades de itens
  (RF-32, RF-33).
- **Alternativas:** faturar por item e quantidade.
- **Motivo:** faturar por item exigiria ratear desconto e frete entre os itens, com novos
  arredondamentos fora do escopo. Por valor, o saldo é um único número, coerente com o painel.

### D-15 · Ações repetidas são idempotentes

- **Decisão:** repetir "Finalizar pedido", "Cancelar pedido" ou "Cancelar nota" sobre algo que
  já está no estado de destino devolve 200 sem mudança e sem novo registro no histórico
  (RF-28, RF-29, RF-34).
- **Alternativas:** devolver 409 na repetição.
- **Motivo:** um duplo clique ou um reenvio de rede não deve gerar erro nem efeito duplicado. O
  histórico (RF-30) permite provar que houve uma só transição.

### D-16 · Ordem de verificação 404 → 409 → 422

- **Decisão:** primeiro a existência do recurso, depois o estado, depois os dados (RF-31).
- **Alternativas:** validar os dados antes do estado.
- **Motivo:** um pedido bloqueado responde "bloqueado" qualquer que seja o corpo. Assim a resposta
  sobre o estado é previsível e não depende de montar um corpo válido.

### D-17 · Cancelar pedido só sem nota emitida

- **Decisão:** um pedido só pode ser cancelado em rascunho ou finalizado. Com nota emitida, as
  notas precisam ser canceladas antes (RF-26, RF-29).
- **Alternativas:** cancelar o pedido cancelando as notas em cascata.
- **Motivo:** desfazer faturamento deve ser uma ação explícita, nota a nota. A máquina de estados
  fica menor e cada transição tem um único efeito.

### D-18 · Mesma regra de motivo para pedido e nota

- **Decisão:** o motivo de cancelamento tem de 10 a 200 caracteres, sem contar espaços nas
  pontas, tanto no pedido quanto na nota.
- **Alternativas:** motivo só no pedido, ou regras diferentes para cada um.
- **Motivo:** uma regra única é mais fácil de aprender, de explicar na tela e de testar nos
  limites (9, 10, 200 e 201 caracteres).

### D-19 · Cada produto aparece uma vez no pedido

- **Decisão:** incluir um produto que já está no pedido devolve 409 `DUPLICATE_ITEM` (RF-14).
- **Alternativas:** somar a quantidade ao item existente; permitir linhas repetidas.
- **Motivo:** mudar a quantidade é uma ação explícita, a edição do item. Somar de forma escondida
  confundiria o total, e linhas repetidas complicariam a leitura do pedido.

### D-20 · Itens copiam o produto e o pedido congela na finalização

- **Decisão:** o item guarda nome, unidade, comprimento e preço do momento da inclusão, e o pedido
  fixa total, frete e parcelas ao ser finalizado (RF-03, RF-24).
- **Alternativas:** ler sempre os dados atuais do produto e do cliente.
- **Motivo:** editar um cadastro não pode alterar pedidos já fechados nem o que já foi faturado.

### D-21 · Defeitos parciais, que preservam o caminho feliz

- **Decisão:** cada defeito afeta um caminho específico: o BUG-01 só a edição de quantidade, o
  BUG-03 só o estado Faturado, o BUG-06 só as ações de nota.
- **Alternativas:** defeitos que quebram a funcionalidade inteira.
- **Motivo:** defeitos reais costumam ser parciais. Um defeito que quebra tudo seria achado por
  qualquer teste de fumaça e não exercitaria nenhuma técnica de projeto de testes.
