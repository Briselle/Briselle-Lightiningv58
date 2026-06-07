import React from 'react';
import { RefreshCw } from 'lucide-react';

interface Action_RefreshProps {
    enableRefresh: boolean;
    refreshButtonType: 'icon' | 'button';
    refreshButtonAlign: 'left' | 'right';
    onRefreshClick: () => void;
}

const Action_Refresh: React.FC<Action_RefreshProps> = ({
    enableRefresh,
    refreshButtonType,
    refreshButtonAlign,
    onRefreshClick,
}) => {
    if (!enableRefresh) return null;

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
            onClick={onRefreshClick}
            className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
        >
            {getButtonContent(<RefreshCw size={16} />, 'Refresh', refreshButtonType || 'icon')}
        </button>
    );
};

export default Action_Refresh;
