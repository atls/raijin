import type { Project }                  from '@yarnpkg/core'
import type { Report }                   from '@yarnpkg/core'

import assert                            from 'node:assert/strict'
import { mkdir }                         from 'node:fs/promises'
import { writeFile }                     from 'node:fs/promises'
import { arch }                          from 'node:os'
import test                              from 'node:test'

import { npath }                         from '@yarnpkg/fslib'
import { ppath }                         from '@yarnpkg/fslib'
import { xfs }                           from '@yarnpkg/fslib'

import { IMAGE_PACK_NODE_LINKER }        from './pack.utils.js'
import { copyYarnRelease }               from './copy.utils.js'
import { resolveSupportedArchitectures } from './pack.utils.js'

test('should materialize image pack runtime with PnP linker', () => {
  assert.equal(IMAGE_PACK_NODE_LINKER, 'pnp')
})

test('should resolve Docker linux amd64 platform to Yarn architecture settings', () => {
  assert.deepEqual(
    resolveSupportedArchitectures('linux/amd64'),
    new Map([
      ['os', ['linux']],
      ['cpu', ['x64']],
      ['libc', ['glibc']],
    ])
  )
})

test('should default image pack materialization to linux current cpu', () => {
  assert.deepEqual(
    resolveSupportedArchitectures(undefined),
    new Map([
      ['os', ['linux']],
      ['cpu', [arch()]],
      ['libc', ['glibc']],
    ])
  )
})

test('should normalize Docker platform aliases before Yarn install', () => {
  assert.deepEqual(
    resolveSupportedArchitectures('windows/amd64'),
    new Map([
      ['os', ['win32']],
      ['cpu', ['x64']],
      ['libc', []],
    ])
  )
})

test('should copy prewarmed Raijin runtime cache with yarn release', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const yarnPath = ppath.join(source, '.yarn/releases/yarn.mjs')
      const yarnNativePath = npath.fromPortablePath(yarnPath)
      const runtimeCachePath = ppath.join('.yarn', 'raijin', 'runtime', 'runtime-sha', 'yarn.mjs')

      await mkdir(npath.dirname(yarnNativePath), { recursive: true })
      await writeFile(
        yarnNativePath,
        [
          '#!/usr/bin/env node',
          'import { mkdirSync, writeFileSync } from "node:fs"',
          'import { join } from "node:path"',
          'if (process.env.YARN_IGNORE_PATH !== "1") process.exit(2)',
          'const runtimePath = join(process.cwd(), ".yarn/raijin/runtime/runtime-sha/yarn.mjs")',
          'mkdirSync(join(process.cwd(), ".yarn/raijin/runtime/runtime-sha"), { recursive: true })',
          'writeFileSync(runtimePath, "runtime")',
          'console.log("1.0.0")',
          '',
        ].join('\n'),
        { mode: 0o755 }
      )

      await copyYarnRelease(
        {
          cwd: source,
          configuration: {
            get: (name: string) => (name === 'yarnPath' ? yarnPath : undefined),
          },
        } as unknown as Project,
        destination,
        { reportInfo: () => undefined } as unknown as Report
      )

      assert.equal(
        await xfs.existsPromise(ppath.join(destination, '.yarn/releases/yarn.mjs')),
        true
      )
      assert.equal(await xfs.existsPromise(ppath.join(destination, runtimeCachePath)), true)
    })
  })
})
