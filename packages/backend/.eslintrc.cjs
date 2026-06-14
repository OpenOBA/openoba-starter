module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.test.json'],
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier', 'security', 'no-secrets'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:security/recommended-legacy',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist', 'node_modules', '*.js', 'coverage'],
  rules: {
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-empty-object-type': 'warn',
    'no-console': 'warn',
    'security/detect-object-injection': 'off',
    'no-secrets/no-secrets': 'warn',
  },
}
