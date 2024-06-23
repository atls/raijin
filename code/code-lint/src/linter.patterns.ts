import { join } from 'node:path'

const ignore = [
  '.c9',
  '.pnp.js',
  '.pnp.cjs',
  '.pnp.loader.mjs',
  '.pnp-ts.loader.mjs',
  '.git',
  'node_modules',
  'coverage',
  'bundles',
  'dist',
  'gen',
  'lib',
  '.yarn',
  '.vscode',
  '.next',
  '**/**/dist/*',
  '**/**/lib/*',
  '**/**/build/*',
  '**/**/.cache/*',
  '**/**/bundles/*',
  '**/**/templates/*.yaml',
  '**/templates/*.yaml',
  '**/types/**',
  '.terraform',
  '.idea',
]

const patterns: Array<string> = ['./**/*.{js,mjs,cjs,jsx,ts,tsx}']

const ignorePatterns: Array<string> = [
  '!**/node_modules/**',
  '!./node_modules/**',
  '!**/.{git,svn,hg}/**',
  '!./.{git,svn,hg}/**',
  '!**/.yarn/**',
  '!./.yarn/**',
  '!**/gen/**',
  '!**/.idea/**',
]

const createPatterns = (cwd: string): Array<string> => [
  ...patterns.map((pattern) => join(cwd, pattern)),
  ...ignorePatterns,
]

export { ignore, createPatterns }
