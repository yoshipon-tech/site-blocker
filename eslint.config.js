import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  // ビルド成果物とツールの生成物は検査しない（node_modules は ESLint が既定で除外する）
  globalIgnores([
    "**/dist/",
    "**/.output/",
    "**/.wxt/",
    "**/test-results/",
    "**/playwright-report/",
  ]),

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // 各ファイルに最も近い tsconfig.json から型情報を得る
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 設定ファイルは tsconfig の対象外にあるものがあるので、型情報を使わないルールに落とす
  {
    files: ["**/*.config.{js,ts}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  {
    files: ["apps/web/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },

  // 書式は Prettier に任せる。書式に関わるルールを切るので最後に置く
  prettier,
);
