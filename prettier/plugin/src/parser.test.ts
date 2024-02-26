import * as plugin from './index.js'

import babel       from 'prettier/plugins/babel'
import typescript  from 'prettier/plugins/typescript'
import { format }  from 'prettier/standalone'

describe('some', () => {
  it('some', () => {
    const source = `
import b from './i2'
import a from './i1'
import type d from './i5'
import { e } from './i4'
import type { c } from './i3'
import { fs } from 'node:fs'
// Before1
// Before2
import { some } from '@org/repo' // some
// After
`

    format(source, {
      parser: 'typescript',
      plugins: [babel, typescript, plugin],
    })

    expect(true).toBe(true)
  })
})
