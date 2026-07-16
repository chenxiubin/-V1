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
  return new Promise(async (resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('图片大小不能超过 10MB。'));
      return;
    }

    let mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
    const type = file.type;
    const name = (file as any).name || 'unknown_file';

    let extMime = '';
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('.png')) extMime = 'image/png';
    else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) extMime = 'image/jpeg';
    else if (lowerName.endsWith('.webp')) extMime = 'image/webp';

    // Magic number check
    let magicMime = '';
    try {
      const headerBlob = file.slice(0, 12);
      const buffer = await headerBlob.arrayBuffer();
      const view = new Uint8Array(buffer);
      
      if (view.length >= 8 && view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47 &&
          view[4] === 0x0D && view[5] === 0x0A && view[6] === 0x1A && view[7] === 0x0A) {
        magicMime = 'image/png';
      } else if (view.length >= 3 && view[0] === 0xFF && view[1] === 0xD8 && view[2] === 0xFF) {
        magicMime = 'image/jpeg';
      } else if (view.length >= 12 && 
                 view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 && // RIFF
                 view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50) { // WEBP
        magicMime = 'image/webp';
      }
    } catch (e) {
      // ignore
    }

    if (!magicMime || !extMime || !type || type !== extMime || type !== magicMime) {
      // If it doesn't even have a valid extension or type, it's completely unsupported
      if (!extMime || !type) {
         reject(new Error('不支持的文件格式，请上传 PNG、JPEG 或 WEBP 图片。'));
         return;
      }
      // If it has valid extension and type but magic number doesn't match or is missing
      reject(new Error('图片格式与文件内容不一致，请上传真实的 PNG、JPEG 或 WEBP 图片。'));
      return;
    }

    mimeType = magicMime as 'image/png' | 'image/jpeg' | 'image/webp';

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
