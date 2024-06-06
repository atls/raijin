import { join } from 'node:path'

export const ignore = [
  '.c9',
  '.pnp.js',
  '.pnp.cjs',
  '.pnp.loader.mjs',
  '.git',
  'node_modules',
  'coverage',
  'dist',
  'lib',
  '.yarn',
  '.vscode',
  '.next',
  '**/**/dist/*',
  '**/**/lib/*',
  '**/**/templates/*.yaml',
  '**/templates/*.yaml',
  '.terraform',
  '.idea'
]

const patterns: Array<string> = ['./**/*.{js,mjs,cjs,ts,tsx,yml,yaml,json,graphql,md,mdx}']

const ignorePatterns: Array<string> = [
  '!**/node_modules/**',
  '!./node_modules/**',
  '!**/.{git,svn,hg}/**',
  '!./.{git,svn,hg}/**',
  '!**/.yarn/**',
  '!./.yarn/**',
  '!**/.idea/**',
  '!./.idea/**',
]

export const createPatterns = (cwd: string): Array<string> => [
  ...patterns.map((pattern) => join(cwd, pattern)),
  ...ignorePatterns,
]
