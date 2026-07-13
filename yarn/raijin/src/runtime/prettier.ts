import type { Config } from 'prettier'

import * as babel      from 'prettier/plugins/babel'
import * as estree     from 'prettier/plugins/estree'
import * as graphql    from 'prettier/plugins/graphql'
import * as markdown   from 'prettier/plugins/markdown'
import * as typescript from 'prettier/plugins/typescript'
import * as yaml       from 'prettier/plugins/yaml'

import prettierOptions from './prettier-options.js'
import plugin          from './prettier-plugin/index.js'

export const prettierconfig: Config = {
  ...prettierOptions,
  plugins: [estree, yaml, markdown, graphql, babel, typescript, plugin] as Config['plugins'],
}

export { prettierOptions }
export default prettierconfig
