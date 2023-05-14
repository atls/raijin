import { ppath } from '@yarnpkg/fslib';
import { xfs } from '@yarnpkg/fslib';
export class ProjectConfiguration {
    constructor(tunnel) {
        this.tunnel = tunnel;
    }
    static async findRcFile(cwd) {
        const rcPath = ppath.join(cwd, '.projectrc.json');
        if (xfs.existsSync(rcPath)) {
            const content = await xfs.readFilePromise(rcPath, 'utf8');
            try {
                return JSON.parse(content);
            }
            catch (error) {
                console.error(error);
            }
        }
        return {};
    }
    static async find(cwd) {
        const { tunnel } = await ProjectConfiguration.findRcFile(cwd);
        const configuration = new ProjectConfiguration(tunnel);
        return configuration;
    }
}
