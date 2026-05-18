import nextPlugin from '@next/eslint-plugin-next'

export default [
  {
    ignores: [
      '.next/**',
      '.claude/**',
      '.migration/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'public/**',
    ],
  },
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
]
