import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join }          from 'node:path'

const PACKAGE_MANIFEST_SPECIFIER = '@atls/raijin/package.json'

export const resolveProjectGenerationArtifactBuildDir = (): string => {
  const require = createRequire(import.meta.url)
  const packageRoot = dirname(require.resolve(PACKAGE_MANIFEST_SPECIFIER))

  return join(packageRoot, 'dist/schematic')
}
