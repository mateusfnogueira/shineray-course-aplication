'use client';

import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { listStudentAnnouncements } from '@/lib/announcements';
import { formatDate } from '@/lib/utils';

export default function StudentAnnouncementsPage(): React.JSX.Element {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['student-announcements'],
    queryFn: listStudentAnnouncements,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comunicados</h1>
          <p className="text-sm text-muted-foreground">Avisos e informações importantes</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (announcements ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhum comunicado no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {(announcements ?? []).map((ann) => (
            <div key={ann.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{ann.title}</h2>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(ann.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
