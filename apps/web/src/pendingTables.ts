import type { RulesConfig } from '@marriage/engine';

/**
 * Tables this page is about to create, by code. The setup screen adds one and
 * navigates to its code; the table screen claims it once connected. Navigation
 * doesn't reload the page, so memory is enough.
 */
export const pendingTables = new Map<string, { name: string; rules: RulesConfig }>();
