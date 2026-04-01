'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Player } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Modal } from "@/app/common/Modal";
import templateDataset from '../data/questionTemplateDataset.json';
import { useQuestionForm } from '../hooks/useQuestionForm';
import { useQuestionProgress } from '../hooks/useQuestionProgress';
import { PhaseHeader } from '../components/PhaseHeader';

interface QuestionCreationPhaseProps {
  roomId: string;
  players: Player[];
  currentPlayerId: string;
}

const CHOICE_COLORS = [
  { bg: 'bg-blue-500/10', bgSelected: 'bg-blue-500/60', border: 'border-blue-400/30', borderSelected: 'border-blue-400', name: 'Blue' },
  { bg: 'bg-red-500/10', bgSelected: 'bg-red-500/60', border: 'border-red-400/30', borderSelected: 'border-red-400', name: 'Red' },
  { bg: 'bg-green-500/10', bgSelected: 'bg-green-500/60', border: 'border-green-400/30', borderSelected: 'border-green-400', name: 'Green' },
  { bg: 'bg-yellow-500/10', bgSelected: 'bg-yellow-500/60', border: 'border-yellow-400/30', borderSelected: 'border-yellow-400', name: 'Yellow' },
];

type TemplateCategory = { id: string; label: string; questions: { text: string; choices: [string, string, string, string]; correctAnswer: 0 | 1 | 2 | 3 }[] };
const TEMPLATE_CATEGORIES = templateDataset as TemplateCategory[];

