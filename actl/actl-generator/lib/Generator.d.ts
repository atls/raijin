import { GeneratorOptions } from './types';
export declare class Generator<T> {
    private readonly options;
    constructor(options: GeneratorOptions);
    generate(): Promise<T>;
}
