'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { Button, Card, CardContent, CardHeader } from '@compliance/ui';
import { getAttemptResult } from '@/lib/quiz';

export default function QuizResultPage(): React.JSX.Element {
  const { courseId, attemptId } = useParams<{ courseId: string; attemptId: string }>();
  const router = useRouter();

  const { data: result, isLoading, isError } = useQuery({
    queryKey: ['quiz-result', attemptId],
    queryFn: () => getAttemptResult(attemptId),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando resultado…</div>;
  if (isError || !result) return <div className="text-sm text-destructive">Resultado não encontrado.</div>;

  const correctCount = result.questions.filter((q) => q.correct).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Score card */}
      <Card className={result.passed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
        <CardContent className="pt-6 text-center space-y-2">
          {result.passed ? (
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          ) : (
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
          )}
          <h1 className={`text-2xl font-bold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
            {result.passed ? 'Aprovado!' : 'Reprovado'}
          </h1>
          <p className="text-4xl font-extrabold">{result.score}%</p>
          <p className="text-sm text-muted-foreground">
            {correctCount} de {result.questions.length} questões corretas ·{' '}
            Nota mínima: {result.minimumPassingScore}%
          </p>
          <p className="text-xs text-muted-foreground">
            Tentativa {result.attemptNumber}
            {result.maximumAttempts ? ` de ${result.maximumAttempts}` : ''}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/student/courses/${courseId}`}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Voltar ao curso
          </Link>
        </Button>
        {result.canRetry && (
          <Button
            variant="outline"
            onClick={() => router.push(`/student/courses/${courseId}/quiz?retry=1`)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        )}
        {!result.passed && !result.canRetry && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Limite de tentativas atingido
          </div>
        )}
      </div>

      {/* Review */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Revisão das respostas</h2>
        {result.questions.map((q, idx) => (
          <Card key={q.id} className={q.correct ? 'border-green-200' : 'border-red-200'}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                {q.correct ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Questão {idx + 1}</span>
                  <p className="text-sm font-medium leading-snug">{q.statement}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {q.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                    opt.isCorrect
                      ? 'bg-green-50 text-green-800 font-medium'
                      : opt.wasSelected && !opt.isCorrect
                        ? 'bg-red-50 text-red-700'
                        : 'text-muted-foreground'
                  }`}
                >
                  {opt.isCorrect ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  ) : opt.wasSelected ? (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {opt.text}
                  {opt.wasSelected && !opt.isCorrect && (
                    <span className="ml-auto text-xs">(sua resposta)</span>
                  )}
                </div>
              ))}
              {q.explanation && (
                <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                  <strong>Explicação:</strong> {q.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
