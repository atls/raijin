import type { Project }                  from '@yarnpkg/core'
import type { Report }                   from '@yarnpkg/core'
import type { PortablePath }             from '@yarnpkg/fslib'

import assert                            from 'node:assert/strict'
import { mkdir }                         from 'node:fs/promises'
import { writeFile }                     from 'node:fs/promises'
import { arch }                          from 'node:os'
import test                              from 'node:test'

import { structUtils }                   from '@yarnpkg/core'
import { npath }                         from '@yarnpkg/fslib'
import { ppath }                         from '@yarnpkg/fslib'
import { xfs }                           from '@yarnpkg/fslib'
import { patchUtils }                    from '@yarnpkg/plugin-patch'

import { IMAGE_PACK_NODE_LINKER }        from './pack.utils.js'
import { copyYarnRelease }               from './copy.utils.js'
import { copyProtocolFiles }             from './copy.utils.js'
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

test('should copy yarn release without runtime cache side effects', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const yarnPath = ppath.join(source, '.yarn/releases/yarn.mjs')
      const yarnNativePath = npath.fromPortablePath(yarnPath)

      await mkdir(npath.dirname(yarnNativePath), { recursive: true })
      await writeFile(yarnNativePath, '#!/usr/bin/env node\n', { mode: 0o755 })

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
    })
  })
})

test('should copy yarn release from native yarn path', async (context) => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const yarnPath = ppath.join(source, '.yarn/releases/yarn.mjs')
      const yarnNativePath = npath.fromPortablePath(yarnPath)

      await mkdir(npath.dirname(yarnNativePath), { recursive: true })
      await writeFile(yarnNativePath, '#!/usr/bin/env node\n', { mode: 0o755 })

      context.mock.method(npath, 'fromPortablePath', (path: string) => {
        if (path === yarnPath) {
          return yarnNativePath
        }

        return path
      })

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
    })
  })
})

test('should copy project-relative protocol files', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const patchPath = '.yarn/patches/example.patch'
      const sourcePatchPath = ppath.join(source, patchPath)
      const sourceDescriptor = structUtils.makeDescriptor(
        structUtils.makeIdent(null, 'example'),
        'npm:1.0.0'
      )
      const patchDescriptor = patchUtils.makeDescriptor(sourceDescriptor, {
        parentLocator: null,
        patchPaths: [`optional!~/${patchPath}` as PortablePath],
        sourceDescriptor,
      })

      await mkdir(npath.dirname(npath.fromPortablePath(sourcePatchPath)), { recursive: true })
      await writeFile(npath.fromPortablePath(sourcePatchPath), 'patch content\n')

      await copyProtocolFiles(
        {
          cwd: source,
          storedDescriptors: new Map([[patchDescriptor.descriptorHash, patchDescriptor]]),
        } as unknown as Project,
        destination,
        { reportInfo: () => undefined } as unknown as Report,
        (descriptor) => {
          if (!patchUtils.isPatchDescriptor(descriptor)) {
            return undefined
          }

          const { parentLocator, patchPaths } = patchUtils.parseDescriptor(descriptor)

          return { parentLocator, paths: patchPaths }
        }
      )

      assert.equal(
        await xfs.readFilePromise(ppath.join(destination, patchPath), 'utf8'),
        'patch content\n'
      )
    })
  })
})

test('should preserve parent-workspace-relative protocol file copying', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const parentRelativeCwd = 'packages/parent' as PortablePath
      const parentCwd = ppath.join(source, parentRelativeCwd)
      const protocolPath = 'protocol/example.txt' as PortablePath
      const sourceProtocolPath = ppath.join(parentCwd, protocolPath)
      const parentLocator = structUtils.makeLocator(
        structUtils.makeIdent(null, 'parent'),
        'workspace:packages/parent'
      )

      await mkdir(npath.dirname(npath.fromPortablePath(sourceProtocolPath)), { recursive: true })
      await writeFile(npath.fromPortablePath(sourceProtocolPath), 'protocol content\n')

      await copyProtocolFiles(
        {
          cwd: source,
          getWorkspaceByLocator: (locator: typeof parentLocator) => {
            assert.equal(locator, parentLocator)

            return { cwd: parentCwd, relativeCwd: parentRelativeCwd }
          },
          storedDescriptors: new Map([
            ['protocol', structUtils.makeDescriptor(parentLocator, 'protocol:example')],
          ]),
        } as unknown as Project,
        destination,
        { reportInfo: () => undefined } as unknown as Report,
        () => ({ parentLocator, paths: [protocolPath] })
      )

      assert.equal(
        await xfs.readFilePromise(ppath.join(destination, parentRelativeCwd, protocolPath), 'utf8'),
        'protocol content\n'
      )
    })
  })
})
