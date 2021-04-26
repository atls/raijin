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
exports.getChangedPackages = void 0;
const package_graph_1 = __importDefault(require("@lerna/package-graph"));
const project_1 = __importDefault(require("@lerna/project"));
const collect_dependents_1 = __importDefault(require("@lerna/collect-updates/lib/collect-dependents"));
exports.getChangedPackages = (files) => __awaiter(void 0, void 0, void 0, function* () {
    const project = new project_1.default(process.cwd());
    const packages = yield project.getPackages();
    const packageGraph = new package_graph_1.default(packages);
    const changed = packages.filter((pkg) => files.some(file => file.startsWith(pkg.location)));
    const packageGraphNodes = new Set();
    changed.forEach((pkg) => packageGraphNodes.add(packageGraph.get(pkg.name)));
    const unique = Array.from(collect_dependents_1.default(packageGraphNodes))
        .map((graphNode) => graphNode.pkg)
        .concat(changed)
        .reduce((result, item) => {
        result.set(item.name, item);
        return result;
    }, new Map())
        .values();
    return Array.from(unique);
});
