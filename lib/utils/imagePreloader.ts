/**
 * 画像URLの配列を受け取り、ブラウザにプリロード（キャッシュ）させます。
 * 
 * @param urls プリロードする画像のURL配列
 */
export function preloadImages(urls: string[]): void {
  if (typeof window === 'undefined') return;

  urls.forEach((url) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
}

/**
 * 単一の画像をプリロードします。
 * 
 * @param url プリロードする画像のURL
 */
export function preloadImage(url: string | null | undefined): void {
  if (!url || typeof window === 'undefined') return;
  const img = new Image();
  img.src = url;
}
