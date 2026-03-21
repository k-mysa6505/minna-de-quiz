// lib/services/serviceAction.ts

export function toErrorMessage(error: unknown, fallback = '処理に失敗しました。'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

interface ServiceActionOptions<T> {
  fallback?: T;
  onError?: (message: string, error: unknown) => void;
  rethrow?: boolean;
}

/**
 * room/player/game サービス呼び出しの例外処理テンプレート。
 * 成功時は結果を返し、失敗時は共通ログと optional ハンドラに集約する。
 */
export async function runServiceAction<T>(
  label: string,
  action: () => Promise<T>,
  options: ServiceActionOptions<T> = {}
): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    const message = toErrorMessage(error);
    console.error(`[service-action:${label}]`, error);
    options.onError?.(message, error);

    if (options.rethrow) {
      throw error;
    }

    return options.fallback;
  }
}
