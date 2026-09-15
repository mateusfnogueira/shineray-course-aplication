'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@compliance/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateStoreSchema } from '@compliance/validation';
import type { UpdateStoreInput } from '@compliance/validation';
import { getStore, updateStore } from '@/lib/stores';

export default function EditStorePage(): React.JSX.Element {
  const { storeId } = useParams<{ storeId: string }>();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => getStore(storeId),
  });

  const form = useForm<UpdateStoreInput>({
    resolver: zodResolver(updateStoreSchema),
    values: {
      name: store?.name ?? '',
      code: store?.code ?? '',
      document: store?.document ?? null,
      region: store?.region ?? null,
      city: store?.city ?? null,
      state: store?.state ?? null,
    },
  });

  async function onSubmit(values: UpdateStoreInput): Promise<void> {
    setServerError(null);
    try {
      await updateStore(storeId, values);
      router.push(`/admin/stores/${storeId}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao atualizar loja');
    }
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Editar loja</h1>
        <Button variant="outline" asChild><Link href={`/admin/stores/${storeId}`}>Cancelar</Link></Button>
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
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input maxLength={2} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="document" render={({ field }) => (
                <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild><Link href={`/admin/stores/${storeId}`}>Cancelar</Link></Button>
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
