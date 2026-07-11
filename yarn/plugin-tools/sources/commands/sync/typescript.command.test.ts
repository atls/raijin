import type { Package }              from '@yarnpkg/core'

import assert                        from 'node:assert/strict'
import test                          from 'node:test'

import { Manifest }                  from '@yarnpkg/core'
import { structUtils }               from '@yarnpkg/core'

import { createRaijinSyncTarget }    from './target.js'
import { findStoredPackageByIdent }  from './typescript.command.js'
import { getRaijinTypeScriptRange }  from './typescript.command.js'
import { normalizeTypeScriptRange }  from './typescript.command.js'
import { shouldSyncTypeScriptRange } from './typescript.command.js'
import { syncTypeScriptManifest }    from './typescript.command.js'

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

const createWorkspaceManifest = (devDependencies: Record<string, string>): Manifest =>
  Manifest.fromText(JSON.stringify({ devDependencies }))

const getTypeScriptRange = (manifest: Manifest): string =>
  manifest.devDependencies.get(structUtils.parseIdent('typescript').identHash)?.range ?? ''

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

test('should normalize Yarn package protocol from installed TypeScript range', () => {
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

test('should sync broad TypeScript ranges to exact Raijin runtime range', () => {
  assert.equal(shouldSyncTypeScriptRange('^5', '5.9.3'), true)
  assert.equal(shouldSyncTypeScriptRange('5.9.3', '5.9.3'), false)
  assert.equal(
    shouldSyncTypeScriptRange(
      'patch:typescript@npm%3A5.9.3#optional!builtin<compat/typescript>',
      '5.9.3'
    ),
    false
  )
  assert.equal(
    shouldSyncTypeScriptRange(
      'patch:typescript@npm%3A5.9.2#optional!builtin<compat/typescript>',
      '5.9.3'
    ),
    true
  )
})

test('should sync TypeScript range through project root workspace target', () => {
  const rootManifest = createWorkspaceManifest({ typescript: '^5' })
  const leafManifest = createWorkspaceManifest({ typescript: '5.8.0' })
  const rootWorkspace = {
    cwd: '/repo',
    manifest: rootManifest,
  }
  const leafWorkspace = {
    cwd: '/repo/packages/client',
    manifest: leafManifest,
  }
  const project = {
    topLevelWorkspace: rootWorkspace,
    workspaces: [rootWorkspace, leafWorkspace],
  }
  const target = createRaijinSyncTarget(project as never)

  assert.notEqual(target.workspace, leafWorkspace)
  assert.equal(syncTypeScriptManifest(target.workspace.manifest, '5.9.3'), true)
  assert.equal(getTypeScriptRange(rootManifest), '5.9.3')
  assert.equal(getTypeScriptRange(leafManifest), '5.8.0')
})
