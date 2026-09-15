'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@compliance/ui';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/notifications';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function StudentNotificationsPage(): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['student-notifications'],
    queryFn: listNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student-notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student-notifications'] }),
  });

  const unreadCount = (notifications ?? []).filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}` : 'Tudo lido'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (notifications ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nenhuma notificação.
        </div>
      ) : (
        <div className="space-y-1.5">
          {(notifications ?? []).map((n) => (
            <button
              key={n.id}
              onClick={() => { if (!n.readAt) markReadMutation.mutate(n.id); }}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                n.readAt ? 'bg-card opacity-70' : 'bg-card border-primary/20 hover:bg-accent',
              )}
              aria-label={n.readAt ? n.title : `Marcar como lida: ${n.title}`}
            >
              <div className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary')} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', n.readAt && 'font-normal text-muted-foreground')}>
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
