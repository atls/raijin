/* eslint-disable @typescript-eslint/sort-type-constituents */

import path       from 'node:path'


export const getProtoFileName = (resourcePath: string): string => {
  const hash = Buffer.from(path.dirname(resourcePath)).toString('hex')

export const getProtoFileName = (resourcePath: string): string => {
  const hash = Buffer.from(path.dirname(resourcePath)).toString("hex");

export const resolvePackageImportPath = (packageName: string, importPath: string): string => {
  const packagePath = packageName.replace(/\./g, '/')

  if (importPath.startsWith(packagePath)) {
    return path.relative(packagePath, importPath);
  }

  return importPath;
};

export default function protoImportsLoader(source: string | Buffer): string {
  const { imports, package: packageName } = parse(source);

  const dependencies: Array<string> = [];

  imports.forEach((importPath) => {
    if (!path.isAbsolute(importPath)) {
      const resolvedImportPath = resolvePackageImportPath(
        // @ts-expect-error null is not assignable
        packageName,
        importPath
      )
      const importAbsolutePath = path.join(
        // @ts-expect-error this is undefined
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        path.dirname(this.resourcePath),
        resolvedImportPath
      )
      const targetPath = getProtoFileName(importAbsolutePath)

      // @ts-expect-error source can be buffer
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, no-param-reassign
      source = source.replace(importPath, targetPath)

      dependencies.push(`require('${importAbsolutePath}')`);

      // @ts-expect-error this is undefined
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.addDependency(importAbsolutePath)
    }
  });

  const result = fileLoader.call(
    {
      // @ts-expect-error this is undefined
      ...this,
      query: {
        postTransformPublicPath: (p: string) =>
          `__non_webpack_require__.resolve(${p})`,
        // @ts-expect-error this is undefined
        name: getProtoFileName(this.resourcePath as string),
      },
    },
    source
  );

  return [...dependencies, result].join("\n");
}
