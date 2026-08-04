import type { ChildProcessInvocation } from '@atls/raijin/commands'

export const captureGit = async (
  child: ChildProcessInvocation,
  args: Array<string>
): Promise<string> => {
  const result = await child.execute('git', args, {
    output: { mode: 'capture' },
    scope: 'project',
  })

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `git ${args[0]} exited with code ${result.exitCode}`)
  }

  return result.stdout
}
