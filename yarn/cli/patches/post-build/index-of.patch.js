import { fileURLToPath } from 'url'
import { dirname }       from 'path'
import { join }          from 'path'
import { readFileSync }  from 'fs'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BUNDLE_PATH = join(__dirname, '../../bundles/yarn.js')

const bundleContent = readFileSync(BUNDLE_PATH).toString('utf-8')

const patchContent = (content) =>
  content.replaceAll(
    'dynamicModule.children.indexOf(freshCacheEntry)',
    'dynamicModule.children?dynamicModule.children.indexOf(freshCacheEntry):-1',
  )

writeFileSync(BUNDLE_PATH, patchContent(bundleContent))
