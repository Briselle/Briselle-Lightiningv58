import React from 'react';
import { UserCheck } from 'lucide-react';

interface Action_ChangeOwnerProps {
    enableChangeOwner: boolean;
    changeOwnerButtonType: 'icon' | 'button';
    changeOwnerButtonAlign: 'left' | 'right';
    onChangeOwnerClick: () => void;
}

const Action_ChangeOwner: React.FC<Action_ChangeOwnerProps> = ({
    enableChangeOwner,
    changeOwnerButtonType,
    changeOwnerButtonAlign,
    onChangeOwnerClick,
}) => {
    if (!enableChangeOwner) return null;

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
            onClick={onChangeOwnerClick}
            className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
        >
            {getButtonContent(<UserCheck size={16} />, 'Change Owner', changeOwnerButtonType || 'icon')}
        </button>
    );
};

export default Action_ChangeOwner;
