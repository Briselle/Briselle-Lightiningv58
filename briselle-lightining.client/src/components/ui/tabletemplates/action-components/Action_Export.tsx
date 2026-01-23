import React, { useState, useEffect, useRef } from 'react';
import { Download, FileText, FileSpreadsheet, FileJson, Link, Mail } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

export type ExportFormat = 'csv' | 'excel' | 'json' | 'connector' | 'email';

interface Action_ExportProps {
    enableExport: boolean;
    exportButtonType: 'icon' | 'button';
    exportButtonAlign: 'left' | 'right';
    onExportClick: (format: ExportFormat) => void;
}

const Action_Export: React.FC<Action_ExportProps> = ({
    enableExport,
    exportButtonType,
    exportButtonAlign,
    onExportClick,
}) => {
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowExportDropdown(false);
            }
        };

        if (showExportDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExportDropdown]);

    // Close dropdown when another button is clicked
    useEffect(() => {
        const handleButtonClick = () => {
            setShowExportDropdown(false);
        };
        document.addEventListener('actionButtonClick', handleButtonClick);
        return () => {
            document.removeEventListener('actionButtonClick', handleButtonClick);
        };
    }, []);

    if (!enableExport) return null;

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

    const handleExportFormat = (format: ExportFormat) => {
        setShowExportDropdown(false);
        onExportClick(format);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('actionButtonClick'));
                    setShowExportDropdown(!showExportDropdown);
                }}
                className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
            >
                {getButtonContent(<Download size={16} />, 'Export', exportButtonType || 'icon')}
            </button>

            {showExportDropdown && (
                <div
                    className={cn(
                        "absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50",
                        exportButtonAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                >
                    <div className="py-1">
                        <button
                            onClick={() => handleExportFormat('csv')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <FileText size={16} className="mr-2" />
                            Export as CSV
                        </button>
                        <button
                            onClick={() => handleExportFormat('excel')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <FileSpreadsheet size={16} className="mr-2" />
                            Export as Excel
                        </button>
                        <button
                            onClick={() => handleExportFormat('json')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <FileJson size={16} className="mr-2" />
                            Export as JSON
                        </button>
                        <button
                            onClick={() => handleExportFormat('connector')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <Link size={16} className="mr-2" />
                            Export to Connector
                        </button>
                        <button
                            onClick={() => handleExportFormat('email')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                            <Mail size={16} className="mr-2" />
                            Send to Email
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Action_Export;
