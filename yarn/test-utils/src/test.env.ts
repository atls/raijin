import type { PortablePath }      from '@yarnpkg/fslib'
import type { ExecFileException } from 'node:child_process'

import { execFile }               from 'node:child_process'
import { join }                   from 'node:path'
import { fileURLToPath }          from 'node:url'

import { WorkspaceResolver }      from '@yarnpkg/core'
import { ppath }                  from '@yarnpkg/fslib'
import { xfs }                    from '@yarnpkg/fslib'

import { packageUtils }           from './package.utils.js'

export interface PackageJSON {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  workspaces?: Array<string>
}

const defaultPackageJSON = {
  dependencies: {
    '@atls/code-runtime': 'workspace:*',
  },
  workspaces: ['./*'],
}

export class TestEnv {
  protected constructor(
    protected readonly cwd: PortablePath,
    protected readonly yarnReleasePath: PortablePath,
    protected readonly packageJSON: PackageJSON
  ) {}

  get path(): PortablePath {
    return this.cwd
  }

  static async create(packageJSON: PackageJSON = defaultPackageJSON): Promise<TestEnv> {
    const cwd = await xfs.mktempPromise()

    const testEnv = new TestEnv(
      cwd,
      ppath.join(cwd, '.yarn/releases', 'yarn.mjs'),
      await TestEnv.preparePackageJSON(packageJSON)
    )

    await testEnv.preparePackage()

    return testEnv
  }

  protected static async preparePackageJSON(packageJSON: PackageJSON): Promise<PackageJSON> {
    if (packageJSON.dependencies) {
      for await (const dep of Object.keys(packageJSON.dependencies)) {
        if (packageJSON.dependencies[dep].startsWith(WorkspaceResolver.protocol)) {
          packageJSON.dependencies[dep] = await packageUtils.pack(dep)
        }
      }
    }

    if (packageJSON.devDependencies) {
      for await (const dep of Object.keys(packageJSON.devDependencies)) {
        if (packageJSON.devDependencies[dep].startsWith(WorkspaceResolver.protocol)) {
          packageJSON.devDependencies[dep] = await packageUtils.pack(dep)
        }
      }
    }

    return packageJSON
  }

  async run(...command: Array<string>): Promise<{
    stdout: string
    stderr: string
    code?: number | string | null
    error?: ExecFileException
  }> {
    return new Promise((resolve) => {
      execFile(
        process.execPath,
        [this.yarnReleasePath, ...command],
        {
          timeout: 60_000,
          cwd: this.cwd,
          env: {
            YARN_PNP_ENABLE_ESM_LOADER: '1',
            NODE_OPTIONS: '',
          },
        },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              code: error.code,
              stdout,
              stderr,
              error,
            })
          } else {
            resolve({
              code: 0,
              stdout,
              stderr,
            })
          }
        }
      )
    })
  }

  async writeFile(file: PortablePath | string, content: string): Promise<void> {
    return xfs.writeFilePromise(ppath.join(this.cwd, file as PortablePath), content)
  }

  async mkdir(dir: PortablePath | string): Promise<string | undefined> {
    return xfs.mkdirPromise(ppath.join(this.cwd, dir as PortablePath), {
      recursive: true,
    })
  }

  async readFile(file: PortablePath | string): Promise<string> {
    return xfs.readFilePromise(ppath.join(this.cwd, file as PortablePath), 'utf8')
  }

  protected async preparePackage(): Promise<void> {
    await xfs.writeJsonPromise(ppath.join(this.cwd, 'package.json'), {
      ...this.packageJSON,
      type: 'module',
    })
    await xfs.writeFilePromise(
      ppath.join(this.cwd, '.yarnrc.yml'),
      `
packageExtensions:
  '@typescript-eslint/utils@*':
    dependencies:
      eslint: '*'
    `
    )
    await xfs.mkdirPromise(ppath.dirname(this.yarnReleasePath), { recursive: true })
    await xfs.copyFilePromise(
      join(fileURLToPath(new URL('.', import.meta.url)), '../../cli/dist/yarn.mjs') as PortablePath,
      this.yarnReleasePath
    )
  }
}
