'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  PlayCircle,
  FileText,
  File,
} from 'lucide-react';
import { Button, Separator } from '@compliance/ui';
import { YouTubePlayer } from '@/components/ui/youtube-player';
import { CourseProgress } from '@/components/ui/course-progress';
import {
  startCourse,
  getEnrollment,
  startLesson,
  completeLesson,
} from '@/lib/student';
import type { EnrollmentDetailDto, LessonWithProgressDto } from '@/lib/student';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  VIDEO: <PlayCircle className="h-3.5 w-3.5 shrink-0" />,
  TEXT: <FileText className="h-3.5 w-3.5 shrink-0" />,
  SLIDES: <File className="h-3.5 w-3.5 shrink-0" />,
  DOCUMENT: <File className="h-3.5 w-3.5 shrink-0" />,
};

function flattenLessons(enrollment: EnrollmentDetailDto): LessonWithProgressDto[] {
  return enrollment.modules.flatMap((m) => m.lessons);
}

function findFirstUncompletedLesson(enrollment: EnrollmentDetailDto): LessonWithProgressDto | null {
  for (const module of enrollment.modules) {
    for (const lesson of module.lessons) {
      if (!lesson.progress?.completedAt) return lesson;
    }
  }
  return enrollment.modules[0]?.lessons[0] ?? null;
}

