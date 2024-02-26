import path        from 'path'

import { Service } from '../src/index.js'

describe('service', () => {
  describe('build', () => {
    it('simple', async () => {
      const { errors, warnings } = await new Service(
        path.join(__dirname, 'fixtures/simple')
      ).build()

      expect(errors).toEqual([])
      expect(warnings).toEqual([])
    })
  })
})
