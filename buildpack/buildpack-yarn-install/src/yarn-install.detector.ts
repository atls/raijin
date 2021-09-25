import fs                from 'fs'
import path              from 'path'

import { Detector }      from '@atls/buildpack-core'
import { DetectContext } from '@atls/buildpack-core'
import { DetectResult }  from '@atls/buildpack-core'

export class YarnInstallDetector implements Detector {
  async detect(ctx: DetectContext): Promise<DetectResult> {
    if (!fs.existsSync(path.join(ctx.workingDir, 'yarn.lock'))) {
      return null
    }

    return {
      provides: [
        {
          name: 'yarn-install',
        },
      ],
      requires: [
        {
          name: 'yarn-install',
        },
      ],
    }
  }
}
