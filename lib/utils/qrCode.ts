// lib/utils/qrCode.ts
// QRコード生成・読み取りユーティリティ

import QRCode from 'qrcode';

const DEFAULT_APP_ORIGIN = 'http://localhost:3000';

/**
 * QRコード用のURLを生成
 * TODO: 実装してください
 * 
 * 例: https://yourapp.com/join-room?roomId=ABC123
 */
export function generateJoinUrl(roomId: string): string {
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_ORIGIN;

  const joinUrl = new URL('/join-room', origin);
  joinUrl.searchParams.set('roomId', roomId);

  return joinUrl.toString();
}

/**
 * QRコードを生成（Data URL形式）
 * TODO: 実装してください
 * 
 * ヒント:
 * - QRコード生成ライブラリを使用（qrcode など）
 * - npm install qrcode @types/qrcode
 */
export async function generateQRCode(roomId: string): Promise<string> {
  const joinUrl = generateJoinUrl(roomId);
  return QRCode.toDataURL(joinUrl, {
    margin: 2,
    width: 512,
  });
}

/**
 * URLからルームIDを抽出
 * TODO: 実装してください
 */
export function extractRoomIdFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const roomIdFromQuery = parsedUrl.searchParams.get('roomId');

    if (roomIdFromQuery) {
      return roomIdFromQuery;
    }

    const roomPathMatch = parsedUrl.pathname.match(/\/room\/([^/]+)/);
    return roomPathMatch?.[1] || null;
  } catch {
    return null;
  }
}
