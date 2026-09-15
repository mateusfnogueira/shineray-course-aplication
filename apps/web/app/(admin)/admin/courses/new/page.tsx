'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createCourseSchema } from '@compliance/validation';
import type { CreateCourseInput } from '@compliance/validation';
import { createCourse } from '@/lib/courses';

export default function NewCoursePage(): React.JSX.Element {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: '',
      shortDescription: '',
      description: '',
      estimatedDurationMinutes: 60,
      certificateEnabled: false,
    },
  });

  async function onSubmit(values: CreateCourseInput): Promise<void> {
    setServerError(null);
    try {
      const course = await createCourse(values);
      router.push(`/admin/courses/${course.id}/modules`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar curso');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Novo curso</h1>
        <Button variant="outline" asChild><Link href="/admin/courses">Cancelar</Link></Button>
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
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl><Input placeholder="Ética e Compliance nas Vendas" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="shortDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição curta</FormLabel>
                  <FormControl>
                    <Input placeholder="Resumo exibido no catálogo (máx. 500 chars)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição completa</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Descreva os objetivos e conteúdo do curso…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="estimatedDurationMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="minimumPassingScore" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota mínima (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="ex: 70"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormDescription>Necessária se o curso tiver teste</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="maximumAttempts" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máx. tentativas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ilimitadas"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="certificateEnabled" render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-md border p-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      id="certificateEnabled"
                    />
                  </FormControl>
                  <div>
                    <FormLabel htmlFor="certificateEnabled" className="cursor-pointer">
                      Emitir certificado ao concluir
                    </FormLabel>
                    <FormDescription>Alunos aprovados receberão um certificado</FormDescription>
                  </div>
                </FormItem>
              )} />

              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                O curso será criado como <strong>Rascunho</strong>. Você poderá adicionar módulos, aulas e lojas antes de publicar.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild><Link href="/admin/courses">Cancelar</Link></Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Criando…' : 'Criar e adicionar conteúdo'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
