import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Use tests/ folder for test files
    include: ["tests/**/*.test.ts"],
    // Use Node.js environment (has crypto.subtle in Node 20+)
    environment: "node",
    // Coverage configuration
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/hooks/**/*.ts", "src/api/routes/**/*.ts"],
      // Exclude browser-dependent files
      exclude: [
        "src/lib/auth.tsx",
        "src/lib/analytics.ts", 
        "src/lib/api-client.ts",
        "src/lib/stripe.ts",
        "src/lib/privacy/**",
        "src/lib/pdf-generator.ts", // WASM module - requires complex mocking
        "src/api/routes/stripe.ts",
        "src/api/routes/webhooks.ts",
      ],
      thresholds: {
        lines: 65,
        functions: 85,
        branches: 50,
        statements: 65,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
