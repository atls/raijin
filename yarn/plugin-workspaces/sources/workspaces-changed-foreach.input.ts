interface CreateForeachInputOptions {
  exclude?: string
  verbose?: boolean
  parallel?: boolean
  interlaced?: boolean
  publicOnly?: boolean
  topological?: boolean
  topologicalDev?: boolean
  jobs?: number
}

export const createForeachInput = (
  workspaceIdents: ReadonlyArray<string>,
  options: CreateForeachInputOptions
): Array<string> => {
  const input = ['workspaces', 'foreach']

  workspaceIdents.forEach((ident) => {
    input.push('--include')
    input.push(ident)
  })

  input.push('--all')

  if (options.exclude) {
    input.push('--exclude')
    input.push(options.exclude)
  }

  if (options.verbose) {
    input.push('--verbose')
  }

  if (options.parallel) {
    input.push('--parallel')
  }

  if (options.interlaced) {
    input.push('--interlaced')
  }

  if (options.publicOnly) {
    input.push('--no-private')
  }

  if (options.topological) {
    input.push('--topological')
  }

  if (options.topologicalDev) {
    input.push('--topological-dev')
  }

  if (options.jobs) {
    input.push('--jobs')
    input.push(String(options.jobs))
  }

  return input
}
