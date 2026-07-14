import type { CommandInput }     from '@atls/raijin/commands'

import type { FormatterOptions } from './formatter.interfaces.js'

import EventEmitter              from 'node:events'
import { stat }                  from 'node:fs/promises'
import { writeFile }             from 'node:fs/promises'
import { readFile }              from 'node:fs/promises'
import { relative }              from 'node:path'
import { resolve }               from 'node:path'
import { join }                  from 'node:path'

import { format }                from 'prettier/standalone'
import ignorer                   from 'ignore'

import { createCommandInput }    from '@atls/raijin/commands'
import { toPortableCwd }         from '@atls/raijin/commands'
import { discoverFiles }         from '@atls/raijin/filesystem'
import { toNativePath }          from '@atls/raijin/filesystem'
import { createPrettierConfig }  from '@atls/raijin/prettier/config'

import { ignore }                from './formatter.patterns.js'
import { ignorePatterns }        from './formatter.patterns.js'
import { patterns }              from './formatter.patterns.js'

export class Formatter extends EventEmitter {
  constructor(
    private readonly cwd: string,
    private readonly options: FormatterOptions
  ) {
    super()
  }

  static async initialize(cwd: string, options: FormatterOptions = {}): Promise<Formatter> {
    return new Formatter(cwd, options)
  }

  async format(input?: CommandInput): Promise<void> {
    if (input) {
      await this.formatFiles(input)
    } else {
      await this.formatProject()
    }
  }

  protected async formatFiles(input: CommandInput): Promise<void> {
    const prettierConfig = await createPrettierConfig({
      workspacePackageNames: this.options.workspacePackageNames,
    })
    const targetFiles = await this.resolveFormatFiles(input)

    const formatFiles = ignorer
      .default()
      .add(ignore)
      .add(await this.getProjectIgnorePatterns())
      .filter(targetFiles.map((filepath) => relative(this.cwd, filepath)))

    this.emit('start', { files: formatFiles })

    for await (const filename of formatFiles) {
      this.emit('format:start', { file: filename })

      const targetFile = resolve(this.cwd, filename)
      const source = await readFile(targetFile, 'utf8')

      const output = await format(source, {
        ...prettierConfig,
        filepath: filename,
      })

      if (output !== source && output) {
        await writeFile(targetFile, output, 'utf8')

        this.emit('format:end', { file: filename, changed: true })
      } else {
        this.emit('format:end', { file: filename, changed: false })
      }
    }

    this.emit('end')
  }

  protected async formatProject(): Promise<void> {
    const files = await discoverFiles({
      cwd: toPortableCwd(this.cwd),
      patterns,
      ignore: ignorePatterns,
      dot: true,
    })

    await this.formatFiles(
      createCommandInput({
        cwd: toPortableCwd(this.cwd),
        source: 'generated',
        targets: files,
      })
    )
  }

  protected async resolveFormatFiles(input: CommandInput): Promise<Array<string>> {
    const resolvedFiles: Array<string> = []

    for await (const target of input.targets) {
      const targetPath = toNativePath(target.path)
      let targetStat

      try {
        targetStat = await stat(targetPath)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          throw new Error(`Formatter target does not exist: ${target.request}`)
        }

        throw error
      }

      if (targetStat.isDirectory()) {
        resolvedFiles.push(
          ...(
            await discoverFiles({
              cwd: target.path,
              patterns,
              ignore: ignorePatterns,
              dot: true,
            })
          ).map((file) => toNativePath(file))
        )
      } else {
        resolvedFiles.push(targetPath)
      }
    }

    return Array.from(new Set(resolvedFiles))
  }

  protected async getProjectIgnorePatterns(): Promise<Array<string>> {
    const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')

    const { formatterIgnorePatterns = [] }: { formatterIgnorePatterns: Array<string> } =
      JSON.parse(content)

    return formatterIgnorePatterns
  }
}
