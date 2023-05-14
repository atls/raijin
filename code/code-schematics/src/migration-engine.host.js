import { NodePnpEngineHost } from './node-pnp-engine.host';
export class MigrationEngineHost extends NodePnpEngineHost {
    _resolveCollectionPath(name) {
        return name;
    }
}
