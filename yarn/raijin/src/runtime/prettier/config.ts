import type { Config }              from 'prettier'

import type { CreatePluginOptions } from './plugin/create.interfaces.js'

import * as babel                   from 'prettier/plugins/babel'
import * as estree                  from 'prettier/plugins/estree'
import * as graphql                 from 'prettier/plugins/graphql'
import * as markdown                from 'prettier/plugins/markdown'
import * as typescript              from 'prettier/plugins/typescript'
import * as yaml                    from 'prettier/plugins/yaml'

import { createPlugin }             from './plugin/create.js'

const options: Config = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  jsxSingleQuote: true,
  printWidth: 100,
  trailingComma: 'es5',
}

export const createPrettierConfig = async (
  pluginOptions: CreatePluginOptions = {}
): Promise<Config> => ({
  ...options,
  plugins: [
    estree,
    yaml,
    markdown,
    graphql,
    babel,
    typescript,
    await createPlugin(pluginOptions),
  ] as Config['plugins'],
})
