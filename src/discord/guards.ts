/** True when the author shape marks a bot (or webhook-masquerading) author. */
export function isBotAuthor(author: unknown): boolean {
  return (
    typeof author === 'object' && author !== null && (author as { bot?: unknown }).bot === true
  );
}
