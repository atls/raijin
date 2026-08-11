import type { GeneratedIconFormatter } from './format.interfaces.js'
import type { GeneratedIconLinter }    from './lint.interfaces.js'
import type { IconOutputReplacer }     from './output.interfaces.js'
import type { IconSourceReader }       from './source.interfaces.js'
import type { IconTransformer }        from './transform.interfaces.js'

export interface GenerateIconsDependencies {
  formatter: GeneratedIconFormatter
  linter: GeneratedIconLinter
  output: IconOutputReplacer
  sources: IconSourceReader
  transformer: IconTransformer
}
