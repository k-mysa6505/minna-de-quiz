// app/room/[roomId]/components/QuestionCreationPhase.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createQuestion, getQuestionProgress, getQuestions } from '@/lib/services/questionService';
import { uploadQuestionImage } from '@/lib/services/storageService';
import { initializeGame } from '@/lib/services/gameService';
import { updateRoomStatus } from '@/lib/services/roomService';
import type { Player, QuestionFormData } from '@/types';

interface QuestionCreationPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
}

export function QuestionCreationPhase({ roomId, players, currentPlayerId }: QuestionCreationPhaseProps) {
  const [questionText, setQuestionText] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCreated, setHasCreated] = useState(false);
  const [progress, setProgress] = useState({ created: 0, total: players.length });

  // 問題作成進捗を監視
  useEffect(() => {
    const checkProgress = async () => {
      try {
        const progressData = await getQuestionProgress(roomId);
        setProgress(progressData);

        // 全員が問題を作成したらゲーム開始
        if (progressData.created === progressData.total && progressData.total > 0) {
          const allQuestions = await getQuestions(roomId);
          const questionIds = allQuestions.map(q => q.questionId);
          await initializeGame(roomId, questionIds);
          await updateRoomStatus(roomId, 'playing');
        }
      } catch (error) {
        console.error('Failed to get progress:', error);
      }
    };

    const interval = setInterval(checkProgress, 2000);
    checkProgress();
    return () => clearInterval(interval);
  }, [roomId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim()) {
      alert('問題文を入力してください');
      return;
    }

    if (choices.some(c => !c.trim())) {
      alert('すべての選択肢を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadQuestionImage(roomId, currentPlayerId, imageFile);
      }

      const questionData: QuestionFormData = {
        text: questionText,
        imageUrl,
        choices: choices as [string, string, string, string],
        correctAnswer: correctAnswer as 0 | 1 | 2 | 3,
      };

      await createQuestion(roomId, currentPlayerId, questionData);
      setHasCreated(true);
      alert('問題を作成しました！');
    } catch (error) {
      console.error('Failed to create question:', error);
      alert('問題の作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasCreated) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">問題作成完了</h2>
        <div className="text-center p-8 bg-green-50 rounded-lg">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-lg text-gray-700">問題を作成しました！</p>
          <p className="text-gray-600 mt-2">他のプレイヤーが作成するまでお待ちください...</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">作成済み</p>
          <p className="text-3xl font-bold text-blue-600">{progress.created} / {progress.total}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">問題作成</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 問題文入力 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">問題文 *</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="問題文を入力してください"
            required
          />
        </div>

        {/* 画像アップロード */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">画像（任意）</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          ></input>
          {imagePreview && (
            <div className="mt-2">
              <Image
                src={imagePreview}
                alt="Preview"
                className="max-w-xs rounded-lg object-contain"
                width={320}
                height={180}
                unoptimized
              />
            </div>
          )}
        </div>

        {/* 選択肢入力 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">選択肢 *</label>
          <div className="space-y-2">
            {choices.map((choice, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={correctAnswer === index}
                  onChange={() => setCorrectAnswer(index)}
                  className="w-5 h-5"
                />
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => handleChoiceChange(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`選択肢 ${index + 1}`}
                  required
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">ラジオボタンで正解を選択してください</p>
        </div>

        {/* 作成進捗 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 text-center">
            作成済み: {progress.created} / {progress.total}
          </p>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg"
        >
          {isSubmitting ? '作成中...' : '問題を作成'}
        </button>
      </form>
    </div>
  );
}
