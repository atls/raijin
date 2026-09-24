import type { CommandInput }                  from '@atls/raijin/commands'
import type { TypecheckManifestPolicySource } from '@atls/yarn-plugin-typescript'
import type { Writable }                      from 'node:stream'

import type { TypecheckScope }                from './typecheck/projects.js'

import { createCommandInput }                 from '@atls/raijin/commands'
import { toNativePath }                       from '@atls/raijin/filesystem'
import { toPortablePath }                     from '@atls/raijin/filesystem'
import { formatProjectSources }               from '@atls/yarn-plugin-format'
import { lintProjectSources }                 from '@atls/yarn-plugin-lint'
import { writeLintResult }                    from '@atls/yarn-plugin-lint'
import { discoverProjectTests }               from '@atls/yarn-plugin-test'
import { testProject }                        from '@atls/yarn-plugin-test'
import { typecheckProjectSources }            from '@atls/yarn-plugin-typescript'
import { writeCompleted }                     from '@atls/yarn-plugin-typescript'
import { writeManagedError }                  from '@atls/yarn-plugin-typescript'

type CheckStage = {
  readonly name: string
  readonly run: () => Promise<number>
}

export type CheckPolicyInput = {
  readonly cwd: string
  readonly projectCwd: string
  readonly pnpIgnorePatterns?: ReadonlyArray<string>
  readonly verify: boolean
  readonly skipTypecheck?: boolean
  readonly targets?: CommandInput
  readonly testTargets?: CommandInput
  readonly typecheckScopes?: ReadonlyArray<TypecheckScope>
  readonly workspacePackageNames: ReadonlyArray<string>
  readonly manifestPolicySources: ReadonlyArray<TypecheckManifestPolicySource>
  readonly stdout: Writable
  readonly stderr: Writable
}

export const runCheckStages = async (
  stages: ReadonlyArray<CheckStage>,
  stdout: Writable,
  stderr: Writable
): Promise<number> => {
  let failed = false

  for await (const stage of stages) {
    stdout.write(`${stage.name}\n`)

    try {
      if ((await stage.run()) !== 0) {
        failed = true
      }
    } catch (error) {
      stderr.write(`${stage.name}: ${error instanceof Error ? error.message : String(error)}\n`)
      failed = true
    }
  }

  return failed ? 1 : 0
}

export const runCheckPolicy = async (input: CheckPolicyInput): Promise<number> => {
  const {
    cwd,
    projectCwd,
    pnpIgnorePatterns = [],
    verify,
    skipTypecheck = false,
    targets,
    testTargets,
    typecheckScopes,
    workspacePackageNames,
    manifestPolicySources,
    stdout,
    stderr,
  } = input
  const stages: Array<CheckStage> = [
    {
      name: 'Format',
      run: async () => {
        const result = await formatProjectSources({
          cwd,
          pnpIgnorePatterns,
          targets,
          write: !verify,
          workspacePackageNames,
        })

        const drift = result.files.filter(({ status }) => status === 'changed')

        if (verify) {
          drift.forEach(({ file }) => stderr.write(`Format drift: ${file}\n`))
        }

        return verify && drift.length > 0 ? 1 : 0
      },
    },
    {
      name: 'Lint',
      run: async () => {
        const result = await lintProjectSources({
          rootCwd: projectCwd,
          cwd,
          pnpIgnorePatterns,
          targets: targets ? targets.targets.map(({ path }) => toNativePath(path)) : [cwd],
        })

        writeLintResult({ stdout, stderr }, result)

        return result.terminal.exitCode
      },
    },
    {
      name: 'TypeCheck',
      run: async () => {
        if (skipTypecheck) {
          return 0
        }

        const scopes: ReadonlyArray<TypecheckScope> = typecheckScopes ?? [
          { kind: 'project', cwd, manifestPolicySources },
        ]
        let failed = false

        for await (const scope of scopes) {
          const result = await typecheckProjectSources({
            cwd: scope.cwd,
            projectCwd,
            manifestPolicySources: scope.manifestPolicySources,
            ...(scope.kind === 'files'
              ? { kind: 'files' as const, files: scope.files }
              : { kind: 'project' as const }),
          })

          if (result.kind === 'error') {
            writeManagedError({ stderr }, result)
            failed = true
          } else {
            writeCompleted({ stdout }, result)
            failed ||= result.exitCode !== 0
          }
        }

        return failed ? 1 : 0
      },
    },
    ...(targets && !testTargets
      ? []
      : (['unit', 'integration'] as const).map((scenario): CheckStage => ({
          name: `Test:${scenario}`,
          run: async () => {
            const testInput =
              testTargets ??
              createCommandInput({
                cwd: toPortablePath(cwd),
                source: 'generated',
                targets: [],
              })
            const selectedTests = await discoverProjectTests({
              rootCwd: projectCwd,
              cwd,
              input: testInput,
              scenario,
            })

            if (selectedTests.length === 0) {
              return 0
            }

            const result = await testProject({
              rootCwd: projectCwd,
              cwd,
              input: testInput,
              reporter: 'spec',
              scenario,
              stdout,
            })

            if (result.status === 'provider-failed') {
              stderr.write(`${result.failure.name}: ${result.failure.message}\n`)
            }

            return result.terminal.exitCode
          },
        }))),
  ]

  return runCheckStages(stages, stdout, stderr)
}
