/* eslint-disable prefer-template */

import chalk                  from 'chalk'
import path                   from 'path'
import ts                     from 'typescript'
import { DiagnosticCategory } from 'typescript'
import { codeFrameColumns }   from '@babel/code-frame'

export const formatDiagnostic = (
  baseDir: string,
  diagnostic: ts.Diagnostic,
  raw: boolean = false
): string => {
  let message = ''

  const reason = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

  switch (diagnostic.category) {
    // Warning
    case DiagnosticCategory.Warning: {
      message += chalk.yellow.bold('Type warning') + ': '
      break
    }

    case DiagnosticCategory.Error: {
      message += chalk.red.bold('Type error') + ': '
      break
    }

    case DiagnosticCategory.Suggestion:
    case DiagnosticCategory.Message:
    default: {
      message += chalk.cyan.bold(diagnostic.category === 2 ? 'Suggestion' : 'Info') + ': '
      break
    }
  }
  message += reason + '\n'

  if (diagnostic.file) {
    const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
    const line = pos.line + 1
    const character = pos.character + 1

    let fileName = path.posix.normalize(
      path.relative(baseDir, diagnostic.file.fileName).replace(/\\/, '/')
    )
    if (!fileName.startsWith('.')) {
      fileName = './' + fileName
    }

    message =
      chalk.cyan(fileName) +
      ':' +
      chalk.yellow(line.toString()) +
      ':' +
      chalk.yellow(character.toString()) +
      '\n' +
      message

    message +=
      '\n' +
      codeFrameColumns(
        diagnostic.file.getFullText(diagnostic.file.getSourceFile()),
        {
          start: { line, column: character },
        },
        { forceColor: !raw }
      )
  }

  return message
}
