import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync }  from 'fs'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BUNDLE_PATH = join(__dirname, '../../bundles/yarn.js')

const bundleContent = readFileSync(BUNDLE_PATH).toString('utf-8')

const patchContent = (content) =>
  content.replaceAll(
    'var HEAP,buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64',
    'var HEAP,buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64,_a',
  )

writeFileSync(BUNDLE_PATH, patchContent(bundleContent))
