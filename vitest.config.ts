import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // Component/page tests opt into jsdom per-file via a
    // `// @vitest-environment jsdom` docblock, so pure-logic tests (the
    // majority) keep running under the faster node environment.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setupTests.ts'],
    // No thresholds yet — coverage is still thin (a first layer of page smoke
    // tests, CLAUDE.md §9). Reporting first, gate on numbers once there's a
    // baseline worth enforcing.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/app/components/ui/**', 'src/sw.ts', 'src/main.tsx'],
    },
  },
})