export function QuestionCreationPhase({ roomId, players, currentPlayerId }: QuestionCreationPhaseProps) {
  // 文字数制限
  const QUESTION_TEXT_MAX = 100;
  const CHOICE_TEXT_MAX = 20;

  const {
    questionText, setQuestionText,
    choices, setChoices,
    correctAnswer, setCorrectAnswer,
    imagePreview,
    imageError,
    setImageError,
    isSubmitting, hasCreated,
    handleImageChange, handleChoiceChange,
    submitQuestion
  } = useQuestionForm(roomId, currentPlayerId);

  // エラー表示用
  const [formError, setFormError] = useState<string | null>(null);

  const [showImageErrorModal, setShowImageErrorModal] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const progress = useQuestionProgress(roomId, players.length);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateCategoryId, setSelectedTemplateCategoryId] = useState(TEMPLATE_CATEGORIES[0]?.id ?? '');
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const applyTemplate = () => {
    const category = TEMPLATE_CATEGORIES.find(item => item.id === selectedTemplateCategoryId);
    if (!category || category.questions.length === 0) return;
    const q = category.questions[Math.floor(Math.random() * category.questions.length)];
    setQuestionText(q.text);
    setChoices(q.choices);
    setCorrectAnswer(q.correctAnswer);
    setShowTemplateModal(false);
  };

  // バリデーション
  const validateForm = () => {
    if (!questionText.trim()) {
      setFormError('問題文を入力してください。');
      return false;
    }
    if (questionText.length > QUESTION_TEXT_MAX) {
      setFormError(`問題文は${QUESTION_TEXT_MAX}文字以内で入力してください。`);
      return false;
    }
    for (let i = 0; i < choices.length; i++) {
      if (!choices[i].trim()) {
        setFormError(`選択肢${i + 1}を入力してください。`);
        return false;
      }
      if (choices[i].length > CHOICE_TEXT_MAX) {
        setFormError(`選択肢${i + 1}は${CHOICE_TEXT_MAX}文字以内で入力してください。`);
        return false;
      }
    }
    setFormError(null);
    return true;
  };

  // DBエラー表示用
  const [dbError, setDbError] = useState<string | null>(null);

  // 確認モーダルで「作成する」押下時のラップ
  const handleSubmit = async () => {
    setDbError(null);
    if (!validateForm()) return;
    try {
      await submitQuestion();
    } catch (e: any) {
      setDbError(e?.message || 'サーバーエラーが発生しました。');
    }
  };

  return (
    <div className="space-y-8">
      {hasCreated ? (
        <div className="flex items-center justify-center min-h-[90vh]">
          <div className="text-center p-4">
            <p className="text-white mb-3">ほかのプレイヤーが問題を作成するまでお待ちください...</p>
            <p className="text-sm text-slate-300 italic">作成済みプレイヤー <span className="font-bold text-blue-400">{progress.created}/{progress.total}</span></p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <PhaseHeader title="問題を作りましょう" />
            <button type="button" onClick={() => setShowTemplateModal(true)} className="w-8 h-8 rounded-full border border-slate-500/80 text-slate-200 bg-slate-700/70 hover:bg-slate-600/80 transition-all text-sm font-bold">?</button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (validateForm()) setShowConfirmModal(true); }} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">問題文 *</label>
              <textarea
                value={questionText}
                onChange={(e) => {
                  if (e.target.value.length <= QUESTION_TEXT_MAX) setQuestionText(e.target.value);
                }}
                maxLength={QUESTION_TEXT_MAX}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={3}
                placeholder="問題文を入力してください"
                required
              />
              <div className="text-xs text-slate-400 text-right mt-1">{questionText.length}/{QUESTION_TEXT_MAX}</div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">画像（任意）</label>
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleImageChange(e);
                    if (e.target.files?.[0] && e.target.files[0].size > 10 * 1024 * 1024) {
                      setShowImageErrorModal(true);
                    }
                  }}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-slate-300 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
                {imagePreview && (
                  <div className="mt-4 p-4 flex rounded-lg border border-slate-700/50 justify-center bg-slate-800/50 ">
                    <div className="relative rounded-xl overflow-hidden max-w-fit shadow-lg">
                      <Image
                        onClick={() => setIsImageZoomed(true)}
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full max-h-[180px] w-auto h-auto block object-cover"
                        width={320}
                        height={180}
                        unoptimized
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {showImageErrorModal && (
              <Modal
                onClose={() => {
                  setShowImageErrorModal(false);
                  setImageError(null);
                  setFileInputKey((k) => k + 1);
                }}
                panelClassName="max-w-xs w-full"
              >
                <h3 className="text-lg font-bold text-red-400 mb-4 text-center italic">サイズが大きすぎます！</h3>
                <div className="text-sm text-center text-slate-300 mb-6">ファイルサイズ上限は10MBです</div>
                <button
                  onClick={() => {
                    setShowImageErrorModal(false);
                    setImageError(null);
                    setFileInputKey((k) => k + 1);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md transition-all"
                >
                  閉じる
                </button>
              </Modal>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">選択肢 *</label>
              <div className="space-y-3">
                {choices.map((choice, index) => (
                  <div key={index} className={`flex items-center space-x-3 p-2 rounded-md border-2 transition-all ${correctAnswer === index ? `${CHOICE_COLORS[index].bgSelected} ${CHOICE_COLORS[index].borderSelected}` : `${CHOICE_COLORS[index].bg} ${CHOICE_COLORS[index].border}`}`}>
                    <input type="radio" name="correctAnswer" checked={correctAnswer === index} onChange={() => setCorrectAnswer(index)} className="w-5 h-5 cursor-pointer" />
                    <span className="text-white font-bold w-4">{index + 1}</span>
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => {
                        if (e.target.value.length <= CHOICE_TEXT_MAX) handleChoiceChange(index, e.target.value);
                      }}
                      maxLength={CHOICE_TEXT_MAX}
                      className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={`選択肢 ${index + 1}`}
                      required
                    />
                    <span className="text-xs text-slate-400 ml-2">{choice.length}/{CHOICE_TEXT_MAX}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 font-light">左のボタンで正解を選択してください</p>
            </div>
            {formError && <div className="text-center text-red-400 text-sm font-bold mb-2">{formError}</div>}
            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-6 rounded-md shadow-lg transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed">
              {isSubmitting ? '作成中...' : '問題を作成'}
            </button>
            <p className="text-sm text-slate-300 text-center italic">作成済みプレイヤー <span className="font-bold text-blue-400">{progress.created}/{progress.total}</span></p>
          </form>

          {showTemplateModal && (
            <Modal onClose={() => setShowTemplateModal(false)} panelClassName="max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white mb-2 italic">かんたん問題作成</h3>
                <p className="text-xs text-slate-300 mb-4">カテゴリを選んで問題のテンプレートを反映します。</p>
              </div>
              <div className="space-y-3">
                <select value={selectedTemplateCategoryId} onChange={(e) => setSelectedTemplateCategoryId(e.target.value)} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500">
                  {TEMPLATE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <button type="button" onClick={applyTemplate} className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all">このカテゴリからランダムに作成</button>
              </div>
            </Modal>
          )}

          {showConfirmModal && (
            <Modal onClose={() => setShowConfirmModal(false)} panelClassName="max-w-md w-full max-h-[80vh] overflow-y-auto p-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center italic">この内容で作成しますか？</h3>
              <div className="space-y-4 mb-6">
                <div><p className="text-sm text-slate-300 mb-1">問題文</p><p className="text-white bg-slate-700/50 p-3 rounded-lg">{questionText}</p></div>
                {imagePreview && (
                  <div>
                    <p className="text-sm text-slate-300 mb-1">画像</p>
                    <div className="p-2 flex rounded-lg border border-slate-700/50 justify-center bg-slate-800/50">
                      <div className="relative rounded-xl overflow-hidden max-w-fit shadow-lg">
                        <Image
                          onClick={() => setIsImageZoomed(true)}
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-full max-h-[150px] w-auto h-auto block object-cover"
                          width={320}
                          height={150}
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div><p className="text-sm text-slate-300 mb-2">選択肢</p><div className="space-y-2">{choices.map((c, i) => <div key={i} className={`p-3 rounded-lg border-2 ${correctAnswer === i ? `${CHOICE_COLORS[i].bgSelected} ${CHOICE_COLORS[i].borderSelected} text-white font-bold` : `${CHOICE_COLORS[i].bg} ${CHOICE_COLORS[i].border} text-slate-200`}`}>{i + 1}. {c}{correctAnswer === i && ' ✓'}</div>)}</div></div>
              </div>
              {dbError && <div className="text-center text-red-400 text-sm font-bold mb-4">{dbError}</div>}
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-slate-700 text-white font-medium py-3 px-4 rounded-md transition-all">戻る</button>
                <button onClick={async () => { await handleSubmit(); setShowConfirmModal(false); }} disabled={isSubmitting} className="flex-1 bg-blue-600 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-md transition-all">{isSubmitting ? '作成中...' : '作成する'}</button>
              </div>
            </Modal>
          )}
        </>
      )}
      <AnimatePresence>
        {isImageZoomed && imagePreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out p-4 md:p-8"
            onClick={() => setIsImageZoomed(false)}
          >
            <motion.div 
              layoutId="zoomed-image"
              className="relative max-w-full max-h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Image
                src={imagePreview}
                alt="Full Preview"
                className="max-w-full max-h-full object-contain"
                width={1600}
                height={900}
                unoptimized
              />
              <button 
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors"
                onClick={(e) => { e.stopPropagation(); setIsImageZoomed(false); }}
              >
                <X className="size-8" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

