/** Truncate for embed budgets; returns the text unchanged when it fits. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Placeholder for messages whose recoverable substance is not text. */
export function contentOrPlaceholder(content: string): string {
  return content.trim() === '' ? '*no text content*' : content;
}

/** Discord relative timestamp markdown. */
export function discordTimestamp(date: Date): string {
  return `<t:${String(Math.floor(date.getTime() / 1000))}:R>`;
}
