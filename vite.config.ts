import * as path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  resolve: {
    alias: [
      { find: "~", replacement: path.resolve(__dirname, "src/") },
      { find: "tanstack-query-lite", replacement: path.resolve(__dirname, "tanstack-query-lite/") },
    ],
  },
});
