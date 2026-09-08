import assert              from 'node:assert/strict'
import { test }            from 'node:test'

import { Text }            from 'ink'
import { useLayoutEffect } from 'react'
import React               from 'react'
import stripAnsi           from 'strip-ansi'

import { renderStatic }    from '../index.js'

test('returns one frame and unmounts the rendered tree', () => {
  let mounted = false

  const Probe = (): React.ReactElement => {
    useLayoutEffect(() => {
      mounted = true

      return () => {
        mounted = false
      }
    }, [])

    return <Text>rendered once</Text>
  }

  assert.equal(stripAnsi(renderStatic(<Probe />)), 'rendered once')
  assert.equal(mounted, false)
})
