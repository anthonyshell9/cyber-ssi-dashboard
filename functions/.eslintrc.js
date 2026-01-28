module.exports = {
  root: true,
  env: {
    node: true,    // pour CommonJS (require, exports)
    es2021: true,  // ES2021 features
  },
  parserOptions: {
    ecmaVersion: 12,
  },
  extends: [
    "eslint:recommended",
    "google",       // si tu veux garder les règles Google
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    // ajoute d'autres règles ici si besoin
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
};
