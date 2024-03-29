import { execFileSync }       from 'node:child_process'
import { mkdtemp }            from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { readFile }           from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { fileURLToPath }      from 'node:url'

const repo = await mkdtemp(join(tmpdir(), 'yarn-'))
const cache = join(fileURLToPath(new URL('.', import.meta.url)), '../cache')

execFileSync('git', [
  'clone',
  '--depth',
  '1',
  'git@github.com:yarnpkg/berry',
  '--branch',
  '@yarnpkg/cli/3.5.0',
  repo,
])

const pkgTestsCore = await readFile(
  join(repo, 'packages/acceptance-tests/pkg-tests-core/package.json'),
  'utf-8'
)
await writeFile(
  join(repo, 'packages/acceptance-tests/pkg-tests-core/package.json'),
  JSON.stringify({
    ...JSON.parse(pkgTestsCore),
    scripts: {
      postpack: 'rm -rf lib',
      prepack: 'run build:compile "$(pwd)"',
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
