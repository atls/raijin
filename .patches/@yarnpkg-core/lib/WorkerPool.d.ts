export declare class WorkerPool<TIn, TOut> {
    private source;
    private workers;
    private limit;
    private cleanupInterval;
    constructor(source: string);
    private createWorker;
    run(data: TIn): Promise<TOut>;
}
