export interface LintCall {
  files: Array<string>
  fix: boolean
}

export interface Calls {
  format: Array<Array<string>>
  lint: Array<LintCall>
}

export interface Fixture {
  projectCwd: string
  workspaceCwd: string
}

export type RecordingHandler = (files: Array<string>, fix: boolean) => number
