import { Project }   from '@yarnpkg/core'
import { execUtils } from '@yarnpkg/core'

export const getLocalChangedFiles = async (
  project: Project,
  gitRange?: string
): Promise<Array<string>> => {
  const { stdout } = await execUtils.execvp(
    'git',
    ['diff', '--name-only', ...(gitRange ? [gitRange] : [])],
    {
      cwd: project.cwd,
      strict: true,
    }
  )

  return stdout.split(/\r?\n/)
}
