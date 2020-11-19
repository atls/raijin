var GeneratorOptionsBuilder = (function () {
    function GeneratorOptionsBuilder(options) {
        this.options = Object.assign(GeneratorOptionsBuilder.defaultOptionsFactory(), options);
    }
    GeneratorOptionsBuilder.prototype.pick = function (key) {
        this.options.allProperties.push(String(key));
        return this;
    };
    GeneratorOptionsBuilder.prototype.getOptions = function () {
        return this.options;
    };
    GeneratorOptionsBuilder.prototype.setHandler = function (key, handler) {
        var strategyRouter = this.options.strategyRouter;
        var properties = strategyRouter.get(handler);
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
    };
    GeneratorOptionsBuilder.prototype.setDefaultResolver = function (resolver) {
        if (this.options.defaultHandler === null) {
            this.unsetDefaultResolver();
        }
        this.options.defaultHandler = resolver;
        return this;
    };
    GeneratorOptionsBuilder.prototype.unsetDefaultResolver = function () {
        if (this.options.defaultHandler === null) {
            return false;
        }
        this.options.defaultHandler = null;
        return true;
    };
    GeneratorOptionsBuilder.defaultOptionsFactory = function () {
        return {
            allProperties: [],
            defaultHandler: null,
            strategyRouter: new Map(),
        };
    };
    return GeneratorOptionsBuilder;
}());
export { GeneratorOptionsBuilder };
