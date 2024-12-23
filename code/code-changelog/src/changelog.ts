import type { Options }      from 'conventional-changelog'

import { readFileSync }      from 'node:fs'
import { writeFileSync }     from 'node:fs'
import { join }              from 'node:path'

import conventionalChangelog from 'conventional-changelog'

interface GenerateOptions {
  packageName: string
  path: string
  debug?: boolean
  tagPrefix?: string
  version?: string
  file?: boolean
  releaseCount?: number
}

export class Changelog {
  async generate({
    path,
    packageName,
    debug,
    tagPrefix,
    file,
    releaseCount,
  }: GenerateOptions): Promise<string> {
    const config: Options = {
      lernaPackage: `${packageName}`,
      tagPrefix,
      debug: debug ? console.debug : undefined,
      preset: 'angular',
      append: true,
      releaseCount,
      pkg: {
        path: join(path, 'package.json'),
      },
      config: {
        gitRawCommitsOpts: {
          path,
        },
      },
    }

    if (file) {
      return await this.generateToFile(config, path)
    }

    return this.generateToStdOut(config)
  }

  private generateToStdOut(config: Options): string {
    const changelogStream = conventionalChangelog(config)

    let newChangelog = ''

    changelogStream.on('data', (record) => {
      newChangelog += record.toString()
    })

    return newChangelog
  }

  private async generateToFile(config: Options, path: string): Promise<string> {
    const outFile = join(path, 'CHANGELOG.md')

    let newChangelog = ''

    const changelogStream = conventionalChangelog(config)
    changelogStream.on('data', (record) => {
      newChangelog += record.toString()
    })

    changelogStream.on('end', () => {
      let existingData = ''

      try {
        existingData = readFileSync(outFile, 'utf8')
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') throw error
      }

      let updatedData = newChangelog
      if (existingData) {
        updatedData += `\n${existingData}`
      }
      writeFileSync(outFile, updatedData)
    })

    return ''
  }
}
