import { execFileSync }       from 'node:child_process'
import { execSync }           from 'node:child_process'
import { mkdtemp }            from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { fileURLToPath }      from 'node:url'

import pkg                    from '../package.json' assert { type: 'json' }

const repo = await mkdtemp(join(tmpdir(), 'yarn-pnp-'))
const cache = join(fileURLToPath(new URL('.', import.meta.url)), '../cache')

const rollupConfig = `
import cjs            from '@rollup/plugin-commonjs';
import resolve        from '@rollup/plugin-node-resolve';
import path           from 'path';
import esbuild        from 'rollup-plugin-esbuild';
import {defineConfig} from 'rollup';

export default defineConfig({
  input: './src/esm-loader/loader.ts',
  output: {
    dir: 'lib',
    format: 'esm',
    preserveModules: true,
    preserveModulesRoot: path.join(__dirname, 'src'),
    generatedCode: 'es2015',
  },
  plugins: [
    resolve({
      extensions: ['.mjs', '.js', '.ts', '.tsx', '.json'],
      rootDir: path.join(__dirname, '../../'),
      jail: path.join(__dirname, '../../'),
      preferBuiltins: true,
    }),
    esbuild({
      tsconfig: false,
      target: 'node12',
      define: {
        document: 'undefined',
        XMLHttpRequest: 'undefined',
        crypto: 'undefined',
      },
    }),
    cjs({requireReturnsDefault: 'preferred'}),
  ],
});
`;

execFileSync('git', [
  'clone',
  '--depth',
  '1',
  'git@github.com:yarnpkg/berry',
  '--branch',
  `@yarnpkg/core/${pkg.dependencies['@yarnpkg/core'].replace('^', '')}`,
  repo,
])

execSync(`find ./ -iname "package.json" -type f | xargs sed -i -e 's/0\.15\.5/0\.17\.15/gi'`, { cwd: repo })

execFileSync('yarn', ['install'], { cwd: repo })

await writeFile(
  join(repo, 'packages/yarnpkg-pnp/rollup.config.js'),
  rollupConfig
)

execFileSync(
  'yarn',
  ['workspace', '@yarnpkg/pnp', 'pack', '--out', join(cache, 'yarnpkg-pnp.tgz')],
  { cwd: repo }
)
