import { join }          from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile }      from 'node:fs/promises'
import { rmdir }         from 'node:fs/promises'

import { afterAll }      from '@jest/globals'
import { describe }      from '@jest/globals'
import { expect }        from '@jest/globals'
import { it }            from '@jest/globals'

import { Icons }         from '../src/index.js'

describe('icons', () => {
  describe('generate', () => {
    afterAll(async () => {
      rmdir(join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures/simple/src'), {
        recursive: true,
      })
    })

    it('generate', async () => {
      await new Icons(
        join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures/simple')
      ).generate()

      await expect(
        readFile(
          join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures/simple/src/alarm.icon.tsx'),
          'utf8'
        )
      ).resolves.toMatchSnapshot()
    })
  })
})
