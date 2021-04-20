import { Command } from '@oclif/command';
export default class BuildCommand extends Command {
    static description: string;
    static examples: string[];
    static strict: boolean;
    static flags: {
        changes: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
