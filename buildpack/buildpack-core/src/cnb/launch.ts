import { stringify } from '@iarna/toml'

import fs            from 'fs'
import { join }      from 'path'

export class Launch {
  processes: {
    command: string
    type: 'web' | 'worker'
    direct: boolean
    args: string[]
  }[] = []

  addWebProcess([command, ...args]: string[]) {
    this.processes.push({ type: 'web', command, direct: true, args })
  }

  save(layersPath: string) {
    if (this.processes.length > 0) {
      const launchPath = join(layersPath, 'launch.toml')

      fs.writeFileSync(
        launchPath,
        stringify({
          processes: this.processes,
        })
      )
    }
  }
}
