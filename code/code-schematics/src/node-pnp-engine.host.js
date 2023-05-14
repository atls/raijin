import { dirname } from 'node:path';
import { join } from 'node:path';
import { resolve } from 'node:path';
import { ExportStringRef } from '@angular-devkit/schematics/tools';
import { CollectionCannotBeResolvedException } from '@angular-devkit/schematics/tools';
import { CollectionMissingSchematicsMapException } from '@angular-devkit/schematics/tools';
import { FileSystemEngineHostBase } from '@angular-devkit/schematics/tools';
import { SchematicMissingFieldsException } from '@angular-devkit/schematics/tools';
import { NodePackageDoesNotSupportSchematics } from '@angular-devkit/schematics/tools';
import { readJsonFile } from '@angular-devkit/schematics/tools/file-system-utility';
export class NodePnpEngineHost extends FileSystemEngineHostBase {
    constructor(paths) {
        super();
        this.paths = paths;
    }
    resolve(name, requester, references = new Set()) {
        var _a;
        if (requester) {
            if (references.has(requester)) {
                references.add(requester);
                throw new Error(`Circular schematic reference detected: ${JSON.stringify(Array.from(references))}`);
            }
            else {
                references.add(requester);
            }
        }
        const relativeBase = requester ? dirname(requester) : process.cwd();
        let collectionPath;
        if (name.startsWith('.')) {
            name = resolve(relativeBase, name);
        }
        const resolveOptions = {
            paths: (_a = (requester ? [dirname(requester), ...(this.paths || [])] : this.paths)) === null || _a === void 0 ? void 0 : _a.filter(Boolean),
        };
        try {
            const packageJsonPath = require.resolve(join(name, 'package.json'), resolveOptions);
            const { schematics } = require(packageJsonPath);
            if (!schematics || typeof schematics !== 'string') {
                throw new NodePackageDoesNotSupportSchematics(name);
            }
            collectionPath = this.resolve(schematics, packageJsonPath, references);
        }
        catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') {
                throw e;
            }
        }
        if (!collectionPath) {
            try {
                collectionPath = require.resolve(name, resolveOptions);
            }
            catch (e) {
                if (e.code !== 'MODULE_NOT_FOUND') {
                    throw e;
                }
            }
        }
        if (!collectionPath) {
            throw new CollectionCannotBeResolvedException(name);
        }
        return collectionPath;
    }
    _resolveCollectionPath(name, requester) {
        const collectionPath = this.resolve(name, requester);
        readJsonFile(collectionPath);
        return collectionPath;
    }
    _resolveReferenceString(refString, parentPath) {
        const ref = new ExportStringRef(refString, parentPath);
        if (!ref.ref) {
            return null;
        }
        return { ref: ref.ref, path: ref.module };
    }
    _transformCollectionDescription(name, desc) {
        if (!desc.schematics || typeof desc.schematics !== 'object') {
            throw new CollectionMissingSchematicsMapException(name);
        }
        return {
            ...desc,
            name,
        };
    }
    _transformSchematicDescription(name, _collection, desc) {
        if (!desc.factoryFn || !desc.path || !desc.description) {
            throw new SchematicMissingFieldsException(name);
        }
        return desc;
    }
}
