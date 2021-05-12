/**
 * @jest-environment node
 */

import { compiler } from '../src'

describe('proto imports loader', () => {
  it('resolve paths', async () => {
    const stats = await compiler('example.ts')

    const { assets } = stats.toJson()

    expect(assets![1].name).toContain('test_service.proto')
    expect(assets![2].name).toContain('test.proto')
  })
})
