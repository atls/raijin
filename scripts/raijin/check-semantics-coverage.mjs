import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'))

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0

const validateSemanticsShape = (entry, label) => {
  const errors = []

  if (!Array.isArray(entry.groupTags) || entry.groupTags.length === 0) {
    errors.push(`${label}: groupTags must be a non-empty array`)
  }

  if (!nonEmpty(entry?.purpose?.en) || !nonEmpty(entry?.purpose?.ru)) {
    errors.push(`${label}: purpose.en and purpose.ru are required`)
  }

  if (!nonEmpty(entry?.whenToUse?.en) || !nonEmpty(entry?.whenToUse?.ru)) {
    errors.push(`${label}: whenToUse.en and whenToUse.ru are required`)
  }

  if (!nonEmpty(entry?.example?.en) || !nonEmpty(entry?.example?.ru)) {
    errors.push(`${label}: example.en and example.ru are required`)
  }

  return errors
}

const index = readJson('docs/raijin/index.v1.json')
const semantics = readJson('docs/raijin/semantics.v1.json')
const errors = []

const commandSemanticsById = new Map((semantics.commands || []).map((entry) => [entry.id, entry]))
const workspaceSemanticsById = new Map(
  (semantics.workspaces || []).map((entry) => [entry.id, entry])
)

for (const command of index.commands.filter((entry) => entry.status === 'active')) {
  const semanticsEntry = commandSemanticsById.get(command.command)

  if (!semanticsEntry) {
    errors.push(`missing semantics for active command "${command.command}"`)
    continue
  }

  errors.push(...validateSemanticsShape(semanticsEntry, `command "${command.command}"`))
}

for (const workspace of index.workspaces) {
  const semanticsEntry = workspaceSemanticsById.get(workspace.name)

  if (!semanticsEntry) {
    errors.push(`missing semantics for workspace "${workspace.name}"`)
    continue
  }

  errors.push(...validateSemanticsShape(semanticsEntry, `workspace "${workspace.name}"`))
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error)
  }

  process.exit(1)
}

console.log(
  `Semantics coverage check passed (${index.commands.filter((entry) => entry.status === 'active').length} active commands, ${index.workspaces.length} workspaces)`
)
