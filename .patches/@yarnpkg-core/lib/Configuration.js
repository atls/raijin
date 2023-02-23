"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configuration = exports.ProjectLookup = exports.coreDefinitions = exports.WindowsLinkType = exports.FormatType = exports.SettingsType = exports.SECRET = exports.DEFAULT_LOCK_FILENAME = exports.DEFAULT_RC_FILENAME = exports.ENVIRONMENT_PREFIX = exports.TAG_REGEXP = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const libzip_1 = require("@yarnpkg/libzip");
const parsers_1 = require("@yarnpkg/parsers");
const camelcase_1 = tslib_1.__importDefault(require("camelcase"));
const ci_info_1 = require("ci-info");
const clipanion_1 = require("clipanion");
const p_limit_1 = tslib_1.__importDefault(require("p-limit"));
const stream_1 = require("stream");
const CorePlugin_1 = require("./CorePlugin");
const Manifest_1 = require("./Manifest");
const MultiFetcher_1 = require("./MultiFetcher");
const MultiResolver_1 = require("./MultiResolver");
const VirtualFetcher_1 = require("./VirtualFetcher");
const VirtualResolver_1 = require("./VirtualResolver");
const WorkspaceFetcher_1 = require("./WorkspaceFetcher");
const WorkspaceResolver_1 = require("./WorkspaceResolver");
const configUtils = tslib_1.__importStar(require("./configUtils"));
const folderUtils = tslib_1.__importStar(require("./folderUtils"));
const formatUtils = tslib_1.__importStar(require("./formatUtils"));
const hashUtils = tslib_1.__importStar(require("./hashUtils"));
const httpUtils = tslib_1.__importStar(require("./httpUtils"));
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
const nodeUtils = tslib_1.__importStar(require("./nodeUtils"));
const semverUtils = tslib_1.__importStar(require("./semverUtils"));
const structUtils = tslib_1.__importStar(require("./structUtils"));
const types_1 = require("./types");
const isPublicRepository = ci_info_1.GITHUB_ACTIONS && process.env.GITHUB_EVENT_PATH
    ? !((_b = (_a = fslib_1.xfs.readJsonSync(fslib_1.npath.toPortablePath(process.env.GITHUB_EVENT_PATH)).repository) === null || _a === void 0 ? void 0 : _a.private) !== null && _b !== void 0 ? _b : true)
    : false;
const IGNORED_ENV_VARIABLES = new Set([
    // Used by our test environment
    `isTestEnv`,
    `injectNpmUser`,
    `injectNpmPassword`,
    `injectNpm2FaToken`,
    // "binFolder" is the magic location where the parent process stored the
    // current binaries; not an actual configuration settings
    `binFolder`,
    // "version" is set by Docker:
    // https://github.com/nodejs/docker-node/blob/5a6a5e91999358c5b04fddd6c22a9a4eb0bf3fbf/10/alpine/Dockerfile#L51
    `version`,
    // "flags" is set by Netlify; they use it to specify the flags to send to the
    // CLI when running the automatic `yarn install`
    `flags`,
    // "gpg" and "profile" are used by the install.sh script:
    // https://classic.yarnpkg.com/install.sh
    `profile`,
    `gpg`,
    // "ignoreNode" is used to disable the Node version check
    `ignoreNode`,
    // "wrapOutput" was a variable used to indicate nested "yarn run" processes
    // back in Yarn 1.
    `wrapOutput`,
    // "YARN_HOME" and "YARN_CONF_DIR" may be present as part of the unrelated "Apache Hadoop YARN" software project.
    // https://hadoop.apache.org/docs/r0.23.11/hadoop-project-dist/hadoop-common/SingleCluster.html
    `home`,
    `confDir`,
]);
exports.TAG_REGEXP = /^(?!v)[a-z0-9._-]+$/i;
exports.ENVIRONMENT_PREFIX = `yarn_`;
exports.DEFAULT_RC_FILENAME = `.yarnrc.yml`;
exports.DEFAULT_LOCK_FILENAME = `yarn.lock`;
exports.SECRET = `********`;
var SettingsType;
(function (SettingsType) {
    SettingsType["ANY"] = "ANY";
    SettingsType["BOOLEAN"] = "BOOLEAN";
    SettingsType["ABSOLUTE_PATH"] = "ABSOLUTE_PATH";
    SettingsType["LOCATOR"] = "LOCATOR";
    SettingsType["LOCATOR_LOOSE"] = "LOCATOR_LOOSE";
    SettingsType["NUMBER"] = "NUMBER";
    SettingsType["STRING"] = "STRING";
    SettingsType["SECRET"] = "SECRET";
    SettingsType["SHAPE"] = "SHAPE";
    SettingsType["MAP"] = "MAP";
})(SettingsType = exports.SettingsType || (exports.SettingsType = {}));
/**
 * @deprecated Use {@link formatUtils.Type}
 */
