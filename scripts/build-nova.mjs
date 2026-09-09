import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const site = 'https://essencial-saude-nova.slowgithub.workers.dev';
const result = spawnSync(npm, ['run', 'build'], {
  env: { ...process.env, PUBLIC_SITE_URL: site },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
