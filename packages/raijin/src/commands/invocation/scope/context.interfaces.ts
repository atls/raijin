import type { CommandContext } from '@yarnpkg/core'

export type InvocationContext = Pick<
  CommandContext,
  'cwd' | 'env' | 'plugins' | 'stderr' | 'stdin' | 'stdout'
>
