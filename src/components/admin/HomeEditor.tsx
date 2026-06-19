/**
 * HomeEditor (ClickBanker) — admin pra editar TODAS as strings visíveis da home,
 * com defaults em inglês (template é p/ mercado ClickBank gringo) e labels do
 * admin em PT-BR (aluno brasileiro). Faz MERGE com home.json existente — preserva
 * tudo que o aluno já editou.
 */
import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { triggerToast } from './CmsToaster';
import { githubApi } from '../../lib/adminApi';

type HomeConfig = {
    hero?: { eyebrow?: string; title?: string; lead?: string };
    sections?: {
        editorsChoice?: { heading?: string; ctaLabel?: string; ctaLink?: string; readMoreLabel?: string };
        trending?: { heading?: string };
        categories?: { heading?: string };
        about?: { label?: string; heading?: string; ctaLabel?: string; ctaLink?: string };
        latestPosts?: { heading?: string; ctaLabel?: string; ctaLink?: string; empty?: string; moreEyebrow?: string };
    };
    tabs?: { popular?: string; recent?: string; empty?: string; readArticle?: string };
    header?: { blogLinkLabel?: string; searchHint?: string };
    footer?: { navLabel?: string; topicsLabel?: string; socialLabel?: string; privacyLabel?: string; termsLabel?: string };
    sidebar?: { recentLabel?: string; topicsLabel?: string };
    newsletter?: { title?: string; description?: string; placeholder?: string; submitLabel?: string; sendingLabel?: string; successLabel?: string; retryLabel?: string; networkError?: string };
    empty?: { title?: string; message?: string; instruction?: string };
};

const DEFAULTS: HomeConfig = {
    hero: {
        eyebrow: 'honest reviews · clickbank',
        title: 'Honest reviews. Products that deliver.',
        lead: 'Practical reviews of the best ClickBank digital products — so you choose with confidence, no rush.',
    },
    sections: {
        editorsChoice: { heading: "Editor's Picks", ctaLabel: 'More Articles', ctaLink: '/blog', readMoreLabel: 'Read more' },
        trending: { heading: 'Trending This Week' },
        categories: { heading: 'Browse by Category' },
        about: { label: 'About Us', heading: 'About Us', ctaLabel: 'Learn More', ctaLink: '/sobre' },
        latestPosts: { heading: 'Latest Posts', ctaLabel: 'View All Articles', ctaLink: '/blog', empty: 'No posts yet.', moreEyebrow: 'more' },
    },
    tabs: { popular: 'popular', recent: 'recent', empty: 'No posts available.', readArticle: 'Read article' },
    header: { blogLinkLabel: 'All articles', searchHint: 'esc to close' },
    footer: { navLabel: 'navigation', topicsLabel: 'topics', socialLabel: 'social', privacyLabel: 'privacy', termsLabel: 'terms' },
    sidebar: { recentLabel: 'recent', topicsLabel: 'topics' },
    newsletter: {
        title: 'Newsletter',
        description: 'Get the best articles straight to your inbox.',
        placeholder: 'Your email',
        submitLabel: 'Subscribe',
        sendingLabel: 'Sending…',
        successLabel: 'Subscribed!',
        retryLabel: 'Subscribe',
        networkError: 'Network error. Try again.',
    },
    empty: { title: 'empty', message: 'No posts published.', instruction: 'Create the first one at' },
};

// Merge profundo: home.json existente do aluno tem prioridade, defaults preenchem buracos
function mergeDeep(base: any, over: any): any {
    if (over === null || over === undefined) return base;
    if (typeof base !== 'object' || typeof over !== 'object' || Array.isArray(base) || Array.isArray(over)) return over;
    const out: any = { ...base };
    for (const k of Object.keys(over)) out[k] = mergeDeep(base[k], over[k]);
    return out;
}

const INPUT = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500';
const LABEL = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1';
const HINT = 'text-[11px] text-slate-400 mt-1';
const SECTION = 'bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4';
const SECTION_TITLE = 'font-bold text-slate-700 text-sm border-b border-slate-100 pb-3 mb-1';

