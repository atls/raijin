// Copy from @yarnpkg/plugin-exec
// https://github.com/yarnpkg/berry/blob/63a77b5/packages/plugin-exec/sources/execUtils.ts

import { Locator }      from '@yarnpkg/core'
import { PortablePath } from '@yarnpkg/fslib'
import { structUtils }  from '@yarnpkg/core'
import { npath }        from '@yarnpkg/fslib'

export function parseSpec(
  spec: string
): { parentLocator: Locator | null; path: PortablePath } | undefined {
  const { params, selector } = structUtils.parseRange(spec)

  const path = npath.toPortablePath(selector)

  const parentLocator =
    params && typeof params.locator === 'string' ? structUtils.parseLocator(params.locator) : null

  return { parentLocator, path }
}
