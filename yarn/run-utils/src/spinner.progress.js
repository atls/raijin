import { MessageName } from '@yarnpkg/core';
import { formatUtils } from '@yarnpkg/core';
export class SpinnerProgress {
    constructor(stdout, configuration) {
        this.stdout = stdout;
        this.configuration = configuration;
        this.running = false;
        this.position = 0;
    }
    start() {
        if (this.stdout.isTTY) {
            this.running = true;
            this.write();
            this.tick();
        }
    }
    end() {
        if (this.stdout.isTTY && this.running) {
            this.running = false;
            this.clear(true);
        }
    }
    tick() {
        setTimeout(() => {
            if (this.running) {
                this.clear();
                this.write();
                this.position =
                    this.position === SpinnerProgress.PROGRESS_FRAMES.length - 1 ? 0 : this.position + 1;
                this.tick();
            }
        }, SpinnerProgress.PROGRESS_INTERVAL);
    }
    write() {
        const spinner = SpinnerProgress.PROGRESS_FRAMES[this.position];
        const name = formatUtils.pretty(this.configuration, `YN${MessageName.UNNAMED.toString(10).padStart(4, '0')}`, 'gray');
        this.stdout.write(`${formatUtils.pretty(this.configuration, '➤', 'blueBright')} ${name}: │ ${spinner}\n`);
    }
    clear(complete = false) {
        this.stdout.write(`\x1b[${0}A`);
        if (complete) {
            this.stdout.write('\x1b[0J');
        }
    }
}
SpinnerProgress.PROGRESS_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
SpinnerProgress.PROGRESS_INTERVAL = 90;
