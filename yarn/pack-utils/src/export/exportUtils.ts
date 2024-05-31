/* Copy/Paste https://github.com/kherock/yarn-plugins/tree/main/packages/plugin-workspaces-export */
/* eslint-disable */

// @ts-nocheck

import { Project }               from '@yarnpkg/core'
import { VirtualFetcher }        from '@yarnpkg/core'
import { Workspace }             from '@yarnpkg/core'
import { MultiFetcher }          from '@yarnpkg/core'
import { CwdFS }                 from '@yarnpkg/fslib'
import { Filename }              from '@yarnpkg/fslib'
import { PortablePath }          from '@yarnpkg/fslib'
import { ZipCompression }        from '@yarnpkg/fslib'
import { structUtils }           from '@yarnpkg/core'
import { tgzUtils }              from '@yarnpkg/core'
import { ppath }                 from '@yarnpkg/fslib'
import { xfs }                   from '@yarnpkg/fslib'
import { packUtils }             from '@yarnpkg/plugin-pack'

import tar                       from 'tar-stream'
import { createGzip }            from 'zlib'

import { MultiResolver }         from './MultiResolver.js'
import { ProtocolResolver }      from './ProtocolResolver.js'
import { VirtualResolver }       from './VirtualResolver.js'
import { WorkspacePackFetcher }  from './WorkspacePackFetcher.js'
import { WorkspacePackResolver } from './WorkspacePackResolver.js'

/**
 * Make a MultiFetcher that resolves workspaces using WorkspacePackFetcher
 *
 * @param project The project this resolver should resolve workspace dependencies from
 */
export const makeFetcher = (project: Project) => {
  const pluginFetchers = []

  for (const plugin of project.configuration.plugins.values())
    for (const fetcher of plugin.fetchers || []) pluginFetchers.push(new fetcher())

  return new MultiFetcher([
    new VirtualFetcher(),
    new WorkspacePackFetcher(project),

    ...pluginFetchers,
  ])
}

/**
 * Make a MultiResolver that resolves workspaces using WorkspacePackResolver
 *
 * @param project The project this resolver should resolve workspace dependencies from
 */
export const makeResolver = (project: Project) => {
  const pluginResolvers = []

  for (const plugin of project.configuration.plugins.values())
    for (const resolver of plugin.resolvers || []) pluginResolvers.push(new resolver())

  return new MultiResolver([
    new VirtualResolver(),
    new WorkspacePackResolver(project),
    new ProtocolResolver(),

    ...pluginResolvers,
  ])
}

export const makeExportDir = async ({ locator, project }: Workspace) => {
  const exportCacheFolder = project.configuration.get(`exportCacheFolder`)
  const exportDir = ppath.resolve(
    exportCacheFolder,
    structUtils.slugifyIdent(locator) as PortablePath
  )
  await xfs.mkdirPromise(exportDir, { recursive: true })
  return exportDir
}

export const genPackTgz = async (workspace: Workspace) => {
  const packDir = await xfs.mktempPromise()
  const pack = await packUtils.genPackStream(workspace)
  const target = ppath.join(packDir, `package.tgz` as Filename)
  const write = xfs.createWriteStream(target)

  pack.pipe(write)

  await new Promise((resolve) => {
    write.on(`finish`, resolve)
  })
  return xfs.readFilePromise(target)
}

export const genPackZip = async (
  workspace: Workspace,
  opts: {
    compressionLevel?: ZipCompression
    prefixPath?: PortablePath
    stripComponents?: number
  }
) => {
  return await xfs.mktempPromise(async (packDir) => {
    const pack = await packUtils.genPackStream(workspace)
    const target = ppath.join(packDir, `package.tgz` as Filename)
    const write = xfs.createWriteStream(target)

    pack.pipe(write)

    await new Promise((resolve) => {
      write.on(`finish`, resolve)
    })

    const buffer = await xfs.readFilePromise(target)
    return await tgzUtils.convertToZip(buffer, opts)
  })
}

export const makeGzipFromDirectory = async (directory: PortablePath) => {
  const cwdFs = new CwdFS(directory)
  const files: Array<PortablePath> = []
  for await (const p of cwdFs.genTraversePromise(directory, { stableSort: true })) files.push(p)
  const pack = tar.pack()

  process.nextTick(async () => {
    for (const fileRequest of files) {
      const file = ppath.relative(directory, fileRequest)

      const stat = await cwdFs.lstatPromise(fileRequest)
      const opts = { name: file, mtime: new Date(315532800000), mode: stat.mode }

      let resolveFn: Function
      let rejectFn: Function

      const awaitTarget = new Promise((resolve, reject) => {
        resolveFn = resolve
        rejectFn = reject
      })

      const cb = (error: any) => {
        if (error) {
          rejectFn(error)
        } else {
          resolveFn()
        }
      }

      if (stat.isFile())
        pack.entry({ ...opts, type: `file` }, await cwdFs.readFilePromise(file), cb)
      else if (stat.isSymbolicLink())
        pack.entry({ ...opts, type: `symlink`, linkname: await cwdFs.readlinkPromise(file) }, cb)

      await awaitTarget
    }
    pack.finalize()
  })

  const tgz = createGzip()
  pack.pipe(tgz)

  return tgz
}
