import React, { useState } from 'react';
import { Grid3X3 } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface Action_TableViewProps {
    tableViewButtonType: 'icon' | 'button';
    tableViewButtonAlign: 'left' | 'right';
    currentTableView: 'default' | 'compact' | 'comfortable' | 'spacious';
    onTableViewChange: (view: 'default' | 'compact' | 'comfortable' | 'spacious') => void;
}

const Action_TableView: React.FC<Action_TableViewProps> = ({
    tableViewButtonType,
    tableViewButtonAlign,
    currentTableView,
    onTableViewChange,
}) => {
    const [showTableViewDropdown, setShowTableViewDropdown] = useState(false);

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

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowTableViewDropdown(!showTableViewDropdown);
                }}
                className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
            >
                {getButtonContent(<Grid3X3 size={16} />, 'View', tableViewButtonType || 'icon')}
            </button>

            {showTableViewDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32",
                        tableViewButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                >
                    {['default', 'compact', 'comfortable', 'spacious'].map((view) => (
                        <button
                            key={view}
                            onClick={(e) => {
                                e.stopPropagation();
                                onTableViewChange(view as 'default' | 'compact' | 'comfortable' | 'spacious');
                                setShowTableViewDropdown(false);
                            }}
                            className={cn(
                                "block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 capitalize",
                                currentTableView === view ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            )}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Action_TableView;
