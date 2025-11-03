// lib/utils/qrCode.ts
// QRコード生成・読み取りユーティリティ

/**
 * QRコード用のURLを生成
 * TODO: 実装してください
 * 
 * 例: https://yourapp.com/join-room?roomId=ABC123
 */
export function generateJoinUrl(roomId: string): string {
  // TODO: 実装
  // ヒント: window.location.origin を使う
  return ``;
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
  // TODO: 実装
  throw new Error('Not implemented');
}

/**
 * URLからルームIDを抽出
 * TODO: 実装してください
 */
export function extractRoomIdFromUrl(url: string): string | null {
  // TODO: 実装
  return null;
}
