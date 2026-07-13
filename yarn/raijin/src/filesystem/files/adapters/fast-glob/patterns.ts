import type { PortablePath } from '@yarnpkg/fslib'

import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import fastGlob              from 'fast-glob'

const NEGATION = /^!+/u

const joinPattern = (base: string, pattern: string): string => {
  if (base === '.') {
    return pattern
  }

  return `${base.replace(/\/$/u, '')}/${pattern}`
}

const translatePattern = (pattern: string): Array<string> => {
  const negation = pattern.match(NEGATION)?.[0] ?? ''
  const source = pattern.slice(negation.length)

  return fastGlob.generateTasks([source]).flatMap((task) => {
    const base = task.base as PortablePath
    const providerBase = fastGlob.convertPathToPattern(npath.fromPortablePath(base))

    return task.positive.map(
      (positive) =>
        `${negation}${joinPattern(providerBase, ppath.relative(base, positive as PortablePath))}`
    )
  })
}

export const translatePatterns = (patterns: ReadonlyArray<string>): Array<string> =>
  patterns.flatMap((pattern) => translatePattern(pattern))
