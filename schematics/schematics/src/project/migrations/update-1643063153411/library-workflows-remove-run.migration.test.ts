import { join }                from 'node:path'
import { fileURLToPath }       from 'node:url'

import { Tree }                from '@angular-devkit/schematics'
import { SchematicTestRunner } from '@angular-devkit/schematics/testing'
import { UnitTestTree }        from '@angular-devkit/schematics/testing'
import { describe }            from '@jest/globals'
import { expect }              from '@jest/globals'
import { it }                  from '@jest/globals'
import { beforeEach }          from '@jest/globals'

const workflow = `
jobs:
  run:
    steps:
      - name: Version
        run: yarn workspaces changed foreach --no-private --verbose run version patch --deferred
    
      - name: Npm Publish
        run: |
          yarn version apply --all
          yarn workspaces changed foreach --verbose --topological --no-private run npm publish --access public
`

describe('schematics', () => {
  describe('migrations', () => {
    let tree: Tree
    let schematicRunner: SchematicTestRunner

    beforeEach(() => {
      tree = new UnitTestTree(Tree.empty())

      tree.create('.github/workflows/version.yaml', workflow)
      tree.create('.github/workflows/publish.yaml', workflow)

      schematicRunner = new SchematicTestRunner(
        '@atls/schematics',
        join(fileURLToPath(new URL('.', import.meta.url)), '../../migrations.json')
      )
    })

    it('should remove run from version workflow', async () => {
      const result = await schematicRunner
        .runSchematicAsync('library-workflows-remove-run', {}, tree)
        .toPromise()

      expect(result.read('.github/workflows/version.yaml')!.toString()).toContain(
        'yarn workspaces changed foreach --no-private --verbose version patch --deferred'
      )
    })

    it('should remove run from publish workflow', async () => {
      const result = await schematicRunner
        .runSchematicAsync('library-workflows-remove-run', {}, tree)
        .toPromise()

      expect(result.read('.github/workflows/publish.yaml')!.toString()).toContain(
        'yarn workspaces changed foreach --verbose --topological --no-private npm publish --access public'
      )
    })
  })
})
