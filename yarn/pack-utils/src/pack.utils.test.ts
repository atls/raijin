import type { Project }                  from '@yarnpkg/core'
import type { Report }                   from '@yarnpkg/core'
import type { Workspace }                from '@yarnpkg/core'
import type { Locator }                  from '@yarnpkg/core'
import type { Descriptor }               from '@yarnpkg/core'
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
import { packUtils }                     from '@yarnpkg/plugin-pack'
import { patchUtils }                    from '@yarnpkg/plugin-patch'

import { IMAGE_PACK_NODE_LINKER }        from './pack.utils.js'
import { copyYarnRelease }               from './copy.utils.js'
import { copyPatchFiles }                from './copy.utils.js'
import { getWorkspacePackFiles }         from './export/exportUtils.js'
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
  dependencies: Array<Descriptor> = [],
  resolutions: Array<ReturnType<typeof makeResolution>> = []
): Workspace => {
  const dependencyMap = new Map(
    dependencies.map((descriptor) => [descriptor.identHash, descriptor] as const)
  )
  const peerDependencyMap = new Map()

  return {
    cwd,
    manifest: {
      dependencies: dependencyMap,
      getForScope: (scope: string) =>
        scope === 'peerDependencies' ? peerDependencyMap : dependencyMap,
      peerDependencies: peerDependencyMap,
      resolutions,
    },
  } as unknown as Workspace
}

const makeProject = (
  cwd: PortablePath,
  topLevelWorkspace: Workspace,
  tryWorkspaceByDescriptor: (descriptor: Descriptor) => Workspace | null = () => null
): Project =>
  ({
    cwd,
    topLevelWorkspace,
    tryWorkspaceByDescriptor,
  }) as unknown as Project

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

      await copyPatchFiles(makeProject(source, topLevelWorkspace), workspace, destination, {
        reportInfo: () => undefined,
      } as unknown as Report)

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

      await copyPatchFiles(makeProject(source, topLevelWorkspace), workspace, destination, {
        reportInfo: () => undefined,
      } as unknown as Report)

      assert.equal(
        await xfs.readFilePromise(ppath.join(destination, patchPath), 'utf8'),
        'patch content\n'
      )
    })
  })
})

test('should include workspace-relative patch files in the workspace pack', async (context) => {
  await xfs.mktempPromise(async (source) => {
    const workspaceCwd = ppath.join(source, 'packages/app')
    const patchPath = 'patches/example.patch' as PortablePath
    const parentLocator = structUtils.makeLocator(
      structUtils.makeIdent(null, 'app'),
      'workspace:packages/app'
    )
    const patchDescriptor = makePatchDescriptor('example', parentLocator, [patchPath])
    const workspace = makeWorkspace(workspaceCwd, [patchDescriptor])

    context.mock.method(packUtils, 'genPackList', async () => ['package.json' as PortablePath])

    assert.deepEqual(await getWorkspacePackFiles(workspace), ['package.json', patchPath])
  })
})

test('should reject workspace patch files outside the workspace pack', async (context) => {
  await xfs.mktempPromise(async (source) => {
    const workspaceCwd = ppath.join(source, 'packages/app')
    const patchPath = '../patches/example.patch' as PortablePath
    const parentLocator = structUtils.makeLocator(
      structUtils.makeIdent(null, 'app'),
      'workspace:packages/app'
    )
    const patchDescriptor = makePatchDescriptor('example', parentLocator, [patchPath])
    const workspace = makeWorkspace(workspaceCwd, [patchDescriptor])

    context.mock.method(packUtils, 'genPackList', async () => ['package.json' as PortablePath])

    await assert.rejects(getWorkspacePackFiles(workspace), /resolves outside the packed workspace/)
  })
})

test('should keep project and workspace patch paths in separate artifacts', async (context) => {
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

      context.mock.method(packUtils, 'genPackList', async () => ['package.json' as PortablePath])

      await copyPatchFiles(makeProject(source, topLevelWorkspace), workspace, destination, {
        reportInfo: () => undefined,
      } as unknown as Report)

      assert.equal(
        await xfs.readFilePromise(ppath.join(destination, patchPath), 'utf8'),
        'project patch\n'
      )
      assert.deepEqual(await getWorkspacePackFiles(workspace), ['package.json', patchPath])
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
    const topLevelWorkspace = makeWorkspace(destination)

    await copyPatchFiles(
      Object.assign(makeProject(destination, topLevelWorkspace), {
        storedDescriptors: new Map([[patchDescriptor.descriptorHash, patchDescriptor]]),
      }),
      makeWorkspace(destination),
      destination,
      {
        reportInfo: () => assert.fail('unrelated patch file should not be copied'),
      } as unknown as Report
    )
  })
})

test('should copy project-relative patches from required workspaces', async () => {
  await xfs.mktempPromise(async (source) => {
    await xfs.mktempPromise(async (destination) => {
      const patchPath = '.yarn/patches/example.patch' as PortablePath
      const sourcePatchPath = ppath.join(source, patchPath)
      const childIdent = structUtils.makeIdent(null, 'child')
      const childDescriptor = structUtils.makeDescriptor(childIdent, 'workspace:*')
      const childLocator = structUtils.makeLocator(childIdent, 'workspace:packages/child')
      const patchDescriptor = makePatchDescriptor('example', childLocator, [
        `~/${patchPath}` as PortablePath,
      ])
      const topLevelWorkspace = makeWorkspace(source)
      const workspace = makeWorkspace(ppath.join(source, 'packages/app'), [childDescriptor])
      const childWorkspace = makeWorkspace(ppath.join(source, 'packages/child'), [patchDescriptor])
      const project = makeProject(source, topLevelWorkspace, (descriptor) =>
        descriptor.identHash === childDescriptor.identHash ? childWorkspace : null)

      await mkdir(npath.dirname(npath.fromPortablePath(sourcePatchPath)), { recursive: true })
      await writeFile(npath.fromPortablePath(sourcePatchPath), 'patch content\n')

      await copyPatchFiles(project, workspace, destination, {
        reportInfo: () => undefined,
      } as unknown as Report)

      assert.equal(
        await xfs.readFilePromise(ppath.join(destination, patchPath), 'utf8'),
        'patch content\n'
      )
    })
  })
})
