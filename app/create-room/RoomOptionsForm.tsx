// app/create-room/RoomOptionsForm.tsx
'use client';

import { useState } from 'react';
import { Modal } from "@/app/common/Modal";

interface RoomOptionsFormProps {
  description: string;
  setDescription: (value: string) => void;
  timeLimit: number;
  setTimeLimit: (value: number) => void;
  correctAnswerPoints: number;
  setCorrectAnswerPoints: (value: number) => void;
  fastestAnswerBonusPoints: number;
  setFastestAnswerBonusPoints: (value: number) => void;
  wrongAnswerPenalty: number;
  setWrongAnswerPenalty: (value: number) => void;
  predictionHitBonusPoints: number;
  setPredictionHitBonusPoints: (value: number) => void;
  maxPlayers: number;
  setMaxPlayers: (value: number) => void;
  onClose: () => void;
}

function HelpIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-5 h-5 rounded-full border border-slate-500 text-slate-400 text-xs flex items-center justify-center"
    >
      ?
    </button>
  );
}

export function RoomOptionsForm({
  description, setDescription,
  timeLimit, setTimeLimit,
  correctAnswerPoints, setCorrectAnswerPoints,
  fastestAnswerBonusPoints, setFastestAnswerBonusPoints,
  wrongAnswerPenalty, setWrongAnswerPenalty,
  predictionHitBonusPoints, setPredictionHitBonusPoints,
  maxPlayers, setMaxPlayers,
  onClose
}: RoomOptionsFormProps) {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpContent, setHelpContent] = useState({ title: '', content: '' });

  const showHelp = (title: string, content: string) => {
    setHelpContent({ title, content });
    setShowHelpModal(true);
  };

  const optionFields = [
    {
      label: 'ルームの説明',
      help: 'このルームの目的やテーマを説明します。参加者が参加前に確認できます。',
      component: (
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例：アニメクイズ大会"
          maxLength={50}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
        />
      )
    },
    {
      label: '制限時間',
      help: '1問ごとの制限時間です。「なし」を選ぶと時間制限なしになります。',
      component: (
        <select
          value={timeLimit}
          onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
        >
          {[10, 20, 30, 40, 50, 60, 90, 120, 0].map(v => (
            <option key={v} value={v}>{v === 0 ? 'なし' : `${v}s`}</option>
          ))}
        </select>
      )
    },
    {
      label: '正解ポイント',
      help: '正解したプレイヤーに加点される基本ポイントです。',
      component: (
        <select
          value={correctAnswerPoints}
          onChange={(e) => setCorrectAnswerPoints(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
        >
          {[10, 20, 30, 40, 50].map(v => <option key={v} value={v}>{v}pt</option>)}
        </select>
      )
    },
    {
      label: '早押し1位ボーナス',
      help: 'その問題で最初に正解したプレイヤーに追加されるポイントです。',
      component: (
        <select
          value={fastestAnswerBonusPoints}
          onChange={(e) => setFastestAnswerBonusPoints(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
        >
          {[10, 20, 30, 40, 50].map(v => <option key={v} value={v}>{v}pt</option>)}
        </select>
      )
    },
    {
      label: '誤答ペナルティ',
      help: '不正解時の減点です。',
      component: (
        <select
          value={wrongAnswerPenalty}
          onChange={(e) => setWrongAnswerPenalty(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
        >
          {[0, 5, 10, 15, 20].map(v => <option key={v} value={v}>-{v}pt</option>)}
        </select>
      )
    },
    {
      label: '予想チャレンジ的中',
      help: '作問者の予想がぴったり一致したときの加点です。',
      component: (
        <select
          value={predictionHitBonusPoints}
          onChange={(e) => setPredictionHitBonusPoints(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
        >
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => <option key={v} value={v}>{v}pt</option>)}
        </select>
      )
    },
    {
      label: '最大参加人数',
      help: 'このルームに参加できる最大人数を設定します。',
      component: (
        <select
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
        >
          {Array.from({ length: 29 }, (_, i) => i + 2).map((v) => (
            <option key={v} value={v}>{v}人</option>
          ))}
        </select>
      )
    }
  ];

  return (
    <>
      <Modal onClose={onClose} panelClassName="max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">オプション</h2>
        <div className="space-y-5">
          {optionFields.map((field) => (
            <div key={field.label}>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                {field.label}
                <HelpIconButton onClick={() => showHelp(field.label, field.help)} />
              </label>
              {field.component}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-all">閉じる</button>
          <button onClick={onClose} className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all">変更する</button>
        </div>
      </Modal>

      {showHelpModal && (
        <Modal onClose={() => setShowHelpModal(false)} panelClassName="max-w-sm w-full">
          <h3 className="text-xl font-bold text-white mb-3">{helpContent.title}</h3>
          <p className="text-slate-300 text-sm mb-4">{helpContent.content}</p>
          <button onClick={() => setShowHelpModal(false)} className="w-full bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-all">閉じる</button>
        </Modal>
      )}
    </>
  );
}
