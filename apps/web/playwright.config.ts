import { defineConfig, devices } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // 公開時と同じパスで開く。テストは "./#<元URL>" のように相対で指定する
    baseURL: `http://localhost:${port}/site-blocker/blocked/`,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // base と出力パスもあわせて確かめるため、開発サーバーではなくビルド結果を配信する
  webServer: {
    command: `pnpm run build && pnpm run preview --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
