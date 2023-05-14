import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { normalize } from '@angular-devkit/core';
import { schema } from '@angular-devkit/core';
import { virtualFs } from '@angular-devkit/core';
import { formats } from '@angular-devkit/schematics';
export const createCollection = (root, collectionName) => {
    const fsHost = new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(root));
    const workflow = new NodeWorkflow(fsHost, {
        force: false,
        dryRun: true,
        packageManager: 'yarn',
        root: normalize(root),
        registry: new schema.CoreSchemaRegistry(formats.standardFormats),
    });
    return workflow.engine.createCollection(collectionName);
};
export const expandCollection = (cwd, collectionName) => {
    const collection = createCollection(cwd, collectionName);
    const collections = [collection];
    if (collection.baseDescriptions) {
        const baseCollections = collection.baseDescriptions
            .map((base) => expandCollection(cwd, base.name))
            .flat();
        return [...collections, ...baseCollections];
    }
    return collections;
};
export const expandCollections = (cwd, collectionName, schematicName) => {
    const collections = expandCollection(cwd, collectionName).reverse();
    const nested = collections.map((collection) => {
        const schematic = collection.description.schematics[schematicName];
        if (schematic && schematic.extends) {
            const [extendsCollection, extendsSchematic] = schematic.extends.split(':');
            return expandCollections(cwd, extendsCollection, extendsSchematic);
        }
        return [];
    });
    return [...nested, collections].flat();
};
