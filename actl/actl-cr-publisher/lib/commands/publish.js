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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const execa_1 = __importDefault(require("execa"));
const fs_1 = require("fs");
const path_1 = require("path");
const lerna_1 = require("@atlantis-lab/actl-build/lib/lerna");
const github_1 = require("../github");
const event = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {};
class BuildCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield github_1.getPullFiles();
            const branch = github_1.getBranchName();
            const packages = yield lerna_1.getChangedPackages(files);
            const sha = (event.after ||
                event.pull_request.head.sha ||
                process.env.GITHUB_SHA).substr(0, 7);
            const version = `${branch}-${sha}`;
            const commands = [];
            const withImages = packages.filter((pkg) => fs_1.existsSync(path_1.join(pkg.location, 'Dockerfile')));
            withImages.forEach((pkg) => {
                const dockerfile = path_1.join(pkg.location, 'Dockerfile').replace(`${process.cwd()}/`, '');
                const name = pkg.name.replace(/@/g, '').replace(/\//, '-');
                const repo = `${process.env.REGISTRY_URL}${name}`;
                commands.push({ repo, dockerfile });
            });
            try {
                for (const command of commands) {
                    yield execa_1.default('docker', [
                        'build',
                        '-t',
                        `${command.repo}:${version}`,
                        '-t',
                        `${command.repo}:latest`,
                        '--file',
                        command.dockerfile,
                        '.',
                    ], { stdio: 'inherit' });
                }
                for (const command of commands) {
                    yield execa_1.default('docker', ['push', `${command.repo}:${version}`], {
                        stdio: 'inherit',
                    });
                }
                for (const command of commands) {
                    yield execa_1.default('docker', ['push', `${command.repo}:latest`], {
                        stdio: 'inherit',
                    });
                }
            }
            catch (error) {
                this.error(error);
            }
        });
    }
}
exports.default = BuildCommand;
BuildCommand.description = 'Publish release';
BuildCommand.examples = ['$ actl release:publish'];
BuildCommand.strict = false;
