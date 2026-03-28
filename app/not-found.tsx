'use client';

import { SecondaryButton } from "@/app/common/SecondaryButton";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-screen gap-4 px-7">
      <h1 className="text-2xl sm:text-4xl font-bold text-white italic">ページが見つかりません</h1>
      <p className="text-base sm:text-lg text-gray-300">お探しのページは存在しないか、すでに削除されている可能性があります。</p>
      <SecondaryButton href="/" className="mt-6">ホームへ戻る</SecondaryButton>
    </div>
  )
}
