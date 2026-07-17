import type { SchematicContext } from '@angular-devkit/schematics'

import assert                    from 'node:assert/strict'
import { mkdir }                 from 'node:fs/promises'
import { mkdtemp }               from 'node:fs/promises'
import { rm }                    from 'node:fs/promises'
import { writeFile }             from 'node:fs/promises'
import { tmpdir }                from 'node:os'
import { join }                  from 'node:path'
import { test }                  from 'node:test'

import { callSource }            from '@angular-devkit/schematics'
import { lastValueFrom }         from 'rxjs'

import { templateSource }        from '../template-source.js'

const createSchematicContext = (schematicPath: string): SchematicContext =>
  ({
    schematic: {
      description: {
        path: schematicPath,
      },
    },
  }) as unknown as SchematicContext

test('should create source tree from template path relative to schematic path', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'schematic-template-source-'))
  const templateDir = join(tmpDir, 'templates/common')

  try {
    await mkdir(templateDir, { recursive: true })
    await writeFile(join(templateDir, '__dot__prettierrc.mjs'), 'export default {}\n')

    const tree = await lastValueFrom(
      callSource(
        templateSource('../templates/common'),
        createSchematicContext(join(tmpDir, 'project'))
      )
    )

    assert.equal(tree.readText('/__dot__prettierrc.mjs'), 'export default {}\n')
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
