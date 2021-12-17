import { writeFile }                from 'node:fs/promises'
import { readFile }                 from 'node:fs/promises'
import { relative }                 from 'node:path'

import globby                       from 'globby'
import ignore                       from 'ignore'
import { format }                   from 'prettier'

import { ignore as ignoreConfig }   from './config'
import { createPatterns }           from './config'
import { config }                   from './config'
import { NullFormatProgressReport } from './format.progress-report'
import { FormatProgressReport }     from './format.progress-report'

export class Formatter {
  constructor(private readonly cwd: string) {}

  async format(
    files?: Array<string>,
    progress: FormatProgressReport = new NullFormatProgressReport()
  ) {
    if (files && files.length > 0) {
      await this.formatFiles(files, progress)
    } else {
      await this.formatProject(progress)
    }
  }

  async formatFiles(
    files: Array<string> = [],
    progress: FormatProgressReport = new NullFormatProgressReport()
  ) {
    const ignorer = ignore().add(ignoreConfig)

    const totalFiles = files.filter(
      (filePath) => ignorer.filter([relative(this.cwd, filePath)]).length !== 0
    )

    progress.start(totalFiles)

    const formatPromises = totalFiles.map(async (filename: string) => {
      const input = await readFile(filename, 'utf8')

      const output = format(input, { ...config, filepath: filename })

      const isDifferent = output !== input

      if (isDifferent) {
        await writeFile(filename, output, 'utf8')
      }

      progress.format(filename)
    })

    await Promise.all(formatPromises)

    progress.end()
  }

  async formatProject(progress: FormatProgressReport = new NullFormatProgressReport()) {
    const files = await globby(createPatterns(this.cwd), { dot: true, onlyFiles: true })

    await this.formatFiles(files, progress)
  }
}
