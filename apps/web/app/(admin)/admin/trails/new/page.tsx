'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createTrail } from '@/lib/trails';

const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

export default function NewTrailPage(): React.JSX.Element {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', active: true },
  });

  async function onSubmit(values: FormData): Promise<void> {
    setServerError(null);
    try {
      const trail = await createTrail(values);
      router.push(`/admin/trails/${trail.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar trilha');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Nova trilha</h1>
        <Button variant="outline" asChild><Link href="/admin/trails">Cancelar</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Informações da trilha</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {serverError && (
                <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</div>
              )}
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Trilha de Atendimento ao Cliente" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <textarea className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Descreva o objetivo desta trilha…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-md border p-3">
                  <FormControl><input type="checkbox" className="h-4 w-4 accent-primary" checked={field.value} onChange={e => field.onChange(e.target.checked)} id="active" /></FormControl>
                  <FormLabel htmlFor="active" className="cursor-pointer">Trilha ativa (visível para alunos)</FormLabel>
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild><Link href="/admin/trails">Cancelar</Link></Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Criando…' : 'Criar trilha'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
