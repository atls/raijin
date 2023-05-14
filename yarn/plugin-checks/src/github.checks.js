import { getOctokit } from '@actions/github';
import { context } from '@actions/github';
export var AnnotationLevel;
(function (AnnotationLevel) {
    AnnotationLevel["Warning"] = "warning";
    AnnotationLevel["Failure"] = "failure";
})(AnnotationLevel || (AnnotationLevel = {}));
export class GitHubChecks {
    constructor(name) {
        this.name = name;
        this.octokit = getOctokit(process.env.GITHUB_TOKEN);
    }
    start() {
        var _a;
        const { payload } = context;
        return this.octokit.rest.checks.create({
            ...context.repo,
            name: this.name,
            head_sha: payload.after || ((_a = payload.pull_request) === null || _a === void 0 ? void 0 : _a.head.sha) || process.env.GITHUB_SHA,
            started_at: new Date().toISOString(),
            status: 'in_progress',
        });
    }
    complete(id, output) {
        var _a, _b;
        const { payload } = context;
        return this.octokit.rest.checks.create({
            ...context.repo,
            check_run_id: id,
            name: this.name,
            head_sha: payload.after || ((_a = payload.pull_request) === null || _a === void 0 ? void 0 : _a.head.sha) || process.env.GITHUB_SHA,
            completed_at: new Date().toISOString(),
            status: 'completed',
            conclusion: output.annotations.length > 0 ? 'failure' : 'success',
            output: ((_b = output.annotations) === null || _b === void 0 ? void 0 : _b.length) > 50
                ? {
                    ...output,
                    annotations: output.annotations.slice(0, 50),
                }
                : output,
        });
    }
    failure(output) {
        var _a, _b;
        const { payload } = context;
        return this.octokit.rest.checks.create({
            ...context.repo,
            name: this.name,
            head_sha: payload.after || ((_a = payload.pull_request) === null || _a === void 0 ? void 0 : _a.head.sha) || process.env.GITHUB_SHA,
            completed_at: new Date().toISOString(),
            status: 'completed',
            conclusion: 'failure',
            output: ((_b = output.annotations) === null || _b === void 0 ? void 0 : _b.length) > 50
                ? {
                    ...output,
                    annotations: output.annotations.slice(0, 50),
                }
                : output,
        });
    }
}
