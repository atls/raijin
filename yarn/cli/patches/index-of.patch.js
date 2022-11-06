const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

const BUNDLE_PATH = join(__dirname, '../bundles/yarn.js')

const bundleContent = readFileSync(BUNDLE_PATH).toString('utf-8')

const patchContent = (content) => content.replaceAll('dynamicModule.children.indexOf(freshCacheEntry)', 'dynamicModule.children?dynamicModule.children.indexOf(freshCacheEntry):-1')

writeFileSync(BUNDLE_PATH, patchContent(bundleContent))
