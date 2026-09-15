'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Trash2, CheckCircle2, Settings } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@compliance/ui';
import {
  getQuiz,
  createQuiz,
  updateQuiz,
  createQuestion,
  deleteQuestion,
} from '@/lib/quiz';
import type { QuestionAdminDto, OptionAdminDto } from '@/lib/quiz';

type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Escolha única',
  MULTIPLE_CHOICE: 'Múltipla escolha',
  TRUE_FALSE: 'Verdadeiro ou Falso',
};

interface NewOptionState { text: string; isCorrect: boolean }
interface NewQuestionState {
  statement: string;
  type: QuestionType;
  explanation: string;
  options: NewOptionState[];
}

function defaultOptions(type: QuestionType): NewOptionState[] {
  if (type === 'TRUE_FALSE') return [{ text: 'Verdadeiro', isCorrect: false }, { text: 'Falso', isCorrect: false }];
  return [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
}

function QuestionCard({
  question,
  courseId,
  onDeleted,
}: {
  question: QuestionAdminDto;
  courseId: string;
  onDeleted: () => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteQuestion(question.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] });
      onDeleted();
    },
  });

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <span className="text-xs text-muted-foreground">{TYPE_LABELS[question.type as QuestionType] ?? question.type}</span>
          <p className="text-sm font-medium leading-snug">{question.statement}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-destructive hover:text-destructive shrink-0"
          onClick={() => { if (confirm('Excluir questão?')) deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
          aria-label="Excluir questão"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="ml-2 space-y-0.5">
        {question.options.map((opt: OptionAdminDto) => (
          <div key={opt.id} className={`flex items-center gap-1.5 text-xs ${opt.isCorrect ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
            {opt.isCorrect ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current inline-block" />}
            {opt.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddQuestionForm({ quizId, courseId, nextOrder, onClose }: {
  quizId: string; courseId: string; nextOrder: number; onClose: () => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [state, setState] = useState<NewQuestionState>({
    statement: '',
    type: 'SINGLE_CHOICE',
    explanation: '',
    options: defaultOptions('SINGLE_CHOICE'),
  });

  const mutation = useMutation({
    mutationFn: () => createQuestion(quizId, {
      statement: state.statement,
      type: state.type,
      explanation: state.explanation || undefined,
      order: nextOrder,
      options: state.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i + 1 })),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] });
      onClose();
    },
  });

  function setType(type: QuestionType): void {
    setState((s) => ({ ...s, type, options: defaultOptions(type) }));
  }

  function setOption(index: number, field: 'text' | 'isCorrect', value: string | boolean): void {
    setState((s) => {
      const options = [...s.options];
      options[index] = { ...options[index], [field]: value } as NewOptionState;
      // For SINGLE_CHOICE and TRUE_FALSE, only one correct
      if (field === 'isCorrect' && value && state.type !== 'MULTIPLE_CHOICE') {
        options.forEach((o, i) => { if (i !== index) options[i] = { ...o, isCorrect: false }; });
      }
      return { ...s, options };
    });
  }

  const canSubmit = state.statement.trim().length >= 5 &&
    state.options.every((o) => o.text.trim()) &&
    state.options.some((o) => o.isCorrect);

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={state.type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Tipo da questão"
        >
          {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <textarea
        value={state.statement}
        onChange={(e) => setState((s) => ({ ...s, statement: e.target.value }))}
        placeholder="Enunciado da questão (mín. 5 caracteres)"
        className="flex w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Enunciado"
      />

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Opções (marque a correta)</p>
        {state.options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type={state.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
              name={`correct-${quizId}`}
              checked={opt.isCorrect}
              onChange={(e) => setOption(idx, 'isCorrect', e.target.checked)}
              className="h-4 w-4 accent-green-600 shrink-0"
              aria-label={`Marcar opção ${idx + 1} como correta`}
            />
            {state.type === 'TRUE_FALSE' ? (
              <span className="text-sm">{opt.text}</span>
            ) : (
              <Input
                value={opt.text}
                onChange={(e) => setOption(idx, 'text', e.target.value)}
                placeholder={`Opção ${idx + 1}`}
                className="h-7 text-sm"
                aria-label={`Texto da opção ${idx + 1}`}
              />
            )}
          </div>
        ))}
        {state.type !== 'TRUE_FALSE' && state.options.length < 6 && (
          <button
            onClick={() => setState((s) => ({ ...s, options: [...s.options, { text: '', isCorrect: false }] }))}
            className="text-xs text-primary hover:underline"
            type="button"
          >
            + Adicionar opção
          </button>
        )}
      </div>

      <Input
        value={state.explanation}
        onChange={(e) => setState((s) => ({ ...s, explanation: e.target.value }))}
        placeholder="Explicação (opcional — exibida após a submissão)"
        className="h-7 text-xs"
        aria-label="Explicação"
      />

      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !canSubmit}
        >
          {mutation.isPending ? 'Salvando…' : 'Adicionar questão'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );
}

export default function QuizBuilderPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['admin-quiz', courseId],
    queryFn: () => getQuiz(courseId),
  });

  const createQuizMutation = useMutation({
    mutationFn: () => createQuiz(courseId, {
      title: 'Teste Final',
      minimumPassingScore: 70,
      shuffleQuestions: false,
      shuffleAnswers: false,
    }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { active?: boolean; minimumPassingScore?: number }) =>
      updateQuiz(quiz!.id, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Teste do curso</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}`}>Voltar</Link></Button>
          <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}/publish`}>Publicar</Link></Button>
        </div>
      </div>

      {!quiz ? (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Este curso não possui teste.</p>
            <Button onClick={() => createQuizMutation.mutate()} disabled={createQuizMutation.isPending}>
              {createQuizMutation.isPending ? 'Criando…' : 'Criar teste'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{quiz.title}</CardTitle>
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="rounded p-1 hover:bg-accent"
                  aria-label="Configurações do teste"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Nota mínima: <strong>{quiz.minimumPassingScore}%</strong></span>
                <span>Tentativas: <strong>{quiz.maximumAttempts ?? 'Ilimitadas'}</strong></span>
                <span>{quiz.shuffleQuestions ? '🔀 Questões embaralhadas' : 'Questões em ordem'}</span>
                <span>Status: <strong className={quiz.active ? 'text-green-600' : 'text-muted-foreground'}>{quiz.active ? 'Ativo' : 'Inativo'}</strong></span>
              </div>

              {showSettings && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5">
                      <span className="text-xs">Nota mínima (%):</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={quiz.minimumPassingScore}
                        onBlur={(e) => updateMutation.mutate({ minimumPassingScore: Number(e.target.value) })}
                        className="h-7 w-20 text-xs"
                        aria-label="Nota mínima"
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => updateMutation.mutate({ active: !quiz.active })}
                    className={`text-xs font-medium ${quiz.active ? 'text-orange-600' : 'text-green-600'} hover:underline`}
                    type="button"
                  >
                    {quiz.active ? 'Inativar teste' : 'Ativar teste'}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Questões ({quiz.questionCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quiz.questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  courseId={courseId}
                  onDeleted={() => undefined}
                />
              ))}

              {addingQuestion ? (
                <AddQuestionForm
                  quizId={quiz.id}
                  courseId={courseId}
                  nextOrder={quiz.questionCount + 1}
                  onClose={() => setAddingQuestion(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setAddingQuestion(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar questão
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
