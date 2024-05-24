import { join }          from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe }      from '@jest/globals'
import { expect }        from '@jest/globals'
import { it }            from '@jest/globals'

import { Service }       from '../src/index.js'

describe('service', () => {
  describe('build', () => {
    it('simple', async () => {
      const logRecords = await new Service(
        join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures/simple')
      ).build()

      expect(logRecords).toEqual([])
    })
  })
})
