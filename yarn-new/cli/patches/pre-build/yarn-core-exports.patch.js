const { readdirSync } = require('fs')
const { join } = require('path')
const assert = require('assert')
const fse = require('fs-extra')

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

fse.copySync(YARN_CORE_PATCH_PATH, YARN_CORE_UNPLUGGED_PATH, { overwrite: true })
