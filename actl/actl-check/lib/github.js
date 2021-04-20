"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPullCommitsMessages = exports.createCheck = void 0;
const github_1 = require("@actions/github");
const octokit = new github_1.GitHub(process.env.GITHUB_TOKEN);
const event = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {};
exports.createCheck = (name, conclusion, output) => __awaiter(void 0, void 0, void 0, function* () {
    const params = Object.assign(Object.assign({}, github_1.context.repo), { name, head_sha: event.after || event.pull_request.head.sha || process.env.GITHUB_SHA, status: 'completed', completed_at: new Date().toISOString(), conclusion,
        output });
    try {
        yield octokit.checks.create(params);
    }
    catch (error) {
        console.log(error);
    }
});
exports.getPullCommitsMessages = () => __awaiter(void 0, void 0, void 0, function* () {
    const { data } = yield octokit.pulls.listCommits(Object.assign(Object.assign({}, github_1.context.repo), { pull_number: event.number }));
    return data.map(({ commit }) => commit.message);
});
