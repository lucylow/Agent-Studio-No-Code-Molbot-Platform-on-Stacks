import { z } from 'zod';

// ========== Bot Creation Schema ==========
export const createBotSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Bot name is required')
    .max(64, 'Bot name must be 64 characters or less'),
  skills: z
    .string()
    .trim()
    .max(500, 'Skills string too long')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .pipe(
      z
        .array(z.string().min(1).max(64))
        .max(10, 'Maximum 10 skills allowed')
    ),
  priceModel: z.enum(['fixed', 'stream'], {
    errorMap: () => ({ message: 'Price model must be "fixed" or "stream"' }),
  }),
  priceAmount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(
      z
        .number()
        .positive('Price must be greater than 0')
        .max(1000000, 'Price too high')
    ),
  priceAsset: z.enum(['sBTC', 'USDCx'], {
    errorMap: () => ({ message: 'Asset must be "sBTC" or "USDCx"' }),
  }),
});

export type CreateBotInput = z.infer<typeof createBotSchema>;

// ========== Hire Bot Schema ==========
export const hireBotSchema = z.object({
  requesterBotId: z
    .number()
    .int('Must be an integer')
    .positive('Must be a valid bot ID'),
  providerBotId: z
    .number()
    .int('Must be an integer')
    .positive('Must be a valid bot ID'),
}).refine((data) => data.requesterBotId !== data.providerBotId, {
  message: 'A bot cannot hire itself',
  path: ['providerBotId'],
});

export type HireBotInput = z.infer<typeof hireBotSchema>;

// ========== Profile Update Schema ==========
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or less')
    .optional(),
  walletAddress: z
    .string()
    .trim()
    .regex(/^ST[A-Z0-9]{33,}$/, 'Invalid Stacks address format')
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
