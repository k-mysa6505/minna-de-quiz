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

const CHOICE_COLORS = [
  {
    bg: 'bg-blue-500/10',
    bgSelected: 'bg-blue-500/60',
    border: 'border-blue-400/30',
    borderSelected: 'border-blue-400',
    name: 'Blue'
  },
  {
    bg: 'bg-red-500/10',
    bgSelected: 'bg-red-500/60',
    border: 'border-red-400/30',
    borderSelected: 'border-red-400',
    name: 'Red'
  },
  {
    bg: 'bg-green-500/10',
    bgSelected: 'bg-green-500/60',
    border: 'border-green-400/30',
    borderSelected: 'border-green-400',
    name: 'Green'
  },
  {
    bg: 'bg-yellow-500/10',
    bgSelected: 'bg-yellow-500/60',
    border: 'border-yellow-400/30',
    borderSelected: 'border-yellow-400',
    name: 'Yellow'
  },
];

export function QuestionCreationPhase({ roomId, players, currentPlayerId }: QuestionCreationPhaseProps) {
  const [questionText, setQuestionText] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCreated, setHasCreated] = useState(false);
  const [progress, setProgress] = useState({ created: 0, total: players.length });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const progressData = await getQuestionProgress(roomId);
        setProgress(progressData);

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

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim() || choices.some(c => !c.trim())) {
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
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
    } catch (error) {
      console.error('Failed to create question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasCreated) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center text-white tracking-tight">問題作成完了</h2>
        <div className="text-center p-10 bg-gradient-to-br from-emerald-900/40 to-emerald-800/40 rounded-2xl border border-emerald-600/30 backdrop-blur-sm">
          <div className="text-7xl mb-6">✅</div>
          <p className="text-xl text-white font-semibold">問題を作成しました！</p>
          <p className="text-slate-300 mt-3 font-light">他のプレイヤーが作成するまでお待ちください...</p>
        </div>
        <div className="text-center bg-slate-800/50 rounded p-6 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-2">作成済み</p>
          <p className="text-4xl font-bold text-blue-400">{progress.created} / {progress.total}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-center text-white tracking-tight">問題作成</h2>

      <form onSubmit={handleSubmitClick} className="space-y-6">
        {/* 問題文入力 */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">問題文 *</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            rows={3}
            placeholder="問題文を入力してください"
            required
          />
        </div>

        {/* 画像アップロード */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">画像（任意）</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
          />
          {imagePreview && (
            <div className="mt-4 p-4 bg-slate-800/50 rounded border border-slate-700/50">
              <Image
                src={imagePreview}
                alt="Preview"
                className="max-w-xs rounded-lg object-contain mx-auto"
                width={320}
                height={180}
                unoptimized
              />
            </div>
          )}
        </div>

        {/* 選択肢入力（4色） */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">選択肢 *</label>
          <div className="space-y-3">
            {choices.map((choice, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-2 rounded border-2 transition-all ${
                  correctAnswer === index
                    ? `${CHOICE_COLORS[index].bgSelected} ${CHOICE_COLORS[index].borderSelected}`
                    : `${CHOICE_COLORS[index].bg} ${CHOICE_COLORS[index].border}`
                }`}
              >
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={correctAnswer === index}
                  onChange={() => setCorrectAnswer(index)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="text-white font-bold w-4">{index + 1}</span>
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => handleChoiceChange(index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-600 rounded text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={`選択肢 ${index + 1}`}
                  required
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 font-light">
            ラジオボタンで正解を選択してください
          </p>
        </div>

        {/* 作成進捗 */}
        <p className="text-sm text-slate-300 text-center italic">
          作成済みプレイヤー<span className="font-bold text-blue-400">{progress.created}/{progress.total}</span>
        </p>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-6 rounded shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
        >
          {isSubmitting ? '作成中...' : '問題を作成'}
        </button>
      </form>

      {/* 確認モーダル */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-8 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              この内容で問題を作成しますか？
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-slate-400 mb-2">問題文</p>
                <p className="text-white bg-slate-700/50 p-3 rounded-lg">{questionText}</p>
              </div>

              {imagePreview && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">画像</p>
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-lg"
                    width={400}
                    height={225}
                    unoptimized
                  />
                </div>
              )}

              <div>
                <p className="text-sm text-slate-400 mb-2">選択肢</p>
                <div className="space-y-2">
                  {choices.map((choice, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 ${
                        correctAnswer === index
                          ? `${CHOICE_COLORS[index].bgSelected} ${CHOICE_COLORS[index].borderSelected} text-white font-bold`
                          : `${CHOICE_COLORS[index].bg} ${CHOICE_COLORS[index].border} text-slate-200`
                      }`}
                    >
                      {index + 1}. {choice}
                      {correctAnswer === index && ' ✓'}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-700 text-white font-medium py-3 px-4 rounded transition-all"
              >
                戻る
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded transition-all disabled:cursor-not-allowed"
              >
                {isSubmitting ? '作成中...' : '作成する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
