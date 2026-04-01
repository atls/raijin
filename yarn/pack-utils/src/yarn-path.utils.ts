import type { PortablePath } from '@yarnpkg/fslib'

import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

export const getYarnPathFromDestination = async (
  destination: PortablePath,
  configuredYarnPath: PortablePath | null
): Promise<PortablePath | undefined> => {
  const releasesDir = ppath.join(destination, '.yarn', 'releases')

  if (!(await xfs.existsPromise(releasesDir))) {
    return undefined
  }

  const releases = (await xfs.readdirPromise(releasesDir))
    .filter((name) => name.endsWith('.cjs') || name.endsWith('.mjs'))
    .sort()

  if (releases.length === 0) {
    return undefined
  }

  if (configuredYarnPath) {
    const configuredRelease = ppath.basename(configuredYarnPath)
    const matchedRelease = releases.find((release) => release === configuredRelease)

    if (matchedRelease) {
      return ppath.join('.yarn', 'releases', matchedRelease as PortablePath)
    }
  }

  if (releases.length === 1) {
    return ppath.join('.yarn', 'releases', releases[0] as PortablePath)
  }

  return undefined
}
