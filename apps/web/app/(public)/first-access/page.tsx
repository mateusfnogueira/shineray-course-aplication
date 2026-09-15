'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button, Input } from '@compliance/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { firstAccessSchema } from '@compliance/validation';
import type { FirstAccessInput } from '@compliance/validation';
import { forgotPassword, AuthApiError } from '@/lib/auth';
import { LoginBanner } from '@/components/layout/login-banner';

type Status = 'idle' | 'success' | 'error';

export default function FirstAccessPage(): React.JSX.Element {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<FirstAccessInput>({
    resolver: zodResolver(firstAccessSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: FirstAccessInput): Promise<void> {
    setErrorMessage(null);
    try {
      await forgotPassword(values.email);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof AuthApiError ? err.message : 'Ocorreu um erro. Tente novamente.',
      );
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
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-[#6B6B7B] hover:text-[#C8151B] transition-colors mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </Link>

            {status === 'success' ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#C8151B]/20 bg-[#C8151B]/10 px-3 py-1">
                  <Image
                    src="/icons/shineray-icon.png"
                    alt=""
                    aria-hidden="true"
                    width={16}
                    height={16}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#C8151B]">
                    Primeiro Acesso
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-[#111111] mt-3">E-mail enviado!</h2>
                <p className="text-sm text-[#6B6B7B]">
                  Se o e-mail estiver cadastrado, você receberá o link de criação de senha em instantes.
                  Verifique sua caixa de entrada.
                </p>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#C8151B]/20 bg-[#C8151B]/10 px-3 py-1 mb-4">
                  <Image
                    src="/icons/shineray-icon.png"
                    alt=""
                    aria-hidden="true"
                    width={16}
                    height={16}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#C8151B]">
                    Primeiro Acesso
                  </span>
                </div>

                <h2 className="text-xl font-bold text-[#111111] mb-1">Ativação de conta Shineray</h2>
                <p className="text-sm text-[#6B6B7B] mb-6">
                  Informe o e-mail cadastrado pela Shineray para receber o link de criação da sua senha.
                </p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    {errorMessage && (
                      <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#C8151B]"
                      >
                        {errorMessage}
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

                    <Button
                      type="submit"
                      className="w-full bg-[#C8151B] hover:bg-[#a51015] text-white border-0"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? 'Enviando…' : 'Enviar link de ativação'}
                      {!form.formState.isSubmitting && <ChevronRight className="ml-1 h-4 w-4" />}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </div>
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
