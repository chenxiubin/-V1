import fs from 'fs';

const code = fs.readFileSync('server/services/geminiScenePlanner.ts', 'utf-8');

const updatedCode = code.replace(
  /const RECIPE_RESPONSE_SCHEMA = \{[\s\S]*?required: \["scene", "composition", "lighting", "decoration", "output"\]\n\};/,
  `const RECIPE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    scene: {
      type: Type.OBJECT,
      properties: {
        spaceType: { type: Type.STRING },
        wallMaterial: { type: Type.STRING },
        desktopMaterial: { type: Type.STRING },
        desktopTone: { type: Type.STRING },
        backgroundBrightness: { type: Type.STRING, enum: ['dark', 'medium_dark', 'medium', 'medium_light', 'light'] },
        style: { type: Type.STRING },
        palette: { type: Type.ARRAY, items: { type: Type.STRING } },
        furnitureDensity: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
      },
      required: ["spaceType", "wallMaterial", "desktopMaterial", "desktopTone", "backgroundBrightness", "style", "palette", "furnitureDensity"]
    },
    composition: {
      type: Type.OBJECT,
      properties: {
        purpose: { type: Type.STRING, enum: ['hero', 'side_structure', 'multi_product', 'product_packaging', 'detail', 'usage_scene', 'copy_space'] },
        productCount: { type: Type.INTEGER },
        productPosition: { type: Type.STRING, enum: ['center', 'center_left', 'center_right', 'lower_left', 'lower_right'] },
        productWidthPercent: { type: Type.INTEGER },
        copySpace: { type: Type.STRING, enum: ['none', 'left', 'right', 'top', 'upper_half'] },
        cameraView: { type: Type.STRING, enum: ['front', 'front_left', 'front_right', 'slight_top', 'high_top'] },
        cameraHeight: { type: Type.STRING, enum: ['low', 'near_eye_level', 'slightly_high', 'high'] },
        framing: { type: Type.STRING, enum: ['close', 'medium', 'wide'] },
        perspectiveStrength: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
        desktopVisiblePercent: { type: Type.INTEGER }
      },
      required: ["purpose", "productCount", "productPosition", "productWidthPercent", "copySpace", "cameraView", "cameraHeight", "framing", "perspectiveStrength", "desktopVisiblePercent"]
    },
    lighting: {
      type: Type.OBJECT,
      properties: {
        sourceType: { type: Type.STRING, enum: ['window', 'large_softbox', 'diffuse_interior'] },
        sourcePosition: { type: Type.STRING, enum: ['upper_left', 'upper_right', 'front', 'top'] },
        temperature: { type: Type.STRING, enum: ['cool', 'neutral', 'neutral_warm', 'warm'] },
        softness: { type: Type.STRING, enum: ['hard', 'medium', 'soft'] },
        contrast: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
        shadowDirection: { type: Type.STRING, enum: ['rear_left', 'rear_right', 'behind', 'soft_diffuse'] }
      },
      required: ["sourceType", "sourcePosition", "temperature", "softness", "contrast", "shadowDirection"]
    },
    decoration: {
      type: Type.OBJECT,
      properties: {
        density: { type: Type.STRING, enum: ['minimal', 'moderate', 'rich'] },
        allowed: { type: Type.ARRAY, items: { type: Type.STRING } },
        forbiddenNearProduct: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["density", "allowed", "forbiddenNearProduct"]
    },
    output: {
      type: Type.OBJECT,
      properties: {
        aspectRatio: { type: Type.STRING, enum: ['1:1', '3:4', '4:3', '2:3', '16:9'] },
        resolutionLabel: { type: Type.STRING, enum: ['1K', '2K', '4K'] },
        exclude: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["aspectRatio", "resolutionLabel", "exclude"]
    }
  },
  required: ["scene", "composition", "lighting", "decoration", "output"]
};`
);

fs.writeFileSync('server/services/geminiScenePlanner.ts', updatedCode);
