import { getWorkspaceDependents } from './get-workspace-dependents.util';
export const getChangedWorkspaces = (project, files) => {
    const workspaces = new Set();
    for (const workspace of project.workspaces) {
        const changed = files.some((path) => path.startsWith(workspace.relativeCwd));
        if (changed && !workspaces.has(workspace)) {
            workspaces.add(workspace);
            for (const dependency of getWorkspaceDependents(workspace)) {
                workspaces.add(dependency);
            }
        }
    }
    return [...workspaces];
};
