import { ProductProfile } from '../../src/types/schemas';

export interface ProductAnalysisService {
  analyze(fileBuffer: Buffer, mimeType: string, productAssetId: string, modelId: string): Promise<ProductProfile>;
}

export class DefaultProductAnalysisService implements ProductAnalysisService {
  async analyze(fileBuffer: Buffer, mimeType: string, productAssetId: string, modelId: string): Promise<ProductProfile> {
    const err = new Error('分析服务尚未接入：台历智能多模态大模型分析模块未在当前版本激活');
    (err as any).code = 'SERVICE_NOT_INTEGRATED';
    (err as any).retryable = false;
    throw err;
  }
}
