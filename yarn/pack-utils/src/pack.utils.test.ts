import type { Project }                  from '@yarnpkg/core'
import type { Report }                   from '@yarnpkg/core'
import type { Workspace }                from '@yarnpkg/core'
import type { Locator }                  from '@yarnpkg/core'
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
import { copyPatchFiles }                from './copy.utils.js'
import { resolveSupportedArchitectures } from './pack.utils.js'

const makePatchDescriptor = (
  name: string,
  parentLocator: Locator | null,
  patchPaths: Array<PortablePath>
) => {
  const sourceDescriptor = structUtils.makeDescriptor(
    structUtils.makeIdent(null, name),
    'npm:1.0.0'
  )

  return patchUtils.makeDescriptor(sourceDescriptor, {
    parentLocator,
    patchPaths,
    sourceDescriptor,
  })
}

const makeResolution = (descriptor: ReturnType<typeof makePatchDescriptor>) => ({
  pattern: {
    descriptor: {
      fullName: structUtils.stringifyIdent(descriptor),
    },
  },
  reference: descriptor.range,
})

const makeWorkspace = (
  cwd: PortablePath,
  dependencies: Array<ReturnType<typeof makePatchDescriptor>> = [],
  resolutions: Array<ReturnType<typeof makeResolution>> = []
): Workspace =>
  ({
    cwd,
    manifest: {
      dependencies: new Map(
        dependencies.map((descriptor) => [descriptor.identHash, descriptor] as const)
      ),
      peerDependencies: new Map(),
      resolutions,
    },
  }) as unknown as Workspace

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

test('should copy project-relative patch files', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const patchPath = '.yarn/patches/example.patch'
      const sourcePatchPath = ppath.join(source, patchPath)
      const patchDescriptor = makePatchDescriptor('example', null, [
        `optional!~/${patchPath}` as PortablePath,
      ])
      const topLevelWorkspace = makeWorkspace(source, [], [makeResolution(patchDescriptor)])
      const workspace = makeWorkspace(ppath.join(source, 'packages/app'))

      await mkdir(npath.dirname(npath.fromPortablePath(sourcePatchPath)), { recursive: true })
      await writeFile(npath.fromPortablePath(sourcePatchPath), 'patch content\n')

      await copyPatchFiles(
        {
          cwd: source,
          topLevelWorkspace,
        } as unknown as Project,
        workspace,
        destination,
        { reportInfo: () => undefined } as unknown as Report
      )

      assert.equal(
        await xfs.readFilePromise(ppath.join(destination, patchPath), 'utf8'),
        'patch content\n'
      )
    })
  })
})

test('should copy top-level-workspace-relative patch files to the packed root', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const patchPath = '.yarn/patches/example.patch' as PortablePath
      const sourcePatchPath = ppath.join(source, patchPath)
      const parentLocator = structUtils.makeLocator(
        structUtils.makeIdent(null, 'root'),
        'workspace:.'
      )
      const patchDescriptor = makePatchDescriptor('example', parentLocator, [patchPath])
      const topLevelWorkspace = makeWorkspace(source, [], [makeResolution(patchDescriptor)])
      const workspace = makeWorkspace(ppath.join(source, 'packages/app'))

      await mkdir(npath.dirname(npath.fromPortablePath(sourcePatchPath)), { recursive: true })
      await writeFile(npath.fromPortablePath(sourcePatchPath), 'patch content\n')

      await copyPatchFiles(
        {
          cwd: source,
          topLevelWorkspace,
        } as unknown as Project,
        workspace,
        destination,
        { reportInfo: () => undefined } as unknown as Report
      )

      assert.equal(
        await xfs.readFilePromise(ppath.join(destination, patchPath), 'utf8'),
        'patch content\n'
      )
    })
  })
})

