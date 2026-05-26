import React, { useState, useRef } from 'react';
import { Upload, Link2, AlertCircle, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { githubApi } from '../../lib/adminApi';
import { triggerToast } from './CmsToaster';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 500 * 1024; // 500 KB

interface Props {
  value: string;                  // URL atual (path /uploads/... ou https://...)
  onChange: (url: string) => void;
  /** Pasta destino pra uploads. Ex: 'products' → /uploads/products/<file>. Default: 'images' */
  folder?: string;
  /** Slug usado no nome do arquivo (pra busca). Default: 'image-{timestamp}' */
  fileSlug?: string;
  /** Aspect ratio do preview. Default: '3/2' */
  aspectRatio?: string;
  /** Tamanho recomendado mostrado no hint. Default: '600×400px' */
  recommendedSize?: string;
  /** Compacto (sem hint extra) */
  compact?: boolean;
}

export default function ImageInput({
  value,
  onChange,
  folder = 'images',
  fileSlug = '',
  aspectRatio = '3/2',
  recommendedSize = '600×400px',
  compact = false,
}: Props) {
  const isUrl = /^https?:\/\//i.test(value);
  const [tab, setTab] = useState<'upload' | 'url'>(isUrl ? 'url' : 'upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [localPreview, setLocalPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewSrc = localPreview || value || '';

  async function uploadFile(file: File) {
    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(`Arquivo muito grande (${(file.size / 1024).toFixed(0)}KB). Máximo 500KB. Otimize em tinypng.com.`);
      return;
    }

    // Preview local imediato
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setUploading(true);
    triggerToast('Enviando imagem...', 'progress', 30);

    try {
      const base64 = await fileToBase64(file);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const slugPart = fileSlug || 'image';
      const ghPath = `public/uploads/${folder}/${Date.now()}-${slugPart}.${ext}`;
      await githubApi('write', ghPath, {
        content: base64,
        isBase64: true,
        message: `Upload imagem ${slugPart}`,
      });
      const publicUrl = ghPath.replace(/^public/, '');
      onChange(publicUrl);
      setLocalPreview('');
      URL.revokeObjectURL(objectUrl);
      triggerToast('Imagem enviada!', 'success', 100);
    } catch (err: any) {
      setError(err.message || 'Falha no upload');
      setLocalPreview('');
      URL.revokeObjectURL(objectUrl);
      triggerToast(`Erro: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleClear = () => {
    onChange('');
    setLocalPreview('');
    setError('');
  };

  return (
    <div className="space-y-2">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${tab === 'upload' ? 'bg-white text-amber-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${tab === 'url' ? 'bg-white text-amber-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Link2 className="w-3 h-3" /> URL
          </button>
        </div>
        {!compact && (
          <span className="text-[10px] text-slate-400 font-mono">
            {recommendedSize} · JPG/PNG/WebP · max 500KB
          </span>
        )}
      </div>

      {/* Tab content */}
      {tab === 'upload' ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="block border-2 border-dashed border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/30 rounded-lg p-4 cursor-pointer transition-colors text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 py-2 text-amber-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-medium">Enviando...</span>
            </div>
          ) : (
            <>
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-700">
                Clique ou arraste imagem
              </p>
            </>
          )}
        </div>
      ) : (
        <input
          type="url"
          value={value}
          onChange={e => { onChange(e.target.value); setError(''); }}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500"
          placeholder="https://exemplo.com/imagem.jpg"
        />
      )}

      {/* Error */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-md text-[11px] text-red-700 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview */}
      {previewSrc && !error && (
        <div className="relative inline-block group">
          <div
            className="bg-slate-100 border border-slate-200 rounded-md overflow-hidden"
            style={{ aspectRatio, width: '160px' }}
          >
            <img
              src={previewSrc}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setError('URL inválida ou imagem não carregou.')}
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            title="Remover"
            className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-md">
              <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}
