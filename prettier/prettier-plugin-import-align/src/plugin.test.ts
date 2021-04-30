import { format } from 'prettier'

describe('import-align', () => {
  it('should match latest snapshot', () => {
    const source = `
import long from './long'
import a from './a'
      `

    const code = format(source, {
      parser: 'typescript',
      plugins: [require.resolve('../')],
    } as any)

    expect(code).toMatchSnapshot()
  })
})
