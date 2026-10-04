import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: { index: "./.tmp-preview/index.tsx" },
  },
  html: {
    template: "./.tmp-preview/index.html",
  },
  server: { port: 4178 },
  output: { distPath: { root: ".tmp-preview/dist" } },
});
