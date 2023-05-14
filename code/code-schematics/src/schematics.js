import { dirname } from 'node:path';
import { join } from 'node:path';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { virtualFs } from '@angular-devkit/core';
import { MigrationEngineHost } from './migration-engine.host';
import { NodePnpEngineHost } from './node-pnp-engine.host';
import { expandCollections } from './utils';
import { resolveSchematics } from './utils';
export class Schematics {
    constructor(cwd, force = false, dryRun = false) {
        this.cwd = cwd;
        this.force = force;
        this.dryRun = dryRun;
    }
    async init(schematic, options = {}) {
        const host = new virtualFs.ScopedHost(new NodeJsSyncHost(), this.cwd);
        const workflow = new NodeWorkflow(host, {
            force: this.force,
            dryRun: this.dryRun,
            resolvePaths: [this.cwd],
            schemaValidation: true,
            engineHostCreator: ({ resolvePaths }) => new NodePnpEngineHost(resolvePaths),
        });
        const collection = resolveSchematics(this.cwd);
        const events = [];
        workflow.reporter.subscribe((event) => {
            events.push(event);
        });
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
            .toPromise();
        return events;
    }
    async migrate(schematicName, migrationVersion, options = {}) {
        const host = new virtualFs.ScopedHost(new NodeJsSyncHost(), this.cwd);
        const workflow = new NodeWorkflow(host, {
            force: true,
            dryRun: false,
            engineHostCreator: ({ resolvePaths }) => new MigrationEngineHost(resolvePaths),
        });
        const events = [];
        workflow.reporter.subscribe((event) => {
            events.push(event);
        });
        const collections = expandCollections(this.cwd, resolveSchematics(this.cwd), schematicName);
        const migrations = collections
            .map((collection) => {
            const schematic = collection.description.schematics[schematicName];
            if (!schematic) {
                return [];
            }
            const migrationsPath = join(dirname(collection.description.path), dirname(schematic.schema), 'migrations.json');
            const data = require(migrationsPath);
            return Object.keys(data.schematics)
                .map((key) => ({
                collection: migrationsPath,
                schematic: key,
                migration: data.schematics[key],
            }))
                .filter((config) => config.migration.version > migrationVersion);
        })
            .flat();
        for (const migration of migrations) {
            await workflow
                .execute({
                collection: migration.collection,
                schematic: migration.schematic,
                debug: false,
                options: {
                    ...options,
                    cwd: this.cwd,
                },
            })
                .toPromise();
        }
        return events;
    }
}
