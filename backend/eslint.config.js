const js = require("@eslint/js");
const globals = require("globals");

// Lint del backend (CommonJS, Node 22+). Se apoya en las reglas
// recomendadas de ESLint y suma las que ya usa el frontend para mantener
// el mismo criterio: variables sin usar como warning, eqeqeq y prefer-const.
module.exports = [
  {
    ignores: ["node_modules/**", "coverage/**", "scripts/informes/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "no-console": "off",
      eqeqeq: ["warn", "smart"],
      "prefer-const": "warn",
      "no-var": "warn",
    },
  },
  {
    files: ["tests-jest/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
