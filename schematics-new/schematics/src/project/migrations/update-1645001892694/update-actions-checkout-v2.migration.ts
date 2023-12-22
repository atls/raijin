import { chain }            from '@angular-devkit/schematics'

import { updateFileInTree } from '@atls/schematics-utils-new'

const updater = (file) => file.replace('actions/checkout@v1', 'actions/checkout@v2')

export default () =>
  chain([
    updateFileInTree('.github/workflows/checks.yaml', updater),
    updateFileInTree('.github/workflows/version.yaml', updater),
    updateFileInTree('.github/workflows/publish.yaml', updater),
    updateFileInTree('.github/workflows/release.yaml', updater),
    updateFileInTree('.github/workflows/preview.yaml', updater),
  ])
