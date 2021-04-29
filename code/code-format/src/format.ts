import fs                                                 from 'fs'
import globby                                             from 'globby'
import ignore                                             from 'ignore'
import path                                               from 'path'
import { format }                                         from 'prettier'

import { config, createPatterns, ignore as ignoreConfig } from './config'

const formatFiles = (files: string[] = [], projectPath?: string) => {
  const ignorer = ignore().add(ignoreConfig)
  const cwd = projectPath || process.cwd()

  files
    .filter((filePath) => ignorer.filter([path.relative(cwd, filePath)]).length !== 0)
    .forEach((filename: string) => {
      const input = fs.readFileSync(filename, 'utf8')

      const output = format(input, { ...config, filepath: filename })

      const isDifferent = output !== input

      if (isDifferent) {
        fs.writeFileSync(filename, output, 'utf8')
      }
    })
}

const formatProject = (projectPath?: string) => {
  const cwd = projectPath || process.cwd()

  const patterns = createPatterns(cwd)

  const filePaths = globby.sync(patterns, { dot: true, onlyFiles: true })

  formatFiles(filePaths, projectPath)
}

export { formatFiles, formatProject }
