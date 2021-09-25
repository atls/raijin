import execa            from 'execa'

import { Builder }      from '@atls/buildpack-core'
import { BuildContext } from '@atls/buildpack-core'
import { BuildResult }  from '@atls/buildpack-core'

export class YarnInstallBuilder implements Builder {
  async build(ctx: BuildContext): Promise<BuildResult> {
    await execa('yarn', ['install', '--immutable', '--immutable-cache', '--inline-builds'], {
      stdin: 'inherit',
    })
  }
}
