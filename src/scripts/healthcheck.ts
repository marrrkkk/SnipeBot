import 'dotenv/config';
import { loadConfig } from '../config/env.js';
import { checkHealth } from '../healthcheck.js';

/** Container HEALTHCHECK + operator diagnostic. Exits 0 healthy, 1 not. */
function main(): void {
  let databasePath: string;
  try {
    databasePath = loadConfig().databasePath;
  } catch (err) {
    console.error(
      `unhealthy: bad configuration (${err instanceof Error ? err.message : String(err)})`,
    );
    process.exitCode = 1;
    return;
  }
  const status = checkHealth(databasePath);
  if (status.ok) {
    console.log('healthy');
    return;
  }
  console.error(`unhealthy: ${status.message}`);
  process.exitCode = 1;
}

main();
