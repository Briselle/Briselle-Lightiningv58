import React from 'react';
import { Printer } from 'lucide-react';

interface Action_PrintProps {
    enablePrint: boolean;
    printButtonType: 'icon' | 'button';
    printButtonAlign: 'left' | 'right';
    onPrintClick: () => void;
}

const Action_Print: React.FC<Action_PrintProps> = ({
    enablePrint,
    printButtonType,
    printButtonAlign,
    onPrintClick,
}) => {
    if (!enablePrint) return null;

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
            onClick={onPrintClick}
            className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
        >
            {getButtonContent(<Printer size={16} />, 'Print', printButtonType || 'icon')}
        </button>
    );
};

export default Action_Print;
