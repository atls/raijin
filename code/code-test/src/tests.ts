import { readFile } from 'node:fs/promises'

export interface Test {
  file: string
  source: string
  tests: number
}

export class Tests {
  static async load(files: Array<string>): Promise<Array<Test>> {
    return Promise.all(
      files.map(async (file) => {
        const source = await readFile(file, 'utf8')

        return {
          file,
          source,
          tests: source.match(/test\(/gm)?.length || 0,
        }
      })
    )
  }
}
