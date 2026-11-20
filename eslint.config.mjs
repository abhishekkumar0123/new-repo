import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "**/.next/**",
    "out/**",
    "**/out/**",
    "node_modules/**",
    "**/node_modules/**",
    "new/**",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/jsx-no-comment-textnodes": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);
