import { execFileSync } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import pkg from '../package.json' assert { type: 'json' }

const repo = await mkdtemp(join(tmpdir(), 'yarn-'))
const cache = join(fileURLToPath(new URL('.', import.meta.url)), '../cache')

execFileSync('git', [
  'clone',
  '--depth',
  '1',
  'git@github.com:yarnpkg/berry',
  '--branch',
  `@yarnpkg/core/${pkg.dependencies['@yarnpkg/core'].replace('^', '')}`,
  repo,
])

const pkgTestsCore = JSON.parse(
  await readFile(join(repo, 'packages/acceptance-tests/pkg-tests-core/package.json'), 'utf-8')
)

await writeFile(
  join(repo, 'packages/acceptance-tests/pkg-tests-core/package.json'),
  JSON.stringify({
    ...pkgTestsCore,
    scripts: {
      postpack: 'rm -rf lib',
      prepack: 'run build:compile "$(pwd)"',
    },
    peerDependencies: {
      'pkg-tests-fixtures': pkgTestsCore.devDependencies['pkg-tests-fixtures'],
    },
    devDependencies: {
      ...pkgTestsCore.devDependencies,
      'pkg-tests-fixtures': undefined,
    },
    publishConfig: {
      main: './lib/index.js',
      typings: './lib/index.d.ts',
      exports: {
        '.': './lib/index.js',
        './package.json': './package.json',
      },
    },
  })
)

const makeTemporaryEnv = await readFile(
  join(repo, 'packages/acceptance-tests/pkg-tests-core/sources/utils/makeTemporaryEnv.ts'),
  'utf-8'
)

await writeFile(
  join(repo, 'packages/acceptance-tests/pkg-tests-core/sources/utils/makeTemporaryEnv.ts'),
  makeTemporaryEnv.replace(
    // eslint-disable-next-line no-template-curly-in-string
    'const yarnBinary = require.resolve(`${__dirname}/../../../../yarnpkg-cli/bundles/yarn.js`);',
    // eslint-disable-next-line no-template-curly-in-string
    'const yarnBinary = require.resolve(`${__dirname.substr(0, __dirname.indexOf("/.yarn"))}/yarn/cli/dist/yarn.cjs`);'
  )
)

execFileSync(
  'yarn',
  ['workspace', 'pkg-tests-fixtures', 'pack', '--out', join(cache, 'pkg-tests-fixtures.tgz')],
  { cwd: repo }
)

execFileSync(
  'yarn',
  ['workspace', 'pkg-tests-core', 'pack', '--out', join(cache, 'pkg-tests-core.tgz')],
  { cwd: repo }
)
