import PackageGraph from '@lerna/package-graph'
import Project from '@lerna/project'
import collectDependents from '@lerna/collect-updates/lib/collect-dependents'

export const getChangedPackages = async (files: string[]) => {
  const project = new Project(process.cwd())
  const packages = await project.getPackages()
  const packageGraph = new PackageGraph(packages)
  const changed = packages.filter((pkg) => files.some(file => file.startsWith(pkg.location)))
  const packageGraphNodes = new Set();

  changed.forEach((pkg) => packageGraphNodes.add(packageGraph.get(pkg.name)));

  const unique = Array.from(collectDependents(packageGraphNodes))
    .map((graphNode) => graphNode.pkg)
    .concat(changed)
    .reduce((result, item) => {
      result.set(item.name, item);
      return result;
    }, new Map())
    .values();

  return Array.from(unique);
}
