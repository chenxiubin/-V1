export interface GeminiModelCapability {
  id: string;
  imageInput: boolean;
  structuredOutput: boolean;
  multimodalStatus: 'confirmed' | 'unknown';
  releaseChannel: 'stable' | 'preview' | 'experimental';
}

// Registry for models known to support multi-modal operations (image input and structured output)
export const geminiModelCapabilities: Record<string, Omit<GeminiModelCapability, 'id'>> = {
  'gemini-3.5-flash': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'stable'
  },
  'gemini-3.0-pro': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'stable'
  },
  'gemini-3.0-flash': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'stable'
  },
  'gemini-2.5-pro': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'stable'
  },
  'gemini-2.5-flash': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'stable'
  },
  'gemini-2.0-pro-exp': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'experimental'
  },
  'gemini-2.0-flash-exp': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'experimental'
  },
  'gemini-1.5-pro': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'stable'
  },
  'gemini-1.5-flash': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'stable'
  },
  'gemini-3.5-pro-preview': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'preview'
  },
  'gemini-3.1-pro-preview': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'preview'
  }
};

export function getModelCapability(modelId: string): GeminiModelCapability {
  const shortName = modelId.replace(/^models\//, '');
  const known = geminiModelCapabilities[shortName];
  if (known) {
    return { id: shortName, ...known };
  }
  
  // If unknown, we assume it's stable but multimodal status is unknown
  return {
    id: shortName,
    imageInput: false,
    structuredOutput: false,
    multimodalStatus: 'unknown',
    releaseChannel: 'stable'
  };
}
