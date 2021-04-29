import path from 'path'

const ignore = [
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
  '**/**/dist/*',
  '**/**/lib/*',
  '**/**/templates/*.yaml',
  '**/templates/*.yaml',
  '**/types/**',
  '.terraform',
]

const patterns: string[] = ['./**/*.{js,jsx,ts,tsx}']

const ignorePatterns: string[] = [
  '!**/node_modules/**',
  '!./node_modules/**',
  '!**/.{git,svn,hg}/**',
  '!./.{git,svn,hg}/**',
  '!**/.yarn/**',
  '!./.yarn/**',
]

const createPatterns = (cwd: string): string[] => [
  ...patterns.map((pattern) => path.join(cwd, pattern)),
  ...ignorePatterns,
]

export { ignore, createPatterns }
