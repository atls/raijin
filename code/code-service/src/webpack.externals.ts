import type { IPackageJson } from "package-json-type";
import type { webpack } from "@atls/code-runtime/webpack";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { WorkspaceConfiguration } from "@atls/code-configuration";

export class WebpackExternals {
  #externals: Array<string> = [];

  #dependencies: Array<string> = [];

  constructor(private readonly cwd: string) {}

  async loadPackageJson(): Promise<IPackageJson> {
    try {
      return JSON.parse(
        await readFile(join(this.cwd, "package.json"), "utf-8")
      ) as IPackageJson;
    } catch {
      return {};
    }
  }

  async loadDependencies(): Promise<Array<string>> {
    const { dependencies = {} } = await this.loadPackageJson();

    return Object.keys(dependencies);
  }

  async loadExternals(): Promise<Array<string>> {
    const { service } = await WorkspaceConfiguration.find(this.cwd);

    return service?.externals || [];
  }

  async build(): Promise<typeof this.externals> {
    this.#externals = await this.loadExternals();
    this.#dependencies = await this.loadDependencies();

    return this.externals;
  }

  private externals = (
    { request }: webpack.ExternalItemFunctionData,
    callback: (
      error?: Error,
      result?: string,
      type?: webpack.Configuration["externalsType"]
    ) => void
  ): void => {
    if (request && this.#dependencies.includes(request)) {
      callback(undefined, request, "module");
    } else if (request && this.#externals.includes(request)) {
      callback(undefined, request, "import");
    } else {
      callback();
    }
  };
}
