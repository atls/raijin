import type { scriptUtils as YarnScriptUtils } from '@yarnpkg/core'

import { createRequire }                       from 'node:module'

type ScriptUtilities = Pick<
  typeof YarnScriptUtils,
  'getPackageAccessibleBinaries' | 'makeScriptEnv'
>

const require = createRequire(import.meta.url)

export const { scriptUtils } = require('@yarnpkg/core') as { scriptUtils: ScriptUtilities }
