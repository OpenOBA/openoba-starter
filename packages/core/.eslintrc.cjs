module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
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
  reportUnusedDisableDirectives: true,
  rules: {
    'prettier/prettier': 'warn',

    // ── 红线：any 类型全面禁止，显式豁免方可使用 ──
    '@typescript-eslint/no-explicit-any': 'error',

    // ── 确定性执行防线：unknown 规范 ──
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',

    '@typescript-eslint/consistent-type-assertions': ['warn', {
      assertionStyle: 'as',
      objectLiteralTypeAssertions: 'allow',
    }],

    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-empty-object-type': 'warn',

    // ── 禁止绕过类型检查的注释 ──
    '@typescript-eslint/ban-ts-comment': ['error', {
      'ts-ignore': true,
      'ts-expect-error': 'allow-with-description',
      'ts-nocheck': false,
    }],

    'no-console': 'warn',
    'security/detect-object-injection': 'off',
    'no-secrets/no-secrets': 'warn',

    // ── 初期放宽（逐步收紧）──
    'no-useless-escape': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    'prefer-const': 'warn',
    'no-constant-condition': 'warn',
    '@typescript-eslint/no-unsafe-function-type': 'warn',
    'no-control-regex': 'warn',
  },
}
