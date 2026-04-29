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
    [
      'node_modules',
      '.yarn/install-state.gz',
      'dist/',
      '',
      '# raijin:begin project-specific gitignore',
      '.idea/',
      'coverage/',
      '# raijin:end project-specific gitignore',
    ].join('\n')
  )
})

test('should be idempotent for already merged gitignore content', () => {
  const templateContent = ['node_modules', '.yarn/install-state.gz', 'dist/'].join('\n')
  const mergedContent = [
    'node_modules',
    '.yarn/install-state.gz',
    'dist/',
    '',
    '# raijin:begin project-specific gitignore',
    '.idea/',
    '# raijin:end project-specific gitignore',
  ].join('\n')

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

test('should not keep removed template rules when managed block exists', () => {
  const templateContent = ['node_modules', '.yarn/install-state.gz'].join('\n')
  const existingContent = [
    'node_modules',
    '.yarn/install-state.gz',
    'dist/',
    '',
    '# raijin:begin project-specific gitignore',
    '.idea/',
    '# raijin:end project-specific gitignore',
  ].join('\n')

  const actual = mergeGitIgnoreContent({
    existingContent,
    templateContent,
  })

  assert.equal(
    actual,
    [
      'node_modules',
      '.yarn/install-state.gz',
      '',
      '# raijin:begin project-specific gitignore',
      '.idea/',
      '# raijin:end project-specific gitignore',
    ].join('\n')
  )
})

test('should normalize CRLF input before comparison', () => {
  const templateContent = ['node_modules', '.yarn/install-state.gz', 'dist/'].join('\n')
  const existingContent = ['node_modules', '.yarn/install-state.gz', 'dist/', '.idea/'].join('\r\n')

  const actual = mergeGitIgnoreContent({
    existingContent,
    templateContent,
  })

  assert.equal(
    actual,
    [
      'node_modules',
      '.yarn/install-state.gz',
      'dist/',
      '',
      '# raijin:begin project-specific gitignore',
      '.idea/',
      '# raijin:end project-specific gitignore',
    ].join('\n')
  )
})
