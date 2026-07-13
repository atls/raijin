import type { PortablePath } from '@yarnpkg/fslib'

export const toNative = (path: PortablePath): string => path

export const toPortable = (path: string): PortablePath => path as PortablePath
