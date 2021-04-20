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
exports.getBranchName = exports.getPullFiles = void 0;
const github_1 = require("@actions/github");
const path_1 = require("path");
const event = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {};
const octokit = new github_1.GitHub(process.env.GITHUB_TOKEN);
exports.getPullFiles = () => __awaiter(void 0, void 0, void 0, function* () {
    const cwd = process.cwd();
    const { data } = yield octokit.pulls.listFiles(Object.assign(Object.assign({}, github_1.context.repo), { pull_number: event.number }));
    return data.map(({ filename }) => path_1.join(cwd, filename));
});
exports.getBranchName = () => __awaiter(void 0, void 0, void 0, function* () {
    return github_1.context.ref.replace('refs/heads', '').match(/(.*?)\//);
});
