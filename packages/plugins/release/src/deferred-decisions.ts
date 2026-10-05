import type { PortablePath } from '@yarnpkg/fslib'

import { structUtils }       from '@yarnpkg/core'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'
import { parseSyml }         from '@yarnpkg/parsers'
import { versionUtils }      from '@yarnpkg/plugin-version'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const getExplicitVersionDecisions = async (folder: PortablePath): Promise<Set<string>> => {
  const decisions = new Set<string>()

  if (!(await xfs.existsPromise(folder))) {
    return decisions
  }

  const entries = (await xfs.readdirPromise(folder))
    .filter((entry) => entry.endsWith('.yml'))
    .sort()

  const files = await Promise.all(
    entries.map(async (entry) => {
      const data: unknown = parseSyml(await xfs.readFilePromise(ppath.join(folder, entry), 'utf8'))

      return { entry, data }
    })
  )

  for (const { entry, data } of files) {
    if (!isRecord(data)) {
      throw new Error(`Invalid Yarn version file: ${entry}`)
    }

    if (data.releases !== undefined && !isRecord(data.releases)) {
      throw new Error(`Invalid Yarn release decisions: ${entry}`)
    }

    if (
      data.declined !== undefined &&
      (!Array.isArray(data.declined) || !data.declined.every((value) => typeof value === 'string'))
    ) {
      throw new Error(`Invalid Yarn declined decisions: ${entry}`)
    }

    for (const [ident, decision] of Object.entries(data.releases ?? {})) {
      structUtils.parseIdent(ident)
      versionUtils.validateReleaseDecision(decision)
      decisions.add(ident)
    }

    for (const ident of data.declined ?? []) {
      structUtils.parseIdent(ident)
      decisions.add(ident)
    }
  }

  return decisions
}
