import { defineConfig } from "vite";

export default defineConfig({
  test: {
    // Playwright smoke tests are *.spec.js and run separately (npm run test:smoke).
    include: ["tests/**/*.test.js"],
    // DB tests share one scratch project and its staff accounts.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
