import { Detector }      from '@atls/buildpack-core'
import { DetectContext } from '@atls/buildpack-core'
import { DetectResult }  from '@atls/buildpack-core'

export class YarnWorkspaceBuildDetector implements Detector {
  async detect(ctx: DetectContext): Promise<DetectResult> {
    if (!process.env.WORKSPACE) {
      return null
    }

    return {
      provides: [
        {
          name: 'yarn-workspace-build',
        },
      ],
      requires: [
        {
          name: 'yarn-workspace-build',
          metadata: {
            workspace: process.env.WORKSPACE,
          },
        },
      ],
    }
  }
}
