import React, { useState, useEffect } from 'react';
import {
  Save, Loader2, Plus, Trash2, Edit2, X, ExternalLink, Sparkles, ChevronDown, ChevronUp,
  Rocket, AlertOctagon, Lightbulb, CheckCircle2, MessageSquareQuote, HelpCircle, Zap,
  LayoutPanelLeft, Images, BarChart3, Quote, GripVertical, LayoutGrid, List, Timer, Image as ImageIcon,
} from 'lucide-react';
import { triggerToast } from './CmsToaster';
import { githubApi } from '../../lib/adminApi';
import {
  type LandingPage, type Block, type BlockType,
  BLOCK_META, makeBlock, migrateLegacyLanding, emptyLandingPage, COLOR_PRESETS, BG_PRESETS, FONT_OPTIONS,
  resolveLandingThumbnail,
} from '../../lib/landingPages';
import ImageInput from './ImageInput';

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ICON_MAP: Record<string, React.ElementType> = {
  Rocket, AlertOctagon, Lightbulb, CheckCircle2, MessageSquareQuote, HelpCircle, Zap,
  LayoutPanelLeft, Images, BarChart3, Quote, Timer,
};

export default function LandingPagesManager() {
  const [landings, setLandings] = useState<LandingPage[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [fileSha, setFileSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<LandingPage | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<string>('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    if (typeof window === 'undefined') return 'cards';
    return (localStorage.getItem('lp-view-mode') as 'cards' | 'list') || 'cards';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('lp-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    Promise.all([
      githubApi('read', 'src/data/landingPages.json').catch(() => ({ content: '[]', sha: '' })),
      githubApi('read', 'src/data/products.json').catch(() => ({ content: '[]', sha: '' })),
    ]).then(([lpRes, prodRes]) => {
      try {
        const arr = JSON.parse(lpRes?.content || '[]');
        const migrated = Array.isArray(arr) ? arr.map((l: any) => migrateLegacyLanding(l)) : [];
        setLandings(migrated);
        setFileSha(lpRes.sha || '');
      } catch { setLandings([]); }
      try {
        const p = JSON.parse(prodRes?.content || '[]');
        setProducts(Array.isArray(p) ? p.filter((x: any) => x.active !== false) : []);
      } catch { setProducts([]); }
    }).finally(() => setLoading(false));
  }, []);

  const saveAll = async (list: LandingPage[]) => {
    setSaving(true);
    triggerToast('Salvando...', 'progress', 30);
    try {
      const res = await githubApi('write', 'src/data/landingPages.json', {
        content: JSON.stringify(list, null, 2),
        sha: fileSha || undefined,
        message: 'CMS: update landingPages.json',
      });
      setFileSha(res.sha);
      triggerToast('Salvo!', 'success', 100);
    } catch (err: any) {
      triggerToast(`Erro: ${err.message}`, 'error');
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.productSlug) { alert('Escolha um produto.'); return; }
    if (!editing.slug.trim()) {
      const heroBlock = editing.blocks.find(b => b.type === 'hero');
      const headline = heroBlock ? (heroBlock.data as any).headline : '';
      editing.slug = slugify(headline || editing.productSlug);
    }
    const arr = [...landings];
    if (editingIndex === null) arr.unshift(editing);
    else arr[editingIndex] = editing;
    setLandings(arr);
    setEditing(null);
    setEditingIndex(null);
    await saveAll(arr);
  };

  const removeLp = async (i: number) => {
    if (!confirm(`Excluir "${landings[i].slug}"?`)) return;
    const arr = landings.filter((_, idx) => idx !== i);
    setLandings(arr);
    await saveAll(arr);
  };

  const togglePublish = async (i: number) => {
    const arr = [...landings];
    arr[i] = { ...arr[i], published: !arr[i].published };
    setLandings(arr);
    await saveAll(arr);
  };

  // Block actions
  const addBlock = (type: BlockType) => {
    if (!editing) return;
    const nb = makeBlock(type);
    setEditing({ ...editing, blocks: [...editing.blocks, nb] });
    setShowAddMenu(false);
    setExpandedBlock(nb.id);
  };

  const removeBlock = (id: string) => {
    if (!editing) return;
    if (!confirm('Remover este bloco?')) return;
    setEditing({ ...editing, blocks: editing.blocks.filter(b => b.id !== id) });
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    if (!editing) return;
    const idx = editing.blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editing.blocks.length) return;
    const arr = [...editing.blocks];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setEditing({ ...editing, blocks: arr });
  };

  const updateBlockData = (id: string, partial: any) => {
    if (!editing) return;
    setEditing({
      ...editing,
      blocks: editing.blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...partial } } : b),
    });
  };

  const updateBlockStyle = (id: string, style: any) => {
    if (!editing) return;
    setEditing({
      ...editing,
      blocks: editing.blocks.map(b => b.id === id ? { ...b, style: { ...(b.style || {}), ...style } } : b),
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  // ===== LIST VIEW =====
  if (!editing) {
    const startCreate = () => {
      const lp = emptyLandingPage();
      setEditing(lp);
      setEditingIndex(null);
      setExpandedBlock(lp.blocks[0]?.id || '');
    };
    const startEdit = (i: number) => {
      setEditing(JSON.parse(JSON.stringify(landings[i])));
      setEditingIndex(i);
      setExpandedBlock(landings[i].blocks[0]?.id || '');
    };

    return (
      <div className="space-y-6 pb-32">
        <div className="flex items-center justify-between bg-white p-5 px-7 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" /> Landing Pages
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-bold">{landings.filter(l => l.published).length}</span> publicadas · {' '}
              <span className="font-bold">{landings.length}</span> total
            </p>
          </div>
          <div className="flex items-center gap-3">
            {landings.length > 0 && (
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setViewMode('cards')}
                  title="Visualização em cards"
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="Visualização em lista"
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
            <button onClick={startCreate} disabled={products.length === 0} className="bg-slate-800 hover:bg-amber-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Nova landing
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <p className="text-amber-800 font-bold">Cadastre produtos primeiro</p>
            <p className="text-amber-700 text-sm mt-1">
              Landing pages precisam de produto. <a href="/admin/products" className="underline font-medium">Cadastrar produtos</a>
            </p>
          </div>
        ) : landings.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-16 text-center">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhuma landing criada</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Crie landing pages modulares com 11 tipos de blocos.</p>
            <button onClick={startCreate} className="bg-slate-800 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> Criar primeira landing
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {landings.map((lp, i) => {
              const prod = products.find(p => p.slug === lp.productSlug);
              const heroBlock = lp.blocks.find(b => b.type === 'hero');
              const heroData: any = heroBlock?.data || {};
              const headline = heroData.headline || '';
              const thumb = resolveLandingThumbnail(lp, prod?.image) || '';
              const isCustomThumb = !!lp.thumbnail;
              const accent = lp.primaryColor || '#a3592d';
              return (
                <div key={lp.slug + i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all group">
                  {/* Thumb */}
                  <div className="relative aspect-[16/10] bg-slate-100 border-b border-slate-100">
                    {thumb ? (
                      <img src={thumb} alt={headline} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300" style={{ background: `linear-gradient(135deg, ${accent}11, ${accent}22)` }}>
                        <Sparkles className="w-10 h-10" style={{ color: accent }} />
                      </div>
                    )}
                    {/* Color badge */}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ background: accent }} title="Cor primária"></div>
                    {/* Custom thumb badge */}
                    {isCustomThumb && (
                      <div className="absolute top-2 left-10 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-700 uppercase tracking-wider shadow-sm flex items-center gap-1" title="Thumbnail customizada">
                        <ImageIcon className="w-2.5 h-2.5" /> Custom
                      </div>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => togglePublish(i)}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-sm ${lp.published ? 'bg-green-500/95 text-white' : 'bg-slate-500/85 text-white'}`}
                      >
                        {lp.published ? 'Publicada' : 'Rascunho'}
                      </button>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-4">
                    <p className="text-[10px] font-mono text-slate-400 mb-1 truncate">/lp/{lp.slug}</p>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-2 min-h-[2.5em]">{headline || '(sem headline)'}</h3>
                    <p className="text-xs text-slate-500 truncate mb-3">{prod?.name || lp.productSlug || '—'}</p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lp.blocks.length} blocos</span>
                      <div className="flex items-center gap-1">
                        {lp.published && (
                          <a href={`/lp/${lp.slug}`} target="_blank" rel="noopener" title="Ver" className="w-7 h-7 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded inline-flex items-center justify-center">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => startEdit(i)} title="Editar" className="w-7 h-7 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded inline-flex items-center justify-center">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeLp(i)} title="Excluir" className="w-7 h-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded inline-flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-14"></th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Slug</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hero</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                  <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Cor</th>
                  <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Blocos</th>
                  <th className="py-3 px-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {landings.map((lp, i) => {
                  const prod = products.find(p => p.slug === lp.productSlug);
                  const heroBlock = lp.blocks.find(b => b.type === 'hero');
                  const headline = heroBlock ? (heroBlock.data as any).headline : '';
                  const accent = lp.primaryColor || '#a3592d';
                  const thumb = resolveLandingThumbnail(lp, prod?.image);
                  return (
                    <tr key={lp.slug + i} className="hover:bg-slate-50">
                      <td className="py-3 px-5">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}11, ${accent}22)` }}>
                              <Sparkles className="w-4 h-4" style={{ color: accent }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-xs text-slate-600">/lp/{lp.slug}</td>
                      <td className="py-4 px-5 text-sm font-bold text-slate-800 max-w-xs truncate">{headline || '—'}</td>
                      <td className="py-4 px-5 text-xs text-slate-600">{prod?.name || lp.productSlug || '—'}</td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-block w-5 h-5 rounded-full border border-slate-200" style={{ background: accent }} title={accent}></span>
                      </td>
                      <td className="py-4 px-5 text-center text-xs text-slate-600">{lp.blocks.length}</td>
                      <td className="py-4 px-5 text-center">
                        <button onClick={() => togglePublish(i)} className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${lp.published ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                          {lp.published ? 'Publicada' : 'Rascunho'}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {lp.published && (
                            <a href={`/lp/${lp.slug}`} target="_blank" rel="noopener" title="Ver" className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg inline-flex items-center justify-center hover:bg-amber-100 hover:text-amber-700">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button onClick={() => startEdit(i)} title="Editar" className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg inline-flex items-center justify-center hover:bg-amber-100 hover:text-amber-700">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeLp(i)} title="Excluir" className="w-8 h-8 bg-red-50 text-red-500 rounded-lg inline-flex items-center justify-center hover:bg-red-500 hover:text-white">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ===== EDIT VIEW =====
  const e = editing;
  const allBlockTypes = Object.keys(BLOCK_META) as BlockType[];

  return (
    <div className="space-y-4 pb-32 max-w-4xl">
      <div className="flex items-center justify-between bg-white p-5 px-7 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => { setEditing(null); setEditingIndex(null); }} className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{editingIndex !== null ? 'Editar landing' : 'Nova landing'}</h2>
            {e.slug && <p className="font-mono text-xs text-slate-400">/lp/{e.slug} · {e.blocks.length} bloco(s)</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {e.published && e.slug && (
            <a href={`/lp/${e.slug}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-medium">
              <ExternalLink className="w-4 h-4" /> Ver
            </a>
          )}
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={e.published} onChange={ev => setEditing({ ...e, published: ev.target.checked })} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
            <span className="font-medium text-slate-700">Publicada</span>
          </label>
          <button onClick={saveEdit} disabled={saving} className="bg-slate-800 hover:bg-amber-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Produto *</label>
            <select value={e.productSlug} onChange={ev => setEditing({ ...e, productSlug: ev.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20">
              <option value="">— escolha o produto —</option>
              {products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Slug</label>
            <input type="text" value={e.slug} onChange={ev => setEditing({ ...e, slug: slugify(ev.target.value) })} placeholder="auto-gerado se vazio" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        {/* ===== Fonte global da landing (cards visuais com preview) ===== */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Fonte da página</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {FONT_OPTIONS.map(f => {
              const active = (e.fontFamily || '') === f.value;
              return (
                <button
                  key={f.value || 'default'}
                  type="button"
                  onClick={() => setEditing({ ...e, fontFamily: f.value || undefined })}
                  className={`group relative text-left p-3 rounded-xl border-2 transition-all overflow-hidden ${
                    active
                      ? 'border-amber-600 bg-amber-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Preview da fonte */}
                  <div
                    className="text-2xl font-extrabold mb-1 leading-tight text-slate-800"
                    style={{ fontFamily: f.cssStack, letterSpacing: '-0.02em' }}
                  >
                    Aa
                  </div>
                  <div
                    className="text-sm leading-tight text-slate-700 mb-2 truncate"
                    style={{ fontFamily: f.cssStack }}
                  >
                    {f.displayName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">
                    {f.value || 'default'}
                  </div>
                  {active && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-amber-600 text-white rounded-full flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Aplica em todos os títulos e textos da landing.
          </p>
        </div>

        {/* ===== Cor primária da landing ===== */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cor primária da landing</label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map(preset => {
              const active = (e.primaryColor || '').toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setEditing({ ...e, primaryColor: preset.hex })}
                  title={preset.name}
                  className={`group relative w-9 h-9 rounded-lg transition-all ${active ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105'}`}
                  style={{ background: preset.hex }}
                >
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    {preset.name}
                  </span>
                </button>
              );
            })}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
              <input
                type="color"
                value={e.primaryColor || '#a3592d'}
                onChange={ev => setEditing({ ...e, primaryColor: ev.target.value })}
                className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                title="Cor customizada"
              />
              <input
                type="text"
                value={e.primaryColor || ''}
                onChange={ev => setEditing({ ...e, primaryColor: ev.target.value })}
                placeholder="#a3592d"
                className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
              {e.primaryColor && (
                <button
                  type="button"
                  onClick={() => setEditing({ ...e, primaryColor: '' })}
                  className="text-[10px] font-bold uppercase text-slate-500 hover:text-red-600 tracking-wider"
                  title="Usar cor do tema"
                >
                  reset
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Aplica em todos os blocos da landing. Vazio = usa cor do tema do site.
          </p>
        </div>

        {/* ===== Thumbnail da landing (admin + og:image) ===== */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" /> Thumbnail da landing
          </label>
          <div className="flex items-start gap-4">
            <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              {(() => {
                const prod = products.find(p => p.slug === e.productSlug);
                const resolved = resolveLandingThumbnail(e, prod?.image);
                if (resolved) {
                  return <img src={resolved} alt="" className="w-full h-full object-cover" />;
                }
                return (
                  <div className="w-full h-full flex items-center justify-center text-slate-300" style={{ background: `linear-gradient(135deg, ${(e.primaryColor || '#a3592d')}11, ${(e.primaryColor || '#a3592d')}22)` }}>
                    <Sparkles className="w-6 h-6" style={{ color: e.primaryColor || '#a3592d' }} />
                  </div>
                );
              })()}
              {e.thumbnail && (
                <span className="absolute top-1 left-1 bg-amber-600 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">custom</span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <ImageInput
                value={e.thumbnail || ''}
                onChange={(v) => setEditing({ ...e, thumbnail: v || undefined })}
                placeholder="https://... ou /uploads/lp-thumb.jpg"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {e.thumbnail ? (
                  <>Thumb customizada ativa. Usada na listagem do admin e como <code className="bg-slate-100 px-1 rounded">og:image</code>.</>
                ) : (
                  <>Vazio = deriva automaticamente: <strong>imagem do hero</strong> → <strong>imagem do produto</strong>.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <WidgetsEditor lp={e} onChange={(patch) => setEditing({ ...e, widgets: { ...(e.widgets || {}), ...patch } })} />

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">Blocos da página · setas pra reordenar</p>

        {e.blocks.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <p className="text-slate-500 text-sm">Nenhum bloco — adicione abaixo</p>
          </div>
        ) : (
          e.blocks.map((block, idx) => {
            const meta = BLOCK_META[block.type];
            const Icon = ICON_MAP[meta.icon] || Plus;
            const isOpen = expandedBlock === block.id;
            return (
              <div key={block.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 p-3 px-4 hover:bg-slate-50 transition-colors group">
                  <GripVertical className="w-4 h-4 text-slate-300" />
                  <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedBlock(isOpen ? '' : block.id)}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.isStructural ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">{meta.label}</p>
                      <p className="text-xs text-slate-400 truncate">{blockPreview(block)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} className="w-7 h-7 text-slate-300 hover:text-slate-700 disabled:opacity-20 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-center">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={idx === e.blocks.length - 1} className="w-7 h-7 text-slate-300 hover:text-slate-700 disabled:opacity-20 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-center">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => removeBlock(block.id)} className="w-7 h-7 text-slate-300 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-4">
                    <BlockBackgroundPicker block={block} onChange={(s) => updateBlockStyle(block.id, s)} />
                    <BlockEditor block={block} onChange={(partial) => updateBlockData(block.id, partial)} />
                  </div>
                )}
              </div>
            );
          })
        )}

        {showAddMenu ? (
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800">Adicionar bloco</p>
              <button onClick={() => setShowAddMenu(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Estruturais</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {allBlockTypes.filter(t => BLOCK_META[t].isStructural).map(t => {
                const meta = BLOCK_META[t];
                const Icon = ICON_MAP[meta.icon] || Plus;
                return (
                  <button key={t} type="button" onClick={() => addBlock(t)} className="flex flex-col items-center gap-1.5 p-3 border border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-colors text-center">
                    <Icon className="w-5 h-5 text-amber-700" />
                    <span className="text-xs font-bold text-slate-800">{meta.label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{meta.desc}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Modulares</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {allBlockTypes.filter(t => !BLOCK_META[t].isStructural).map(t => {
                const meta = BLOCK_META[t];
                const Icon = ICON_MAP[meta.icon] || Plus;
                return (
                  <button key={t} type="button" onClick={() => addBlock(t)} className="flex flex-col items-center gap-1.5 p-3 border border-slate-200 rounded-xl hover:border-violet-500 hover:bg-violet-50 transition-colors text-center">
                    <Icon className="w-5 h-5 text-violet-700" />
                    <span className="text-xs font-bold text-slate-800">{meta.label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{meta.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddMenu(true)} className="w-full py-3 border-2 border-dashed border-amber-300 text-amber-700 rounded-2xl hover:bg-amber-50 hover:border-amber-500 transition-colors text-sm font-bold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar bloco
          </button>
        )}
      </div>

      <details className="bg-white border border-slate-200 rounded-2xl">
        <summary className="cursor-pointer p-5 font-bold text-sm text-slate-700 list-none flex items-center justify-between">
          <span>SEO (opcional)</span>
          <ChevronDown className="w-4 h-4" />
        </summary>
        <div className="border-t border-slate-100 p-5 space-y-3">
          <input type="text" value={e.seo.title} onChange={ev => setEditing({ ...e, seo: { ...e.seo, title: ev.target.value } })} placeholder="Título SEO (vazio = gera do hero)" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
          <textarea rows={2} value={e.seo.description} onChange={ev => setEditing({ ...e, seo: { ...e.seo, description: ev.target.value } })} placeholder="Meta description" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 resize-y" />
        </div>
      </details>
    </div>
  );
}

function blockPreview(b: Block): string {
  const d: any = b.data;
  if (b.type === 'hero') return d.headline || '(sem headline)';
  if (b.type === 'problem') return d.headline || `${(d.items || []).length} item(s)`;
  if (b.type === 'solution') return d.headline || (d.text || '').slice(0, 60);
  if (b.type === 'benefits') return `${(d.items || []).filter((s: string) => s).length} benefício(s)`;
  if (b.type === 'testimonials') return `${(d.items || []).length} depoimento(s)`;
  if (b.type === 'faq') return `${(d.items || []).length} pergunta(s)`;
  if (b.type === 'cta-final') return d.headline || '(CTA)';
  if (b.type === 'text-image') return d.headline || (d.text || '').slice(0, 60);
  if (b.type === 'gallery') return `${(d.images || []).filter((i: any) => i.src).length} imagem(s)`;
  if (b.type === 'stats') return `${(d.items || []).length} estatística(s)`;
  if (b.type === 'quote') return d.text ? `"${d.text.slice(0, 60)}..."` : '(sem texto)';
  if (b.type === 'countdown') return d.targetDate ? `até ${new Date(d.targetDate).toLocaleString('pt-BR')}` : '(sem data)';
  return '';
}

function BlockBackgroundPicker({ block, onChange }: { block: Block; onChange: (style: any) => void }) {
  const currentBg = block.style?.background;
  const currentTxt = block.style?.textColor;
  const isHexBg = typeof currentBg === 'string' && /^#[0-9a-f]{6}$/i.test(currentBg);
  const isHexTxt = typeof currentTxt === 'string' && /^#[0-9a-f]{6}$/i.test(currentTxt);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
      {/* Background */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Fundo da seção</label>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onChange({ background: undefined })}
            title="Padrão do bloco"
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md border ${!currentBg ? 'border-slate-800 bg-slate-100' : 'border-slate-200 hover:border-slate-400'}`}
          >
            auto
          </button>
          {BG_PRESETS.map(preset => {
            const active = currentBg === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange({ background: preset.value })}
                title={preset.label}
                className={`group relative w-8 h-8 rounded-md border transition-all ${active ? 'ring-2 ring-offset-2 ring-slate-800' : 'border-slate-200 hover:scale-105'}`}
                style={{ background: preset.preview }}
              >
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                  {preset.label}
                </span>
              </button>
            );
          })}
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-200">
            <input
              type="color"
              value={isHexBg ? (currentBg as string) : '#a3592d'}
              onChange={ev => onChange({ background: ev.target.value })}
              className={`w-8 h-8 rounded-md cursor-pointer border ${isHexBg ? 'border-slate-800 ring-2 ring-offset-2 ring-slate-800' : 'border-slate-200'}`}
              title="Cor customizada"
            />
            {isHexBg && <span className="text-[10px] font-mono text-slate-600">{currentBg}</span>}
          </div>
        </div>
      </div>

      {/* Text color */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cor do texto</label>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onChange({ textColor: undefined })}
            title="Auto (contraste com fundo)"
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md border ${!currentTxt ? 'border-slate-800 bg-slate-100' : 'border-slate-200 hover:border-slate-400'}`}
          >
            auto
          </button>
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <input
              type="color"
              value={isHexTxt ? (currentTxt as string) : '#000000'}
              onChange={ev => onChange({ textColor: ev.target.value })}
              className={`w-8 h-8 rounded-md cursor-pointer border ${isHexTxt ? 'border-slate-800 ring-2 ring-offset-2 ring-slate-800' : 'border-slate-200'}`}
              title="Cor customizada"
            />
            {isHexTxt && (
              <>
                <span className="text-[10px] font-mono text-slate-600">{currentTxt}</span>
                <button
                  type="button"
                  onClick={() => onChange({ textColor: undefined })}
                  className="text-[10px] font-bold uppercase text-slate-400 hover:text-red-600 tracking-wider"
                >
                  reset
                </button>
              </>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Sobrescreve o contraste automático. Use só se o auto ficar ruim.
        </p>
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (partial: any) => void }) {
  const d: any = block.data;
  const Lbl = ({ children }: { children: React.ReactNode }) => <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{children}</label>;
  const Inp = (props: any) => <input {...props} className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 ${props.className || ''}`} />;
  const Txt = (props: any) => <textarea {...props} className={`w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-y ${props.className || ''}`} />;

  if (block.type === 'hero') return (
    <div className="space-y-3">
      <div><Lbl>Headline</Lbl><Txt rows={2} value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <div><Lbl>Sub-headline</Lbl><Txt rows={2} value={d.subheadline} onChange={(e: any) => onChange({ subheadline: e.target.value })} /></div>
      <div><Lbl>CTA texto</Lbl><Inp value={d.cta} onChange={(e: any) => onChange({ cta: e.target.value })} /></div>
      <div>
        <Lbl>Imagem (vazio = usa do produto)</Lbl>
        <ImageInput value={d.image} onChange={(url) => onChange({ image: url })} folder="lp" fileSlug="hero" aspectRatio="4/5" recommendedSize="800×1000px" />
      </div>
    </div>
  );

  if (block.type === 'problem') return (
    <div className="space-y-3">
      <div><Lbl>Headline</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <Lbl>Lista de problemas</Lbl>
      <StringListEditor items={d.items || []} onChange={(items) => onChange({ items })} color="red" placeholder="Faz dieta e recupera depois" />
    </div>
  );

  if (block.type === 'solution') return (
    <div className="space-y-3">
      <div><Lbl>Headline</Lbl><Txt rows={2} value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <div><Lbl>Texto</Lbl><Txt rows={4} value={d.text} onChange={(e: any) => onChange({ text: e.target.value })} /></div>
      <div>
        <Lbl>Imagem (opcional)</Lbl>
        <ImageInput value={d.image} onChange={(url) => onChange({ image: url })} folder="lp" fileSlug="solution" aspectRatio="4/3" recommendedSize="800×600px" />
      </div>
    </div>
  );

  if (block.type === 'benefits') return (
    <div className="space-y-3">
      <div><Lbl>Headline</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <Lbl>Lista de benefícios</Lbl>
      <StringListEditor items={d.items || []} onChange={(items) => onChange({ items })} color="emerald" placeholder="Comunidade ativa Telegram" />
    </div>
  );

  if (block.type === 'testimonials') return (
    <div className="space-y-3">
      <div><Lbl>Headline</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <Lbl>Depoimentos</Lbl>
      <TestimonialsListEditor items={d.items || []} onChange={(items) => onChange({ items })} />
    </div>
  );

  if (block.type === 'faq') return (
    <div className="space-y-3">
      <div><Lbl>Headline</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <Lbl>Perguntas</Lbl>
      <FaqListEditor items={d.items || []} onChange={(items) => onChange({ items })} />
    </div>
  );

  if (block.type === 'cta-final') return (
    <div className="space-y-3">
      <div><Lbl>Headline</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <div><Lbl>Subtexto</Lbl><Txt rows={2} value={d.subtext} onChange={(e: any) => onChange({ subtext: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>CTA texto</Lbl><Inp value={d.cta} onChange={(e: any) => onChange({ cta: e.target.value })} /></div>
        <div><Lbl>Urgência</Lbl><Inp value={d.urgency} onChange={(e: any) => onChange({ urgency: e.target.value })} placeholder="Oferta limitada" /></div>
      </div>
    </div>
  );

  if (block.type === 'text-image') return (
    <div className="space-y-3">
      <div><Lbl>Headline</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <div><Lbl>Texto</Lbl><Txt rows={4} value={d.text} onChange={(e: any) => onChange({ text: e.target.value })} /></div>
      <div>
        <Lbl>Posição da imagem</Lbl>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button type="button" onClick={() => onChange({ imagePosition: 'left' })} className={`px-3 py-1.5 text-xs font-bold rounded-md ${d.imagePosition === 'left' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>← esquerda</button>
          <button type="button" onClick={() => onChange({ imagePosition: 'right' })} className={`px-3 py-1.5 text-xs font-bold rounded-md ${d.imagePosition !== 'left' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>direita →</button>
        </div>
      </div>
      <div>
        <Lbl>Imagem</Lbl>
        <ImageInput value={d.image} onChange={(url) => onChange({ image: url })} folder="lp" fileSlug="text-image" aspectRatio="4/3" recommendedSize="800×600px" />
      </div>
    </div>
  );

  if (block.type === 'gallery') return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_120px] gap-3 items-end">
        <div><Lbl>Headline (opcional)</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
        <div>
          <Lbl>Colunas</Lbl>
          <select value={d.columns} onChange={(e: any) => onChange({ columns: parseInt(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
            <option value={2}>2 cols</option>
            <option value={3}>3 cols</option>
            <option value={4}>4 cols</option>
          </select>
        </div>
      </div>
      <Lbl>Imagens</Lbl>
      <GalleryEditor images={d.images || []} onChange={(images) => onChange({ images })} />
    </div>
  );

  if (block.type === 'stats') return (
    <div className="space-y-3">
      <div><Lbl>Headline (opcional)</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} /></div>
      <Lbl>Estatísticas</Lbl>
      <StatsEditor items={d.items || []} onChange={(items) => onChange({ items })} />
    </div>
  );

  if (block.type === 'quote') return (
    <div className="space-y-3">
      <div><Lbl>Citação</Lbl><Txt rows={3} value={d.text} onChange={(e: any) => onChange({ text: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Autor</Lbl><Inp value={d.author} onChange={(e: any) => onChange({ author: e.target.value })} /></div>
        <div><Lbl>Cargo (opcional)</Lbl><Inp value={d.role} onChange={(e: any) => onChange({ role: e.target.value })} /></div>
      </div>
    </div>
  );

  if (block.type === 'countdown') return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Lbl>Data/hora final *</Lbl>
          <Inp
            type="datetime-local"
            value={d.targetDate}
            onChange={(e: any) => onChange({ targetDate: e.target.value })}
            className="font-mono text-xs"
          />
        </div>
        <div>
          <Lbl>Layout</Lbl>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button type="button" onClick={() => onChange({ layout: 'box' })} className={`px-3 py-1.5 text-xs font-bold rounded-md ${d.layout === 'box' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Box</button>
            <button type="button" onClick={() => onChange({ layout: 'banner' })} className={`px-3 py-1.5 text-xs font-bold rounded-md ${d.layout === 'banner' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Banner</button>
          </div>
        </div>
      </div>
      <div><Lbl>Headline</Lbl><Inp value={d.headline} onChange={(e: any) => onChange({ headline: e.target.value })} placeholder="Oferta termina em" /></div>
      <div><Lbl>Mensagem quando expirar</Lbl><Inp value={d.expiredMessage} onChange={(e: any) => onChange({ expiredMessage: e.target.value })} placeholder="Oferta encerrada" /></div>
    </div>
  );

  return null;
}

function StringListEditor({ items, onChange, color, placeholder }: { items: string[]; onChange: (items: string[]) => void; color: 'red' | 'emerald'; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const colors = color === 'red'
    ? { bullet: 'bg-red-500', add: 'border-red-300 text-red-700 hover:border-red-500 hover:bg-red-50' }
    : { bullet: 'bg-emerald-500', add: 'border-emerald-300 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50' };

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 group">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.bullet}`}></span>
          <input type="text" value={item} onChange={e => onChange(items.map((it, idx) => idx === i ? e.target.value : it))} className="flex-1 bg-transparent text-xs focus:outline-none" />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className={`flex items-center gap-2 border border-dashed rounded-lg px-2.5 py-1.5 ${colors.add}`}>
        <Plus className="w-3.5 h-3.5 shrink-0" />
        <input type="text" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(''); } } }} placeholder={placeholder} className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-current placeholder:opacity-50" />
        {draft.trim() && (
          <button type="button" onClick={() => { onChange([...items, draft.trim()]); setDraft(''); }} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded hover:bg-white/50">add</button>
        )}
      </div>
    </div>
  );
}

function TestimonialsListEditor({ items, onChange }: { items: any[]; onChange: (items: any[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((t, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">#{i + 1}</span>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
          </div>

          {/* Avatar + nome + rating em uma linha */}
          <div className="flex items-start gap-3">
            <div className="shrink-0" style={{ width: '60px' }}>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avatar</div>
              <AvatarInput
                value={t.avatar || ''}
                onChange={(url) => onChange(items.map((it, idx) => idx === i ? { ...it, avatar: url } : it))}
                slug={`testimonial-${i + 1}`}
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <input type="text" value={t.name} onChange={e => onChange(items.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))} placeholder="Marina, 41" className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500" />
                <select value={t.rating} onChange={e => onChange(items.map((it, idx) => idx === i ? { ...it, rating: parseInt(e.target.value) } : it))} className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500">
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                </select>
              </div>
              <textarea rows={2} value={t.text} onChange={e => onChange(items.map((it, idx) => idx === i ? { ...it, text: e.target.value } : it))} placeholder="Texto..." className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs resize-y focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { name: '', text: '', rating: 5, avatar: '' }])} className="w-full py-2 border border-dashed border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
        <Plus className="w-3 h-3" /> Adicionar
      </button>
    </div>
  );
}

// ===== Avatar input compacto (circular preview, upload+url tabs) =====
function AvatarInput({ value, onChange, slug }: { value: string; onChange: (url: string) => void; slug: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError('');
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use JPG, PNG ou WebP');
      return;
    }
    if (file.size > 500 * 1024) {
      setError('Max 500KB');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const ghPath = `public/uploads/avatars/${Date.now()}-${slug}.${ext}`;
      await githubApi('write', ghPath, { content: base64, isBase64: true, message: `Upload avatar ${slug}` });
      onChange(ghPath.replace(/^public/, ''));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1">
      <label className="relative block w-[60px] h-[60px] rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 hover:border-amber-400 cursor-pointer group transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          className="hidden"
        />
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" onError={() => setError('URL inválida')} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 group-hover:text-amber-500 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-full">
            <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
          </div>
        )}
      </label>
      {value && !uploading && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onChange(''); }}
          className="text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-600 block w-[60px] text-center"
        >
          remover
        </button>
      )}
      {error && (
        <p className="text-[9px] text-red-600 leading-tight" style={{ width: '60px' }}>{error}</p>
      )}
    </div>
  );
}

function FaqListEditor({ items, onChange }: { items: any[]; onChange: (items: any[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">#{i + 1}</span>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
          </div>
          <input type="text" value={it.q} onChange={e => onChange(items.map((x, idx) => idx === i ? { ...x, q: e.target.value } : x))} placeholder="Pergunta..." className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-amber-500" />
          <textarea rows={2} value={it.a} onChange={e => onChange(items.map((x, idx) => idx === i ? { ...x, a: e.target.value } : x))} placeholder="Resposta..." className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs resize-y focus:outline-none focus:border-amber-500" />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { q: '', a: '' }])} className="w-full py-2 border border-dashed border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
        <Plus className="w-3 h-3" /> Adicionar
      </button>
    </div>
  );
}

// ===== Widgets globais (Promo Bar / Social Proof / Exit Popup) =====
const EMPTY_PROMO = { enabled: false, emoji: '🎯', text: '', ctaText: 'Ver agora', ctaLink: '', background: 'primary' as const };
const EMPTY_SOCIAL = { enabled: false, items: [], intervalSeconds: 8, position: 'bottom-left' as const };
const EMPTY_EXIT = { enabled: false, headline: '', subtext: '', ctaText: 'Garantir desconto', couponCode: '' };

function WidgetsEditor({ lp, onChange }: { lp: LandingPage; onChange: (patch: any) => void }) {
  const widgets = lp.widgets || {};
  const promo = widgets.promoBar;
  const social = widgets.socialProof;
  const exit = widgets.exitPopup;
  const [openSection, setOpenSection] = useState<string>('');
  const WLbl = ({ children }: { children: React.ReactNode }) => <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{children}</label>;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" /> Plugins da página
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">3 widgets opcionais — toggle pra ativar</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <WidgetBadge enabled={!!promo?.enabled} label="Promo" />
          <WidgetBadge enabled={!!social?.enabled} label="Social proof" />
          <WidgetBadge enabled={!!exit?.enabled} label="Exit popup" />
        </div>
      </div>

      <div className="space-y-2">
        <WidgetCard
          title="Promo bar (sticky top)"
          enabled={!!promo?.enabled}
          isOpen={openSection === 'promo'}
          onToggleOpen={() => setOpenSection(openSection === 'promo' ? '' : 'promo')}
          onToggleEnabled={(v) => onChange({ promoBar: { ...EMPTY_PROMO, ...(promo || {}), enabled: v } })}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <WLbl>Emoji</WLbl>
                <input type="text" value={promo?.emoji || ''} onChange={e => onChange({ promoBar: { ...EMPTY_PROMO, ...(promo || {}), emoji: e.target.value } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-lg text-center focus:outline-none focus:border-amber-500" placeholder="🎯" />
              </div>
              <div>
                <WLbl>Texto</WLbl>
                <input type="text" value={promo?.text || ''} onChange={e => onChange({ promoBar: { ...EMPTY_PROMO, ...(promo || {}), text: e.target.value } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="Esta semana: 30% OFF" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <WLbl>CTA texto</WLbl>
                <input type="text" value={promo?.ctaText || ''} onChange={e => onChange({ promoBar: { ...EMPTY_PROMO, ...(promo || {}), ctaText: e.target.value } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="Ver promoção" />
              </div>
              <div>
                <WLbl>Fundo</WLbl>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                  <button type="button" onClick={() => onChange({ promoBar: { ...EMPTY_PROMO, ...(promo || {}), background: 'primary' } })} className={`px-3 py-1.5 text-xs font-bold rounded-md ${(!promo || promo.background === 'primary') ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Primary</button>
                  <button type="button" onClick={() => onChange({ promoBar: { ...EMPTY_PROMO, ...(promo || {}), background: 'ink' } })} className={`px-3 py-1.5 text-xs font-bold rounded-md ${promo?.background === 'ink' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Ink</button>
                </div>
              </div>
            </div>
            <div>
              <WLbl>Link CTA (opcional)</WLbl>
              <input type="text" value={promo?.ctaLink || ''} onChange={e => onChange({ promoBar: { ...EMPTY_PROMO, ...(promo || {}), ctaLink: e.target.value } })} placeholder="Vazio = usa /go/{produto}" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </WidgetCard>

        <WidgetCard
          title="Social proof popup (notifications)"
          enabled={!!social?.enabled}
          isOpen={openSection === 'social'}
          onToggleOpen={() => setOpenSection(openSection === 'social' ? '' : 'social')}
          onToggleEnabled={(v) => onChange({ socialProof: { ...EMPTY_SOCIAL, ...(social || {}), enabled: v } })}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <WLbl>Intervalo (seg)</WLbl>
                <input type="number" min={3} max={60} value={social?.intervalSeconds || 8} onChange={e => onChange({ socialProof: { ...EMPTY_SOCIAL, ...(social || {}), intervalSeconds: parseInt(e.target.value) || 8 } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <WLbl>Posição</WLbl>
                <select value={social?.position || 'bottom-left'} onChange={e => onChange({ socialProof: { ...EMPTY_SOCIAL, ...(social || {}), position: e.target.value as any } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                  <option value="bottom-left">Canto inferior esquerdo</option>
                  <option value="bottom-right">Canto inferior direito</option>
                </select>
              </div>
            </div>
            <div>
              <WLbl>Notifications (rotacionam em loop)</WLbl>
              <SocialProofItemsEditor items={social?.items || []} onChange={(items) => onChange({ socialProof: { ...EMPTY_SOCIAL, ...(social || {}), items } })} />
            </div>
          </div>
        </WidgetCard>

        <WidgetCard
          title="Exit popup (mouseleave / back gesture)"
          enabled={!!exit?.enabled}
          isOpen={openSection === 'exit'}
          onToggleOpen={() => setOpenSection(openSection === 'exit' ? '' : 'exit')}
          onToggleEnabled={(v) => onChange({ exitPopup: { ...EMPTY_EXIT, ...(exit || {}), enabled: v } })}
        >
          <div className="space-y-3">
            <div>
              <WLbl>Headline *</WLbl>
              <input type="text" value={exit?.headline || ''} onChange={e => onChange({ exitPopup: { ...EMPTY_EXIT, ...(exit || {}), headline: e.target.value } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="Espera! 20% OFF antes de sair" />
            </div>
            <div>
              <WLbl>Subtexto</WLbl>
              <textarea rows={2} value={exit?.subtext || ''} onChange={e => onChange({ exitPopup: { ...EMPTY_EXIT, ...(exit || {}), subtext: e.target.value } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:border-amber-500" placeholder="Cupom exclusivo só pra quem chegou até aqui." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <WLbl>CTA texto</WLbl>
                <input type="text" value={exit?.ctaText || ''} onChange={e => onChange({ exitPopup: { ...EMPTY_EXIT, ...(exit || {}), ctaText: e.target.value } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" placeholder="Garantir desconto" />
              </div>
              <div>
                <WLbl>Cupom (opcional)</WLbl>
                <input type="text" value={exit?.couponCode || ''} onChange={e => onChange({ exitPopup: { ...EMPTY_EXIT, ...(exit || {}), couponCode: e.target.value } })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500" placeholder="VOLTA20" />
              </div>
            </div>
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

function WidgetBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${enabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-400'}`}>
      {enabled ? '● ' : '○ '}{label}
    </span>
  );
}

function WidgetCard({ title, enabled, isOpen, onToggleOpen, onToggleEnabled, children }: {
  title: string; enabled: boolean; isOpen: boolean;
  onToggleOpen: () => void; onToggleEnabled: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${enabled ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-3 p-3 px-4">
        <label className="relative cursor-pointer shrink-0">
          <input type="checkbox" checked={enabled} onChange={e => onToggleEnabled(e.target.checked)} className="sr-only peer" />
          <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-amber-600 transition-colors"></div>
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
        </label>
        <button type="button" onClick={onToggleOpen} className="flex-1 text-left text-sm font-bold text-slate-800">{title}</button>
        <button type="button" onClick={onToggleOpen} className="text-slate-400 shrink-0">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {isOpen && <div className="border-t border-slate-100 p-4 bg-white">{children}</div>}
    </div>
  );
}

function SocialProofItemsEditor({ items, onChange }: { items: any[]; onChange: (items: any[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">#{i + 1}</span>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <input type="text" value={it.name || ''} onChange={e => onChange(items.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} placeholder="Marina" className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500" />
            <input type="text" value={it.location || ''} onChange={e => onChange(items.map((x, idx) => idx === i ? { ...x, location: e.target.value } : x))} placeholder="SP" className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={it.product || ''} onChange={e => onChange(items.map((x, idx) => idx === i ? { ...x, product: e.target.value } : x))} placeholder="Produto (vazio = nome da LP)" className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500" />
            <input type="text" value={it.time || ''} onChange={e => onChange(items.map((x, idx) => idx === i ? { ...x, time: e.target.value } : x))} placeholder="há 3 minutos" className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500" />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { name: '', location: '', product: '', time: 'agora' }])} className="w-full py-2 border border-dashed border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
        <Plus className="w-3 h-3" /> Adicionar notification
      </button>
    </div>
  );
}

function GalleryEditor({ images, onChange }: { images: any[]; onChange: (items: any[]) => void }) {
  return (
    <div className="space-y-3">
      {images.map((img, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Imagem #{i + 1}</span>
            <button type="button" onClick={() => onChange(images.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ImageInput
            value={img.src}
            onChange={(url) => onChange(images.map((x, idx) => idx === i ? { ...x, src: url } : x))}
            folder="lp"
            fileSlug={`gallery-${i + 1}`}
            aspectRatio="4/3"
            recommendedSize="600×450px"
            compact
          />
          <input
            type="text"
            value={img.caption || ''}
            onChange={e => onChange(images.map((x, idx) => idx === i ? { ...x, caption: e.target.value } : x))}
            placeholder="Legenda (opcional)"
            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...images, { src: '', caption: '' }])} className="w-full py-2 border border-dashed border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
        <Plus className="w-3 h-3" /> Adicionar imagem
      </button>
    </div>
  );
}

function StatsEditor({ items, onChange }: { items: any[]; onChange: (items: any[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((stat, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2">
          <input type="text" value={stat.value} onChange={e => onChange(items.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} placeholder="1240" className="w-28 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <input type="text" value={stat.label} onChange={e => onChange(items.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="alunos atendidos" className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500" />
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { value: '', label: '' }])} className="w-full py-2 border border-dashed border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
        <Plus className="w-3 h-3" /> Adicionar
      </button>
    </div>
  );
}
