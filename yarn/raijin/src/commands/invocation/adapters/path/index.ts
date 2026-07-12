import type { PortablePath }           from '@yarnpkg/fslib'

import { toNative as toPosixNative }   from './posix.js'
import { toNative as toWindowsNative } from './windows.js'

interface PathAdapter {
  toNative: (cwd: PortablePath) => string
}

const POSIX_ADAPTER: PathAdapter = { toNative: toPosixNative }
const WINDOWS_ADAPTER: PathAdapter = { toNative: toWindowsNative }

export const selectPathAdapter = (platform: NodeJS.Platform = process.platform): PathAdapter =>
  platform === 'win32' ? WINDOWS_ADAPTER : POSIX_ADAPTER

export const toNativeCwd = (cwd: PortablePath): string => selectPathAdapter().toNative(cwd)
