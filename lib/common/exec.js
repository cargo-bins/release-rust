"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHook = exports.hookEnv = exports.execAndSucceedWithOutput = exports.execAndSucceed = void 0;
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const core_1 = require("@actions/core");
const exec_1 = require("@actions/exec");
async function execAndSucceed(command, args, options) {
    (0, core_1.info)(`Running command: ${command} ${args.join(' ')}`);
    const exitCode = await (0, exec_1.exec)(command, args, options);
    if (exitCode !== 0) {
        throw new Error(`Command failed with exit code ${exitCode}`);
    }
}
exports.execAndSucceed = execAndSucceed;
async function execAndSucceedWithOutput(command, args, options) {
    (0, core_1.info)(`Running command (grabbing output): ${command} ${args.join(' ')}`);
    let stdout = '';
    let stderr = '';
    const exitCode = await (0, exec_1.exec)(command, args, Object.assign(Object.assign({}, options), { listeners: {
            stdout: (data) => {
                stdout += data.toString();
            },
            stderr: (data) => {
                stderr += data.toString();
            }
        } }));
    if (exitCode !== 0) {
        (0, core_1.debug)(`=== Command output on STDOUT:\n${stdout}`);
        (0, core_1.debug)(`=== Command output on STDERR:\n${stderr}`);
        throw new Error(`Command failed with exit code ${exitCode}`);
    }
    return { stdout, stderr };
}
exports.execAndSucceedWithOutput = execAndSucceedWithOutput;
function hookEnv(inputs) {
    return Object.assign(Object.assign({}, process.env), { RELEASE_ROOT: process.cwd(), RELEASE_PACKAGE_OUTPUT: inputs.package.output, RELEASE_TARGET: inputs.setup.target });
}
exports.hookEnv = hookEnv;
async function runHook(inputs, name, environment = {}, workdir = process.cwd()) {
    let hook;
    switch (name) {
        case 'post-setup':
            hook = inputs.hooks.postSetup;
            break;
        case 'post-publish':
            hook = inputs.hooks.postPublish;
            break;
        case 'custom-build':
            hook = inputs.hooks.customBuild;
            break;
        case 'post-build':
            hook = inputs.hooks.postBuild;
            break;
        case 'pre-package':
            hook = inputs.hooks.prePackage;
            break;
        case 'post-package':
            hook = inputs.hooks.postPackage;
            break;
        case 'post-sign':
            hook = inputs.hooks.postSign;
            break;
        case 'post-release':
            hook = inputs.hooks.postRelease;
            break;
        default:
            throw new Error(`Unknown hook: ${name}`);
    }
    if (!hook) {
        (0, core_1.debug)(`No ${name} hook defined, skipping`);
        return;
    }
    const env = Object.assign(Object.assign({}, hookEnv(inputs)), environment);
    (0, core_1.debug)('Creating temporary directory for hook script');
    const dir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), `${name}-`));
    let ext = 'sh';
    if (/^cmd/i.test(inputs.hooks.shell)) {
        ext = 'bat';
    }
    else if (/^(pwsh|powershell)/i.test(inputs.hooks.shell)) {
        ext = 'ps1';
    }
    const path = (0, node_path_1.join)(dir, `${name}.${ext}`);
    (0, core_1.debug)(`Writing ${name} hook to ${path}`);
    await (0, promises_1.writeFile)(path, hook, { encoding: 'utf8' });
    (0, core_1.debug)(`Running ${name} hook`);
    if (ext === 'cmd') {
        await execAndSucceed('cmd', ['/c', `${path}`], {
            cwd: workdir,
            env
        });
    }
    else {
        const [prog, ...shellArgs] = inputs.hooks.shell.split(' ');
        if (ext === 'ps1')
            shellArgs.push('-file');
        await execAndSucceed(prog, [...shellArgs, `${path}`], {
            cwd: workdir,
            env
        });
    }
}
exports.runHook = runHook;
