import type { Options }      from 'conventional-changelog'

import { readFile }          from 'node:fs/promises'
import { writeFile }         from 'node:fs/promises'
import { join }              from 'node:path'
import { dirname }           from 'node:path'

import conventionalChangelog from 'conventional-changelog'
// @ts-expect-error missing types
import preset                from 'conventional-changelog-angular'

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
      // eslint-disable-next-line no-console
      debug: debug ? console.debug : undefined,
      // eslint-disable-next-line no-console
      warn: console.warn,
      append: true,
      releaseCount,
      pkg: {
        path: join(path, 'package.json'),
      },
      config: preset,
    }

    if (file) {
      return this.generateToFile(config, path)
    }

    return this.generateToStdOut(config)
  }

  private async generateToStdOut(config: Options): Promise<string> {
    return new Promise((resolve, reject) => {
      const changelogStream = conventionalChangelog(config, undefined, {
        path: dirname(config.pkg?.path ?? './'),
      })
      let newChangelog = ''

      changelogStream.on('data', (chunk: Buffer) => {
        newChangelog += chunk.toString()
      })

      changelogStream.on('end', (): void => {
        resolve(newChangelog)
      })
      changelogStream.on('error', (error): void => {
        reject(error)
      })
    })
  }

  private async generateToFile(config: Options, path: string): Promise<string> {
    const outFile = join(path, 'CHANGELOG.md')

    try {
      const newChangelog = await this.generateToStdOut(config)
      let existingData = ''

      try {
        existingData = await readFile(outFile, 'utf8')
      } catch (e: unknown) {
        const error = e as Error & { code: string }
        if (error.code !== 'ENOENT') throw error
      }

      const updatedData = existingData ? `${newChangelog}\n${existingData}` : newChangelog
      await writeFile(outFile, updatedData, 'utf8')

      return updatedData
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating changelog:', error)
      throw error
    }
  }
}
