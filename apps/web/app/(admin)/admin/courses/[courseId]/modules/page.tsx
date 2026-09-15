'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Trash2, ChevronUp, ChevronDown, Video, FileText, File } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Separator } from '@compliance/ui';
import { getCourse, createModule, updateModule, deleteModule, reorderModules, createLesson, updateLesson, deleteLesson } from '@/lib/courses';
import type { ModuleDto, LessonDto } from '@/lib/courses';

// ─── YouTube URL validation helper ───────────────────────────────────────────
function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes('youtube.com') && u.pathname === '/watch') return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1] ?? null;
  } catch { /* not a URL */ }
  return null;
}

const LESSON_TYPE_ICONS: Record<string, React.ReactNode> = {
  VIDEO: <Video className="h-3.5 w-3.5" />,
  TEXT: <FileText className="h-3.5 w-3.5" />,
  SLIDES: <File className="h-3.5 w-3.5" />,
  DOCUMENT: <File className="h-3.5 w-3.5" />,
};

// ─── Lesson row component ─────────────────────────────────────────────────────

function LessonRow({
  lesson,
  courseId,
  isFirst,
  isLast,
  onReorder,
  onDelete,
}: {
  lesson: LessonDto;
  courseId: string;
  isFirst: boolean;
  isLast: boolean;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [youtubeUrl, setYoutubeUrl] = useState(lesson.youtubeVideoId ?? '');
  const [urlError, setUrlError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; youtubeUrl?: string }) =>
      updateLesson(courseId, lesson.id, data),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  function handleSave(): void {
    setUrlError(null);
    const data: { title?: string; youtubeUrl?: string } = { title };
    if (lesson.type === 'VIDEO' && youtubeUrl) {
      if (!parseYouTubeId(youtubeUrl)) {
        setUrlError('URL do YouTube inválida');
        return;
      }
      data.youtubeUrl = youtubeUrl;
    }
    updateMutation.mutate(data);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-2">
      <div className="flex flex-col gap-0.5">
        <button onClick={() => onReorder(lesson.id, 'up')} disabled={isFirst} className="rounded p-0.5 hover:bg-muted disabled:opacity-30" aria-label="Mover aula para cima"><ChevronUp className="h-3 w-3" /></button>
        <button onClick={() => onReorder(lesson.id, 'down')} disabled={isLast} className="rounded p-0.5 hover:bg-muted disabled:opacity-30" aria-label="Mover aula para baixo"><ChevronDown className="h-3 w-3" /></button>
      </div>

      <span className="flex items-center gap-1 text-muted-foreground">{LESSON_TYPE_ICONS[lesson.type]}</span>

      {editing ? (
        <div className="flex flex-1 flex-col gap-1.5">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-sm" aria-label="Título da aula" />
          {lesson.type === 'VIDEO' && (
            <div>
              <Input
                value={youtubeUrl}
                onChange={(e) => { setYoutubeUrl(e.target.value); setUrlError(null); }}
                placeholder="https://youtube.com/watch?v=... ou ID direto"
                className="h-7 text-xs"
                aria-label="URL do YouTube"
              />
              {urlError && <p className="text-xs text-destructive mt-0.5">{urlError}</p>}
              {lesson.youtubeEmbedUrl && !urlError && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID atual: {lesson.youtubeVideoId}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '…' : 'Salvar'}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm">
            {lesson.title}
            {!lesson.required && <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>}
          </span>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(true)}>Editar</Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(lesson.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Add lesson form ──────────────────────────────────────────────────────────

function AddLessonForm({
  courseId,
  moduleId,
  nextOrder,
  onCancel,
}: {
  courseId: string;
  moduleId: string;
  nextOrder: number;
  onCancel: () => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('VIDEO');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [required, setRequired] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof createLesson>[2]) =>
      createLesson(courseId, moduleId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      onCancel();
    },
  });

  function handleAdd(): void {
    setUrlError(null);
    if (!title.trim()) return;
    if (type === 'VIDEO' && !parseYouTubeId(youtubeUrl)) {
      setUrlError('URL ou ID do YouTube inválido');
      return;
    }
    mutation.mutate({
      title,
      type: type as 'VIDEO' | 'TEXT' | 'SLIDES' | 'DOCUMENT',
      order: nextOrder,
      required,
      youtubeUrl: type === 'VIDEO' ? youtubeUrl : undefined,
      textContent: type === 'TEXT' ? textContent : undefined,
    });
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da aula"
        className="h-8 text-sm"
        aria-label="Título da nova aula"
      />
      <div className="flex items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Tipo da aula"
        >
          <option value="VIDEO">Vídeo (YouTube)</option>
          <option value="TEXT">Texto</option>
          <option value="SLIDES">Slides</option>
          <option value="DOCUMENT">Documento</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Obrigatória
        </label>
      </div>

      {type === 'VIDEO' && (
        <div>
          <Input
            value={youtubeUrl}
            onChange={(e) => { setYoutubeUrl(e.target.value); setUrlError(null); }}
            placeholder="https://youtube.com/watch?v=ID ou ID direto"
            className="h-8 text-xs"
            aria-label="URL do YouTube"
          />
          {urlError && <p className="text-xs text-destructive mt-1">{urlError}</p>}
        </div>
      )}

      {type === 'TEXT' && (
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Conteúdo da aula em texto…"
          className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Conteúdo da aula"
        />
      )}

      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={mutation.isPending || !title.trim()}>
          {mutation.isPending ? 'Adicionando…' : 'Adicionar aula'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ─── Module card ──────────────────────────────────────────────────────────────

function ModuleCard({
  module,
  courseId,
  isFirst,
  isLast,
  onModuleReorder,
}: {
  module: ModuleDto;
  courseId: string;
  isFirst: boolean;
  isLast: boolean;
  onModuleReorder: (id: string, direction: 'up' | 'down') => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [addingLesson, setAddingLesson] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(module.title);

  const updateModuleMutation = useMutation({
    mutationFn: (data: { title: string }) => updateModule(courseId, module.id, data),
    onSuccess: () => {
      setEditingTitle(false);
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: () => deleteModule(courseId, module.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => deleteLesson(courseId, lessonId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: ({ direction, lessonId }: { direction: 'up' | 'down'; lessonId: string }) => {
      const lessons = [...module.lessons].sort((a, b) => a.order - b.order);
      const idx = lessons.findIndex((l) => l.id === lessonId);
      if (idx === -1) return Promise.resolve();
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= lessons.length) return Promise.resolve();
      // Swap
      const newOrder = lessons.map((l) => l.id);
      const [removed] = newOrder.splice(idx, 1);
      newOrder.splice(swapIdx, 0, removed ?? '');
      return import('@/lib/courses').then(({ reorderLessons }) =>
        reorderLessons(courseId, module.id, newOrder),
      );
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  const sortedLessons = [...module.lessons].sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5 shrink-0">
            <button onClick={() => onModuleReorder(module.id, 'up')} disabled={isFirst} className="rounded p-0.5 hover:bg-muted disabled:opacity-30" aria-label="Mover módulo para cima"><ChevronUp className="h-3 w-3" /></button>
            <button onClick={() => onModuleReorder(module.id, 'down')} disabled={isLast} className="rounded p-0.5 hover:bg-muted disabled:opacity-30" aria-label="Mover módulo para baixo"><ChevronDown className="h-3 w-3" /></button>
          </div>

          {editingTitle ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-7 flex-1 text-sm font-medium"
                aria-label="Título do módulo"
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateModuleMutation.mutate({ title })} disabled={updateModuleMutation.isPending}>
                {updateModuleMutation.isPending ? '…' : 'Salvar'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingTitle(false)}>Cancelar</Button>
            </div>
          ) : (
            <>
              <CardTitle className="flex-1 text-sm">{module.order}. {module.title}</CardTitle>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingTitle(true)}>Editar</Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Excluir módulo "${module.title}" e todas as suas aulas?`)) {
                    deleteModuleMutation.mutate();
                  }
                }}
                disabled={deleteModuleMutation.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5">
        {sortedLessons.map((lesson, idx) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            courseId={courseId}
            isFirst={idx === 0}
            isLast={idx === sortedLessons.length - 1}
            onReorder={(id, dir) => reorderLessonsMutation.mutate({ lessonId: id, direction: dir })}
            onDelete={(id) => {
              if (confirm(`Excluir aula "${lesson.title}"?`)) {
                deleteLessonMutation.mutate(id);
              }
            }}
          />
        ))}

        {addingLesson ? (
          <AddLessonForm
            courseId={courseId}
            moduleId={module.id}
            nextOrder={sortedLessons.length + 1}
            onCancel={() => setAddingLesson(false)}
          />
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs border-dashed"
            onClick={() => setAddingLesson(true)}
          >
            <Plus className="mr-1 h-3 w-3" /> Adicionar aula
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ModulesPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId),
  });

  const createModuleMutation = useMutation({
    mutationFn: (title: string) =>
      createModule(courseId, {
        title,
        order: (course?.modules.length ?? 0) + 1,
      }),
    onSuccess: () => {
      setNewModuleTitle('');
      setAddingModule(false);
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  const reorderModulesMutation = useMutation({
    mutationFn: ({ direction, moduleId }: { direction: 'up' | 'down'; moduleId: string }) => {
      const modules = [...(course?.modules ?? [])].sort((a, b) => a.order - b.order);
      const idx = modules.findIndex((m) => m.id === moduleId);
      if (idx === -1) return Promise.resolve();
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= modules.length) return Promise.resolve();
      const newOrder = modules.map((m) => m.id);
      const [removed] = newOrder.splice(idx, 1);
      newOrder.splice(swapIdx, 0, removed ?? '');
      return reorderModules(courseId, newOrder);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const sortedModules = [...(course?.modules ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Módulos e aulas</h1>
          <p className="text-sm text-muted-foreground">{course?.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}`}>Voltar</Link></Button>
          <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}/stores`}>Lojas</Link></Button>
          <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}/publish`}>Publicar</Link></Button>
        </div>
      </div>

      <Separator />

      {sortedModules.map((module, idx) => (
        <ModuleCard
          key={module.id}
          module={module}
          courseId={courseId}
          isFirst={idx === 0}
          isLast={idx === sortedModules.length - 1}
          onModuleReorder={(id, dir) => reorderModulesMutation.mutate({ moduleId: id, direction: dir })}
        />
      ))}

      {addingModule ? (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Input
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="Título do módulo"
              className="h-9"
              aria-label="Título do novo módulo"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createModuleMutation.mutate(newModuleTitle)}
                disabled={createModuleMutation.isPending || !newModuleTitle.trim()}
              >
                {createModuleMutation.isPending ? 'Criando…' : 'Criar módulo'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingModule(false); setNewModuleTitle(''); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setAddingModule(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar módulo
        </Button>
      )}
    </div>
  );
}
