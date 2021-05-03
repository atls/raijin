import { lint } from './commitlint'

describe('code-commitlint', () => {
  it(`lint`, async () => {
    const { valid } = await lint('feat(common): init')

    expect(valid).toBe(true)
  })
})
