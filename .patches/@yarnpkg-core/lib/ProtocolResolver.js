"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolResolver = exports.TAG_REGEXP = void 0;
const semver_1 = __importDefault(require("semver"));
const semverUtils = __importStar(require("./semverUtils"));
const structUtils = __importStar(require("./structUtils"));
exports.TAG_REGEXP = /^(?!v)[a-z0-9._-]+$/i;
class ProtocolResolver {
    supportsDescriptor(descriptor, opts) {
        if (semverUtils.validRange(descriptor.range))
            return true;
        if (exports.TAG_REGEXP.test(descriptor.range))
            return true;
        return false;
    }
    supportsLocator(locator, opts) {
        if (semver_1.default.valid(locator.reference))
            return true;
        if (exports.TAG_REGEXP.test(locator.reference))
            return true;
        return false;
    }
    shouldPersistResolution(locator, opts) {
        return opts.resolver.shouldPersistResolution(this.forwardLocator(locator, opts), opts);
    }
    bindDescriptor(descriptor, fromLocator, opts) {
        return opts.resolver.bindDescriptor(this.forwardDescriptor(descriptor, opts), fromLocator, opts);
    }
    getResolutionDependencies(descriptor, opts) {
        return opts.resolver.getResolutionDependencies(this.forwardDescriptor(descriptor, opts), opts);
    }
    async getCandidates(descriptor, dependencies, opts) {
        return await opts.resolver.getCandidates(this.forwardDescriptor(descriptor, opts), dependencies, opts);
    }
    async getSatisfying(descriptor, references, opts) {
        return await opts.resolver.getSatisfying(this.forwardDescriptor(descriptor, opts), references, opts);
    }
    async resolve(locator, opts) {
        const pkg = await opts.resolver.resolve(this.forwardLocator(locator, opts), opts);
        return structUtils.renamePackage(pkg, locator);
    }
    forwardDescriptor(descriptor, opts) {
        return structUtils.makeDescriptor(descriptor, `${opts.project.configuration.get(`defaultProtocol`)}${descriptor.range}`);
    }
    forwardLocator(locator, opts) {
        return structUtils.makeLocator(locator, `${opts.project.configuration.get(`defaultProtocol`)}${locator.reference}`);
    }
}
exports.ProtocolResolver = ProtocolResolver;
