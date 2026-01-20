import React from 'react';
import { Share } from 'lucide-react';

interface Action_ShareProps {
    enableShare: boolean;
    shareButtonType: 'icon' | 'button';
    shareButtonAlign: 'left' | 'right';
    onShareClick: () => void;
}

const Action_Share: React.FC<Action_ShareProps> = ({
    enableShare,
    shareButtonType,
    shareButtonAlign,
    onShareClick,
}) => {
    if (!enableShare) return null;

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
            onClick={onShareClick}
            className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
        >
            {getButtonContent(<Share size={16} />, 'Share', shareButtonType || 'icon')}
        </button>
    );
};

export default Action_Share;
