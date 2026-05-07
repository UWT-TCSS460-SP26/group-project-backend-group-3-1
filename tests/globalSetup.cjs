const path = require('node:path');
const { spawnSync } = require('node:child_process');

/**
 * Seeds shared DB users once before Jest workers start (avoids P2002 races on User.subjectId).
 * Uses tsx so we can import the same Prisma client as the app without a separate compile step.
 */
module.exports = async function globalSetup() {
  const root = path.join(__dirname, '..');
  const script = path.join(__dirname, 'seedIntegrationUsers.ts');
  const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`seedIntegrationUsers exited with code ${result.status}`);
  }
};
