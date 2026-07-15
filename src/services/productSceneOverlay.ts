import { ProjectState, SceneRecipe } from '../types/schemas';

interface CreateOverlayInput {
  productBlob: Blob;
  sceneBlob: Blob;
  productAsset: NonNullable<ProjectState['productAsset']>;
  sceneAsset: NonNullable<ProjectState['sceneAsset']>;
  composition: SceneRecipe['composition'];
}

export const createProductSceneOverlay = async (input: CreateOverlayInput): Promise<{
  blob: Blob;
  width: number;
  height: number;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}> => {
  const { productBlob, sceneBlob, productAsset, sceneAsset, composition } = input;

  const loadImg = (blob: Blob): Promise<HTMLImageElement> => 
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image blob'));
      };
      img.src = url;
    });

  const [sceneImg, productImg] = await Promise.all([
    loadImg(sceneBlob),
    loadImg(productBlob)
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = sceneImg.width;
  canvas.height = sceneImg.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2d context');

  ctx.drawImage(sceneImg, 0, 0, canvas.width, canvas.height);

  const productWidth = canvas.width * (composition.productWidthPercent / 100);
  const productHeight = productWidth * (productAsset.height / productAsset.width); // maintain product asset ratio

  let dx = 0, dy = 0;
  switch (composition.productPosition) {
    case 'center_left':
      dx = canvas.width * 0.1;
      dy = (canvas.height - productHeight) / 2;
      break;
    case 'center_right':
      dx = canvas.width * 0.9 - productWidth;
      dy = (canvas.height - productHeight) / 2;
      break;
    case 'lower_left':
      dx = canvas.width * 0.1;
      dy = canvas.height * 0.9 - productHeight;
      break;
    case 'lower_right':
      dx = canvas.width * 0.9 - productWidth;
      dy = canvas.height * 0.9 - productHeight;
      break;
    case 'center':
    default:
      dx = (canvas.width - productWidth) / 2;
      dy = (canvas.height - productHeight) / 2;
      break;
  }

  ctx.drawImage(productImg, dx, dy, productWidth, productHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Failed to create blob'));
      else resolve({
        blob,
        width: canvas.width,
        height: canvas.height,
        layout: {
          x: dx,
          y: dy,
          width: productWidth,
          height: productHeight,
        }
      });
    }, 'image/png'); // Output PNG Blob
  });
};
