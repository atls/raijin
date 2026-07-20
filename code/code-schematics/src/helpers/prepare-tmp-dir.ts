import type { PortablePath } from '@yarnpkg/fslib'

import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

const PNP_CJS_FILENAME = '.pnp.cjs' as PortablePath

const getPnpRootCandidates = (cwd: PortablePath): Array<PortablePath> => {
  const candidates: Array<PortablePath> = []
  let current = cwd

  for (;;) {
    candidates.push(current)

    const parent = ppath.dirname(current)

    if (parent === current) {
      return candidates
    }

    current = parent
  }
}

export const resolvePnpRoot = async (cwd: PortablePath): Promise<PortablePath> => {
  const candidates = await Promise.all(
    getPnpRootCandidates(cwd).map(async (candidate) => ({
      candidate,
      exists: await xfs.existsPromise(ppath.join(candidate, PNP_CJS_FILENAME)),
    }))
  )

  return candidates.find(({ exists }) => exists)?.candidate ?? cwd
}

export const prepareTmpDir = async (tmpDir: PortablePath): Promise<void> => {
  const projectRoot = process.cwd() as PortablePath
  const pnpRoot = await resolvePnpRoot(projectRoot)

  await xfs.copyFilePromise(
    ppath.join(pnpRoot, PNP_CJS_FILENAME),
    ppath.join(tmpDir, PNP_CJS_FILENAME)
  )

  await xfs.symlinkPromise(
    ppath.join(projectRoot, 'package.json'),
    ppath.join(tmpDir, 'package.json')
  )

  // TODO check only on raijin package. on other packager must use relative import. check it
  await xfs.symlinkPromise(ppath.join(projectRoot, 'runtime'), ppath.join(tmpDir, 'runtime'))
}
