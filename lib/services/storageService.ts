// lib/services/storageService.ts
// 問題画像のアップロード・取得サービス

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * 問題画像をアップロード
 * @param roomId - ルームID
 * @param questionId - 問題ID
 * @param file - 画像ファイル
 * @returns 画像のダウンロードURL
 */
export async function uploadQuestionImage(
  roomId: string,
  questionId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `rooms/${roomId}/questions/${questionId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * 問題画像を削除
 * @param imageUrl - 画像のURL
 */
export async function deleteQuestionImage(imageUrl: string): Promise<void> {
  // URLからストレージパスを抽出
  // 例: https://firebasestorage.googleapis.com/.../o/rooms%2Fxxx%2F...
  //     → rooms/xxx/...
  const pathMatch = imageUrl.match(/\/o\/(.+?)\?/);
  if (!pathMatch) {
    throw new Error('Invalid storage URL');
  }

  // URLエンコードされたパスをデコード
  const storagePath = decodeURIComponent(pathMatch[1]);
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
