import path from 'path';
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
    '**/**/dist/*',
    '**/**/lib/*',
    '**/**/templates/*.yaml',
    '**/templates/*.yaml',
    '.terraform',
];
const patterns = ['./**/*.{js,ts,tsx,yml,yaml,json,graphql,md,mdx}'];
const ignorePatterns = [
    '!**/node_modules/**',
    '!./node_modules/**',
    '!**/.{git,svn,hg}/**',
    '!./.{git,svn,hg}/**',
    '!**/.yarn/**',
    '!./.yarn/**',
];
export const createPatterns = (cwd) => [
    ...patterns.map((pattern) => path.join(cwd, pattern)),
    ...ignorePatterns,
];
