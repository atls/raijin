import { dirname }             from 'node:path'
import { join }                from 'node:path'

import { Path }                from '@angular-devkit/core'
import { NodeJsSyncHost }      from '@angular-devkit/core/node'
import { DryRunEvent }         from '@angular-devkit/schematics'
import { NodeWorkflow }        from '@angular-devkit/schematics/tools'
import { virtualFs }           from '@angular-devkit/core'
import { lastValueFrom }       from 'rxjs'

import { MigrationEngineHost } from './migration-engine.host.js'
import { NodePnpEngineHost }   from './node-pnp-engine.host.js'
import { expandCollections }   from './utils/index.js'
import { resolveSchematics }   from './utils/index.js'

export class Schematics {
  constructor(
    private readonly cwd: string,
    private readonly force = false,
    private readonly dryRun = false
  ) {}

  async init(schematic: string, options = {}) {
    const host = new virtualFs.ScopedHost(new NodeJsSyncHost(), this.cwd as Path)

    // @ts-expect-error any
    const workflow = new NodeWorkflow(host, {
      force: this.force,
      dryRun: this.dryRun,
      resolvePaths: [this.cwd],
      schemaValidation: true,
      engineHostCreator: ({ resolvePaths }) => new NodePnpEngineHost(resolvePaths),
    })

    const collection = resolveSchematics(this.cwd)

    const events: Array<DryRunEvent> = []

    workflow.reporter.subscribe((event) => {
      events.push(event)
    })

    await workflow
      .execute({
        collection,
        schematic,
        options: {
          ...options,
          cwd: this.cwd,
        },
        allowPrivate: true,
        debug: true,
      })
      .toPromise()

    return events
  }

  async migrate(schematicName: string, migrationVersion: string, options = {}) {
    const host = new virtualFs.ScopedHost(new NodeJsSyncHost(), this.cwd as Path)

    // @ts-expect-error any
    const workflow = new NodeWorkflow(host, {
      force: true,
      dryRun: false,
      engineHostCreator: ({ resolvePaths }) => new MigrationEngineHost(resolvePaths),
    })

    const events: Array<DryRunEvent> = []

    workflow.reporter.subscribe((event) => {
      events.push(event)
    })

    const collections = expandCollections(this.cwd, resolveSchematics(this.cwd), schematicName)

    const migrations = collections
      .map((collection) => {
        const schematic = collection.description.schematics[schematicName]

        if (!schematic) {
          return []
        }

        const migrationsPath = join(
          dirname(collection.description.path),
          dirname(schematic.schema!),
          'migrations.json'
        )

        // eslint-disable-next-line security/detect-non-literal-require
        const data = require(migrationsPath)

        return Object.keys(data.schematics)
          .map((key) => ({
            collection: migrationsPath,
            schematic: key,
            migration: data.schematics[key],
          }))
          .filter((config) => config.migration.version > migrationVersion)
      })
      .flat()

    for (const migration of migrations) {
      // eslint-disable-next-line no-await-in-loop
      await lastValueFrom(
        workflow.execute({
          collection: migration.collection,
          schematic: migration.schematic,
          debug: false,
          options: {
            ...options,
            cwd: this.cwd,
          },
        })
      )
    }

    return events
  }
}
