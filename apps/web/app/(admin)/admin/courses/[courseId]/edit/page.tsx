'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateCourseSchema } from '@compliance/validation';
import type { UpdateCourseInput } from '@compliance/validation';
import { getCourse, updateCourse } from '@/lib/courses';

export default function EditCoursePage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId),
  });

  const form = useForm<UpdateCourseInput>({
    resolver: zodResolver(updateCourseSchema),
    values: {
      title: course?.title ?? '',
      shortDescription: course?.shortDescription ?? '',
      description: course?.description ?? '',
      estimatedDurationMinutes: course?.estimatedDurationMinutes ?? 60,
      minimumPassingScore: course?.minimumPassingScore ?? null,
      maximumAttempts: course?.maximumAttempts ?? null,
      certificateEnabled: course?.certificateEnabled ?? false,
    },
  });

  async function onSubmit(values: UpdateCourseInput): Promise<void> {
    setServerError(null);
    try {
      await updateCourse(courseId, values);
      router.push(`/admin/courses/${courseId}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Editar curso</h1>
        <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}`}>Cancelar</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Informações básicas</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {serverError && (
                <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="shortDescription" render={({ field }) => (
                <FormItem><FormLabel>Descrição curta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição completa</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="estimatedDurationMinutes" render={({ field }) => (
                  <FormItem><FormLabel>Duração (min)</FormLabel><FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="minimumPassingScore" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota mínima (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} placeholder="—" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="maximumAttempts" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máx. tentativas</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="Ilimitadas" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="certificateEnabled" render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-md border p-3">
                  <FormControl>
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={field.value ?? false} onChange={(e) => field.onChange(e.target.checked)} id="cert" />
                  </FormControl>
                  <div>
                    <FormLabel htmlFor="cert" className="cursor-pointer">Emitir certificado ao concluir</FormLabel>
                    <FormDescription>Alunos aprovados receberão um certificado</FormDescription>
                  </div>
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}`}>Cancelar</Link></Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
