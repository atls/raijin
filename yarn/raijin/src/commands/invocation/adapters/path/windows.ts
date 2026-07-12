import type { PortablePath } from '@yarnpkg/fslib'

import { win32 }             from 'node:path'

const DRIVE_PATH = /^\/[A-Za-z]:\//u

export const toNative = (cwd: PortablePath): string =>
  win32.normalize(DRIVE_PATH.test(cwd) ? cwd.slice(1) : cwd)
