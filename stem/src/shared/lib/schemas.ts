import { z } from 'zod';

/**
 * Схеми валідації. Ними користуються і форми на клієнті, і мок-сервер:
 * клієнтська перевірка — це зручність, а не захист, тож сервер перевіряє ще раз.
 * Повідомлення — ключі локалізації, текст підставляє компонент поля.
 */

const email = z.string().trim().min(1, 'validation.required').pipe(z.email('validation.email'));

const password = z
  .string()
  .min(8, 'validation.passwordLength')
  .max(72, 'validation.tooLong')
  .regex(/\p{L}/u, 'validation.passwordLetter')
  .regex(/\d/, 'validation.passwordDigit');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'validation.required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    inviteCode: z.string().trim().min(1, 'validation.required').max(32, 'validation.tooLong'),
    name: z.string().trim().min(2, 'validation.nameLength').max(60, 'validation.tooLong'),
    email,
    password,
    passwordConfirm: z.string().min(1, 'validation.required'),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'validation.passwordMismatch',
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const limitSchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(40, 'validation.tooLong'),
  period: z.enum(['day', 'month']),
  thresholdKwh: z
    .number('validation.number')
    .positive('validation.positive')
    .max(100_000, 'validation.tooLarge'),
  enabled: z.boolean(),
});
export type LimitValues = z.infer<typeof limitSchema>;

export const tariffsSchema = z.object({
  day: z
    .number('validation.number')
    .positive('validation.positive')
    .max(1000, 'validation.tooLarge'),
  night: z
    .number('validation.number')
    .positive('validation.positive')
    .max(1000, 'validation.tooLarge'),
});
export type TariffsValues = z.infer<typeof tariffsSchema>;

export const announcementSchema = z.object({
  title: z.string().trim().min(3, 'validation.titleLength').max(80, 'validation.tooLong'),
  bodyHtml: z.string().trim().min(1, 'validation.required').max(4000, 'validation.tooLong'),
});
export type AnnouncementValues = z.infer<typeof announcementSchema>;
