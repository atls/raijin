/* eslint-disable n/no-sync */

import type { ProjectManifest } from './interfaces/manifest.js'

import { readFileSync }         from 'node:fs'
import { join }                 from 'node:path'
import { relative }             from 'node:path'

import ignorer                  from 'ignore'

export const discoveryIgnorePatterns = ['**/node_modules/**', '**/dist/**', '**/.yarn/**']

export const createFileFilter = (cwd: string): ((file: string) => boolean) => {
  const content = readFileSync(join(cwd, 'package.json'), 'utf8')
  const { testIgnorePatterns = [] } = JSON.parse(content) as ProjectManifest
  const ignore = ignorer.default().add(testIgnorePatterns)

  return (file) => ignore.filter([relative(cwd, file)]).length !== 0
}
