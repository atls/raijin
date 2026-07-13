import type { PortablePath }               from '@yarnpkg/fslib'

import type { PathAdapter }                from './convert.interfaces.js'

import { toNative as toPosixNative }       from './adapters/posix.js'
import { toPortable as toPosixPortable }   from './adapters/posix.js'
import { toNative as toWindowsNative }     from './adapters/windows.js'
import { toPortable as toWindowsPortable } from './adapters/windows.js'

const POSIX_ADAPTER: PathAdapter = { toNative: toPosixNative, toPortable: toPosixPortable }
const WINDOWS_ADAPTER: PathAdapter = {
  toNative: toWindowsNative,
  toPortable: toWindowsPortable,
}

export const selectPathAdapter = (platform: NodeJS.Platform = process.platform): PathAdapter =>
  platform === 'win32' ? WINDOWS_ADAPTER : POSIX_ADAPTER

export const toNativePath = (path: PortablePath): string => selectPathAdapter().toNative(path)

export const toPortablePath = (path: string): PortablePath => selectPathAdapter().toPortable(path)
