import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3100)
const baseURL = `http://127.0.0.1:${PORT}`
// No CI o build é um passo separado; localmente o servidor de teste faz o build antes.
const build = process.env.E2E_SKIP_BUILD ? '' : 'npm run build && '

export default defineConfig({
  testDir: './tests/e2e',
  // O Playwright limpa a pasta de saída a cada execução: fica numa subpasta própria.
  outputDir: './test-results/playwright',
  // Os defeitos ligados valem para o servidor inteiro, então os testes não rodam em paralelo.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    // A verificação por defeito (scripts/e2e-bug-check.ts) grava em arquivos próprios.
    ['html', { open: 'never', outputFolder: process.env.E2E_HTML ?? 'playwright-report' }],
    ['json', { outputFile: process.env.E2E_JSON ?? 'test-results/e2e.json' }],
  ],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@celular/ },
    {
      name: 'celular',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } },
      grep: /@celular/,
    },
  ],
  webServer: {
    command: `${build}npm run seed && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      RETALHO_QA_PAINEL: '1',
      RETALHO_DB_PATH: 'test-results/e2e.db',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
})
