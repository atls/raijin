import { WorkspacesChangedForeachCommand } from './workspaces-changed-foreach.command';
import { WorkspacesChangedListCommand } from './workspaces-changed-list.command';
export const plugin = {
    commands: [WorkspacesChangedForeachCommand, WorkspacesChangedListCommand],
};
