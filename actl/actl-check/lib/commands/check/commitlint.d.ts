import { Command } from '@oclif/command';
export default class CommitLintCommand extends Command {
    static description: string;
    static examples: string[];
    run(): Promise<void>;
    check({ valid, results }: any): Promise<void>;
}
