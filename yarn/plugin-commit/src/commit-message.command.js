import { BaseCommand } from '@yarnpkg/cli';
import { xfs } from '@yarnpkg/fslib';
import { renderForm } from '@yarnpkg/libui/sources/misc/renderForm';
import React from 'react';
import wrap from 'word-wrap';
import { Option } from 'clipanion';
import { forceStdinTty } from 'force-stdin-tty';
import { useStdin } from 'ink';
import { useEffect } from 'react';
import { useState } from 'react';
import { RequestCommitMessage } from '@atls/cli-ui-git-commit-component';
const RequestCommitMessageSubmit = ({ commit, useSubmit }) => {
    const { stdin } = useStdin();
    useSubmit(commit);
    useEffect(() => {
        stdin === null || stdin === void 0 ? void 0 : stdin.emit('keypress', '', { name: 'return' });
    }, [stdin]);
    return null;
};
const RequestCommitMessageApp = ({ useSubmit }) => {
    const [commit, setCommit] = useState();
    if (!commit) {
        return React.createElement(RequestCommitMessage, { onSubmit: setCommit });
    }
    return React.createElement(RequestCommitMessageSubmit, { commit: commit, useSubmit: useSubmit });
};
export class CommitMessageCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.args = Option.Rest({ required: 0 });
    }
    async execute() {
        const [commitMessageFile, source] = this.args;
        if (source) {
            return 0;
        }
        if (!commitMessageFile) {
            throw new Error('Commit edit message file required.');
        }
        const overwroteStdin = forceStdinTty();
        const commit = await renderForm(RequestCommitMessageApp, {}, {
            stdin: this.context.stdin,
            stdout: this.context.stdout,
            stderr: this.context.stderr,
        });
        if (commit) {
            await xfs.writeFilePromise(commitMessageFile, this.formatCommit(commit));
        }
        if (overwroteStdin) {
            process.stdin.destroy();
        }
        return commit ? 0 : 1;
    }
    formatCommit(commit) {
        const wrapOptions = {
            trim: true,
            cut: false,
            newline: '\n',
            indent: '',
            width: 100,
        };
        let head = `${commit.type}${commit.scope ? `(${commit.scope})` : ''}: ${commit.subject}`;
        if (commit.skipci) {
            head += ' [skip ci]';
        }
        const body = commit.body ? wrap(commit.body, wrapOptions) : false;
        const breaking = commit.breaking
            ? wrap(`BREAKING CHANGE: ${commit.breaking.trim().replace(/^BREAKING CHANGE: /, '')}`, wrapOptions)
            : false;
        const issues = commit.issues ? wrap(commit.issues, wrapOptions) : false;
        return [head, body, breaking, issues].filter(Boolean).join('\n\n');
    }
}
CommitMessageCommand.paths = [['commit', 'message']];
