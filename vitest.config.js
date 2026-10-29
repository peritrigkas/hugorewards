import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  test: {
    include: ["tests/**/*.test.js"],
    // Only SCRATCH_* vars, so the live project's VITE_* keys in .env can never
    // leak into a test run.
    env: loadEnv(mode, process.cwd(), "SCRATCH_"),
    // DB tests share one scratch project and its staff accounts.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
}));
