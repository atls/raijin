export interface IconModule {
  component: string
  content: string
  name: string
}

export interface IconOutputReplacer {
  replace: (cwd: string, modules: ReadonlyArray<IconModule>) => Promise<Array<string>>
}
