module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '*.js', '*.d.ts'],
  rules: {
    'prettier/prettier': 'warn',

    // ── 红线：any 类型全面禁止，显式豁免方可使用 ──
    '@typescript-eslint/no-explicit-any': 'error',
    // no-unsafe-* 规则族需要 parserOptions.project，
    // 在 Vue SFC 环境中由 vue-tsc 替代提供类型安全
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',

    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',

    // ── 禁止绕过类型检查的注释 ──
    '@typescript-eslint/ban-ts-comment': ['error', {
      'ts-ignore': true,
      'ts-expect-error': 'allow-with-description',
      'ts-nocheck': true,
    }],

    'vue/multi-word-component-names': 'off',
    'no-console': 'warn',
  },
}
