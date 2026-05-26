import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "client",
          include: ["src/tests/client/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["src/tests/setup.client.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "server",
          include: ["src/tests/server/**/*.test.ts"],
          environment: "node",
          setupFiles: ["src/tests/setup.server.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
