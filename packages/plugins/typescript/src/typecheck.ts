import type { CommandInput }            from '@atls/raijin/commands'
import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import { checkFiles }                   from './files.js'
import { checkProject }                 from './project.js'

const TYPESCRIPT_RUNTIME_SPECIFIER = '@atls/raijin/typescript'

type TypecheckManifestPolicySource = {
  readonly cwd: string
  readonly typecheckSkipLibCheck?: unknown
}

type TypecheckInput = {
  readonly cwd: string
  readonly manifestPolicySources?: ReadonlyArray<TypecheckManifestPolicySource>
  readonly targets?: CommandInput
}

type TypecheckCompletedResult = {
  readonly kind: 'completed'
  readonly diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>
  readonly exitCode: 0 | 1
}

type TypecheckManagedError = {
  readonly kind: 'error'
  readonly reason: 'invalid-policy' | 'missing-project'
  readonly cwd: string
}

export type TypecheckResult = TypecheckCompletedResult | TypecheckManagedError

const importTypeScript = async (): Promise<typeof TypeScriptRuntime> => {
  const runtime = await (import(TYPESCRIPT_RUNTIME_SPECIFIER) as Promise<{
    ts: typeof TypeScriptRuntime
  }>)

  return runtime.ts
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

export const typecheckProjectSources = async ({
  cwd,
  manifestPolicySources = [],
  targets,
}: TypecheckInput): Promise<TypecheckResult> => {
  const policy = resolveTypecheckSkipLibCheck(manifestPolicySources)

  if (typeof policy === 'object') {
    return policy
  }

  const typescript = await importTypeScript()

  if (targets && targets.targets.length > 0) {
    return toCompletedResult(checkFiles(targets, policy, typescript), typescript)
  }

  const diagnostics = checkProject(cwd, policy, typescript)

  return diagnostics
    ? toCompletedResult(diagnostics, typescript)
    : { kind: 'error', reason: 'missing-project', cwd }
}
