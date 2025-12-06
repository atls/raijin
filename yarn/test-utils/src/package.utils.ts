import type { Workspace }    from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'
import type { Filename }     from '@yarnpkg/fslib'

import { Configuration }     from '@yarnpkg/core'
import { Manifest }          from '@yarnpkg/core'
import { Project }           from '@yarnpkg/core'
import { WorkspaceResolver } from '@yarnpkg/core'
import { ThrowReport }       from '@yarnpkg/core'
import { scriptUtils }       from '@yarnpkg/core'
import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { packUtils }         from '@yarnpkg/plugin-pack'

export class PackageUtils {
  private configuration?: Configuration

  private project?: Project

  private rootWorkspace?: Workspace

  get cwd(): PortablePath {
    return process.cwd() as PortablePath
  }

  async getWorkspacePackage(name: string): Promise<PortablePath> {
    const workspace = (await this.getRootWorkspace())
      ?.getRecursiveWorkspaceChildren()
      .find((ws) => ws.manifest.raw.name === name)

    if (!workspace) {
      throw new Error('Workspace not found')
    }

    return ppath.resolve(workspace.cwd, 'package.tgz' as Filename)
  }

  async getConfiguration(): Promise<Configuration> {
    if (!this.configuration) {
      this.configuration = await Configuration.find(this.cwd, null, {
        strict: false,
      })

      this.configuration.values.set('enableInlineBuilds', true)
    }

    return this.configuration
  }

  async getProject(): Promise<Project> {
    if (!this.project) {
      const { project, workspace } = await Project.find(await this.getConfiguration(), this.cwd)

      if (!workspace) {
        throw new Error('Root workspace not found')
      }

      this.project = project
      this.rootWorkspace = workspace
    }

    return this.project
  }

  async getRootWorkspace(): Promise<Workspace | undefined> {
    if (!this.rootWorkspace) {
      await this.getProject()
    }

    return this.rootWorkspace
  }

  async pack(workspaces: string): Promise<PortablePath> {
    const configuration = await this.getConfiguration()
    const { project, workspace } = await Project.find(configuration, this.cwd)

    if (!workspace) {
      throw new Error('Root workspace not found')
    }

    const workspaceForPackage = workspace
      .getRecursiveWorkspaceChildren()
      .find((ws) => workspaces === ws.manifest.raw.name)

    if (!workspaceForPackage) {
      throw new Error('Workspace for package not found')
    }

    await project.restoreInstallState()

    return this.packWorkspace(project, configuration, workspaceForPackage)
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

    await scriptUtils.maybeExecuteWorkspaceLifecycleScript(workspace, 'prepack', {
      report: new ThrowReport(),
    })

    const manifestPath = ppath.join(workspace.cwd, Manifest.fileName)

    if (await xfs.existsPromise(manifestPath))
      await workspace.manifest.loadFile(manifestPath, { baseFs: xfs })

    for await (const descriptor of workspace.manifest.dependencies.values()) {
      if (descriptor.range.startsWith(WorkspaceResolver.protocol)) {
        const dependent = project.tryWorkspaceByDescriptor(descriptor)

        if (dependent) {
          const dt = await this.packWorkspace(project, configuration, dependent)

          descriptor.range = `file:${dt}`

          workspace.manifest.raw.dependencies[dependent.manifest.raw.name] = descriptor.range
        }
      }
    }

    for await (const descriptor of workspace.manifest.devDependencies.values()) {
      if (descriptor.range.startsWith(WorkspaceResolver.protocol)) {
        const dependent = project.tryWorkspaceByDescriptor(descriptor)

        if (dependent) {
          const dt = await this.packWorkspace(project, configuration, dependent)

          descriptor.range = `file:${dt}`

          workspace.manifest.raw.devDependencies[dependent.manifest.raw.name] = descriptor.range
        }
      }
    }

    if (workspace.manifest.raw.publishConfig) {
      if (workspace.manifest.raw.publishConfig.main) {
        workspace.manifest.raw.main = workspace.manifest.raw.publishConfig.main
      }
    }

    if (workspace.manifest.raw.publishConfig) {
      if (workspace.manifest.raw.publishConfig.exports) {
        workspace.manifest.raw.exports = workspace.manifest.raw.publishConfig.exports
      }
    }

    const files = await packUtils.genPackList(workspace)

    const pack = await packUtils.genPackStream(workspace, files)
    const write = xfs.createWriteStream(target)

    pack.pipe(write)

    await new Promise((resolve) => {
      // @ts-expect-error missing args
      write.on('finish', resolve)
    })

    return target
  }
}

export const packageUtils = new PackageUtils()
