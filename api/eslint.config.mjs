import tseslint from "typescript-eslint";

// Mirrors api/tslint.json (tslint:recommended choices that have an ESLint
// equivalent, with the same overrides). member-access, ordered-imports,
// member-ordering, interface-name, arrow-parens, object-literal-sort-keys,
// and trailing-comma stay off, matching the TSLint config.
export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin
    },
    rules: {
      "quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
      "max-len": ["error", { code: 150 }],
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": ["error", {
        allowShortCircuit: true,
        allowTernary: true
      }],
      "semi": ["error", "always"],
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "curly": ["error", "all"],
      "no-eval": "error",
      "no-debugger": "error",
      "no-empty": "error",
      "no-throw-literal": "error"
    }
  }
);
