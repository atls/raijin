import type { ProjectInvocation } from '@atls/raijin/commands/invocation'
import type { PortablePath }      from '@yarnpkg/fslib'

export type YarnProjectContext = ProjectInvocation['yarn']

export type ProjectGenerationArtifactConsumer<TResult> = (
  collection: PortablePath
) => Promise<TResult>
