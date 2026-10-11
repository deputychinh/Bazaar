import { existsSync } from 'node:fs';

// Integration tests use the same .env as `make dev` (repo root).
const envFile = new URL('../../../../../.env', import.meta.url);
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
