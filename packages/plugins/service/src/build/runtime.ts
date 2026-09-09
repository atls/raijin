import type { nodeLoaderPath as NodeLoaderPath }     from '@atls/raijin/webpack'
import type { protoLoaderPath as ProtoLoaderPath }   from '@atls/raijin/webpack'
import type { tsLoaderPath as TypeScriptLoaderPath } from '@atls/raijin/webpack'
import type { webpack as Webpack }                   from '@atls/raijin/webpack'

import { resolveRaijinRuntimeUrl }                   from '@atls/raijin/runtime-resolver'

const WEBPACK_RUNTIME_SPECIFIER = '@atls/raijin/webpack'

export interface WebpackRuntime {
  nodeLoaderPath: typeof NodeLoaderPath
  protoLoaderPath: typeof ProtoLoaderPath
  tsLoaderPath: typeof TypeScriptLoaderPath
  webpack: typeof Webpack
}

export const loadWebpackRuntime = async (cwd: string): Promise<WebpackRuntime> =>
  (await import(resolveRaijinRuntimeUrl(cwd, WEBPACK_RUNTIME_SPECIFIER))) as WebpackRuntime
