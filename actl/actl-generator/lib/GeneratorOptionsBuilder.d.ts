import { GeneratorOptions, fn } from './types';
export declare class GeneratorOptionsBuilder<T> {
    private static readonly defaultOptionsFactory;
    private readonly options;
    constructor(options?: GeneratorOptions);
    pick(key: keyof T): this;
    getOptions(): GeneratorOptions;
    setHandler(key: keyof T, handler: fn<any>): this;
    setDefaultResolver(resolver: fn<any>): this;
    unsetDefaultResolver(): boolean;
}
