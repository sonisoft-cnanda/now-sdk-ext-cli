import oclif from 'eslint-config-oclif'
import prettierConfig from 'eslint-config-prettier/flat'

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
]
