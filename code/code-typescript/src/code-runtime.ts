import type { createRequire as createRequireFn } from 'node:module'

import { createRequire }                         from 'node:module'

const CODE_RUNTIME_PACKAGE_MANIFEST = '@atls/code-runtime/package.json'
const RAIJIN_PACKAGE_MANIFEST = '@atls/raijin/package.json'

export const createCodeRuntimeRequire = (): ReturnType<typeof createRequireFn> => {
  const runtimeRequire = createRequire(import.meta.url)

  try {
    return createRequire(runtimeRequire.resolve(CODE_RUNTIME_PACKAGE_MANIFEST))
  } catch {
    const raijinPackagePath = runtimeRequire.resolve(RAIJIN_PACKAGE_MANIFEST)
    const raijinRequire = createRequire(raijinPackagePath)

    return createRequire(raijinRequire.resolve(CODE_RUNTIME_PACKAGE_MANIFEST))
  }
}
