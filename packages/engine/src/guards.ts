/** Narrows untrusted input (e.g. parsed JSON) to an object whose fields can be inspected. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
