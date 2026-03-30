import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.smoke.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
});
