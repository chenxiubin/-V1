import { z } from 'zod';

export const ModelIdSchema = z.string().regex(/^gemini-[a-zA-Z0-9.-]+$/);

export const ModelSettingsSchema = z.object({
  selectedModelId: ModelIdSchema,
  updatedAt: z.string().datetime(),
});

export const ModelRequestContextSchema = z.object({
  modelId: ModelIdSchema.optional(),
});

export type ModelId = z.infer<typeof ModelIdSchema>;
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
export type ModelRequestContext = z.infer<typeof ModelRequestContextSchema>;
