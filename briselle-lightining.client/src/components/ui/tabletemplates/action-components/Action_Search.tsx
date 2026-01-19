import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface Action_SearchProps {
    enableSearch: boolean;
    searchButtonType: 'icon' | 'button';
    searchButtonAlign: 'left' | 'right';
    searchTerm: string;
    onSearchChange: (value: string) => void;
}

const Action_Search: React.FC<Action_SearchProps> = ({
    enableSearch,
    searchButtonType,
    searchButtonAlign,
    searchTerm,
    onSearchChange,
}) => {
    const [showSearchExpanded, setShowSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Handle Ctrl+F for search activation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                if (enableSearch && searchButtonType === 'icon') {
                    setShowSearchExpanded(true);
                    setTimeout(() => {
                        searchInputRef.current?.focus();
                    }, 100);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [enableSearch, searchButtonType]);

    if (!enableSearch) return null;

    if (searchButtonType === 'button') {
        return (
            <div className="relative flex-grow max-w-64">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-10"
                />
                <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
            </div>
        );
    }

    // Icon type with expandable input
    return (
        <div
            ref={searchRef}
            className={cn(
                "relative flex items-center border border-gray-300 rounded-md h-10 bg-white transition-all duration-300 ease-in-out",
                showSearchExpanded ? 'w-64 border-blue-500' : 'w-10'
            )}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="flex items-center justify-center w-10 h-full text-gray-500 hover:text-primary flex-shrink-0 rounded-md"
                title="Search"
            >
                <Search size={16} />
            </button>
            <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onBlur={() => {
                    if (!searchTerm) setShowSearchExpanded(false);
                }}
                className={cn(
                    "h-full bg-transparent outline-none transition-all duration-300 ease-in-out",
                    showSearchExpanded ? 'w-full pr-3' : 'w-0 p-0'
                )}
            />
        </div>
    );
};

export default Action_Search;
