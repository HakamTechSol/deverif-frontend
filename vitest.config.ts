import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Standalone test config, deliberately NOT extending ./vite.config.ts.
 *
 * The app's Vite config loads the TanStack Start plugin, nitro and the route
 * tree generator -- all of which is irrelevant to a unit test and slow enough
 * to be worth avoiding. The only thing the tests need from it is the "@" path
 * alias, so it is declared here directly.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
