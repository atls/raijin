import path      from 'path'

import { build } from '../src'

describe('service', () => {
  describe('build', () => {
    it('simple', async () => {
      const { errors, warnings } = await build({ cwd: path.join(__dirname, 'fixtures/simple') })

      expect(errors).toEqual([])
      expect(warnings).toEqual([])
    })
  })
})
