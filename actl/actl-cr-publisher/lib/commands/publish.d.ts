import { Command } from '@oclif/command';
export default class BuildCommand extends Command {
    static description: string;
    static examples: string[];
    static strict: boolean;
    run(): Promise<void>;
}
