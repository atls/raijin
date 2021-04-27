import { Linter as EslintLinter } from 'eslint'
import { codeFrameColumns }       from '@babel/code-frame'
import { readFileSync }           from 'fs'

import { AnnotationLevel }        from './checks.interfaces'
import { Annotation }             from './checks.interfaces'

const getAnnotationLevel = (severity: EslintLinter.Severity): AnnotationLevel => {
  if (severity === 1) {
    return AnnotationLevel.Warning
  }

  return AnnotationLevel.Failure
}

export const eslintResultsFormat = (
  results: EslintLinter.LintMessage[],
  cwd?: string
): Annotation[] => {
  const annotations: Annotation[] = results
    .filter((result) => result.messages?.length > 0)
    .map(({ filePath, messages = [] }) =>
      messages.map((message) => {
        const line = (message.line || 0) + 1

        return {
          path: cwd ? filePath.substring(cwd.length + 1) : filePath,
          start_line: line,
          end_line: line,
          annotation_level: getAnnotationLevel(message.severity),
          raw_details: codeFrameColumns(
            readFileSync(filePath).toString(),
            {
              start: { line: message.line || 0, column: message.column || 0 },
            },
            { highlightCode: false }
          ),
          title: `(${message.ruleId}): ${message.message}`,
          message: message.message,
        }
      })
    )
    .flat()

  return annotations
}
