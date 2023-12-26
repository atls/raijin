import { Workspace }         from '@yarnpkg/core'
import { Configuration }     from '@yarnpkg/core'
import { Project }           from '@yarnpkg/core'
import { WorkspaceResolver } from '@yarnpkg/core'
import { ThrowReport }       from '@yarnpkg/core'
import { PortablePath }      from '@yarnpkg/fslib'
import { Filename }          from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
// @ts-ignore
import { prepareForPack }    from '@yarnpkg/plugin-pack/lib/packUtils'
// @ts-ignore
import { genPackList }       from '@yarnpkg/plugin-pack/lib/packUtils'
// @ts-ignore
import { genPackStream }     from '@yarnpkg/plugin-pack/lib/packUtils'

export class PackageUtils {
  private configuration!: Configuration

  private project!: Project

  private rootWorkspace!: Workspace

  async getWorkspacePackage(name: string) {
    const workspace = (await this.getRootWorkspace())
      .getRecursiveWorkspaceChildren()
      .find((ws) => ws.manifest.raw.name === name)

    return ppath.resolve(workspace!.cwd, 'package.tgz' as Filename)
  }

  async getConfiguration() {
    if (!this.configuration) {
      this.configuration = await Configuration.find(process.cwd() as PortablePath, null)
    }

    return this.configuration
  }

  async getProject() {
    if (!this.project) {
      const { project, workspace } = await Project.find(
        await this.getConfiguration(),
        process.cwd() as PortablePath
      )

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

  async pack(workspaces: string) {
    const configuration = await Configuration.find(process.cwd() as PortablePath, null)
    const { project, workspace } = await Project.find(configuration, process.cwd() as PortablePath)

    const workspaceForPackage = workspace!
      .getRecursiveWorkspaceChildren()
      .find((ws) => workspaces === ws.manifest.raw.name)

    await project.restoreInstallState()

    await this.packWorkspace(project, configuration, workspaceForPackage!)
  }

  async packWorkspace(project: Project, configuration: Configuration, workspace: Workspace) {
    const target = ppath.resolve(workspace.cwd, 'package.tgz' as Filename)

    if (await xfs.existsPromise(target)) {
      return target
    }

    for (const descriptor of workspace.manifest.dependencies.values()) {
      if (descriptor.range.startsWith(WorkspaceResolver.protocol)) {
        const dependent = project.tryWorkspaceByDescriptor(descriptor)

        if (dependent) {
          // eslint-disable-next-line no-await-in-loop
          const dt = await this.packWorkspace(project, configuration, dependent)

          descriptor.range = `file:${dt}`
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
        }
      }
    }

    await prepareForPack(workspace, { report: new ThrowReport() }, async () => {
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
