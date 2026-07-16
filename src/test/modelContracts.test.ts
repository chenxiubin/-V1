import { describe, it, expect } from 'vitest';
import {
  ModelIdSchema,
  ModelSettingsSchema,
  ModelRequestContextSchema,
  RuntimeModelSourceSchema,
  RuntimeModelResolutionSchema
} from '../../shared/aiModelContracts.js';

describe('Model Contracts Schemas Validation', () => {
  describe('ModelIdSchema', () => {
    it('should allow valid model ids', () => {
      expect(ModelIdSchema.safeParse('gemini-1.5-pro').success).toBe(true);
      expect(ModelIdSchema.safeParse('gemini-3.5-flash_v2.0-experimental').success).toBe(true);
      expect(ModelIdSchema.safeParse('gemini.model-test_name').success).toBe(true);
    });

    it('should trim model ids automatically', () => {
      const parsed = ModelIdSchema.safeParse('  gemini-3.5-flash  ');
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBe('gemini-3.5-flash');
      }
    });

    it('should fail if model id exceeds 128 characters', () => {
      const longId = 'gemini-' + 'a'.repeat(125);
      expect(ModelIdSchema.safeParse(longId).success).toBe(false);
    });

    it('should fail if model id is empty or does not start with alphanumeric', () => {
      expect(ModelIdSchema.safeParse('').success).toBe(false);
      expect(ModelIdSchema.safeParse('   ').success).toBe(false);
      expect(ModelIdSchema.safeParse('-gemini').success).toBe(false);
      expect(ModelIdSchema.safeParse('_gemini').success).toBe(false);
      expect(ModelIdSchema.safeParse('.gemini').success).toBe(false);
    });
  });

  describe('ModelSettingsSchema', () => {
    it('should validate with valid model id and ISO datetime string', () => {
      const validSettings = {
        selectedModelId: 'gemini-1.5-pro',
        updatedAt: new Date().toISOString(),
      };
      expect(ModelSettingsSchema.safeParse(validSettings).success).toBe(true);
    });

    it('should allow selectedModelId to be null', () => {
      const nullSettings = {
        selectedModelId: null,
        updatedAt: new Date().toISOString(),
      };
      expect(ModelSettingsSchema.safeParse(nullSettings).success).toBe(true);
    });

    it('should fail with invalid datetime string', () => {
      const invalidSettings = {
        selectedModelId: 'gemini-1.5-pro',
        updatedAt: 'not-a-datetime',
      };
      expect(ModelSettingsSchema.safeParse(invalidSettings).success).toBe(false);
    });
  });

  describe('ModelRequestContextSchema', () => {
    it('should allow valid modelId, null, or undefined', () => {
      expect(ModelRequestContextSchema.safeParse({ modelId: 'gemini-1.5-pro' }).success).toBe(true);
      expect(ModelRequestContextSchema.safeParse({ modelId: null }).success).toBe(true);
      expect(ModelRequestContextSchema.safeParse({}).success).toBe(true);
    });

    it('should fail on invalid modelId format', () => {
      expect(ModelRequestContextSchema.safeParse({ modelId: 'invalid/id' }).success).toBe(false);
    });
  });

  describe('RuntimeModelSourceSchema', () => {
    it('should only allow user_selection or server_default', () => {
      expect(RuntimeModelSourceSchema.safeParse('user_selection').success).toBe(true);
      expect(RuntimeModelSourceSchema.safeParse('server_default').success).toBe(true);
      expect(RuntimeModelSourceSchema.safeParse('other').success).toBe(false);
    });
  });

  describe('RuntimeModelResolutionSchema', () => {
    it('should validate complete resolution objects', () => {
      const resolution = {
        effectiveModelId: 'gemini-1.5-pro',
        source: 'user_selection',
      };
      expect(RuntimeModelResolutionSchema.safeParse(resolution).success).toBe(true);
    });
  });
});
