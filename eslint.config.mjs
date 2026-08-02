import oclif from 'eslint-config-oclif'
import prettierConfig from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: ['dist/**', 'test/**'],
  },
  ...oclif,
  prettierConfig,
  {
    rules: {
      'import/namespace': 'off',
      'unicorn/no-array-push-push': 'off',
      'no-constant-binary-expression': 'off',
      'camelcase': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'unicorn/text-encoding-identifier-case': 'off',
    },
  },
  // The TUI layer. Flat config lints only files matched by some block's
  // `files` — eslint-config-oclif targets .ts/.js, so without this block
  // `npm run lint` would report success having never opened a .tsx file.
  {
    files: ['src/tui/**/*.ts', 'src/tui/**/*.tsx'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // React prop objects are ordered for readability, same as command flags
      'perfectionist/sort-objects': 'off',
      // Enforced boundaries, not documented ones: only the data gateway may
      // talk to core, and the TUI never resolves credentials.
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@sonisoft/now-sdk-ext-core',
            message: 'Only src/tui/data/** may import core — go through the gateway.',
          },
          {
            name: '@servicenow/sdk-cli/dist/auth/index.js',
            message: 'The TUI never resolves credentials — it receives a ServiceNowInstance.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/tui/data/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
]
