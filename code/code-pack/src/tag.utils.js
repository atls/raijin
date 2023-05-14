import { context } from '@actions/github';
import { execUtils } from '@yarnpkg/core';
export const getPullRequestSha = () => {
    var _a, _b;
    const event = context.payload;
    return (process.env.GITHUB_PULL_REQUST_HEAD_SHA ||
        event.after ||
        ((_b = (_a = event.pull_request) === null || _a === void 0 ? void 0 : _a.head) === null || _b === void 0 ? void 0 : _b.sha) ||
        process.env.GITHUB_SHA);
};
export const getPullRequestId = () => {
    var _a;
    const event = context.payload;
    return (_a = event.pull_request) === null || _a === void 0 ? void 0 : _a.id;
};
export const getPullRequestNumber = () => {
    var _a;
    const event = context.payload;
    return String((_a = event.pull_request) === null || _a === void 0 ? void 0 : _a.number);
};
export const getRevision = async () => {
    if (process.env.GITHUB_EVENT_PATH && process.env.GITHUB_TOKEN) {
        return getPullRequestSha();
    }
    const { stdout } = await execUtils.execvp('git', ['log', '-1', '--format="%H"'], {
        cwd: process.cwd(),
        strict: true,
    });
    const [revision] = stdout.split('\n');
    return revision.replace(/"/g, '');
};
export const getContext = async () => {
    if (process.env.GITHUB_EVENT_PATH && process.env.GITHUB_TOKEN) {
        return getPullRequestNumber();
    }
    return 'local';
};
export const getTag = async (tagPolicy) => {
    const revision = await getRevision();
    const hash = revision.substr(0, 7);
    if (tagPolicy === 'hash-timestamp') {
        return `${hash}-${Date.now()}`;
    }
    if (tagPolicy === 'ctx-hash-timestamp') {
        const ctx = await getContext();
        return `${ctx}-${hash}-${Date.now()}`;
    }
    return revision;
};
