import { join }   from 'node:path'

import typescript from 'typescript'

const PROJECT_CONFIG = 'tsconfig.json'

export const hasTypeScriptProject = (cwd: string): boolean =>
  typescript.sys.fileExists(join(cwd, PROJECT_CONFIG))
