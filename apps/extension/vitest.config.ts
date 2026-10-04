import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  // Vitest の既定は *.spec.ts も拾うので、Playwright の e2e/ を外す。
  // entrypoints/ に置いたファイルは WXT がエントリとして読むので、background のテストは tests/ に置く
  test: { include: ["utils/**/*.test.ts", "tests/**/*.test.ts"] },
});
