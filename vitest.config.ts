import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        pool: 'vmThreads',
        // Active only under --coverage. `all` + src glob counts untested files
        // too, so a new uncovered module fails the gate instead of hiding.
        coverage: {
            provider: 'v8',
            reporter: ['text-summary', 'lcov'],
            all: true,
            include: ['src/**/*.ts'],
            thresholds: {
                statements: 90,
                branches: 80,
                functions: 90,
                lines: 90
            }
        }
    }
});
