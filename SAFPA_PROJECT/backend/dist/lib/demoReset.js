"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetDemoSessionData = resetDemoSessionData;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const prisma_1 = require("./prisma");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
let resetInFlight = null;
function resetDirectory(dirPath) {
    node_fs_1.default.rmSync(dirPath, { recursive: true, force: true });
    node_fs_1.default.mkdirSync(dirPath, { recursive: true });
}
async function clearDatabase() {
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.parlourUsageEvent.deleteMany(),
        prisma_1.prisma.auditEntry.deleteMany(),
        prisma_1.prisma.funeralCase.deleteMany(),
        prisma_1.prisma.parlourSubscription.deleteMany(),
        prisma_1.prisma.resourceAsset.deleteMany(),
        prisma_1.prisma.documentRecord.deleteMany(),
        prisma_1.prisma.communicationLog.deleteMany(),
        prisma_1.prisma.communicationTemplate.deleteMany(),
        prisma_1.prisma.reconciliationImport.deleteMany(),
        prisma_1.prisma.billingEvent.deleteMany(),
        prisma_1.prisma.paymentTransaction.deleteMany(),
        prisma_1.prisma.policy.deleteMany(),
        prisma_1.prisma.member.deleteMany(),
        prisma_1.prisma.lead.deleteMany(),
        prisma_1.prisma.product.deleteMany(),
        prisma_1.prisma.appUser.deleteMany(),
        prisma_1.prisma.branch.deleteMany(),
        prisma_1.prisma.parlour.deleteMany(),
    ]);
}
async function runSeedScript() {
    const backendRoot = process.cwd();
    await execFileAsync(process.execPath, ['-r', 'ts-node/register/transpile-only', 'prisma/seed.ts'], {
        cwd: backendRoot,
        env: process.env,
    });
}
async function performReset() {
    await clearDatabase();
    resetDirectory(node_path_1.default.resolve(process.cwd(), 'uploads'));
    await runSeedScript();
}
async function resetDemoSessionData() {
    if (!resetInFlight) {
        resetInFlight = performReset().finally(() => {
            resetInFlight = null;
        });
    }
    await resetInFlight;
}
//# sourceMappingURL=demoReset.js.map