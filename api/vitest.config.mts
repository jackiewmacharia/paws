import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: { include: ['src/**/*.ts'], reportsDirectory: 'coverage' },
    projects: [
      { test: { name: 'unit', include: ['src/**/*.spec.ts'] } },
      { test: { name: 'e2e', include: ['test/**/*.e2e-spec.ts'] } },
    ],
  },
});
