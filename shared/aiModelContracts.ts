import { z } from 'zod';

export const ModelIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);

export const ModelSettingsSchema = z.object({
  selectedModelId: ModelIdSchema.nullable(),
  updatedAt: z.string().datetime(),
});

export const ModelRequestContextSchema = z.object({
  modelId: ModelIdSchema.optional().nullable(),
});

export const RuntimeModelSourceSchema = z.enum(['user_selection', 'server_default']);

export const RuntimeModelResolutionSchema = z.object({
  effectiveModelId: ModelIdSchema,
  source: RuntimeModelSourceSchema,
});

export const DiscoveredModelSchema = z.object({
  id: ModelIdSchema,
  resourceName: z.string(),
  displayName: z.string(),
  description: z.string(),
  inputTokenLimit: z.number(),
  outputTokenLimit: z.number(),
  supportedGenerationMethods: z.array(z.string()),
  releaseChannel: z.enum(['stable', 'preview', 'experimental', 'unknown']),
  compatibility: z.enum(['compatible', 'unknown', 'incompatible']),
  capabilities: z.object({
    imageInput: z.boolean(),
    structuredOutput: z.boolean(),
    multimodalStatus: z.enum(['confirmed', 'unknown']),
  }),
  selectableInFuture: z.boolean(),
});

export const ModelDiscoveryResultSchema = z.object({
  models: z.array(DiscoveredModelSchema),
  currentConfiguredModelId: z.string(),
  apiKeyConfigured: z.boolean(),
  quota: z.object({
    officialRemainingToday: z.null().or(z.undefined()).optional(),
    officialDailyLimit: z.null().or(z.undefined()).optional(),
    reason: z.string(),
  }),
  fetchedAt: z.string(),
  cacheExpiresAt: z.string(),
  stale: z.boolean(),
  refreshError: z.string().optional(),
});

export type ModelId = z.infer<typeof ModelIdSchema>;
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
export type ModelRequestContext = z.infer<typeof ModelRequestContextSchema>;
export type RuntimeModelSource = z.infer<typeof RuntimeModelSourceSchema>;
export type RuntimeModelResolution = z.infer<typeof RuntimeModelResolutionSchema>;
export type DiscoveredModel = z.infer<typeof DiscoveredModelSchema>;
export type ModelDiscoveryResult = z.infer<typeof ModelDiscoveryResultSchema>;
