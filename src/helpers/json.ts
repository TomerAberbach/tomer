export const stringify = (object: unknown): string =>
  JSON.stringify(object, null, 2)
