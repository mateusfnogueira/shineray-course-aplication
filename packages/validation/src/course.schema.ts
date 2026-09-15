import { z } from 'zod';
import { CourseAssignmentType } from '@compliance/shared';
import { extractYouTubeVideoId } from '@compliance/shared';

export const createCourseSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(200),
  shortDescription: z
    .string()
    .min(10, 'Descrição curta deve ter pelo menos 10 caracteres')
    .max(500),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  estimatedDurationMinutes: z
    .number()
    .int()
    .positive('Duração deve ser um número positivo'),
  minimumPassingScore: z.number().int().min(0).max(100).nullable().optional(),
  maximumAttempts: z.number().int().positive().nullable().optional(),
  certificateEnabled: z.boolean().default(false),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createModuleSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).nullable().optional(),
  order: z.number().int().positive(),
});

export const updateModuleSchema = createModuleSchema.partial();

export const youtubeVideoUrlSchema = z.string().refine(
  (val) => extractYouTubeVideoId(val) !== null,
  'URL ou ID do YouTube inválido. Formatos aceitos: https://www.youtube.com/watch?v=ID, https://youtu.be/ID, ou o ID direto.',
);

export const createLessonSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(['VIDEO', 'SLIDES', 'DOCUMENT', 'TEXT']),
  order: z.number().int().positive(),
  required: z.boolean().default(true),
  durationMinutes: z.number().int().positive().nullable().optional(),
  youtubeUrl: youtubeVideoUrlSchema.nullable().optional(),
  textContent: z.string().nullable().optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

export const courseStoreAccessSchema = z.object({
  storeId: z.string().uuid('ID de loja inválido'),
  assignmentType: z.nativeEnum(CourseAssignmentType),
  availableFrom: z.string().datetime().nullable().optional(),
  availableUntil: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
});

export const bulkCourseStoreAccessSchema = z.object({
  accesses: z
    .array(courseStoreAccessSchema)
    .min(1, 'Informe pelo menos um acesso'),
});

export const createQuizSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).nullable().optional(),
  minimumPassingScore: z.number().int().min(0).max(100),
  maximumAttempts: z.number().int().positive().nullable().optional(),
  shuffleQuestions: z.boolean().default(false),
  shuffleAnswers: z.boolean().default(false),
});

export const updateQuizSchema = createQuizSchema.partial();

export const createQuestionSchema = z.object({
  statement: z.string().min(5, 'Enunciado deve ter pelo menos 5 caracteres'),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']),
  explanation: z.string().nullable().optional(),
  order: z.number().int().positive(),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean(),
        order: z.number().int().positive(),
      }),
    )
    .min(2, 'Questão deve ter pelo menos 2 opções'),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type CourseStoreAccessInput = z.infer<typeof courseStoreAccessSchema>;
export type BulkCourseStoreAccessInput = z.infer<typeof bulkCourseStoreAccessSchema>;
export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
