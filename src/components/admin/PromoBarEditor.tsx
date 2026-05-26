import React, { useState, useEffect } from 'react';
import { Save, Loader2, Megaphone, Eye, EyeOff } from 'lucide-react';
import { triggerToast } from './CmsToaster';
import { githubApi } from '../../lib/adminApi';

interface PromoBar {
  enabled: boolean;
  emoji: string;
  text: string;
  ctaText: string;
  productSlug: string;
  dismissible: boolean;
  background: 'primary' | 'ink';
}

const EMPTY: PromoBar = {
  enabled: false,
  emoji: '🎯',
  text: '',
  ctaText: 'Ver promoção',
  productSlug: '',
  dismissible: true,
  background: 'primary',
};

export default function PromoBarEditor() {
  const [promo, setPromo] = useState<PromoBar>(EMPTY);
  const [products, setProducts] = useState<any[]>([]);
  const [fileSha, setFileSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      githubApi('read', 'src/data/promoBar.json').catch(() => ({ content: JSON.stringify(EMPTY), sha: '' })),
      githubApi('read', 'src/data/products.json').catch(() => ({ content: '[]', sha: '' })),
    ]).then(([promoRes, prodRes]) => {
      try {
        const p = JSON.parse(promoRes?.content || '{}');
        setPromo({ ...EMPTY, ...p });
        setFileSha(promoRes.sha || '');
      } catch {
        setPromo(EMPTY);
      }
      try {
        const arr = JSON.parse(prodRes?.content || '[]');
        setProducts(Array.isArray(arr) ? arr.filter((p: any) => p.active) : []);
      } catch { setProducts([]); }
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setError('');
    triggerToast('Salvando promo bar...', 'progress', 30);
    try {
      const res = await githubApi('write', 'src/data/promoBar.json', {
        content: JSON.stringify(promo, null, 2),
        sha: fileSha || undefined,
        message: 'CMS: update promoBar.json',
      });
      setFileSha(res.sha);
      triggerToast('Promo bar atualizada!', 'success', 100);
    } catch (err: any) {
      setError(err.message);
      triggerToast(`Erro: ${err.message}`, 'error');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6 pb-32">
      <div className="flex items-center justify-between bg-white p-5 px-7 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${promo.enabled ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Promo Bar</h2>
            <p className="text-xs text-slate-500 mt-0.5">Faixa promocional no topo do site</p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="bg-slate-800 hover:bg-amber-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>}

      {/* Live preview */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
        <div className={`relative rounded-xl overflow-hidden ${promo.enabled ? '' : 'opacity-50'}`}>
          <div className={`${promo.background === 'ink' ? 'bg-slate-900 text-white' : 'bg-amber-700 text-white'} px-6 py-3`}>
            <div className="flex items-center justify-center gap-3 flex-wrap text-sm font-medium text-center">
              {promo.emoji && <span>{promo.emoji}</span>}
              <span>{promo.text || '(sem texto)'}</span>
              {promo.ctaText && (
                <span className="font-mono uppercase text-xs border-b border-current pb-0.5">
                  {promo.ctaText} →
                </span>
              )}
            </div>
          </div>
          {!promo.enabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
              <span className="bg-white px-3 py-1 rounded mono text-xs font-bold text-slate-600 uppercase">desligada</span>
            </div>
          )}
        </div>
      </div>

      {/* Toggle */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-bold text-slate-800 text-base">Promo bar ativa</p>
            <p className="text-xs text-slate-500 mt-1">Exibe a faixa no topo de todas as páginas</p>
          </div>
          <div className="relative">
            <input type="checkbox" checked={promo.enabled} onChange={e => setPromo({ ...promo, enabled: e.target.checked })} className="sr-only peer" />
            <div className="w-14 h-7 bg-slate-200 rounded-full peer-checked:bg-amber-600 transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-7"></div>
          </div>
        </label>
      </div>

      {/* Content */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 mb-2">Conteúdo</h3>

        <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-3">
          <Field label="Emoji">
            <input type="text" value={promo.emoji} onChange={e => setPromo({ ...promo, emoji: e.target.value })} className="admin-input text-center text-lg" placeholder="🎯" />
          </Field>
          <Field label="Texto da promo">
            <input type="text" value={promo.text} onChange={e => setPromo({ ...promo, text: e.target.value })} className="admin-input" placeholder="Esta semana: 30% OFF no Curso X" />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="CTA text">
            <input type="text" value={promo.ctaText} onChange={e => setPromo({ ...promo, ctaText: e.target.value })} className="admin-input" placeholder="Ver promoção" />
          </Field>
          <Field label="Produto (link /go/slug)">
            <select value={promo.productSlug} onChange={e => setPromo({ ...promo, productSlug: e.target.value })} className="admin-input">
              <option value="">— sem produto —</option>
              {products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Style */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 mb-2">Estilo</h3>

        <Field label="Cor de fundo">
          <div className="flex gap-2">
            <button onClick={() => setPromo({ ...promo, background: 'primary' })} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${promo.background === 'primary' ? 'bg-amber-700 text-white ring-2 ring-amber-500 ring-offset-2' : 'bg-slate-100 text-slate-600'}`}>
              Primary (terracota)
            </button>
            <button onClick={() => setPromo({ ...promo, background: 'ink' })} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${promo.background === 'ink' ? 'bg-slate-900 text-white ring-2 ring-slate-700 ring-offset-2' : 'bg-slate-100 text-slate-600'}`}>
              Ink (preto)
            </button>
          </div>
        </Field>

        <label className="flex items-center gap-2 cursor-pointer text-sm pt-2">
          <input type="checkbox" checked={promo.dismissible} onChange={e => setPromo({ ...promo, dismissible: e.target.checked })} className="w-4 h-4 accent-amber-600" />
          <span className="text-slate-700">Visitante pode fechar (X no canto)</span>
        </label>
      </div>

      <style>{`
        .admin-input {
          width: 100%;
          background: white;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          transition: all 0.15s;
        }
        .admin-input:focus {
          outline: none;
          border-color: rgb(217 119 6);
          box-shadow: 0 0 0 3px rgb(217 119 6 / 0.1);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
