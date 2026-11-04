import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // Ligada só com --coverage (npm run qa:relatorio).
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/server/**', 'src/db/**', 'src/app/api/**'],
      exclude: ['src/db/seed.ts'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'test-results/cobertura',
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'api',
          include: ['tests/api/**/*.test.ts'],
          env: { RETALHO_DB_PATH: ':memory:' },
        },
      },
    ],
  },
})
