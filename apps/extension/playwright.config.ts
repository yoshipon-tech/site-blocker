import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  // 拡張は Chromium でしか読み込めない。ブラウザは各テストのフィクスチャで起動する
  projects: [{ name: "chromium" }],
});
