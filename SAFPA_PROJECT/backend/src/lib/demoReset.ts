import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { prisma } from './prisma';

const execFileAsync = promisify(execFile);
let resetInFlight: Promise<void> | null = null;

function resetDirectory(dirPath: string) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

async function clearDatabase() {
  await prisma.$transaction([
    prisma.parlourUsageEvent.deleteMany(),
    prisma.auditEntry.deleteMany(),
    prisma.funeralCase.deleteMany(),
    prisma.parlourSubscription.deleteMany(),
    prisma.subscriptionPlan.deleteMany(),
    prisma.resourceAsset.deleteMany(),
    prisma.documentRecord.deleteMany(),
    prisma.communicationLog.deleteMany(),
    prisma.communicationTemplate.deleteMany(),
    prisma.reconciliationImport.deleteMany(),
    prisma.billingEvent.deleteMany(),
    prisma.paymentTransaction.deleteMany(),
    prisma.policy.deleteMany(),
    prisma.member.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.product.deleteMany(),
    prisma.appUser.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.parlour.deleteMany(),
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
  resetDirectory(path.resolve(process.cwd(), 'uploads'));
  await runSeedScript();
}

export async function resetDemoSessionData(): Promise<void> {
  if (!resetInFlight) {
    resetInFlight = performReset().finally(() => {
      resetInFlight = null;
    });
  }

  await resetInFlight;
}