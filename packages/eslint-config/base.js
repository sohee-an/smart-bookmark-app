import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      // CLAUDE.md 코드 스타일: 타입만 가져올 때는 import type (--fix로 자동 수정)
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      // React 19: ref는 보통 prop으로 받는다. forwardRef는 deprecated라 import 자체를 막는다
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["forwardRef"],
              message:
                "React 19에서는 ref를 prop으로 받는다 (예: function Field({ ref, ...props }))",
            },
          ],
        },
      ],
      // CLAUDE.md 코드 스타일: React.X 네임스페이스 접근 금지, named import 사용
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSQualifiedName[left.name='React']",
          message: 'React.X 대신 named import를 쓴다 (예: import type { ReactNode } from "react")',
        },
        {
          selector: "MemberExpression[object.name='React']",
          message: 'React.X 대신 named import를 쓴다 (예: import { useState } from "react")',
        },
      ],
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**"],
  },
];
