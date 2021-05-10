import webpack                 from 'webpack'

import { createWebpackConfig } from './webpack'
import { WebpackConfigPlugin } from './webpack'

export interface WatchOptions {
  cwd: string
}

export const watch = async (
  { cwd }: WatchOptions,
  plugins: WebpackConfigPlugin[] = [],
  callback = (error?: any) => undefined
): Promise<any> => {
  const config = await createWebpackConfig(cwd, 'development', plugins)

  const compiler = webpack(config)

  return compiler.watch({}, callback)
}
