import { defineConfig } from 'vitest/config';

// Escopo explícito: só os testes deste site. `mobile-app/` é outro projeto
// (não versionado, com seu próprio tsconfig) que mora dentro desta pasta —
// nunca deve ser escaneado por nenhuma ferramenta deste repositório.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      '.wrangler/**',
      '.testing/**',
      'mobile-app/**',
      'public/vendor/**',
    ],
  },
});
