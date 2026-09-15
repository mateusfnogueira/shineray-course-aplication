'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateUserSchema } from '@compliance/validation';
import type { UpdateUserInput } from '@compliance/validation';
import { getUser, updateUser } from '@/lib/users';

export default function EditUserPage(): React.JSX.Element {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  });

  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    values: {
      name: user?.name ?? '',
      phone: user?.phone ?? null,
      position: user?.position ?? null,
    },
  });

  async function onSubmit(values: UpdateUserInput): Promise<void> {
    setServerError(null);
    try {
      await updateUser(userId, values);
      router.push(`/admin/users/${userId}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao atualizar usuário');
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Editar usuário</h1>
        <Button variant="outline" asChild>
          <Link href={`/admin/users/${userId}`}>Cancelar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {serverError && (
                <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild>
                  <Link href={`/admin/users/${userId}`}>Cancelar</Link>
                </Button>
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
