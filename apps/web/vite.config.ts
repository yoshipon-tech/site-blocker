import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages のサブパス（リポジトリ名）。URL の契約は guide-tech.md を参照
  base: "/site-blocker/",
  build: {
    rolldownOptions: {
      // ルート（/site-blocker/）は占有しないので、ブロック画面だけを入力にする
      input: fileURLToPath(new URL("blocked/index.html", import.meta.url)),
    },
  },
  // Vitest の既定は *.spec.ts も拾うので、Playwright の e2e/ を外す
  test: { include: ["src/**/*.test.{ts,tsx}"] },
});
