import type { PortablePath }           from '@yarnpkg/fslib'

import type { PathAdapter }            from './path.interfaces.js'

import { toNative as toPosixNative }   from './posix.js'
import { toNative as toWindowsNative } from './windows.js'

const POSIX_ADAPTER: PathAdapter = { toNative: toPosixNative }
const WINDOWS_ADAPTER: PathAdapter = { toNative: toWindowsNative }

export const selectPathAdapter = (platform: NodeJS.Platform = process.platform): PathAdapter =>
  platform === 'win32' ? WINDOWS_ADAPTER : POSIX_ADAPTER

export const toNativeCwd = (cwd: PortablePath): string => selectPathAdapter().toNative(cwd)
