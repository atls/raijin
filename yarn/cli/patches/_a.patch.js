const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

const BUNDLE_PATH = join(__dirname, '../bundles/yarn.js')

const bundleContent = readFileSync(BUNDLE_PATH).toString('utf-8')

const patchContent = (content) =>
  content.replaceAll(
    'var HEAP,buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64',
    'var HEAP,buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64,_a'
  )

writeFileSync(BUNDLE_PATH, patchContent(bundleContent))
