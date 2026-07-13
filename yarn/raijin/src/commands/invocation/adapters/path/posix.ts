import type { PortablePath } from '@yarnpkg/fslib'

export const toNative = (cwd: PortablePath): string => cwd

export const toPortable = (cwd: string): PortablePath => cwd as PortablePath
