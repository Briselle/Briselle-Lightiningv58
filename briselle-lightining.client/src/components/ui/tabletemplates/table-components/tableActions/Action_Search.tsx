import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../../../utils/helpers';

interface SearchActionConfig {
    enableSearch?: boolean;
    searchButtonType?: 'icon' | 'button';
    searchButtonAlign?: 'left' | 'right';
    searchQuery?: string;
}

interface ActionSearchProps {
    config: SearchActionConfig;
    onConfigChange: (updatedConfig: any) => void;
}

const Action_Search: React.FC<ActionSearchProps> = ({
    config,
    onConfigChange
}) => {
    const [open, setOpen] = useState(false);

    if (!config.enableSearch) return null;

    const handleSearchChange = (value: string) => {
        onConfigChange({
            ...config,
            searchQuery: value,
        });
    };

    const handleClear = () => {
        onConfigChange({
            ...config,
            searchQuery: '',
        });
        setOpen(false);
    };

    return (
        <div className="relative">
            {/* Search Button */}
            <button
                onClick={() => setOpen(prev => !prev)}
                className={cn(
                    'flex items-center justify-center px-3 py-2 h-10',
                    'border border-gray-300 rounded-md',
                    'text-gray-500 hover:text-primary hover:bg-gray-50',
                    open && 'bg-blue-50 text-blue-700 border-blue-300'
                )}
                title="Search"
            >
                {config.searchButtonType === 'button' ? (
                    <>
                        <Search size={16} className="mr-2" />
                        Search
                    </>
                ) : (
                    <Search size={16} />
                )}
            </button>

            {/* Search Dropdown */}
            {open && (
                <div
                    className={cn(
                        'absolute top-full mt-1 w-64',
                        'bg-white border border-gray-200 rounded-md shadow-lg z-50',
                        config.searchButtonAlign === 'left'
                            ? 'left-0'
                            : 'right-0'
                    )}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center px-2 py-2">
                        <Search size={14} className="text-gray-400 mr-2" />

                        <input
                            autoFocus
                            type="text"
                            placeholder="Search…"
                            value={config.searchQuery ?? ''}
                            onChange={(e) =>
                                handleSearchChange(e.target.value)
                            }
                            className="flex-1 text-sm outline-none bg-transparent"
                        />

                        {config.searchQuery && (
                            <button
                                onClick={handleClear}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                title="Clear"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_Search;
