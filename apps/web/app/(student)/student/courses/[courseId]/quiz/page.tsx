'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, CardHeader } from '@compliance/ui';
import { startQuizAttempt, saveAnswer, submitAttempt } from '@/lib/quiz';
import type { AttemptStateDto, QuestionForAttempt } from '@/lib/quiz';

function QuestionWidget({
  question,
  savedAnswer,
  onAnswer,
}: {
  question: QuestionForAttempt;
  savedAnswer: string[];
  onAnswer: (questionId: string, selectedIds: string[]) => void;
}): React.JSX.Element {
  const isMultiple = question.type === 'MULTIPLE_CHOICE';

  function toggleOption(optionId: string): void {
    if (isMultiple) {
      const next = savedAnswer.includes(optionId)
        ? savedAnswer.filter((id) => id !== optionId)
        : [...savedAnswer, optionId];
      onAnswer(question.id, next);
    } else {
      onAnswer(question.id, [optionId]);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {question.type === 'SINGLE_CHOICE' ? 'Única' : question.type === 'MULTIPLE_CHOICE' ? 'Múltipla' : 'V/F'}
          </span>
          <p className="text-sm font-medium leading-snug">{question.statement}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {question.options.map((opt) => {
          const selected = savedAnswer.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selected
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'hover:bg-accent'
              }`}
              aria-pressed={selected}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-${isMultiple ? 'sm' : 'full'} border-2 ${
                  selected ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}
                aria-hidden
              >
                {selected && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {opt.text}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function StudentQuizPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptStateDto | null>(null);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const enrollmentId = null;

  // We need the enrollment id — get it from URL search params or pass via state
  // For now, attempt is started from the course detail page where enrollmentId is known
  // Here we use a query param fallback
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null;
  const eid = searchParams?.get('enrollmentId') ?? enrollmentId;

  const startMutation = useMutation({
    mutationFn: () => startQuizAttempt(eid!),
    onSuccess: (data) => {
      setAttempt(data);
      const initial = new Map<string, string[]>();
      data.savedAnswers.forEach((a) => initial.set(a.questionId, a.selectedOptionIds));
      setAnswers(initial);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao iniciar teste'),
  });

  const saveAnswerMutation = useMutation({
    mutationFn: ({ qId, ids }: { qId: string; ids: string[] }) =>
      saveAnswer(attempt!.attemptId, qId, ids),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitAttempt(attempt!.attemptId),
    onSuccess: (data) => {
      router.push(`/student/courses/${courseId}/quiz/result/${data.attemptId}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao submeter'),
  });

  function handleAnswer(questionId: string, selectedIds: string[]): void {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, selectedIds);
      return next;
    });
    // Auto-save
    saveAnswerMutation.mutate({ qId: questionId, ids: selectedIds });
  }

  const allAnswered = attempt
    ? attempt.questions.every((q) => (answers.get(q.id) ?? []).length > 0)
    : false;

  if (!attempt) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-xl font-bold">Teste do curso</h1>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!eid ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Acesse o teste a partir da página do curso.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/student/courses/${courseId}`}>Voltar ao curso</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Certifique-se de ter concluído todas as aulas antes de iniciar.
            </p>
            <Button
              className="w-full max-w-xs"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? 'Carregando…' : 'Iniciar teste'}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/student/courses/${courseId}`}>Voltar</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{attempt.quizTitle}</h1>
          <p className="text-xs text-muted-foreground">
            Tentativa {attempt.attemptsUsed}
            {attempt.maximumAttempts ? ` de ${attempt.maximumAttempts}` : ''} ·{' '}
            Nota mínima: {attempt.minimumPassingScore}%
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {attempt.questions.map((q) => (
          <QuestionWidget
            key={q.id}
            question={q}
            savedAnswer={answers.get(q.id) ?? []}
            onAnswer={handleAnswer}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          {Array.from(answers.values()).filter((a) => a.length > 0).length} / {attempt.totalQuestions} respondidas
        </span>
        {allAnswered && (
          <span className="ml-auto flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Tudo respondido
          </span>
        )}
      </div>

      <Button
        className="w-full"
        disabled={!allAnswered || submitMutation.isPending}
        onClick={() => submitMutation.mutate()}
      >
        {submitMutation.isPending ? 'Enviando…' : 'Entregar teste'}
      </Button>
    </div>
  );
}
