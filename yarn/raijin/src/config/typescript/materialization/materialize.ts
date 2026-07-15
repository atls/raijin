import type { MaterializeTypeScriptConfigOptions } from './materialize.interfaces.js'

import { mkdtemp }                                 from 'node:fs/promises'
import { writeFile }                               from 'node:fs/promises'
import { tmpdir }                                  from 'node:os'
import { join }                                    from 'node:path'

const PROJECT_CONFIG = 'tsconfig.json'

export const materializeTypeScriptConfig = async ({
  config,
  prefix,
}: MaterializeTypeScriptConfigOptions): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), prefix))
  const path = join(cwd, PROJECT_CONFIG)

  await writeFile(path, JSON.stringify(config))

  return path
}
