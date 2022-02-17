import { chain }            from '@angular-devkit/schematics'

import { updateFileInTree } from '@atls/schematics-utils'

const removeRunFromVersionWorkflow = updateFileInTree('.github/workflows/version.yaml', (file) =>
  file.replace('run version patch', 'version patch'))

const removeRunFromPublishWorkflow = updateFileInTree('.github/workflows/publish.yaml', (file) =>
  file.replace('run npm publish', 'npm publish'))

export default () => chain([removeRunFromVersionWorkflow, removeRunFromPublishWorkflow])
