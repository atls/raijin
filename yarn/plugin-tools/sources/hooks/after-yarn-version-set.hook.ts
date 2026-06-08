import type { Configuration }  from '@yarnpkg/core'
import type { CommandContext } from '@yarnpkg/core'

import { Project }             from '@yarnpkg/core'
import { execUtils }           from '@yarnpkg/core'
import { xfs }                 from '@yarnpkg/fslib'

import { makeYarnReentry }     from '@atls/yarn-run-utils'

export const afterYarnVersionSet = async (
  configuration: Configuration,
  context: CommandContext
): Promise<void> => {
  const { project } = await Project.find(configuration, context.cwd)
  const binFolder = await xfs.mktempPromise()
  const { executable, env } = await makeYarnReentry({ binFolder, project })

  await execUtils.pipevp(executable, ['tools', 'sync'], {
    cwd: context.cwd,
    stdin: context.stdin,
    stdout: context.stdout,
    stderr: context.stderr,
    end: execUtils.EndStrategy.ErrorCode,
    env,
  })
}
