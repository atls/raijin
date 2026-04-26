import type { Config } from 'prettier'

import * as babel      from 'prettier/plugins/babel'
import * as estree     from 'prettier/plugins/estree'
import * as graphql    from 'prettier/plugins/graphql'
import * as markdown   from 'prettier/plugins/markdown'
import * as typescript from 'prettier/plugins/typescript'
import * as yaml       from 'prettier/plugins/yaml'

import plugin          from '@atls/prettier-plugin'

const config: Config = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  jsxSingleQuote: true,
  printWidth: 100,
  trailingComma: 'es5',
  plugins: [estree, yaml, markdown, graphql, babel, typescript, plugin] as Config['plugins'],
}

export default config
