// lib/services/serviceLogger.ts

function basePrefix(scope: string): string {
  return `[service:${scope}]`;
}

export const serviceLogger = {
  info(scope: string, message: string, payload?: unknown) {
    if (payload === undefined) {
      console.log(basePrefix(scope), message);
      return;
    }
    console.log(basePrefix(scope), message, payload);
  },

  warn(scope: string, message: string, payload?: unknown) {
    if (payload === undefined) {
      console.warn(basePrefix(scope), message);
      return;
    }
    console.warn(basePrefix(scope), message, payload);
  },

  error(scope: string, message: string, payload?: unknown) {
    if (payload === undefined) {
      console.error(basePrefix(scope), message);
      return;
    }
    console.error(basePrefix(scope), message, payload);
  },
};
