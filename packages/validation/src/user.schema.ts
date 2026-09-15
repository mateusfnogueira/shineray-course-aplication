import { z } from 'zod';
import { UserRole } from '@compliance/shared';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('E-mail inválido').toLowerCase(),
  role: z.nativeEnum(UserRole),
  storeId: z.string().uuid('ID de loja inválido').nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ email: true, role: true })
  .partial();

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
});

export const updateUserStatusSchema = z.object({
  active: z.boolean(),
});

export const importUserRowSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  storeCode: z.string().min(2).max(20),
  position: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ImportUserRow = z.infer<typeof importUserRowSchema>;
