import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      '.claude/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '.playwright-mcp/**',
      'supabase/.temp/**',
      'tsconfig.tsbuildinfo',
    ],
  },
]

export default eslintConfig
