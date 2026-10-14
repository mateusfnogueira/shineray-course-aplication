'use client';

import { Suspense, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@compliance/ui';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { resetPasswordSchema } from '@compliance/validation';
import type { ResetPasswordInput } from '@compliance/validation';
import { resetPassword, AuthApiError } from '@/lib/auth';
import { LoginBanner } from '@/components/layout/login-banner';

function ResetPasswordContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  const watchedPassword = form.watch('password');
  useEffect(() => {
    form.setValue('confirmPassword', watchedPassword, { shouldValidate: false });
  }, [watchedPassword, form]);

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
    <div className="flex min-h-screen">
      <LoginBanner />

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
            {!token ? (
              <div className="space-y-3 text-center">
                <h2 className="text-lg font-semibold text-[#111111]">Link invalido</h2>
                <p className="text-sm text-[#6B6B7B]">
                  Este link de redefinicao e invalido ou expirou.
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-2 inline-block text-sm text-[#C8151B] hover:underline underline-offset-4"
                >
                  Solicitar novo link
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-[#6B6B7B] hover:text-[#C8151B] transition-colors mb-6"
                >
                  Voltar ao login
                </Link>

                <div className="inline-flex items-center justify-center rounded-xl border border-[#C8151B]/20 bg-[#C8151B]/10 p-3 mb-4">
                  <img src="/icons/key-red-icon.svg" alt="" aria-hidden="true" className="h-6 w-6" />
                </div>

                <h2 className="text-xl font-bold text-[#111111] mb-1">Nova senha</h2>
                <p className="text-sm text-[#6B6B7B] mb-6">
                  Defina uma nova senha segura para acessar a plataforma Shineray.
                </p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <input type="hidden" {...form.register('token')} />
                    <input type="hidden" {...form.register('confirmPassword')} />

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
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-normal text-[#6B6B7B]">
                            Senha
                          </FormLabel>
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
                                autoComplete="new-password"
                                placeholder="••••••••"
                                className="pl-9 pr-9 text-[#6B6B7B] placeholder:text-[#C4C4CC]"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B6B7B]"
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
                      className="w-full bg-[#C8151B] hover:bg-[#a51015] text-white border-0"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? 'Salvando...' : 'Confirmar senha'}
                      {!form.formState.isSubmitting && <ChevronRight className="ml-1 h-4 w-4" />}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </div>
        </div>

        <footer className="mt-6 text-center text-xs text-[#C4C4CC]">
          2026 Shineray Brasil. Todos os direitos reservados.{' '}
          <Link href="/terms" className="hover:underline underline-offset-4">
            Termos e Privacidade
          </Link>
        </footer>
      </div>
    </div>
  );
}

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
