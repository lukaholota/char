import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "prisma/tools/**",
      "next-env.d.ts",
      "test_pg.js",
      "tmp/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/rules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["@prisma/client", "@/lib/prisma", "next/*", "@auth/*", "server-only"],
      }],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
    }
  },
  // Allow explicit `any` in Prisma / generated / types and certain server-side code
  {
    files: [
      'src/lib/types/**',
      'src/types/**',
      'src/server/**',
      'prisma/**',
      'src/lib/components/**'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ["src/rules/**/*.{ts,tsx}", "src/server/db/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", {
        selector: 'TSAsExpression > TSAnyKeyword',
        message: "Use a narrowed unknown value, a type guard, or a precise DTO instead of as any.",
      }],
    },
  },
];

export default eslintConfig;
