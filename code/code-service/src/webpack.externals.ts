import type { IPackageJson }      from 'package-json-type'
import type { webpack }           from '@atls/raijin/webpack'

import { readdir }                from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { dirname }                from 'node:path'
import { join }                   from 'node:path'
import { relative }               from 'node:path'

import { WorkspaceConfiguration } from '@atls/code-configuration'

const IGNORED_WORKSPACE_SCAN_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.yarn',
  'coverage',
  'dist',
  'node_modules',
])
const BUNDLED_DEPENDENCIES = new Set(['@nestjs/common'])

type WorkspacesManifest = {
  packages?: unknown
}

export class WebpackExternals {
  #externals: Array<string> = []

  #dependencies: Array<string> = []

  #optionalDependencies: Array<string> = []

  #workspaceDependencies: Array<string> = []

  constructor(private readonly cwd: string) {}

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

  async loadWorkspaceDependencies(): Promise<Array<string>> {
    const root = await this.findWorkspaceRoot()

    if (!root) {
      return []
    }

    const manifests = await this.collectWorkspacePackageManifests(root.cwd, root.patterns)

    return manifests.flatMap(({ name }) => (name ? [name] : []))
  }

  async loadExternals(): Promise<Array<string>> {
    const { service } = await WorkspaceConfiguration.find(this.cwd)

    return service?.externals || []
  }

  async build(): Promise<typeof this.externals> {
    this.#externals = await this.loadExternals()
    this.#dependencies = await this.loadDependencies()
    this.#optionalDependencies = await this.loadOptionalDependencies()
    this.#workspaceDependencies = await this.loadWorkspaceDependencies()

    return this.externals.bind(this)
  }

  private async findWorkspaceRoot(): Promise<{ cwd: string; patterns: Array<string> } | null> {
    const candidates = this.getAncestorCwds(this.cwd)
    const manifests = await Promise.all(
      candidates.map(async (cwd) => ({
        cwd,
        patterns: this.getWorkspacePatterns(await this.loadPackageJsonAt(cwd)),
      }))
    )

    return manifests.find(({ patterns }) => patterns.length > 0) || null
  }

  private getAncestorCwds(cwd: string): Array<string> {
    const cwds = []
    let currentCwd = cwd

    while (true) {
      cwds.push(currentCwd)

      const parent = dirname(currentCwd)

      if (parent === currentCwd) {
        return cwds
      }

      currentCwd = parent
    }
  }

  private async collectWorkspacePackageManifests(
    root: string,
    patterns: Array<string>
  ): Promise<Array<IPackageJson>> {
    const packageCwds = await this.collectPackageJsonCwds(root)
    const manifests = await Promise.all(
      packageCwds.map(async (packageCwd) => ({
        packageCwd,
        manifest: await this.loadPackageJsonAt(packageCwd),
      }))
    )

    return manifests
      .filter(({ packageCwd }) => this.isWorkspacePath(relative(root, packageCwd) || '.', patterns))
      .map(({ manifest }) => manifest)
  }

  private async collectPackageJsonCwds(cwd: string): Promise<Array<string>> {
    const entries = await readdir(cwd, { withFileTypes: true })
    const currentCwd = entries.some((entry) => entry.isFile() && entry.name === 'package.json')
      ? [cwd]
      : []
    const childPackageCwds = await Promise.all(
      entries
        .filter(
          (entry) => entry.isDirectory() && !IGNORED_WORKSPACE_SCAN_DIRECTORIES.has(entry.name)
        )
        .map(async (entry) => this.collectPackageJsonCwds(join(cwd, entry.name)))
    )

    return [...currentCwd, ...childPackageCwds.flat()]
  }

  private async loadPackageJsonAt(cwd: string): Promise<IPackageJson> {
    try {
      return JSON.parse(await readFile(join(cwd, 'package.json'), 'utf-8')) as IPackageJson
    } catch {
      return {}
    }
  }

  private getWorkspacePatterns(manifest: IPackageJson): Array<string> {
    const { workspaces } = manifest

    if (Array.isArray(workspaces)) {
      return this.filterWorkspacePatterns(workspaces)
    }

    if (workspaces && typeof workspaces === 'object') {
      const { packages } = workspaces as WorkspacesManifest

      return this.filterWorkspacePatterns(packages)
    }

    return []
  }

  private filterWorkspacePatterns(patterns: unknown): Array<string> {
    if (!Array.isArray(patterns)) {
      return []
    }

    return patterns.filter((pattern): pattern is string => typeof pattern === 'string')
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
    } else if (
      request &&
      this.#workspaceDependencies.includes(this.getPackageRequestName(request))
    ) {
      callback()
    } else if (request && this.#optionalDependencies.includes(request)) {
      callback(undefined, `import ${request}`)
    } else if (request && this.#dependencies.includes(request)) {
      callback(undefined, request, 'module')
    } else {
      callback()
    }
  }

  private isWorkspacePath(workspacePath: string, patterns: Array<string>): boolean {
    return patterns.some((pattern) => {
      const normalizedPattern = pattern.replace(/\/package\.json$/, '')

      return this.matchWorkspaceSegments(
        this.splitWorkspacePath(workspacePath),
        this.splitWorkspacePath(normalizedPattern)
      )
    })
  }

  private splitWorkspacePath(workspacePath: string): Array<string> {
    return workspacePath.split('/').filter(Boolean)
  }

  private matchWorkspaceSegments(
    workspaceSegments: Array<string>,
    patternSegments: Array<string>
  ): boolean {
    if (patternSegments.length === 0) {
      return workspaceSegments.length === 0
    }

    const [patternSegment, ...nextPatternSegments] = patternSegments

    if (patternSegment === '**') {
      return (
        this.matchWorkspaceSegments(workspaceSegments, nextPatternSegments) ||
        (workspaceSegments.length > 0 &&
          this.matchWorkspaceSegments(workspaceSegments.slice(1), patternSegments))
      )
    }

    const [workspaceSegment, ...nextWorkspaceSegments] = workspaceSegments

    if (!workspaceSegment) {
      return false
    }

    return (
      this.matchWorkspaceSegment(workspaceSegment, patternSegment) &&
      this.matchWorkspaceSegments(nextWorkspaceSegments, nextPatternSegments)
    )
  }

  private matchWorkspaceSegment(workspaceSegment: string, patternSegment: string): boolean {
    if (patternSegment === '*') {
      return true
    }

    if (!patternSegment.includes('*')) {
      return workspaceSegment === patternSegment
    }

    const parts = patternSegment.split('*')
    let offset = 0

    for (const part of parts) {
      if (part) {
        const index = workspaceSegment.indexOf(part, offset)

        if (index === -1) {
          return false
        }

        offset = index + part.length
      }
    }

    const lastPart = parts.at(-1) || ''

    return !lastPart || workspaceSegment.endsWith(lastPart)
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
