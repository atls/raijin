import { readdirSync }   from 'fs'
import { dirname }       from 'path'
import { join }          from 'path'
import assert            from 'assert'
import { fileURLToPath } from 'url'
import { copyFileSync }  from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PATCHES_PATH = join(__dirname, '../../../../.patches')
const UNPLUGGED_PATH = join(__dirname, '../../../../.yarn/unplugged')

const findUnpluggedPackage = (dir, name) => {
  const pkgs = readdirSync(dir)
  const yarnCore = pkgs.find((pkg) => pkg.search(name) !== -1)

  assert.ok(yarnCore, `Could not find @yarnpkg/core in ${dir}`)

  return join(dir, yarnCore)
}

const YARN_CORE_UNPLUGGED_PATH = findUnpluggedPackage(UNPLUGGED_PATH, '@yarnpkg-core')
const YARN_CORE_PATCH_PATH = findUnpluggedPackage(PATCHES_PATH, '@yarnpkg-core')

copyFileSync(YARN_CORE_PATCH_PATH, YARN_CORE_UNPLUGGED_PATH)
