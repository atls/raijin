import { getDynamicLibs } from '@yarnpkg/cli';
import packageJson from '@atls/yarn-cli/package.json';
export function getPluginConfiguration() {
    const plugins = new Set();
    for (const dependencyName of packageJson['@yarnpkg/builder'].bundles.standard)
        plugins.add(dependencyName);
    const modules = getDynamicLibs();
    for (const plugin of plugins)
        modules.set(plugin, require(plugin).default);
    return { plugins, modules };
}
