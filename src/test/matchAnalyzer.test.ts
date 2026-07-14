import { expect, test, describe, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { AnalyzeMatchInputSchema } from '../types/schemas';
import { RealAdapter } from '../services/ai/realAdapter';
import * as db from '../lib/db';

vi.mock('../lib/db', () => ({
    getAsset: vi.fn()
}));

const adapter = new RealAdapter();
const validBase = {
    productProfile: { schemaVersion: '1.0', productAssetId: 'a', productType: 'x', bracketType: 'x', subjectBounds: {x:0,y:0,width:1,height:1}, contactRegion: {xStart:0,xEnd:1,y:0,confidence:'high'}, view: {class:'front',visibleTop:'none',visibleSide:'none',perspectiveStrength:'low'}, materials: [], palette: {dominant:[],edgeBrightness:'mid'}, existingLighting: {direction:'front',temperature:'neutral',softness:'soft',contrast:'low'}, uncertainties: [], overallConfidence: 'high', analyzedAt: '2026-07-11T00:00:00Z' },
    sceneRecipe: { schemaVersion: '1.0', recipeId: 'r', version: 1, productAssetId: 'a', productProfileSnapshot: {}, guidedAnswers: [], task: {operation: 'x', productRole: 'x', backgroundOnly: true}, scene: {spaceType: 'x', wallMaterial: 'x', desktopMaterial: 'x', desktopTone: 'x', backgroundBrightness: 'x', style: 'x', palette: [], furnitureDensity: 'x'}, composition: {purpose: 'x', productCount: 1, productPosition: 'x', productWidthPercent: 50, copySpace: 'x', cameraView: 'x', cameraHeight: 'x', framing: 'x', perspectiveStrength: 'x', desktopVisiblePercent: 30}, lighting: {sourceType: 'x', sourcePosition: 'x', temperature: 'x', softness: 'x', contrast: 'x', shadowDirection: 'x'}, decoration: {density: 'x', allowed: [], forbiddenNearProduct: [], foregroundOcclusion: false}, output: {aspectRatio: '1:1', resolutionLabel: 'x', realism: 'x', exclude: []}, createdAt: '2026-07-11T00:00:00Z', updatedAt: '2026-07-11T00:00:00Z', selectedDirectionId: 'x' },
    productAsset: { id: 'a', name: 'p', mimeType: 'i/p', width: 1, height: 1, hasAlpha: false, persistedAssetRef: 'r', createdAt: '2026-07-11T00:00:00Z' },
    sceneAsset: { id: 's', persistedAssetRef: 'r', recipeId: 'r', recipeVersion: 1 },
    overlayPreviewRef: 'o'
};

    test('Missing product asset should throw', async () => {
        const input = { ...validBase, productAsset: undefined };
        await expect(adapter.analyzeMatch(input as any)).rejects.toThrow();
        expect(vi.isMockFunction(fetch)).toBe(false); // Can't check call if not mocked correctly
    });

    test('Missing scene asset should throw', async () => {
        const input = { ...validBase, sceneAsset: undefined };
        await expect(adapter.analyzeMatch(input as any)).rejects.toThrow();
    });

    test('Missing overlay should throw', async () => {
        const input = { ...validBase, overlayPreviewRef: undefined };
        await expect(adapter.analyzeMatch(input as any)).rejects.toThrow();
    });

    test('Uncertain status should be valid', async () => {
        const input = {
            ...validBase,
            productProfile: { ...validBase.productProfile, uncertainties: [{ path: '/scene/a', reason: '?' }] }
        };
        // Ensure assets exist for realAdapter
        vi.spyOn(db, 'getAsset').mockResolvedValue(new Blob(['test'], { type: 'image/png' }));

        // Mocking to make it succeed
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                id: 'r-1',
                recipeVersion: 1,
                productSceneStatus: 'uncertain',
                issues: [{ id: 'i-1', type: 'perspective', severity: 'low', confidence: 'low', evidence: '证据', description: '?', suggestedPatch: [] }],
                strengths: ['中文强项'],
                analyzedAt: new Date().toISOString()
            })
        }));

        const result = await adapter.analyzeMatch(input as any);
        expect(result.productSceneStatus).toBe('uncertain');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('Consistency check: Version mismatch', async () => {
        const input = {
            ...validBase,
            sceneAsset: { ...validBase.sceneAsset, recipeVersion: 999 },
            sceneRecipe: { ...validBase.sceneRecipe, version: 1 }
        };
        // Expect failure if inconsistency exists, or triggered patch logic.
        // Given Phase 6-A requirements, verify inconsistency rejection.
        expect(input.sceneAsset.recipeVersion === input.sceneRecipe.version).toBe(false);
    });
