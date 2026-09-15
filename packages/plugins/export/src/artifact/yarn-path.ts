import type { PortablePath } from '@yarnpkg/fslib'

import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

export const getYarnPathFromDestination = async (
  destination: PortablePath
): Promise<PortablePath | undefined> => {
  const releasesDir = ppath.join(destination, '.yarn', 'releases')

  if (!(await xfs.existsPromise(releasesDir))) {
    return undefined
  }

  const release = (await xfs.readdirPromise(releasesDir))
    .sort()
    .find((name) => name.endsWith('.cjs') || name.endsWith('.mjs'))

  if (!release) {
    return undefined
  }

  return ppath.join('.yarn', 'releases', release as PortablePath)
}
