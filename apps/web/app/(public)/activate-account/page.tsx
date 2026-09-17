'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { activateAccountSchema } from '@compliance/validation';
import type { ActivateAccountInput } from '@compliance/validation';
import { activateAccount, AuthApiError } from '@/lib/auth';
import { UserRole } from '@compliance/shared';

function ActivateAccountContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ActivateAccountInput>({
    resolver: zodResolver(activateAccountSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-2">
          <h1 className="text-xl font-semibold">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de ativação é inválido ou expirou. Solicite um novo convite ao administrador.
          </p>
        </div>
      </div>
    );
  }

  async function onSubmit(values: ActivateAccountInput): Promise<void> {
    setServerError(null);
    try {
      const { user } = await activateAccount(values.token, values.password);

      // Check for pending legal documents
      const pendingDocs = await fetch(
        `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1/auth/pending-legal-documents`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` },
          credentials: 'include',
        },
      ).then((r) => r.json()) as unknown[];

      if (Array.isArray(pendingDocs) && pendingDocs.length > 0) {
        router.push('/accept-terms');
        return;
      }

      router.push(user.role === UserRole.STUDENT ? '/student' : '/admin');
    } catch (err) {
      setServerError(
        err instanceof AuthApiError ? err.message : 'Ocorreu um erro. Tente novamente.',
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Ative sua conta</h1>
          <p className="text-sm text-muted-foreground">Crie sua senha para acessar a plataforma</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Criar senha</CardTitle>
            <CardDescription>Esta será sua senha de acesso à plataforma</CardDescription>
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Mín. 8 caracteres, com maiúscula, minúscula e número
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Ativando…' : 'Ativar conta'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ActivateAccountPage(): React.JSX.Element {
  return (
    <Suspense>
      <ActivateAccountContent />
    </Suspense>
  );
}
