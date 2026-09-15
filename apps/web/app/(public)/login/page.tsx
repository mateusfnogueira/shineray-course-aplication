'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, ChevronRight } from 'lucide-react';
import { Button, Input } from '@compliance/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { loginSchema } from '@compliance/validation';
import type { LoginInput } from '@compliance/validation';
import { login, AuthApiError } from '@/lib/auth';
import { UserRole } from '@compliance/shared';
import { LoginBanner } from '@/components/layout/login-banner';

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput): Promise<void> {
    setServerError(null);
    try {
      const { user } = await login(values.email, values.password);

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

      const destination = user.role === UserRole.STUDENT ? '/student' : '/admin';
      router.push(destination);
    } catch (err) {
      if (err instanceof AuthApiError) {
        setServerError(err.message);
      } else {
        setServerError('Ocorreu um erro. Tente novamente.');
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <LoginBanner />

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-between bg-[#F5F5F7] px-4 py-8">
        <div className="w-full max-w-[380px] flex flex-1 flex-col items-center justify-center gap-7">
          <Image
            src="/images/shineray-logo.png"
            alt="Shineray"
            width={160}
            height={48}
            className="h-auto"
            priority
          />

          <div className="w-full rounded-2xl bg-white shadow-sm px-8 py-8">
            <h2 className="text-2xl font-bold text-[#111111] mb-1">Bem-vindo(a)!</h2>
            <p className="text-sm text-[#6B6B7B] mb-6">
              Faça login para continuar seus treinamentos.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {serverError && (
                  <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#C8151B]"
                  >
                    {serverError}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal text-[#6B6B7B]">
                        E-mail corporativo
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <img
                            src="/icons/mail-icon.svg"
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                          />
                          <Input
                            type="email"
                            placeholder="nome@shineray.com"
                            autoComplete="email"
                            className="pl-9 text-[#6B6B7B] placeholder:text-[#C4C4CC]"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm font-normal text-[#6B6B7B]">Senha</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-xs text-[#C8151B] underline-offset-4 hover:underline"
                        >
                          Esqueci minha senha
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <img
                            src="/icons/locker-icon.svg"
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                          />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            className="pl-9 pr-9 text-[#6B6B7B]"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => { setShowPassword((v) => !v); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C4C4CC] hover:text-[#6B6B7B] transition-colors"
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#C8151B] hover:bg-[#a51015] text-white border-0 mt-2"
                  disabled={form.formState.isSubmitting}
                  aria-label="Entrar na plataforma"
                >
                  {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
                  {!form.formState.isSubmitting && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-sm text-[#6B6B7B]">
            Primeiro acesso?{' '}
            <Link
              href="/first-access"
              className="font-semibold text-[#C8151B] underline-offset-4 hover:underline"
            >
              Crie sua conta
            </Link>
          </p>
        </div>

        <footer className="mt-6 text-center text-xs text-[#C4C4CC]">
          © 2026 Shineray Brasil. Todos os direitos reservados.{' '}
          <Link href="/terms" className="hover:underline underline-offset-4">
            Termos e Privacidade
          </Link>
        </footer>
      </div>
    </div>
  );
}

