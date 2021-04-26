import { Command } from '@oclif/command';
export default class CommitCommand extends Command {
    static description: string;
    static examples: string[];
    run(): Promise<void>;
}
