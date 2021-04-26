"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratorOptionsBuilder = void 0;
class GeneratorOptionsBuilder {
    constructor(options) {
        this.options = Object.assign(GeneratorOptionsBuilder.defaultOptionsFactory(), options);
    }
    pick(key) {
        this.options.allProperties.push(String(key));
        return this;
    }
    getOptions() {
        return this.options;
    }
    setHandler(key, handler) {
        const { strategyRouter } = this.options;
        const properties = strategyRouter.get(handler);
        if (properties === undefined) {
            strategyRouter.set(handler, [String(key)]);
        }
        else {
            properties.push(String(key));
        }
        if (!this.options.allProperties.includes(String(key))) {
            this.options.allProperties.push(String(key));
        }
        return this;
    }
    setDefaultResolver(resolver) {
        if (this.options.defaultHandler === null) {
            this.unsetDefaultResolver();
        }
        this.options.defaultHandler = resolver;
        return this;
    }
    unsetDefaultResolver() {
        if (this.options.defaultHandler === null) {
            return false;
        }
        this.options.defaultHandler = null;
        return true;
    }
}
exports.GeneratorOptionsBuilder = GeneratorOptionsBuilder;
GeneratorOptionsBuilder.defaultOptionsFactory = () => {
    return {
        allProperties: [],
        defaultHandler: null,
        strategyRouter: new Map(),
    };
};
