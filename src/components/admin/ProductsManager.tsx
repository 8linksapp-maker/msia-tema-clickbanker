import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2, Plus, Trash2, Edit2, Package, X, ExternalLink, Star, MousePointerClick, Upload, Link2 } from 'lucide-react';
import { triggerToast } from './CmsToaster';
import { confirmDialog } from './CmsDialog';
import { githubApi } from '../../lib/adminApi';

interface Product {
  slug: string;
  name: string;
  category: string;
  vendor?: string;
  hoplink: string;
  price: string;
  originalPrice?: string;
  rating?: string;
  reviewCount?: number;
  blurb: string;
  description?: string;
  pros?: string[];
  cons?: string[];
  bestFor?: string;
  image?: string;
  commission?: number;
  gravity?: number;
  active: boolean;
  featuredInSidebar?: boolean;
  createdAt: string;
}

const EMPTY_PRODUCT: Product = {
  slug: '',
  name: '',
  category: '',
  vendor: '',
  hoplink: '',
  price: '',
  originalPrice: '',
  rating: '',
  reviewCount: 0,
  blurb: '',
  description: '',
  pros: [],
  cons: [],
  bestFor: '',
  image: '',
  commission: 0,
  gravity: 0,
  active: true,
  featuredInSidebar: false,
  createdAt: new Date().toISOString(),
};

