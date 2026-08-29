import { Copy, Link2, Maximize2, Minimize2, MoreHorizontal, RotateCcw, Type } from 'lucide-react';
import { useState } from 'react';

type Props = {
    fullWidth: boolean;
    smallText: boolean;
    onToggleFullWidth: () => void;
    onToggleSmallText: () => void;
    onResetPage?: () => void;
    pageUrl: string;
};

export default function NotionPageMenu({
    fullWidth,
    smallText,
    onToggleFullWidth,
    onToggleSmallText,
    onResetPage,
    pageUrl,
}: Props) {
    const [open, setOpen] = useState(false);

    const copyLink = async () => {
        try {
            const url = `${window.location.origin}${pageUrl}`;
            await navigator.clipboard.writeText(url);
        } catch {
            window.prompt('Copy page link', `${window.location.origin}${pageUrl}`);
        }
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                className="p-2 rounded hover:bg-gray-200/80 text-gray-600"
                title="Page options"
                onClick={() => setOpen((v) => !v)}
            >
                <MoreHorizontal className="w-5 h-5" />
            </button>
            {open ? (
                <>
                    <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                onToggleFullWidth();
                                setOpen(false);
                            }}
                        >
                            {fullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            {fullWidth ? 'Standard width' : 'Full width'}
                        </button>
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                onToggleSmallText();
                                setOpen(false);
                            }}
                        >
                            <Type className="w-4 h-4" />
                            {smallText ? 'Default text size' : 'Small text'}
                        </button>
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => void copyLink()}
                        >
                            <Link2 className="w-4 h-4" />
                            Copy link
                        </button>
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                void navigator.clipboard.writeText(pageUrl);
                                setOpen(false);
                            }}
                        >
                            <Copy className="w-4 h-4" />
                            Copy path
                        </button>
                        {onResetPage ? (
                            <>
                                <div className="my-1 border-t border-gray-100" />
                                <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left hover:bg-red-50 text-red-700 flex items-center gap-2"
                                    onClick={() => {
                                        onResetPage();
                                        setOpen(false);
                                    }}
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset page to blank
                                </button>
                            </>
                        ) : null}
                    </div>
                </>
            ) : null}
        </div>
    );
}
