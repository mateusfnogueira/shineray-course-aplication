'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createStoreSchema } from '@compliance/validation';
import type { CreateStoreInput } from '@compliance/validation';
import { createStore } from '@/lib/stores';

export default function NewStorePage(): React.JSX.Element {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: { name: '', code: '' },
  });

  async function onSubmit(values: CreateStoreInput): Promise<void> {
    setServerError(null);
    try {
      await createStore(values);
      router.push('/admin/stores');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar loja');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Nova loja</h1>
        <Button variant="outline" asChild><Link href="/admin/stores">Cancelar</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados da loja</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {serverError && (
                <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da loja</FormLabel>
                  <FormControl><Input placeholder="Loja Centro São Paulo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código único</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="SP-001"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade <span className="text-muted-foreground">(opcional)</span></FormLabel>
                    <FormControl><Input placeholder="São Paulo" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado <span className="text-muted-foreground">(UF)</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="document" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ <span className="text-muted-foreground">(opcional)</span></FormLabel>
                  <FormControl><Input placeholder="12.345.678/0001-99" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild><Link href="/admin/stores">Cancelar</Link></Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Criando…' : 'Criar loja'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
