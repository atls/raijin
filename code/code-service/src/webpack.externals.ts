import type { IPackageJson }      from 'package-json-type'
import type { webpack }           from '@atls/raijin/webpack'

import { readFile }               from 'node:fs/promises'
import { join }                   from 'node:path'

import { WorkspaceConfiguration } from '@atls/code-configuration'

const BUNDLED_DEPENDENCIES = new Set(['@nestjs/common'])

export class WebpackExternals {
  #externals: Array<string> = []

  #dependencies: Array<string> = []

  #optionalDependencies: Array<string> = []

  #workspaceDependencies: Set<string>

  constructor(
    private readonly cwd: string,
    workspaceDependencies: Iterable<string> = []
  ) {
    this.#workspaceDependencies = new Set(workspaceDependencies)
  }

  async loadPackageJson(): Promise<IPackageJson> {
    try {
      return JSON.parse(await readFile(join(this.cwd, 'package.json'), 'utf-8')) as IPackageJson
    } catch {
      return {}
    }
  }

  async loadDependencies(): Promise<Array<string>> {
    const {
      dependencies = {},
      devDependencies = {},
      peerDependencies = {},
    } = await this.loadPackageJson()

    return Object.keys({
      ...dependencies,
      ...devDependencies,
      ...peerDependencies,
    })
  }

  async loadOptionalDependencies(): Promise<Array<string>> {
    const { optionalDependencies = {} } = await this.loadPackageJson()

    return Object.keys(optionalDependencies)
  }

  async loadExternals(): Promise<Array<string>> {
    const { service } = await WorkspaceConfiguration.find(this.cwd)

    return service?.externals || []
  }

  async build(): Promise<typeof this.externals> {
    this.#externals = await this.loadExternals()
    this.#dependencies = await this.loadDependencies()
    this.#optionalDependencies = await this.loadOptionalDependencies()

    return this.externals.bind(this)
  }

  private externals(
    { request }: webpack.ExternalItemFunctionData,
    callback: (
      error?: Error,
      result?: string,
      type?: webpack.Configuration['externalsType']
    ) => void
  ): void {
    if (request && this.#externals.includes(request)) {
      callback(undefined, request, 'module')
    } else if (request && BUNDLED_DEPENDENCIES.has(this.getPackageRequestName(request))) {
      callback()
    } else if (request && this.#workspaceDependencies.has(this.getPackageRequestName(request))) {
      callback()
    } else if (request && this.#optionalDependencies.includes(request)) {
      callback(undefined, `import ${request}`)
    } else if (request && this.#dependencies.includes(request)) {
      callback(undefined, request, 'module')
    } else {
      callback()
    }
  }

  private getPackageRequestName(request: string): string {
    if (request.startsWith('@')) {
      const [scope, name] = request.split('/')

      return [scope, name].join('/')
    }

    const [name] = request.split('/')

    return name
  }
}
