import React, { useState, useRef } from 'react';
import { Upload, FileImage, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { analyzeImageFile } from '../lib/imageAnalyzer';
import { saveAsset } from '../lib/db';
import { ImportedSceneImage } from '../types/schemas';

interface Props {
  onImport: (image: ImportedSceneImage) => void;
  disabled?: boolean;
}

export const SceneImageImport: React.FC<Props> = ({ onImport, disabled = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = async (file: File) => {
    setError(null);
    setUploading(true);

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      setError('不支持的文件格式。仅支持 PNG、JPG、JPEG、WEBP 格式图片。');
      setUploading(false);
      return;
    }

    try {
      // Analyze file dimensions and metadata
      const analysis = await analyzeImageFile(file);

      // Create a unique asset key
      const assetId = `scene-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Save file to indexedDB
      await saveAsset(assetId, file);

      const importedImage: ImportedSceneImage = {
        id: assetId,
        fileName: file.name,
        mimeType: analysis.mimeType as 'image/png' | 'image/jpeg' | 'image/webp',
        width: analysis.width,
        height: analysis.height,
        persistedAssetRef: assetId,
        createdAt: new Date().toISOString(),
      };

      onImport(importedImage);
    } catch (err: any) {
      console.error('Failed to import scene image:', err);
      setError(err.message || '图片导入失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled || uploading) return;

    if (e.target.files && e.target.files[0]) {
      await validateAndProcessFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto" id="scene-image-import-container">
      <div
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/30'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        } ${disabled || uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        id="scene-image-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={handleChange}
          disabled={disabled || uploading}
          id="scene-image-file-input"
        />

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-slate-50 text-slate-600 rounded-full" id="upload-icon-wrapper">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="space-y-1" id="upload-instructions">
            <p className="text-sm font-medium text-slate-900">
              {uploading ? '正在解析图片并保存...' : '点击或拖拽上传外部生成的场景图片'}
            </p>
            <p className="text-xs text-slate-500">
              支持 PNG, JPG, JPEG, WEBP 格式图片 (最大 10MB)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-lg" id="import-error-banner">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