test('should copy packed-workspace-relative patch files to the packed root', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const workspaceCwd = ppath.join(source, 'packages/app')
      const patchPath = 'patches/example.patch' as PortablePath
      const sourcePatchPath = ppath.join(workspaceCwd, patchPath)
      const parentLocator = structUtils.makeLocator(
        structUtils.makeIdent(null, 'app'),
        'workspace:packages/app'
      )
      const patchDescriptor = makePatchDescriptor('example', parentLocator, [patchPath])
      const topLevelWorkspace = makeWorkspace(source)
      const workspace = makeWorkspace(workspaceCwd, [patchDescriptor])

      await mkdir(npath.dirname(npath.fromPortablePath(sourcePatchPath)), { recursive: true })
      await writeFile(npath.fromPortablePath(sourcePatchPath), 'patch content\n')

      await copyPatchFiles(
        {
          cwd: source,
          topLevelWorkspace,
        } as unknown as Project,
        workspace,
        destination,
        { reportInfo: () => undefined } as unknown as Report
      )

      assert.equal(
        await xfs.readFilePromise(ppath.join(destination, patchPath), 'utf8'),
        'patch content\n'
      )
    })
  })
})

test('should reject packed-workspace patch files outside the packed root', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const workspaceCwd = ppath.join(source, 'packages/app')
      const patchPath = '../patches/example.patch' as PortablePath
      const parentLocator = structUtils.makeLocator(
        structUtils.makeIdent(null, 'app'),
        'workspace:packages/app'
      )
      const patchDescriptor = makePatchDescriptor('example', parentLocator, [patchPath])
      const workspace = makeWorkspace(workspaceCwd, [patchDescriptor])

      await assert.rejects(
        copyPatchFiles(
          {
            cwd: source,
            topLevelWorkspace: makeWorkspace(source),
          } as unknown as Project,
          workspace,
          destination,
          { reportInfo: () => undefined } as unknown as Report
        ),
        /resolves outside the standalone workspace/
      )

      assert.equal(
        await xfs.existsPromise(ppath.join(ppath.dirname(destination), 'patches/example.patch')),
        false
      )
    })
  })
})

test('should reject patch files collapsed onto the same packed path', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const patchPath = 'patches/example.patch' as PortablePath
      const workspaceCwd = ppath.join(source, 'packages/app')
      const projectPatchPath = ppath.join(source, patchPath)
      const workspacePatchPath = ppath.join(workspaceCwd, patchPath)
      const parentLocator = structUtils.makeLocator(
        structUtils.makeIdent(null, 'app'),
        'workspace:packages/app'
      )
      const projectPatchDescriptor = makePatchDescriptor('project-example', null, [
        `~/${patchPath}` as PortablePath,
      ])
      const workspacePatchDescriptor = makePatchDescriptor('workspace-example', parentLocator, [
        patchPath,
      ])
      const topLevelWorkspace = makeWorkspace(source, [], [makeResolution(projectPatchDescriptor)])
      const workspace = makeWorkspace(workspaceCwd, [workspacePatchDescriptor])

      await mkdir(npath.dirname(npath.fromPortablePath(projectPatchPath)), { recursive: true })
      await mkdir(npath.dirname(npath.fromPortablePath(workspacePatchPath)), { recursive: true })
      await writeFile(npath.fromPortablePath(projectPatchPath), 'project patch\n')
      await writeFile(npath.fromPortablePath(workspacePatchPath), 'workspace patch\n')

      await assert.rejects(
        copyPatchFiles(
          {
            cwd: source,
            topLevelWorkspace,
          } as unknown as Project,
          workspace,
          destination,
          { reportInfo: () => undefined } as unknown as Report
        ),
        /resolve to patches\/example\.patch/
      )
    })
  })
})

test('should ignore patch descriptors outside the packed manifest', async () => {
  await xfs.mktempPromise(async (destination) => {
    const parentLocator = structUtils.makeLocator(
      structUtils.makeIdent(null, 'parent'),
      'npm:1.0.0'
    )
    const patchPath = 'patches/example.patch' as PortablePath
    const patchDescriptor = makePatchDescriptor('example', parentLocator, [patchPath])

    await copyPatchFiles(
      {
        topLevelWorkspace: makeWorkspace(destination),
        storedDescriptors: new Map([[patchDescriptor.descriptorHash, patchDescriptor]]),
      } as unknown as Project,
      makeWorkspace(destination),
      destination,
      {
        reportInfo: () => assert.fail('unrelated patch file should not be copied'),
      } as unknown as Report
    )
  })
})
