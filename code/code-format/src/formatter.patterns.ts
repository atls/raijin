export const ignore = [
  '.c9',
  '.pnp.js',
  '.pnp.cjs',
  '.pnp.loader.mjs',
  '.git',
  'node_modules',
  'coverage',
  'dist',
  '.yarn',
  '.vscode',
  '.next',
  '**/**/dist/*',
  '**/**/templates/*.yaml',
  '**/templates/*.yaml',
  '.terraform',
  '.idea',
]

export const patterns: Array<string> = ['**/*.{js,mjs,cjs,ts,tsx,yml,yaml,json,graphql,md,mdx}']

export const ignorePatterns: Array<string> = [
  '**/node_modules/**',
  '**/.{git,svn,hg}/**',
  '**/.yarn/**',
  '**/.idea/**',
]
