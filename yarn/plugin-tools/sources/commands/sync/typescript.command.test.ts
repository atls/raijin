import type { Package }             from '@yarnpkg/core'

import assert                       from 'node:assert/strict'
import test                         from 'node:test'

import { structUtils }              from '@yarnpkg/core'

import { findStoredPackageByIdent } from './typescript.command.js'
import { getRaijinTypeScriptRange } from './typescript.command.js'

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

test('should not invent TypeScript range when Raijin is absent', () => {
  const project = {
    storedPackages: new Map([['code-lint', createPackage('@atls/code-lint')]]),
  }

  assert.equal(getRaijinTypeScriptRange(project as never), undefined)
})
