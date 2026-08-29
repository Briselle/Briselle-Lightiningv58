import React, { useState, useEffect, useRef } from 'react';
import { Share2, Link2, Lock, RefreshCw, Code, Copy, X, Trash2 } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

export type ShareOption = 'create-link' | 'private-link' | 'sync' | 'embed';

interface Action_ShareProps {
    enableShare: boolean;
    shareButtonType: 'icon' | 'button';
    shareButtonAlign: 'left' | 'right';
    onShareClick?: () => void;
    shareLinkActive?: boolean;
    shareLinkUrl?: string;
    shareActionPanelViewAllowed?: boolean;
    shareRestrictCopy?: boolean;
    shareShowAllFieldsExpanded?: boolean;
    shareRestrictByPasswordOrDomain?: boolean;
    shareRestrictEmail?: string;
    config?: Record<string, unknown>;
    onConfigChange?: (partial: Record<string, unknown>) => void;
    onCreateShareTokenSettings?: (token: string, settings: {
        restrictCopy: boolean;
        panelAllowed: boolean;
        scope?: string;
        linkName?: string;
        presetId?: string;
        lockedPresetId?: string;
        lockedTabId?: string;
        requireCredentials?: boolean;
        allowedEmailOrDomain?: string;
    }) => Promise<boolean>;
    onDeleteShareToken?: (token: string) => Promise<boolean>;
    onDeleteAllShareTokens?: () => Promise<boolean>;
    shareGeneratedLinks?: Array<{ token: string; linkName: string; url: string; createdAt?: string }>;
    activePresetId?: string;
    activeTabIdForShare?: string;
}

const DISCLAIMER = 'Data shared via this link may move outside of the Briselle Platform. Ensure you have proper consent and governance.';

function Toggle({
    checked,
    onChange,
    disabled,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                checked ? 'bg-primary' : 'bg-gray-200',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            <span
                className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform mt-0.5',
                    checked ? 'translate-x-4' : 'translate-x-0.5'
                )}
            />
        </button>
    );
}

