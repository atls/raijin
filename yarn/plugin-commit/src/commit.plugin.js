import { CommitMessageLintCommand } from './commit-message-lint.command';
import { CommitMessageCommand } from './commit-message.command';
import { CommitStagedCommand } from './commit-staged.command';
export const plugin = {
    commands: [CommitMessageCommand, CommitMessageLintCommand, CommitStagedCommand],
};
