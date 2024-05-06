import path from 'path'

export const ignore = [
  '.c9',
  '.pnp.js',
  '.git',
  'node_modules',
  'coverage',
  'dist',
  'lib',
  '.yarn',
  '.vscode',
  '.next',
  '**/**/lib/*',
  '**/**/dist/*',
  '**/**/templates/*.yaml',
  '**/templates/*.yaml',
  '.terraform',
  '.idea'
]

const patterns: string[] = ['./**/*.{js,ts,tsx,yml,yaml,json,graphql,md,mdx}']

const ignorePatterns: string[] = [
  '!**/node_modules/**',
  '!./node_modules/**',
  '!**/.{git,svn,hg}/**',
  '!./.{git,svn,hg}/**',
  '!**/.yarn/**',
  '!./.yarn/**',
  '!**/.idea/**',
  '!./.idea/**',
]

export const createPatterns = (cwd: string): string[] => [
  ...patterns.map((pattern) => path.join(cwd, pattern)),
  ...ignorePatterns,
]
