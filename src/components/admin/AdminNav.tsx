import React from 'react';
import {
    LayoutDashboard, FileText, Tag, Users, Info, Phone,
    Shield, Settings, LogOut, ChevronRight, ExternalLink, Navigation,
    Sparkles, Package, ShoppingBag, Megaphone, Rocket, MousePointerClick, FileArchive,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    section: string;
}

const mainItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, section: 'dashboard' },
    { label: 'Artigos', href: '/admin/posts', icon: FileText, section: 'posts' },
    { label: 'Produtos', href: '/admin/products', icon: ShoppingBag, section: 'products' },
    { label: 'Categorias', href: '/admin/categories', icon: Tag, section: 'categories' },
    { label: 'Autores', href: '/admin/authors', icon: Users, section: 'authors' },
];

const afiliadoItems: NavItem[] = [
    { label: 'Landing Pages', href: '/admin/landing-pages', icon: Rocket, section: 'landing-pages' },
    { label: 'Promo Bar', href: '/admin/promo', icon: Megaphone, section: 'promo' },
];

const pageItems: NavItem[] = [
    { label: 'Menu', href: '/admin/menu', icon: Navigation, section: 'menu' },
    { label: 'Sobre', href: '/admin/sobre', icon: Info, section: 'sobre' },
    { label: 'Contato', href: '/admin/contato', icon: Phone, section: 'contato' },
    { label: 'Privacidade & Termos', href: '/admin/legal', icon: Shield, section: 'legal' },
];

const pluginItems: NavItem[] = [
    { label: 'Plugins', href: '/admin/plugins', icon: Sparkles, section: 'plugins' },
    { label: 'Google Tag', href: '/admin/google-tag', icon: Tag, section: 'google-tag' },
];

interface AdminNavProps {
    activeSection?: string;
    extraItems?: NavItem[];
}

export default function AdminNav({ activeSection = '', extraItems = [] }: AdminNavProps) {
    const allMainItems = [...mainItems, ...extraItems];

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 flex flex-col z-50 shadow-sm">
            {/* Logo */}
            <a href="/admin" className="h-16 flex items-center px-5 border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
                <div className="flex items-center gap-3 w-full">
                    <div className="relative w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #a3592d 0%, #c47238 100%)' }}>
                        <MousePointerClick className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="leading-none flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                            Click<span className="text-amber-700">Banker</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-1">afiliado clickbank</div>
                    </div>
                </div>
            </a>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                {/* Seção Principal */}
                <div className="mb-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Principal</p>
                    {allMainItems.map(item => (
                        <NavLink key={item.href} item={item} active={activeSection === item.section} />
                    ))}
                </div>

                {/* Páginas */}
                <div className="mb-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Páginas</p>
                    {pageItems.map(item => (
                        <NavLink key={item.href} item={item} active={activeSection === item.section} />
                    ))}
                </div>

                {/* Afiliado */}
                <div className="mb-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Afiliado</p>
                    {afiliadoItems.map(item => (
                        <NavLink key={item.href} item={item} active={activeSection === item.section} />
                    ))}
                </div>

                {/* Plugins */}
                <div className="mb-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Plugins</p>
                    {pluginItems.map(item => (
                        <NavLink key={item.href} item={item} active={activeSection === item.section} />
                    ))}
                </div>

                {/* Configurações */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Sistema</p>
                    <NavLink item={{ label: 'Configurações', href: '/admin/config', icon: Settings, section: 'config' }} active={activeSection === 'config'} />
                    <NavLink item={{ label: 'Backup', href: '/admin/backup', icon: FileArchive, section: 'backup' }} active={activeSection === 'backup'} />
                </div>
            </nav>

            {/* Ver site + Logout */}
            <div className="p-3 border-t border-slate-100 space-y-1">
                <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-all group"
                >
                    <ExternalLink className="w-4 h-4 shrink-0 group-hover:text-amber-600" />
                    <span className="text-sm font-medium">Ver site</span>
                </a>
                <a
                    href="/api/admin/logout"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all group"
                >
                    <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-500" />
                    <span className="text-sm font-medium">Sair</span>
                </a>
            </div>
        </aside>
    );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return (
        <a
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all group ${
                active
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span className={`text-sm font-medium flex-1 ${active ? 'font-semibold' : ''}`}>{item.label}</span>
            {active && <ChevronRight className="w-3 h-3 text-amber-400" />}
        </a>
    );
}
