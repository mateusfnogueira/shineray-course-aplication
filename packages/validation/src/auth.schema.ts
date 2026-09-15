import { z } from 'zod';

const CORPORATE_DOMAIN = '@shineray.com';

const corporateEmailSchema = z
  .string()
  .email('E-mail inválido')
  // .refine(
  //   (email) => email.toLowerCase().endsWith(CORPORATE_DOMAIN),
  //   `Use seu e-mail corporativo ${CORPORATE_DOMAIN}`,
  // );

const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número');

export const loginSchema = z.object({
  email: corporateEmailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const forgotPasswordSchema = z.object({
  email: corporateEmailSchema,
});

export const firstAccessSchema = z.object({
  email: corporateEmailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export const activateAccountSchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmNewPassword'],
  });

export const acceptLegalDocumentSchema = z.object({
  legalDocumentId: z.string().uuid('ID de documento inválido'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type FirstAccessInput = z.infer<typeof firstAccessSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AcceptLegalDocumentInput = z.infer<typeof acceptLegalDocumentSchema>;
