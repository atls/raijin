import { NodePnpEngineHost } from './node-pnp-engine.host'

export class MigrationEngineHost extends NodePnpEngineHost {
  // eslint-disable-next-line no-underscore-dangle
  protected _resolveCollectionPath(name: string): string {
    return name
  }
}
