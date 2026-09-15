'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createUserSchema } from '@compliance/validation';
import type { CreateUserInput } from '@compliance/validation';
import { createUser } from '@/lib/users';
import { listStores } from '@/lib/stores';
import { UserRole } from '@compliance/shared';

export default function NewUserPage(): React.JSX.Element {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: storesData } = useQuery({
    queryKey: ['stores-select'],
    queryFn: () => listStores({ limit: 100, active: true }),
  });

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', role: UserRole.STUDENT, storeId: null },
  });

  const watchRole = form.watch('role');

  async function onSubmit(values: CreateUserInput): Promise<void> {
    setServerError(null);
    try {
      await createUser(values);
      router.push('/admin/users');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Novo usuário</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/users">Cancelar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do usuário</CardTitle>
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
                    <FormControl><Input placeholder="João Silva" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="joao@loja.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        {...field}
                        aria-label="Perfil do usuário"
                      >
                        <option value={UserRole.STUDENT}>Aluno</option>
                        <option value={UserRole.STORE_ADMIN}>Admin da Loja</option>
                        <option value={UserRole.MASTER_ADMIN}>Master Admin</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchRole !== UserRole.MASTER_ADMIN && (
                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loja</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          aria-label="Loja do usuário"
                        >
                          <option value="">Selecione uma loja</option>
                          {storesData?.data.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name} ({store.code})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo <span className="text-muted-foreground">(opcional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Vendedor" {...field} value={field.value ?? ''} />
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
                      <FormLabel>Telefone <span className="text-muted-foreground">(opcional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                Um convite de primeiro acesso será enviado ao e-mail informado.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild>
                  <Link href="/admin/users">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Criando…' : 'Criar usuário'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
