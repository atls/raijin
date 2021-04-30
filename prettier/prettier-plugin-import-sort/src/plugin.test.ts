import { format } from 'prettier'

describe('import-sort', () => {
  it('should match latest snapshot', () => {
    const source = `
import b from './b'
import a from './a'
      `

    const code = format(source, {
      parser: 'typescript',
      plugins: [require.resolve('./')],
    } as any)

    expect(code).toMatchSnapshot()
  })
})
