import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      "@": root,
      "convex/react": fileURLToPath(
        new URL("./convex-fixture.jsx", import.meta.url),
      ),
      "next/navigation": fileURLToPath(
        new URL("./navigation-fixture.js", import.meta.url),
      ),
      "next/link": fileURLToPath(
        new URL("./link-fixture.jsx", import.meta.url),
      ),
    },
  },
  esbuild: { jsx: "automatic" },
  server: { host: "127.0.0.1", port: 4173, fs: { allow: [root] } },
});
