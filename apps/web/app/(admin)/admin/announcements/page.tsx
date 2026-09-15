'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from '@compliance/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '@/lib/announcements';
import { formatDate } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
});
type FormData = z.infer<typeof schema>;

export default function AnnouncementsAdminPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: listAnnouncements,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', content: '' },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => createAnnouncement(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      form.reset();
      setShowForm(false);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          <h1 className="text-2xl font-bold tracking-tight">Comunicados</h1>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Cancelar' : 'Novo comunicado'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Novo comunicado</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3" noValidate>
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo</FormLabel>
                    <FormControl>
                      <textarea className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Publicando…' : 'Publicar'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="space-y-2">
          {(announcements ?? []).map((ann) => (
            <div key={ann.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{ann.title}</p>
                  <Badge variant={ann.active ? 'success' : 'secondary'}>{ann.active ? 'Ativo' : 'Inativo'}</Badge>
                  <Badge variant="outline">{ann.isGlobal ? 'Global' : `${ann.storeIds.length} loja(s)`}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{ann.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(ann.createdAt)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => { if (confirm('Excluir comunicado?')) deleteMutation.mutate(ann.id); }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(announcements ?? []).length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhum comunicado.</div>
          )}
        </div>
      )}
    </div>
  );
}
