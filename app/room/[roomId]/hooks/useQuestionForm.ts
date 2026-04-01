// app/room/[roomId]/useQuestionForm.ts
'use client';

import { useState } from 'react';
import { uploadQuestionImage } from '@/lib/services/core/storageService';
import { createQuestion } from '@/lib/services/game/questionService';
import { runServiceAction } from '@/lib/services/core/serviceAction';
import { type QuestionFormData } from '@/types';

export function useQuestionForm(roomId: string, currentPlayerId: string) {
  const [questionText, setQuestionText] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCreated, setHasCreated] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setImageError('画像サイズが大きすぎます（最大10MBまで）');
        setImageFile(null);
        setImagePreview(null);
        return;
      }
      // 許可するMIMEタイプを厳格に指定（SVG除外）
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setImageError('JPG, PNG, WebP, GIF形式の画像のみアップロードできます');
        setImageFile(null);
        setImagePreview(null);
        return;
      }
      setImageError(null);
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageError(null);
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const CHOICE_TEXT_MAX = 50;
  const handleChoiceChange = (index: number, value: string) => {
    // 文字数制限と空白トリム
    let v = value.slice(0, CHOICE_TEXT_MAX);
    setChoices(prev => {
      const newChoices = [...prev];
      newChoices[index] = v;
      return newChoices;
    });
  };

  const resetForm = () => {
    setQuestionText('');
    setChoices(['', '', '', '']);
    setCorrectAnswer(0);
    setImageFile(null);
    setImagePreview(null);
  };

  const QUESTION_TEXT_MAX = 200;
  const submitQuestion = async () => {
    setIsSubmitting(true);

    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await runServiceAction('questionCreation.uploadImage', () =>
        uploadQuestionImage(roomId, currentPlayerId, imageFile)
      );
    }

    // 空白トリム・最大文字数制限
    const trimmedText = questionText.trim().slice(0, QUESTION_TEXT_MAX);
    const trimmedChoices = choices.map(c => c.trim().slice(0, CHOICE_TEXT_MAX)) as [string, string, string, string];

    const questionData: QuestionFormData = {
      text: trimmedText,
      imageUrl,
      choices: trimmedChoices,
      correctAnswer: correctAnswer as 0 | 1 | 2 | 3,
    };

    try {
      const created = await runServiceAction(
        'questionCreation.createQuestion',
        async () => {
          await createQuestion(roomId, currentPlayerId, questionData);
          return true;
        },
        { fallback: false }
      );
      if (created) {
        setHasCreated(true);
      }
      setIsSubmitting(false);
      return created;
    } catch (e) {
      setIsSubmitting(false);
      throw e;
    }
  };

  return {
    questionText,
    setQuestionText,
    choices,
    setChoices,
    correctAnswer,
    setCorrectAnswer,
    imageFile,
    imagePreview,
    setImagePreview,
    imageError,
    setImageError,
    isSubmitting,
    hasCreated,
    handleImageChange,
    handleChoiceChange,
    submitQuestion,
    resetForm,
  };
}
