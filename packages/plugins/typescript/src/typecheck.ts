import type { ts as TypeScriptRuntime }       from '@atls/raijin/typescript'

import type { TypecheckInput }                from './interfaces/input.js'
import type { TypecheckManifestPolicySource } from './interfaces/input.js'
import type { TypeScriptProvider }            from './interfaces/provider.js'
import type { TypecheckCompletedResult }      from './interfaces/result.js'
import type { TypecheckManagedError }         from './interfaces/result.js'
import type { TypecheckResult }               from './interfaces/result.js'

import { checkFiles }                         from './files.js'
import { checkProject }                       from './project.js'

const TYPESCRIPT_RUNTIME_SPECIFIER = '@atls/raijin/typescript'

const importTypeScript = async (): Promise<typeof TypeScriptRuntime> => {
  const provider = (await import(TYPESCRIPT_RUNTIME_SPECIFIER)) as TypeScriptProvider

  return provider.ts
}

const resolveTypecheckSkipLibCheck = (
  sources: ReadonlyArray<TypecheckManifestPolicySource>
): TypecheckManagedError | boolean | undefined => {
  const configured = [...sources]
    .reverse()
    .find((source) => Object.hasOwn(source, 'typecheckSkipLibCheck'))

  if (!configured) {
    return undefined
  }

  if (typeof configured.typecheckSkipLibCheck !== 'boolean') {
    return {
      kind: 'error',
      reason: 'invalid-policy',
      cwd: configured.cwd,
    }
  }

  return configured.typecheckSkipLibCheck
}

const toCompletedResult = (
  diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>,
  typescript: typeof TypeScriptRuntime
): TypecheckCompletedResult => {
  const uniqueDiagnostics = typescript.sortAndDeduplicateDiagnostics([...diagnostics])

  return {
    kind: 'completed',
    diagnostics: uniqueDiagnostics,
    exitCode: uniqueDiagnostics.length > 0 ? 1 : 0,
  }
}

export const typecheckProjectSources = async (input: TypecheckInput): Promise<TypecheckResult> => {
  if (input.kind === 'files') {
    const typescript = await importTypeScript()

    return toCompletedResult(checkFiles(input.files, typescript), typescript)
  }

  const policy = resolveTypecheckSkipLibCheck(input.manifestPolicySources ?? [])

  if (typeof policy === 'object') {
    return policy
  }

  const typescript = await importTypeScript()
  const diagnostics = checkProject(input.cwd, input.projectCwd, policy, typescript)

  return diagnostics
    ? toCompletedResult(diagnostics, typescript)
    : { kind: 'error', reason: 'missing-project', cwd: input.cwd }
}
