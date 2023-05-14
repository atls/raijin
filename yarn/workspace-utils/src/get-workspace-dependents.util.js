import { structUtils } from '@yarnpkg/core';
import { getWorkspaceDependencies } from './get-workspace-dependencies.util';
export const getWorkspaceDependents = (workspace) => {
    const dependents = new Set();
    for (const ws of workspace.project.workspaces) {
        const isDependency = getWorkspaceDependencies(ws).some((dependency) => structUtils.areLocatorsEqual(dependency.locator, workspace.locator));
        if (isDependency) {
            dependents.add(ws);
        }
    }
    return [...dependents];
};