export default function HomeEditor() {
    const [config, setConfig] = useState<HomeConfig>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        githubApi('read', 'src/data/home.json')
            .then((res: any) => {
                try {
                    const existing = JSON.parse(res?.content || '{}');
                    setConfig(mergeDeep(DEFAULTS, existing));
                } catch {
                    setConfig(DEFAULTS);
                }
            })
            .catch(() => setConfig(DEFAULTS))
            .finally(() => setLoading(false));
    }, []);

    function patch<K extends keyof HomeConfig>(section: K, partial: any) {
        setConfig(prev => ({ ...prev, [section]: { ...(prev[section] as any), ...partial } }));
    }
    function patchSub(section: keyof HomeConfig, sub: string, partial: any) {
        setConfig(prev => {
            const cur = (prev[section] as any) || {};
            return { ...prev, [section]: { ...cur, [sub]: { ...(cur[sub] || {}), ...partial } } };
        });
    }

    const save = async () => {
        setSaving(true); setError('');
        triggerToast('Salvando textos da home...', 'progress', 30);
        try {
            await githubApi('write', 'src/data/home.json', {
                content: JSON.stringify(config, null, 2),
                message: 'CMS: textos da home',
            });
            triggerToast('Textos salvos!', 'success', 100);
        } catch (e: any) {
            setError(e.message);
            triggerToast('Erro ao salvar.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" />Carregando...</div>
    );

    return (
        <div className="max-w-3xl space-y-6 pb-16">
            <div className="flex items-center justify-between sticky top-0 bg-slate-50 py-3 z-10 -mx-4 px-4 border-b border-slate-200">
                <div>
                    <h1 className="font-bold text-slate-800">Textos da Página Inicial</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Todos os textos visíveis no seu site. Defaults em inglês (template ClickBank) — edite pra português se preferir.</p>
                </div>
                <button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                </button>
            </div>
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm"><AlertCircle className="w-4 h-4 inline mr-2 -mt-0.5" />{error}</div>}

            <section className={SECTION}>
                <h2 className={SECTION_TITLE}>Topo (Hero)</h2>
                <div><label className={LABEL}>Eyebrow (texto pequeno acima do título)</label><input type="text" className={INPUT} value={config.hero?.eyebrow || ''} onChange={e => patch('hero', { eyebrow: e.target.value })} /><p className={HINT}>Ex: "honest reviews · clickbank"</p></div>
                <div><label className={LABEL}>Título principal</label><input type="text" className={INPUT} value={config.hero?.title || ''} onChange={e => patch('hero', { title: e.target.value })} /></div>
                <div><label className={LABEL}>Subtítulo / lead</label><textarea rows={3} className={INPUT} value={config.hero?.lead || ''} onChange={e => patch('hero', { lead: e.target.value })} /></div>
            </section>

            <section className={SECTION}>
                <h2 className={SECTION_TITLE}>Seções da Home (títulos e botões)</h2>

                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <p className="text-xs font-bold text-slate-600">Escolha dos Editores (post em destaque)</p>
                    <div><label className={LABEL}>Título da seção</label><input type="text" className={INPUT} value={config.sections?.editorsChoice?.heading || ''} onChange={e => patchSub('sections', 'editorsChoice', { heading: e.target.value })} /></div>
                    <div><label className={LABEL}>Label da lista lateral ("Mais artigos")</label><input type="text" className={INPUT} value={config.sections?.editorsChoice?.ctaLabel || ''} onChange={e => patchSub('sections', 'editorsChoice', { ctaLabel: e.target.value })} /></div>
                    <div><label className={LABEL}>Link "Ler mais" do card</label><input type="text" className={INPUT} value={config.sections?.editorsChoice?.readMoreLabel || ''} onChange={e => patchSub('sections', 'editorsChoice', { readMoreLabel: e.target.value })} /></div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <p className="text-xs font-bold text-slate-600">Em alta esta semana</p>
                    <div><label className={LABEL}>Título da seção</label><input type="text" className={INPUT} value={config.sections?.trending?.heading || ''} onChange={e => patchSub('sections', 'trending', { heading: e.target.value })} /></div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <p className="text-xs font-bold text-slate-600">Categorias</p>
                    <div><label className={LABEL}>Título da seção</label><input type="text" className={INPUT} value={config.sections?.categories?.heading || ''} onChange={e => patchSub('sections', 'categories', { heading: e.target.value })} /></div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <p className="text-xs font-bold text-slate-600">Sobre nós</p>
                    <div><label className={LABEL}>Eyebrow (badge antes do título)</label><input type="text" className={INPUT} value={config.sections?.about?.label || ''} onChange={e => patchSub('sections', 'about', { label: e.target.value })} /></div>
                    <div><label className={LABEL}>Título principal</label><input type="text" className={INPUT} value={config.sections?.about?.heading || ''} onChange={e => patchSub('sections', 'about', { heading: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={LABEL}>Texto do botão</label><input type="text" className={INPUT} value={config.sections?.about?.ctaLabel || ''} onChange={e => patchSub('sections', 'about', { ctaLabel: e.target.value })} /></div>
                        <div><label className={LABEL}>Link do botão</label><input type="text" className={INPUT} value={config.sections?.about?.ctaLink || ''} onChange={e => patchSub('sections', 'about', { ctaLink: e.target.value })} /></div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                    <p className="text-xs font-bold text-slate-600">Publicações recentes</p>
                    <div><label className={LABEL}>Título da seção</label><input type="text" className={INPUT} value={config.sections?.latestPosts?.heading || ''} onChange={e => patchSub('sections', 'latestPosts', { heading: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={LABEL}>Texto do botão "ver todos"</label><input type="text" className={INPUT} value={config.sections?.latestPosts?.ctaLabel || ''} onChange={e => patchSub('sections', 'latestPosts', { ctaLabel: e.target.value })} /></div>
                        <div><label className={LABEL}>Link do botão</label><input type="text" className={INPUT} value={config.sections?.latestPosts?.ctaLink || ''} onChange={e => patchSub('sections', 'latestPosts', { ctaLink: e.target.value })} /></div>
                    </div>
                    <div><label className={LABEL}>Mensagem quando não há posts</label><input type="text" className={INPUT} value={config.sections?.latestPosts?.empty || ''} onChange={e => patchSub('sections', 'latestPosts', { empty: e.target.value })} /></div>
                </div>
            </section>

            <section className={SECTION}>
                <h2 className={SECTION_TITLE}>Abas do Hero (popular / recente)</h2>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL}>Aba "Popular"</label><input type="text" className={INPUT} value={config.tabs?.popular || ''} onChange={e => patch('tabs', { popular: e.target.value })} /></div>
                    <div><label className={LABEL}>Aba "Recente"</label><input type="text" className={INPUT} value={config.tabs?.recent || ''} onChange={e => patch('tabs', { recent: e.target.value })} /></div>
                </div>
                <div><label className={LABEL}>Texto do link "Ler artigo"</label><input type="text" className={INPUT} value={config.tabs?.readArticle || ''} onChange={e => patch('tabs', { readArticle: e.target.value })} /></div>
                <div><label className={LABEL}>Mensagem quando aba está vazia</label><input type="text" className={INPUT} value={config.tabs?.empty || ''} onChange={e => patch('tabs', { empty: e.target.value })} /></div>
            </section>

            <section className={SECTION}>
                <h2 className={SECTION_TITLE}>Topo da página (menu)</h2>
                <div><label className={LABEL}>Texto do link "Todos os artigos" no menu Blog</label><input type="text" className={INPUT} value={config.header?.blogLinkLabel || ''} onChange={e => patch('header', { blogLinkLabel: e.target.value })} /></div>
                <div><label className={LABEL}>Dica na busca ("esc fecha")</label><input type="text" className={INPUT} value={config.header?.searchHint || ''} onChange={e => patch('header', { searchHint: e.target.value })} /></div>
            </section>

            <section className={SECTION}>
                <h2 className={SECTION_TITLE}>Rodapé</h2>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL}>Label "navegação"</label><input type="text" className={INPUT} value={config.footer?.navLabel || ''} onChange={e => patch('footer', { navLabel: e.target.value })} /></div>
                    <div><label className={LABEL}>Label "tópicos"</label><input type="text" className={INPUT} value={config.footer?.topicsLabel || ''} onChange={e => patch('footer', { topicsLabel: e.target.value })} /></div>
                    <div><label className={LABEL}>Label "social"</label><input type="text" className={INPUT} value={config.footer?.socialLabel || ''} onChange={e => patch('footer', { socialLabel: e.target.value })} /></div>
                    <div><label className={LABEL}>Link "privacidade"</label><input type="text" className={INPUT} value={config.footer?.privacyLabel || ''} onChange={e => patch('footer', { privacyLabel: e.target.value })} /></div>
                    <div><label className={LABEL}>Link "termos"</label><input type="text" className={INPUT} value={config.footer?.termsLabel || ''} onChange={e => patch('footer', { termsLabel: e.target.value })} /></div>
                </div>
            </section>

            <section className={SECTION}>
                <h2 className={SECTION_TITLE}>Barra lateral do blog</h2>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL}>Label "recente"</label><input type="text" className={INPUT} value={config.sidebar?.recentLabel || ''} onChange={e => patch('sidebar', { recentLabel: e.target.value })} /></div>
                    <div><label className={LABEL}>Label "tópicos"</label><input type="text" className={INPUT} value={config.sidebar?.topicsLabel || ''} onChange={e => patch('sidebar', { topicsLabel: e.target.value })} /></div>
                </div>
            </section>

            <section className={SECTION}>
                <h2 className={SECTION_TITLE}>Widget de newsletter (sidebar)</h2>
                <div><label className={LABEL}>Título</label><input type="text" className={INPUT} value={config.newsletter?.title || ''} onChange={e => patch('newsletter', { title: e.target.value })} /></div>
                <div><label className={LABEL}>Descrição</label><input type="text" className={INPUT} value={config.newsletter?.description || ''} onChange={e => patch('newsletter', { description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL}>Placeholder do campo email</label><input type="text" className={INPUT} value={config.newsletter?.placeholder || ''} onChange={e => patch('newsletter', { placeholder: e.target.value })} /></div>
                    <div><label className={LABEL}>Texto do botão</label><input type="text" className={INPUT} value={config.newsletter?.submitLabel || ''} onChange={e => patch('newsletter', { submitLabel: e.target.value })} /></div>
                    <div><label className={LABEL}>Texto "enviando..."</label><input type="text" className={INPUT} value={config.newsletter?.sendingLabel || ''} onChange={e => patch('newsletter', { sendingLabel: e.target.value })} /></div>
                    <div><label className={LABEL}>Texto "inscrito!"</label><input type="text" className={INPUT} value={config.newsletter?.successLabel || ''} onChange={e => patch('newsletter', { successLabel: e.target.value })} /></div>
                </div>
                <div><label className={LABEL}>Mensagem de erro de rede</label><input type="text" className={INPUT} value={config.newsletter?.networkError || ''} onChange={e => patch('newsletter', { networkError: e.target.value })} /></div>
            </section>

            <section className={SECTION}>
                <h2 className={SECTION_TITLE}>Quando ainda não há nenhum post</h2>
                <div><label className={LABEL}>Eyebrow (texto pequeno acima)</label><input type="text" className={INPUT} value={config.empty?.title || ''} onChange={e => patch('empty', { title: e.target.value })} /></div>
                <div><label className={LABEL}>Mensagem principal</label><input type="text" className={INPUT} value={config.empty?.message || ''} onChange={e => patch('empty', { message: e.target.value })} /></div>
                <div><label className={LABEL}>Instrução (antes do link /admin)</label><input type="text" className={INPUT} value={config.empty?.instruction || ''} onChange={e => patch('empty', { instruction: e.target.value })} /></div>
            </section>
        </div>
    );
}
