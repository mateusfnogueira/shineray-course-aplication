import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .toUpperCase()
    .regex(
      /^[A-Z0-9_-]+$/,
      'Código deve conter apenas letras maiúsculas, números, hífens e underscores',
    ),
  document: z.string().max(20).nullable().optional(),
  region: z.string().max(50).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').toUpperCase().nullable().optional(),
});

export const updateStoreSchema = createStoreSchema.partial();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
