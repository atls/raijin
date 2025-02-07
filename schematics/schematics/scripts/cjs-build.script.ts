/* eslint-disable no-console */

import { join }                              from 'path'
import { fileURLToPath }                     from 'url'

import { mainBuildPart }                     from './build-parts/index.js'
import { renameJsToCjsBuildPart }            from './build-parts/index.js'
import { cpJsonAndTemplatesToDistBuildPart } from './build-parts/index.js'
import { renameJsImportsBuildPart }          from './build-parts/index.js'
import { getAllFiles }                       from './getters/index.js'

const dir = fileURLToPath(new URL('.', import.meta.url))
const srcDir = join(dir, '../src/')
const outDir = join(dir, '../dist/')

const allFiles = getAllFiles(srcDir)

await mainBuildPart({ allFiles, outDir })
renameJsToCjsBuildPart({ outDir })
cpJsonAndTemplatesToDistBuildPart({ srcDir, outDir, allFiles })
renameJsImportsBuildPart({ outDir })

console.info('Schematic build successed')
