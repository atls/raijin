import type { PortablePath }               from '@yarnpkg/fslib'

import type { PathAdapter }                from './path.interfaces.js'

import { toNative as toPosixNative }       from './posix.js'
import { toPortable as toPosixPortable }   from './posix.js'
import { toNative as toWindowsNative }     from './windows.js'
import { toPortable as toWindowsPortable } from './windows.js'

const POSIX_ADAPTER: PathAdapter = { toNative: toPosixNative, toPortable: toPosixPortable }
const WINDOWS_ADAPTER: PathAdapter = {
  toNative: toWindowsNative,
  toPortable: toWindowsPortable,
}

export const selectPathAdapter = (platform: NodeJS.Platform = process.platform): PathAdapter =>
  platform === 'win32' ? WINDOWS_ADAPTER : POSIX_ADAPTER

export const toNativeCwd = (cwd: PortablePath): string => selectPathAdapter().toNative(cwd)

export const toPortableCwd = (cwd: string): PortablePath => selectPathAdapter().toPortable(cwd)
