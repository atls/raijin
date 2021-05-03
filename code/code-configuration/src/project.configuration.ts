import { PortablePath } from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'

export interface ProjectConfigurationTunnel {
  host?: string
}

export class ProjectConfiguration {
  constructor(public readonly tunnel?: ProjectConfigurationTunnel) {}

  static async findRcFile(cwd: PortablePath): Promise<Partial<ProjectConfiguration>> {
    const rcPath = ppath.join(cwd, '.projectrc.json' as PortablePath)

    if (xfs.existsSync(rcPath)) {
      const content = await xfs.readFilePromise(rcPath, `utf8`)

      try {
        return JSON.parse(content)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
      }
    }

    return {}
  }

  static async find(cwd: PortablePath): Promise<ProjectConfiguration> {
    const { tunnel } = await ProjectConfiguration.findRcFile(cwd)

    const configuration = new ProjectConfiguration(tunnel)

    return configuration
  }
}
