import type { Package }              from '@yarnpkg/core'

import assert                        from 'node:assert/strict'
import test                          from 'node:test'

import { Manifest }                  from '@yarnpkg/core'
import { structUtils }               from '@yarnpkg/core'

import { findStoredPackageByIdent }  from './manifest.js'
import { getRaijinTypeScriptRange }  from './manifest.js'
import { normalizeTypeScriptRange }  from './manifest.js'
import { shouldSyncTypeScriptRange } from './manifest.js'
import { syncTypeScriptManifest }    from './manifest.js'

const createPackage = (ident: string, dependencies: Record<string, string> = {}): Package => {
  const locator = structUtils.makeLocator(structUtils.parseIdent(ident), 'npm:0.0.0')

  return {
    ...locator,
    version: '0.0.0',
    languageName: 'node',
    linkType: 'HARD',
    dependencies: new Map(
      Object.entries(dependencies).map(([name, range]) => {
        const dependencyIdent = structUtils.parseIdent(name)

        return [dependencyIdent.identHash, structUtils.makeDescriptor(dependencyIdent, range)]
      })
    ),
    peerDependencies: new Map(),
    dependenciesMeta: new Map(),
    peerDependenciesMeta: new Map(),
    bin: new Map(),
  } as Package
}

test('should find stored package by ident', () => {
  const raijinPackage = createPackage('@atls/raijin')

  assert.equal(
    findStoredPackageByIdent(
      [createPackage('@atls/code-lint'), raijinPackage],
      structUtils.parseIdent('@atls/raijin')
    ),
    raijinPackage
  )
})

test('should read TypeScript range from installed Raijin package graph', () => {
  const project = {
    storedPackages: new Map([
      ['raijin', createPackage('@atls/raijin', { typescript: '5.5.4' })],
      ['code-lint', createPackage('@atls/code-lint')],
    ]),
  }

  assert.equal(getRaijinTypeScriptRange(project as never), '5.5.4')
})

test('should normalize Yarn package protocols', () => {
  assert.equal(normalizeTypeScriptRange('npm:5.9.3'), '5.9.3')
  assert.equal(
    normalizeTypeScriptRange('patch:typescript@npm%3A5.9.3#optional!builtin<compat/typescript>'),
    '5.9.3'
  )
  assert.equal(normalizeTypeScriptRange('5.9.3'), '5.9.3')
  assert.equal(normalizeTypeScriptRange(undefined), undefined)
})

test('should not invent TypeScript range when Raijin is absent', () => {
  const project = {
    storedPackages: new Map([['code-lint', createPackage('@atls/code-lint')]]),
  }

  assert.equal(getRaijinTypeScriptRange(project as never), undefined)
})

test('should update only mismatched TypeScript ranges', () => {
  const manifest = Manifest.fromText(JSON.stringify({ devDependencies: { typescript: '^5' } }))

  assert.equal(shouldSyncTypeScriptRange('^5', '5.9.3'), true)
  assert.equal(shouldSyncTypeScriptRange('5.9.3', '5.9.3'), false)
  assert.equal(syncTypeScriptManifest(manifest, '5.9.3'), true)
  assert.equal(
    manifest.devDependencies.get(structUtils.parseIdent('typescript').identHash)?.range,
    '5.9.3'
  )
  assert.equal(syncTypeScriptManifest(manifest, '5.9.3'), false)
})
