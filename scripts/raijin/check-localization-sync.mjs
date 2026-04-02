import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const readText = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const normalizeValues = (values) => [...new Set(values)].sort((left, right) => left.localeCompare(right))

const extractSyncMarkers = (content) =>
  [...content.matchAll(/<!--\s*sync:([a-z0-9._:-]+)\s*-->/gi)].map((match) => match[1])

const extractScopedMarkers = (content, scope) =>
  [...content.matchAll(new RegExp(`<!--\\s*sync:${scope}:([a-z0-9._-]+)\\s*-->`, 'gi'))].map(
    (match) => match[1]
  )

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

const routerEn = readText('docs/raijin/README.md')
const routerRu = readText('docs/raijin/README.ru.md')
const quickstartEn = readText('docs/raijin/quickstart.md')
const quickstartRu = readText('docs/raijin/quickstart.ru.md')
const commandsEn = readText('docs/raijin/commands.md')
const commandsRu = readText('docs/raijin/commands.ru.md')
const packagesEn = readText('docs/raijin/packages.md')
const packagesRu = readText('docs/raijin/packages.ru.md')

const routerMarkersEn = normalizeValues(extractSyncMarkers(routerEn))
const routerMarkersRu = normalizeValues(extractSyncMarkers(routerRu))
const quickstartMarkersEn = normalizeValues(extractSyncMarkers(quickstartEn))
const quickstartMarkersRu = normalizeValues(extractSyncMarkers(quickstartRu))
const commandMarkersEn = normalizeValues(extractScopedMarkers(commandsEn, 'command-card'))
const commandMarkersRu = normalizeValues(extractScopedMarkers(commandsRu, 'command-card'))
const packageMarkersEn = normalizeValues(extractScopedMarkers(packagesEn, 'package-card'))
const packageMarkersRu = normalizeValues(extractScopedMarkers(packagesRu, 'package-card'))

const errors = [
  ...compareSets('router sync markers', routerMarkersEn, routerMarkersRu),
  ...compareSets('quickstart sync markers', quickstartMarkersEn, quickstartMarkersRu),
  ...compareSets('command cards', commandMarkersEn, commandMarkersRu),
  ...compareSets('package cards', packageMarkersEn, packageMarkersRu),
]

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error)
  }

  process.exit(1)
}

console.log('Localization sync check passed')
