import { Workspace }         from '@yarnpkg/core'
import { Configuration }     from '@yarnpkg/core'
import { Project }           from '@yarnpkg/core'
import { WorkspaceResolver } from '@yarnpkg/core'
import { ThrowReport }       from '@yarnpkg/core'
import { PortablePath }      from '@yarnpkg/fslib'
import { Filename }          from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { prepareForPack }    from '@yarnpkg/plugin-pack/lib/packUtils.js'
import { genPackList }       from '@yarnpkg/plugin-pack/lib/packUtils.js'
import { genPackStream }     from '@yarnpkg/plugin-pack/lib/packUtils.js'

export class PackageUtils {
  private configuration!: Configuration

  private project!: Project

  private rootWorkspace!: Workspace

  get cwd(): PortablePath {
    return process.cwd() as PortablePath
  }

  async getWorkspacePackage(name: string) {
    const workspace = (await this.getRootWorkspace())
      .getRecursiveWorkspaceChildren()
      .find((ws) => ws.manifest.raw.name === name)

    return ppath.resolve(workspace!.cwd, 'package.tgz' as Filename)
  }

  async getConfiguration() {
    if (!this.configuration) {
      this.configuration = await Configuration.find(this.cwd, null, {
        strict: false,
      })

      this.configuration.values.set('enableInlineBuilds', true)
    }

    return this.configuration
  }

  async getProject() {
    if (!this.project) {
      const { project, workspace } = await Project.find(await this.getConfiguration(), this.cwd)

      this.project = project
      this.rootWorkspace = workspace!
    }

    return this.project
  }

  async getRootWorkspace() {
    if (!this.rootWorkspace) {
      await this.getProject()
    }

    return this.rootWorkspace
  }

  async pack(workspaces: string): Promise<PortablePath> {
    const configuration = await this.getConfiguration()
    const { project, workspace } = await Project.find(configuration, this.cwd)

    const workspaceForPackage = workspace!
      .getRecursiveWorkspaceChildren()
      .find((ws) => workspaces === ws.manifest.raw.name)

    await project.restoreInstallState()

    return this.packWorkspace(project, configuration, workspaceForPackage!)
  }

  async packWorkspace(
    project: Project,
    configuration: Configuration,
    workspace: Workspace
  ): Promise<PortablePath> {
    const target = ppath.resolve(workspace.cwd, 'package.tgz' as Filename)

    if (await xfs.existsPromise(target)) {
      return target
    }

    await prepareForPack(workspace, { report: new ThrowReport() }, async () => {
      for (const descriptor of workspace.manifest.dependencies.values()) {
        if (descriptor.range.startsWith(WorkspaceResolver.protocol)) {
          const dependent = project.tryWorkspaceByDescriptor(descriptor)

          if (dependent) {
            // eslint-disable-next-line no-await-in-loop
            const dt = await this.packWorkspace(project, configuration, dependent)

            descriptor.range = `file:${dt}`

            // eslint-disable-next-line no-param-reassign
            workspace.manifest.raw.dependencies[dependent.manifest.raw.name] = descriptor.range
          }
        }
      }

      for (const descriptor of workspace.manifest.devDependencies.values()) {
        if (descriptor.range.startsWith(WorkspaceResolver.protocol)) {
          const dependent = project.tryWorkspaceByDescriptor(descriptor)

          if (dependent) {
            // eslint-disable-next-line no-await-in-loop
            const dt = await this.packWorkspace(project, configuration, dependent)

            descriptor.range = `file:${dt}`

            // eslint-disable-next-line no-param-reassign
            workspace.manifest.raw.devDependencies[dependent.manifest.raw.name] = descriptor.range
          }
        }
      }

      if (workspace.manifest.raw.publishConfig) {
        if (workspace.manifest.raw.publishConfig.main) {
          // eslint-disable-next-line no-param-reassign
          workspace.manifest.raw.main = workspace.manifest.raw.publishConfig.main
        }
      }

      if (workspace.manifest.raw.publishConfig) {
        if (workspace.manifest.raw.publishConfig.exports) {
          // eslint-disable-next-line no-param-reassign
          workspace.manifest.raw.exports = workspace.manifest.raw.publishConfig.exports
        }
      }

      const files = await genPackList(workspace)

      const pack = await genPackStream(workspace, files)
      const write = xfs.createWriteStream(target)

      pack.pipe(write)

      await new Promise((resolve) => {
        write.on('finish', resolve)
      })
    })

    return target
  }
}

export const packageUtils = new PackageUtils()
