// lib/utils/generateRoomId.ts
// ルームID生成ユーティリティ

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LENGTH = 6;
const ROOM_ID_PATTERN = /^[A-Z0-9]{6}$/;

/**
 * 6桁の英数字ルームIDを生成
 */
export function generateRoomId(): string {
  return Array.from({ length: LENGTH }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}

/**
 * ルームIDの妥当性チェック
 */
export function isValidRoomId(roomId: string): boolean {
  return !!roomId && ROOM_ID_PATTERN.test(roomId);
}
