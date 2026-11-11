// Shared by run.mjs (the test suite) and capture.mjs (the README images): build the production image, start it
// in demo mode on a free host port (kept across `docker restart`), wait for its health check, call `use` and
// always remove the container.
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HEALTH_TIMEOUT_MS = 90_000;

// A fixed host port, not one Docker picks: `docker restart` gives an ephemeral port a new number,
// and reset.spec.ts restarts the container under the same E2E_BASE_URL
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer().once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' }).trim();

const waitUntilHealthy = async (name) => {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const [state, health] = docker('inspect', '-f', '{{.State.Status}} {{.State.Health.Status}}', name).split(' ');
    if (health === 'healthy') {
      return;
    }
    if (state !== 'running') {
      throw new Error(`container ${state}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`not healthy after ${HEALTH_TIMEOUT_MS / 1000} s`);
};

// Resolves to `use`'s exit code, or 1 if the container could not be started
export const withDemoContainer = async (label, use) => {
  const name = `pressing-room-${label}-${randomUUID().slice(0, 8)}`;
  let started = false;
  const removeContainer = () => {
    if (started) {
      started = false;
      spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
    }
  };
  const onSignal = () => {
    removeContainer();
    process.exit(130);
  };
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  signals.forEach((signal) => process.on(signal, onSignal));

  try {
    // Run by image ID, not tag, so a parallel build from another checkout cannot swap the image
    const buildDir = mkdtempSync(join(tmpdir(), 'pressing-room-e2e-'));
    const iidFile = join(buildDir, 'iid');
    execFileSync('docker', ['build', '--iidfile', iidFile, '-t', 'pressing-room:e2e', repoRoot], { stdio: 'inherit' });
    const imageId = readFileSync(iidFile, 'utf8').trim();
    rmSync(buildDir, { recursive: true, force: true });

    const port = await freePort();
    started = true;
    docker(
      'run',
      '-d',
      '--name',
      name,
      '-p',
      `127.0.0.1:${port}:3000`,
      '-e',
      'DEMO_MODE=true',
      '-e',
      'JWT_SECRET=e2e-secret',
      '-e',
      'ADMIN_EMAIL=admin@example.com',
      '-e',
      'ADMIN_PASSWORD=Admin-pass-123',
      '-e',
      'DEMO_CUSTOMER_EMAIL=customer@example.com',
      '-e',
      'DEMO_CUSTOMER_PASSWORD=Customer-pass-123',
      imageId
    );
    try {
      await waitUntilHealthy(name);
    } catch (error) {
      spawnSync('docker', ['logs', name], { stdio: 'inherit' });
      throw error;
    }
    return await use(`http://127.0.0.1:${port}`, name);
  } catch (error) {
    console.error(`${label}: ${error.message}`);
    return 1;
  } finally {
    removeContainer();
    signals.forEach((signal) => process.off(signal, onSignal));
  }
};
