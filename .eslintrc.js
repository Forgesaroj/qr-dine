/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@qr-dine/config/eslint"],
  parserOptions: {
    project: true,
  },
  settings: {
    next: {
      rootDir: ["apps/*/"],
    },
  },
};
