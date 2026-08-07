import type { PnpApi } from '@yarnpkg/pnp'

export interface PnpRuntimeApi extends PnpApi {
  setup: () => void
}
