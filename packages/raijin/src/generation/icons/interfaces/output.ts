export interface Module {
  component: string
  content: string
  name: string
}

export interface OutputReplacer {
  replace: (cwd: string, modules: ReadonlyArray<Module>) => Promise<Array<string>>
}
