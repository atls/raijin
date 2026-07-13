import type { PortablePath } from '@yarnpkg/fslib'

import { win32 }             from 'node:path'

const DRIVE_PATH = /^\/[A-Za-z]:\//u
const NATIVE_DRIVE_PATH = /^[A-Za-z]:\//u

export const toNative = (path: PortablePath): string =>
  win32.normalize(DRIVE_PATH.test(path) ? path.slice(1) : path)

export const toPortable = (path: string): PortablePath => {
  const normalized = win32.normalize(path).replaceAll('\\', '/')

  return (NATIVE_DRIVE_PATH.test(normalized) ? `/${normalized}` : normalized) as PortablePath
}
