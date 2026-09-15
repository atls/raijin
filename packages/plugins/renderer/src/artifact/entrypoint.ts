import type { Filename }               from '@yarnpkg/fslib'
import type { PortablePath }           from '@yarnpkg/fslib'

import type { RendererArtifactLayout } from './layout.interfaces.js'

import { ppath }                       from '@yarnpkg/fslib'
import { xfs }                         from '@yarnpkg/fslib'

export const RENDERER_STANDALONE_SERVER_ENTRYPOINT = 'index.cjs' as Filename
export const RENDERER_STANDALONE_SERVER_FILENAME = 'server.js' as Filename

const PACKAGE_MANIFEST = 'package.json' as Filename
const SERVER_COMMONJS_FILENAME = 'server.cjs' as Filename

const createEntrypointSource = (distCwd: PortablePath, serverPath: PortablePath): string => {
  const relativeServerPath = ppath.relative(distCwd, serverPath)
  const serverSpecifier = relativeServerPath.startsWith('.')
    ? relativeServerPath
    : `./${relativeServerPath}`

  return `import(${JSON.stringify(serverSpecifier)}).catch((error) => {\n  console.error(error)\n  process.exitCode = 1\n})\n`
}

export const materializeEntrypoint = async ({
  artifactAppCwd,
  distCwd,
}: RendererArtifactLayout): Promise<void> => {
  const manifestPath = ppath.join(artifactAppCwd, PACKAGE_MANIFEST)
  const serverPath = ppath.join(artifactAppCwd, RENDERER_STANDALONE_SERVER_FILENAME)
  let runtimeServerPath = serverPath

  if (!(await xfs.existsPromise(manifestPath))) {
    runtimeServerPath = ppath.join(artifactAppCwd, SERVER_COMMONJS_FILENAME)
    await xfs.movePromise(serverPath, runtimeServerPath)
  }

  await xfs.writeFilePromise(
    ppath.join(distCwd, RENDERER_STANDALONE_SERVER_ENTRYPOINT),
    createEntrypointSource(distCwd, runtimeServerPath)
  )
}
