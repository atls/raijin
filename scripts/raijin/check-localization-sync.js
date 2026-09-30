import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

/** @param {string} relativePath */
const readText = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

/** @param {Array<string>} values */
const normalizeValues = (values) =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right))

/** @param {string} content */
const extractSyncMarkers = (content) =>
  [...content.matchAll(/<!--\s*sync:([a-z0-9._:-]+)\s*-->/gi)].map((match) => match[1])

/**
 * @param {string} label
 * @param {Array<string>} left
 * @param {Array<string>} right
 */
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

const rootEn = readText('README_EN.md')
const rootRu = readText('README.md')
const docsRouterEn = readText('docs/README.md')
const docsRouterRu = readText('docs/README.ru.md')
const routerEn = readText('docs/raijin/README.md')
const routerRu = readText('docs/raijin/README.ru.md')
const quickstartEn = readText('docs/raijin/quickstart.md')
const quickstartRu = readText('docs/raijin/quickstart.ru.md')

const rootMarkersEn = normalizeValues(extractSyncMarkers(rootEn))
const rootMarkersRu = normalizeValues(extractSyncMarkers(rootRu))
const docsRouterMarkersEn = normalizeValues(extractSyncMarkers(docsRouterEn))
const docsRouterMarkersRu = normalizeValues(extractSyncMarkers(docsRouterRu))
const routerMarkersEn = normalizeValues(extractSyncMarkers(routerEn))
const routerMarkersRu = normalizeValues(extractSyncMarkers(routerRu))
const quickstartMarkersEn = normalizeValues(extractSyncMarkers(quickstartEn))
const quickstartMarkersRu = normalizeValues(extractSyncMarkers(quickstartRu))

const errors = [
  ...compareSets('root readme sync markers', rootMarkersEn, rootMarkersRu),
  ...compareSets('docs router sync markers', docsRouterMarkersEn, docsRouterMarkersRu),
  ...compareSets('router sync markers', routerMarkersEn, routerMarkersRu),
  ...compareSets('quickstart sync markers', quickstartMarkersEn, quickstartMarkersRu),
]

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error)
  }

  process.exit(1)
}

console.log('Localization sync check passed')