function LearnContent(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    searchParams.get('lessonId'),
  );

  // Step 1: ensure enrolled
  const startMutation = useMutation({
    mutationFn: () => startCourse(courseId),
    onSuccess: (data) => {
      setEnrollmentId(data.id);
      if (!activeLessonId) {
        const first = findFirstUncompletedLesson(data);
        if (first) setActiveLessonId(first.id);
      }
    },
  });

  useEffect(() => {
    startMutation.mutate();
  }, []); // runs once on mount

  // Step 2: fetch enrollment with progress
  const { data: enrollment, isLoading } = useQuery({
    queryKey: ['enrollment', enrollmentId],
    queryFn: () => getEnrollment(enrollmentId!),
    enabled: !!enrollmentId,
    refetchOnWindowFocus: false,
  });

  const startLessonMutation = useMutation({
    mutationFn: (lessonId: string) => startLesson(enrollmentId!, lessonId),
  });

  const completeLessonMutation = useMutation({
    mutationFn: (lessonId: string) => completeLesson(enrollmentId!, lessonId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
      if (data.enrollmentCompleted) {
        router.push(`/student/courses/${courseId}`);
      }
    },
  });

  // Track current lesson
  const activeLesson = useMemo<LessonWithProgressDto | null>(() => {
    if (!enrollment || !activeLessonId) return null;
    return flattenLessons(enrollment).find((l) => l.id === activeLessonId) ?? null;
  }, [enrollment, activeLessonId]);

  const allLessons = enrollment ? flattenLessons(enrollment) : [];
  const activeIdx = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const prevLesson = activeIdx > 0 ? allLessons[activeIdx - 1] : null;
  const nextLesson = activeIdx < allLessons.length - 1 ? allLessons[activeIdx + 1] : null;

  const selectLesson = useCallback(
    (lesson: LessonWithProgressDto) => {
      setActiveLessonId(lesson.id);
      setSidebarOpen(false);
      if (enrollmentId) {
        startLessonMutation.mutate(lesson.id);
      }
    },
    [enrollmentId, startLessonMutation],
  );

  // Start current lesson when first selected
  useEffect(() => {
    if (enrollmentId && activeLessonId && !activeLesson?.progress?.startedAt) {
      startLessonMutation.mutate(activeLessonId);
    }
  }, [enrollmentId, activeLessonId]); // activeLesson is derived from these two deps

  if (isLoading || !enrollment) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando curso…</p>
      </div>
    );
  }

  const progressPct = enrollment.progressPercentage;

  // ─── Lesson sidebar ──────────────────────────────────────────────────────────

  const LessonSidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conteúdo
        </p>
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded p-1 hover:bg-accent lg:hidden"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b p-3">
        <CourseProgress percentage={progressPct} size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto" aria-label="Módulos e aulas">
        {enrollment.modules.map((module) => (
          <div key={module.id}>
            <p className="sticky top-0 bg-background/95 px-3 py-2 text-xs font-semibold text-muted-foreground backdrop-blur">
              {module.order}. {module.title}
            </p>
            {module.lessons.map((lesson) => {
              const isActive = lesson.id === activeLessonId;
              const isDone = !!lesson.progress?.completedAt;

              return (
                <button
                  key={lesson.id}
                  onClick={() => selectLesson(lesson)}
                  className={cn(
                    'flex w-full items-start gap-2 px-4 py-2 text-left text-xs transition-colors hover:bg-accent',
                    isActive && 'bg-accent font-medium',
                  )}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`${lesson.title}${isDone ? ' (concluída)' : ''}`}
                >
                  {isDone ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className="leading-snug">{lesson.title}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground/70">
                    {TYPE_ICONS[lesson.type]}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );

  // ─── Main content ─────────────────────────────────────────────────────────────

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] lg:-m-6">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 overflow-hidden border-r lg:block">
        {LessonSidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      <aside
        className={cn(
          'fixed inset-y-14 left-0 z-50 w-64 overflow-hidden border-r bg-background transition-transform duration-200 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {LessonSidebar}
      </aside>

      {/* Lesson area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded p-1 hover:bg-accent lg:hidden"
            aria-label="Abrir menu de aulas"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href={`/student/courses/${courseId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao curso
          </Link>
        </div>

        {/* Lesson content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {!activeLesson ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Selecione uma aula</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              <div>
                <h2 className="text-xl font-bold">{activeLesson.title}</h2>
                {activeLesson.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{activeLesson.description}</p>
                )}
              </div>

              {/* VIDEO */}
              {activeLesson.type === 'VIDEO' && activeLesson.youtubeEmbedUrl && activeLesson.youtubeVideoId && (
                <YouTubePlayer
                  videoId={activeLesson.youtubeVideoId}
                  title={activeLesson.title}
                  startSeconds={activeLesson.progress?.lastPositionSeconds ?? undefined}
                />
              )}

              {activeLesson.type === 'VIDEO' && !activeLesson.youtubeVideoId && (
                <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Vídeo não disponível</p>
                </div>
              )}

              {/* TEXT */}
              {activeLesson.type === 'TEXT' && (
                <div
                  className="prose prose-sm max-w-none rounded-lg border bg-card p-4"
                  aria-label="Conteúdo da aula"
                >
                  <p className="whitespace-pre-wrap text-sm">{activeLesson.textContent}</p>
                </div>
              )}

              {/* SLIDES / DOCUMENT */}
              {(activeLesson.type === 'SLIDES' || activeLesson.type === 'DOCUMENT') && (
                <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
                  <div className="text-center">
                    <File className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Visualização de {activeLesson.type === 'SLIDES' ? 'slides' : 'documento'} disponível em breve
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Navigation and complete */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && selectLesson(prevLesson)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>

                {!activeLesson.progress?.completedAt ? (
                  <Button
                    onClick={() => completeLessonMutation.mutate(activeLesson.id)}
                    disabled={completeLessonMutation.isPending}
                    className="flex-1 max-w-xs"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {completeLessonMutation.isPending ? 'Registrando…' : 'Marcar como concluída'}
                  </Button>
                ) : (
                  <div className="flex flex-1 max-w-xs items-center justify-center gap-1.5 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Aula concluída
                  </div>
                )}

                <Button
                  variant="outline"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && selectLesson(nextLesson)}
                >
                  Próxima
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LearnPage(): React.JSX.Element {
  return (
    <Suspense>
      <LearnContent />
    </Suspense>
  );
}
