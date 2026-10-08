/**
 * Reusable browser state machine for archive result browsing.
 * Pure + discord.js-free: shared by /snipe, /edits, /history, /search surfaces.
 *
 * Archive size ≠ query result size ≠ UI page size. The archive and the
 * query are unbounded; only the rendered page is bounded.
 */

export const DEFAULT_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 10;

/** `results` = paged list, `detail` = single message with Back. */
export type BrowserView = 'results' | 'detail';

export type BrowserState = {
  channelId: string;
  page: number;
  pageSize: number;
  totalResults: number;
  selectedMessageId: string | null;
  view: BrowserView;
};

export function createBrowserState(
  channelId: string,
  totalResults: number,
  page = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
): BrowserState {
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  const pages = totalPages(totalResults, size);
  return {
    channelId,
    page: clampPage(page, pages),
    pageSize: size,
    totalResults,
    selectedMessageId: null,
    view: 'results',
  };
}

export function totalPages(totalResults: number, pageSize: number): number {
  if (totalResults <= 0) return 1;
  return Math.max(1, Math.ceil(totalResults / Math.max(1, pageSize)));
}

export function clampPage(page: number, pages: number): number {
  if (!Number.isInteger(page)) return 1;
  return Math.min(pages, Math.max(1, page));
}

/** 1-based human range label, e.g. `1–5 of 137`. Empty sets read `0 of 0`. */
export function rangeText(page: number, pageSize: number, total: number): string {
  if (total <= 0) return '0 of 0';
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return `${String(start)}–${String(end)} of ${String(total)}`;
}

/** Slice an in-memory ordered result set to the requested page (1-based). */
export function pageSlice<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const start = (clampPage(page, totalPages(items.length, pageSize)) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Short cursor actions carried in `customId` (`snb:…`, always ≤100 chars). */
export type BrowserAction =
  | { kind: 'page'; page: number }
  | { kind: 'detail'; messageId: string; page: number }
  | { kind: 'back'; page: number }
  | { kind: 'close' };

export const BROWSER_PREFIX = 'snb';

export function pageAction(page: number): string {
  return `${BROWSER_PREFIX}:pg:${String(page)}`;
}

export function detailAction(messageId: string, page: number): string {
  return `${BROWSER_PREFIX}:dt:${messageId}:${String(page)}`;
}

export function backAction(page: number): string {
  return `${BROWSER_PREFIX}:bk:${String(page)}`;
}

export function closeAction(): string {
  return `${BROWSER_PREFIX}:cl`;
}

/** Parse a `snb:…` customId tail (already split past the prefix). */
export function parseBrowserAction(parts: string[]): BrowserAction | null {
  const [action, ...rest] = parts;
  if (action === 'pg' && rest.length === 1) {
    const page = Number(rest[0]);
    if (!Number.isInteger(page) || page < 1) return null;
    return { kind: 'page', page };
  }
  if (action === 'dt' && rest.length === 2) {
    const [messageId, rawPage] = rest;
    const page = Number(rawPage);
    if (messageId === undefined || messageId === '' || !Number.isInteger(page) || page < 1) {
      return null;
    }
    return { kind: 'detail', messageId, page };
  }
  if (action === 'bk' && rest.length === 1) {
    const page = Number(rest[0]);
    if (!Number.isInteger(page) || page < 1) return null;
    return { kind: 'back', page };
  }
  if (action === 'cl' && rest.length === 0) return { kind: 'close' };
  return null;
}