exports.FormatType = formatUtils.Type;
var WindowsLinkType;
(function (WindowsLinkType) {
    WindowsLinkType["JUNCTIONS"] = "junctions";
    WindowsLinkType["SYMLINKS"] = "symlinks";
})(WindowsLinkType = exports.WindowsLinkType || (exports.WindowsLinkType = {}));
// General rules:
//
// - filenames that don't accept actual paths must end with the "Filename" suffix
//   prefer to use absolute paths instead, since they are automatically resolved
//   ex: lockfileFilename
//
// - folders must end with the "Folder" suffix
//   ex: cacheFolder, pnpVirtualFolder
//
// - actual paths to a file must end with the "Path" suffix
//   ex: pnpPath
//
// - options that tweaks the strictness must begin with the "allow" prefix
//   ex: allowInvalidChecksums
//
// - options that enable a feature must begin with the "enable" prefix
//   ex: enableEmojis, enableColors
exports.coreDefinitions = {
    // Not implemented for now, but since it's part of all Yarn installs we want to declare it in order to improve drop-in compatibility
    lastUpdateCheck: {
        description: `Last timestamp we checked whether new Yarn versions were available`,
        type: SettingsType.STRING,
        default: null,
    },
    // Settings related to proxying all Yarn calls to a specific executable
    yarnPath: {
        description: `Path to the local executable that must be used over the global one`,
        type: SettingsType.ABSOLUTE_PATH,
        default: null,
    },
    ignorePath: {
        description: `If true, the local executable will be ignored when using the global one`,
        type: SettingsType.BOOLEAN,
        default: false,
    },
    ignoreCwd: {
        description: `If true, the \`--cwd\` flag will be ignored`,
        type: SettingsType.BOOLEAN,
        default: false,
    },
    // Settings related to the package manager internal names
    cacheKeyOverride: {
        description: `A global cache key override; used only for test purposes`,
        type: SettingsType.STRING,
        default: null,
    },
    globalFolder: {
        description: `Folder where all system-global files are stored`,
        type: SettingsType.ABSOLUTE_PATH,
        default: folderUtils.getDefaultGlobalFolder(),
    },
    cacheFolder: {
        description: `Folder where the cache files must be written`,
        type: SettingsType.ABSOLUTE_PATH,
        default: `./.yarn/cache`,
    },
    compressionLevel: {
        description: `Zip files compression level, from 0 to 9 or mixed (a variant of 9, which stores some files uncompressed, when compression doesn't yield good results)`,
        type: SettingsType.NUMBER,
        values: [`mixed`, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        default: libzip_1.DEFAULT_COMPRESSION_LEVEL,
    },
    virtualFolder: {
        description: `Folder where the virtual packages (cf doc) will be mapped on the disk (must be named __virtual__)`,
        type: SettingsType.ABSOLUTE_PATH,
        default: `./.yarn/__virtual__`,
    },
    lockfileFilename: {
        description: `Name of the files where the Yarn dependency tree entries must be stored`,
        type: SettingsType.STRING,
        default: exports.DEFAULT_LOCK_FILENAME,
    },
    installStatePath: {
        description: `Path of the file where the install state will be persisted`,
        type: SettingsType.ABSOLUTE_PATH,
        default: `./.yarn/install-state.gz`,
    },
    immutablePatterns: {
        description: `Array of glob patterns; files matching them won't be allowed to change during immutable installs`,
        type: SettingsType.STRING,
        default: [],
        isArray: true,
    },
    rcFilename: {
        description: `Name of the files where the configuration can be found`,
        type: SettingsType.STRING,
        default: getRcFilename(),
    },
    enableGlobalCache: {
        description: `If true, the system-wide cache folder will be used regardless of \`cache-folder\``,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    // Settings related to the output style
    enableColors: {
        description: `If true, the CLI is allowed to use colors in its output`,
        type: SettingsType.BOOLEAN,
        default: formatUtils.supportsColor,
        defaultText: `<dynamic>`,
    },
    enableHyperlinks: {
        description: `If true, the CLI is allowed to use hyperlinks in its output`,
        type: SettingsType.BOOLEAN,
        default: formatUtils.supportsHyperlinks,
        defaultText: `<dynamic>`,
    },
    enableInlineBuilds: {
        description: `If true, the CLI will print the build output on the command line`,
        type: SettingsType.BOOLEAN,
        default: ci_info_1.isCI,
        defaultText: `<dynamic>`,
    },
    enableMessageNames: {
        description: `If true, the CLI will prefix most messages with codes suitable for search engines`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    enableProgressBars: {
        description: `If true, the CLI is allowed to show a progress bar for long-running events`,
        type: SettingsType.BOOLEAN,
        default: !ci_info_1.isCI,
        defaultText: `<dynamic>`,
    },
    enableTimers: {
        description: `If true, the CLI is allowed to print the time spent executing commands`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    preferAggregateCacheInfo: {
        description: `If true, the CLI will only print a one-line report of any cache changes`,
        type: SettingsType.BOOLEAN,
        default: ci_info_1.isCI,
    },
    preferInteractive: {
        description: `If true, the CLI will automatically use the interactive mode when called from a TTY`,
        type: SettingsType.BOOLEAN,
        default: false,
    },
    preferTruncatedLines: {
        description: `If true, the CLI will truncate lines that would go beyond the size of the terminal`,
        type: SettingsType.BOOLEAN,
        default: false,
    },
    progressBarStyle: {
        description: `Which style of progress bar should be used (only when progress bars are enabled)`,
        type: SettingsType.STRING,
        default: undefined,
        defaultText: `<dynamic>`,
    },
    // Settings related to how packages are interpreted by default
    defaultLanguageName: {
        description: `Default language mode that should be used when a package doesn't offer any insight`,
        type: SettingsType.STRING,
        default: `node`,
    },
    defaultProtocol: {
        description: `Default resolution protocol used when resolving pure semver and tag ranges`,
        type: SettingsType.STRING,
        default: `npm:`,
    },
    enableTransparentWorkspaces: {
        description: `If false, Yarn won't automatically resolve workspace dependencies unless they use the \`workspace:\` protocol`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    supportedArchitectures: {
        description: `Architectures that Yarn will fetch and inject into the resolver`,
        type: SettingsType.SHAPE,
        properties: {
            os: {
                description: `Array of supported process.platform strings, or null to target them all`,
                type: SettingsType.STRING,
                isArray: true,
                isNullable: true,
                default: [`current`],
            },
            cpu: {
                description: `Array of supported process.arch strings, or null to target them all`,
                type: SettingsType.STRING,
                isArray: true,
                isNullable: true,
                default: [`current`],
            },
            libc: {
                description: `Array of supported libc libraries, or null to target them all`,
                type: SettingsType.STRING,
                isArray: true,
                isNullable: true,
                default: [`current`],
            },
        },
    },
    // Settings related to network access
    enableMirror: {
        description: `If true, the downloaded packages will be retrieved and stored in both the local and global folders`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    enableNetwork: {
        description: `If false, the package manager will refuse to use the network if required to`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    httpProxy: {
        description: `URL of the http proxy that must be used for outgoing http requests`,
        type: SettingsType.STRING,
        default: null,
    },
    httpsProxy: {
        description: `URL of the http proxy that must be used for outgoing https requests`,
        type: SettingsType.STRING,
        default: null,
    },
    unsafeHttpWhitelist: {
        description: `List of the hostnames for which http queries are allowed (glob patterns are supported)`,
        type: SettingsType.STRING,
        default: [],
        isArray: true,
    },
    httpTimeout: {
        description: `Timeout of each http request in milliseconds`,
        type: SettingsType.NUMBER,
        default: 60000,
    },
    httpRetry: {
        description: `Retry times on http failure`,
        type: SettingsType.NUMBER,
        default: 3,
    },
    networkConcurrency: {
        description: `Maximal number of concurrent requests`,
        type: SettingsType.NUMBER,
        default: 50,
    },
    networkSettings: {
        description: `Network settings per hostname (glob patterns are supported)`,
        type: SettingsType.MAP,
        valueDefinition: {
            description: ``,
            type: SettingsType.SHAPE,
            properties: {
                httpsCaFilePath: {
                    description: `Path to file containing one or multiple Certificate Authority signing certificates`,
                    type: SettingsType.ABSOLUTE_PATH,
                    default: null,
                },
                enableNetwork: {
                    description: `If false, the package manager will refuse to use the network if required to`,
                    type: SettingsType.BOOLEAN,
                    default: null,
                },
                httpProxy: {
                    description: `URL of the http proxy that must be used for outgoing http requests`,
                    type: SettingsType.STRING,
                    default: null,
                },
                httpsProxy: {
                    description: `URL of the http proxy that must be used for outgoing https requests`,
                    type: SettingsType.STRING,
                    default: null,
                },
                httpsKeyFilePath: {
                    description: `Path to file containing private key in PEM format`,
                    type: SettingsType.ABSOLUTE_PATH,
                    default: null,
                },
                httpsCertFilePath: {
                    description: `Path to file containing certificate chain in PEM format`,
                    type: SettingsType.ABSOLUTE_PATH,
                    default: null,
                },
            },
        },
    },
    httpsCaFilePath: {
        description: `A path to a file containing one or multiple Certificate Authority signing certificates`,
        type: SettingsType.ABSOLUTE_PATH,
        default: null,
    },
    httpsKeyFilePath: {
        description: `Path to file containing private key in PEM format`,
        type: SettingsType.ABSOLUTE_PATH,
        default: null,
    },
    httpsCertFilePath: {
        description: `Path to file containing certificate chain in PEM format`,
        type: SettingsType.ABSOLUTE_PATH,
        default: null,
    },
    enableStrictSsl: {
        description: `If false, SSL certificate errors will be ignored`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    logFilters: {
        description: `Overrides for log levels`,
        type: SettingsType.SHAPE,
        isArray: true,
        concatenateValues: true,
        properties: {
            code: {
                description: `Code of the messages covered by this override`,
                type: SettingsType.STRING,
                default: undefined,
            },
            text: {
                description: `Code of the texts covered by this override`,
                type: SettingsType.STRING,
                default: undefined,
            },
            pattern: {
                description: `Code of the patterns covered by this override`,
                type: SettingsType.STRING,
                default: undefined,
            },
            level: {
                description: `Log level override, set to null to remove override`,
                type: SettingsType.STRING,
                values: Object.values(formatUtils.LogLevel),
                isNullable: true,
                default: undefined,
            },
        },
    },
    // Settings related to telemetry
    enableTelemetry: {
        description: `If true, telemetry will be periodically sent, following the rules in https://yarnpkg.com/advanced/telemetry`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    telemetryInterval: {
        description: `Minimal amount of time between two telemetry uploads, in days`,
        type: SettingsType.NUMBER,
        default: 7,
    },
    telemetryUserId: {
        description: `If you desire to tell us which project you are, you can set this field. Completely optional and opt-in.`,
        type: SettingsType.STRING,
        default: null,
    },
    // Settings related to security
    enableHardenedMode: {
        description: `If true, automatically enable --check-resolutions --refresh-lockfile on installs`,
        type: SettingsType.BOOLEAN,
        default: ci_info_1.isPR && isPublicRepository,
        defaultText: `<true on public PRs>`,
    },
    enableScripts: {
        description: `If true, packages are allowed to have install scripts by default`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    enableStrictSettings: {
        description: `If true, unknown settings will cause Yarn to abort`,
        type: SettingsType.BOOLEAN,
        default: true,
    },
    enableImmutableCache: {
        description: `If true, the cache is reputed immutable and actions that would modify it will throw`,
        type: SettingsType.BOOLEAN,
        default: false,
    },
    checksumBehavior: {
        description: `Enumeration defining what to do when a checksum doesn't match expectations`,
        type: SettingsType.STRING,
        default: `throw`,
    },
    // Package patching - to fix incorrect definitions
    packageExtensions: {
        description: `Map of package corrections to apply on the dependency tree`,
        type: SettingsType.MAP,
        valueDefinition: {
            description: `The extension that will be applied to any package whose version matches the specified range`,
            type: SettingsType.SHAPE,
            properties: {
                dependencies: {
                    description: `The set of dependencies that must be made available to the current package in order for it to work properly`,
                    type: SettingsType.MAP,
                    valueDefinition: {
                        description: `A range`,
                        type: SettingsType.STRING,
                    },
                },
                peerDependencies: {
                    description: `Inherited dependencies - the consumer of the package will be tasked to provide them`,
                    type: SettingsType.MAP,
                    valueDefinition: {
                        description: `A semver range`,
                        type: SettingsType.STRING,
                    },
                },
                peerDependenciesMeta: {
                    description: `Extra information related to the dependencies listed in the peerDependencies field`,
                    type: SettingsType.MAP,
                    valueDefinition: {
                        description: `The peerDependency meta`,
                        type: SettingsType.SHAPE,
                        properties: {
                            optional: {
                                description: `If true, the selected peer dependency will be marked as optional by the package manager and the consumer omitting it won't be reported as an error`,
                                type: SettingsType.BOOLEAN,
                                default: false,
                            },
                        },
                    },
                },
            },
        },
    },
};
// There are two types of values
// 1. ResolvedRcFile from `configUtils.resolveRcFiles`
// 2. objects passed directly via `configuration.useWithSource` or `configuration.use`
function parseValue(configuration, path, valueBase, definition, folder) {
    const value = configUtils.getValue(valueBase);
    if (definition.isArray || (definition.type === SettingsType.ANY && Array.isArray(value))) {
        if (!Array.isArray(value)) {
            return String(value).split(/,/).map(segment => {
                return parseSingleValue(configuration, path, segment, definition, folder);
            });
        }
        else {
            return value.map((sub, i) => parseSingleValue(configuration, `${path}[${i}]`, sub, definition, folder));
        }
    }
    else {
        if (Array.isArray(value)) {
            throw new Error(`Non-array configuration settings "${path}" cannot be an array`);
        }
        else {
            return parseSingleValue(configuration, path, valueBase, definition, folder);
        }
    }
}
function parseSingleValue(configuration, path, valueBase, definition, folder) {
    var _a;
    const value = configUtils.getValue(valueBase);
    switch (definition.type) {
        case SettingsType.ANY:
            return configUtils.getValueByTree(value);
        case SettingsType.SHAPE:
            return parseShape(configuration, path, valueBase, definition, folder);
        case SettingsType.MAP:
            return parseMap(configuration, path, valueBase, definition, folder);
    }
    if (value === null && !definition.isNullable && definition.default !== null)
        throw new Error(`Non-nullable configuration settings "${path}" cannot be set to null`);
    if ((_a = definition.values) === null || _a === void 0 ? void 0 : _a.includes(value))
        return value;
    const interpretValue = () => {
        if (definition.type === SettingsType.BOOLEAN && typeof value !== `string`)
            return miscUtils.parseBoolean(value);
        if (typeof value !== `string`)
            throw new Error(`Expected value (${value}) to be a string`);
        const valueWithReplacedVariables = miscUtils.replaceEnvVariables(value, {
            env: process.env,
        });
        switch (definition.type) {
            case SettingsType.ABSOLUTE_PATH: {
                let cwd = folder;
                // singleValue's source should be a single file path, if it exists
                const source = configUtils.getSource(valueBase);
                if (source)
                    cwd = fslib_1.ppath.resolve(source, `..`);
                return fslib_1.ppath.resolve(cwd, fslib_1.npath.toPortablePath(valueWithReplacedVariables));
            }
            case SettingsType.LOCATOR_LOOSE:
                return structUtils.parseLocator(valueWithReplacedVariables, false);
            case SettingsType.NUMBER:
                return parseInt(valueWithReplacedVariables);
            case SettingsType.LOCATOR:
                return structUtils.parseLocator(valueWithReplacedVariables);
            case SettingsType.BOOLEAN:
                return miscUtils.parseBoolean(valueWithReplacedVariables);
            default:
                return valueWithReplacedVariables;
        }
    };
    const interpreted = interpretValue();
    if (definition.values && !definition.values.includes(interpreted))
        throw new Error(`Invalid value, expected one of ${definition.values.join(`, `)}`);
    return interpreted;
}
function parseShape(configuration, path, valueBase, definition, folder) {
    const value = configUtils.getValue(valueBase);
    if (typeof value !== `object` || Array.isArray(value))
        throw new clipanion_1.UsageError(`Object configuration settings "${path}" must be an object`);
    const result = getDefaultValue(configuration, definition, {
        ignoreArrays: true,
    });
    if (value === null)
        return result;
    for (const [propKey, propValue] of Object.entries(value)) {
        const subPath = `${path}.${propKey}`;
        const subDefinition = definition.properties[propKey];
        if (!subDefinition)
            throw new clipanion_1.UsageError(`Unrecognized configuration settings found: ${path}.${propKey} - run "yarn config -v" to see the list of settings supported in Yarn`);
        result.set(propKey, parseValue(configuration, subPath, propValue, definition.properties[propKey], folder));
    }
    return result;
}
function parseMap(configuration, path, valueBase, definition, folder) {
    const value = configUtils.getValue(valueBase);
    const result = new Map();
    if (typeof value !== `object` || Array.isArray(value))
        throw new clipanion_1.UsageError(`Map configuration settings "${path}" must be an object`);
    if (value === null)
        return result;
    for (const [propKey, propValue] of Object.entries(value)) {
        const normalizedKey = definition.normalizeKeys ? definition.normalizeKeys(propKey) : propKey;
        const subPath = `${path}['${normalizedKey}']`;
        // @ts-expect-error: SettingsDefinitionNoDefault has ... no default ... but
        // that's fine because we're guaranteed it's not undefined.
        const valueDefinition = definition.valueDefinition;
        result.set(normalizedKey, parseValue(configuration, subPath, propValue, valueDefinition, folder));
    }
    return result;
}
function getDefaultValue(configuration, definition, { ignoreArrays = false } = {}) {
    switch (definition.type) {
        case SettingsType.SHAPE:
            {
                if (definition.isArray && !ignoreArrays)
                    return [];
                const result = new Map();
                for (const [propKey, propDefinition] of Object.entries(definition.properties))
                    result.set(propKey, getDefaultValue(configuration, propDefinition));
                return result;
            }
            break;
        case SettingsType.MAP:
            {
                if (definition.isArray && !ignoreArrays)
                    return [];
                return new Map();
            }
            break;
        case SettingsType.ABSOLUTE_PATH:
            {
                if (definition.default === null)
                    return null;
                if (configuration.projectCwd === null) {
                    if (fslib_1.ppath.isAbsolute(definition.default)) {
                        return fslib_1.ppath.normalize(definition.default);
                    }
                    else if (definition.isNullable) {
                        return null;
                    }
                    else {
                        // Reached when a relative path is the default but the current
                        // context is evaluated outside of a Yarn project
                        return undefined;
                    }
                }
                else {
                    if (Array.isArray(definition.default)) {
                        return definition.default.map((entry) => fslib_1.ppath.resolve(configuration.projectCwd, entry));
                    }
                    else {
                        return fslib_1.ppath.resolve(configuration.projectCwd, definition.default);
                    }
                }
            }
            break;
        default:
            {
                return definition.default;
            }
            break;
    }
}
function transformConfiguration(rawValue, definition, transforms) {
    if (definition.type === SettingsType.SECRET && typeof rawValue === `string` && transforms.hideSecrets)
        return exports.SECRET;
    if (definition.type === SettingsType.ABSOLUTE_PATH && typeof rawValue === `string` && transforms.getNativePaths)
        return fslib_1.npath.fromPortablePath(rawValue);
    if (definition.isArray && Array.isArray(rawValue)) {
        const newValue = [];
        for (const value of rawValue)
            newValue.push(transformConfiguration(value, definition, transforms));
        return newValue;
    }
    if (definition.type === SettingsType.MAP && rawValue instanceof Map) {
        const newValue = new Map();
        for (const [key, value] of rawValue.entries())
            newValue.set(key, transformConfiguration(value, definition.valueDefinition, transforms));
        return newValue;
    }
    if (definition.type === SettingsType.SHAPE && rawValue instanceof Map) {
        const newValue = new Map();
        for (const [key, value] of rawValue.entries()) {
            const propertyDefinition = definition.properties[key];
            newValue.set(key, transformConfiguration(value, propertyDefinition, transforms));
        }
        return newValue;
    }
    return rawValue;
}
function getEnvironmentSettings() {
    const environmentSettings = {};
    for (let [key, value] of Object.entries(process.env)) {
        key = key.toLowerCase();
        if (!key.startsWith(exports.ENVIRONMENT_PREFIX))
            continue;
        key = (0, camelcase_1.default)(key.slice(exports.ENVIRONMENT_PREFIX.length));
        environmentSettings[key] = value;
    }
    return environmentSettings;
}
function getRcFilename() {
    const rcKey = `${exports.ENVIRONMENT_PREFIX}rc_filename`;
    for (const [key, value] of Object.entries(process.env))
        if (key.toLowerCase() === rcKey && typeof value === `string`)
            return value;
    return exports.DEFAULT_RC_FILENAME;
}
var ProjectLookup;
(function (ProjectLookup) {
    ProjectLookup[ProjectLookup["LOCKFILE"] = 0] = "LOCKFILE";
    ProjectLookup[ProjectLookup["MANIFEST"] = 1] = "MANIFEST";
    ProjectLookup[ProjectLookup["NONE"] = 2] = "NONE";
})(ProjectLookup = exports.ProjectLookup || (exports.ProjectLookup = {}));
class Configuration {
    static create(startingCwd, projectCwdOrPlugins, maybePlugins) {
        const configuration = new Configuration(startingCwd);
        if (typeof projectCwdOrPlugins !== `undefined` && !(projectCwdOrPlugins instanceof Map))
            configuration.projectCwd = projectCwdOrPlugins;
        configuration.importSettings(exports.coreDefinitions);
        const plugins = typeof maybePlugins !== `undefined`
            ? maybePlugins
            : projectCwdOrPlugins instanceof Map
                ? projectCwdOrPlugins
                : new Map();
        for (const [name, plugin] of plugins)
            configuration.activatePlugin(name, plugin);
        return configuration;
    }
    /**
     * Instantiate a new configuration object exposing the configuration obtained
     * from reading the various rc files and the environment settings.
     *
     * The `pluginConfiguration` parameter is expected to indicate:
     *
     * 1. which modules should be made available to plugins when they require a
     *    package (this is the dynamic linking part - for example we want all the
     *    plugins to use the exact same version of @yarnpkg/core, which also is the
     *    version used by the running Yarn instance).
     *
     * 2. which of those modules are actually plugins that need to be injected
     *    within the configuration.
     *
     * Note that some extra plugins will be automatically added based on the
     * content of the rc files - with the rc plugins taking precedence over
     * the other ones.
     *
     * One particularity: the plugin initialization order is quite strict, with
     * plugins listed in /foo/bar/.yarnrc.yml taking precedence over plugins
     * listed in /foo/.yarnrc.yml and /.yarnrc.yml. Additionally, while plugins
     * can depend on one another, they can only depend on plugins that have been
     * instantiated before them (so a plugin listed in /foo/.yarnrc.yml can
     * depend on another one listed on /foo/bar/.yarnrc.yml, but not the other
     * way around).
     */
    static async find(startingCwd, pluginConfiguration, { lookup = ProjectLookup.LOCKFILE, strict = true, usePath = false, useRc = true } = {}) {
        var _a, _b;
        const environmentSettings = getEnvironmentSettings();
        delete environmentSettings.rcFilename;
        const rcFiles = await Configuration.findRcFiles(startingCwd);
        const homeRcFile = await Configuration.findHomeRcFile();
        if (homeRcFile) {
            const rcFile = rcFiles.find(rcFile => rcFile.path === homeRcFile.path);
            if (!rcFile) {
                rcFiles.unshift(homeRcFile);
            }
        }
        const resolvedRcFile = configUtils.resolveRcFiles(rcFiles.map(rcFile => [rcFile.path, rcFile.data]));
        // XXX: in fact, it is not useful, but in order not to change the parameters of useWithSource, temporarily put a thing to prevent errors.
        const resolvedRcFileCwd = `.`;
        const allCoreFieldKeys = new Set(Object.keys(exports.coreDefinitions));
        const pickPrimaryCoreFields = ({ ignoreCwd, yarnPath, ignorePath, lockfileFilename }) => ({ ignoreCwd, yarnPath, ignorePath, lockfileFilename });
        const pickSecondaryCoreFields = ({ ignoreCwd, yarnPath, ignorePath, lockfileFilename, ...rest }) => {
            const secondaryCoreFields = {};
            for (const [key, value] of Object.entries(rest))
                if (allCoreFieldKeys.has(key))
                    secondaryCoreFields[key] = value;
            return secondaryCoreFields;
        };
        const pickPluginFields = ({ ignoreCwd, yarnPath, ignorePath, lockfileFilename, ...rest }) => {
            const pluginFields = {};
            for (const [key, value] of Object.entries(rest))
                if (!allCoreFieldKeys.has(key))
                    pluginFields[key] = value;
            return pluginFields;
        };
        const configuration = new Configuration(startingCwd);
        configuration.importSettings(pickPrimaryCoreFields(exports.coreDefinitions));
        configuration.useWithSource(`<environment>`, pickPrimaryCoreFields(environmentSettings), startingCwd, { strict: false });
        if (resolvedRcFile) {
            const [source, data] = resolvedRcFile;
            configuration.useWithSource(source, pickPrimaryCoreFields(data), resolvedRcFileCwd, { strict: false });
        }
        if (usePath) {
            const yarnPath = configuration.get(`yarnPath`);
            const ignorePath = configuration.get(`ignorePath`);
            if (yarnPath !== null && !ignorePath) {
                return configuration;
            }
        }
        // We need to know the project root before being able to truly instantiate
        // our configuration, and to know that we need to know the lockfile name
        const lockfileFilename = configuration.get(`lockfileFilename`);
        let projectCwd;
        switch (lookup) {
            case ProjectLookup.LOCKFILE:
                {
                    projectCwd = await Configuration.findProjectCwd(startingCwd, lockfileFilename);
                }
                break;
            case ProjectLookup.MANIFEST:
                {
                    projectCwd = await Configuration.findProjectCwd(startingCwd, null);
                }
                break;
            case ProjectLookup.NONE:
                {
                    if (fslib_1.xfs.existsSync(fslib_1.ppath.join(startingCwd, `package.json`))) {
                        projectCwd = fslib_1.ppath.resolve(startingCwd);
                    }
                    else {
                        projectCwd = null;
                    }
                }
                break;
        }
        // Great! We now have enough information to really start to setup the
        // core configuration object.
        configuration.startingCwd = startingCwd;
        configuration.projectCwd = projectCwd;
        // load all fields of the core definitions
        configuration.importSettings(pickSecondaryCoreFields(exports.coreDefinitions));
        configuration.useWithSource(`<environment>`, pickSecondaryCoreFields(environmentSettings), startingCwd, { strict });
        if (resolvedRcFile) {
            const [source, data] = resolvedRcFile;
            configuration.useWithSource(source, pickSecondaryCoreFields(data), resolvedRcFileCwd, { strict });
        }
        // Now that the configuration object is almost ready, we need to load all
        // the configured plugins
        const getDefault = (object) => {
            return `default` in object ? object.default : object;
        };
        // load the core plugins
        const corePlugins = new Map([
            [`@@core`, CorePlugin_1.CorePlugin],
        ]);
        if (pluginConfiguration !== null)
            for (const request of pluginConfiguration.plugins.keys())
                corePlugins.set(request, getDefault(pluginConfiguration.modules.get(request)));
        for (const [name, corePlugin] of corePlugins)
            configuration.activatePlugin(name, corePlugin);
        // load third-party plugins
        const thirdPartyPlugins = new Map([]);
        if (pluginConfiguration !== null) {
            const requireEntries = new Map();
            for (const request of nodeUtils.builtinModules())
                requireEntries.set(request, () => miscUtils.dynamicRequire(request));
            for (const [request, embedModule] of pluginConfiguration.modules)
                requireEntries.set(request, () => embedModule);
            const dynamicPlugins = new Set();
            const importPlugin = async (pluginPath, source) => {
                const { factory, name } = miscUtils.dynamicRequire(pluginPath);
                if (!factory)
                    return;
                // Prevent plugin redefinition so that the ones declared deeper in the
                // filesystem always have precedence over the ones below.
                if (dynamicPlugins.has(name))
                    return;
                const pluginRequireEntries = new Map(requireEntries);
                const pluginRequire = (request) => {
                    if (pluginRequireEntries.has(request)) {
                        return pluginRequireEntries.get(request)();
                    }
                    else {
                        throw new clipanion_1.UsageError(`This plugin cannot access the package referenced via ${request} which is neither a builtin, nor an exposed entry`);
                    }
                };
                const plugin = await miscUtils.prettifyAsyncErrors(async () => {
                    return getDefault(await factory(pluginRequire));
                }, message => {
                    return `${message} (when initializing ${name}, defined in ${source})`;
                });
                requireEntries.set(name, () => plugin);
                dynamicPlugins.add(name);
                thirdPartyPlugins.set(name, plugin);
            };
            if (environmentSettings.plugins) {
                for (const userProvidedPath of environmentSettings.plugins.split(`;`)) {
                    const pluginPath = fslib_1.ppath.resolve(startingCwd, fslib_1.npath.toPortablePath(userProvidedPath));
                    await importPlugin(pluginPath, `<environment>`);
                }
            }
            for (const { path, cwd, data } of rcFiles) {
                if (!useRc)
                    continue;
                if (!Array.isArray(data.plugins))
                    continue;
                for (const userPluginEntry of data.plugins) {
                    const userProvidedPath = typeof userPluginEntry !== `string`
                        ? userPluginEntry.path
                        : userPluginEntry;
                    const userProvidedSpec = (_a = userPluginEntry === null || userPluginEntry === void 0 ? void 0 : userPluginEntry.spec) !== null && _a !== void 0 ? _a : ``;
                    const userProvidedChecksum = (_b = userPluginEntry === null || userPluginEntry === void 0 ? void 0 : userPluginEntry.checksum) !== null && _b !== void 0 ? _b : ``;
                    const pluginPath = fslib_1.ppath.resolve(cwd, fslib_1.npath.toPortablePath(userProvidedPath));
                    if (!await fslib_1.xfs.existsPromise(pluginPath)) {
                        if (!userProvidedSpec) {
                            const prettyPluginName = formatUtils.pretty(configuration, fslib_1.ppath.basename(pluginPath, `.cjs`), formatUtils.Type.NAME);
                            const prettyGitIgnore = formatUtils.pretty(configuration, `.gitignore`, formatUtils.Type.NAME);
                            const prettyYarnrc = formatUtils.pretty(configuration, configuration.values.get(`rcFilename`), formatUtils.Type.NAME);
                            const prettyUrl = formatUtils.pretty(configuration, `https://yarnpkg.com/getting-started/qa#which-files-should-be-gitignored`, formatUtils.Type.URL);
                            throw new clipanion_1.UsageError(`Missing source for the ${prettyPluginName} plugin - please try to remove the plugin from ${prettyYarnrc} then reinstall it manually. This error usually occurs because ${prettyGitIgnore} is incorrect, check ${prettyUrl} to make sure your plugin folder isn't gitignored.`);
                        }
                        if (!userProvidedSpec.match(/^https?:/)) {
                            const prettyPluginName = formatUtils.pretty(configuration, fslib_1.ppath.basename(pluginPath, `.cjs`), formatUtils.Type.NAME);
                            const prettyYarnrc = formatUtils.pretty(configuration, configuration.values.get(`rcFilename`), formatUtils.Type.NAME);
                            throw new clipanion_1.UsageError(`Failed to recognize the source for the ${prettyPluginName} plugin - please try to delete the plugin from ${prettyYarnrc} then reinstall it manually.`);
                        }
                        const pluginBuffer = await httpUtils.get(userProvidedSpec, { configuration });
                        const pluginChecksum = hashUtils.makeHash(pluginBuffer);
                        // if there is no checksum, this means that the user used --no-checksum and does not need to check this plugin
                        if (userProvidedChecksum && userProvidedChecksum !== pluginChecksum) {
                            const prettyPluginName = formatUtils.pretty(configuration, fslib_1.ppath.basename(pluginPath, `.cjs`), formatUtils.Type.NAME);
                            const prettyYarnrc = formatUtils.pretty(configuration, configuration.values.get(`rcFilename`), formatUtils.Type.NAME);
                            const prettyPluginImportCommand = formatUtils.pretty(configuration, `yarn plugin import ${userProvidedSpec}`, formatUtils.Type.CODE);
                            throw new clipanion_1.UsageError(`Failed to fetch the ${prettyPluginName} plugin from its remote location: its checksum seems to have changed. If this is expected, please remove the plugin from ${prettyYarnrc} then run ${prettyPluginImportCommand} to reimport it.`);
                        }
                        await fslib_1.xfs.mkdirPromise(fslib_1.ppath.dirname(pluginPath), { recursive: true });
                        await fslib_1.xfs.writeFilePromise(pluginPath, pluginBuffer);
                    }
                    await importPlugin(pluginPath, path);
                }
            }
        }
        for (const [name, thirdPartyPlugin] of thirdPartyPlugins)
            configuration.activatePlugin(name, thirdPartyPlugin);
        // load values of all plugin definitions
        configuration.useWithSource(`<environment>`, pickPluginFields(environmentSettings), startingCwd, { strict });
        if (resolvedRcFile) {
            const [source, data] = resolvedRcFile;
            configuration.useWithSource(source, pickPluginFields(data), resolvedRcFileCwd, { strict });
        }
        if (configuration.get(`enableGlobalCache`)) {
            configuration.values.set(`cacheFolder`, `${configuration.get(`globalFolder`)}/cache`);
            configuration.sources.set(`cacheFolder`, `<internal>`);
        }
        await configuration.refreshPackageExtensions();
        return configuration;
    }
    static async findRcFiles(startingCwd) {
        const rcFilename = getRcFilename();
        const rcFiles = [];
        let nextCwd = startingCwd;
        let currentCwd = null;
        while (nextCwd !== currentCwd) {
            currentCwd = nextCwd;
            const rcPath = fslib_1.ppath.join(currentCwd, rcFilename);
            if (fslib_1.xfs.existsSync(rcPath)) {
                const content = await fslib_1.xfs.readFilePromise(rcPath, `utf8`);
                let data;
                try {
                    data = (0, parsers_1.parseSyml)(content);
                }
                catch (error) {
                    let tip = ``;
                    if (content.match(/^\s+(?!-)[^:]+\s+\S+/m))
                        tip = ` (in particular, make sure you list the colons after each key name)`;
                    throw new clipanion_1.UsageError(`Parse error when loading ${rcPath}; please check it's proper Yaml${tip}`);
                }
                rcFiles.unshift({ path: rcPath, cwd: currentCwd, data });
            }
            nextCwd = fslib_1.ppath.dirname(currentCwd);
        }
        return rcFiles;
    }
    static async findHomeRcFile() {
        const rcFilename = getRcFilename();
        const homeFolder = folderUtils.getHomeFolder();
        const homeRcFilePath = fslib_1.ppath.join(homeFolder, rcFilename);
        if (fslib_1.xfs.existsSync(homeRcFilePath)) {
            const content = await fslib_1.xfs.readFilePromise(homeRcFilePath, `utf8`);
            const data = (0, parsers_1.parseSyml)(content);
            return { path: homeRcFilePath, cwd: homeFolder, data };
        }
        return null;
    }
    static async findProjectCwd(startingCwd, lockfileFilename) {
        let projectCwd = null;
        let nextCwd = startingCwd;
        let currentCwd = null;
        while (nextCwd !== currentCwd) {
            currentCwd = nextCwd;
            if (fslib_1.xfs.existsSync(fslib_1.ppath.join(currentCwd, `package.json`)))
                projectCwd = currentCwd;
            if (lockfileFilename !== null) {
                if (fslib_1.xfs.existsSync(fslib_1.ppath.join(currentCwd, lockfileFilename))) {
                    projectCwd = currentCwd;
                    break;
                }
            }
            else {
                if (projectCwd !== null) {
                    break;
                }
            }
            nextCwd = fslib_1.ppath.dirname(currentCwd);
        }
        return projectCwd;
    }
    static async updateConfiguration(cwd, patch) {
        const rcFilename = getRcFilename();
        const configurationPath = fslib_1.ppath.join(cwd, rcFilename);
        const current = fslib_1.xfs.existsSync(configurationPath)
            ? (0, parsers_1.parseSyml)(await fslib_1.xfs.readFilePromise(configurationPath, `utf8`))
            : {};
        let patched = false;
        let replacement;
        if (typeof patch === `function`) {
            try {
                replacement = patch(current);
            }
            catch {
                replacement = patch({});
            }
            if (replacement === current) {
                return;
            }
        }
        else {
            replacement = current;
            for (const key of Object.keys(patch)) {
                const currentValue = current[key];
                const patchField = patch[key];
                let nextValue;
                if (typeof patchField === `function`) {
                    try {
                        nextValue = patchField(currentValue);
                    }
                    catch {
                        nextValue = patchField(undefined);
                    }
                }
                else {
                    nextValue = patchField;
                }
                if (currentValue === nextValue)
                    continue;
                if (nextValue === Configuration.deleteProperty)
                    delete replacement[key];
                else
                    replacement[key] = nextValue;
                patched = true;
            }
            if (!patched) {
                return;
            }
        }
        await fslib_1.xfs.changeFilePromise(configurationPath, (0, parsers_1.stringifySyml)(replacement), {
            automaticNewlines: true,
        });
    }
    static async addPlugin(cwd, pluginMetaList) {
        if (pluginMetaList.length === 0)
            return;
        await Configuration.updateConfiguration(cwd, (current) => {
            var _a;
            const currentPluginMetaList = (_a = current.plugins) !== null && _a !== void 0 ? _a : [];
            if (currentPluginMetaList.length === 0)
                return { ...current, plugins: pluginMetaList };
            const newPluginMetaList = [];
            let notYetProcessedList = [...pluginMetaList];
            for (const currentPluginMeta of currentPluginMetaList) {
                const currentPluginPath = typeof currentPluginMeta !== `string`
                    ? currentPluginMeta.path
                    : currentPluginMeta;
                const updatingPlugin = notYetProcessedList.find(pluginMeta => {
                    return pluginMeta.path === currentPluginPath;
                });
                if (updatingPlugin) {
                    newPluginMetaList.push(updatingPlugin);
                    notYetProcessedList = notYetProcessedList.filter(p => p !== updatingPlugin);
                }
                else {
                    newPluginMetaList.push(currentPluginMeta);
                }
            }
            newPluginMetaList.push(...notYetProcessedList);
            return { ...current, plugins: newPluginMetaList };
        });
    }
    static async updateHomeConfiguration(patch) {
        const homeFolder = folderUtils.getHomeFolder();
        return await Configuration.updateConfiguration(homeFolder, patch);
    }
    constructor(startingCwd) {
        this.projectCwd = null;
        this.plugins = new Map();
        this.settings = new Map();
        this.values = new Map();
        this.sources = new Map();
        this.invalid = new Map();
        this.packageExtensions = new Map();
        this.limits = new Map();
        this.startingCwd = startingCwd;
    }
    activatePlugin(name, plugin) {
        this.plugins.set(name, plugin);
        if (typeof plugin.configuration !== `undefined`) {
            this.importSettings(plugin.configuration);
        }
    }
    importSettings(definitions) {
        for (const [name, definition] of Object.entries(definitions)) {
            if (definition == null)
                continue;
            if (this.settings.has(name))
                throw new Error(`Cannot redefine settings "${name}"`);
            this.settings.set(name, definition);
            this.values.set(name, getDefaultValue(this, definition));
        }
    }
    useWithSource(source, data, folder, opts) {
        try {
            this.use(source, data, folder, opts);
        }
        catch (error) {
            error.message += ` (in ${formatUtils.pretty(this, source, formatUtils.Type.PATH)})`;
            throw error;
        }
    }
    use(source, data, folder, { strict = true, overwrite = false } = {}) {
        strict = strict && this.get(`enableStrictSettings`);
        for (const key of [`enableStrictSettings`, ...Object.keys(data)]) {
            const value = data[key];
            const fieldSource = configUtils.getSource(value);
            if (fieldSource)
                source = fieldSource;
            if (typeof value === `undefined`)
                continue;
            // The plugins have already been loaded at this point
            if (key === `plugins`)
                continue;
            // Some environment variables should be ignored when applying the configuration
            if (source === `<environment>` && IGNORED_ENV_VARIABLES.has(key))
                continue;
            // It wouldn't make much sense, would it?
            if (key === `rcFilename`)
                throw new clipanion_1.UsageError(`The rcFilename settings can only be set via ${`${exports.ENVIRONMENT_PREFIX}RC_FILENAME`.toUpperCase()}, not via a rc file`);
            const definition = this.settings.get(key);
            if (!definition) {
                const homeFolder = folderUtils.getHomeFolder();
                const rcFileFolder = fslib_1.ppath.resolve(source, `..`);
                const isHomeRcFile = homeFolder === rcFileFolder;
                if (strict && !isHomeRcFile) {
                    throw new clipanion_1.UsageError(`Unrecognized or legacy configuration settings found: ${key} - run "yarn config -v" to see the list of settings supported in Yarn`);
                }
                else {
                    this.invalid.set(key, source);
                    continue;
                }
            }
            if (this.sources.has(key) && !(overwrite || definition.type === SettingsType.MAP || definition.isArray && definition.concatenateValues))
                continue;
            let parsed;
            try {
                parsed = parseValue(this, key, value, definition, folder);
            }
            catch (error) {
                error.message += ` in ${formatUtils.pretty(this, source, formatUtils.Type.PATH)}`;
                throw error;
            }
            if (key === `enableStrictSettings` && source !== `<environment>`) {
                strict = parsed;
                continue;
            }
            if (definition.type === SettingsType.MAP) {
                const previousValue = this.values.get(key);
                this.values.set(key, new Map(overwrite
                    ? [...previousValue, ...parsed]
                    : [...parsed, ...previousValue]));
                this.sources.set(key, `${this.sources.get(key)}, ${source}`);
            }
            else if (definition.isArray && definition.concatenateValues) {
                const previousValue = this.values.get(key);
                this.values.set(key, overwrite
                    ? [...previousValue, ...parsed]
                    : [...parsed, ...previousValue]);
                this.sources.set(key, `${this.sources.get(key)}, ${source}`);
            }
            else {
                this.values.set(key, parsed);
                this.sources.set(key, source);
            }
        }
    }
    get(key) {
        if (!this.values.has(key))
            throw new Error(`Invalid configuration key "${key}"`);
        return this.values.get(key);
    }
    getSpecial(key, { hideSecrets = false, getNativePaths = false }) {
        const rawValue = this.get(key);
        const definition = this.settings.get(key);
        if (typeof definition === `undefined`)
            throw new clipanion_1.UsageError(`Couldn't find a configuration settings named "${key}"`);
        return transformConfiguration(rawValue, definition, {
            hideSecrets,
            getNativePaths,
        });
    }
    getSubprocessStreams(logFile, { header, prefix, report }) {
        let stdout;
        let stderr;
        const logStream = fslib_1.xfs.createWriteStream(logFile);
        if (this.get(`enableInlineBuilds`)) {
            const stdoutLineReporter = report.createStreamReporter(`${prefix} ${formatUtils.pretty(this, `STDOUT`, `green`)}`);
            const stderrLineReporter = report.createStreamReporter(`${prefix} ${formatUtils.pretty(this, `STDERR`, `red`)}`);
            stdout = new stream_1.PassThrough();
            stdout.pipe(stdoutLineReporter);
            stdout.pipe(logStream);
            stderr = new stream_1.PassThrough();
            stderr.pipe(stderrLineReporter);
            stderr.pipe(logStream);
        }
        else {
            stdout = logStream;
            stderr = logStream;
            if (typeof header !== `undefined`) {
                stdout.write(`${header}\n`);
            }
        }
        return { stdout, stderr };
    }
    makeResolver() {
        const pluginResolvers = [];
        for (const plugin of this.plugins.values())
            for (const resolver of plugin.resolvers || [])
                pluginResolvers.push(new resolver());
        return (new MultiResolver_1.MultiResolver([
            new VirtualResolver_1.VirtualResolver(),
            new WorkspaceResolver_1.WorkspaceResolver(),
            ...pluginResolvers,
        ]));
    }
    makeFetcher() {
        const pluginFetchers = [];
        for (const plugin of this.plugins.values())
            for (const fetcher of plugin.fetchers || [])
                pluginFetchers.push(new fetcher());
        return new MultiFetcher_1.MultiFetcher([
            new VirtualFetcher_1.VirtualFetcher(),
            new WorkspaceFetcher_1.WorkspaceFetcher(),
            ...pluginFetchers,
        ]);
    }
    getLinkers() {
        const linkers = [];
        for (const plugin of this.plugins.values())
            for (const linker of plugin.linkers || [])
                linkers.push(new linker());
        return linkers;
    }
    getSupportedArchitectures() {
        const architecture = nodeUtils.getArchitecture();
        const supportedArchitectures = this.get(`supportedArchitectures`);
        let os = supportedArchitectures.get(`os`);
        if (os !== null)
            os = os.map(value => value === `current` ? architecture.os : value);
        let cpu = supportedArchitectures.get(`cpu`);
        if (cpu !== null)
            cpu = cpu.map(value => value === `current` ? architecture.cpu : value);
        let libc = supportedArchitectures.get(`libc`);
        if (libc !== null)
            libc = miscUtils.mapAndFilter(libc, value => { var _a; return value === `current` ? (_a = architecture.libc) !== null && _a !== void 0 ? _a : miscUtils.mapAndFilter.skip : value; });
        return { os, cpu, libc };
    }
    async refreshPackageExtensions() {
        this.packageExtensions = new Map();
        const packageExtensions = this.packageExtensions;
        const registerPackageExtension = (descriptor, extensionData, { userProvided = false } = {}) => {
            if (!semverUtils.validRange(descriptor.range))
                throw new Error(`Only semver ranges are allowed as keys for the packageExtensions setting`);
            const extension = new Manifest_1.Manifest();
            extension.load(extensionData, { yamlCompatibilityMode: true });
            const extensionsPerIdent = miscUtils.getArrayWithDefault(packageExtensions, descriptor.identHash);
            const extensionsPerRange = [];
            extensionsPerIdent.push([descriptor.range, extensionsPerRange]);
            const baseExtension = {
                status: types_1.PackageExtensionStatus.Inactive,
                userProvided,
                parentDescriptor: descriptor,
            };
            for (const dependency of extension.dependencies.values())
                extensionsPerRange.push({ ...baseExtension, type: types_1.PackageExtensionType.Dependency, descriptor: dependency });
            for (const peerDependency of extension.peerDependencies.values())
                extensionsPerRange.push({ ...baseExtension, type: types_1.PackageExtensionType.PeerDependency, descriptor: peerDependency });
            for (const [selector, meta] of extension.peerDependenciesMeta) {
                for (const [key, value] of Object.entries(meta)) {
                    extensionsPerRange.push({ ...baseExtension, type: types_1.PackageExtensionType.PeerDependencyMeta, selector, key: key, value });
                }
            }
        };
        await this.triggerHook(hooks => {
            return hooks.registerPackageExtensions;
        }, this, registerPackageExtension);
        for (const [descriptorString, extensionData] of this.get(`packageExtensions`)) {
            registerPackageExtension(structUtils.parseDescriptor(descriptorString, true), miscUtils.convertMapsToIndexableObjects(extensionData), { userProvided: true });
        }
    }
    normalizeLocator(locator) {
        if (semverUtils.validRange(locator.reference))
            return structUtils.makeLocator(locator, `${this.get(`defaultProtocol`)}${locator.reference}`);
        if (exports.TAG_REGEXP.test(locator.reference))
            return structUtils.makeLocator(locator, `${this.get(`defaultProtocol`)}${locator.reference}`);
        return locator;
    }
    // TODO: Rename into `normalizeLocator`?
    // TODO: Move into `structUtils`, and remove references to `defaultProtocol` (we can make it a constant, same as the lockfile name)
    normalizeDependency(dependency) {
        if (semverUtils.validRange(dependency.range))
            return structUtils.makeDescriptor(dependency, `${this.get(`defaultProtocol`)}${dependency.range}`);
        if (exports.TAG_REGEXP.test(dependency.range))
            return structUtils.makeDescriptor(dependency, `${this.get(`defaultProtocol`)}${dependency.range}`);
        return dependency;
    }
    normalizeDependencyMap(dependencyMap) {
        return new Map([...dependencyMap].map(([key, dependency]) => {
            return [key, this.normalizeDependency(dependency)];
        }));
    }
    normalizePackage(original) {
        const pkg = structUtils.copyPackage(original);
        // We use the extensions to define additional dependencies that weren't
        // properly listed in the original package definition
        if (this.packageExtensions == null)
            throw new Error(`refreshPackageExtensions has to be called before normalizing packages`);
        const extensionsPerIdent = this.packageExtensions.get(original.identHash);
        if (typeof extensionsPerIdent !== `undefined`) {
            const version = original.version;
            if (version !== null) {
                for (const [range, extensionsPerRange] of extensionsPerIdent) {
                    if (!semverUtils.satisfiesWithPrereleases(version, range))
                        continue;
                    for (const extension of extensionsPerRange) {
                        // If an extension is active for a package but redundant
                        // for another one, it should be considered active
                        if (extension.status === types_1.PackageExtensionStatus.Inactive)
                            extension.status = types_1.PackageExtensionStatus.Redundant;
                        switch (extension.type) {
                            case types_1.PackageExtensionType.Dependency:
                                {
                                    const currentDependency = pkg.dependencies.get(extension.descriptor.identHash);
                                    if (typeof currentDependency === `undefined`) {
                                        extension.status = types_1.PackageExtensionStatus.Active;
                                        pkg.dependencies.set(extension.descriptor.identHash, this.normalizeDependency(extension.descriptor));
                                    }
                                }
                                break;
                            case types_1.PackageExtensionType.PeerDependency:
                                {
                                    const currentPeerDependency = pkg.peerDependencies.get(extension.descriptor.identHash);
                                    if (typeof currentPeerDependency === `undefined`) {
                                        extension.status = types_1.PackageExtensionStatus.Active;
                                        pkg.peerDependencies.set(extension.descriptor.identHash, extension.descriptor);
                                    }
                                }
                                break;
                            case types_1.PackageExtensionType.PeerDependencyMeta:
                                {
                                    const currentPeerDependencyMeta = pkg.peerDependenciesMeta.get(extension.selector);
                                    if (typeof currentPeerDependencyMeta === `undefined` || !Object.prototype.hasOwnProperty.call(currentPeerDependencyMeta, extension.key) || currentPeerDependencyMeta[extension.key] !== extension.value) {
                                        extension.status = types_1.PackageExtensionStatus.Active;
                                        miscUtils.getFactoryWithDefault(pkg.peerDependenciesMeta, extension.selector, () => ({}))[extension.key] = extension.value;
                                    }
                                }
                                break;
                            default:
                                {
                                    miscUtils.assertNever(extension);
                                }
                                break;
                        }
                    }
                }
            }
        }
        // We also add implicit optional @types peer dependencies for each peer
        // dependency. This is for compatibility reason, as many existing packages
        // forget to define their @types/react optional peer dependency when they
        // peer-depend on react.
        const getTypesName = (descriptor) => {
            return descriptor.scope
                ? `${descriptor.scope}__${descriptor.name}`
                : `${descriptor.name}`;
        };
        // I don't like implicit dependencies, but package authors are reluctant to
        // use optional peer dependencies because they would print warnings in older
        // npm releases.
        for (const identString of pkg.peerDependenciesMeta.keys()) {
            const ident = structUtils.parseIdent(identString);
            if (!pkg.peerDependencies.has(ident.identHash)) {
                pkg.peerDependencies.set(ident.identHash, structUtils.makeDescriptor(ident, `*`));
            }
        }
        // Automatically add corresponding `@types` optional peer dependencies
        for (const descriptor of pkg.peerDependencies.values()) {
            if (descriptor.scope === `types`)
                continue;
            const typesName = getTypesName(descriptor);
            const typesIdent = structUtils.makeIdent(`types`, typesName);
            const stringifiedTypesIdent = structUtils.stringifyIdent(typesIdent);
            if (pkg.peerDependencies.has(typesIdent.identHash) || pkg.peerDependenciesMeta.has(stringifiedTypesIdent))
                continue;
            pkg.peerDependencies.set(typesIdent.identHash, structUtils.makeDescriptor(typesIdent, `*`));
            pkg.peerDependenciesMeta.set(stringifiedTypesIdent, {
                optional: true,
            });
        }
        // We sort the dependencies so that further iterations always occur in the
        // same order, regardless how the various registries formatted their output
        pkg.dependencies = new Map(miscUtils.sortMap(pkg.dependencies, ([, descriptor]) => structUtils.stringifyDescriptor(descriptor)));
        pkg.peerDependencies = new Map(miscUtils.sortMap(pkg.peerDependencies, ([, descriptor]) => structUtils.stringifyDescriptor(descriptor)));
        return pkg;
    }
    getLimit(key) {
        return miscUtils.getFactoryWithDefault(this.limits, key, () => {
            return (0, p_limit_1.default)(this.get(key));
        });
    }
    async triggerHook(get, ...args) {
        for (const plugin of this.plugins.values()) {
            const hooks = plugin.hooks;
            if (!hooks)
                continue;
            const hook = get(hooks);
            if (!hook)
                continue;
            await hook(...args);
        }
    }
    async triggerMultipleHooks(get, argsList) {
        for (const args of argsList) {
            await this.triggerHook(get, ...args);
        }
    }
    async reduceHook(get, initialValue, ...args) {
        let value = initialValue;
        for (const plugin of this.plugins.values()) {
            const hooks = plugin.hooks;
            if (!hooks)
                continue;
            const hook = get(hooks);
            if (!hook)
                continue;
            value = await hook(value, ...args);
        }
        return value;
    }
    async firstHook(get, ...args) {
        for (const plugin of this.plugins.values()) {
            const hooks = plugin.hooks;
            if (!hooks)
                continue;
            const hook = get(hooks);
            if (!hook)
                continue;
            const ret = await hook(...args);
            if (typeof ret !== `undefined`) {
                // @ts-expect-error
                return ret;
            }
        }
        return null;
    }
}
Configuration.deleteProperty = Symbol();
Configuration.telemetry = null;
exports.Configuration = Configuration;
