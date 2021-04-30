import path from 'path'

const config = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  jsxSingleQuote: true,
  trailingComma: 'es5',
  plugins: [
    require.resolve('@atls/prettier-plugin-import-sort'),
    require.resolve('@atls/prettier-plugin-import-align'),
  ],
  printWidth: 100,
}

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

const patterns: string[] = ['./**/*.{js,ts,tsx,yml,yaml,json,graphql,md,mdx}']

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

export { config, ignore, createPatterns }
