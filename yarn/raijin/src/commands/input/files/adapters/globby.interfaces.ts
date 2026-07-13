export interface GlobbyFileDiscoveryOptions {
  readonly cwd: string
  readonly patterns: ReadonlyArray<string>
  readonly ignore?: ReadonlyArray<string>
  readonly dot?: boolean
}
