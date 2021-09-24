import { BuildContext } from './build.context'

export type BuildResult = any

export interface Builder {
  build(context: BuildContext): Promise<BuildResult>
}
