import commitformat from '@commitlint/format';
import { rules } from './commit.rules';
import { lint as commitlint } from './commitlint';
export class CommitLinter {
    async lint(message) {
        return commitlint(message, rules);
    }
    format(report, options = {
        helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
    }) {
        return commitformat(report, options);
    }
}
