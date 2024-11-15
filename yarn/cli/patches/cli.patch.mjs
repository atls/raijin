import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const replacements = [
  {
    from: 'dynamicModule.children.indexOf(freshCacheEntry)',
    to: 'dynamicModule.children?dynamicModule.children.indexOf(freshCacheEntry):-1',
  },
  {
    from: ',_a=_typeModule(_typeModule),',
    to: ';var _a=_typeModule(_typeModule);',
  },
  {
    from: ',q=Y1t.simplifyRanges(w),',
    to: ';let q; try{q=Y1t.simplifyRanges(w)}catch{};let ',
  },
  /* Development builds with source maps */
  {
    from: '_a = _typeModule(_typeModule),',
    to: 'var _a = _typeModule(_typeModule);',
  },
  {
    from: '}.cjs`),',
    to: '}.mjs`),',
  },
]

const bundle = join(fileURLToPath(new URL('.', import.meta.url)), '../bundles/yarn.mjs')
const content = await readFile(bundle, 'utf-8')

const patched = replacements.reduce(
  (result, replacement) => result.replace(replacement.from, replacement.to),
  content
)

await writeFile(bundle, patched)
