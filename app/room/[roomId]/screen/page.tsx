'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { disbandRoomFlow, resetRoomForReplayFlow } from '@/lib/services/room/roomFlowService';
import { startGame } from '@/lib/services/room/roomService';
import { calculatePredictionPoints } from '@/lib/utils/roundScoring';
import { runServiceAction } from '@/lib/services/core/serviceAction';
import { useScreenData } from './hooks/useScreenData';
import { toTimestamp } from './utils/screenUtils';
import { WaitingScreen } from './components/WaitingScreen';
import { CreatingScreen } from './components/CreatingScreen';
import { AnsweringScreen } from './components/AnsweringScreen';
import { RevealingScreen } from './components/RevealingScreen';
import { FinishedScreen } from './components/FinishedScreen';
import { LeaveRoomModal } from '../modals/LeaveRoomModal';
import LoadingSpinner from '@/app/common/LoadingSpinner';

export default function RoomScreenPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const requestedDeviceId = searchParams.get('deviceId') || '';

  const state = useScreenData(roomId, requestedDeviceId);
  const [isStarting, setIsStarting] = useState(false);
  const [revealingPhase, setRevealingPhase] = useState<'answer' | 'ranking' | 'prediction'>('answer');
  const [revealedPlayers, setRevealedPlayers] = useState<string[]>([]);
  const [counts, setCounts] = useState({ pred: 0, actual: 0, showPred: false, showActual: false, showBonus: false });
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isDisbanding, setIsDisbanding] = useState(false);
  const [showDisbandModal, setShowDisbandModal] = useState(false);

  const correctAnswers = useMemo(() => state.currentAnswers.filter(a => a.isCorrect).sort((a, b) => toTimestamp(a.answeredAt) - toTimestamp(b.answeredAt)), [state.currentAnswers]);
  const author = state.players.find(p => p.playerId === state.currentQuestion?.authorId);
  const joinUrl = useMemo(() => typeof window !== 'undefined' ? `${window.location.origin}/join-room?roomId=${roomId}` : '', [roomId]);

  const handleDisband = async () => {
    if (!requestedDeviceId) return;
    setIsDisbanding(true);
    await runServiceAction('screen.disband', () => disbandRoomFlow(roomId, requestedDeviceId), {
      onError: () => alert('ルーム解体に失敗しました。'),
    });
    setIsDisbanding(false);
    router.push('/');
  };

  useEffect(() => {
    if (state.gameState?.phase !== 'answering') return;
    const tick = () => {
      const start = toTimestamp(state.gameState?.questionStartedAt);
      if (start <= 0) return;
      const remain = Math.max(0, start + (state.room?.timeLimit ?? 30) * 1000 - Date.now());
      setRemainingSeconds(Math.ceil(remain / 1000));
    };
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [state.room?.timeLimit, state.gameState?.phase, state.gameState?.questionStartedAt]);

  useEffect(() => {
    if (state.gameState?.phase !== 'revealing') { setRevealingPhase('answer'); setRevealedPlayers([]); return; }
    const timer = setTimeout(() => setRevealingPhase('ranking'), 2200);
    return () => clearTimeout(timer);
  }, [state.gameState?.phase, state.currentQuestion?.questionId]);

  useEffect(() => {
    if (revealingPhase !== 'ranking' || state.gameState?.phase !== 'revealing') return;
    if (correctAnswers.length === 0) {
      const timer = setTimeout(() => setRevealingPhase('prediction'), 2000);
      return () => clearTimeout(timer);
    }
    let index = 0;
    const interval = setInterval(() => {
      if (index < correctAnswers.length) {
        const answer = correctAnswers[index];
        if (answer) {
          setRevealedPlayers(prev => prev.includes(answer.playerId) ? prev : [...prev, answer.playerId]);
        }
        index++;
      }
      else {
        clearInterval(interval);
        setTimeout(() => setRevealingPhase('prediction'), 1000);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [revealingPhase, state.gameState?.phase, correctAnswers]);

  useEffect(() => {
    if (revealingPhase !== 'prediction') { setCounts({ pred: 0, actual: 0, showPred: false, showActual: false, showBonus: false }); return; }
    const t1 = setTimeout(() => setCounts(c => ({ ...c, showPred: true, pred: state.currentPrediction?.predictedCount ?? 0 })), 500);
    const t2 = setTimeout(() => setCounts(c => ({ ...c, showActual: true, actual: correctAnswers.length })), 2200);
    const t3 = setTimeout(() => setCounts(c => ({ ...c, showBonus: true })), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [revealingPhase, state.currentPrediction?.predictedCount, correctAnswers.length]);

  // Hooksはreturnより前に必ず呼び出す（Reactのルール）
  const revealReadyCount = state.gameState?.playersReady?.length ?? 0;
  const revealReadyTotal = state.players.length;
  const dist = state.currentAnswers.reduce((acc, a) => {
    const idx = typeof a.answer === 'number' ? a.answer : -1;
    if (idx >= 0 && idx < 4) acc[idx]++;
    return acc;
  }, [0, 0, 0, 0]);

  const nextQuestion = useMemo(() => {
    if (!state.gameState || !state.allQuestions.length) return null;
    const nextIndex = state.gameState.currentQuestionIndex + 1;
    if (nextIndex >= state.allQuestions.length) return null;
    const nextId = state.gameState.questionOrder[nextIndex];
    return state.allQuestions.find(q => q.questionId === nextId) || null;
  }, [state.gameState, state.allQuestions]);

  // 早期リターンはHooksの後に書く
  if (!state.room && !state.error) return <LoadingSpinner message="読み込み中..." />;
  if (state.error || !state.room) return <div className="p-6 text-center text-white">エラー: {state.error}</div>;

  return (
    <main className="h-[100dvh] overflow-x-auto text-white p-6">
      <div className="mx-auto h-full min-w-[640px]" style={{ minWidth: 640 }}>
        {state.room.status === 'waiting' && (
          <WaitingScreen
            room={state.room}
            players={state.players}
            joinUrl={joinUrl}
            isStarting={isStarting}
            onStart={() => runServiceAction('s', () => startGame(roomId))}
            onDisband={() => setShowDisbandModal(true)}
          />
        )}
        {state.room.status === 'creating' && <CreatingScreen players={state.players} questionProgress={state.questionProgress} creatingCompletedAuthorIds={state.creatingCompletedAuthorIds} />}
        {state.room.status === 'playing' && state.gameState?.phase !== 'revealing' && <AnsweringScreen gameState={state.gameState!} currentQuestion={state.currentQuestion} remainingSeconds={remainingSeconds} currentAuthorName={author?.nickname || ''} timeLimit={state.room.timeLimit ?? 30} />}
        {state.room.status === 'playing' && state.gameState?.phase === 'revealing' && state.currentQuestion && (
          <RevealingScreen
            revealingPhase={revealingPhase}
            currentQuestion={state.currentQuestion}
            answerDistribution={dist}
            correctAnswers={correctAnswers}
            players={state.players}
            revealedPlayers={revealedPlayers}
            currentPrediction={state.currentPrediction}
            currentAuthorName={author?.nickname || ''}
            animatedPredictedCount={counts.pred}
            animatedActualCount={counts.actual}
            predictionPoints={calculatePredictionPoints(state.currentPrediction?.predictedCount ?? 0, correctAnswers.length, state.room.predictionHitBonusPoints ?? 50)}
            showPredictedCount={counts.showPred}
            showActualCount={counts.showActual}
            showPredictionBonus={counts.showBonus}
            revealReadyCount={revealReadyCount}
            revealReadyTotal={revealReadyTotal}
            revealReadyPercent={revealReadyTotal > 0 ? (revealReadyCount / revealReadyTotal) * 100 : 0}
            room={state.room}
            questionStartTime={toTimestamp(state.gameState.questionStartedAt)}
            nextQuestionImageUrl={nextQuestion?.imageUrl}
          />
        )}
        {state.room.status === 'finished' && (
          <FinishedScreen
            players={state.players}
            isReplaying={isReplaying}
            isDisbanding={isDisbanding}
            onReplay={() => runServiceAction('r', () => resetRoomForReplayFlow(roomId, requestedDeviceId))}
            onDisband={() => setShowDisbandModal(true)}
          />
        )}
      </div>

      {showDisbandModal && (
        <LeaveRoomModal
          isLeaving={isDisbanding}
          onCancel={() => setShowDisbandModal(false)}
          onConfirm={handleDisband}
          title="ルームを解体"
          description={"本当にルームを解体しますか？\n全てのプレイヤーが退室させられます。"}
          confirmLabel="解体する"
        />
      )}
    </main>
  );
}
