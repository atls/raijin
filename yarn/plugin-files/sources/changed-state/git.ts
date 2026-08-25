import type { ProcessExecutionResult }   from '@atls/raijin/commands'
import type { ProjectProcessInvocation } from '@atls/raijin/commands'

import type { ChangedProjectFile }        from './interfaces/result.js'
import type { ChangedFileStatus }         from './interfaces/result.js'
import type { GitChangedFilesResult }     from './interfaces/result.js'
import type { GitChangedStateSource }     from './interfaces/source.js'

import { GitOutputException }             from './exceptions/git-output.js'
import { GitProcessException }            from './exceptions/git-process.js'
import { normalizeProjectPath }           from './path.js'

const GIT_STATUS: Readonly<Partial<Record<string, ChangedFileStatus>>> = {
  A: 'added',
  C: 'copied',
  D: 'deleted',
  M: 'modified',
  R: 'renamed',
  T: 'type-changed',
  U: 'unmerged',
}

const readStatus = (token: string): ChangedFileStatus => {
  const status = GIT_STATUS[token.charAt(0)]

  if (!status) {
    throw new GitOutputException(`Unsupported Git file status "${token}"`, token)
  }

  return status
}

export const parseGitChangedFiles = (output: string): ReadonlyArray<ChangedProjectFile> => {
  const fields = output.split('\0')

  if (fields.at(-1) === '') {
    fields.pop()
  }

  const files: Array<ChangedProjectFile> = []

  for (let index = 0; index < fields.length; ) {
    const token = fields[index]

    index += 1

    if (!token) {
      throw new GitOutputException('Git returned an incomplete file status', output)
    }

    const status = readStatus(token)

    if (status === 'copied' || status === 'renamed') {
      const previousPath = fields[index]
      const path = fields[index + 1]

      index += 2

      if (!previousPath || !path) {
        throw new GitOutputException(`Git returned an incomplete ${status} status`, output)
      }

      files.push({
        path: normalizeProjectPath(path),
        previousPath: normalizeProjectPath(previousPath),
        status,
      })
    } else {
      const path = fields[index]

      index += 1

      if (!path) {
        throw new GitOutputException('Git returned an incomplete file status', output)
      }

      files.push({ path: normalizeProjectPath(path), status })
    }
  }

  return files
}

const executeGit = async (
  processInvocation: ProjectProcessInvocation,
  args: ReadonlyArray<string>
): Promise<ProcessExecutionResult> =>
  processInvocation.project.execute('git', [...args], {
    output: { mode: 'capture' },
  })

const isSuccessful = (
  result: ProcessExecutionResult
): result is Extract<ProcessExecutionResult, { readonly reason: 'completed' }> =>
  result.reason === 'completed' && result.exitCode === 0

const isShallowRepository = async (
  processInvocation: ProjectProcessInvocation,
  source: GitChangedStateSource
): Promise<boolean> => {
  const result = await executeGit(processInvocation, ['rev-parse', '--is-shallow-repository'])

  if (!isSuccessful(result)) {
    throw new GitProcessException('inspect-history', source, result)
  }

  return result.stdout.trim() === 'true'
}

const isComparableGitRange = async (
  processInvocation: ProjectProcessInvocation,
  source: Extract<GitChangedStateSource, { readonly kind: 'git-range' }>
): Promise<boolean> => {
  const results = await Promise.all(
    [source.base, source.head].map(async (object) =>
      executeGit(processInvocation, [
        'rev-parse',
        '--verify',
        '--quiet',
        '--end-of-options',
        `${object}^{commit}`,
      ]))
  )
  const completedResults: Array<
    Extract<ProcessExecutionResult, { readonly reason: 'completed' }>
  > = []

  for (const result of results) {
    if (result.reason !== 'completed') {
      throw new GitProcessException('validate-comparison', source, result)
    }

    completedResults.push(result)
  }

  const invalidResult = completedResults.find((result) => result.exitCode !== 0)

  if (invalidResult) {
    if (await isShallowRepository(processInvocation, source)) {
      throw new GitProcessException('resolve-shallow-history', source, invalidResult)
    }

    return false
  }

  return true
}

const runGitDiff = async (
  processInvocation: ProjectProcessInvocation,
  range: string,
  source: GitChangedStateSource
): Promise<ReadonlyArray<ChangedProjectFile>> => {
  const result = await executeGit(processInvocation, [
    'diff',
    '--name-status',
    '-z',
    '--find-renames',
    '--end-of-options',
    range,
    '--',
  ])

  if (result.reason !== 'completed') {
    throw new GitProcessException('resolve-diff', source, result)
  }

  if (result.exitCode !== 0) {
    if (source.kind !== 'working-tree' && (await isShallowRepository(processInvocation, source))) {
      throw new GitProcessException('resolve-shallow-history', source, result)
    }

    throw new GitProcessException('resolve-diff', source, result)
  }

  return parseGitChangedFiles(result.stdout)
}

const readUntrackedFiles = async (
  processInvocation: ProjectProcessInvocation,
  source: Extract<GitChangedStateSource, { readonly kind: 'working-tree' }>
): Promise<ReadonlyArray<ChangedProjectFile>> => {
  const result = await executeGit(processInvocation, [
    'ls-files',
    '-z',
    '--others',
    '--exclude-standard',
  ])

  if (!isSuccessful(result)) {
    throw new GitProcessException('resolve-untracked-files', source, result)
  }

  return result.stdout
    .split('\0')
    .filter(Boolean)
    .map((path) => ({ path: normalizeProjectPath(path), status: 'added' as const }))
}

export const resolveGitChangedFiles = async (
  processInvocation: ProjectProcessInvocation,
  source: GitChangedStateSource
): Promise<GitChangedFilesResult> => {
  if (source.kind === 'working-tree') {
    const tracked = await runGitDiff(processInvocation, 'HEAD', source)
    const untracked = await readUntrackedFiles(processInvocation, source)
    const files = new Map(tracked.map((file) => [file.path, file]))

    untracked.forEach((file) => files.set(file.path, file))

    return { kind: 'completed', files: [...files.values()] }
  }

  if (source.kind === 'git-range' && !await isComparableGitRange(processInvocation, source)) {
    return { kind: 'error', reason: 'invalid-comparison', source: 'git-range' }
  }

  const separator = source.kind === 'git-range' ? '...' : '..'

  return {
    kind: 'completed',
    files: await runGitDiff(
      processInvocation,
      `${source.base}${separator}${source.head}`,
      source
    ),
  }
}
