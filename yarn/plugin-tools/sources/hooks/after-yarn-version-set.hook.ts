import type { Configuration }  from '@yarnpkg/core'
import type { CommandContext } from '@yarnpkg/core'

import { Project }             from '@yarnpkg/core'
import { execUtils }           from '@yarnpkg/core'
import { scriptUtils }         from '@yarnpkg/core'
import { xfs }                 from '@yarnpkg/fslib'

export const afterYarnVersionSet = async (
  configuration: Configuration,
  context: CommandContext
): Promise<void> => {
  const { project } = await Project.find(configuration, context.cwd)
  const binFolder = await xfs.mktempPromise()
  const env = await scriptUtils.makeScriptEnv({ binFolder, project, ignoreCorepack: true })

  await execUtils.pipevp('yarn', ['tools', 'sync'], {
    cwd: context.cwd,
    stdin: context.stdin,
    stdout: context.stdout,
    stderr: context.stderr,
    end: execUtils.EndStrategy.ErrorCode,
    env,
  })
}
