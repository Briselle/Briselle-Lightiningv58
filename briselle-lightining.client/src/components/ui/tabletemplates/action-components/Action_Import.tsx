import React from 'react';
import { Upload } from 'lucide-react';

interface Action_ImportProps {
    enableImport: boolean;
    importButtonType: 'icon' | 'button';
    importButtonAlign: 'left' | 'right';
    onImportClick: () => void;
}

const Action_Import: React.FC<Action_ImportProps> = ({
    enableImport,
    importButtonType,
    importButtonAlign,
    onImportClick,
}) => {
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

    return (
        <button
            onClick={onImportClick}
            className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
        >
            {getButtonContent(<Upload size={16} />, 'Import', importButtonType || 'icon')}
        </button>
    );
};

export default Action_Import;
