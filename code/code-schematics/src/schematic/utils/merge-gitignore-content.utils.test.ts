import assert                    from 'node:assert/strict'
import { test }                  from 'node:test'

import { mergeGitIgnoreContent } from './merge-gitignore-content.utils.js'

test('should preserve project-specific entries while keeping template section deterministic', () => {
  const templateContent = ['node_modules', '.yarn/install-state.gz', 'dist/'].join('\n')
  const existingContent = ['node_modules', '.idea/', '.yarn/install-state.gz', 'coverage/'].join(
    '\n'
  )

  const actual = mergeGitIgnoreContent({
    existingContent,
    templateContent,
  })

  assert.equal(
    actual,
    ['node_modules', '.yarn/install-state.gz', 'dist/', '', '.idea/', 'coverage/'].join('\n')
  )
})

test('should be idempotent for already merged gitignore content', () => {
  const templateContent = ['node_modules', '.yarn/install-state.gz', 'dist/'].join('\n')
  const mergedContent = ['node_modules', '.yarn/install-state.gz', 'dist/', '', '.idea/'].join('\n')

  const actual = mergeGitIgnoreContent({
    existingContent: mergedContent,
    templateContent,
  })

  assert.equal(actual, mergedContent)
})

test('should not duplicate template entries from project content', () => {
  const templateContent = ['node_modules', '.yarn/install-state.gz', 'dist/'].join('\n')
  const existingContent = ['node_modules', '.yarn/install-state.gz', 'dist/'].join('\n')

  const actual = mergeGitIgnoreContent({
    existingContent,
    templateContent,
  })

  assert.equal(actual, templateContent)
})