export default function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [clickTotals, setClickTotals] = useState<Record<string, number>>({});
  const [totalAllTime, setTotalAllTime] = useState(0);
  const [fileSha, setFileSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [temp, setTemp] = useState<Product | null>(null);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageError, setImageError] = useState<string>('');

  const loadClicks = async () => {
    try {
      const res = await fetch('/api/admin/clicks?limit=200');
      if (!res.ok) return;
      const data = await res.json();
      setClickTotals(data.totals || {});
      setTotalAllTime(data.totalAllTime || 0);
    } catch {}
  };

  useEffect(() => {
    Promise.all([
      githubApi('read', 'src/data/products.json').catch(() => ({ content: '[]', sha: '' })),
      githubApi('read', 'src/data/categories.json').catch(() => ({ content: '[]', sha: '' })),
      loadClicks(),
    ]).then(([prodRes, catRes]) => {
      try {
        const parsed = JSON.parse(prodRes?.content || '[]');
        setProducts(Array.isArray(parsed) ? parsed : []);
        setFileSha(prodRes.sha || '');
      } catch { setProducts([]); }
      try {
        const cats = JSON.parse(catRes?.content || '[]');
        setCategories(Array.isArray(cats) ? cats : []);
      } catch { setCategories([]); }
    }).finally(() => setLoading(false));
  }, []);

  const saveToGithub = async (list: Product[]) => {
    setSaving(true); setError('');
    triggerToast('Sincronizando produtos...', 'progress', 30);
    try {
      const data = await githubApi('write', 'src/data/products.json', {
        content: JSON.stringify(list, null, 2),
        sha: fileSha || undefined,
        message: 'CMS: update products.json',
      });
      setFileSha(data.sha);
      triggerToast('Produtos sincronizados!', 'success', 100);
    } catch (err: any) {
      setError(err.message);
      triggerToast(`Erro: ${err.message}`, 'error');
    } finally { setSaving(false); }
  };

  const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_IMG_SIZE = 500 * 1024; // 500 KB

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });

  const handleImageFile = (file: File) => {
    setImageError('');
    if (!ALLOWED_IMG_TYPES.includes(file.type)) {
      setImageError('Formato inv\u00e1lido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_IMG_SIZE) {
      setImageError(`Arquivo muito grande (${(file.size / 1024).toFixed(0)}KB). M\u00e1ximo 500KB. Otimize em tinypng.com ou similar.`);
      return;
    }
    setPendingImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = ''; // reset pra permitir re-upload mesmo arquivo
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const clearImage = () => {
    if (temp) setTemp({ ...temp, image: '' });
    setPendingImageFile(null);
    setImagePreview('');
    setImageError('');
  };

  const saveModal = async () => {
    if (!temp) return;
    if (!temp.name.trim()) { triggerToast('Nome é obrigatório', 'error'); return; }
    if (!temp.hoplink.trim()) { triggerToast('Hoplink é obrigatório', 'error'); return; }
    if (!temp.slug.trim()) temp.slug = slugify(temp.name);

    let finalTemp = { ...temp };

    // Upload de imagem pendente, se houver
    if (pendingImageFile) {
      setSaving(true);
      triggerToast('Enviando imagem...', 'progress', 20);
      try {
        const base64 = await fileToBase64(pendingImageFile);
        const ext = (pendingImageFile.name.split('.').pop() || 'jpg').toLowerCase();
        const cleanSlug = finalTemp.slug || slugify(finalTemp.name);
        const ghPath = `public/uploads/products/${Date.now()}-${cleanSlug}.${ext}`;
        await githubApi('write', ghPath, {
          content: base64,
          isBase64: true,
          message: `Upload imagem produto ${cleanSlug}`,
        });
        finalTemp.image = ghPath.replace(/^public/, ''); // /uploads/products/...
      } catch (err: any) {
        triggerToast(`Erro no upload: ${err.message}`, 'error');
        setSaving(false);
        return;
      }
    }

    const arr = [...products];
    if (editingIndex === null) arr.unshift({ ...finalTemp, createdAt: new Date().toISOString() });
    else arr[editingIndex] = finalTemp;
    setProducts(arr);
    setIsModalOpen(false);
    setTemp(null);
    setEditingIndex(null);
    setPendingImageFile(null);
    setImagePreview('');
    setImageError('');
    await saveToGithub(arr);
  };

  const removeProduct = async (i: number) => {
    if (!(await confirmDialog({ title: `Excluir "${products[i].name}"?`, message: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true }))) return;
    const arr = products.filter((_, idx) => idx !== i);
    setProducts(arr);
    await saveToGithub(arr);
  };

  const toggleActive = async (i: number) => {
    const arr = [...products];
    arr[i] = { ...arr[i], active: !arr[i].active };
    setProducts(arr);
    await saveToGithub(arr);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-ink-faint bg-white rounded-2xl border border-border">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
      <p className="font-medium animate-pulse">Carregando produtos...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 px-7 rounded-2xl border border-border shadow-sm sticky top-0 z-40">
        <div>
          <h2 className="text-lg font-bold text-ink">Banco de Produtos</h2>
          <p className="text-xs text-ink-muted mt-1 flex items-center gap-2 flex-wrap">
            <span><span className="font-bold">{products.filter(p => p.active).length}</span> ativos</span>
            <span className="text-ink-faint">·</span>
            <span><span className="font-bold">{products.length}</span> total</span>
            <span className="text-ink-faint">·</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <MousePointerClick className="w-3 h-3" />
              <span className="tabular-nums font-bold">{totalAllTime}</span> clicks
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <button
            onClick={loadClicks}
            title="Atualizar contagem de clicks"
            className="p-2 text-ink-muted hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <MousePointerClick className="w-4 h-4" />
          </button>
          <button onClick={() => { setTemp({ ...EMPTY_PRODUCT }); setEditingIndex(null); setPendingImageFile(null); setImagePreview(''); setImageError(''); setImageTab('upload'); setIsModalOpen(true); }} disabled={saving}
            className="bg-ink hover:bg-primary disabled:bg-rule text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all">
            <Plus className="w-4 h-4" /> Novo produto
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium"><AlertCircle className="w-4 h-4 inline mr-2" /> {error}</div>}

      {products.length === 0 ? (
        <div className="bg-elev border-2 border-dashed border-rule rounded-3xl p-16 flex flex-col items-center text-center">
          <Package className="w-16 h-16 text-rule mb-4" />
          <h3 className="text-xl font-bold text-ink-muted mb-2">Nenhum produto cadastrado</h3>
          <p className="text-ink-muted max-w-sm mb-6">Cadastre um produto pra usar como referência em posts via slug e ter tracking de clicks via /go/&lt;slug&gt;.</p>
          <button onClick={() => { setTemp({ ...EMPTY_PRODUCT }); setEditingIndex(null); setPendingImageFile(null); setImagePreview(''); setImageError(''); setImageTab('upload'); setIsModalOpen(true); }}
            className="bg-ink hover:bg-primary text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar primeiro produto
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-elev border-b border-border">
              <tr>
                <th className="py-3 px-5 text-xs font-bold text-ink-muted uppercase tracking-wider">Produto</th>
                <th className="py-3 px-5 text-xs font-bold text-ink-muted uppercase tracking-wider">Categoria</th>
                <th className="py-3 px-5 text-xs font-bold text-ink-muted uppercase tracking-wider">Preço</th>
                <th className="py-3 px-5 text-xs font-bold text-ink-muted uppercase tracking-wider text-center">Rating</th>
                <th className="py-3 px-5 text-xs font-bold text-ink-muted uppercase tracking-wider text-center">Clicks</th>
                <th className="py-3 px-5 text-xs font-bold text-ink-muted uppercase tracking-wider text-center">Sidebar</th>
                <th className="py-3 px-5 text-xs font-bold text-ink-muted uppercase tracking-wider text-center">Status</th>
                <th className="py-3 px-5 text-xs font-bold text-ink-muted uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-elev">
              {products.map((p, idx) => (
                <tr key={p.slug} className={`hover:bg-elev transition-colors ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="py-4 px-5">
                    <div>
                      <p className="font-bold text-ink text-sm leading-tight">{p.name}</p>
                      <p className="text-xs text-ink-faint mt-0.5 font-mono">{p.slug}</p>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-xs text-ink-muted">{p.category || '—'}</td>
                  <td className="py-4 px-5 text-sm font-bold text-primary">{p.price}</td>
                  <td className="py-4 px-5 text-center">
                    {p.rating ? <span className="text-primary font-bold text-sm"><Star className="w-3 h-3 inline mr-1 -mt-0.5" />{p.rating}</span> : <span className="text-rule">—</span>}
                  </td>
                  <td className="py-4 px-5 text-center">
                    {(() => {
                      const n = clickTotals[p.slug] || 0;
                      return n > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums">
                          <MousePointerClick className="w-3 h-3" />
                          {n}
                        </span>
                      ) : (
                        <span className="text-rule text-xs">—</span>
                      );
                    })()}
                  </td>
                  <td className="py-4 px-5 text-center">
                    {p.featuredInSidebar ? <span className="bg-primary-soft text-primary text-[10px] font-bold uppercase px-2 py-1 rounded">Featured</span> : <span className="text-rule">—</span>}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button onClick={() => toggleActive(idx)} className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${p.active ? 'bg-green-100 text-green-800' : 'bg-elev text-ink-muted'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/go/${p.slug}`} target="_blank" rel="noopener" className="w-8 h-8 bg-elev text-ink-muted rounded-lg inline-flex items-center justify-center hover:bg-border" title="Abrir link">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button onClick={() => { setTemp({ ...p }); setEditingIndex(idx); setPendingImageFile(null); setImagePreview(''); setImageError(''); setImageTab(p.image && /^https?:/.test(p.image) ? 'url' : 'upload'); setIsModalOpen(true); }} className="w-8 h-8 bg-elev text-ink-muted rounded-lg inline-flex items-center justify-center hover:bg-primary-soft hover:text-primary">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeProduct(idx)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg inline-flex items-center justify-center hover:bg-red-500 hover:text-white">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && temp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between p-5 px-7 border-b border-elev bg-elev/50">
              <h3 className="text-lg font-bold text-ink">{editingIndex !== null ? 'Editar produto' : 'Novo produto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 bg-elev hover:bg-border text-ink-muted rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
            </header>

            <div className="p-6 px-7 overflow-y-auto space-y-5">
              {/* Linha 1: nome + slug */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                <ModalField label="Nome do produto *">
                  <input type="text" value={temp.name} onChange={e => setTemp({ ...temp, name: e.target.value, slug: temp.slug || slugify(e.target.value) })} className="modal-input" placeholder="Programa Renovação Metabólica" />
                </ModalField>
                <ModalField label="Slug">
                  <input type="text" value={temp.slug} onChange={e => setTemp({ ...temp, slug: slugify(e.target.value) })} className="modal-input font-mono text-xs" placeholder="renovacao-metabolica" />
                </ModalField>
              </div>

              {/* Linha 2: categoria + vendor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModalField label="Categoria">
                  <select value={temp.category} onChange={e => setTemp({ ...temp, category: e.target.value })} className="modal-input">
                    <option value="">— escolher —</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </ModalField>
                <ModalField label="Vendor (opcional)">
                  <input type="text" value={temp.vendor || ''} onChange={e => setTemp({ ...temp, vendor: e.target.value })} className="modal-input" placeholder="Instituto Vida Plena" />
                </ModalField>
              </div>

              {/* Hoplink */}
              <ModalField label="Hoplink ClickBank *" help="URL completo do produto via seu link de afiliado">
                <input type="url" value={temp.hoplink} onChange={e => setTemp({ ...temp, hoplink: e.target.value })} className="modal-input font-mono text-xs" placeholder="https://abc.hop.clickbank.net/?cbpage=..." />
              </ModalField>

              {/* Preço + rating */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ModalField label="Preço *">
                  <input type="text" value={temp.price} onChange={e => setTemp({ ...temp, price: e.target.value })} className="modal-input" placeholder="R$ 297" />
                </ModalField>
                <ModalField label="De (opcional)">
                  <input type="text" value={temp.originalPrice || ''} onChange={e => setTemp({ ...temp, originalPrice: e.target.value })} className="modal-input" placeholder="R$ 497" />
                </ModalField>
                <ModalField label="Rating">
                  <input type="text" value={temp.rating || ''} onChange={e => setTemp({ ...temp, rating: e.target.value })} className="modal-input" placeholder="4.7" />
                </ModalField>
                <ModalField label="# avaliações">
                  <input type="number" value={temp.reviewCount || 0} onChange={e => setTemp({ ...temp, reviewCount: parseInt(e.target.value) || 0 })} className="modal-input" />
                </ModalField>
              </div>

              {/* Blurb */}
              <ModalField label="Blurb (1-2 frases)" help="Aparece em sidebar, comparator, post inline">
                <textarea rows={2} value={temp.blurb} onChange={e => setTemp({ ...temp, blurb: e.target.value })} className="modal-input resize-y" placeholder="8 semanas com foco em ajuste metabólico — não em corte calórico." />
              </ModalField>

              {/* Best for */}
              <ModalField label="Best for (comparator)">
                <input type="text" value={temp.bestFor || ''} onChange={e => setTemp({ ...temp, bestFor: e.target.value })} className="modal-input" placeholder="Quem já tentou dieta restritiva" />
              </ModalField>

              {/* ===== Imagem do produto ===== */}
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                  Imagem do produto
                </label>
                <div className="bg-primary-soft/50 border border-primary-soft rounded-xl p-3 mb-2">
                  <p className="text-[11px] text-primary font-medium leading-relaxed">
                    <strong>Recomendado:</strong> 600×400px (proporção 3:2). Formato JPG, PNG ou WebP. Máximo 500KB.
                  </p>
                </div>

                {/* Tabs */}
                <div className="inline-flex p-1 bg-elev rounded-xl mb-3">
                  <button
                    type="button"
                    onClick={() => setImageTab('upload')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${imageTab === 'upload' ? 'bg-white text-primary shadow-sm border border-border' : 'text-ink-muted hover:text-ink-muted'}`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab('url')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${imageTab === 'url' ? 'bg-white text-primary shadow-sm border border-border' : 'text-ink-muted hover:text-ink-muted'}`}
                  >
                    <Link2 className="w-3.5 h-3.5" /> URL externa
                  </button>
                </div>

                {/* Tab content */}
                {imageTab === 'upload' ? (
                  <div
                    onDrop={handleImageDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="relative"
                  >
                    <label className="block border-2 border-dashed border-rule hover:border-primary bg-elev hover:bg-primary-soft/30 rounded-xl p-6 cursor-pointer transition-colors text-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageInputChange}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-ink-faint mx-auto mb-2" />
                      <p className="text-sm font-medium text-ink-muted">
                        Clique ou arraste imagem aqui
                      </p>
                      <p className="text-[10px] text-ink-faint mt-1 font-mono uppercase">
                        JPG · PNG · WebP — máx 500KB
                      </p>
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={temp.image || ''}
                    onChange={e => {
                      setTemp({ ...temp, image: e.target.value });
                      setImagePreview(e.target.value);
                      setPendingImageFile(null);
                      setImageError('');
                    }}
                    className="modal-input font-mono text-xs"
                    placeholder="https://exemplo.com/imagem-produto.jpg"
                  />
                )}

                {imageError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{imageError}</span>
                  </div>
                )}

                {/* Preview */}
                {(imagePreview || temp.image) && !imageError && (
                  <div className="mt-3 relative group">
                    <div className="aspect-[3/2] w-full max-w-[300px] rounded-lg overflow-hidden bg-elev border border-border">
                      <img
                        src={imagePreview || temp.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => setImageError('URL inválida ou imagem não carregou.')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={clearImage}
                      title="Remover imagem"
                      className="absolute top-1.5 left-[270px] w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {pendingImageFile && (
                      <p className="text-[10px] text-primary font-bold uppercase mt-2">
                        ⬆ Upload pendente — vai ser enviado ao salvar
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pros / cons — lista item a item */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModalField label="Prós" help="O que o produto faz bem">
                  <ListItemsEditor
                    items={temp.pros || []}
                    onChange={(items) => setTemp({ ...temp, pros: items })}
                    placeholder="Ex: Comunidade ativa no Telegram"
                    addLabel="+ adicionar pró"
                    color="emerald"
                  />
                </ModalField>
                <ModalField label="Contras" help="O que o produto deixa a desejar">
                  <ListItemsEditor
                    items={temp.cons || []}
                    onChange={(items) => setTemp({ ...temp, cons: items })}
                    placeholder="Ex: Módulo de exercícios genérico"
                    addLabel="+ adicionar contra"
                    color="red"
                  />
                </ModalField>
              </div>

              {/* Admin only: comissão + gravity */}
              <div className="bg-primary-soft border border-primary-soft rounded-xl p-4">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">Admin only (não aparece no site)</p>
                <div className="grid grid-cols-2 gap-3">
                  <ModalField label="Comissão %">
                    <input type="number" value={temp.commission || 0} onChange={e => setTemp({ ...temp, commission: parseInt(e.target.value) || 0 })} className="modal-input" placeholder="50" />
                  </ModalField>
                  <ModalField label="Gravity ClickBank">
                    <input type="number" value={temp.gravity || 0} onChange={e => setTemp({ ...temp, gravity: parseInt(e.target.value) || 0 })} className="modal-input" placeholder="87" />
                  </ModalField>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={temp.active} onChange={e => setTemp({ ...temp, active: e.target.checked })} className="w-4 h-4 accent-primary" />
                  <span className="font-medium text-ink-muted">Ativo (renderiza no site)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={!!temp.featuredInSidebar} onChange={e => setTemp({ ...temp, featuredInSidebar: e.target.checked })} className="w-4 h-4 accent-primary" />
                  <span className="font-medium text-ink-muted">Featured (sidebar widget)</span>
                </label>
              </div>
            </div>

            <footer className="p-5 px-7 border-t border-elev bg-elev flex gap-3 justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-ink-muted hover:bg-border rounded-xl">Cancelar</button>
              <button onClick={saveModal} className="px-6 py-2.5 text-sm font-bold bg-ink hover:bg-primary text-white rounded-xl flex items-center gap-2">
                <Save className="w-4 h-4" /> Salvar
              </button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        .modal-input {
          width: 100%;
          background: white;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          transition: all 0.15s;
        }
        .modal-input:focus {
          outline: none;
          border-color: rgb(217 119 6);
          box-shadow: 0 0 0 3px rgb(217 119 6 / 0.1);
        }
      `}</style>
    </div>
  );
}

function ModalField({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {help && <p className="text-[10px] text-ink-faint mt-1">{help}</p>}
    </div>
  );
}

// ===== Lista editável item-a-item (Prós/Contras) =====
function ListItemsEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  color = 'emerald',
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  color?: 'emerald' | 'red';
}) {
  const [draft, setDraft] = React.useState('');

  const colors = color === 'red'
    ? { bullet: 'bg-red-500', input: 'focus:border-red-400 focus:ring-red-400/20', btn: 'border-red-200 text-red-700 hover:border-red-400 hover:bg-red-50', addBtn: 'border-red-300 text-red-700 hover:border-red-500 hover:bg-red-50' }
    : { bullet: 'bg-emerald-500', input: 'focus:border-emerald-400 focus:ring-emerald-400/20', btn: 'border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50', addBtn: 'border-emerald-300 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50' };

  function add() {
    const t = draft.trim();
    if (!t) return;
    onChange([...items, t]);
    setDraft('');
  }
  function update(i: number, val: string) {
    onChange(items.map((it, idx) => (idx === i ? val : it)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function handleEnterKey(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Foca no próximo input OU adiciona um novo
      const inputs = e.currentTarget.parentElement?.parentElement?.parentElement?.querySelectorAll('input[type="text"]');
      if (inputs && i + 1 < inputs.length) {
        (inputs[i + 1] as HTMLInputElement).focus();
      } else {
        const addInput = e.currentTarget.closest('.list-editor')?.querySelector('input[data-add="1"]') as HTMLInputElement | null;
        addInput?.focus();
      }
    }
  }

  return (
    <div className="space-y-1.5 list-editor">
      {items.map((item, i) => (
        <div key={i} className={`flex items-center gap-2 group bg-white border border-border rounded-lg px-2.5 py-1.5 hover:border-rule transition-colors`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.bullet}`}></span>
          <input
            type="text"
            value={item}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => handleEnterKey(e, i)}
            className={`flex-1 bg-transparent text-xs text-ink-muted focus:outline-none ${colors.input}`}
          />
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="w-5 h-5 text-rule hover:text-ink-muted disabled:opacity-20 text-[9px] leading-none"
              title="Subir"
            >▲</button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              className="w-5 h-5 text-rule hover:text-ink-muted disabled:opacity-20 text-[9px] leading-none"
              title="Descer"
            >▼</button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-5 h-5 text-rule hover:text-red-600 leading-none flex items-center justify-center"
              title="Remover"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}

      {/* Input pra adicionar novo */}
      <div className={`flex items-center gap-2 border border-dashed rounded-lg px-2.5 py-1.5 ${colors.addBtn}`}>
        <Plus className="w-3.5 h-3.5 shrink-0" />
        <input
          type="text"
          data-add="1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-current placeholder:opacity-50"
          placeholder={placeholder || addLabel || 'Adicionar...'}
        />
        {draft.trim() && (
          <button
            type="button"
            onClick={add}
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded hover:bg-white/50"
          >
            adicionar
          </button>
        )}
      </div>
    </div>
  );
}
