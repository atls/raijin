/* Copy/Paste https://github.com/yarnpkg/berry/blob/master/packages/acceptance-tests/pkg-tests-core/sources/utils/fs.ts */
/* eslint-disable */

import { Filename }     from '@yarnpkg/fslib'
import { PortablePath } from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'

export const realpath = (source: PortablePath): Promise<PortablePath> => {
  return xfs.realpathPromise(source)
}

export const writeFile = async (target: PortablePath, body: string | Buffer): Promise<void> => {
  await xfs.mkdirpPromise(ppath.dirname(target))
  await xfs.writeFilePromise(target, body)
}

export const writeJson = (target: PortablePath, object: any): Promise<void> => {
  return exports.writeFile(target, JSON.stringify(object))
}

export const createTemporaryFolder = async (name?: Filename): Promise<PortablePath> => {
  let tmp = await xfs.mktempPromise()

  if (typeof name !== `undefined`) {
    tmp = ppath.join(tmp, name)
    await xfs.mkdirPromise(tmp)
  }

  return tmp
}
