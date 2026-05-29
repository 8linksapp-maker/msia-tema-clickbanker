import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

interface DialogState extends ConfirmOptions {
    resolve: (ok: boolean) => void;
}

/**
 * Diálogo de confirmação padrão do design system.
 * Substitui o `confirm()` nativo — API promise-based pra migração mínima:
 *   if (!(await confirmDialog({ title: 'Excluir?', danger: true }))) return;
 */
export const confirmDialog = (opts: ConfirmOptions): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
        window.dispatchEvent(new CustomEvent('cms-dialog', { detail: { ...opts, resolve } }));
    });

export default function CmsDialog() {
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const lastFocused = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const handle = (e: any) => {
            lastFocused.current = document.activeElement as HTMLElement;
            setDialog(e.detail as DialogState);
        };
        window.addEventListener('cms-dialog', handle);
        return () => window.removeEventListener('cms-dialog', handle);
    }, []);

    // Foco inicial no botão de confirmar + Esc pra cancelar
    useEffect(() => {
        if (!dialog) return;
        const t = setTimeout(() => confirmRef.current?.focus(), 50);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); close(false); }
        };
        document.addEventListener('keydown', onKey);
        return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialog]);

    const close = (ok: boolean) => {
        if (!dialog) return;
        dialog.resolve(ok);
        setDialog(null);
        // devolve o foco pra quem abriu
        setTimeout(() => lastFocused.current?.focus?.(), 0);
    };

    if (!dialog) return null;

    const danger = !!dialog.danger;
    const Icon = danger ? AlertTriangle : HelpCircle;

    return (
        <div
            className="fixed inset-0 z-[9990] flex items-center justify-center p-4 cms-dialog-overlay"
            style={{ background: 'rgba(20,20,24,0.45)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="cms-dialog-title"
                aria-describedby={dialog.message ? 'cms-dialog-desc' : undefined}
                className="bg-surface border border-border rounded-lg w-full max-w-md overflow-hidden cms-dialog-panel"
                style={{ boxShadow: '0 24px 64px rgba(80,40,20,0.28)' }}
            >
                <div className="p-6 flex gap-4">
                    <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-50' : 'bg-primary-soft'}`}
                        aria-hidden="true"
                    >
                        <Icon className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h2 id="cms-dialog-title" className="text-base font-semibold text-ink leading-snug">
                            {dialog.title}
                        </h2>
                        {dialog.message && (
                            <p id="cms-dialog-desc" className="text-sm text-ink-muted mt-1.5 leading-relaxed">
                                {dialog.message}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2.5 px-6 py-4 bg-elev border-t border-border">
                    <button
                        onClick={() => close(false)}
                        className="px-4 py-2 min-h-[40px] rounded text-sm font-semibold text-ink-muted bg-surface border border-border hover:bg-elev hover:text-ink transition-colors"
                    >
                        {dialog.cancelLabel || 'Cancelar'}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={() => close(true)}
                        className={`px-4 py-2 min-h-[40px] rounded text-sm font-semibold text-surface transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface ${
                            danger
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                : 'bg-primary hover:brightness-90 focus:ring-primary'
                        }`}
                    >
                        {dialog.confirmLabel || 'Confirmar'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes cms-dialog-fade { from { opacity: 0 } to { opacity: 1 } }
                @keyframes cms-dialog-pop { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: none } }
                .cms-dialog-overlay { animation: cms-dialog-fade 0.15s ease-out }
                .cms-dialog-panel { animation: cms-dialog-pop 0.18s cubic-bezier(0.16,1,0.3,1) }
                @media (prefers-reduced-motion: reduce) {
                    .cms-dialog-overlay, .cms-dialog-panel { animation: none }
                }
            `}</style>
        </div>
    );
}
