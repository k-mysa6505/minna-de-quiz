import type { Answer } from '@/types';

export function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  return 0;
}

export function dedupeAnswersByPlayer(answers: Answer[]): Answer[] {
  const byPlayer = new Map<string, Answer>();

  for (const answer of answers) {
    const existing = byPlayer.get(answer.playerId);
    if (!existing) {
      byPlayer.set(answer.playerId, answer);
      continue;
    }

    if (toMillis(answer.answeredAt) < toMillis(existing.answeredAt)) {
      byPlayer.set(answer.playerId, answer);
    }
  }

  return Array.from(byPlayer.values());
}

export function calculateCorrectAnswerPoints(params: {
  correctAnswerPoints: number;
  fastestAnswerBonusPoints: number;
  isFastestCorrect: boolean;
}): number {
  const {
    correctAnswerPoints,
    fastestAnswerBonusPoints,
    isFastestCorrect,
  } = params;

  const base = Math.max(0, correctAnswerPoints);
  const fastestBonus = Math.max(0, fastestAnswerBonusPoints);
  return base + (isFastestCorrect ? fastestBonus : 0);
}

export function calculateAnswerScoreDelta(params: {
  isCorrect: boolean;
  correctAnswerPoints: number;
  fastestAnswerBonusPoints: number;
  wrongAnswerPenalty: number;
  isFastestCorrect: boolean;
}): number {
  const {
    isCorrect,
    correctAnswerPoints,
    fastestAnswerBonusPoints,
    wrongAnswerPenalty,
    isFastestCorrect,
  } = params;

  if (!isCorrect) {
    return -Math.max(0, wrongAnswerPenalty);
  }

  return calculateCorrectAnswerPoints({
    correctAnswerPoints,
    fastestAnswerBonusPoints,
    isFastestCorrect,
  });
}

export function calculatePredictionPoints(
  predictedCount: number,
  actualCount: number,
  predictionHitBonusPoints: number
): number {
  const diff = Math.abs(predictedCount - actualCount);
  return diff === 0 ? Math.max(0, predictionHitBonusPoints) : 0;
}
