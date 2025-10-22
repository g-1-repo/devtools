import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'mcp-server/server.js',
      '*.js',
    ],
  },
  {
    rules: {
      'no-console': 'off',
      'node/prefer-global/process': 'off',
    },
  },
)
