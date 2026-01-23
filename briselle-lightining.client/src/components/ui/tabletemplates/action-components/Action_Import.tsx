import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, FileSpreadsheet, Link } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

export type ImportFormat = 'csv' | 'excel' | 'connector';

interface Action_ImportProps {
    enableImport: boolean;
    importButtonType: 'icon' | 'button';
    importButtonAlign: 'left' | 'right';
    onImportClick: (format: ImportFormat) => void;
}

const Action_Import: React.FC<Action_ImportProps> = ({
    enableImport,
    importButtonType,
    importButtonAlign,
    onImportClick,
}) => {
    const [showImportDropdown, setShowImportDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowImportDropdown(false);
            }
        };

        if (showImportDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showImportDropdown]);

    // Close dropdown when another button is clicked
    useEffect(() => {
        const handleButtonClick = () => {
            setShowImportDropdown(false);
        };
        document.addEventListener('actionButtonClick', handleButtonClick);
        return () => {
            document.removeEventListener('actionButtonClick', handleButtonClick);
        };
    }, []);

    if (!enableImport) return null;

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

    const handleImportFormat = (format: ImportFormat) => {
        setShowImportDropdown(false);
        onImportClick(format);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('actionButtonClick'));
                    setShowImportDropdown(!showImportDropdown);
                }}
                className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
            >
                {getButtonContent(<Upload size={16} />, 'Import', importButtonType || 'icon')}
            </button>

            {showImportDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50",
                        importButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                >
                    <div className="py-1">
                        <button
                            onClick={() => handleImportFormat('csv')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <FileText size={16} className="mr-2" />
                            Import from CSV
                        </button>
                        <button
                            onClick={() => handleImportFormat('excel')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <FileSpreadsheet size={16} className="mr-2" />
                            Import from Excel
                        </button>
                        <button
                            onClick={() => handleImportFormat('connector')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <Link size={16} className="mr-2" />
                            Import from Connector
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_Import;
