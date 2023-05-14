import { GenerateProjectCommand } from './generate-project.command';
import { MigrationUpCommand } from './migration-up.command';
const beforeWorkspacePacking = (workspace, rawManifest) => {
    if (rawManifest.publishConfig && rawManifest.publishConfig.schematics) {
        rawManifest.schematics = rawManifest.publishConfig.schematics;
    }
};
export const plugin = {
    commands: [GenerateProjectCommand, MigrationUpCommand],
    hooks: [beforeWorkspacePacking],
};
