import execa                           from 'execa'
import { Command }                     from '@oclif/command'

import { AnnotationLevel, Conclusion } from '../../types'
import { createCheck }                 from '../../github'

const getAnnotationLevel = level => {
  if (level !== 'failure') {
    return AnnotationLevel.Warning
  }
  return AnnotationLevel.Failure
}

const formatLine = line => {
  const [file, rule, message] = line.split(':')
  const [filePath, position] = file.split(/\(|\)/).filter(f => f)
  const [startLine] = position.split(',')
  const [level] = rule.trim().split(' ')

  return {
    path: filePath,
    start_line: Number(startLine || 0),
    end_line: Number(startLine || 0),
    annotation_level: getAnnotationLevel(level),
    title: rule.trim(),
    message: message.trim(),
    raw_details: `(${rule.trim()}): ${message.trim()}`,
  }
}

export default class TypecheckCommand extends Command {
  static description: string = 'Check TypeScript via tsc'

  static examples: string[] = ['$ actl check:typecheck']

  async run(): Promise<void> {
    try {
      const result = await execa('tsc', ['--noEmit', '-p', process.cwd(), '--pretty', 'false'])
      await this.check(result.all)
    } catch (error) {
      await this.check(error.all)
    }
  }

  async check(output: string = ''): Promise<void> {
    const annotations = output
      .split('\n')
      .reduce((result, line, index) => {
        if (line.includes(' TS')) {
          return [...result, line]
        }
        if (result.length > 0 && result[result.length - 1]) {
          // eslint-disable-next-line
          result[result.length - 1] = result[result.length - 1] + line
        }
        return result
      }, [])
      .map(formatLine)
    await createCheck(
      'TypeCheck',
      annotations.length > 0 ? Conclusion.Failure : Conclusion.Success,
      {
        title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
        summary:
          annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
        annotations,
      }
    )
  }
}
