import { Detector }      from '@atls/buildpack-core'
import { DetectContext } from '@atls/buildpack-core'
import { DetectResult }  from '@atls/buildpack-core'

export class NodeStartDetector implements Detector {
  async detect(ctx: DetectContext): Promise<DetectResult> {
    return {
      provides: [
        {
          name: 'node-start',
        },
      ],
      requires: [],
    }
  }
}
