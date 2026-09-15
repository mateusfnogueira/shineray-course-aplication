'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { resetPasswordSchema } from '@compliance/validation';
import type { ResetPasswordInput } from '@compliance/validation';
import { resetPassword, AuthApiError } from '@/lib/auth';

export default function ResetPasswordPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-muted-foreground">
            Link inválido. Solicite um novo link de redefinição.
          </p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordInput): Promise<void> {
    setServerError(null);
    try {
      await resetPassword(values.token, values.password);
      router.push('/login?reset=success');
    } catch (err) {
      setServerError(err instanceof AuthApiError ? err.message : 'Ocorreu um erro. Tente novamente.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Nova senha</h1>
          <p className="text-sm text-muted-foreground">Defina sua nova senha de acesso</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Redefinir senha</CardTitle>
            <CardDescription>Crie uma senha forte para sua conta</CardDescription>
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
                      <FormLabel>Nova senha</FormLabel>
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
                  {form.formState.isSubmitting ? 'Salvando…' : 'Redefinir senha'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
