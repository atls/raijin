import type { PortablePath } from '@yarnpkg/fslib'

import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

export const prepareTmpDir = async (tmpDir: PortablePath): Promise<void> => {
  const projectRoot = process.cwd() as PortablePath

  await xfs.copyFilePromise(ppath.join(projectRoot, '.pnp.cjs'), ppath.join(tmpDir, '.pnp.cjs'))

  await xfs.symlinkPromise(
    ppath.join(projectRoot, 'package.json'),
    ppath.join(tmpDir, 'package.json')
  )

  // TODO check only on raijin package. on other packager must use relative import. check it
  await xfs.symlinkPromise(ppath.join(projectRoot, 'runtime'), ppath.join(tmpDir, 'runtime'))
}
