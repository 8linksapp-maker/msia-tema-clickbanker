import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2, ArrowLeft, Image as ImageIcon, Eye, Edit3, ShoppingBag, X, Plus, ExternalLink } from 'lucide-react';
import { marked } from 'marked';
import { triggerToast } from './CmsToaster';
import { githubApi } from '../../lib/adminApi';
import { yamlEscape } from '../../lib/yamlEscape';
import { renderShortcodes } from '../../lib/shortcodes';
import SEOScoreWidget from '../../plugins/seo/SEOScoreWidget';

interface PostEditorProps {
    filePath: string | null; // null = novo post
}

export default function PostEditor({ filePath }: PostEditorProps) {
    const isEditing = !!filePath;
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [authors, setAuthors] = useState<any[]>([]);
    const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [fileSha, setFileSha] = useState('');
    const [isPreview, setIsPreview] = useState(false);
    const [pendingUploads, setPendingUploads] = useState<Record<string, File>>({});
    const [QuillEditor, setQuillEditor] = useState<any>(null);
    const quillRef = React.useRef<any>(null);

    const insertImageInEditor = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const editor = quillRef.current?.getEditor?.();
            if (!editor) return;
            const range = editor.getSelection(true);
            editor.insertEmbed(range?.index ?? editor.getLength(), 'image', dataUrl, 'user');
            editor.setSelection((range?.index ?? 0) + 1, 0);
        };
        reader.readAsDataURL(file);
    };

    const handleImageButton = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            const f = input.files?.[0];
            if (f) insertImageInEditor(f);
        };
        input.click();
    };

    // ===== Inserção de shortcodes no editor =====
    const [showInsertModal, setShowInsertModal] = useState(false);
    const [insertMode, setInsertMode] = useState<'produto' | 'comparativo'>('produto');
    const [compareSelection, setCompareSelection] = useState<string[]>([]);

    const insertTextInEditor = (text: string) => {
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        const range = editor.getSelection(true);
        const idx = range?.index ?? editor.getLength();
        // Insere em parágrafo próprio pra ficar isolado
        editor.insertText(idx, `\n${text}\n`, 'user');
        editor.setSelection(idx + text.length + 2, 0);
    };

    const insertProductShortcode = (slug: string) => {
        insertTextInEditor(`[[produto:${slug}]]`);
        setShowInsertModal(false);
    };

    const insertComparatorShortcode = () => {
        if (compareSelection.length < 2) {
            alert('Selecione pelo menos 2 produtos pra comparação.');
            return;
        }
        insertTextInEditor(`[[comparador:${compareSelection.join(',')}]]`);
        setCompareSelection([]);
        setShowInsertModal(false);
    };

    const openInsertModal = () => {
        setInsertMode('produto');
        setCompareSelection([]);
        setShowInsertModal(true);
    };
    const closeInsertModal = () => {
        setShowInsertModal(false);
        setCompareSelection([]);
    };


    const quillModules = React.useMemo(() => ({
        toolbar: {
            container: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                [{ align: [] }],
                ['clean'],
            ],
            handlers: {
                image: handleImageButton,
            },
        },
        clipboard: { matchVisual: false },
    }), []);

    const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'blockquote', 'code-block', 'link', 'image', 'align'];

    const formatDateForInput = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
            return d.toISOString().split('T')[0];
        } catch { return new Date().toISOString().split('T')[0]; }
    };

    // Guardamos o ISO completo original para preservar horario quando aluno edita post sem mudar a data
    const [originalPubDateISO, setOriginalPubDateISO] = useState<string>('');

    const [post, setPost] = useState({
        title: '', slug: '', description: '', pubDate: new Date().toISOString().split('T')[0],
        updatedDate: '', heroImage: '', category: '', author: '', draft: false, content: '',
        // ===== Afiliado fields =====
        productSlug: '',
        comparedProductSlugs: [] as string[],
        featuredProductSlugs: [] as string[],
        affiliate: true,
    });

    // Load Quill dynamically
    useEffect(() => {
        import('react-quill-new').then(mod => setQuillEditor(() => mod.default));
        import('react-quill-new/dist/quill.snow.css' as any);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [authRes, catRes, prodRes] = await Promise.allSettled([
                    githubApi('read', 'src/data/authors.json'),
                    githubApi('read', 'src/data/categories.json'),
                    githubApi('read', 'src/data/products.json'),
                ]);
                if (authRes.status === 'fulfilled') { const p = JSON.parse(authRes.value?.content || "{}"); if (Array.isArray(p)) setAuthors(p); }
                if (catRes.status === 'fulfilled') { const p = JSON.parse(catRes.value?.content || "{}"); if (Array.isArray(p)) setDynamicCategories(p); }
                if (prodRes.status === 'fulfilled') { const p = JSON.parse(prodRes.value?.content || "[]"); if (Array.isArray(p)) setAllProducts(p.filter((x: any) => x.active !== false)); }

                if (isEditing && filePath) {
                    const fileData = await githubApi('read', filePath);
                    setFileSha(fileData.sha);
                    const text = fileData.content;
                    const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
                    if (match) {
                        const fm = match[1];
                        const body = match[2].trim();
                        const extract = (key: string) => { const m = fm.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.*))$`, 'm')); return m ? (m[1] || m[2] || m[3] || '').trim() : ''; };
                        // Extrai listas YAML estilo "- item\n  - item"
                        const extractList = (key: string): string[] => {
                            const re = new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.*\\n?)+)`, 'm');
                            const m = fm.match(re);
                            if (!m) {
                                // tenta formato inline "[a, b, c]"
                                const inline = fm.match(new RegExp(`^${key}:\\s*\\[([^\\]]+)\\]`, 'm'));
                                if (inline) return inline[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                                return [];
                            }
                            return m[1].split('\n')
                                .map(line => line.trim())
                                .filter(line => line.startsWith('-'))
                                .map(line => line.replace(/^-\s*/, '').replace(/^["']|["']$/g, '').trim())
                                .filter(Boolean);
                        };
                        const parsedHtml = await marked.parse(body);
                        const rawPubDate = extract('pubDate');
                        if (rawPubDate) setOriginalPubDateISO(rawPubDate);
                        const rawUpdated = extract('updatedDate');
                        const rawAffiliate = extract('affiliate');
                        setPost({
                            title: extract('title'),
                            slug: filePath.split('/').pop()?.replace('.md', '') || '',
                            description: extract('description'),
                            pubDate: rawPubDate ? formatDateForInput(rawPubDate) : new Date().toISOString().split('T')[0],
                            updatedDate: rawUpdated ? formatDateForInput(rawUpdated) : '',
                            heroImage: extract('heroImage'),
                            category: extract('category') || 'Geral',
                            author: extract('author'),
                            draft: extract('draft') === 'true',
                            content: parsedHtml,
                            productSlug: extract('productSlug'),
                            comparedProductSlugs: extractList('comparedProductSlugs'),
                            featuredProductSlugs: extractList('featuredProductSlugs'),
                            affiliate: rawAffiliate === '' ? true : (rawAffiliate !== 'false'),
                        });
                    } else {
                        setPost(p => ({ ...p, content: String(marked.parse(text)), slug: filePath.split('/').pop()?.replace('.md', '') || '' }));
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [filePath, isEditing]);

    const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const handleTitleChange = (val: string) => {
        setPost(p => ({ ...p, title: val, slug: isEditing ? p.slug : slugify(val) }));
    };

    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, uiKey: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingUploads(prev => ({ ...prev, [uiKey]: file }));
        if (uiKey === 'heroImage') setPost(p => ({ ...p, heroImage: URL.createObjectURL(file) }));
        e.target.value = '';
    };

    const extractAndUploadInlineImages = async (html: string) => {
        const imgRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
        let modifiedHtml = html;
        const matches = [...html.matchAll(imgRegex)];
        for (const m of matches) {
            const ext = m[1]; const base64Content = m[2];
            const ghPath = `public/uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            await githubApi('write', ghPath, { content: base64Content, isBase64: true, message: `Upload imagem inline ${ghPath}` });
            modifiedHtml = modifiedHtml.replace(`data:image/${ext};base64,${base64Content}`, ghPath.replace('public', ''));
        }
        return modifiedHtml;
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!post.title || !post.slug) { setError('Título e Slug (URL) são obrigatórios.'); return; }
        setSaving(true); setError('');
        triggerToast('Processando e salvando artigo...', 'progress', 20);
        try {
            let finalHeroImage = post.heroImage;
            if (pendingUploads['heroImage']) {
                const fileObj = pendingUploads['heroImage'];
                const base64Content = await fileToBase64(fileObj);
                const fileExt = fileObj.name.split('.').pop() || 'jpg';
                const ghPath = `public/uploads/${Date.now()}-blog-cover.${fileExt}`;
                await githubApi('write', ghPath, { content: base64Content, isBase64: true, message: `Upload capa blog ${ghPath}` });
                finalHeroImage = ghPath.replace('public', '');
            }
            const cleanedContent = post.content.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
            const finalHtmlContent = await extractAndUploadInlineImages(cleanedContent);
            // Preserva ISO original se aluno nao mudou a data; caso contrario usa data + horario atual (garante ordenacao por minuto)
            let finalPubDate = post.pubDate;
            if (originalPubDateISO && originalPubDateISO.split('T')[0] === post.pubDate) {
                finalPubDate = originalPubDateISO;
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(post.pubDate)) {
                finalPubDate = `${post.pubDate}T${new Date().toISOString().slice(11, 19)}.000Z`;
            }
            // Constrói frontmatter dinâmico — só inclui campos preenchidos pra manter posts limpos
            const fmLines: string[] = [
                `title: "${yamlEscape(post.title)}"`,
                `description: "${yamlEscape(post.description)}"`,
                `pubDate: "${finalPubDate}"`,
            ];
            if (post.updatedDate) fmLines.push(`updatedDate: "${post.updatedDate}"`);
            fmLines.push(`heroImage: "${yamlEscape(finalHeroImage)}"`);
            fmLines.push(`category: "${yamlEscape(post.category)}"`);
            fmLines.push(`author: "${yamlEscape(post.author)}"`);
            fmLines.push(`draft: ${post.draft}`);

            // Afiliado fields
            if (post.productSlug) fmLines.push(`productSlug: "${post.productSlug}"`);
            if (post.comparedProductSlugs.length > 0) {
                fmLines.push('comparedProductSlugs:');
                post.comparedProductSlugs.forEach(s => fmLines.push(`  - ${s}`));
            }
            if (post.featuredProductSlugs.length > 0) {
                fmLines.push('featuredProductSlugs:');
                post.featuredProductSlugs.forEach(s => fmLines.push(`  - ${s}`));
            }
            // Sempre escreve affiliate (default true; usuário pode desligar)
            fmLines.push(`affiliate: ${post.affiliate}`);

            const markdown = `---\n${fmLines.join('\n')}\n---\n${finalHtmlContent}`;
            const targetPath = `src/content/blog/${post.slug}.md`;
            const res = await githubApi('write', targetPath, { content: markdown, sha: fileSha || undefined, message: `CMS: ${isEditing ? 'Edição' : 'Criação'} do artigo ${post.slug}` });
            if (res.sha) setFileSha(res.sha);
            setPendingUploads({});
            triggerToast('Artigo salvo com sucesso!', 'success', 100);
            if (!isEditing) setTimeout(() => { window.location.href = '/admin/posts'; }, 1500);
        } catch (err: any) {
            setError(err.message); triggerToast(`Erro: ${err.message}`, 'error');
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-500" />
            <p className="font-medium animate-pulse">Carregando editor...</p>
        </div>
    );

    const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm";
    const labelClass = "block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1";

    return (
        <div className="max-w-[1400px] pb-32">
            {/* Fixed header bar */}
            <div className="flex items-center justify-between bg-white p-4 px-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                <div className="flex items-center gap-3">
                    <a href="/admin/posts" className="text-slate-400 hover:text-violet-600 transition-colors p-1.5 rounded-lg hover:bg-violet-50"><ArrowLeft className="w-5 h-5" /></a>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{isEditing ? 'Editar Artigo' : 'Novo Artigo'}</h2>
                        {post.slug && <p className="text-xs font-mono text-slate-400">/blog/{post.slug}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isEditing && post.slug && !post.draft && (
                        <a
                            href={`/${post.slug}`}
                            target="_blank"
                            rel="noopener"
                            title="Ver post no site"
                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Ver no site
                        </a>
                    )}
                    <button type="button" onClick={() => setIsPreview(!isPreview)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        {isPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {isPreview ? 'Editor' : 'Preview'}
                    </button>
                    <button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm shadow-violet-600/20">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? 'Salvando...' : <><Save className="w-4 h-4" /> {isEditing ? 'Salvar' : 'Publicar'}</>}
                    </button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 border-l-4 border-red-500 text-sm font-medium mb-6 rounded-r-xl flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

            <div className="flex gap-6 items-start">
                {/* Main Editor Area */}
                <div className="flex-1 min-w-0 max-w-full space-y-6">
                    {/* Title */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <label className={labelClass}>Título do Artigo *</label>
                        <input type="text" value={post.title} onChange={e => handleTitleChange(e.target.value)} className={inputClass} placeholder="Título do artigo..." />
                        <div className="mt-3">
                            <label className={labelClass}>Slug (URL) *</label>
                            <input type="text" value={post.slug} onChange={e => setPost(p => ({ ...p, slug: slugify(e.target.value) }))} className={`${inputClass} font-mono text-xs`} placeholder="url-do-artigo" />
                        </div>
                        <div className="mt-3">
                            <label className={labelClass}>Descrição / Meta Description</label>
                            <textarea rows={2} value={post.description} onChange={e => setPost(p => ({ ...p, description: e.target.value }))} className={`${inputClass} resize-none`} placeholder="Breve descrição do artigo..." />
                        </div>
                    </div>

                    {/* Content Editor — editor + FAB sticky lateral */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <label className={labelClass}>Conteúdo do Artigo</label>

                        <div className="flex gap-3 items-start">
                            {/* Editor / Preview */}
                            <div className="flex-1 min-w-0">
                                {isPreview ? (
                                    <div
                                        className="admin-preview prose prose-slate max-w-none border border-slate-200 rounded-xl p-6 min-h-[400px] overflow-x-auto"
                                        dangerouslySetInnerHTML={{ __html: renderShortcodes(post.content, allProducts) }}
                                    />
                                ) : QuillEditor ? (
                                    <div className="rounded-lg">
                                        <QuillEditor
                                            ref={quillRef}
                                            theme="snow"
                                            value={post.content}
                                            onChange={(val: string) => setPost(p => ({ ...p, content: val }))}
                                            modules={quillModules}
                                            formats={quillFormats}
                                            style={{ minHeight: '400px' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center p-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" />Carregando editor...</div>
                                )}
                            </div>

                            {/* FAB sticky único — só no modo edição */}
                            {!isPreview && allProducts.length > 0 && (
                                <div className="shrink-0 sticky top-4 self-start z-20">
                                    <button
                                        type="button"
                                        onClick={openInsertModal}
                                        title="Inserir produto ou tabela comparativa"
                                        className="group relative w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="absolute right-full mr-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                            inserir
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Hint sobre shortcodes */}
                        {!isPreview && allProducts.length > 0 && (
                            <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                                💡 Use o botão flutuante <span className="inline-flex items-center justify-center w-4 h-4 bg-amber-600 text-white rounded-full mx-0.5"><Plus className="w-2.5 h-2.5" /></span> ao lado pra inserir produto ou tabela comparativa.
                            </p>
                        )}
                    </div>

                    {/* ===== Modal único: Inserir com toggle produto/comparativa ===== */}
                    {showInsertModal && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                            onClick={closeInsertModal}
                        >
                            <div
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header com toggle */}
                                <header className="border-b border-slate-100">
                                    <div className="flex items-center justify-between p-4 px-5">
                                        <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                            Inserir no artigo
                                        </span>
                                        <button type="button" onClick={closeInsertModal} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {/* Toggle */}
                                    <div className="px-5 pb-4">
                                        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => { setInsertMode('produto'); setCompareSelection([]); }}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${insertMode === 'produto' ? 'bg-white text-amber-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <ShoppingBag className="w-3.5 h-3.5" />
                                                Produto
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setInsertMode('comparativo')}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${insertMode === 'comparativo' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Comparativa {compareSelection.length > 0 && `(${compareSelection.length})`}
                                            </button>
                                        </div>
                                    </div>
                                </header>

                                {/* Body — lista filtra por modo */}
                                {insertMode === 'produto' ? (
                                    <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
                                        {allProducts.map((p: any) => (
                                            <li key={p.slug}>
                                                <button
                                                    type="button"
                                                    onClick={() => insertProductShortcode(p.slug)}
                                                    className="w-full text-left px-5 py-3 hover:bg-amber-50 transition-colors"
                                                >
                                                    <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.slug} · {p.category}</p>
                                                    {p.blurb && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{p.blurb}</p>}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <>
                                        <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
                                            Marque <strong>2 ou mais</strong> produtos pra incluir na tabela
                                        </div>
                                        <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
                                            {allProducts.map((p: any) => (
                                                <li key={p.slug}>
                                                    <label className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={compareSelection.includes(p.slug)}
                                                            onChange={e => {
                                                                if (e.target.checked) setCompareSelection([...compareSelection, p.slug]);
                                                                else setCompareSelection(compareSelection.filter(s => s !== p.slug));
                                                            }}
                                                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 shrink-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-800">{p.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.slug} · {p.category}</p>
                                                        </div>
                                                    </label>
                                                </li>
                                            ))}
                                        </ul>
                                        <footer className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                                            <button type="button" onClick={closeInsertModal} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={insertComparatorShortcode}
                                                disabled={compareSelection.length < 2}
                                                className="px-4 py-1.5 text-xs font-bold bg-slate-800 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg"
                                            >
                                                Inserir tabela
                                            </button>
                                        </footer>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-72 shrink-0 space-y-4 sticky top-4 self-start">
                    {/* Publish Settings */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-3 mb-4">Publicação</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Status</label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-violet-50 transition-colors">
                                    <input type="checkbox" checked={post.draft} onChange={e => setPost(p => ({ ...p, draft: e.target.checked }))} className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                                    <span className="text-sm font-medium text-slate-700">Salvar como rascunho</span>
                                </label>
                            </div>
                            <div>
                                <label className={labelClass}>Data de Publicação</label>
                                <input type="date" value={post.pubDate} onChange={e => setPost(p => ({ ...p, pubDate: e.target.value }))} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* Category & Author */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-3 mb-4">Metadados</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Categoria</label>
                                {dynamicCategories.length > 0 ? (
                                    <select value={post.category} onChange={e => setPost(p => ({ ...p, category: e.target.value }))} className={inputClass}>
                                        <option value="">Selecionar categoria...</option>
                                        {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" value={post.category} onChange={e => setPost(p => ({ ...p, category: e.target.value }))} className={inputClass} placeholder="Ex: Tecnologia" />
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Autor</label>
                                {authors.length > 0 ? (
                                    <select value={post.author} onChange={e => setPost(p => ({ ...p, author: e.target.value }))} className={inputClass}>
                                        <option value="">Selecionar autor...</option>
                                        {authors.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" value={post.author} onChange={e => setPost(p => ({ ...p, author: e.target.value }))} className={inputClass} placeholder="Nome do autor" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Hero Image */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-3 mb-4">Imagem de Capa</h3>
                        <label className="group relative border-2 border-dashed border-slate-200 hover:border-violet-400 bg-slate-50 hover:bg-violet-50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all text-center overflow-hidden" style={{ minHeight: '120px' }}>
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'heroImage')} />
                            {post.heroImage ? (
                                <>
                                    <img src={post.heroImage} alt="Capa" className="absolute inset-0 w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/20">
                                        <ImageIcon className="w-8 h-8 text-slate-800" />
                                        <span className="text-xs font-bold text-slate-900 mt-1">Trocar imagem</span>
                                    </div>
                                </>
                            ) : (
                                <div className="py-6 flex flex-col items-center text-slate-400 group-hover:text-violet-500 transition-colors">
                                    <ImageIcon className="w-8 h-8 mb-2" />
                                    <span className="text-xs font-bold">Enviar imagem de capa</span>
                                </div>
                            )}
                        </label>
                        {pendingUploads['heroImage'] && <span className="text-[10px] text-amber-600 font-bold block mt-2">Upload pendente — será enviado ao salvar</span>}
                    </div>

                    {/* Afiliado — Produtos */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-amber-600" />
                            Afiliado
                        </h3>

                        <div className="space-y-5">
                            {/* Produto principal (review hero) */}
                            <div>
                                <label className={labelClass}>Produto principal</label>
                                <select
                                    value={post.productSlug}
                                    onChange={e => setPost(p => ({ ...p, productSlug: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="">— sem produto principal —</option>
                                    {allProducts.map((p: any) => (
                                        <option key={p.slug} value={p.slug}>{p.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                                    Gera card hero no topo + schema.org Review (★ no Google).
                                </p>
                            </div>

                            {/* Recomendados (fim do post) */}
                            <div>
                                <label className={labelClass}>Recomendados no fim</label>
                                <ProductMultiSelect
                                    products={allProducts}
                                    selected={post.featuredProductSlugs}
                                    onChange={(slugs) => setPost(p => ({ ...p, featuredProductSlugs: slugs }))}
                                    placeholder="+ adicionar recomendação"
                                />
                                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                                    Cards inline dos produtos abaixo da tabela comparativa.
                                </p>
                            </div>

                            {/* Disclaimer toggle */}
                            <div>
                                <label className={labelClass}>Disclaimer afiliado</label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl hover:bg-amber-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={post.affiliate}
                                        onChange={e => setPost(p => ({ ...p, affiliate: e.target.checked }))}
                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Mostrar aviso de afiliado neste post</span>
                                </label>
                            </div>

                            {/* Updated date */}
                            <div>
                                <label className={labelClass}>Atualizado em</label>
                                <input
                                    type="date"
                                    value={post.updatedDate}
                                    onChange={e => setPost(p => ({ ...p, updatedDate: e.target.value }))}
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                                    Mostra "atualizado em XX" no hero. Sinal positivo pra SEO.
                                </p>
                            </div>
                        </div>

                        {allProducts.length === 0 && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                <strong>Sem produtos cadastrados.</strong> <a href="/admin/products" className="underline">Cadastrar produtos</a>
                            </div>
                        )}
                    </div>

                    {/* SEO Score Widget */}
                    <SEOScoreWidget
                        title={post.title}
                        description={post.description}
                        heroImage={post.heroImage}
                        content={post.content}
                    />
                </div>
            </div>
        </div>
    );
}

// ===== Multi-select de produtos com chips =====
function ProductMultiSelect({
    products,
    selected,
    onChange,
    placeholder,
}: {
    products: any[];
    selected: string[];
    onChange: (slugs: string[]) => void;
    placeholder?: string;
}) {
    const [showAdd, setShowAdd] = React.useState(false);
    const available = products.filter(p => !selected.includes(p.slug));

    function add(slug: string) {
        onChange([...selected, slug]);
        setShowAdd(false);
    }
    function remove(slug: string) {
        onChange(selected.filter(s => s !== slug));
    }
    function move(slug: string, dir: -1 | 1) {
        const idx = selected.indexOf(slug);
        if (idx < 0) return;
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= selected.length) return;
        const next = [...selected];
        [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
        onChange(next);
    }

    return (
        <div className="space-y-2">
            {selected.length > 0 && (
                <div className="space-y-1.5">
                    {selected.map((slug, idx) => {
                        const product = products.find(p => p.slug === slug);
                        return (
                            <div key={slug} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 px-3 group">
                                <div className="flex flex-col gap-0.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => move(slug, -1)}
                                        disabled={idx === 0}
                                        className="text-amber-700 hover:text-amber-900 disabled:opacity-20 leading-none text-[10px]"
                                        title="Mover pra cima"
                                    >▲</button>
                                    <button
                                        type="button"
                                        onClick={() => move(slug, 1)}
                                        disabled={idx === selected.length - 1}
                                        className="text-amber-700 hover:text-amber-900 disabled:opacity-20 leading-none text-[10px]"
                                        title="Mover pra baixo"
                                    >▼</button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-amber-900 truncate">{product?.name || slug}</p>
                                    <p className="text-[10px] text-amber-700 font-mono truncate">{slug}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => remove(slug)}
                                    className="text-amber-600 hover:text-red-600 opacity-50 group-hover:opacity-100 transition-opacity"
                                    title="Remover"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAdd ? (
                <div className="border border-amber-300 rounded-lg overflow-hidden bg-white">
                    {available.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                            Todos os produtos já estão na lista.
                        </div>
                    ) : (
                        <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {available.map((p: any) => (
                                <li key={p.slug}>
                                    <button
                                        type="button"
                                        onClick={() => add(p.slug)}
                                        className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors"
                                    >
                                        <p className="text-sm font-medium text-slate-800">{p.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">{p.slug}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="border-t border-slate-100 p-2 bg-slate-50">
                        <button
                            type="button"
                            onClick={() => setShowAdd(false)}
                            className="w-full text-xs text-slate-600 hover:text-slate-800 font-medium py-1"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    disabled={products.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg border border-dashed border-amber-300 hover:border-amber-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Plus className="w-3.5 h-3.5" />
                    {placeholder || 'Adicionar produto'}
                </button>
            )}
        </div>
    );
}
