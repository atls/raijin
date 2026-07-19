export interface CliSurfaceExample {
  command: string
  description: string
}

export interface CliSurfaceOption {
  definition: string
  description?: string
  nameSet: Array<string>
  preferredName: string
  required: boolean
}

export interface CliSurfaceCommand {
  command: string
  description: string
  details?: string
  examples: Array<CliSurfaceExample>
  options: Array<CliSurfaceOption>
  pathTokens: Array<string>
  plugin: string
  usage: string
}

export interface CliSurfaceInventory {
  schemaVersion: 1
  commands: Array<CliSurfaceCommand>
  plugins: Array<string>
}
