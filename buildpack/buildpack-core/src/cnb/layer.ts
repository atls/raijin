import { AnyJson }       from '@iarna/toml'
import { parse }         from '@iarna/toml'
import { stringify }     from '@iarna/toml'

import { writeFileSync } from 'fs'
import { readFileSync }  from 'fs'
import { rmdirSync }     from 'fs'
import { existsSync }    from 'fs'
import { mkdirSync }     from 'fs'
import { join }          from 'path'

export class Layer {
  private metadata: { [key: string]: string | null } = {}

  private metadataPath: string

  constructor(
    readonly name: string,
    readonly path: string,
    readonly build: boolean,
    readonly cache: boolean,
    readonly launch: boolean
  ) {
    this.metadataPath = `${path}.toml`
  }

  static create(
    name: string,
    layersPath: string,
    build: boolean = false,
    cache: boolean = false,
    launch: boolean = false
  ) {
    const layer = new Layer(name, join(layersPath, name), build, cache, launch)

    if (existsSync(layer.path)) {
      layer.load()
    } else {
      mkdirSync(layer.path)
    }

    return layer
  }

  load() {
    if (existsSync(this.metadataPath)) {
      try {
        const parsed: any = parse(readFileSync(this.metadataPath).toString())

        this.metadata = parsed.metadata || {}
      } catch (error) {
        console.log(error) // eslint-disable-line
      }
    }
  }

  save() {
    writeFileSync(
      this.metadataPath,
      stringify({
        metadata: this.metadata as AnyJson,
        build: this.build,
        cache: this.cache,
        launch: this.launch,
      })
    )
  }

  reset() {
    this.metadata = {}

    if (existsSync(this.path)) {
      rmdirSync(this.path)
    }

    mkdirSync(this.path)
  }

  setMetadata(key: string, value: string | null): void {
    this.metadata[key] = value
  }

  getMetadata(key: string) {
    return this.metadata[key]
  }
}
