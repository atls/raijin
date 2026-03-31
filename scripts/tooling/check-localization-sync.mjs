import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const readText = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const normalizeValues = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b))

const extractSyncMarkers = (content) =>
  [...content.matchAll(/<!--\s*sync:([a-z0-9._-]+)\s*-->/gi)].map((match) => match[1])

// Level-3 headings are used as stable identifiers for command/package cards.
const extractLevel3Headings = (content) =>
  content
    .split('\n')
    .filter((line) => line.startsWith('### '))
    .map((line) => line.replace(/^###\s+/, '').trim())

const compareSets = (label, left, right) => {
  const onlyLeft = left.filter((item) => !right.includes(item))
  const onlyRight = right.filter((item) => !left.includes(item))

  if (onlyLeft.length === 0 && onlyRight.length === 0) {
    return []
  }

  const errors = []

  if (onlyLeft.length > 0) {
    errors.push(`${label}: missing in RU -> ${onlyLeft.join(', ')}`)
  }

  if (onlyRight.length > 0) {
    errors.push(`${label}: missing in EN -> ${onlyRight.join(', ')}`)
  }

  return errors
}

const quickstartEn = readText('docs/tooling/quickstart.md')
const quickstartRu = readText('docs/tooling/quickstart.ru.md')
const commandsEn = readText('docs/tooling/commands.md')
const commandsRu = readText('docs/tooling/commands.ru.md')
const packagesEn = readText('docs/tooling/packages.md')
const packagesRu = readText('docs/tooling/packages.ru.md')

const quickstartMarkersEn = normalizeValues(extractSyncMarkers(quickstartEn))
const quickstartMarkersRu = normalizeValues(extractSyncMarkers(quickstartRu))
const commandHeadingsEn = normalizeValues(extractLevel3Headings(commandsEn))
const commandHeadingsRu = normalizeValues(extractLevel3Headings(commandsRu))
const packageHeadingsEn = normalizeValues(extractLevel3Headings(packagesEn))
const packageHeadingsRu = normalizeValues(extractLevel3Headings(packagesRu))

const errors = [
  ...compareSets('quickstart sync markers', quickstartMarkersEn, quickstartMarkersRu),
  ...compareSets('command headings', commandHeadingsEn, commandHeadingsRu),
  ...compareSets('package headings', packageHeadingsEn, packageHeadingsRu),
]

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error) // eslint-disable-line no-console
  }

  process.exit(1)
}

console.log('Localization sync check passed') // eslint-disable-line no-console
