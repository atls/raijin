/**
 * @jest-environment node
 */

import path      from 'path'

import { watch } from '../src'

jest.setTimeout(7000)

const closeWatcher = (watcher): Promise<void> =>
  new Promise((resolve) =>
    watcher.close(() => {
      setTimeout(() => {
        resolve()
      }, 1000)
    })
  )

describe('service', () => {
  describe('watch', () => {
    it('simple', async () => {
      const watcher = await watch({ cwd: path.join(__dirname, 'fixtures/simple') })

      await closeWatcher(watcher)

      expect(true).toBe(true)
    })
  })
})
