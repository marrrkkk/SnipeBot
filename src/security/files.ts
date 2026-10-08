/**
 * Owner-only file creation for archive data (DB, WAL, media). Call once
 * at process start; pre-existing files keep their modes (operator duty:
 * `chmod -R u=rwX,go= data/`). Returns the previous mask.
 */
export function restrictFileCreation(): number {
  return process.umask(0o077);
}
