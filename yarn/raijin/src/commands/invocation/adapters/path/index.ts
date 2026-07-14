import type { PortablePath } from '@yarnpkg/fslib'

import { toNativePath }      from '@atls/raijin/filesystem'
import { toPortablePath }    from '@atls/raijin/filesystem'

export const toNativeCwd = (cwd: PortablePath): string => toNativePath(cwd)

export const toPortableCwd = (cwd: string): PortablePath => toPortablePath(cwd)
