import { ProductAsset } from '../types/schemas';

export interface ImageAnalysis {
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  hasAlpha: boolean;
  size: number;
}

export function analyzeImageFile(file: File | Blob): Promise<ImageAnalysis> {
  return new Promise((resolve, reject) => {
    let mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
    const type = file.type;
    const name = (file as any).name || 'unknown_file';

    if (type === 'image/png' || name.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (type === 'image/jpeg' || type === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (type === 'image/webp' || name.endsWith('.webp')) {
      mimeType = 'image/webp';
    } else {
      reject(new Error('不支持的文件格式！仅支持 PNG、JPEG、WebP 格式的图片。'));
      return;
    }

    const img = new Image();
    let url: string;
    try {
      url = URL.createObjectURL(file);
    } catch (e) {
      reject(new Error('无法读取文件，可能是无效的 Blob。'));
      return;
    }

    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.naturalWidth || 1024;
      const height = img.naturalHeight || 1024;

      let hasAlpha = false;
      if (mimeType === 'image/jpeg') {
        hasAlpha = false;
        resolve({
          name,
          mimeType,
          width,
          height,
          hasAlpha,
          size: file.size,
        });
      } else {
        try {
          const canvas = document.createElement('canvas');
          const checkWidth = Math.min(width, 100);
          const checkHeight = Math.min(height, 100);
          canvas.width = checkWidth;
          canvas.height = checkHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, checkWidth, checkHeight);
            const imgData = ctx.getImageData(0, 0, checkWidth, checkHeight);
            const data = imgData.data;
            for (let i = 3; i < data.length; i += 4) {
              if (data[i] < 255) {
                hasAlpha = true;
                break;
              }
            }
          }
        } catch (e) {
          console.error('检测 Alpha 通道失败，降级为 false:', e);
        }

        resolve({
          name,
          mimeType,
          width,
          height,
          hasAlpha,
          size: file.size,
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法加载图片文件，请确保文件未损坏。'));
    };
  });
}