const Action_Share: React.FC<Action_ShareProps> = ({
    enableShare,
    shareButtonType,
    shareButtonAlign,
    onShareClick,
    shareLinkActive = false,
    shareLinkUrl = '',
    shareActionPanelViewAllowed = false,
    shareRestrictCopy = false,
    shareShowAllFieldsExpanded = false,
    shareRestrictByPasswordOrDomain = false,
    shareRestrictEmail = '',
    config,
    onConfigChange,
    onCreateShareTokenSettings,
    onDeleteShareToken,
    onDeleteAllShareTokens,
    shareGeneratedLinks = [],
    activePresetId = 'default',
    activeTabIdForShare,
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showShareLinkSettings, setShowShareLinkSettings] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [linkName, setLinkName] = useState('');
    const [linkNameError, setLinkNameError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuPanelRef = useRef<HTMLDivElement>(null);
    const settingsPanelRef = useRef<HTMLDivElement>(null);

    const emailRequired = shareRestrictByPasswordOrDomain;
    const canGenerate = !emailRequired || !!shareRestrictEmail?.trim();

    useEffect(() => {
        if (showShareLinkSettings) {
            const next = `Link ${Math.min(shareGeneratedLinks.length + 1, 5)}`;
            setLinkName((prev) => prev || next);
        }
    }, [showShareLinkSettings, shareGeneratedLinks.length]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
                setShowShareLinkSettings(false);
            }
        };
        if (showDropdown || showShareLinkSettings) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown, showShareLinkSettings]);

    useEffect(() => {
        const close = () => { setShowDropdown(false); setShowShareLinkSettings(false); };
        document.addEventListener('actionButtonClick', close);
        return () => document.removeEventListener('actionButtonClick', close);
    }, []);

    useEffect(() => {
        if (!showDropdown && !showShareLinkSettings) return;
        const panelEl = (showShareLinkSettings ? settingsPanelRef.current : menuPanelRef.current) as HTMLElement | null;
        const actionPanelEl = document.querySelector('.relative.z-\\[110\\].px-4.py-2.border-b.border-gray-200') as HTMLElement | null;
        const buttonEl = dropdownRef.current?.querySelector('button') as HTMLElement | null;
        const panelRect = panelEl?.getBoundingClientRect() ?? null;
        const buttonRect = buttonEl?.getBoundingClientRect() ?? null;
        const actionRect = actionPanelEl?.getBoundingClientRect() ?? null;
        const panelStyle = panelEl ? window.getComputedStyle(panelEl) : null;
        const actionStyle = actionPanelEl ? window.getComputedStyle(actionPanelEl) : null;
        const parentStyle = dropdownRef.current ? window.getComputedStyle(dropdownRef.current) : null;
    }, [showDropdown, showShareLinkSettings]);

    if (!enableShare) return null;

    const update = (updates: Record<string, unknown>) => {
        onConfigChange?.({ ...config, ...updates });
    };

    const generateLink = async () => {
        const trimmedName = linkName.trim();
        if (!trimmedName) {
            setLinkNameError('Please enter a short link name.');
            return;
        }
        if (shareGeneratedLinks.length >= 5) {
            alert('Only 5 links are allowed, please try after deleting the existing links.');
            return;
        }
        if (shareRestrictByPasswordOrDomain && !shareRestrictEmail?.trim()) {
            setEmailError('Email is required when restriction is enabled.');
            return;
        }
        setLinkNameError(null);
        setEmailError(null);
        const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
        const token =
            typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
                ? Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('')
                : `${Date.now()}`;
        const lockedPresetId = activePresetId;
        const lockedTabId = activeTabIdForShare;
        const persisted = await onCreateShareTokenSettings?.(token, {
            restrictCopy: shareRestrictCopy,
            panelAllowed: shareActionPanelViewAllowed,
            scope: 'title-to-footer',
            linkName: trimmedName,
            presetId: activePresetId,
            lockedPresetId,
            lockedTabId,
            requireCredentials: shareRestrictByPasswordOrDomain,
            allowedEmailOrDomain: shareRestrictByPasswordOrDomain ? (shareRestrictEmail?.trim() || undefined) : undefined,
        });
        if (persisted === false) {
            alert('Could not create secure share link right now. Please try again.');
            return;
        }
        const url = `${base}?share=${encodeURIComponent(token)}`;
        update({ shareLinkUrl: url, shareLinkActive: true });
        setLinkName(`Link ${Math.min(shareGeneratedLinks.length + 2, 5)}`);
        if (shareRestrictByPasswordOrDomain && shareRestrictEmail?.trim()) {
            alert(`Share invite sent to ${shareRestrictEmail.trim()} with one-time password.`);
        }
    };

    const handleDeleteAllLinks = async () => {
        if (shareGeneratedLinks.length === 0) return;
        const ok = await onDeleteAllShareTokens?.();
        if (ok === false) {
            alert('Could not delete links right now. Please try again.');
            return;
        }
        update({ shareLinkUrl: '', shareLinkActive: false });
    };

    const handleDeleteLink = async (token: string) => {
        const ok = await onDeleteShareToken?.(token);
        if (ok === false) {
            alert('Could not delete this link right now. Please try again.');
            return;
        }
        if (shareLinkUrl.includes(`share=${token}`)) {
            update({ shareLinkUrl: '', shareLinkActive: false });
        }
    };

    const copyLink = () => {
        if (!shareLinkUrl) return;
        void navigator.clipboard.writeText(shareLinkUrl);
    };

    const openShareLinkSettings = () => {
        setShowDropdown(false);
        setShowShareLinkSettings(true);
    };

    const closeShareLinkSettings = () => {
        setShowShareLinkSettings(false);
    };

    const getButtonContent = (icon: React.ReactNode, text: string, buttonType: 'icon' | 'button') => {
        if (buttonType === 'button') {
            return (
                <span className="flex items-center">
                    {icon}
                    <span className="ml-2">{text}</span>
                </span>
            );
        }
        return icon;
    };

    const alignClass = shareButtonAlign === 'left' ? 'left-0' : 'right-0';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('actionButtonClick'));
                    if (showShareLinkSettings) {
                        setShowShareLinkSettings(false);
                    } else {
                        setShowDropdown((b) => !b);
                    }
                }}
                className={cn(
                    'relative flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border rounded-md hover:bg-gray-50 h-10',
                    shareLinkActive ? 'border border-green-500 bg-green-50/50' : 'border-gray-300'
                )}
            >
                {shareLinkActive && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" title="Link active" />
                )}
                {getButtonContent(<Share2 size={16} />, 'Share', shareButtonType || 'icon')}
            </button>

            {showDropdown && (
                <div ref={menuPanelRef} className={cn('absolute top-full mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-50', alignClass)}>
                    <div className="py-1">
                        <button
                            onClick={openShareLinkSettings}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <Link2 size={16} className="mr-2" />
                            Create a link to data set
                        </button>
                        <button onClick={() => { setShowDropdown(false); onShareClick?.(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center">
                            <Lock size={16} className="mr-2" />
                            Create a private link to data set
                        </button>
                        <button onClick={() => { setShowDropdown(false); onShareClick?.(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center">
                            <RefreshCw size={16} className="mr-2" />
                            Sync data to another source
                        </button>
                        <button onClick={() => { setShowDropdown(false); onShareClick?.(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center">
                            <Code size={16} className="mr-2" />
                            Embed this view
                        </button>
                    </div>
                </div>
            )}

            {showShareLinkSettings && (
                <div ref={settingsPanelRef} className={cn('absolute top-full mt-1 min-w-[224px] w-[420px] max-w-[63vw] bg-white border border-gray-200 rounded-md shadow-lg z-50', alignClass)}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">Share Link Settings</h3>
                        <button
                            onClick={closeShareLinkSettings}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={shareLinkUrl || 'No link generated'}
                                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 bg-gray-50"
                            />
                            <button
                                onClick={copyLink}
                                disabled={!shareLinkUrl}
                                className="p-1.5 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                                title="Copy link"
                            >
                                <Copy size={14} />
                            </button>
                        </div>

                        <div className="text-xs font-medium text-gray-700">Link Settings</div>

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Link name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={linkName}
                                onChange={(e) => {
                                    setLinkName(e.target.value);
                                    setLinkNameError(null);
                                }}
                                placeholder="Link 1"
                                className={cn('w-full text-sm border rounded px-2 py-1.5', linkNameError ? 'border-red-500' : 'border-gray-200')}
                            />
                            {linkNameError && <p className="text-xs text-red-500 mt-1">{linkNameError}</p>}
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm">Action panel view allowed</span>
                            <Toggle
                                checked={shareActionPanelViewAllowed}
                                onChange={(v) => update({ shareActionPanelViewAllowed: v })}
                            />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm">Restrict copying (block copy, Ctrl+C, download)</span>
                            <Toggle
                                checked={shareRestrictCopy}
                                onChange={(v) => update({ shareRestrictCopy: v })}
                            />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm">Show all fields in expanded records</span>
                            <Toggle
                                checked={shareShowAllFieldsExpanded}
                                onChange={(v) => update({ shareShowAllFieldsExpanded: v })}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm">Restrict by password or email domain</span>
                                <Toggle
                                    checked={shareRestrictByPasswordOrDomain}
                                    onChange={(v) => { update({ shareRestrictByPasswordOrDomain: v }); if (!v) setEmailError(null); }}
                                />
                            </div>
                            {shareRestrictByPasswordOrDomain && (
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Email <span className="text-red-500">*</span> (required when restricted)</label>
                                    <input
                                        type="email"
                                        value={shareRestrictEmail}
                                        onChange={(e) => { update({ shareRestrictEmail: e.target.value }); setEmailError(null); }}
                                        placeholder="user@example.com"
                                        required
                                        className={cn('w-full text-sm border rounded px-2 py-1.5', emailError ? 'border-red-500' : 'border-gray-200')}
                                    />
                                    {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-1 items-center">
                            <button
                                onClick={() => void generateLink()}
                                disabled={!canGenerate}
                                className={cn('flex-1 text-sm px-3 py-1.5 rounded', canGenerate ? 'bg-primary text-white hover:opacity-90' : 'bg-gray-200 text-gray-500 cursor-not-allowed')}
                            >
                                Generate new link
                            </button>
                            <button onClick={() => void handleDeleteAllLinks()} className="flex items-center gap-1.5 px-2 py-1.5 border border-gray-300 rounded hover:bg-red-50 text-red-600 text-sm" title="Delete all links">
                                <X size={16} />
                                <span>Delete All Links</span>
                            </button>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-700">Generated links for this preset</p>
                                <span className="text-[11px] text-gray-500">{shareGeneratedLinks.length}/5</span>
                            </div>
                            <div className="space-y-1 max-h-36 overflow-auto">
                                {shareGeneratedLinks.length === 0 && (
                                    <p className="text-xs text-gray-500">No links generated yet.</p>
                                )}
                                {shareGeneratedLinks.map((ln) => (
                                    <div key={ln.token} className="flex items-center gap-2 text-xs">
                                        <button
                                            type="button"
                                            className="flex-1 text-left truncate text-blue-600 hover:underline"
                                            title={ln.linkName}
                                        >
                                            {ln.linkName}
                                        </button>
                                        <button
                                            type="button"
                                            className="text-gray-600 hover:text-gray-800"
                                            onClick={() => void navigator.clipboard.writeText(ln.url)}
                                            title="Copy link"
                                        >
                                            <Copy size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() => void handleDeleteLink(ln.token)}
                                            title="Delete link"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">{DISCLAIMER}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_Share;
