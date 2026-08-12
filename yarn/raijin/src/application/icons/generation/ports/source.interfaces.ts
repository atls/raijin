export interface Source {
  content: string
  name: string
}

export interface SourceReader {
  read: (cwd: string) => Promise<Array<Source>>
}
